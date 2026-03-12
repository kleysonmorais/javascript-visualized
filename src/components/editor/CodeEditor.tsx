import { useRef, useEffect } from "react";
import MonacoEditor, { type OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { THEME } from "@/constants/theme";
import { useVisualizerStore } from "@/store/useVisualizerStore";

interface CodeEditorProps {
  highlightedLine?: number;
}

const THEME_NAME = "javascript-visualized-dark";

function defineEditorTheme(monaco: typeof Monaco) {
  monaco.editor.defineTheme(THEME_NAME, {
    base: "vs-dark",
    inherit: false,
    rules: [
      {
        token: "keyword",
        foreground: THEME.colors.syntax.keyword.replace("#", ""),
      },
      {
        token: "string",
        foreground: THEME.colors.syntax.string.replace("#", ""),
      },
      {
        token: "number",
        foreground: THEME.colors.syntax.number.replace("#", ""),
      },
      {
        token: "identifier",
        foreground: THEME.colors.text.primary.replace("#", ""),
      },
      {
        token: "comment",
        foreground: THEME.colors.syntax.comment.replace("#", ""),
      },
      {
        token: "delimiter",
        foreground: THEME.colors.text.secondary.replace("#", ""),
      },
      {
        token: "type",
        foreground: THEME.colors.syntax.function.replace("#", ""),
      },
      {
        token: "variable",
        foreground: THEME.colors.syntax.variable.replace("#", ""),
      },
    ],
    colors: {
      "editor.background": THEME.colors.bg.secondary,
      "editor.foreground": THEME.colors.text.primary,
      "editor.lineHighlightBackground": "#00000000",
      "editor.selectionBackground": "#22d3ee22",
      "editor.inactiveSelectionBackground": "#22d3ee11",
      "editorCursor.foreground": THEME.colors.text.accent,
      "editorLineNumber.foreground": THEME.colors.text.muted,
      "editorLineNumber.activeForeground": THEME.colors.text.accent,
      "editorGutter.background": THEME.colors.bg.secondary,
      "editor.selectionHighlightBackground": "#22d3ee15",
      "scrollbarSlider.background": "#ffffff15",
      "scrollbarSlider.hoverBackground": "#ffffff25",
      "scrollbarSlider.activeBackground": "#ffffff35",
    },
  });
}

export function CodeEditor({ highlightedLine }: CodeEditorProps) {
  const sourceCode = useVisualizerStore((s) => s.sourceCode);
  const setSourceCode = useVisualizerStore((s) => s.setSourceCode);
  const currentStep = useVisualizerStore((s) => s.currentStep);
  const steps = useVisualizerStore((s) => s.steps);
  const runCode = useVisualizerStore((s) => s.runCode);
  const clearError = useVisualizerStore((s) => s.clearError);
  const error = useVisualizerStore((s) => s.error);
  const errorLine = useVisualizerStore((s) => s.errorLine);
  const breakpoints = useVisualizerStore((s) => s.breakpoints);
  const toggleBreakpoint = useVisualizerStore((s) => s.toggleBreakpoint);

  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const errorDecorationsRef = useRef<string[]>([]);
  const breakpointDecorationsRef = useRef<string[]>([]);

  const activeLine = highlightedLine ?? currentStep?.highlightedLine;
  const isReadOnly = steps.length > 0;

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    defineEditorTheme(monaco);
    monaco.editor.setTheme(THEME_NAME);

    // Add keyboard shortcut: Ctrl+Enter (Cmd+Enter on Mac) to run code
    editor.addAction({
      id: "run-code",
      label: "Run Code",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => {
        clearError();
        runCode();
      },
    });

    // Handle gutter click for breakpoints
    editor.onMouseDown((e) => {
      if (
        e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN &&
        e.target.position
      ) {
        const line = e.target.position.lineNumber;
        toggleBreakpoint(line);
      }
    });

    // Register hover provider for variable values during execution
    monaco.languages.registerHoverProvider("javascript", {
      provideHover: (model: Monaco.editor.ITextModel, position: Monaco.Position) => {
        const state = useVisualizerStore.getState();
        const currentStep = state.currentStep;

        // Only show hover info when execution has happened
        if (!currentStep || state.steps.length === 0) return null;

        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const varName = word.word;

        // Search all memory blocks for this variable
        for (const block of currentStep.memoryBlocks) {
          const entry = block.entries.find((e) => e.name === varName);
          if (entry) {
            return {
              contents: [
                { value: `**${varName}** = \`${entry.displayValue}\`` },
                { value: `_${block.label}_ • ${entry.kind}` },
              ],
              range: {
                startLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endLineNumber: position.lineNumber,
                endColumn: word.endColumn,
              },
            };
          }
        }

        return null;
      },
    });
  };

  // Handle read-only mode updates
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.updateOptions({ readOnly: isReadOnly });
  }, [isReadOnly]);

  // Handle execution line highlighting
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    if (activeLine !== undefined && activeLine > 0) {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
        {
          range: {
            startLineNumber: activeLine,
            startColumn: 1,
            endLineNumber: activeLine,
            endColumn: 1,
          },
          options: {
            isWholeLine: true,
            className: "editor-highlighted-line",
            glyphMarginClassName: "editor-highlighted-glyph",
          },
        },
      ]);
    } else {
      decorationsRef.current = editor.deltaDecorations(
        decorationsRef.current,
        [],
      );
    }
  }, [activeLine]);

  // Handle error line highlighting
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    if (error && errorLine) {
      errorDecorationsRef.current = editor.deltaDecorations(
        errorDecorationsRef.current,
        [
          {
            range: {
              startLineNumber: errorLine,
              startColumn: 1,
              endLineNumber: errorLine,
              endColumn: 1,
            },
            options: {
              isWholeLine: true,
              className: "editor-error-line",
              glyphMarginClassName: "editor-error-glyph",
            },
          },
        ],
      );
    } else {
      errorDecorationsRef.current = editor.deltaDecorations(
        errorDecorationsRef.current,
        [],
      );
    }
  }, [error, errorLine]);

  // Handle breakpoint decorations
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const decorations = Array.from(breakpoints).map((line) => ({
      range: {
        startLineNumber: line,
        startColumn: 1,
        endLineNumber: line,
        endColumn: 1,
      },
      options: {
        isWholeLine: false,
        glyphMarginClassName: "editor-breakpoint-glyph",
      },
    }));

    breakpointDecorationsRef.current = editor.deltaDecorations(
      breakpointDecorationsRef.current,
      decorations,
    );
  }, [breakpoints]);

  return (
    <>
      <style>{`
        .editor-highlighted-line {
          background: rgba(34, 211, 238, 0.08) !important;
          border-left: 2px solid rgba(34, 211, 238, 0.7);
        }
        .editor-highlighted-glyph {
          background: rgba(34, 211, 238, 0.7);
          width: 3px !important;
          margin-left: 2px;
          border-radius: 2px;
        }
        .editor-error-line {
          background: rgba(239, 68, 68, 0.15) !important;
          border-left: 2px solid rgba(239, 68, 68, 0.8);
        }
        .editor-error-glyph {
          background: rgba(239, 68, 68, 0.8);
          width: 3px !important;
          margin-left: 2px;
          border-radius: 2px;
        }
        .editor-breakpoint-glyph {
          background: #ef4444;
          width: 10px !important;
          height: 10px !important;
          margin-left: 5px;
          margin-top: 5px;
          border-radius: 50%;
          box-shadow: 0 0 6px rgba(239, 68, 68, 0.6);
        }
      `}</style>
      <MonacoEditor
        height="100%"
        language="javascript"
        value={sourceCode}
        onChange={(value) => setSourceCode(value ?? "")}
        onMount={handleMount}
        theme={THEME_NAME}
        options={{
          fontSize: 14,
          fontFamily: THEME.fonts.code,
          minimap: { enabled: false },
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 16, bottom: 16 },
          wordWrap: "on",
          tabSize: 2,
          renderLineHighlight: "none",
          readOnly: isReadOnly,
          glyphMargin: true,
          folding: false,
          lineDecorationsWidth: 4,
          overviewRulerBorder: false,
        }}
      />
    </>
  );
}

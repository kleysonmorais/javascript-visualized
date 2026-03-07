import { Play, Loader2, RotateCcw, ChevronDown, ChevronRight } from "lucide-react";
import { THEME } from "@/constants/theme";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { CallStack } from "@/components/visualizer/CallStack";
import { MemoryPanel } from "@/components/visualizer/MemoryPanel";
import { WebAPIs } from "@/components/visualizer/WebAPIs";
import { TaskQueue } from "@/components/visualizer/TaskQueue";
import { MicrotaskQueue } from "@/components/visualizer/MicrotaskQueue";
import { EventLoopIndicator } from "@/components/visualizer/EventLoopIndicator";
import { ConsoleOutput } from "@/components/visualizer/ConsoleOutput";
import { Panel } from "@/components/ui/Panel";
import { TransportControls } from "@/components/controls/TransportControls";
import { useVisualizerStore } from "@/store/useVisualizerStore";
import { useAutoPlay } from "@/hooks/useAutoPlay";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import type { EventLoopPhase } from "@/types";

function FlowArrow({ visible }: { visible: boolean }) {
  return (
    <div
      className="flex justify-center"
      style={{
        height: 16,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      <ChevronDown size={16} color={THEME.colors.text.muted} />
    </div>
  );
}

/** Cyan-colored flow arrow for microtask flows */
function MicrotaskFlowArrow({
  visible,
  direction = 'down',
}: {
  visible: boolean;
  direction?: 'down' | 'right';
}) {
  const Icon = direction === 'down' ? ChevronDown : ChevronRight;
  return (
    <div
      className={direction === 'down' ? 'flex justify-center' : 'flex items-center'}
      style={{
        height: direction === 'down' ? 16 : 'auto',
        width: direction === 'right' ? 16 : 'auto',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      <Icon size={16} color={THEME.colors.border.microtaskQueue} />
    </div>
  );
}

/** Check if event loop is in a microtask-related phase */
function isMicrotaskPhase(phase: EventLoopPhase): boolean {
  return phase === 'checking-microtasks' || phase === 'draining-microtasks';
}

export function AppShell() {
  const isRunning = useVisualizerStore((s) => s.isRunning);
  const runCode = useVisualizerStore((s) => s.runCode);
  const steps = useVisualizerStore((s) => s.steps);
  const resetToEdit = useVisualizerStore((s) => s.resetToEdit);
  const error = useVisualizerStore((s) => s.error);
  const clearError = useVisualizerStore((s) => s.clearError);

  const hasSteps = steps.length > 0;
  const currentStep = useVisualizerStore((s) => s.currentStep);
  const hasWebAPIs = (currentStep?.webAPIs?.length ?? 0) > 0;
  const hasTaskQueue = (currentStep?.taskQueue?.length ?? 0) > 0;
  const hasMicrotaskQueue = (currentStep?.microtaskQueue?.length ?? 0) > 0;
  const eventLoopPhase = currentStep?.eventLoop?.phase ?? 'idle';
  const showMicrotaskFlow = hasMicrotaskQueue || isMicrotaskPhase(eventLoopPhase);

  useAutoPlay();
  useKeyboardShortcuts();

  return (
    <div
      className="min-h-screen p-6 flex flex-col gap-4"
      style={{
        backgroundColor: THEME.colors.bg.primary,
        fontFamily: THEME.fonts.ui,
      }}
    >
      {/* Header */}
      <h1
        className="text-2xl font-semibold tracking-tight text-center"
        style={{ color: THEME.colors.text.primary }}
      >
        JS Execution Context Visualizer
      </h1>

      {/* Main layout: left (editor + console) | right (visualizer panels) */}
      <div
        className="flex gap-4 flex-1 min-h-0"
        style={{ minHeight: "calc(100vh - 160px)" }}
      >
        {/* Left column: Code Editor + Console */}
        <div className="flex flex-col gap-4 w-1/2">
          {/* Code Editor */}
          <Panel
            title="Code"
            borderColor={THEME.colors.border.editor}
            className="flex-1"
            headerRight={
              <div className="flex items-center gap-2">
                {hasSteps && (
                  <button
                    onClick={resetToEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors"
                    style={{
                      backgroundColor: THEME.colors.bg.elevated,
                      border: `1px solid ${THEME.colors.border.editor}`,
                      color: THEME.colors.text.secondary,
                      fontFamily: THEME.fonts.ui,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        THEME.colors.text.accent;
                      (e.currentTarget as HTMLButtonElement).style.color =
                        THEME.colors.text.primary;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        THEME.colors.border.editor;
                      (e.currentTarget as HTMLButtonElement).style.color =
                        THEME.colors.text.secondary;
                    }}
                  >
                    <RotateCcw size={12} />
                    <span>Edit</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    clearError();
                    runCode();
                  }}
                  disabled={isRunning}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-all"
                  style={{
                    backgroundColor: isRunning
                      ? THEME.colors.bg.elevated
                      : THEME.colors.text.accent,
                    border: `1px solid ${THEME.colors.text.accent}`,
                    color: isRunning
                      ? THEME.colors.text.accent
                      : THEME.colors.bg.primary,
                    fontFamily: THEME.fonts.ui,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: isRunning ? "not-allowed" : "pointer",
                    opacity: isRunning ? 0.7 : 1,
                  }}
                >
                  {isRunning ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      <span>Parsing...</span>
                    </>
                  ) : (
                    <>
                      <Play size={12} fill="currentColor" />
                      <span>Run</span>
                    </>
                  )}
                </button>
              </div>
            }
          >
            {/* Override inner padding to let Monaco fill the panel */}
            <div className="-m-4 h-full" style={{ minHeight: 400 }}>
              <CodeEditor />
            </div>
            {/* Error display */}
            {error && (
              <div
                className="absolute bottom-0 left-0 right-0 px-4 py-2 flex items-start justify-between"
                style={{
                  backgroundColor: `${THEME.colors.status.error}22`,
                  borderTop: `1px solid ${THEME.colors.status.error}`,
                  fontFamily: THEME.fonts.code,
                  fontSize: 12,
                  color: THEME.colors.status.error,
                }}
              >
                <span>{error}</span>
                <button
                  onClick={clearError}
                  style={{
                    marginLeft: 12,
                    padding: "2px 6px",
                    backgroundColor: THEME.colors.status.error,
                    color: THEME.colors.bg.primary,
                    borderRadius: 4,
                    fontSize: 10,
                    cursor: "pointer",
                    border: "none",
                    flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              </div>
            )}
          </Panel>

          {/* Console */}
          <ConsoleOutput />
        </div>

        {/* Right column: Visualizer panels */}
        <div className="flex flex-col w-1/2" style={{ gap: 0 }}>
          {/* Top row: Call Stack + Memory */}
          <div className="flex gap-4 flex-1">
            <CallStack />
            <MemoryPanel />
          </div>

          {/* Flow indicator: Call Stack/Memory → Web APIs */}
          <FlowArrow visible={hasWebAPIs} />

          {/* Middle row: Web APIs */}
          <WebAPIs />

          {/* Flow indicator: Web APIs → Task Queue */}
          <FlowArrow visible={hasTaskQueue} />

          {/* Bottom row: Event Loop + Queues with flow indicators */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center gap-2">
              <EventLoopIndicator />
              {/* Flow indicator: Event Loop picks from queues */}
              <MicrotaskFlowArrow visible={showMicrotaskFlow} direction="right" />
            </div>
            <div className="flex flex-col gap-2 flex-1">
              {/* Microtask Queue with flow indicator from Promises */}
              <div className="flex flex-col">
                <MicrotaskFlowArrow visible={showMicrotaskFlow} direction="down" />
                <MicrotaskQueue />
              </div>
              {/* Task Queue */}
              <TaskQueue />
            </div>
          </div>
        </div>
      </div>

      {/* Footer: Transport Controls */}
      <TransportControls />
    </div>
  );
}

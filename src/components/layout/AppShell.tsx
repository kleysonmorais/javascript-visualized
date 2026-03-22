import { useState, useEffect } from "react";
import { Play, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { THEME } from "@/constants/theme";
import { CODE_EXAMPLES } from "@/constants/examples";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { CallStack } from "@/components/visualizer/CallStack";
import { MemoryPanel } from "@/components/visualizer/MemoryPanel";
import { WebAPIs } from "@/components/visualizer/WebAPIs";
import { TaskQueue } from "@/components/visualizer/TaskQueue";
import { MicrotaskQueue } from "@/components/visualizer/MicrotaskQueue";
import { ConsoleOutput } from "@/components/visualizer/ConsoleOutput";
import { Panel } from "@/components/ui/Panel";
import { TransportControls } from "@/components/controls/TransportControls";
import { MobileTabBar, type MobileTab } from "@/components/layout/MobileTabBar";
import { useVisualizerStore } from "@/store/useVisualizerStore";
import { useAutoPlay } from "@/hooks/useAutoPlay";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { ExamplesButton } from "./ExamplesModal";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { MdOutlineModeEditOutline } from "react-icons/md";

export function AppShell() {
  const { t } = useTranslation();
  const { exampleId } = useParams<{ exampleId: string }>();
  const setSourceCode = useVisualizerStore((s) => s.setSourceCode);
  const reset = useVisualizerStore((s) => s.reset);
  const navigate = useNavigate();

  useEffect(() => {
    if (!exampleId) return;

    const example = CODE_EXAMPLES.find((e) => e.id === exampleId);
    if (example) {
      setSourceCode(example.code);
      reset();
    } else {
      navigate("/");
    }
  }, [exampleId]); // eslint-disable-line react-hooks/exhaustive-deps

  const isRunning = useVisualizerStore((s) => s.isRunning);
  const runCode = useVisualizerStore((s) => s.runCode);
  const steps = useVisualizerStore((s) => s.steps);
  const resetToEdit = useVisualizerStore((s) => s.resetToEdit);
  const error = useVisualizerStore((s) => s.error);
  const clearError = useVisualizerStore((s) => s.clearError);

  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<MobileTab>("code");

  const hasSteps = steps.length > 0;

  useAutoPlay();
  useKeyboardShortcuts();

  return (
    <div
      className="h-screen min-w-[320px] flex flex-col overflow-hidden"
      style={{
        backgroundColor: THEME.colors.bg.primary,
        fontFamily: THEME.fonts.ui,
      }}
    >
      {/* Mobile tab bar */}
      <MobileTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main layout: responsive grid - stacked on mobile, side-by-side on desktop */}
      <main className="flex-1 min-h-0 p-2 gap-2 overflow-y-auto lg:overflow-hidden grid grid-cols-1 lg:grid-cols-[minmax(350px,2fr)_3fr]">
        {/* Left column on desktop / Code + Console on mobile (code tab) */}
        <div
          className={`flex flex-col gap-2 min-h-0 lg:overflow-hidden ${isMobile && activeTab !== "code" ? "hidden" : ""}`}
        >
          {/* Code Editor */}
          <Panel
            title={!isMobile ? t("appShell.code") : undefined}
            className="flex-1 min-h-0 lg:min-h-50"
            scrollable={false}
            headerLeft={
              <div className="flex items-center gap-2">
                <ExamplesButton />
              </div>
            }
            headerRight={
              <div className="flex items-center gap-2">
                {hasSteps && (
                  <button
                    onClick={resetToEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors min-h-9 lg:min-h-0"
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
                    <MdOutlineModeEditOutline size={12} />
                    <span>{t("appShell.edit")}</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    clearError();
                    runCode();
                  }}
                  disabled={isRunning}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-all min-h-9 lg:min-h-0"
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
                      <span>{t("appShell.parsing")}</span>
                    </>
                  ) : (
                    <>
                      <Play size={12} fill="currentColor" />
                      <span>{t("appShell.run")}</span>
                    </>
                  )}
                </button>
              </div>
            }
          >
            <div className="-m-3 h-full min-h-50 lg:min-h-0">
              <CodeEditor />
            </div>
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
                <span className="wrap-break-word">{error}</span>
                <button
                  onClick={clearError}
                  className="min-w-6 min-h-6"
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

          <ConsoleOutput />
        </div>

        {/* Desktop: right column with all visualizer panels */}
        {!isMobile && (
          <div className="flex flex-col gap-2 min-h-0 lg:overflow-hidden">
            <div className="flex flex-col lg:flex-row gap-2 lg:flex-1 lg:min-h-0">
              <CallStack />
              <MemoryPanel />
            </div>

            <WebAPIs />

            <MicrotaskQueue />
            <TaskQueue />
          </div>
        )}

        {/* Mobile: visualizer panels shown based on active tab, console always visible */}
        {isMobile && activeTab !== "code" && (
          <div className="flex flex-col gap-2 min-h-0">
            {activeTab === "callStack" && <CallStack />}
            {activeTab === "memory" && <MemoryPanel />}
            {activeTab === "webAPIs" && <WebAPIs />}
            {activeTab === "microtaskQueue" && <MicrotaskQueue />}
            {activeTab === "taskQueue" && <TaskQueue />}
            <ConsoleOutput />
          </div>
        )}
      </main>

      <TransportControls />
    </div>
  );
}

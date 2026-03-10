import {
  Play,
  Loader2,
  RotateCcw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
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
import { Navbar } from "@/components/layout/Navbar";
import { useVisualizerStore } from "@/store/useVisualizerStore";
import { useAutoPlay } from "@/hooks/useAutoPlay";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useIsMobile } from "@/hooks/useMediaQuery";
import type { EventLoopPhase } from "@/types";

function FlowArrow({ visible }: { visible: boolean }) {
  return (
    <div
      className="hidden lg:flex justify-center"
      style={{
        height: 16,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease",
      }}
    >
      <ChevronDown size={16} color={THEME.colors.text.muted} />
    </div>
  );
}

/** Cyan-colored flow arrow for microtask flows */
function MicrotaskFlowArrow({
  visible,
  direction = "down",
}: {
  visible: boolean;
  direction?: "down" | "right";
}) {
  const Icon = direction === "down" ? ChevronDown : ChevronRight;
  return (
    <div
      className={`hidden lg:flex ${direction === "down" ? "justify-center" : "items-center"}`}
      style={{
        height: direction === "down" ? 16 : "auto",
        width: direction === "right" ? 16 : "auto",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease",
      }}
    >
      <Icon size={16} color={THEME.colors.border.microtaskQueue} />
    </div>
  );
}

/** Check if event loop is in a microtask-related phase */
function isMicrotaskPhase(phase: EventLoopPhase): boolean {
  return phase === "checking-microtasks" || phase === "draining-microtasks";
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
  const eventLoopPhase = currentStep?.eventLoop?.phase ?? "idle";
  const showMicrotaskFlow =
    hasMicrotaskQueue || isMicrotaskPhase(eventLoopPhase);

  const isMobile = useIsMobile();

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
      {/* Navbar */}
      <Navbar />

      {/* Main layout: responsive grid - stacked on mobile, side-by-side on desktop */}
      <main className="flex-1 min-h-0 p-2 gap-2 overflow-y-auto lg:overflow-hidden grid grid-cols-1 lg:grid-cols-[minmax(350px,2fr)_3fr]">
        {/* Left column on desktop / First section on mobile: Code Editor + Console */}
        <div className="flex flex-col gap-2 min-h-0 lg:overflow-hidden">
          {/* Code Editor */}
          <Panel
            title="Code"
            borderColor={THEME.colors.border.editor}
            className="flex-1 min-h-0 lg:min-h-50"
            scrollable={false}
            collapsible={isMobile}
            defaultCollapsed={isMobile}
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
            <div className="-m-3 h-full min-h-50 lg:min-h-0">
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

          {/* Console - only shown in desktop left column */}
          <div className="hidden lg:block">
            <ConsoleOutput />
          </div>
        </div>

        {/* Right column on desktop / Rest of panels on mobile: Visualizer panels */}
        <div className="flex flex-col gap-2 min-h-0 lg:overflow-hidden">
          {/* Desktop: Top row - Call Stack + Memory side by side */}
          {/* Mobile: Stacked individually */}
          <div className="flex flex-col lg:flex-row gap-2 lg:flex-1 lg:min-h-0">
            <CallStack collapsible={isMobile} />
            <MemoryPanel collapsible={isMobile} />
          </div>

          {/* Flow indicator: Call Stack/Memory → Web APIs (desktop only) */}
          <FlowArrow visible={hasWebAPIs} />

          {/* Web APIs */}
          <WebAPIs collapsible={isMobile} defaultCollapsed={isMobile} />

          {/* Flow indicator: Web APIs → Task Queue (desktop only) */}
          <FlowArrow visible={hasTaskQueue} />

          {/* Desktop: Bottom row - Event Loop + Queues with flow indicators */}
          {/* Mobile: Stacked queues */}
          <div className="flex flex-col lg:flex-row gap-2 lg:items-stretch">
            {/* Event Loop - inline on mobile, column on desktop */}
            <div className="flex lg:flex-col items-center gap-1 shrink-0">
              <EventLoopIndicator />
              {/* Flow indicator: Event Loop picks from queues (desktop only) */}
              <MicrotaskFlowArrow
                visible={showMicrotaskFlow}
                direction="right"
              />
            </div>
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              {/* Microtask Queue with flow indicator */}
              <div className="flex flex-col">
                <MicrotaskFlowArrow
                  visible={showMicrotaskFlow}
                  direction="down"
                />
                <MicrotaskQueue />
              </div>
              {/* Task Queue */}
              <TaskQueue />
            </div>
          </div>

          {/* Console - shown at bottom on mobile */}
          <div className="lg:hidden">
            <ConsoleOutput collapsible={isMobile} />
          </div>
        </div>
      </main>

      {/* Footer: Transport Controls */}
      <TransportControls />
    </div>
  );
}

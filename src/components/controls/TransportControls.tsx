import {
  SkipBack,
  ChevronLeft,
  Play,
  Pause,
  ChevronRight,
  SkipForward,
  RefreshCw,
  Clock,
} from "lucide-react";
import { useVisualizerStore } from "@/store/useVisualizerStore";
import { THEME } from "@/constants/theme";
import type { PlaybackSpeed } from "@/types";

const SPEEDS: PlaybackSpeed[] = [0.5, 1, 1.5, 2, 3];

function StepDescription() {
  const currentStep = useVisualizerStore((s) => s.currentStep);
  if (!currentStep) return null;

  const phase = currentStep.eventLoop.phase;
  const isTimer =
    phase === "checking-tasks" ||
    phase === "picking-task" ||
    phase === "draining-microtasks";

  return (
    <div
      className="px-4 py-2 flex items-center gap-2 text-sm"
      style={{
        backgroundColor: THEME.colors.bg.tertiary,
        borderRadius: THEME.radius.md,
        border: `1px solid ${THEME.colors.border.editor}`,
        color: THEME.colors.text.primary,
        fontFamily: THEME.fonts.ui,
      }}
    >
      {isTimer ? (
        <Clock size={14} color={THEME.colors.text.accent} />
      ) : (
        <RefreshCw size={14} color={THEME.colors.text.accent} />
      )}
      <span>{currentStep.description}</span>
    </div>
  );
}

export function TransportControls() {
  const {
    currentStepIndex,
    totalSteps,
    isPlaying,
    speed,
    goToStart,
    goBack,
    togglePlayback,
    goNext,
    goToEnd,
    setSpeed,
  } = useVisualizerStore();

  const atStart = currentStepIndex === 0;
  const atEnd = currentStepIndex === totalSteps - 1;
  const noSteps = totalSteps === 0;
  const progress = totalSteps > 1 ? currentStepIndex / (totalSteps - 1) : 0;

  const btnBase: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.colors.bg.tertiary,
    border: `1px solid ${THEME.colors.border.editor}`,
    borderRadius: THEME.radius.sm,
    cursor: "pointer",
    transition: "border-color 0.15s, background-color 0.15s",
    color: THEME.colors.text.secondary,
  };

  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    if (totalSteps < 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const targetIndex = Math.round(ratio * (totalSteps - 1));
    useVisualizerStore.getState().goToStep(targetIndex);
  }

  return (
    <div
      className="flex flex-col gap-2 shrink-0"
      style={{
        backgroundColor: THEME.colors.bg.secondary,
        borderTop: `1px solid ${THEME.colors.border.editor}`,
        padding: "10px 16px",
      }}
    >
      <StepDescription />

      <div className="flex items-center justify-between gap-4">
        {/* Transport buttons */}
        <div className="flex items-center gap-2">
          {/* Go to start */}
          <button
            onClick={goToStart}
            disabled={atStart}
            title="Go to start (Home)"
            style={{
              ...btnBase,
              padding: "6px 8px",
              opacity: atStart ? 0.3 : 1,
              cursor: atStart ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!atStart) {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  THEME.colors.text.accent;
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                THEME.colors.border.editor;
            }}
          >
            <SkipBack size={16} />
          </button>

          {/* Step back */}
          <button
            onClick={goBack}
            disabled={atStart}
            title="Step back (←)"
            style={{
              ...btnBase,
              padding: "6px 8px",
              opacity: atStart ? 0.3 : 1,
              cursor: atStart ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!atStart) {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  THEME.colors.text.accent;
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                THEME.colors.border.editor;
            }}
          >
            <ChevronLeft size={16} />
          </button>

          {/* Play/Pause — emphasized */}
          <button
            onClick={togglePlayback}
            disabled={noSteps}
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            style={{
              ...btnBase,
              padding: "8px 12px",
              borderColor: THEME.colors.text.accent,
              boxShadow: isPlaying
                ? `0 0 10px ${THEME.colors.text.accent}55`
                : "none",
              opacity: noSteps ? 0.3 : 1,
              cursor: noSteps ? "not-allowed" : "pointer",
              color: THEME.colors.text.accent,
            }}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>

          {/* Step forward */}
          <button
            onClick={goNext}
            disabled={atEnd}
            title="Step forward (→)"
            style={{
              ...btnBase,
              padding: "6px 8px",
              opacity: atEnd ? 0.3 : 1,
              cursor: atEnd ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!atEnd) {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  THEME.colors.text.accent;
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                THEME.colors.border.editor;
            }}
          >
            <ChevronRight size={16} />
          </button>

          {/* Go to end */}
          <button
            onClick={goToEnd}
            disabled={atEnd}
            title="Go to end (End)"
            style={{
              ...btnBase,
              padding: "6px 8px",
              opacity: atEnd ? 0.3 : 1,
              cursor: atEnd ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!atEnd) {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  THEME.colors.text.accent;
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                THEME.colors.border.editor;
            }}
          >
            <SkipForward size={16} />
          </button>
        </div>

        {/* Speed selector */}
        <div className="flex items-center gap-1">
          <span
            style={{
              color: THEME.colors.text.muted,
              fontSize: 12,
              marginRight: 4,
              fontFamily: THEME.fonts.ui,
            }}
          >
            Speed:
          </span>
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              style={{
                padding: "3px 8px",
                borderRadius: THEME.radius.sm,
                fontSize: 12,
                fontFamily: THEME.fonts.code,
                border: `1px solid ${s === speed ? THEME.colors.text.accent : THEME.colors.border.editor}`,
                backgroundColor:
                  s === speed
                    ? THEME.colors.text.accent
                    : THEME.colors.bg.tertiary,
                color:
                  s === speed
                    ? THEME.colors.bg.primary
                    : THEME.colors.text.secondary,
                cursor: "pointer",
              }}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Step indicator */}
        <span
          style={{
            fontFamily: THEME.fonts.code,
            fontSize: 13,
            color: THEME.colors.text.secondary,
            whiteSpace: "nowrap",
          }}
        >
          Step{" "}
          {totalSteps === 0 ? "—" : `${currentStepIndex + 1} / ${totalSteps}`}
        </span>
      </div>

      {/* Progress bar */}
      <div
        onClick={handleProgressClick}
        style={{
          height: 4,
          borderRadius: 2,
          backgroundColor: THEME.colors.bg.elevated,
          cursor: totalSteps > 1 ? "pointer" : "default",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${progress * 100}%`,
            background: `linear-gradient(to right, ${THEME.colors.border.callStack}, ${THEME.colors.border.microtaskQueue})`,
            transition: "width 0.2s ease",
          }}
        />
      </div>
    </div>
  );
}

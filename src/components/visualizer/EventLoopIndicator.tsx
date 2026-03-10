import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { THEME } from "@/constants/theme";
import { useVisualizerStore } from "@/store/useVisualizerStore";
import { useAnimationConfig } from "@/hooks/useAnimationConfig";
import type { EventLoopPhase } from "@/types";

interface PhaseConfig {
  animationDuration: string;
  opacity: number;
  dotColor: string;
  usePulse: boolean;
  glowColor?: string;
  isMicrotaskPhase?: boolean;
}

const PHASE_CONFIG: Record<EventLoopPhase, PhaseConfig> = {
  idle: {
    animationDuration: "4s",
    opacity: 0.5,
    dotColor: THEME.colors.text.muted,
    usePulse: false,
  },
  "executing-task": {
    animationDuration: "2s",
    opacity: 1,
    dotColor: THEME.colors.status.running,
    usePulse: false,
  },
  "checking-tasks": {
    animationDuration: "1s",
    opacity: 1,
    dotColor: THEME.colors.status.pending,
    usePulse: true,
  },
  "picking-task": {
    animationDuration: "0.8s",
    opacity: 1,
    dotColor: THEME.colors.text.accent,
    usePulse: true,
    glowColor: THEME.glow.eventLoop,
  },
  "checking-microtasks": {
    animationDuration: "1s",
    opacity: 1,
    dotColor: THEME.colors.border.microtaskQueue,
    usePulse: true,
    glowColor: THEME.glow.microtaskQueue,
    isMicrotaskPhase: true,
  },
  "draining-microtasks": {
    animationDuration: "0.6s",
    opacity: 1,
    dotColor: THEME.colors.border.microtaskQueue,
    usePulse: true,
    glowColor: THEME.glow.microtaskQueue,
    isMicrotaskPhase: true,
  },
};

/** Show priority order when relevant */
function PriorityIndicator({ phase }: { phase: EventLoopPhase }) {
  const showIndicator =
    phase === "checking-microtasks" ||
    phase === "draining-microtasks" ||
    phase === "checking-tasks";

  if (!showIndicator) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        marginTop: 8,
        padding: "6px 8px",
        backgroundColor: `${THEME.colors.bg.tertiary}`,
        borderRadius: THEME.radius.sm,
        fontSize: 9,
        fontFamily: THEME.fonts.ui,
      }}
    >
      <div className="flex items-center gap-1.5">
        <span style={{ color: THEME.colors.text.secondary }}>①</span>
        <span
          style={{ color: THEME.colors.border.microtaskQueue, fontWeight: 600 }}
        >
          Microtasks
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span style={{ color: THEME.colors.text.secondary }}>②</span>
        <span style={{ color: THEME.colors.border.taskQueue }}>Tasks</span>
      </div>
    </div>
  );
}

export function EventLoopIndicator() {
  const currentStep = useVisualizerStore((s) => s.currentStep);
  const { duration, shouldReduceMotion } = useAnimationConfig();
  const eventLoop = currentStep?.eventLoop ?? {
    phase: "idle" as EventLoopPhase,
    description: "Idle",
  };

  const config = PHASE_CONFIG[eventLoop.phase];
  const isActive =
    eventLoop.phase === "picking-task" ||
    eventLoop.phase === "draining-microtasks" ||
    eventLoop.phase === "checking-microtasks";

  const iconStyle: React.CSSProperties = {
    animation: config.usePulse
      ? `event-loop-pulse-anim ${config.animationDuration} ease-in-out infinite`
      : `event-loop-spin ${config.animationDuration} linear infinite`,
    opacity: config.opacity,
    color: config.isMicrotaskPhase
      ? THEME.colors.border.microtaskQueue
      : THEME.colors.text.accent,
    filter: config.glowColor
      ? `drop-shadow(0 0 8px ${config.isMicrotaskPhase ? THEME.colors.border.microtaskQueue : THEME.colors.text.accent})`
      : "none",
    transition: "opacity 0.3s ease, color 0.3s ease",
  };

  return (
    <Panel
      title="Event Loop"
      borderColor={THEME.colors.border.eventLoop}
      glowEffect={THEME.glow.eventLoop}
      className="w-36"
    >
      <style>{`
        @keyframes event-loop-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes event-loop-pulse-anim {
          0%, 100% { opacity: 1; transform: rotate(0deg) scale(1); }
          50% { opacity: 0.6; transform: rotate(180deg) scale(0.9); }
        }
        @keyframes event-loop-microtask-pulse {
          0%, 100% { opacity: 1; transform: rotate(0deg) scale(1); filter: drop-shadow(0 0 8px ${THEME.colors.border.microtaskQueue}); }
          50% { opacity: 0.7; transform: rotate(180deg) scale(0.95); filter: drop-shadow(0 0 12px ${THEME.colors.border.microtaskQueue}); }
        }
      `}</style>
      <div className="flex flex-col items-center gap-2 py-2">
        <motion.div
          animate={{
            boxShadow: isActive
              ? `0 0 20px ${config.isMicrotaskPhase ? THEME.colors.border.microtaskQueue : THEME.glow.eventLoop}`
              : "0 0 0px transparent",
          }}
          transition={{ duration: shouldReduceMotion ? 0 : duration.medium }}
          className="rounded-full p-1"
        >
          <RefreshCw size={34} style={iconStyle} />
        </motion.div>

        {/* Phase badge */}
        <div className="flex items-center gap-1.5">
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: config.dotColor,
              flexShrink: 0,
              display: "inline-block",
              boxShadow: config.isMicrotaskPhase
                ? `0 0 6px ${config.dotColor}`
                : "none",
            }}
          />
          <span
            className="text-center text-xs leading-tight"
            style={{
              color: config.isMicrotaskPhase
                ? THEME.colors.border.microtaskQueue
                : THEME.colors.text.secondary,
              fontFamily: THEME.fonts.ui,
              maxWidth: 100,
              wordBreak: "break-word",
            }}
          >
            {eventLoop.description}
          </span>
        </div>

        {/* Priority indicator */}
        <PriorityIndicator phase={eventLoop.phase} />
      </div>
    </Panel>
  );
}

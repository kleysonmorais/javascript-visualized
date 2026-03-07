import { RefreshCw } from 'lucide-react';
import { Panel } from '@/components/ui/Panel';
import { THEME } from '@/constants/theme';
import { useVisualizerStore } from '@/store/useVisualizerStore';
import type { EventLoopPhase } from '@/types';

interface PhaseConfig {
  animationDuration: string;
  opacity: number;
  dotColor: string;
  usePulse: boolean;
  glowColor?: string;
}

const PHASE_CONFIG: Record<EventLoopPhase, PhaseConfig> = {
  idle: {
    animationDuration: '4s',
    opacity: 0.5,
    dotColor: THEME.colors.text.muted,
    usePulse: false,
  },
  'executing-task': {
    animationDuration: '2s',
    opacity: 1,
    dotColor: THEME.colors.status.running,
    usePulse: false,
  },
  'checking-tasks': {
    animationDuration: '1s',
    opacity: 1,
    dotColor: THEME.colors.status.pending,
    usePulse: true,
  },
  'picking-task': {
    animationDuration: '0.8s',
    opacity: 1,
    dotColor: THEME.colors.text.accent,
    usePulse: true,
    glowColor: THEME.glow.eventLoop,
  },
  'checking-microtasks': {
    animationDuration: '1s',
    opacity: 1,
    dotColor: THEME.colors.border.microtaskQueue,
    usePulse: true,
  },
  'draining-microtasks': {
    animationDuration: '0.8s',
    opacity: 1,
    dotColor: THEME.colors.border.microtaskQueue,
    usePulse: true,
    glowColor: THEME.glow.microtaskQueue,
  },
};

export function EventLoopIndicator() {
  const currentStep = useVisualizerStore((s) => s.currentStep);
  const eventLoop = currentStep?.eventLoop ?? {
    phase: 'idle' as EventLoopPhase,
    description: 'Idle',
  };

  const config = PHASE_CONFIG[eventLoop.phase];

  const iconStyle: React.CSSProperties = {
    animation: config.usePulse
      ? `event-loop-pulse-anim ${config.animationDuration} ease-in-out infinite`
      : `event-loop-spin ${config.animationDuration} linear infinite`,
    opacity: config.opacity,
    color: THEME.colors.text.accent,
    filter: config.glowColor ? `drop-shadow(0 0 6px ${THEME.colors.text.accent})` : 'none',
    transition: 'opacity 0.3s ease',
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
      `}</style>
      <div className="flex flex-col items-center gap-3 py-2">
        <RefreshCw size={34} style={iconStyle} />

        {/* Phase badge */}
        <div className="flex items-center gap-1.5">
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: config.dotColor,
              flexShrink: 0,
              display: 'inline-block',
            }}
          />
          <span
            className="text-center text-xs leading-tight"
            style={{
              color: THEME.colors.text.secondary,
              fontFamily: THEME.fonts.ui,
              maxWidth: 100,
              wordBreak: 'break-word',
            }}
          >
            {eventLoop.description}
          </span>
        </div>
      </div>
    </Panel>
  );
}

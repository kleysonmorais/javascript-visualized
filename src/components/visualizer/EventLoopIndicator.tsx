import { RefreshCw } from 'lucide-react';
import { Panel } from '@/components/ui/Panel';
import { THEME } from '@/constants/theme';
import { useVisualizerStore } from '@/store/useVisualizerStore';
import type { EventLoopPhase } from '@/types';

const PHASE_SPIN: Record<EventLoopPhase, string> = {
  idle: 'event-loop-spin-slow',
  'executing-task': 'event-loop-spin-medium',
  'draining-microtasks': 'event-loop-spin-fast',
  'checking-microtasks': 'event-loop-pulse',
  'checking-tasks': 'event-loop-pulse',
  'picking-task': 'event-loop-pulse',
};

export function EventLoopIndicator() {
  const currentStep = useVisualizerStore((s) => s.currentStep);
  const eventLoop = currentStep?.eventLoop ?? { phase: 'idle' as EventLoopPhase, description: 'Idle' };

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
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        .event-loop-spin-slow { animation: event-loop-spin 4s linear infinite; }
        .event-loop-spin-medium { animation: event-loop-spin 2s linear infinite; }
        .event-loop-spin-fast { animation: event-loop-spin 1s linear infinite; }
        .event-loop-pulse { animation: event-loop-pulse-anim 0.8s ease-in-out infinite; }
      `}</style>
      <div className="flex flex-col items-center gap-3 py-2">
        <RefreshCw
          className={PHASE_SPIN[eventLoop.phase]}
          size={32}
          color={THEME.colors.text.accent}
        />
        <span
          className="text-center text-xs leading-tight"
          style={{ color: THEME.colors.text.muted, fontFamily: THEME.fonts.ui }}
        >
          {eventLoop.description}
        </span>
      </div>
    </Panel>
  );
}

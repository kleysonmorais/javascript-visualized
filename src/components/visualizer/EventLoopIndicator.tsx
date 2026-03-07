import { RefreshCw } from 'lucide-react';
import { Panel } from '@/components/ui/Panel';
import { THEME } from '@/constants/theme';
import { useVisualizerStore } from '@/store/useVisualizerStore';

export function EventLoopIndicator() {
  const currentStep = useVisualizerStore((s) => s.currentStep);
  const description = currentStep?.eventLoop.description ?? 'Idle';

  return (
    <Panel
      title="Event Loop"
      borderColor={THEME.colors.border.eventLoop}
      glowEffect={THEME.glow.eventLoop}
      className="w-36"
    >
      <div className="flex flex-col items-center gap-3 py-2">
        <style>{`
          @keyframes event-loop-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .event-loop-icon {
            animation: event-loop-spin 3s linear infinite;
          }
        `}</style>
        <RefreshCw
          className="event-loop-icon"
          size={32}
          color={THEME.colors.text.accent}
        />
        <span
          className="text-center text-xs leading-tight"
          style={{ color: THEME.colors.text.muted, fontFamily: THEME.fonts.ui }}
        >
          {description}
        </span>
      </div>
    </Panel>
  );
}

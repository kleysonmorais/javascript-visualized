import { Panel } from '@/components/ui/Panel';
import { THEME } from '@/constants/theme';
import { useVisualizerStore } from '@/store/useVisualizerStore';

export function CallStack() {
  const currentStep = useVisualizerStore((s) => s.currentStep);
  const frames = currentStep?.callStack ?? [];

  return (
    <Panel
      title="Call Stack"
      borderColor={THEME.colors.border.callStack}
      glowEffect={THEME.glow.callStack}
      className="flex-1"
    >
      {frames.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <span style={{ color: THEME.colors.text.muted, fontSize: 13 }}>Empty</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {frames.map((frame) => (
            <div
              key={frame.id}
              className="px-3 py-2 rounded"
              style={{
                backgroundColor: THEME.colors.bg.tertiary,
                border: `1px solid ${THEME.colors.border.callStack}44`,
                color: THEME.colors.text.primary,
                fontFamily: THEME.fonts.code,
                fontSize: 13,
              }}
            >
              {frame.name}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

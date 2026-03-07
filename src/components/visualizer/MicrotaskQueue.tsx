import { Panel } from '@/components/ui/Panel';
import { THEME } from '@/constants/theme';
import { useVisualizerStore } from '@/store/useVisualizerStore';

export function MicrotaskQueue() {
  const currentStep = useVisualizerStore((s) => s.currentStep);
  const microtasks = currentStep?.microtaskQueue ?? [];

  return (
    <Panel
      title="Microtask Queue"
      borderColor={THEME.colors.border.microtaskQueue}
      glowEffect={THEME.glow.microtaskQueue}
    >
      {microtasks.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <span style={{ color: THEME.colors.text.muted, fontSize: 13 }}>No microtasks</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {microtasks.map((task) => (
            <div
              key={task.id}
              className="px-3 py-2 rounded"
              style={{
                backgroundColor: THEME.colors.bg.tertiary,
                border: `1px solid ${THEME.colors.border.microtaskQueue}44`,
                color: THEME.colors.text.primary,
                fontFamily: THEME.fonts.code,
                fontSize: 13,
              }}
            >
              {task.callbackLabel}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

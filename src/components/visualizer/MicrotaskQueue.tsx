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
          <span
            className="text-center text-xs"
            style={{ color: THEME.colors.text.muted, fontFamily: THEME.fonts.ui }}
          >
            Promise callbacks will queue here
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {/* Dequeue direction indicator */}
          <span
            style={{
              fontSize: 12,
              color: THEME.colors.text.muted,
              flexShrink: 0,
              userSelect: 'none',
            }}
          >
            ▶
          </span>
          {microtasks.map((task) => (
            <div
              key={task.id}
              style={{
                backgroundColor: THEME.colors.bg.tertiary,
                border: `1px solid ${THEME.colors.border.microtaskQueue}`,
                borderRadius: THEME.radius.md,
                padding: '6px 10px',
                flexShrink: 0,
                minWidth: 100,
                maxWidth: 160,
              }}
            >
              <div
                style={{
                  fontFamily: THEME.fonts.code,
                  fontSize: 12,
                  color: THEME.colors.text.primary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={task.callbackLabel}
              >
                {task.callbackLabel.length > 40
                  ? task.callbackLabel.slice(0, 40) + '…'
                  : task.callbackLabel}
              </div>
              <div
                style={{
                  fontFamily: THEME.fonts.ui,
                  fontSize: 10,
                  color: THEME.colors.text.muted,
                  marginTop: 2,
                }}
              >
                {task.sourceType}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

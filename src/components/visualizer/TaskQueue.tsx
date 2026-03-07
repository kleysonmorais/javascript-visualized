import { Panel } from '@/components/ui/Panel';
import { THEME } from '@/constants/theme';
import { useVisualizerStore } from '@/store/useVisualizerStore';

export function TaskQueue() {
  const currentStep = useVisualizerStore((s) => s.currentStep);
  const tasks = currentStep?.taskQueue ?? [];

  return (
    <Panel
      title="Task Queue"
      borderColor={THEME.colors.border.taskQueue}
      glowEffect={THEME.glow.taskQueue}
    >
      {tasks.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <span style={{ color: THEME.colors.text.muted, fontSize: 13 }}>No tasks</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="px-3 py-2 rounded"
              style={{
                backgroundColor: THEME.colors.bg.tertiary,
                border: `1px solid ${THEME.colors.border.taskQueue}44`,
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

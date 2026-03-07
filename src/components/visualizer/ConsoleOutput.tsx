import { Panel } from '@/components/ui/Panel';
import { THEME } from '@/constants/theme';
import { useVisualizerStore } from '@/store/useVisualizerStore';
import type { ConsoleMethod } from '@/types';

const METHOD_COLORS: Record<ConsoleMethod, string> = {
  log: THEME.colors.text.primary,
  info: THEME.colors.text.accent,
  warn: THEME.colors.status.pending,
  error: THEME.colors.status.error,
};

export function ConsoleOutput() {
  const currentStep = useVisualizerStore((s) => s.currentStep);
  const entries = currentStep?.console ?? [];

  return (
    <Panel
      title="console"
      borderColor={THEME.colors.border.console}
      className="h-44"
    >
      <div
        className="flex flex-col gap-1 h-full overflow-y-auto"
        style={{
          fontFamily: THEME.fonts.code,
          fontSize: 13,
          backgroundColor: THEME.colors.bg.primary,
          borderRadius: THEME.radius.sm,
          padding: '8px',
          margin: '-8px',
        }}
      >
        {entries.length === 0 ? (
          <span style={{ color: THEME.colors.text.muted }}>
            <span style={{ color: THEME.colors.text.accent }}>{'>'}</span>
          </span>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="flex gap-2">
              <span style={{ color: THEME.colors.text.accent }}>{'>'}</span>
              <span style={{ color: METHOD_COLORS[entry.method] }}>
                {entry.args.join(' ')}
              </span>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}

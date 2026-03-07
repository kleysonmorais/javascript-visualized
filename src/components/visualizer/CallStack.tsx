import { Panel } from '@/components/ui/Panel';
import { THEME } from '@/constants/theme';
import { useVisualizerStore } from '@/store/useVisualizerStore';
import type { CallStackFrame } from '@/types';

const TYPE_LABELS: Record<CallStackFrame['type'], string> = {
  global: 'global',
  function: 'fn',
  method: 'method',
  async: 'async',
  generator: 'gen',
};

export function CallStack() {
  const currentStep = useVisualizerStore((s) => s.currentStep);
  const frames = currentStep?.callStack ?? [];
  // Stack is displayed top-to-bottom with most recent (top of stack) first
  const reversed = [...frames].reverse();

  return (
    <Panel
      title="Call Stack"
      borderColor={THEME.colors.border.callStack}
      glowEffect={THEME.glow.callStack}
      className="flex-1"
    >
      {reversed.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <span style={{ color: THEME.colors.text.muted, fontSize: 13 }}>Empty</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {reversed.map((frame) => (
            <div
              key={frame.id}
              className="px-3 py-2 rounded"
              style={{
                backgroundColor: THEME.colors.bg.elevated,
                borderLeft: `3px solid ${THEME.colors.border.callStack}`,
                border: `1px solid ${THEME.colors.border.callStack}44`,
                borderLeftWidth: 3,
                color: THEME.colors.text.primary,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span style={{ fontFamily: THEME.fonts.code, fontSize: 13, fontWeight: 600 }}>
                  {frame.name}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: THEME.fonts.code,
                    color: THEME.colors.border.callStack,
                    backgroundColor: `${THEME.colors.border.callStack}22`,
                    padding: '1px 5px',
                    borderRadius: 4,
                    flexShrink: 0,
                  }}
                >
                  {TYPE_LABELS[frame.type]}
                </span>
              </div>
              <div style={{ fontSize: 11, color: THEME.colors.text.muted, marginTop: 2, fontFamily: THEME.fonts.code }}>
                line {frame.line}, col {frame.column}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

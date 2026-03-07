import { Panel } from '@/components/ui/Panel';
import { THEME } from '@/constants/theme';
import { useVisualizerStore } from '@/store/useVisualizerStore';

const STATIC_API_NAMES = ['fetch', 'URL', 'localStorage', 'sessionStorage', 'HTMLDivElement', 'document', 'indexedDB', 'XMLHttpRequest'];

export function WebAPIs() {
  const currentStep = useVisualizerStore((s) => s.currentStep);
  const activeEntries = currentStep?.webAPIs ?? [];

  return (
    <Panel
      title="Web APIs"
      borderColor={THEME.colors.border.webAPIs}
      glowEffect={THEME.glow.webAPIs}
      className="flex-1"
    >
      <div className="flex flex-col gap-3">
        {activeEntries.length > 0 && (
          <div className="flex flex-col gap-2">
            {activeEntries.map((entry) => {
              const progress = entry.delay && entry.elapsed !== undefined
                ? Math.min(entry.elapsed / entry.delay, 1)
                : 0;
              const isCompleted = entry.status === 'completed';
              return (
                <div
                  key={entry.id}
                  className="px-3 py-2 rounded"
                  style={{
                    backgroundColor: THEME.colors.bg.elevated,
                    border: `1px solid ${THEME.colors.border.webAPIs}55`,
                    borderLeft: `3px solid ${THEME.colors.border.webAPIs}`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontFamily: THEME.fonts.code, fontSize: 13, fontWeight: 600, color: THEME.colors.text.primary }}>
                      {entry.label}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: THEME.fonts.code,
                        color: isCompleted ? THEME.colors.status.completed : THEME.colors.status.running,
                        backgroundColor: isCompleted ? `${THEME.colors.status.completed}22` : `${THEME.colors.status.running}22`,
                        padding: '1px 5px',
                        borderRadius: 4,
                        flexShrink: 0,
                      }}
                    >
                      {entry.status}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-1">
                    <span style={{ fontSize: 11, color: THEME.colors.text.muted, fontFamily: THEME.fonts.code }}>
                      cb: <span style={{ color: THEME.colors.text.secondary }}>{entry.callback}</span>
                    </span>
                    {entry.delay !== undefined && (
                      <span style={{ fontSize: 11, color: THEME.colors.text.muted, fontFamily: THEME.fonts.code }}>
                        delay: <span style={{ color: THEME.colors.text.secondary }}>{entry.delay}ms</span>
                      </span>
                    )}
                  </div>
                  {entry.delay !== undefined && (
                    <div style={{ marginTop: 6, height: 3, borderRadius: 2, backgroundColor: THEME.colors.bg.primary, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${progress * 100}%`,
                          backgroundColor: isCompleted ? THEME.colors.status.completed : THEME.colors.border.webAPIs,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {STATIC_API_NAMES.map((api) => (
            <span
              key={api}
              className="px-2 py-1 rounded text-xs"
              style={{
                backgroundColor: THEME.colors.bg.tertiary,
                color: THEME.colors.text.muted,
                fontFamily: THEME.fonts.code,
                border: `1px solid ${THEME.colors.border.webAPIs}33`,
              }}
            >
              {api}
            </span>
          ))}
          <span
            className="px-2 py-1 rounded text-xs italic"
            style={{ color: THEME.colors.text.muted, fontFamily: THEME.fonts.code }}
          >
            Many more...
          </span>
        </div>
      </div>
    </Panel>
  );
}

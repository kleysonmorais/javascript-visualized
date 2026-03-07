import { Panel } from '@/components/ui/Panel';
import { THEME } from '@/constants/theme';

const WEB_API_NAMES = [
  'fetch',
  'setTimeout',
  'URL',
  'localStorage',
  'sessionStorage',
  'HTMLDivElement',
  'document',
  'indexedDB',
  'XMLHttpRequest',
];

export function WebAPIs() {
  return (
    <Panel
      title="Web APIs"
      borderColor={THEME.colors.border.webAPIs}
      glowEffect={THEME.glow.webAPIs}
      className="flex-1"
    >
      <div className="flex flex-wrap gap-2">
        {WEB_API_NAMES.map((api) => (
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
          style={{
            color: THEME.colors.text.muted,
            fontFamily: THEME.fonts.code,
          }}
        >
          Many more...
        </span>
      </div>
    </Panel>
  );
}

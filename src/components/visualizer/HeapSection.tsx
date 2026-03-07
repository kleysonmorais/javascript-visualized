import { THEME } from '@/constants/theme';
import type { HeapObject, HeapObjectProperty } from '@/types';

function primitiveColor(displayValue: string): string {
  if (displayValue === 'undefined' || displayValue === 'null') return THEME.colors.text.muted;
  if (displayValue === 'true' || displayValue === 'false') return THEME.colors.syntax.keyword;
  if (/^-?\d/.test(displayValue)) return THEME.colors.syntax.number;
  if (displayValue.startsWith('"') || displayValue.startsWith("'")) return THEME.colors.syntax.string;
  return THEME.colors.text.primary;
}

function PropertyValue({ prop }: { prop: HeapObjectProperty }) {
  if (prop.valueType === 'function') {
    return (
      <span style={{ fontFamily: THEME.fonts.code, fontSize: 11 }}>
        <span style={{ color: THEME.colors.syntax.function }}>ⓕ</span>
        {prop.pointerColor && (
          <span style={{ color: prop.pointerColor, fontSize: 9, marginLeft: 3 }}>●</span>
        )}
      </span>
    );
  }
  if (prop.valueType === 'object') {
    return (
      <span style={{ fontFamily: THEME.fonts.code, fontSize: 11 }}>
        <span style={{ color: THEME.colors.text.secondary }}>[Ptr]</span>
        {prop.pointerColor && (
          <span style={{ color: prop.pointerColor, fontSize: 9, marginLeft: 3 }}>●</span>
        )}
      </span>
    );
  }
  return (
    <span style={{ fontFamily: THEME.fonts.code, fontSize: 11, color: primitiveColor(prop.displayValue) }}>
      {prop.displayValue}
    </span>
  );
}

function HeapCard({ obj }: { obj: HeapObject }) {
  return (
    <div
      style={{
        backgroundColor: THEME.colors.bg.tertiary,
        borderRadius: THEME.radius.sm,
        padding: '6px 8px',
        border: `1px solid ${obj.color}33`,
      }}
    >
      <div className="flex items-start gap-2">
        <span style={{ color: obj.color, fontSize: 11, lineHeight: 1.6, flexShrink: 0 }}>●</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {obj.type === 'function' ? (
            <pre
              style={{
                margin: 0,
                fontFamily: THEME.fonts.code,
                fontSize: 11,
                color: THEME.colors.syntax.function,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {obj.functionSource ?? obj.label}
            </pre>
          ) : obj.properties && obj.properties.length > 0 ? (
            <div style={{ fontFamily: THEME.fonts.code, fontSize: 11 }}>
              <span style={{ color: THEME.colors.text.secondary }}>{'{ '}</span>
              <div style={{ paddingLeft: 10 }}>
                {obj.properties.map((prop, i) => (
                  <div key={prop.key} className="flex items-center gap-1">
                    <span style={{ color: THEME.colors.syntax.variable }}>{prop.key}</span>
                    <span style={{ color: THEME.colors.text.muted }}>:</span>
                    <PropertyValue prop={prop} />
                    {i < obj.properties!.length - 1 && (
                      <span style={{ color: THEME.colors.text.muted }}>,</span>
                    )}
                  </div>
                ))}
              </div>
              <span style={{ color: THEME.colors.text.secondary }}>{' }'}</span>
            </div>
          ) : (
            <span style={{ fontFamily: THEME.fonts.code, fontSize: 11, color: THEME.colors.text.primary }}>
              {obj.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface HeapSectionProps {
  heap: HeapObject[];
}

export function HeapSection({ heap }: HeapSectionProps) {
  return (
    <div
      style={{
        border: `1px dashed ${THEME.colors.text.muted}55`,
        borderRadius: THEME.radius.sm,
        padding: '8px 10px',
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: THEME.colors.text.muted,
          fontFamily: THEME.fonts.code,
          marginBottom: 8,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Heap
      </div>
      {heap.length === 0 ? (
        <div style={{ fontSize: 11, color: THEME.colors.text.muted, fontFamily: THEME.fonts.code }}>
          No heap objects
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {heap.map((obj) => (
            <HeapCard key={obj.id} obj={obj} />
          ))}
        </div>
      )}
    </div>
  );
}

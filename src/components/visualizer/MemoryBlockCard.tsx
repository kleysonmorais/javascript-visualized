import { THEME } from '@/constants/theme';
import type { MemoryBlock, MemoryEntry } from '@/types';

function PointerBadge({ color }: { color: string }) {
  return (
    <span style={{ color, fontSize: 10, lineHeight: 1, marginLeft: 4 }}>●</span>
  );
}

function EntryValue({ entry }: { entry: MemoryEntry }) {
  if (entry.valueType === 'function') {
    return (
      <span style={{ fontFamily: THEME.fonts.code, fontSize: 12 }}>
        <span style={{ color: THEME.colors.syntax.function }}>ⓕ</span>
        {entry.pointerColor && <PointerBadge color={entry.pointerColor} />}
      </span>
    );
  }
  if (entry.valueType === 'object') {
    return (
      <span style={{ fontFamily: THEME.fonts.code, fontSize: 12 }}>
        <span style={{ color: THEME.colors.text.secondary }}>[Pointer]</span>
        {entry.pointerColor && <PointerBadge color={entry.pointerColor} />}
      </span>
    );
  }
  return (
    <span
      style={{
        fontFamily: THEME.fonts.code,
        fontSize: 12,
        color: THEME.colors.syntax.string,
      }}
    >
      {entry.displayValue}
    </span>
  );
}

interface MemoryBlockCardProps {
  block: MemoryBlock;
}

export function MemoryBlockCard({ block }: MemoryBlockCardProps) {
  return (
    <div
      style={{
        borderLeft: `3px solid ${block.color}`,
        border: `1px solid ${block.color}33`,
        borderLeftWidth: 3,
        borderLeftColor: block.color,
        borderLeftStyle: 'solid',
        borderRadius: THEME.radius.sm,
        backgroundColor: THEME.colors.bg.elevated,
        padding: '8px 10px',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: block.color, fontSize: 10, lineHeight: 1 }}>●</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: block.color,
            fontFamily: THEME.fonts.code,
          }}
        >
          {block.label}
        </span>
      </div>

      {/* Entries */}
      {block.entries.length === 0 ? (
        <div style={{ fontSize: 11, color: THEME.colors.text.muted, fontFamily: THEME.fonts.code }}>
          (empty)
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {block.entries.map((entry) => (
            <div key={entry.name} className="flex items-center justify-between gap-4">
              <span
                style={{
                  fontSize: 12,
                  fontFamily: THEME.fonts.code,
                  color: THEME.colors.syntax.variable,
                  flexShrink: 0,
                }}
              >
                {entry.name}
              </span>
              <EntryValue entry={entry} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

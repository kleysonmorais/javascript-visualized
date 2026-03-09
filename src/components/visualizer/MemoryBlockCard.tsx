import { THEME } from "@/constants/theme";
import { useVisualizerStore } from "@/store/useVisualizerStore";
import type { MemoryBlock, MemoryEntry } from "@/types";

interface PointerBadgeProps {
  color: string;
  heapReferenceId?: string;
  isHighlighted?: boolean;
}

function PointerBadge({
  color,
  heapReferenceId,
  isHighlighted,
}: PointerBadgeProps) {
  const setHoveredPointerId = useVisualizerStore((s) => s.setHoveredPointerId);

  return (
    <span
      style={{
        color,
        fontSize: 10,
        lineHeight: 1,
        marginLeft: 4,
        transition: "text-shadow 0.2s ease",
        textShadow: isHighlighted ? `0 0 8px ${color}` : "none",
        cursor: heapReferenceId ? "pointer" : "default",
      }}
      onMouseEnter={() =>
        heapReferenceId && setHoveredPointerId(heapReferenceId)
      }
      onMouseLeave={() => heapReferenceId && setHoveredPointerId(null)}
    >
      ●
    </span>
  );
}

function primitiveColor(displayValue: string): string {
  if (displayValue === "undefined" || displayValue === "null")
    return THEME.colors.text.muted;
  if (displayValue === "true" || displayValue === "false")
    return THEME.colors.syntax.keyword;
  if (/^-?\d/.test(displayValue)) return THEME.colors.syntax.number;
  if (displayValue.startsWith('"') || displayValue.startsWith("'"))
    return THEME.colors.syntax.string;
  return THEME.colors.text.primary;
}

interface EntryValueProps {
  entry: MemoryEntry;
  isPointerHighlighted: boolean;
}

function EntryValue({ entry, isPointerHighlighted }: EntryValueProps) {
  const setHoveredPointerId = useVisualizerStore((s) => s.setHoveredPointerId);

  if (entry.valueType === "function") {
    return (
      <span
        style={{
          fontFamily: THEME.fonts.code,
          fontSize: 12,
          cursor: entry.heapReferenceId ? "pointer" : "default",
          transition: "text-shadow 0.2s ease",
          textShadow:
            isPointerHighlighted && entry.pointerColor
              ? `0 0 8px ${entry.pointerColor}`
              : "none",
        }}
        onMouseEnter={() =>
          entry.heapReferenceId && setHoveredPointerId(entry.heapReferenceId)
        }
        onMouseLeave={() => entry.heapReferenceId && setHoveredPointerId(null)}
      >
        <span style={{ color: THEME.colors.syntax.function, fontWeight: 700 }}>
          ⓕ
        </span>
        {entry.pointerColor && (
          <PointerBadge
            color={entry.pointerColor}
            heapReferenceId={entry.heapReferenceId}
            isHighlighted={isPointerHighlighted}
          />
        )}
      </span>
    );
  }
  if (entry.valueType === "object") {
    return (
      <span
        style={{
          fontFamily: THEME.fonts.code,
          fontSize: 12,
          cursor: entry.heapReferenceId ? "pointer" : "default",
          transition: "text-shadow 0.2s ease",
          textShadow:
            isPointerHighlighted && entry.pointerColor
              ? `0 0 8px ${entry.pointerColor}`
              : "none",
        }}
        onMouseEnter={() =>
          entry.heapReferenceId && setHoveredPointerId(entry.heapReferenceId)
        }
        onMouseLeave={() => entry.heapReferenceId && setHoveredPointerId(null)}
      >
        <span style={{ color: THEME.colors.text.muted, fontStyle: "italic" }}>
          [Pointer]
        </span>
        {entry.pointerColor && (
          <PointerBadge
            color={entry.pointerColor}
            heapReferenceId={entry.heapReferenceId}
            isHighlighted={isPointerHighlighted}
          />
        )}
      </span>
    );
  }
  return (
    <span
      style={{
        fontFamily: THEME.fonts.code,
        fontSize: 12,
        color: primitiveColor(entry.displayValue),
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
  const hoveredFrameId = useVisualizerStore((s) => s.hoveredFrameId);
  const hoveredHeapId = useVisualizerStore((s) => s.hoveredHeapId);
  const setHoveredFrameId = useVisualizerStore((s) => s.setHoveredFrameId);

  const isFrameHighlighted = hoveredFrameId === block.frameId;
  const isSuspended = block.suspended === true;
  const suspendedColor = THEME.colors.status.pending; // amber

  return (
    <div
      style={{
        border: `1px solid ${isFrameHighlighted ? block.color : `${block.color}33`}`,
        borderLeftWidth: 3,
        borderLeftColor: isSuspended ? suspendedColor : block.color,
        borderLeftStyle: isSuspended ? "dashed" : "solid",
        borderRadius: THEME.radius.sm,
        backgroundColor: THEME.colors.bg.elevated,
        padding: "8px 10px",
        boxShadow: isFrameHighlighted ? `0 0 12px ${block.color}50` : "none",
        opacity: isSuspended ? 0.5 : 1,
        transition: "box-shadow 0.2s ease, border-color 0.2s ease, opacity 0.3s ease",
        cursor: "pointer",
      }}
      onMouseEnter={() => setHoveredFrameId(block.frameId)}
      onMouseLeave={() => setHoveredFrameId(null)}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: block.color, fontSize: 10, lineHeight: 1 }}>
          ●
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: block.color,
            fontFamily: THEME.fonts.code,
          }}
        >
          {block.label}
          {isSuspended && (
            <span
              style={{
                color: THEME.colors.text.muted,
                fontWeight: 400,
                marginLeft: 4,
              }}
            >
              (suspended)
            </span>
          )}
        </span>
      </div>

      {/* Entries */}
      {block.entries.length === 0 ? (
        <div
          style={{
            fontSize: 11,
            color: THEME.colors.text.muted,
            fontFamily: THEME.fonts.code,
          }}
        >
          (empty)
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {block.entries.map((entry) => {
            const isPointerHighlighted =
              entry.heapReferenceId === hoveredHeapId;
            const isThis = entry.name === "this";
            return (
              <div
                key={entry.name}
                className="flex items-center justify-between gap-4"
              >
                <span
                  style={{
                    fontSize: 12,
                    fontFamily: THEME.fonts.code,
                    color: isThis
                      ? THEME.colors.syntax.keyword
                      : THEME.colors.text.secondary,
                    fontWeight: isThis ? 700 : undefined,
                    flexShrink: 0,
                  }}
                >
                  {entry.name}
                </span>
                <EntryValue
                  entry={entry}
                  isPointerHighlighted={isPointerHighlighted}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

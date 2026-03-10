import { motion } from "framer-motion";
import { THEME } from "@/constants/theme";
import { useVisualizerStore } from "@/store/useVisualizerStore";
import { useAnimationConfig } from "@/hooks/useAnimationConfig";
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
  const { duration, shouldReduceMotion } = useAnimationConfig();

  return (
    <motion.span
      style={{
        color,
        fontSize: 10,
        lineHeight: 1,
        marginLeft: 4,
        cursor: heapReferenceId ? "pointer" : "default",
      }}
      animate={{
        textShadow: isHighlighted ? `0 0 8px ${color}` : "0 0 0px transparent",
      }}
      transition={{ duration: shouldReduceMotion ? 0 : duration.normal }}
      onMouseEnter={() =>
        heapReferenceId && setHoveredPointerId(heapReferenceId)
      }
      onMouseLeave={() => heapReferenceId && setHoveredPointerId(null)}
    >
      ●
    </motion.span>
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
  const { duration, shouldReduceMotion } = useAnimationConfig();

  if (entry.valueType === "function") {
    const isGenerator = entry.displayValue === "ⓕ*";
    return (
      <motion.span
        style={{
          fontFamily: THEME.fonts.code,
          fontSize: 12,
          cursor: entry.heapReferenceId ? "pointer" : "default",
        }}
        animate={{
          textShadow:
            isPointerHighlighted && entry.pointerColor
              ? `0 0 8px ${entry.pointerColor}`
              : "0 0 0px transparent",
        }}
        transition={{ duration: shouldReduceMotion ? 0 : duration.normal }}
        onMouseEnter={() =>
          entry.heapReferenceId && setHoveredPointerId(entry.heapReferenceId)
        }
        onMouseLeave={() => entry.heapReferenceId && setHoveredPointerId(null)}
      >
        <span style={{ color: THEME.colors.syntax.function, fontWeight: 700 }}>
          ⓕ
        </span>
        {isGenerator && (
          <span style={{ color: THEME.colors.syntax.keyword, fontWeight: 700 }}>
            *
          </span>
        )}
        {entry.pointerColor && (
          <PointerBadge
            color={entry.pointerColor}
            heapReferenceId={entry.heapReferenceId}
            isHighlighted={isPointerHighlighted}
          />
        )}
      </motion.span>
    );
  }
  if (entry.valueType === "object") {
    return (
      <motion.span
        style={{
          fontFamily: THEME.fonts.code,
          fontSize: 12,
          cursor: entry.heapReferenceId ? "pointer" : "default",
        }}
        animate={{
          textShadow:
            isPointerHighlighted && entry.pointerColor
              ? `0 0 8px ${entry.pointerColor}`
              : "0 0 0px transparent",
        }}
        transition={{ duration: shouldReduceMotion ? 0 : duration.normal }}
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
      </motion.span>
    );
  }
  // Primitive value with change highlight animation
  return (
    <motion.span
      key={`${entry.name}-${entry.displayValue}`}
      initial={
        shouldReduceMotion
          ? false
          : { backgroundColor: "rgba(34, 211, 238, 0.2)" }
      }
      animate={{ backgroundColor: "rgba(34, 211, 238, 0)" }}
      transition={{ duration: duration.highlight }}
      style={{
        fontFamily: THEME.fonts.code,
        fontSize: 12,
        color: primitiveColor(entry.displayValue),
        borderRadius: 2,
        padding: "0 2px",
        margin: "0 -2px",
      }}
    >
      {entry.displayValue}
    </motion.span>
  );
}

interface MemoryBlockCardProps {
  block: MemoryBlock;
}

export function MemoryBlockCard({ block }: MemoryBlockCardProps) {
  const hoveredFrameId = useVisualizerStore((s) => s.hoveredFrameId);
  const hoveredHeapId = useVisualizerStore((s) => s.hoveredHeapId);
  const setHoveredFrameId = useVisualizerStore((s) => s.setHoveredFrameId);
  const { duration, shouldReduceMotion } = useAnimationConfig();

  const isFrameHighlighted = hoveredFrameId === block.frameId;
  const isSuspended = block.suspended === true;
  const isModuleScope = block.type === "module";
  const suspendedColor = THEME.colors.status.pending; // amber

  return (
    <motion.div
      animate={{
        opacity: isSuspended ? 0.5 : 1,
        boxShadow: isFrameHighlighted
          ? `0 0 12px ${block.color}50`
          : "0 0 0px transparent",
        borderColor: isFrameHighlighted ? block.color : `${block.color}33`,
      }}
      transition={{ duration: shouldReduceMotion ? 0 : duration.medium }}
      style={{
        border: `1px solid ${isFrameHighlighted ? block.color : `${block.color}33`}`,
        borderLeftWidth: 3,
        borderLeftColor: isSuspended ? suspendedColor : block.color,
        borderLeftStyle: isSuspended
          ? "dashed"
          : isModuleScope
            ? "dotted"
            : "solid",
        borderRadius: THEME.radius.sm,
        backgroundColor: THEME.colors.bg.elevated,
        padding: "8px 10px",
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
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {/* Destructuring indicator */}
                  {entry.isDestructured && (
                    <span
                      style={{
                        color: THEME.colors.text.muted,
                        fontSize: 10,
                      }}
                      title="Destructured"
                    >
                      {"{ }"}
                    </span>
                  )}
                  {entry.name}
                  {/* Export badge */}
                  {entry.isExported && (
                    <span
                      style={{
                        color: THEME.colors.syntax.keyword,
                        fontSize: 10,
                        marginLeft: 2,
                      }}
                      title="Exported"
                    >
                      ↗
                    </span>
                  )}
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
    </motion.div>
  );
}

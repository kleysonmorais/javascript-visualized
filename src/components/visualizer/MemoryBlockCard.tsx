import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { THEME } from "@/constants/theme";
import { useVisualizerStore } from "@/store/useVisualizerStore";
import { useAnimationConfig } from "@/hooks/useAnimationConfig";
import type { MemoryBlock, MemoryEntry } from "@/types";

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

function PointerDot({
  color,
  heapReferenceId,
  isHighlighted,
}: {
  color: string;
  heapReferenceId?: string;
  isHighlighted?: boolean;
}) {
  const setHoveredPointerId = useVisualizerStore((s) => s.setHoveredPointerId);
  const { duration, shouldReduceMotion } = useAnimationConfig();

  return (
    <motion.span
      style={{
        color,
        fontSize: 8,
        lineHeight: 1,
        marginLeft: 4,
        cursor: heapReferenceId ? "pointer" : "default",
        display: "inline-block",
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

function EntryValue({
  entry,
  isPointerHighlighted,
}: {
  entry: MemoryEntry;
  isPointerHighlighted: boolean;
}) {
  const setHoveredPointerId = useVisualizerStore((s) => s.setHoveredPointerId);
  const setHoveredHeapId = useVisualizerStore((s) => s.setHoveredHeapId);
  const { duration, shouldReduceMotion } = useAnimationConfig();

  const handleMouseEnter = () => {
    if (entry.heapReferenceId) {
      setHoveredPointerId(entry.heapReferenceId);
      setHoveredHeapId(entry.heapReferenceId);
    }
  };

  const handleMouseLeave = () => {
    if (entry.heapReferenceId) {
      setHoveredPointerId(null);
      setHoveredHeapId(null);
    }
  };

  if (entry.valueType === "function") {
    const isGenerator = entry.displayValue === "ⓕ*";
    return (
      <motion.span
        className="flex items-center"
        style={{
          fontFamily: THEME.fonts.code,
          fontSize: 11,
          cursor: entry.heapReferenceId ? "pointer" : "default",
        }}
        animate={
          isPointerHighlighted && entry.pointerColor
            ? {
                textShadow: `0 0 8px ${entry.pointerColor}, 0 0 20px ${entry.pointerColor}, 0 0 40px ${entry.pointerColor}, 0 0 60px ${entry.pointerColor}`,
                backgroundColor: `${entry.pointerColor}40`,
                padding: "0 3px",
                borderRadius: 2,
              }
            : {}
        }
        transition={{ duration: shouldReduceMotion ? 0 : duration.normal }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span style={{ color: THEME.colors.syntax.function, fontWeight: 600 }}>
          ƒ
        </span>
        {isGenerator && (
          <span style={{ color: THEME.colors.syntax.keyword, fontWeight: 600 }}>
            *
          </span>
        )}
        {entry.pointerColor && (
          <PointerDot
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
        className="flex items-center"
        style={{
          fontFamily: THEME.fonts.code,
          fontSize: 11,
          cursor: entry.heapReferenceId ? "pointer" : "default",
        }}
        animate={
          isPointerHighlighted && entry.pointerColor
            ? {
                textShadow: `0 0 8px ${entry.pointerColor}, 0 0 20px ${entry.pointerColor}, 0 0 40px ${entry.pointerColor}, 0 0 60px ${entry.pointerColor}`,
                backgroundColor: `${entry.pointerColor}40`,
                padding: "0 3px",
                borderRadius: 2,
              }
            : {}
        }
        transition={{ duration: shouldReduceMotion ? 0 : duration.normal }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span style={{ color: THEME.colors.syntax.function, fontWeight: 600 }}>
          ref
        </span>
        {entry.pointerColor && (
          <PointerDot
            color={entry.pointerColor}
            heapReferenceId={entry.heapReferenceId}
            isHighlighted={isPointerHighlighted}
          />
        )}
      </motion.span>
    );
  }

  return (
    <motion.span
      key={`${entry.name}-${entry.displayValue}`}
      initial={
        shouldReduceMotion
          ? false
          : { backgroundColor: `${THEME.colors.syntax.keyword}22` }
      }
      animate={{ backgroundColor: "rgba(0,0,0,0)" }}
      transition={{ duration: duration.highlight }}
      style={{
        fontFamily: THEME.fonts.code,
        fontSize: 11,
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
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const hoveredFrameId = useVisualizerStore((s) => s.hoveredFrameId);
  const hoveredHeapId = useVisualizerStore((s) => s.hoveredHeapId);
  const setHoveredFrameId = useVisualizerStore((s) => s.setHoveredFrameId);
  const { duration, shouldReduceMotion } = useAnimationConfig();

  const isFrameHighlighted = hoveredFrameId === block.frameId;
  const isSuspended = block.suspended === true;
  const isModuleScope = block.type === "module";
  const suspendedColor = THEME.colors.status.pending;

  const accentColor = isSuspended ? suspendedColor : block.color;
  const borderStyle = isSuspended
    ? "dashed"
    : isModuleScope
      ? "dotted"
      : "solid";

  return (
    <motion.div
      animate={{
        opacity: isSuspended ? 0.6 : 1,
        boxShadow: isFrameHighlighted
          ? `0 0 10px ${accentColor}40`
          : "0 0 0px transparent",
      }}
      transition={{ duration: shouldReduceMotion ? 0 : duration.medium }}
      style={{
        borderTop: `1px solid ${isFrameHighlighted ? accentColor : `${accentColor}28`}`,
        borderRight: `1px solid ${isFrameHighlighted ? accentColor : `${accentColor}28`}`,
        borderBottom: `1px solid ${isFrameHighlighted ? accentColor : `${accentColor}28`}`,
        borderLeft: `2px ${borderStyle} ${accentColor}`,
        borderRadius: THEME.radius.sm,
        backgroundColor: THEME.colors.bg.elevated,
        overflow: "hidden",
        cursor: "pointer",
      }}
      onMouseEnter={() => setHoveredFrameId(block.frameId)}
      onMouseLeave={() => setHoveredFrameId(null)}
    >
      {/* Header row */}
      <div
        className="flex items-center justify-between gap-2"
        style={{ padding: "6px 8px", userSelect: "none" }}
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <motion.div
            animate={{ rotate: collapsed ? 0 : 90 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.15 }}
            style={{ color: THEME.colors.text.muted, flexShrink: 0 }}
          >
            <ChevronRight size={11} />
          </motion.div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              fontFamily: THEME.fonts.code,
              color: accentColor,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {block.label}
          </span>
          {isSuspended && (
            <span
              style={{
                fontSize: 9,
                fontFamily: THEME.fonts.code,
                color: suspendedColor,
                backgroundColor: `${suspendedColor}18`,
                padding: "1px 5px",
                borderRadius: 3,
                flexShrink: 0,
              }}
            >
              {t("memory.suspended")}
            </span>
          )}
        </div>
        <span
          style={{
            fontSize: 9,
            fontFamily: THEME.fonts.code,
            color: THEME.colors.text.muted,
            flexShrink: 0,
          }}
        >
          {block.entries.length === 0
            ? t("memory.emptyBlock")
            : t("memory.var", { count: block.entries.length })}
        </span>
      </div>

      {/* Variable table */}
      <AnimatePresence initial={false}>
        {!collapsed && block.entries.length > 0 && (
          <motion.div
            initial={shouldReduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={shouldReduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : (duration.fast ?? 0.12),
            }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                borderTop: `1px solid ${accentColor}18`,
                margin: "0 8px",
              }}
            />
            <div style={{ padding: "4px 8px 6px" }}>
              {block.entries.map((entry, idx) => {
                const isPointerHighlighted =
                  entry.heapReferenceId !== undefined &&
                  entry.heapReferenceId === hoveredHeapId;
                const isThis = entry.name === "this";
                const isLast = idx === block.entries.length - 1;

                return (
                  <div
                    key={entry.name}
                    className="flex items-center justify-between"
                    style={{
                      padding: "3px 0",
                      borderBottom: isLast
                        ? "none"
                        : `1px solid ${THEME.colors.text.muted}12`,
                      gap: 8,
                    }}
                  >
                    {/* Key cell */}
                    <span
                      className="flex items-center gap-1 min-w-0"
                      style={{ flexShrink: 0, maxWidth: "55%" }}
                    >
                      {entry.isDestructured && (
                        <span
                          style={{
                            color: THEME.colors.text.muted,
                            fontSize: 9,
                          }}
                          title={t("memory.destructured")}
                        >
                          {"{}"}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: 11,
                          fontFamily: THEME.fonts.code,
                          color: isThis
                            ? THEME.colors.syntax.keyword
                            : THEME.colors.text.secondary,
                          fontWeight: isThis ? 700 : 400,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {entry.name}
                      </span>
                      {entry.isExported && (
                        <span
                          style={{
                            color: THEME.colors.syntax.keyword,
                            fontSize: 9,
                          }}
                          title={t("memory.exported")}
                        >
                          ↗
                        </span>
                      )}
                    </span>

                    {/* Value cell */}
                    <span
                      className="flex items-center justify-end"
                      style={{ minWidth: 0, flexShrink: 1 }}
                    >
                      <EntryValue
                        entry={entry}
                        isPointerHighlighted={isPointerHighlighted}
                      />
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

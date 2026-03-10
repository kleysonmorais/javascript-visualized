import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Check,
  Clock,
  X,
  Pause,
  Play,
  Square,
} from "lucide-react";
import { THEME } from "@/constants/theme";
import { useVisualizerStore } from "@/store/useVisualizerStore";
import { useAnimationConfig } from "@/hooks/useAnimationConfig";
import type { ClosureVariable, HeapObject, HeapObjectProperty } from "@/types";

// ─── helpers ──────────────────────────────────────────────────────────────────

function primitiveColor(v: string): string {
  if (v === "undefined" || v === "null") return THEME.colors.text.muted;
  if (v === "true" || v === "false") return THEME.colors.syntax.keyword;
  if (/^-?\d/.test(v)) return THEME.colors.syntax.number;
  if (v.startsWith('"') || v.startsWith("'")) return THEME.colors.syntax.string;
  return THEME.colors.text.primary;
}

function isPromiseObject(obj: HeapObject): boolean {
  return (
    obj.label === "Promise" ||
    (obj.properties?.some((p) => p.key.startsWith("[[")) ?? false)
  );
}

function isGeneratorObject(obj: HeapObject): boolean {
  return (
    obj.generatorState !== undefined ||
    (obj.label?.startsWith("Generator (") ?? false)
  );
}

function isInternalSlot(key: string): boolean {
  return key.startsWith("[[") && key.endsWith("]]");
}

function getGeneratorStateStyle(state: string): {
  color: string;
  icon: React.ReactNode;
} {
  const s = state.replace(/^"|"$/g, "");
  switch (s) {
    case "suspended":
      return { color: THEME.colors.status.pending, icon: <Pause size={9} /> };
    case "executing":
      return { color: THEME.colors.status.running, icon: <Play size={9} /> };
    case "closed":
      return { color: THEME.colors.text.muted, icon: <Square size={9} /> };
    default:
      return { color: THEME.colors.text.secondary, icon: null };
  }
}

function getPromiseStateStyle(state: string): {
  color: string;
  icon: React.ReactNode;
} {
  const s = state.replace(/^"|"$/g, "");
  switch (s) {
    case "pending":
      return { color: THEME.colors.status.pending, icon: <Clock size={9} /> };
    case "fulfilled":
      return { color: THEME.colors.status.running, icon: <Check size={9} /> };
    case "rejected":
      return { color: THEME.colors.status.error, icon: <X size={9} /> };
    default:
      return { color: THEME.colors.text.secondary, icon: null };
  }
}

function formatReactions(value: string): string {
  if (value === "[]" || value === "0" || value === "0 reactions") return "0";
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return "0";
    return String(inner.split(",").length);
  }
  return value;
}

// ─── shared prop-value renderer ───────────────────────────────────────────────

function PropValue({ prop }: { prop: HeapObjectProperty }) {
  if (prop.valueType === "function") {
    const isGen =
      prop.displayValue?.includes("*") || prop.displayValue === "ⓕ*";
    return (
      <span
        className="flex items-center gap-0.5"
        style={{ fontFamily: THEME.fonts.code, fontSize: 11 }}
      >
        <span style={{ color: THEME.colors.syntax.function }}>ƒ</span>
        {isGen && <span style={{ color: THEME.colors.syntax.keyword }}>*</span>}
        {prop.pointerColor && (
          <span style={{ color: prop.pointerColor, fontSize: 8 }}>●</span>
        )}
      </span>
    );
  }
  if (prop.valueType === "object") {
    return (
      <span
        className="flex items-center gap-0.5"
        style={{ fontFamily: THEME.fonts.code, fontSize: 10 }}
      >
        <span style={{ color: THEME.colors.text.muted, fontStyle: "italic" }}>
          ref
        </span>
        {prop.pointerColor && (
          <span style={{ color: prop.pointerColor, fontSize: 8 }}>●</span>
        )}
      </span>
    );
  }
  return (
    <span
      style={{
        fontFamily: THEME.fonts.code,
        fontSize: 11,
        color: primitiveColor(prop.displayValue),
      }}
    >
      {prop.displayValue}
    </span>
  );
}

// ─── prop row ─────────────────────────────────────────────────────────────────

function PropRow({
  propKey,
  value,
  isInternal = false,
  isLast = false,
}: {
  propKey: string;
  value: React.ReactNode;
  isInternal?: boolean;
  isLast?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between gap-2"
      style={{
        padding: "2px 0",
        borderBottom: isLast
          ? "none"
          : `1px solid ${THEME.colors.text.muted}10`,
      }}
    >
      <span
        style={{
          fontFamily: THEME.fonts.code,
          fontSize: isInternal ? 10 : 11,
          color: isInternal
            ? THEME.colors.syntax.keyword
            : THEME.colors.text.secondary,
          fontStyle: isInternal ? "italic" : "normal",
          opacity: isInternal ? 0.85 : 1,
          flexShrink: 0,
          maxWidth: "55%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {propKey}
      </span>
      <span className="flex items-center">{value}</span>
    </div>
  );
}

// ─── closure scope section ────────────────────────────────────────────────────

function ClosureVarRow({ variable }: { variable: ClosureVariable }) {
  const renderValue = () => {
    if (variable.valueType === "function") {
      return (
        <span
          className="flex items-center gap-0.5"
          style={{ fontFamily: THEME.fonts.code, fontSize: 11 }}
        >
          <span style={{ color: THEME.colors.syntax.function }}>ƒ</span>
          {variable.pointerColor && (
            <span style={{ color: variable.pointerColor, fontSize: 8 }}>●</span>
          )}
        </span>
      );
    }
    if (variable.valueType === "object") {
      return (
        <span
          className="flex items-center gap-0.5"
          style={{ fontFamily: THEME.fonts.code, fontSize: 10 }}
        >
          <span style={{ color: THEME.colors.text.muted, fontStyle: "italic" }}>
            ref
          </span>
          {variable.pointerColor && (
            <span style={{ color: variable.pointerColor, fontSize: 8 }}>●</span>
          )}
        </span>
      );
    }
    return (
      <span
        style={{
          fontFamily: THEME.fonts.code,
          fontSize: 11,
          color: primitiveColor(variable.displayValue),
        }}
      >
        {variable.displayValue}
      </span>
    );
  };

  return (
    <div
      className="flex items-center justify-between gap-2"
      style={{ padding: "2px 0" }}
    >
      <span
        style={{
          fontFamily: THEME.fonts.code,
          fontSize: 10,
          color: variable.isMutable
            ? THEME.colors.syntax.variable
            : THEME.colors.text.muted,
          fontStyle: variable.isMutable ? "normal" : "italic",
        }}
      >
        {variable.name}
        {variable.isMutable && (
          <span
            style={{
              color: THEME.colors.text.muted,
              fontSize: 8,
              marginLeft: 2,
            }}
          >
            ~
          </span>
        )}
      </span>
      {renderValue()}
    </div>
  );
}

function ClosureScopeSection({ obj }: { obj: HeapObject }) {
  const [open, setOpen] = useState(true);
  if (!obj.closureScope || obj.closureScope.length === 0) return null;

  return (
    <div
      style={{
        marginTop: 6,
        border: `1px dashed ${THEME.colors.text.muted}30`,
        borderRadius: 4,
      }}
    >
      {/* [[Scope]] toggle header */}
      <div
        className="flex items-center gap-1"
        style={{ padding: "3px 6px", cursor: "pointer", userSelect: "none" }}
        onClick={() => setOpen((v) => !v)}
      >
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.13 }}
          style={{ color: THEME.colors.text.muted, display: "flex" }}
        >
          <ChevronRight size={10} />
        </motion.span>
        <span
          style={{
            fontFamily: THEME.fonts.code,
            fontSize: 9,
            fontWeight: 600,
            color: THEME.colors.syntax.keyword,
            fontStyle: "italic",
            letterSpacing: "0.03em",
          }}
        >
          {"[[Scope]]"}
        </span>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.13 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "0 8px 6px" }}>
              {obj.closureScope.map((scopeEntry) => (
                <div key={scopeEntry.scopeName} style={{ marginBottom: 4 }}>
                  <div
                    className="flex items-center gap-1"
                    style={{ marginBottom: 1 }}
                  >
                    <span style={{ color: scopeEntry.scopeColor, fontSize: 7 }}>
                      ●
                    </span>
                    <span
                      style={{
                        fontFamily: THEME.fonts.code,
                        fontSize: 9,
                        color: THEME.colors.text.muted,
                        fontStyle: "italic",
                      }}
                    >
                      {scopeEntry.scopeName}
                    </span>
                  </div>
                  <div style={{ paddingLeft: 10 }}>
                    {scopeEntry.variables.map((v) => (
                      <ClosureVarRow key={v.name} variable={v} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── base heap card shell ──────────────────────────────────────────────────────

function HeapCardShell({
  obj,
  isHighlighted,
  label,
  badge,
  children,
}: {
  obj: HeapObject;
  isHighlighted: boolean;
  label: string;
  badge?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const setHoveredHeapId = useVisualizerStore((s) => s.setHoveredHeapId);
  const { duration, shouldReduceMotion } = useAnimationConfig();

  return (
    <motion.div
      animate={{
        boxShadow: isHighlighted
          ? `0 0 10px ${obj.color}44`
          : "0 0 0px transparent",
        borderColor: isHighlighted ? obj.color : `${obj.color}30`,
      }}
      transition={{ duration: shouldReduceMotion ? 0 : duration.normal }}
      style={{
        backgroundColor: THEME.colors.bg.tertiary,
        borderRadius: THEME.radius.sm,
        border: `1px solid ${isHighlighted ? obj.color : `${obj.color}30`}`,
        overflow: "hidden",
        cursor: "pointer",
      }}
      onMouseEnter={() => setHoveredHeapId(obj.id)}
      onMouseLeave={() => setHoveredHeapId(null)}
    >
      {/* Card header */}
      <div
        className="flex items-center justify-between gap-2"
        style={{ padding: "5px 8px", userSelect: "none" }}
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <motion.span
            animate={{ rotate: collapsed ? 0 : 90 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.13 }}
            style={{
              color: THEME.colors.text.muted,
              display: "flex",
              flexShrink: 0,
            }}
          >
            <ChevronRight size={10} />
          </motion.span>
          <span
            style={{
              color: obj.color,
              fontSize: 8,
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ●
          </span>
          <span
            style={{
              fontFamily: THEME.fonts.code,
              fontSize: 11,
              fontWeight: 600,
              color: THEME.colors.text.primary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </span>
        </div>
        {badge && <div style={{ flexShrink: 0 }}>{badge}</div>}
      </div>

      {/* Collapsible body */}
      <AnimatePresence initial={false}>
        {!collapsed && children && (
          <motion.div
            initial={shouldReduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={shouldReduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.13 }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                borderTop: `1px solid ${obj.color}18`,
                margin: "0 8px",
              }}
            />
            <div style={{ padding: "4px 8px 6px" }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── typed chip ───────────────────────────────────────────────────────────────

function TypeChip({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        fontFamily: THEME.fonts.code,
        fontSize: 9,
        color,
        backgroundColor: `${color}18`,
        padding: "1px 5px",
        borderRadius: 3,
        letterSpacing: "0.02em",
      }}
    >
      {label}
    </span>
  );
}

// ─── promise card ─────────────────────────────────────────────────────────────

function PromiseHeapCard({
  obj,
  isHighlighted,
}: {
  obj: HeapObject;
  isHighlighted: boolean;
}) {
  const internalSlots =
    obj.properties?.filter((p) => isInternalSlot(p.key)) ?? [];
  const regularProps =
    obj.properties?.filter((p) => !isInternalSlot(p.key)) ?? [];

  const stateProp = internalSlots.find((p) => p.key === "[[PromiseState]]");
  const stateStyle = stateProp
    ? getPromiseStateStyle(stateProp.displayValue)
    : null;

  const badge = stateStyle ? (
    <span
      className="flex items-center gap-1"
      style={{ color: stateStyle.color }}
    >
      {stateStyle.icon}
      <span style={{ fontFamily: THEME.fonts.code, fontSize: 9 }}>
        {stateProp?.displayValue.replace(/^"|"$/g, "")}
      </span>
    </span>
  ) : undefined;

  const allProps = [...internalSlots, ...regularProps];

  return (
    <HeapCardShell
      obj={obj}
      isHighlighted={isHighlighted}
      label="Promise"
      badge={badge}
    >
      {allProps.map((prop, i) => {
        const isState = prop.key === "[[PromiseState]]";
        const isReactions = prop.key.includes("Reactions");
        const stateS = isState ? getPromiseStateStyle(prop.displayValue) : null;

        const value = (
          <span
            className="flex items-center gap-1"
            style={{
              fontFamily: THEME.fonts.code,
              fontSize: 11,
              color: stateS
                ? stateS.color
                : isReactions
                  ? THEME.colors.text.muted
                  : primitiveColor(prop.displayValue),
            }}
          >
            {isReactions
              ? formatReactions(prop.displayValue)
              : prop.displayValue.replace(/^"|"$/g, "")}
            {stateS?.icon}
            {prop.pointerColor && (
              <span style={{ color: prop.pointerColor, fontSize: 8 }}>●</span>
            )}
          </span>
        );

        return (
          <PropRow
            key={prop.key}
            propKey={prop.key}
            value={value}
            isInternal={isInternalSlot(prop.key)}
            isLast={i === allProps.length - 1}
          />
        );
      })}
    </HeapCardShell>
  );
}

// ─── generator card ───────────────────────────────────────────────────────────

function GeneratorHeapCard({
  obj,
  isHighlighted,
}: {
  obj: HeapObject;
  isHighlighted: boolean;
}) {
  const stateProp = obj.properties?.find((p) => p.key === "[[GeneratorState]]");
  const stateValue = stateProp?.displayValue ?? obj.generatorState ?? "unknown";
  const stateStyle = getGeneratorStateStyle(stateValue);
  const funcProp = obj.properties?.find(
    (p) => p.key === "[[GeneratorFunction]]",
  );
  const isSuspended = (obj.generatorState ?? stateValue).includes("suspended");

  const badge = (
    <span
      className="flex items-center gap-1"
      style={{ color: stateStyle.color }}
    >
      {stateStyle.icon}
      <span style={{ fontFamily: THEME.fonts.code, fontSize: 9 }}>
        {stateValue.replace(/^"|"$/g, "")}
      </span>
    </span>
  );

  return (
    <HeapCardShell
      obj={{ ...obj, ...(isSuspended ? { color: obj.color } : {}) }}
      isHighlighted={isHighlighted}
      label={obj.label ?? "Generator"}
      badge={badge}
    >
      <PropRow
        propKey="[[GeneratorState]]"
        value={
          <span
            className="flex items-center gap-1"
            style={{
              fontFamily: THEME.fonts.code,
              fontSize: 11,
              color: stateStyle.color,
            }}
          >
            {stateValue.replace(/^"|"$/g, "")}
            {stateStyle.icon}
          </span>
        }
        isInternal
        isLast={!funcProp && !obj.lastYieldedValue}
      />
      {funcProp && (
        <PropRow
          propKey="[[GeneratorFunction]]"
          value={
            <span style={{ fontFamily: THEME.fonts.code, fontSize: 11 }}>
              <span style={{ color: THEME.colors.syntax.function }}>ƒ</span>
              <span style={{ color: THEME.colors.syntax.keyword }}>*</span>
              {funcProp.displayValue.replace(/^ⓕ\*?\s*/, " ")}
              {funcProp.pointerColor && (
                <span
                  style={{
                    color: funcProp.pointerColor,
                    fontSize: 8,
                    marginLeft: 2,
                  }}
                >
                  ●
                </span>
              )}
            </span>
          }
          isInternal
          isLast={!obj.lastYieldedValue}
        />
      )}
      {obj.lastYieldedValue && (
        <PropRow
          propKey="last yield"
          value={
            <span
              style={{
                fontFamily: THEME.fonts.code,
                fontSize: 11,
                color: primitiveColor(obj.lastYieldedValue),
              }}
            >
              {obj.lastYieldedValue}
            </span>
          }
          isLast
        />
      )}
    </HeapCardShell>
  );
}

// ─── generic heap card ────────────────────────────────────────────────────────

function HeapCard({
  obj,
  isHighlighted,
}: {
  obj: HeapObject;
  isHighlighted: boolean;
}) {
  const isFunc = obj.type === "function";
  const src = obj.functionSource ?? obj.label ?? "";

  const isAsync = src.startsWith("async ");
  const isGenFunc = src.includes("function*");
  const isInstance =
    obj.label?.includes(" instance") || obj.label?.startsWith("class ");

  const badge = isFunc ? (
    <div className="flex items-center gap-1">
      {isAsync && (
        <TypeChip label="async" color={THEME.colors.syntax.keyword} />
      )}
      {isGenFunc && (
        <TypeChip label="gen*" color={THEME.colors.syntax.keyword} />
      )}
      {!isAsync && !isGenFunc && (
        <TypeChip label="fn" color={THEME.colors.syntax.function} />
      )}
    </div>
  ) : isInstance ? (
    <TypeChip label={obj.label ?? "object"} color={THEME.colors.text.muted} />
  ) : undefined;

  const label = isFunc
    ? (src.match(
        /(?:function\*?\s+|async\s+function\*?\s+|const\s+|let\s+|var\s+)?([\w$]+)/,
      )?.[1] ?? "anonymous")
    : (obj.label ?? "Object");

  if (isFunc) {
    return (
      <HeapCardShell
        obj={obj}
        isHighlighted={isHighlighted}
        label={label}
        badge={badge}
      >
        <pre
          style={{
            margin: 0,
            fontFamily: THEME.fonts.code,
            fontSize: 10,
            color: THEME.colors.syntax.function,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            opacity: 0.8,
          }}
        >
          {src}
        </pre>
        <ClosureScopeSection obj={obj} />
      </HeapCardShell>
    );
  }

  if (obj.properties && obj.properties.length > 0) {
    return (
      <HeapCardShell
        obj={obj}
        isHighlighted={isHighlighted}
        label={label}
        badge={badge}
      >
        {obj.properties.map((prop, i) => (
          <PropRow
            key={prop.key}
            propKey={prop.key}
            value={<PropValue prop={prop} />}
            isInternal={isInternalSlot(prop.key)}
            isLast={i === obj.properties!.length - 1}
          />
        ))}
      </HeapCardShell>
    );
  }

  return (
    <HeapCardShell
      obj={obj}
      isHighlighted={isHighlighted}
      label={label}
      badge={badge}
    />
  );
}

// ─── section group header ─────────────────────────────────────────────────────

function GroupDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2" style={{ margin: "2px 0" }}>
      <div
        style={{
          flex: 1,
          height: 1,
          backgroundColor: `${THEME.colors.text.muted}20`,
        }}
      />
      <span
        style={{
          fontFamily: THEME.fonts.code,
          fontSize: 9,
          color: THEME.colors.text.muted,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 1,
          backgroundColor: `${THEME.colors.text.muted}20`,
        }}
      />
    </div>
  );
}

// ─── main HeapSection ─────────────────────────────────────────────────────────

interface HeapSectionProps {
  heap: HeapObject[];
}

export function HeapSection({ heap }: HeapSectionProps) {
  const hoveredPointerId = useVisualizerStore((s) => s.hoveredPointerId);
  const { duration, shouldReduceMotion } = useAnimationConfig();

  const promiseObjects = heap.filter(isPromiseObject);
  const generatorObjects = heap.filter(isGeneratorObject);
  const otherObjects = heap.filter(
    (obj) => !isPromiseObject(obj) && !isGeneratorObject(obj),
  );

  const hasMultipleGroups =
    [otherObjects, generatorObjects, promiseObjects].filter((g) => g.length > 0)
      .length > 1;

  return (
    <div
      style={{
        border: `1px dashed ${THEME.colors.text.muted}40`,
        borderRadius: THEME.radius.sm,
        padding: "8px 10px",
      }}
    >
      {/* Section title */}
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: THEME.colors.text.muted,
          fontFamily: THEME.fonts.code,
          marginBottom: 8,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
        }}
      >
        Heap
      </div>

      {heap.length === 0 ? (
        <div
          style={{
            fontSize: 11,
            color: THEME.colors.text.muted,
            fontFamily: THEME.fonts.code,
          }}
        >
          No heap objects
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {/* Regular objects */}
          {otherObjects.length > 0 && (
            <>
              {hasMultipleGroups && <GroupDivider label="Objects" />}
              <AnimatePresence mode="popLayout">
                {otherObjects.map((obj) => (
                  <motion.div
                    key={obj.id}
                    initial={
                      shouldReduceMotion ? false : { opacity: 0, scale: 0.94 }
                    }
                    animate={{ opacity: 1, scale: 1 }}
                    exit={
                      shouldReduceMotion
                        ? undefined
                        : { opacity: 0, scale: 0.94 }
                    }
                    transition={{ duration: duration.normal }}
                  >
                    <HeapCard
                      obj={obj}
                      isHighlighted={hoveredPointerId === obj.id}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </>
          )}

          {/* Generator objects */}
          {generatorObjects.length > 0 && (
            <>
              {hasMultipleGroups && <GroupDivider label="Generators" />}
              <AnimatePresence mode="popLayout">
                {generatorObjects.map((obj) => (
                  <motion.div
                    key={obj.id}
                    initial={
                      shouldReduceMotion ? false : { opacity: 0, scale: 0.94 }
                    }
                    animate={{ opacity: 1, scale: 1 }}
                    exit={
                      shouldReduceMotion
                        ? undefined
                        : { opacity: 0, scale: 0.94 }
                    }
                    transition={{ duration: duration.normal }}
                  >
                    <GeneratorHeapCard
                      obj={obj}
                      isHighlighted={hoveredPointerId === obj.id}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </>
          )}

          {/* Promise objects */}
          {promiseObjects.length > 0 && (
            <>
              {hasMultipleGroups && <GroupDivider label="Promises" />}
              <AnimatePresence mode="popLayout">
                {promiseObjects.map((obj) => (
                  <motion.div
                    key={obj.id}
                    initial={
                      shouldReduceMotion ? false : { opacity: 0, scale: 0.94 }
                    }
                    animate={{ opacity: 1, scale: 1 }}
                    exit={
                      shouldReduceMotion
                        ? undefined
                        : { opacity: 0, scale: 0.94 }
                    }
                    transition={{ duration: duration.normal }}
                  >
                    <PromiseHeapCard
                      obj={obj}
                      isHighlighted={hoveredPointerId === obj.id}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </>
          )}
        </div>
      )}
    </div>
  );
}

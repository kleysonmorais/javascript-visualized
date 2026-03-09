import { Check, Clock, X } from "lucide-react";
import { THEME } from "@/constants/theme";
import { useVisualizerStore } from "@/store/useVisualizerStore";
import type { ClosureVariable, HeapObject, HeapObjectProperty } from "@/types";

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

/** Check if a HeapObject is a Promise */
function isPromiseObject(obj: HeapObject): boolean {
  if (obj.label === "Promise") return true;
  if (obj.properties?.some((p) => p.key.startsWith("[["))) return true;
  return false;
}

/** Get promise state color and icon */
function getPromiseStateStyle(state: string): {
  color: string;
  icon: React.ReactNode;
} {
  switch (state) {
    case '"pending"':
    case "pending":
      return {
        color: THEME.colors.status.pending,
        icon: <Clock size={10} style={{ marginLeft: 4 }} />,
      };
    case '"fulfilled"':
    case "fulfilled":
      return {
        color: THEME.colors.status.running,
        icon: <Check size={10} style={{ marginLeft: 4 }} />,
      };
    case '"rejected"':
    case "rejected":
      return {
        color: THEME.colors.status.error,
        icon: <X size={10} style={{ marginLeft: 4 }} />,
      };
    default:
      return {
        color: THEME.colors.text.secondary,
        icon: null,
      };
  }
}

/** Format reactions count for display */
function formatReactions(value: string): string {
  // Handle various formats: "[]", "0", "[callback]", etc.
  if (value === "[]" || value === "0" || value === "0 reactions") {
    return "0 reactions";
  }
  // Try to extract count from array-like string
  const match = value.match(/\[(\d+)\s*reaction/);
  if (match) return value;
  // Count items if it's array notation
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return "0 reactions";
    const count = inner.split(",").length;
    return count === 1 ? "[1 reaction]" : `[${count} reactions]`;
  }
  return value;
}

/** Check if a property key is an internal slot like [[Prototype]], [[Scope]], etc. */
function isInternalSlot(key: string): boolean {
  return key.startsWith("[[") && key.endsWith("]]");
}

function PropertyValue({ prop }: { prop: HeapObjectProperty }) {
  if (prop.valueType === "function") {
    return (
      <span style={{ fontFamily: THEME.fonts.code, fontSize: 11 }}>
        <span style={{ color: THEME.colors.syntax.function }}>ⓕ</span>
        {prop.pointerColor && (
          <span
            style={{ color: prop.pointerColor, fontSize: 9, marginLeft: 3 }}
          >
            ●
          </span>
        )}
      </span>
    );
  }
  if (prop.valueType === "object") {
    return (
      <span style={{ fontFamily: THEME.fonts.code, fontSize: 11 }}>
        <span style={{ color: THEME.colors.text.secondary }}>[Ptr]</span>
        {prop.pointerColor && (
          <span
            style={{ color: prop.pointerColor, fontSize: 9, marginLeft: 3 }}
          >
            ●
          </span>
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

/** Render a single variable in [[Scope]] */
function ClosureVarRow({ variable }: { variable: ClosureVariable }) {
  const renderValue = () => {
    if (variable.valueType === "function") {
      return (
        <span style={{ fontFamily: THEME.fonts.code, fontSize: 11 }}>
          <span style={{ color: THEME.colors.syntax.function }}>ⓕ</span>
          {variable.pointerColor && (
            <span style={{ color: variable.pointerColor, fontSize: 9, marginLeft: 3 }}>●</span>
          )}
        </span>
      );
    }
    if (variable.valueType === "object") {
      return (
        <span style={{ fontFamily: THEME.fonts.code, fontSize: 11 }}>
          <span style={{ color: THEME.colors.text.secondary }}>[Ptr]</span>
          {variable.pointerColor && (
            <span style={{ color: variable.pointerColor, fontSize: 9, marginLeft: 3 }}>●</span>
          )}
        </span>
      );
    }
    return (
      <span style={{
        fontFamily: THEME.fonts.code,
        fontSize: 11,
        color: primitiveColor(variable.displayValue),
      }}>
        {variable.displayValue}
      </span>
    );
  };

  return (
    <div className="flex items-center justify-between gap-2" style={{ padding: "1px 0" }}>
      <span style={{
        fontFamily: THEME.fonts.code,
        fontSize: 10,
        color: variable.isMutable ? THEME.colors.syntax.variable : THEME.colors.text.secondary,
        fontStyle: variable.isMutable ? "normal" : "italic",
        opacity: 0.9,
      }}>
        {variable.name}
        {variable.isMutable && (
          <span style={{ color: THEME.colors.text.muted, fontSize: 8, marginLeft: 3 }}>~</span>
        )}
      </span>
      {renderValue()}
    </div>
  );
}

/** Render [[Scope]] section inside a function HeapCard */
function ClosureScopeSection({ obj }: { obj: HeapObject }) {
  if (!obj.closureScope || obj.closureScope.length === 0) return null;

  return (
    <div style={{
      marginTop: 6,
      border: `1px dashed ${THEME.colors.text.muted}44`,
      borderRadius: 4,
      padding: "5px 7px",
    }}>
      {/* [[Scope]] header */}
      <div style={{
        fontFamily: THEME.fonts.code,
        fontSize: 9,
        fontWeight: 600,
        color: THEME.colors.syntax.keyword,
        fontStyle: "italic",
        marginBottom: 4,
        letterSpacing: "0.03em",
      }}>
        {"[[Scope]]"}
      </div>

      {obj.closureScope.map((scopeEntry) => (
        <div key={scopeEntry.scopeName} style={{ marginBottom: 4 }}>
          {/* Scope origin header */}
          <div className="flex items-center gap-1" style={{ marginBottom: 2 }}>
            <span style={{ color: scopeEntry.scopeColor, fontSize: 8 }}>●</span>
            <span style={{
              fontFamily: THEME.fonts.code,
              fontSize: 9,
              color: THEME.colors.text.muted,
              fontStyle: "italic",
            }}>
              from {scopeEntry.scopeName}:
            </span>
          </div>
          {/* Variables */}
          <div style={{ paddingLeft: 10 }}>
            {scopeEntry.variables.map((variable) => (
              <ClosureVarRow key={variable.name} variable={variable} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Render a Promise internal slot property */
function PromiseSlotRow({ prop }: { prop: HeapObjectProperty }) {
  const isStateSlot = prop.key === "[[PromiseState]]";
  const isReactionsSlot = prop.key.includes("Reactions");

  // Get state styling if this is the state slot
  const stateStyle = isStateSlot
    ? getPromiseStateStyle(prop.displayValue)
    : null;

  return (
    <div
      className="flex items-center justify-between gap-2"
      style={{ padding: "2px 0" }}
    >
      {/* Key - styled as internal slot */}
      <span
        style={{
          fontFamily: THEME.fonts.code,
          fontSize: 10,
          color: THEME.colors.syntax.keyword,
          fontStyle: "italic",
          opacity: 0.9,
        }}
      >
        {prop.key}
      </span>

      {/* Value */}
      <span
        className="flex items-center"
        style={{
          fontFamily: THEME.fonts.code,
          fontSize: 11,
          color: stateStyle
            ? stateStyle.color
            : isReactionsSlot
              ? THEME.colors.text.muted
              : primitiveColor(prop.displayValue),
        }}
      >
        {isReactionsSlot
          ? formatReactions(prop.displayValue)
          : prop.displayValue}
        {stateStyle?.icon}
        {prop.pointerColor && (
          <span
            style={{ color: prop.pointerColor, fontSize: 9, marginLeft: 3 }}
          >
            ●
          </span>
        )}
      </span>
    </div>
  );
}

/** Render a Promise HeapObject with special internal slot styling */
function PromiseHeapCard({
  obj,
  isHighlighted,
}: {
  obj: HeapObject;
  isHighlighted: boolean;
}) {
  const setHoveredHeapId = useVisualizerStore((s) => s.setHoveredHeapId);

  // Separate internal slots from regular properties
  const internalSlots =
    obj.properties?.filter((p) => p.key.startsWith("[[")) ?? [];
  const regularProps =
    obj.properties?.filter((p) => !p.key.startsWith("[[")) ?? [];

  return (
    <div
      style={{
        backgroundColor: THEME.colors.bg.tertiary,
        borderRadius: THEME.radius.sm,
        padding: "8px 10px",
        border: `1px solid ${isHighlighted ? obj.color : `${obj.color}44`}`,
        boxShadow: isHighlighted ? `0 0 12px ${obj.color}50` : "none",
        transition: "box-shadow 0.2s ease, border-color 0.2s ease",
        cursor: "pointer",
      }}
      onMouseEnter={() => setHoveredHeapId(obj.id)}
      onMouseLeave={() => setHoveredHeapId(null)}
    >
      {/* Promise header */}
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: obj.color, fontSize: 12 }}>●</span>
        <span
          style={{
            fontFamily: THEME.fonts.code,
            fontSize: 11,
            fontWeight: 600,
            color: THEME.colors.text.primary,
          }}
        >
          Promise
        </span>
      </div>

      {/* Internal slots */}
      {internalSlots.length > 0 && (
        <div
          style={{
            borderTop: `1px solid ${THEME.colors.text.muted}22`,
            paddingTop: 4,
            marginTop: 4,
          }}
        >
          {internalSlots.map((prop) => (
            <PromiseSlotRow key={prop.key} prop={prop} />
          ))}
        </div>
      )}

      {/* Regular properties (if any) */}
      {regularProps.length > 0 && (
        <div
          style={{
            borderTop: `1px solid ${THEME.colors.text.muted}22`,
            paddingTop: 4,
            marginTop: 4,
          }}
        >
          {regularProps.map((prop, i) => (
            <div key={prop.key} className="flex items-center gap-1">
              <span
                style={{ color: THEME.colors.syntax.variable, fontSize: 11 }}
              >
                {prop.key}
              </span>
              <span style={{ color: THEME.colors.text.muted }}>:</span>
              <PropertyValue prop={prop} />
              {i < regularProps.length - 1 && (
                <span style={{ color: THEME.colors.text.muted }}>,</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface HeapCardProps {
  obj: HeapObject;
  isHighlighted: boolean;
}

function HeapCard({ obj, isHighlighted }: HeapCardProps) {
  const setHoveredHeapId = useVisualizerStore((s) => s.setHoveredHeapId);

  return (
    <div
      style={{
        backgroundColor: THEME.colors.bg.tertiary,
        borderRadius: THEME.radius.sm,
        padding: "6px 8px",
        border: `1px solid ${isHighlighted ? obj.color : `${obj.color}33`}`,
        boxShadow: isHighlighted ? `0 0 12px ${obj.color}50` : "none",
        transition: "box-shadow 0.2s ease, border-color 0.2s ease",
        cursor: "pointer",
      }}
      onMouseEnter={() => setHoveredHeapId(obj.id)}
      onMouseLeave={() => setHoveredHeapId(null)}
    >
      <div className="flex items-start gap-2">
        <span
          style={{
            color: obj.color,
            fontSize: 11,
            lineHeight: 1.6,
            flexShrink: 0,
          }}
        >
          ●
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {obj.type === "function" ? (
            <div>
              {(obj.functionSource ?? obj.label).startsWith("async ") && (
                <span
                  style={{
                    fontSize: 9,
                    fontFamily: THEME.fonts.code,
                    color: THEME.colors.syntax.keyword,
                    backgroundColor: `${THEME.colors.syntax.keyword}22`,
                    padding: "1px 5px",
                    borderRadius: 4,
                    marginRight: 6,
                    display: "inline-block",
                    marginBottom: 2,
                  }}
                >
                  async
                </span>
              )}
              <pre
                style={{
                  margin: 0,
                  fontFamily: THEME.fonts.code,
                  fontSize: 11,
                  color: THEME.colors.syntax.function,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {obj.functionSource ?? obj.label}
              </pre>
              <ClosureScopeSection obj={obj} />
            </div>
          ) : obj.properties && obj.properties.length > 0 ? (
            <div style={{ fontFamily: THEME.fonts.code, fontSize: 11 }}>
              {/* Show label for instance/class objects */}
              {obj.label && (obj.label.includes(" instance") || obj.label.startsWith("class ")) && (
                <div style={{
                  color: THEME.colors.text.secondary,
                  fontSize: 10,
                  marginBottom: 4,
                  fontStyle: "italic",
                }}>
                  {obj.label}
                </div>
              )}
              <div style={{ paddingLeft: 2 }}>
                {obj.properties.map((prop, i) => {
                  const internal = isInternalSlot(prop.key);
                  return (
                    <div key={prop.key} className="flex items-center gap-1">
                      <span style={{
                        color: internal ? THEME.colors.syntax.keyword : THEME.colors.syntax.variable,
                        fontStyle: internal ? "italic" : undefined,
                        fontSize: internal ? 10 : 11,
                        opacity: internal ? 0.85 : 1,
                      }}>
                        {prop.key}
                      </span>
                      <span style={{ color: THEME.colors.text.muted }}>:</span>
                      <PropertyValue prop={prop} />
                      {i < obj.properties!.length - 1 && (
                        <span style={{ color: THEME.colors.text.muted }}>,</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <span
              style={{
                fontFamily: THEME.fonts.code,
                fontSize: 11,
                color: THEME.colors.text.primary,
              }}
            >
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
  const hoveredPointerId = useVisualizerStore((s) => s.hoveredPointerId);

  // Separate Promise objects from other heap objects for grouping
  const promiseObjects = heap.filter(isPromiseObject);
  const otherObjects = heap.filter((obj) => !isPromiseObject(obj));

  return (
    <div
      style={{
        border: `1px dashed ${THEME.colors.text.muted}55`,
        borderRadius: THEME.radius.sm,
        padding: "8px 10px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: THEME.colors.text.muted,
          fontFamily: THEME.fonts.code,
          marginBottom: 8,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
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
          {/* Regular heap objects first */}
          {otherObjects.map((obj) => (
            <HeapCard
              key={obj.id}
              obj={obj}
              isHighlighted={hoveredPointerId === obj.id}
            />
          ))}

          {/* Promise objects grouped together */}
          {promiseObjects.length > 0 && otherObjects.length > 0 && (
            <div
              style={{
                borderTop: `1px dashed ${THEME.colors.text.muted}33`,
                marginTop: 4,
                paddingTop: 8,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: THEME.colors.text.muted,
                  fontFamily: THEME.fonts.code,
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Promises
              </div>
            </div>
          )}
          {promiseObjects.map((obj) => (
            <PromiseHeapCard
              key={obj.id}
              obj={obj}
              isHighlighted={hoveredPointerId === obj.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

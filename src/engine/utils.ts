import type { MemoryValueType } from "@/types";

/**
 * Convert a runtime value to a display-friendly string representation.
 */
export function displayValue(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (typeof value === "bigint") return `${value}n`;
  if (typeof value === "symbol") return value.toString();
  if (typeof value === "function") return "ⓕ";
  if (Array.isArray(value)) return "[Array]";
  if (typeof value === "object") return "[Object]";
  return String(value);
}

/**
 * Get the memory value type for a given runtime value.
 */
export function getValueType(value: unknown): MemoryValueType {
  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "symbol" ||
    typeof value === "bigint"
  ) {
    return "primitive";
  }
  if (typeof value === "function") return "function";
  return "object";
}

/**
 * Extract source code text from the original code using AST node positions.
 */
export function extractSource(
  code: string,
  node: { start: number; end: number },
): string {
  return code.slice(node.start, node.end);
}

/**
 * Generate a short label for an object or array to display in heap.
 */
export function generateObjectLabel(value: unknown): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (value.length <= 3) {
      const items = value.map((v) => {
        if (typeof v === "string") return `"${v}"`;
        if (typeof v === "object" && v !== null)
          return Array.isArray(v) ? "[...]" : "{...}";
        return String(v);
      });
      return `[${items.join(", ")}]`;
    }
    return `[...${value.length} items]`;
  }

  if (typeof value === "object" && value !== null) {
    const keys = Object.keys(value);
    if (keys.length === 0) return "{}";
    if (keys.length <= 2) {
      const entries = keys.map((k) => {
        const v = (value as Record<string, unknown>)[k];
        let displayVal: string;
        if (typeof v === "string") displayVal = `"${v}"`;
        else if (typeof v === "object" && v !== null)
          displayVal = Array.isArray(v) ? "[...]" : "{...}";
        else displayVal = String(v);
        return `${k}: ${displayVal}`;
      });
      return `{ ${entries.join(", ")} }`;
    }
    return `{ ${keys.slice(0, 2).join(", ")}, ... }`;
  }

  return String(value);
}

/**
 * Generate a unique ID with prefix.
 */
export function generateId(prefix: string, counter: number): string {
  return `${prefix}-${counter}`;
}

/**
 * Deep clone an object to ensure immutability in snapshots.
 */
export function deepClone<T>(obj: T): T {
  return structuredClone(obj);
}

/**
 * Safely stringify a value for display in console output.
 */
export function stringifyForConsole(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return value; // console.log doesn't add quotes
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (typeof value === "function") return "[Function]";
  if (Array.isArray(value)) {
    try {
      return JSON.stringify(value);
    } catch {
      return "[Array]";
    }
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "[Object]";
    }
  }
  return String(value);
}

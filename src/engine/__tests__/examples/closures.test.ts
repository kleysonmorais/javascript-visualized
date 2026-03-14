import { describe, it, expect } from "vitest";
import {
  run,
  lastStep,
  consoleOutput,
  getMemoryEntry,
  getHeapObject,
} from "../helpers";
import { CLOSURES_EXAMPLES } from "@/constants/examples";

describe("Closures Examples", () => {
  describe("all closures examples execute successfully", () => {
    CLOSURES_EXAMPLES.forEach((example) => {
      it(`"${example.title}" (${example.id}) executes without error`, () => {
        expect(() => run(example.code)).not.toThrow();
      });

      it(`"${example.title}" generates at least one step`, () => {
        const steps = run(example.code);
        expect(steps.length).toBeGreaterThan(0);
      });
    });
  });

  // ─── Closures ─────────────────────────────────────────

  describe("closures example", () => {
    const example = CLOSURES_EXAMPLES.find((e) => e.id === "closures")!;

    it("counter is a function with closure", () => {
      const step = lastStep(example.code);
      const entry = getMemoryEntry(step, "counter");
      expect(entry).toBeDefined();
      expect(entry!.valueType).toBe("function");
      expect(entry!.heapReferenceId).toBeDefined();
    });

    it("counter function has closureScope capturing count", () => {
      const step = lastStep(example.code);
      const entry = getMemoryEntry(step, "counter");
      const heap = getHeapObject(step, entry!.heapReferenceId!);
      expect(heap).toBeDefined();
      expect(heap!.closureScope).toBeDefined();
      const capturedVars = heap!.closureScope!.flatMap((s) => s.variables);
      const countVar = capturedVars.find((v) => v.name === "count");
      expect(countVar).toBeDefined();
    });

    it("outputs 1, 2, 3 (incrementing counter)", () => {
      const output = consoleOutput(example.code);
      expect(output[0]).toContain("1");
      expect(output[1]).toContain("2");
      expect(output[2]).toContain("3");
    });

    it("closure maintains state between calls", () => {
      const output = consoleOutput(example.code);
      const values = output.map((o) => parseInt(o.trim()));
      expect(values[0]).toBeLessThan(values[1]);
      expect(values[1]).toBeLessThan(values[2]);
    });

    it("assigning count++", () => {
      const assignedStep = {
        index: 8,
        line: 5,
        column: 4,
        description:
          "Assigning **count** = count + 1. The variable is updated in-place in the Variable Environment.",
        code: "count++",
      };
      const steps = run(example.code);
      const step = steps.find((s) => s.index === assignedStep.index);
      expect(step!.description).toBe(assignedStep.description);
      expect(step!.line).toBe(assignedStep.line);
      expect(step!.column).toBe(assignedStep.column);
    });

    it("total of steps", () => {
      const steps = run(example.code);
      expect(steps.length).toBe(26);
    });
  });

  // ─── Loop Closure Trap ────────────────────────────────────────────────────

  describe("closures-loop-trap example", () => {
    const example = CLOSURES_EXAMPLES.find(
      (e) => e.id === "closures-loop-trap",
    )!;

    it("funcsVar is an array stored on the heap", () => {
      const step = lastStep(example.code);
      const entry = getMemoryEntry(step, "funcsVar");
      expect(entry).toBeDefined();
      expect(entry!.valueType).toBe("object");
      expect(entry!.heapReferenceId).toBeDefined();
    });

    it("funcsLet is an array stored on the heap", () => {
      const step = lastStep(example.code);
      const entry = getMemoryEntry(step, "funcsLet");
      expect(entry).toBeDefined();
      expect(entry!.valueType).toBe("object");
      expect(entry!.heapReferenceId).toBeDefined();
    });

    it("var closures print 3 (shared binding, loop is done)", () => {
      const output = consoleOutput(example.code);
      // funcsVar[0]() and funcsVar[1]() are the first two console.log calls
      expect(output[0]).toContain("3");
      expect(output[1]).toContain("3");
    });

    it("let closures print per-iteration values 0 and 1", () => {
      const output = consoleOutput(example.code);
      // funcsLet[0]() → 0, funcsLet[1]() → 1
      expect(output[2]).toContain("0");
      expect(output[3]).toContain("1");
    });

    it("produces 4 console lines total", () => {
      const output = consoleOutput(example.code);
      expect(output.length).toBe(4);
    });

    it("total steps", () => {
      const steps = run(example.code);
      expect(steps.length).toBe(38);
    });
  });

  // ─── Memoization via Closure ──────────────────────────────────────────────

  describe("closures-memoize example", () => {
    const example = CLOSURES_EXAMPLES.find((e) => e.id === "closures-memoize")!;

    it("memoSquare is a function with a heap reference", () => {
      const step = lastStep(example.code);
      const entry = getMemoryEntry(step, "memoSquare");
      expect(entry).toBeDefined();
      expect(entry!.valueType).toBe("function");
      expect(entry!.heapReferenceId).toBeDefined();
    });

    it("memoSquare closureScope captures cache and fn", () => {
      const step = lastStep(example.code);
      const entry = getMemoryEntry(step, "memoSquare");
      const heap = getHeapObject(step, entry!.heapReferenceId!);
      expect(heap!.closureScope).toBeDefined();
      const varNames = heap!
        .closureScope!.flatMap((s) => s.variables)
        .map((v) => v.name);
      expect(varNames).toContain("cache");
      expect(varNames).toContain("fn");
    });

    it("first call computes and returns 16", () => {
      const output = consoleOutput(example.code);
      expect(output[0]).toContain("16");
    });

    it("second call (same arg) prints cache hit message", () => {
      const output = consoleOutput(example.code);
      expect(output[1]).toContain("cached: 4");
    });

    it("second call returns the cached value 16", () => {
      const output = consoleOutput(example.code);
      expect(output[2]).toContain("16");
    });

    it("call with new arg computes fresh result 25", () => {
      const output = consoleOutput(example.code);
      expect(output[3]).toContain("25");
    });

    it("produces 4 console lines total", () => {
      const output = consoleOutput(example.code);
      expect(output.length).toBe(4);
    });

    it("total steps", () => {
      const steps = run(example.code);
      expect(steps.length).toBe(39);
    });
  });
});

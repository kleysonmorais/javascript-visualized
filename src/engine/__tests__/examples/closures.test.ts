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
        line: 4,
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
});

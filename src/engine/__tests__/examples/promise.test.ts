import { describe, it, expect } from "vitest";
import {
  run,
  lastStep,
  consoleOutput,
  getMemoryEntry,
  getHeapObject,
} from "../helpers";
import { PROMISE_EXAMPLES } from "@/constants/examples";

describe("Promise Examples", () => {
  describe("all promise examples execute successfully", () => {
    PROMISE_EXAMPLES.forEach((example) => {
      it(`"${example.title}" (${example.id}) executes without error`, () => {
        expect(() => run(example.code)).not.toThrow();
      });

      it(`"${example.title}" generates at least one step`, () => {
        const steps = run(example.code);
        expect(steps.length).toBeGreaterThan(0);
      });
    });
  });

  // ─── Promise Basics ──────────────────────────────────────

  describe("promise-basics example", () => {
    const example = PROMISE_EXAMPLES.find((e) => e.id === "promise-basics")!;

    it("synchronous code runs first", () => {
      const output = consoleOutput(example.code);
      expect(output[0]).toBe("sync done");
    });

    it("resolved value is available in .then()", () => {
      const output = consoleOutput(example.code);
      expect(output[1]).toBe("resolved: 42");
    });

    it("Promise callback appears in microtask queue at some point", () => {
      const steps = run(example.code);
      const stepWithMicrotask = steps.find((s) => s.microtaskQueue.length > 0);
      expect(stepWithMicrotask).toBeDefined();
    });

    it("p is stored in global memory as a heap reference", () => {
      const step = lastStep(example.code);
      const entry = getMemoryEntry(step, "p");
      expect(entry).toBeDefined();
      expect(entry!.heapReferenceId).toBeDefined();
    });

    it("Promise heap object exists", () => {
      const step = lastStep(example.code);
      const entry = getMemoryEntry(step, "p");
      const heap = getHeapObject(step, entry!.heapReferenceId!);
      expect(heap).toBeDefined();
    });
  });

  // ─── Promise Chain ───────────────────────────────────────

  describe("promise-chain example", () => {
    const example = PROMISE_EXAMPLES.find((e) => e.id === "promise-chain")!;

    it("sync code runs before chain resolves", () => {
      const output = consoleOutput(example.code);
      expect(output[0]).toBe("chain started");
    });

    it("chained transformations produce the correct result (1 → 2 → 6)", () => {
      const output = consoleOutput(example.code);
      expect(output[1]).toBe("result: 6");
    });

    it("microtask queue is used for chained .then()", () => {
      const steps = run(example.code);
      const stepWithMicrotask = steps.find((s) => s.microtaskQueue.length > 0);
      expect(stepWithMicrotask).toBeDefined();
    });

    it("produces exactly two console lines", () => {
      const output = consoleOutput(example.code);
      expect(output).toHaveLength(2);
    });
  });

  // ─── Promise Reject & Catch ──────────────────────────────

  describe("promise-reject-catch example", () => {
    const example = PROMISE_EXAMPLES.find(
      (e) => e.id === "promise-reject-catch",
    )!;

    it("sync code runs first", () => {
      const output = consoleOutput(example.code);
      expect(output[0]).toBe("sync");
    });

    it("catch handler receives the rejection reason", () => {
      const output = consoleOutput(example.code);
      expect(output[1]).toBe("caught: something went wrong");
    });

    it(".then() after .catch() runs with the recovered value", () => {
      const output = consoleOutput(example.code);
      expect(output[2]).toBe("after catch: recovered");
    });

    it("produces exactly three console lines", () => {
      const output = consoleOutput(example.code);
      expect(output).toHaveLength(3);
    });

    it("microtask queue is populated", () => {
      const steps = run(example.code);
      const stepWithMicrotask = steps.find((s) => s.microtaskQueue.length > 0);
      expect(stepWithMicrotask).toBeDefined();
    });
  });

  // ─── Promise.all ─────────────────────────────────────────

  describe("promise-all example", () => {
    const example = PROMISE_EXAMPLES.find((e) => e.id === "promise-all")!;

    it("sync code runs before .all() resolves", () => {
      const output = consoleOutput(example.code);
      expect(output[0]).toBe("waiting for all");
    });

    it("sum of resolved values is correct (10 + 20 + 30 = 60)", () => {
      const output = consoleOutput(example.code);
      expect(output[1]).toBe("sum: 60");
    });

    it("produces exactly two console lines", () => {
      const output = consoleOutput(example.code);
      expect(output).toHaveLength(2);
    });

    it("p1, p2, p3 are stored in global memory", () => {
      const step = lastStep(example.code);
      expect(getMemoryEntry(step, "p1")).toBeDefined();
      expect(getMemoryEntry(step, "p2")).toBeDefined();
      expect(getMemoryEntry(step, "p3")).toBeDefined();
    });

    it("microtask queue is used to resolve Promise.all", () => {
      const steps = run(example.code);
      const stepWithMicrotask = steps.find((s) => s.microtaskQueue.length > 0);
      expect(stepWithMicrotask).toBeDefined();
    });
  });
});

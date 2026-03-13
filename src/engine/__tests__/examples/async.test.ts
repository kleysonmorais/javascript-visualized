import { describe, it, expect } from "vitest";
import { run, consoleOutput } from "../helpers";
import { ASYNC_EXAMPLES } from "@/constants/examples";

describe("Async Examples", () => {
  describe("all async examples execute successfully", () => {
    ASYNC_EXAMPLES.forEach((example) => {
      it(`"${example.title}" (${example.id}) executes without error`, () => {
        expect(() => run(example.code)).not.toThrow();
      });

      it(`"${example.title}" generates at least one step`, () => {
        const steps = run(example.code);
        expect(steps.length).toBeGreaterThan(0);
      });
    });
  });

  // ─── setTimeout Ordering ──────────────────────────────

  describe("settimeout-ordering example", () => {
    const example = ASYNC_EXAMPLES.find((e) => e.id === "settimeout-ordering")!;

    it("registers timers in Web APIs", () => {
      const steps = run(example.code);
      const stepWithTimers = steps.find((s) => s.webAPIs.length > 0);
      expect(stepWithTimers).toBeDefined();
    });

    it("outputs Start first", () => {
      const output = consoleOutput(example.code);
      expect(output[0]).toContain("Start");
    });

    it("outputs End second (synchronous before async)", () => {
      const output = consoleOutput(example.code);
      expect(output[1]).toContain("End");
    });

    it("shorter timeouts execute before longer ones", () => {
      const output = consoleOutput(example.code);
      const timeoutOutputs = output.slice(2);
      expect(timeoutOutputs[0]).toContain("0ms");
      expect(timeoutOutputs[1]).toContain("100ms");
      expect(timeoutOutputs[2]).toContain("2000ms");
    });

    it("all callbacks appear in Task Queue at some point", () => {
      const steps = run(example.code);
      const stepsWithTasks = steps.filter((s) => s.taskQueue.length > 0);
      expect(stepsWithTasks.length).toBeGreaterThan(0);
    });
  });

  // ─── Promise vs setTimeout ────────────────────────────

  describe("promise-vs-settimeout example", () => {
    const example = ASYNC_EXAMPLES.find(
      (e) => e.id === "promise-vs-settimeout",
    )!;

    it("synchronous code runs first (1, 5)", () => {
      const output = consoleOutput(example.code);
      expect(output[0]).toBe("1");
      expect(output[1]).toBe("5");
    });

    it("microtasks (Promise.then) run before macrotasks (setTimeout)", () => {
      const output = consoleOutput(example.code);
      expect(output).toEqual(["1", "5", "3", "4", "2"]);
    });

    it("Promise callbacks appear in microtask queue", () => {
      const steps = run(example.code);
      const stepWithMicrotask = steps.find((s) => s.microtaskQueue.length > 0);
      expect(stepWithMicrotask).toBeDefined();
    });

    it("setTimeout callback appears in task queue", () => {
      const steps = run(example.code);
      const stepWithTask = steps.find((s) => s.taskQueue.length > 0);
      expect(stepWithTask).toBeDefined();
    });

    it("chained .then creates second microtask", () => {
      const output = consoleOutput(example.code);
      expect(output).toContain("3");
      expect(output).toContain("4");
    });
  });

  // ─── Async/Await Flow ─────────────────────────────────

  describe("async-await-flow example", () => {
    const example = ASYNC_EXAMPLES.find((e) => e.id === "async-await-flow")!;

    it("outputs Start first", () => {
      const output = consoleOutput(example.code);
      expect(output[0]).toContain("Start");
    });

    it("outputs Fetching... synchronously inside async function", () => {
      const output = consoleOutput(example.code);
      expect(output[1]).toContain("Fetching...");
    });

    it("outputs End before await completes", () => {
      const output = consoleOutput(example.code);
      const endIndex = output.findIndex((o) => o.includes("End"));
      const dataIndex = output.findIndex((o) => o.includes("Data:"));
      expect(endIndex).toBeLessThan(dataIndex);
    });

    it("fetch appears in Web APIs", () => {
      const steps = run(example.code);
      const stepWithFetch = steps.find((s) =>
        s.webAPIs.some((api) => api.type === "fetch"),
      );
      expect(stepWithFetch).toBeDefined();
    });

    it("async function returns a Promise", () => {
      const output = consoleOutput(example.code);
      expect(output).toContainEqual(expect.stringContaining("Complete:"));
    });

    it("fetchData frame on call stack", () => {
      const steps = run(example.code);
      const fetchFrame = steps.find((s) =>
        s.callStack.some((f) => f.name === "fetchData"),
      );
      expect(fetchFrame).toBeDefined();
    });
  });

  // ─── Event Loop Quiz ──────────────────────────────────

  describe("event-loop-quiz example", () => {
    const example = ASYNC_EXAMPLES.find((e) => e.id === "event-loop-quiz")!;

    it("synchronous outputs come first (A, G)", () => {
      const output = consoleOutput(example.code);
      expect(output[0]).toBe("A");
      expect(output[1]).toBe("G");
    });

    it("microtasks execute before macrotasks (C, E before B, F)", () => {
      const output = consoleOutput(example.code);
      const cIndex = output.indexOf("C");
      const eIndex = output.indexOf("E");
      const bIndex = output.indexOf("B");
      const fIndex = output.indexOf("F");

      expect(cIndex).toBeLessThan(bIndex);
      expect(cIndex).toBeLessThan(fIndex);
      expect(eIndex).toBeLessThan(bIndex);
      expect(eIndex).toBeLessThan(fIndex);
    });

    it("setTimeout inside .then (D) runs last", () => {
      const output = consoleOutput(example.code);
      const dIndex = output.indexOf("D");
      expect(dIndex).toBe(output.length - 1);
    });

    it("complete output order is A, G, C, E, B, F, D", () => {
      const output = consoleOutput(example.code);
      expect(output).toEqual(["A", "G", "C", "E", "B", "F", "D"]);
    });

    it("interpreter handles both microtask and task queues", () => {
      const steps = run(example.code);
      const stepWithMicrotask = steps.find((s) => s.microtaskQueue.length > 0);
      expect(stepWithMicrotask).toBeDefined();
      const stepWithTask = steps.find((s) => s.taskQueue.length > 0);
      expect(stepWithTask).toBeDefined();
    });
  });
});

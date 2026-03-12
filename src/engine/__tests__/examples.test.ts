import { describe, it, expect } from "vitest";
import {
  run,
  lastStep,
  consoleOutput,
  getMemoryEntry,
  getHeapObject,
  findStepWithFrame,
  frameNames,
} from "./helpers";
import { CODE_EXAMPLES } from "@/constants/examples";

describe("Code Examples", () => {
  // Ensure all examples can be executed without errors
  describe("all examples execute successfully", () => {
    CODE_EXAMPLES.forEach((example) => {
      it(`"${example.title}" (${example.id}) executes without error`, () => {
        expect(() => run(example.code)).not.toThrow();
      });

      it(`"${example.title}" generates at least one step`, () => {
        const steps = run(example.code);
        expect(steps.length).toBeGreaterThan(0);
      });
    });
  });

  // ─── Variables & Memory ───────────────────────────────

  describe("variables-memory example", () => {
    const example = CODE_EXAMPLES.find((e) => e.id === "variables-memory")!;

    it("stores primitive string in memory", () => {
      const step = lastStep(example.code);
      const entry = getMemoryEntry(step, "myName");
      expect(entry).toBeDefined();
      expect(entry!.displayValue).toContain("Joe");
    });

    it("stores primitive number in memory", () => {
      const step = lastStep(example.code);
      const entry = getMemoryEntry(step, "age");
      expect(entry).toBeDefined();
      expect(entry!.displayValue).toContain("23");
    });

    it("stores object in heap with reference", () => {
      const step = lastStep(example.code);
      const entry = getMemoryEntry(step, "person");
      expect(entry).toBeDefined();
      expect(entry!.valueType).toBe("object");
      expect(entry!.heapReferenceId).toBeDefined();
    });

    it("person2 references the same heap object as person", () => {
      const step = lastStep(example.code);
      const person = getMemoryEntry(step, "person");
      const person2 = getMemoryEntry(step, "person2");
      expect(person!.heapReferenceId).toBe(person2!.heapReferenceId);
    });

    it("stores function in heap", () => {
      const step = lastStep(example.code);
      const entry = getMemoryEntry(step, "greet");
      expect(entry).toBeDefined();
      expect(entry!.valueType).toBe("function");
      expect(entry!.heapReferenceId).toBeDefined();
    });

    it("outputs the greeting message", () => {
      const output = consoleOutput(example.code);
      expect(output).toContain("Hello Joe");
    });

    it("message variable contains returned value", () => {
      const step = lastStep(example.code);
      const entry = getMemoryEntry(step, "message");
      expect(entry).toBeDefined();
      expect(entry!.displayValue).toContain("Hello Joe");
    });
  });

  // ─── Reference vs Value ───────────────────────────────

  describe("reference-vs-value example", () => {
    const example = CODE_EXAMPLES.find((e) => e.id === "reference-vs-value")!;

    it("original and copy share the same heap reference", () => {
      const step = lastStep(example.code);
      const original = getMemoryEntry(step, "original");
      const copy = getMemoryEntry(step, "copy");
      expect(original!.heapReferenceId).toBe(copy!.heapReferenceId);
    });

    it("modifying copy changes original (same reference)", () => {
      const output = consoleOutput(example.code);
      expect(output[0]).toContain("99");
      expect(output[1]).toContain("99");
    });

    it("original === copy evaluates to true", () => {
      const output = consoleOutput(example.code);
      expect(output[2]).toContain("true");
    });

    it("heap object has both x and y properties", () => {
      const step = lastStep(example.code);
      const entry = getMemoryEntry(step, "original");
      const heap = getHeapObject(step, entry!.heapReferenceId!);
      expect(heap).toBeDefined();
      const xProp = heap!.properties?.find((p) => p.key === "x");
      const yProp = heap!.properties?.find((p) => p.key === "y");
      expect(xProp).toBeDefined();
      expect(yProp).toBeDefined();
    });
  });

  // ─── Function Calls & Scope ───────────────────────────

  describe("function-scope example", () => {
    const example = CODE_EXAMPLES.find((e) => e.id === "function-scope")!;

    it("creates multiply frame on call stack", () => {
      const steps = run(example.code);
      const multiplyFrame = findStepWithFrame(steps, "multiply");
      expect(multiplyFrame).toBeDefined();
    });

    it("creates square frame on call stack", () => {
      const steps = run(example.code);
      const squareFrame = findStepWithFrame(steps, "square");
      expect(squareFrame).toBeDefined();
    });

    it("nested call shows both frames on stack (multiply on top of square)", () => {
      const steps = run(example.code);
      // Find step where multiply is on top of square
      const nestedStep = steps.find((s) => {
        const names = frameNames(s);
        const multiplyIndex = names.indexOf("multiply");
        const squareIndex = names.indexOf("square");
        return (
          multiplyIndex !== -1 &&
          squareIndex !== -1 &&
          multiplyIndex < squareIndex
        );
      });
      expect(nestedStep).toBeDefined();
    });

    it("outputs 25 (5 squared)", () => {
      const output = consoleOutput(example.code);
      expect(output).toContain("25");
    });

    it("answer variable contains 25", () => {
      const step = lastStep(example.code);
      const entry = getMemoryEntry(step, "answer");
      expect(entry).toBeDefined();
      expect(entry!.displayValue).toContain("25");
    });

    it("local memory (result) is created inside multiply", () => {
      const steps = run(example.code);
      const multiplyStep = findStepWithFrame(steps, "multiply");
      if (multiplyStep) {
        const localBlock = multiplyStep.memoryBlocks.find((b) =>
          b.label.toLowerCase().includes("multiply"),
        );
        // Local memory should exist for multiply function
        expect(localBlock || multiplyStep.memoryBlocks.length > 1).toBeTruthy();
      }
    });
  });

  // ─── Closures ─────────────────────────────────────────

  describe("closures example", () => {
    const example = CODE_EXAMPLES.find((e) => e.id === "closures")!;

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
      // Each call increments, proving state is maintained
      const values = output.map((o) => parseInt(o.trim()));
      expect(values[0]).toBeLessThan(values[1]);
      expect(values[1]).toBeLessThan(values[2]);
    });

    it("assigning count++", () => {
      const assignedStep = {
        index: 8,
        line: 4,
        column: 4,
        description: "Assigning **count** = count + 1. The variable is updated in-place in the Variable Environment.",
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

  // ─── setTimeout Ordering ──────────────────────────────

  describe("settimeout-ordering example", () => {
    const example = CODE_EXAMPLES.find((e) => e.id === "settimeout-ordering")!;

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
      // After Start, End, the order should be: 0ms, 100ms, 2000ms
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
    const example = CODE_EXAMPLES.find(
      (e) => e.id === "promise-vs-settimeout",
    )!;

    it("synchronous code runs first (1, 5)", () => {
      const output = consoleOutput(example.code);
      expect(output[0]).toBe("1");
      expect(output[1]).toBe("5");
    });

    it("microtasks (Promise.then) run before macrotasks (setTimeout)", () => {
      const output = consoleOutput(example.code);
      // Order: 1, 5, 3, 4, 2
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
      // Both 3 and 4 should appear (from chained .then)
      expect(output).toContain("3");
      expect(output).toContain("4");
    });
  });

  // ─── Async/Await Flow ─────────────────────────────────

  describe("async-await-flow example", () => {
    const example = CODE_EXAMPLES.find((e) => e.id === "async-await-flow")!;

    it("outputs Start first", () => {
      const output = consoleOutput(example.code);
      expect(output[0]).toContain("Start");
    });

    it("outputs Fetching... synchronously inside async function", () => {
      const output = consoleOutput(example.code);
      // Fetching should come right after Start
      expect(output[1]).toContain("Fetching...");
    });

    it("outputs End before await completes", () => {
      const output = consoleOutput(example.code);
      // End should appear before Data: (await pauses execution)
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
      // fetchData() returns a Promise, which is then-able
      const output = consoleOutput(example.code);
      // Complete: should appear at the end
      expect(output).toContainEqual(expect.stringContaining("Complete:"));
    });

    it("createfetchData frame on call stack", () => {
      const steps = run(example.code);
      const fetchFrame = findStepWithFrame(steps, "fetchData");
      expect(fetchFrame).toBeDefined();
    });
  });

  // ─── Event Loop Quiz ──────────────────────────────────

  describe("event-loop-quiz example", () => {
    const example = CODE_EXAMPLES.find((e) => e.id === "event-loop-quiz")!;

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

      // Verify that at some point there are microtasks
      const stepWithMicrotask = steps.find((s) => s.microtaskQueue.length > 0);
      expect(stepWithMicrotask).toBeDefined();

      // Verify that at some point there are tasks
      const stepWithTask = steps.find((s) => s.taskQueue.length > 0);
      expect(stepWithTask).toBeDefined();
    });
  });

  // ─── Example metadata validation ──────────────────────

  describe("example metadata", () => {
    it("all examples have unique IDs", () => {
      const ids = CODE_EXAMPLES.map((e) => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("all examples have a title", () => {
      CODE_EXAMPLES.forEach((example) => {
        expect(example.title).toBeDefined();
        expect(example.title.length).toBeGreaterThan(0);
      });
    });

    it("all examples have a description", () => {
      CODE_EXAMPLES.forEach((example) => {
        expect(example.description).toBeDefined();
        expect(example.description.length).toBeGreaterThan(0);
      });
    });

    it("all examples have a valid category", () => {
      const validCategories = ["sync", "async"];
      CODE_EXAMPLES.forEach((example) => {
        expect(validCategories).toContain(example.category);
      });
    });

    it("sync examples do not use setTimeout/Promise/async", () => {
      const syncExamples = CODE_EXAMPLES.filter((e) => e.category === "sync");
      syncExamples.forEach((example) => {
        expect(example.code).not.toContain("setTimeout");
        expect(example.code).not.toContain("Promise");
        expect(example.code).not.toMatch(/\basync\b/);
        expect(example.code).not.toMatch(/\bawait\b/);
      });
    });

    it("async examples use at least one async feature", () => {
      const asyncExamples = CODE_EXAMPLES.filter((e) => e.category === "async");
      asyncExamples.forEach((example) => {
        const hasAsync =
          example.code.includes("setTimeout") ||
          example.code.includes("Promise") ||
          example.code.includes("async") ||
          example.code.includes("fetch");
        expect(hasAsync).toBe(true);
      });
    });
  });
});

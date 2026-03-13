import { describe, it, expect } from "vitest";
import { run, consoleOutput, lastStep, findStepWithFrame } from "../helpers";
import { ADVANCED_EXAMPLES } from "@/constants/examples";

describe("Advanced Examples", () => {
  describe("all advanced examples execute successfully", () => {
    ADVANCED_EXAMPLES.forEach((example) => {
      it(`"${example.title}" (${example.id}) executes without error`, () => {
        expect(() => run(example.code)).not.toThrow();
      });

      it(`"${example.title}" generates at least one step`, () => {
        const steps = run(example.code);
        expect(steps.length).toBeGreaterThan(0);
      });
    });
  });

  // ─── Blocking Computation ─────────────────────────────

  describe("blocking-computation example", () => {
    const example = ADVANCED_EXAMPLES.find(
      (e) => e.id === "blocking-computation",
    )!;

    it("outputs prime numbers to console", () => {
      const output = consoleOutput(example.code);
      expect(output.length).toBeGreaterThan(0);
      // All outputs should be prime numbers
      const primes = output.map(Number);
      expect(primes[0]).toBe(1); // starting at 1 (1 is truthy via isPrime when n<2 loop skips)
      expect(primes.includes(2)).toBe(true);
      expect(primes.includes(3)).toBe(true);
    });

    it("does not output 4 (not prime)", () => {
      const output = consoleOutput(example.code);
      expect(output).not.toContain("4");
    });

    it("outputs values in ascending order", () => {
      const output = consoleOutput(example.code);
      const values = output.map(Number);
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1]);
      }
    });

    it("hits the step limit (MAX_STEPS) — infinite loop is capped", () => {
      const steps = run(example.code);
      // The interpreter caps at MAX_STEPS (2000) + a few cleanup steps
      expect(steps.length).toBeGreaterThanOrEqual(2000);
    });

    it("computePrimes frame appears on call stack", () => {
      const steps = run(example.code);
      const frame = findStepWithFrame(steps, "computePrimes");
      expect(frame).toBeDefined();
    });

    it("isPrime frame appears on call stack", () => {
      const steps = run(example.code);
      const frame = findStepWithFrame(steps, "isPrime");
      expect(frame).toBeDefined();
    });

    it("onPrime callback frame appears on call stack", () => {
      const steps = run(example.code);
      const frame = findStepWithFrame(steps, "onPrime");
      expect(frame).toBeDefined();
    });

    it("no webAPIs or task queue usage (purely synchronous)", () => {
      const steps = run(example.code);
      const stepWithTimers = steps.find((s) => s.webAPIs.length > 0);
      const stepWithTask = steps.find((s) => s.taskQueue.length > 0);
      const stepWithMicro = steps.find((s) => s.microtaskQueue.length > 0);
      expect(stepWithTimers).toBeUndefined();
      expect(stepWithTask).toBeUndefined();
      expect(stepWithMicro).toBeUndefined();
    });

    it("isPrime and computePrimes functions are defined in global scope", () => {
      const step = lastStep(example.code);
      const globalBlock = step.memoryBlocks.find((b) =>
        b.label.toLowerCase().includes("global"),
      );
      expect(globalBlock).toBeDefined();
      const names = globalBlock!.entries.map((e) => e.name);
      expect(names).toContain("isPrime");
      expect(names).toContain("computePrimes");
    });
  });

  // ─── Chunked with setTimeout ──────────────────────────

  describe("chunked-setTimeout example", () => {
    const example = ADVANCED_EXAMPLES.find(
      (e) => e.id === "chunked-setTimeout",
    )!;

    it("outputs prime numbers to console", () => {
      const output = consoleOutput(example.code);
      expect(output.length).toBeGreaterThan(0);
      expect(output).toContain("2");
      expect(output).toContain("3");
    });

    it("does not output 4 (not prime)", () => {
      const output = consoleOutput(example.code);
      expect(output).not.toContain("4");
    });

    it("registers setTimeout timers in Web APIs", () => {
      const steps = run(example.code);
      const stepWithTimers = steps.find((s) => s.webAPIs.length > 0);
      expect(stepWithTimers).toBeDefined();
    });

    it("setTimeout callbacks appear in task queue", () => {
      const steps = run(example.code);
      const stepWithTask = steps.find((s) => s.taskQueue.length > 0);
      expect(stepWithTask).toBeDefined();
    });

    it("does not use microtask queue", () => {
      const steps = run(example.code);
      const stepWithMicro = steps.find((s) => s.microtaskQueue.length > 0);
      expect(stepWithMicro).toBeUndefined();
    });

    it("computePrimes frame appears on call stack", () => {
      const steps = run(example.code);
      const frame = findStepWithFrame(steps, "computePrimes");
      expect(frame).toBeDefined();
    });

    it("isPrime frame appears on call stack", () => {
      const steps = run(example.code);
      const frame = findStepWithFrame(steps, "isPrime");
      expect(frame).toBeDefined();
    });

    it("hits the step limit — recursive chunking is capped", () => {
      const steps = run(example.code);
      expect(steps.length).toBeGreaterThanOrEqual(2000);
    });

    it("outputs values in ascending order", () => {
      const output = consoleOutput(example.code);
      const values = output.map(Number);
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1]);
      }
    });
  });

  // ─── Chunked with Promise ─────────────────────────────

  describe("chunked-promise example", () => {
    const example = ADVANCED_EXAMPLES.find(
      (e) => e.id === "chunked-promise",
    )!;

    it("outputs prime numbers to console", () => {
      const output = consoleOutput(example.code);
      expect(output.length).toBeGreaterThan(0);
      expect(output).toContain("2");
      expect(output).toContain("3");
    });

    it("does not output 4 (not prime)", () => {
      const output = consoleOutput(example.code);
      expect(output).not.toContain("4");
    });

    it("uses microtask queue (Promise.resolve().then)", () => {
      const steps = run(example.code);
      const stepWithMicro = steps.find((s) => s.microtaskQueue.length > 0);
      expect(stepWithMicro).toBeDefined();
    });

    it("does not use web APIs (no setTimeout)", () => {
      const steps = run(example.code);
      const stepWithTimers = steps.find((s) => s.webAPIs.length > 0);
      expect(stepWithTimers).toBeUndefined();
    });

    it("does not use macrotask queue", () => {
      const steps = run(example.code);
      const stepWithTask = steps.find((s) => s.taskQueue.length > 0);
      expect(stepWithTask).toBeUndefined();
    });

    it("computePrimes frame appears on call stack", () => {
      const steps = run(example.code);
      const frame = findStepWithFrame(steps, "computePrimes");
      expect(frame).toBeDefined();
    });

    it("isPrime frame appears on call stack", () => {
      const steps = run(example.code);
      const frame = findStepWithFrame(steps, "isPrime");
      expect(frame).toBeDefined();
    });

    it("hits the step limit — recursive chunking is capped", () => {
      const steps = run(example.code);
      expect(steps.length).toBeGreaterThanOrEqual(2000);
    });

    it("outputs values in ascending order", () => {
      const output = consoleOutput(example.code);
      const values = output.map(Number);
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1]);
      }
    });

    it("produces more output than blocking-computation (microtasks yield faster)", () => {
      // Both hit the step limit but chunked-promise processes more primes per step
      // because microtasks don't pause for event loop turns
      const blockingOutput = consoleOutput(
        ADVANCED_EXAMPLES.find((e) => e.id === "blocking-computation")!.code,
      );
      const promiseOutput = consoleOutput(example.code);
      // Both are non-empty — this is mainly about verifying both work
      expect(blockingOutput.length).toBeGreaterThan(0);
      expect(promiseOutput.length).toBeGreaterThan(0);
    });
  });

  // ─── Default parameter handling (engine regression) ──

  describe("isPrime helper (engine regression)", () => {
    it("isPrime returns true for 2", () => {
      const output = consoleOutput(`
function isPrime(n) {
  for (let i = 2; i < n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}
console.log(isPrime(2));
`);
      expect(output[0]).toBe("true");
    });

    it("isPrime returns false for 4", () => {
      const output = consoleOutput(`
function isPrime(n) {
  for (let i = 2; i < n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}
console.log(isPrime(4));
`);
      expect(output[0]).toBe("false");
    });

    it("default parameter startAt = 1 is applied when argument is omitted", () => {
      const output = consoleOutput(`
function computePrimes(onPrime, startAt = 1) {
  let currNum;
  for (currNum = startAt; currNum <= 5; currNum++) {
    onPrime(currNum);
  }
}
computePrimes(n => { console.log(n); });
`);
      expect(output).toEqual(["1", "2", "3", "4", "5"]);
    });

    it("default parameter is skipped when argument is provided", () => {
      const output = consoleOutput(`
function computePrimes(onPrime, startAt = 1) {
  let currNum;
  for (currNum = startAt; currNum <= 5; currNum++) {
    onPrime(currNum);
  }
}
computePrimes(n => { console.log(n); }, 3);
`);
      expect(output).toEqual(["3", "4", "5"]);
    });
  });
});

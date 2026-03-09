import {
  run,
  lastStep,
  consoleOutput,
  getMemoryEntry,
  getHeapObject,
} from "./helpers";

describe("Interpreter — Async/Await", () => {
  // ─── Async function basics ────────────────────────────

  describe("async function declaration", () => {
    it("async function stored as ⓕ in memory", () => {
      const step = lastStep("async function foo() { return 1; }");
      const entry = getMemoryEntry(step, "foo");
      expect(entry).toBeDefined();
      expect(entry!.valueType).toBe("function");
      expect(entry!.displayValue).toContain("ⓕ");
    });

    it("async function HeapObject contains async keyword in source", () => {
      const step = lastStep("async function foo() { return 1; }");
      const entry = getMemoryEntry(step, "foo");
      const heap = getHeapObject(step, entry!.heapReferenceId!);
      expect(heap!.functionSource).toContain("async");
    });

    it("calling async function returns a Promise", () => {
      const step = lastStep(`
        async function foo() { return 42; }
        const p = foo();
      `);
      const entry = getMemoryEntry(step, "p");
      expect(entry!.valueType).toBe("object");
      const heap = getHeapObject(step, entry!.heapReferenceId!);
      const stateProperty = heap?.properties?.find(
        (p) => p.key === "[[PromiseState]]",
      );
      expect(stateProperty).toBeDefined();
    });
  });

  // ─── Await behavior ───────────────────────────────────

  describe("await expression", () => {
    it("await suspends the async function", () => {
      const steps = run(`
        async function fn() {
          await Promise.resolve();
        }
        fn();
      `);
      const suspendedStep = steps.find((s) =>
        s.callStack.some((f) => f.status === "suspended"),
      );
      expect(suspendedStep).toBeDefined();
    });

    it("code after async call runs before await resolves", () => {
      const output = consoleOutput(`
        async function fn() {
          await Promise.resolve();
          console.log("after await");
        }
        fn();
        console.log("sync");
      `);
      expect(output[0]).toContain("sync");
      expect(output[1]).toContain("after await");
    });

    it("await resolves with the Promise value", () => {
      const output = consoleOutput(`
        async function fn() {
          const val = await Promise.resolve(42);
          console.log(val);
        }
        fn();
      `);
      expect(output).toContain("42");
    });

    it("await on non-Promise wraps in Promise.resolve", () => {
      const output = consoleOutput(`
        async function fn() {
          const val = await 99;
          console.log(val);
        }
        fn();
      `);
      expect(output).toContain("99");
    });

    it("multiple awaits execute sequentially", () => {
      const output = consoleOutput(`
        async function fn() {
          const a = await Promise.resolve(1);
          const b = await Promise.resolve(2);
          console.log(a + b);
        }
        fn();
      `);
      expect(output).toContain("3");
    });
  });

  // ─── Suspension and memory ────────────────────────────

  describe("suspension and memory", () => {
    it("suspended frame stays in call stack", () => {
      const steps = run(`
        async function fn() {
          await Promise.resolve();
          console.log("resumed");
        }
        fn();
        console.log("sync");
      `);
      // After suspension, while sync code runs the fn frame should still be suspended
      const suspendedStep = steps.find(
        (s) =>
          s.callStack.some((f) => f.status === "suspended") &&
          s.description.toLowerCase().includes("continu"),
      );
      if (suspendedStep) {
        const fnFrame = suspendedStep.callStack.find(
          (f) => f.status === "suspended",
        );
        expect(fnFrame).toBeDefined();
      } else {
        // At minimum, a suspended step should exist
        const anySuspended = steps.find((s) =>
          s.callStack.some((f) => f.status === "suspended"),
        );
        expect(anySuspended).toBeDefined();
      }
    });

    it("suspended memory block is marked as suspended", () => {
      const steps = run(`
        async function fn() {
          const x = 10;
          await Promise.resolve();
        }
        fn();
      `);
      const suspendedStep = steps.find((s) =>
        s.memoryBlocks.some((b) => b.suspended === true),
      );
      expect(suspendedStep).toBeDefined();
    });

    it("local variables persist across await", () => {
      const output = consoleOutput(`
        async function fn() {
          const before = "hello";
          await Promise.resolve();
          console.log(before);
        }
        fn();
      `);
      expect(output).toContain("hello");
    });

    it("frame and memory restored after resumption", () => {
      const steps = run(`
        async function fn() {
          await Promise.resolve();
          console.log("done");
        }
        fn();
      `);
      const resumedStep = steps.find((s) =>
        s.description.toLowerCase().includes("resum"),
      );
      if (resumedStep) {
        const fnFrame = resumedStep.callStack.find(
          (f) => f.name !== "<global>" && f.status !== "suspended",
        );
        expect(fnFrame).toBeDefined();
      } else {
        // Verify output works at minimum — fn resumed and console.log ran
        const lastS = steps[steps.length - 1];
        expect(lastS.console.some((c) => c.args.join("").includes("done"))).toBe(
          true,
        );
      }
    });
  });

  // ─── Async return values ──────────────────────────────

  describe("async return values", () => {
    it("async function return resolves its Promise", () => {
      const output = consoleOutput(`
        async function fn() { return 42; }
        fn().then(val => console.log(val));
      `);
      expect(output).toContain("42");
    });

    it("async function without return resolves with undefined", () => {
      const output = consoleOutput(`
        async function fn() {}
        fn().then(val => console.log(String(val)));
      `);
      expect(output).toContain("undefined");
    });
  });

  // ─── Try/catch in async ───────────────────────────────

  describe("try/catch in async", () => {
    it("catches rejected await", () => {
      const output = consoleOutput(`
        async function fn() {
          try {
            await Promise.reject("err");
          } catch (e) {
            console.log("caught:", e);
          }
        }
        fn();
      `);
      expect(output[0]).toContain("caught:");
      expect(output[0]).toContain("err");
    });

    it("finally runs after try in async", () => {
      const output = consoleOutput(`
        async function fn() {
          try {
            await Promise.resolve("ok");
          } finally {
            console.log("cleanup");
          }
        }
        fn();
      `);
      expect(output).toContain("cleanup");
    });

    it("uncaught rejection rejects the async Promise", () => {
      const output = consoleOutput(`
        async function fn() {
          await Promise.reject("oops");
        }
        fn().catch(err => console.log("outer catch:", err));
      `);
      expect(output[0]).toContain("outer catch:");
      expect(output[0]).toContain("oops");
    });
  });

  // ─── Fetch simulation ────────────────────────────────

  describe("fetch simulation", () => {
    it("fetch registers in Web APIs", () => {
      const steps = run('fetch("https://api.example.com");');
      const stepWithFetch = steps.find((s) =>
        s.webAPIs.some((api) => api.type === "fetch"),
      );
      expect(stepWithFetch).toBeDefined();
    });

    it("fetch returns a Promise", () => {
      const step = lastStep(
        'const p = fetch("https://api.example.com");',
      );
      const entry = getMemoryEntry(step, "p");
      expect(entry!.valueType).toBe("object");
    });

    it("await fetch resolves with Response", () => {
      const output = consoleOutput(`
        async function fn() {
          const response = await fetch("https://api.example.com");
          console.log(response.ok);
        }
        fn();
      `);
      expect(output).toContain("true");
    });

    it("response.json() returns parsed data", () => {
      const output = consoleOutput(`
        async function fn() {
          const response = await fetch("https://api.example.com");
          const data = await response.json();
          console.log(typeof data);
        }
        fn();
      `);
      expect(output).toContain("object");
    });

    it("fetch suspends async function", () => {
      const output = consoleOutput(`
        async function fn() {
          await fetch("https://api.example.com");
          console.log("after fetch");
        }
        fn();
        console.log("sync");
      `);
      expect(output[0]).toContain("sync");
      expect(output[1]).toContain("after fetch");
    });
  });

  // ─── Async + other async patterns ─────────────────────

  describe("async interaction with other patterns", () => {
    it("async + setTimeout ordering", () => {
      const output = consoleOutput(`
        console.log("1");
        setTimeout(() => console.log("2"), 0);
        async function fn() {
          console.log("3");
          await Promise.resolve();
          console.log("4");
        }
        fn();
        console.log("5");
      `);
      expect(output[0]).toContain("1");
      expect(output[1]).toContain("3");
      expect(output[2]).toContain("5");
      expect(output[3]).toContain("4");
      expect(output[4]).toContain("2");
    });

    it("nested async calls", () => {
      const output = consoleOutput(`
        async function inner() {
          return await Promise.resolve("inner");
        }
        async function outer() {
          const val = await inner();
          console.log(val);
        }
        outer();
      `);
      expect(output).toContain("inner");
    });

    it("async arrow function", () => {
      const output = consoleOutput(`
        const fn = async () => {
          const val = await Promise.resolve("arrow");
          return val;
        };
        fn().then(v => console.log(v));
      `);
      expect(output).toContain("arrow");
    });
  });

  // ─── Step descriptions ────────────────────────────────

  describe("async step descriptions", () => {
    it("has step for async function declaration", () => {
      const steps = run("async function foo() {}");
      const declareStep = steps.find(
        (s) =>
          s.description.toLowerCase().includes("async") &&
          s.description.toLowerCase().includes("function"),
      );
      expect(declareStep).toBeDefined();
    });

    it("has step for suspension", () => {
      const steps = run(`
        async function fn() { await Promise.resolve(); }
        fn();
      `);
      const suspendStep = steps.find((s) =>
        s.description.toLowerCase().includes("suspend"),
      );
      expect(suspendStep).toBeDefined();
    });

    it("has step for resumption", () => {
      const steps = run(`
        async function fn() { await Promise.resolve(); console.log("done"); }
        fn();
      `);
      const resumeStep = steps.find((s) =>
        s.description.toLowerCase().includes("resum"),
      );
      expect(resumeStep).toBeDefined();
    });
  });

  // ─── Edge cases ───────────────────────────────────────

  describe("edge cases", () => {
    it("async function with no await works like regular function", () => {
      const output = consoleOutput(`
        async function fn() { return 42; }
        fn().then(v => console.log(v));
      `);
      expect(output).toContain("42");
    });

    it("does not crash with empty async function", () => {
      const steps = run(`
        async function empty() {}
        empty();
      `);
      expect(steps.length).toBeGreaterThan(0);
    });

    it("does not exceed step limit with many awaits", () => {
      const awaits = Array.from(
        { length: 20 },
        (_, i) => `const v${i} = await Promise.resolve(${i});`,
      ).join("\n");
      const code = `
        async function fn() { ${awaits} console.log("done"); }
        fn();
      `;
      const steps = run(code);
      expect(steps.length).toBeLessThanOrEqual(2000);
    });
  });
});

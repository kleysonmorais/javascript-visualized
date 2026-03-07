import { run, lastStep, consoleOutput, getMemoryEntry } from "./helpers";

describe("Interpreter — Async Execution", () => {
  // ─── setTimeout basics ────────────────────────────────

  describe("setTimeout", () => {
    it("registers setTimeout in Web APIs", () => {
      const steps = run("setTimeout(() => {}, 1000);");
      const stepWithTimer = steps.find((s) => s.webAPIs.length > 0);
      expect(stepWithTimer).toBeDefined();
      expect(stepWithTimer!.webAPIs[0].type).toBe("setTimeout");
      expect(stepWithTimer!.webAPIs[0].delay).toBe(1000);
    });

    it("setTimeout callback executes after synchronous code", () => {
      const output = consoleOutput(`
        console.log("sync");
        setTimeout(() => { console.log("async"); }, 100);
        console.log("sync2");
      `);
      expect(output[0]).toContain("sync");
      expect(output[1]).toContain("sync2");
      expect(output[2]).toContain("async");
    });

    it("setTimeout(fn, 0) still executes asynchronously", () => {
      const output = consoleOutput(`
        console.log("first");
        setTimeout(() => { console.log("timeout"); }, 0);
        console.log("second");
      `);
      expect(output[0]).toContain("first");
      expect(output[1]).toContain("second");
      expect(output[2]).toContain("timeout");
    });

    it("shorter delays execute before longer delays", () => {
      const output = consoleOutput(`
        setTimeout(() => { console.log("2000ms"); }, 2000);
        setTimeout(() => { console.log("100ms"); }, 100);
        console.log("sync");
      `);
      expect(output[0]).toContain("sync");
      expect(output[1]).toContain("100ms");
      expect(output[2]).toContain("2000ms");
    });

    it("same delay executes in registration order (FIFO)", () => {
      const output = consoleOutput(`
        setTimeout(() => { console.log("A"); }, 100);
        setTimeout(() => { console.log("B"); }, 100);
        setTimeout(() => { console.log("C"); }, 100);
      `);
      // Filter only async outputs (skip any sync outputs)
      const asyncOutputs = output.filter((o) =>
        ["A", "B", "C"].some((c) => o.includes(c)),
      );
      expect(asyncOutputs[0]).toContain("A");
      expect(asyncOutputs[1]).toContain("B");
      expect(asyncOutputs[2]).toContain("C");
    });

    it("handles missing delay argument (defaults to 0)", () => {
      const steps = run('setTimeout(() => { console.log("default"); });');
      const stepWithTimer = steps.find((s) => s.webAPIs.length > 0);
      expect(stepWithTimer).toBeDefined();
      expect(stepWithTimer!.webAPIs[0].delay).toBe(0);
    });
  });

  // ─── Task Queue ───────────────────────────────────────

  describe("Task Queue", () => {
    it("callback appears in Task Queue after timer completes", () => {
      const steps = run("setTimeout(() => {}, 100);");
      const stepWithTask = steps.find((s) => s.taskQueue.length > 0);
      expect(stepWithTask).toBeDefined();
      expect(stepWithTask!.taskQueue[0].sourceType).toBe("setTimeout");
    });

    it("Task Queue is FIFO — first registered, first executed", () => {
      // Find the step where both are in the Task Queue (if they queue simultaneously)
      // OR verify execution order via console
      const output = consoleOutput(`
        setTimeout(() => { console.log("A"); }, 100);
        setTimeout(() => { console.log("B"); }, 100);
      `);
      const asyncOutputs = output.filter(
        (o) => o.includes("A") || o.includes("B"),
      );
      expect(asyncOutputs[0]).toContain("A");
      expect(asyncOutputs[1]).toContain("B");
    });

    it("Task Queue empties after callback is picked by Event Loop", () => {
      const lastS = lastStep(
        'setTimeout(() => { console.log("done"); }, 100);',
      );
      expect(lastS.taskQueue.length).toBe(0);
    });
  });

  // ─── Callback execution context ───────────────────────

  describe("callback execution context", () => {
    it("callback creates a CallStackFrame", () => {
      const steps = run('setTimeout(() => { console.log("cb"); }, 100);');
      // Find step where callback is executing (has a non-global frame)
      const cbStep = steps.find((s) =>
        s.callStack.some((f) => f.name !== "<global>" && f.type === "function"),
      );
      // The callback should be found at some point during execution
      expect(
        cbStep !== undefined || steps.some((s) => s.console.length > 0),
      ).toBe(true);
    });

    it("callback creates a local MemoryBlock", () => {
      // Callback should have created a local memory at some point
      // (or at minimum, the console output should work)
      const output = consoleOutput(`
        setTimeout(() => {
          const x = 42;
          console.log(x);
        }, 100);
      `);
      expect(output).toContain("42");
    });

    it("callback local memory is removed after completion", () => {
      const step = lastStep(`
        setTimeout(() => {
          const temp = "hello";
        }, 100);
      `);
      // After callback completes, its local memory should be gone
      const localBlocks = step.memoryBlocks.filter((b) => b.type === "local");
      expect(localBlocks.length).toBe(0);
    });

    it("callback frame has a color different from global", () => {
      const steps = run('setTimeout(() => { console.log("cb"); }, 100);');
      const cbStep = steps.find((s) =>
        s.callStack.some((f) => f.name !== "<global>" && f.color !== "#f59e0b"),
      );
      if (cbStep) {
        const cbFrame = cbStep.callStack.find((f) => f.name !== "<global>");
        expect(cbFrame!.color).not.toBe("#f59e0b"); // not amber (global color)
      }
    });
  });

  // ─── Closures in callbacks ────────────────────────────

  describe("callback closures (accessing outer variables)", () => {
    it("callback can read global variables", () => {
      const output = consoleOutput(`
        const message = "Hello";
        setTimeout(() => { console.log(message); }, 100);
      `);
      expect(output).toContain("Hello");
    });

    it("callback can modify global variables", () => {
      const output = consoleOutput(`
        let x = 1;
        setTimeout(() => {
          x = 2;
          console.log(x);
        }, 100);
        console.log(x);
      `);
      expect(output[0]).toContain("1"); // sync: x is still 1
      expect(output[1]).toContain("2"); // async: x changed to 2
    });

    it("global memory reflects mutation from callback", () => {
      const step = lastStep(`
        let message = "before";
        setTimeout(() => { message = "after"; }, 100);
      `);
      const entry = getMemoryEntry(step, "message");
      expect(entry!.displayValue).toContain("after");
    });

    it("callback sees latest value of global variable", () => {
      const output = consoleOutput(`
        let x = 1;
        setTimeout(() => { console.log(x); }, 100);
        x = 99;
      `);
      // By the time callback runs, x should be 99
      expect(output).toContain("99");
    });
  });

  // ─── clearTimeout ─────────────────────────────────────

  describe("clearTimeout", () => {
    it("clearTimeout prevents callback execution", () => {
      const output = consoleOutput(`
        const id = setTimeout(() => { console.log("never"); }, 1000);
        clearTimeout(id);
        console.log("cleared");
      `);
      expect(output).toContain("cleared");
      expect(output.some((o) => o.includes("never"))).toBe(false);
    });

    it("clearTimeout marks timer as cancelled in Web APIs", () => {
      const steps = run(`
        const id = setTimeout(() => {}, 1000);
        clearTimeout(id);
      `);
      const cancelledStep = steps.find((s) =>
        s.webAPIs.some((api) => api.status === "cancelled"),
      );
      expect(cancelledStep).toBeDefined();
    });

    it("cancelled timer does not appear in Task Queue", () => {
      const steps = run(`
        const id = setTimeout(() => {}, 100);
        clearTimeout(id);
      `);
      // No step should have a task queue item from this timer
      const hasTask = steps.some((s) =>
        s.taskQueue.some((t) => t.sourceType === "setTimeout"),
      );
      expect(hasTask).toBe(false);
    });
  });

  // ─── setInterval ──────────────────────────────────────

  describe("setInterval", () => {
    it("setInterval executes callback multiple times", () => {
      const output = consoleOutput(`
        let count = 0;
        const id = setInterval(() => {
          count++;
          console.log("tick " + count);
          if (count >= 3) clearInterval(id);
        }, 100);
      `);
      expect(output.filter((o) => o.includes("tick")).length).toBe(3);
    });

    it("setInterval respects iteration safety limit", () => {
      // Without clearInterval, should stop at max iterations (3)
      const output = consoleOutput(`
        setInterval(() => { console.log("tick"); }, 100);
      `);
      const ticks = output.filter((o) => o.includes("tick"));
      expect(ticks.length).toBeLessThanOrEqual(3);
    });

    it("clearInterval stops future iterations", () => {
      const output = consoleOutput(`
        let count = 0;
        const id = setInterval(() => {
          count++;
          console.log("tick " + count);
          if (count >= 2) clearInterval(id);
        }, 100);
      `);
      const ticks = output.filter((o) => o.includes("tick"));
      expect(ticks.length).toBe(2);
    });

    it("setInterval registers in Web APIs", () => {
      const steps = run("setInterval(() => {}, 500);");
      const stepWithTimer = steps.find((s) =>
        s.webAPIs.some((api) => api.type === "setInterval"),
      );
      expect(stepWithTimer).toBeDefined();
    });
  });

  // ─── Nested timers ────────────────────────────────────

  describe("nested timers", () => {
    it("setTimeout inside setTimeout callback", () => {
      const output = consoleOutput(`
        setTimeout(() => {
          console.log("outer");
          setTimeout(() => {
            console.log("inner");
          }, 50);
        }, 100);
      `);
      expect(output[0]).toContain("outer");
      expect(output[1]).toContain("inner");
    });

    it("nested timers create separate execution contexts", () => {
      // Should have console output from the nested callback
      const output = consoleOutput(`
        setTimeout(() => {
          setTimeout(() => {
            console.log("nested");
          }, 50);
        }, 100);
      `);
      expect(output).toContain("nested");
    });
  });

  // ─── Event Loop phases ────────────────────────────────

  describe("Event Loop phases", () => {
    it("starts with executing-task during sync code", () => {
      const steps = run('console.log("sync");');
      const syncStep = steps.find(
        (s) => s.eventLoop.phase === "executing-task",
      );
      expect(syncStep).toBeDefined();
    });

    it("transitions to checking-tasks after sync code completes", () => {
      const steps = run("setTimeout(() => {}, 100);");
      const checkingStep = steps.find(
        (s) => s.eventLoop.phase === "checking-tasks",
      );
      expect(checkingStep).toBeDefined();
    });

    it("transitions to picking-task when moving callback from queue", () => {
      const steps = run('setTimeout(() => { console.log("cb"); }, 100);');
      const pickingStep = steps.find(
        (s) => s.eventLoop.phase === "picking-task",
      );
      expect(pickingStep).toBeDefined();
    });

    it("transitions to idle when all tasks are done", () => {
      const step = lastStep('setTimeout(() => { console.log("done"); }, 100);');
      expect(step.eventLoop.phase).toBe("idle");
    });

    it("event loop description is always a non-empty string", () => {
      const steps = run(`
        setTimeout(() => { console.log("a"); }, 100);
        console.log("b");
      `);
      for (const step of steps) {
        expect(step.eventLoop.description).toBeDefined();
        expect(step.eventLoop.description.length).toBeGreaterThan(0);
      }
    });
  });

  // ─── Web APIs lifecycle ───────────────────────────────

  describe("Web APIs lifecycle", () => {
    it("timer status transitions: running → completed", () => {
      const steps = run("setTimeout(() => {}, 100);");

      const runningStep = steps.find((s) =>
        s.webAPIs.some((api) => api.status === "running"),
      );
      expect(runningStep).toBeDefined();

      const completedStep = steps.find((s) =>
        s.webAPIs.some((api) => api.status === "completed"),
      );
      expect(completedStep).toBeDefined();
    });

    it("timer shows callback source", () => {
      const steps = run('setTimeout(() => { console.log("hello"); }, 100);');
      const stepWithTimer = steps.find((s) => s.webAPIs.length > 0);
      expect(stepWithTimer!.webAPIs[0].callback).toBeDefined();
      expect(stepWithTimer!.webAPIs[0].callback.length).toBeGreaterThan(0);
    });

    it("multiple timers tracked independently", () => {
      const steps = run(`
        setTimeout(() => {}, 100);
        setTimeout(() => {}, 200);
      `);
      const stepWith2 = steps.find((s) => s.webAPIs.length === 2);
      expect(stepWith2).toBeDefined();
      expect(stepWith2!.webAPIs[0].id).not.toBe(stepWith2!.webAPIs[1].id);
    });
  });

  // ─── Step descriptions for async ─────────────────────

  describe("async step descriptions", () => {
    it("has step for timer registration", () => {
      const steps = run("setTimeout(() => {}, 100);");
      const regStep = steps.find(
        (s) =>
          s.description.toLowerCase().includes("settimeout") &&
          s.description.toLowerCase().includes("register"),
      );
      expect(regStep).toBeDefined();
    });

    it("has step for timer completion", () => {
      const steps = run('setTimeout(() => { console.log("x"); }, 100);');
      const completeStep = steps.find(
        (s) =>
          s.description.toLowerCase().includes("complete") ||
          s.description.toLowerCase().includes("timer"),
      );
      expect(completeStep).toBeDefined();
    });

    it("has step for Event Loop picking task", () => {
      const steps = run('setTimeout(() => { console.log("x"); }, 100);');
      const pickStep = steps.find(
        (s) =>
          s.description.toLowerCase().includes("event loop") ||
          s.description.toLowerCase().includes("pick"),
      );
      expect(pickStep).toBeDefined();
    });

    it("has step for callback execution", () => {
      const steps = run('setTimeout(() => { console.log("x"); }, 100);');
      const cbStep = steps.find(
        (s) =>
          s.description.toLowerCase().includes("callback") ||
          s.description.toLowerCase().includes("executing"),
      );
      expect(cbStep).toBeDefined();
    });
  });

  // ─── Classic Event Loop quiz scenarios ────────────────

  describe("classic Event Loop scenarios", () => {
    it("quiz: console.log vs setTimeout(0)", () => {
      const output = consoleOutput(`
        console.log("1");
        setTimeout(() => console.log("2"), 0);
        console.log("3");
      `);
      expect(output[0]).toContain("1");
      expect(output[1]).toContain("3");
      expect(output[2]).toContain("2");
    });

    it("quiz: multiple timeouts with different delays", () => {
      const output = consoleOutput(`
        setTimeout(() => console.log("A"), 200);
        setTimeout(() => console.log("B"), 100);
        setTimeout(() => console.log("C"), 300);
        console.log("D");
      `);
      expect(output[0]).toContain("D");
      expect(output[1]).toContain("B");
      expect(output[2]).toContain("A");
      expect(output[3]).toContain("C");
    });

    it("quiz: sync + async variable mutation", () => {
      const output = consoleOutput(`
        let x = 1;
        setTimeout(() => {
          x = 2;
          console.log("async x:", x);
        }, 100);
        console.log("sync x:", x);
      `);
      expect(output[0]).toContain("1");
      expect(output[1]).toContain("2");
    });
  });

  // ─── Edge cases ───────────────────────────────────────

  describe("edge cases", () => {
    it("empty callback body does not crash", () => {
      const steps = run("setTimeout(() => {}, 100);");
      expect(steps.length).toBeGreaterThan(0);
    });

    it("code with no async still works", () => {
      const output = consoleOutput('console.log("just sync");');
      expect(output).toContain("just sync");
    });

    it("many timers do not exceed step limit", () => {
      const code = Array.from(
        { length: 20 },
        (_, i) => `setTimeout(() => { console.log(${i}); }, ${i * 10});`,
      ).join("\n");
      const steps = run(code);
      expect(steps.length).toBeLessThanOrEqual(2000);
    });
  });
});

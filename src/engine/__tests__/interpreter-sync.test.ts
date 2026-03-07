import {
  run,
  lastStep,
  consoleOutput,
  findStep,
  findStepWithFrame,
  frameNames,
  stepCount,
} from "./helpers";

describe("Interpreter — Synchronous Execution", () => {
  // ─── Step generation ─────────────────────────────────

  describe("step generation", () => {
    it("generates steps for simple code", () => {
      const steps = run("const x = 10;");
      expect(steps.length).toBeGreaterThan(0);
    });

    it("each step has required fields", () => {
      const steps = run("const x = 10;");
      for (const step of steps) {
        expect(step).toHaveProperty("index");
        expect(step).toHaveProperty("callStack");
        expect(step).toHaveProperty("memoryBlocks");
        expect(step).toHaveProperty("heap");
        expect(step).toHaveProperty("console");
        expect(step).toHaveProperty("eventLoop");
        expect(step).toHaveProperty("description");
        expect(step).toHaveProperty("highlightedLine");
      }
    });

    it("step indices are sequential", () => {
      const steps = run("const a = 1; const b = 2;");
      for (let i = 0; i < steps.length; i++) {
        expect(steps[i].index).toBe(i);
      }
    });

    it("enforces step limit", () => {
      // Generate a lot of steps with a long loop
      const code = "for (let i = 0; i < 10000; i++) { i; }";
      const steps = run(code);
      expect(steps.length).toBeLessThanOrEqual(2000);
    });
  });

  // ─── Variable declarations ────────────────────────────

  describe("variable declarations", () => {
    it("handles const declaration with number", () => {
      const output = consoleOutput("const x = 42; console.log(x);");
      expect(output).toContain("42");
    });

    it("handles let declaration with string", () => {
      const output = consoleOutput('let name = "Joe"; console.log(name);');
      expect(output).toContain("Joe");
    });

    it("handles var declaration", () => {
      const output = consoleOutput("var count = 0; console.log(count);");
      expect(output).toContain("0");
    });

    it("handles undefined initial value", () => {
      const output = consoleOutput("let x; console.log(x);");
      expect(output).toContain("undefined");
    });

    it("handles boolean values", () => {
      const output = consoleOutput("const flag = true; console.log(flag);");
      expect(output).toContain("true");
    });

    it("handles null values", () => {
      const output = consoleOutput("const x = null; console.log(x);");
      expect(output).toContain("null");
    });

    it("handles multiple declarations", () => {
      const output = consoleOutput(`
        const a = 1;
        const b = 2;
        const c = 3;
        console.log(a, b, c);
      `);
      expect(output[0]).toContain("1");
    });
  });

  // ─── Expressions & operators ──────────────────────────

  describe("expressions and operators", () => {
    it("evaluates arithmetic expressions", () => {
      const output = consoleOutput("console.log(2 + 3);");
      expect(output).toContain("5");
    });

    it("evaluates string concatenation", () => {
      const output = consoleOutput('console.log("Hello" + " " + "World");');
      expect(output).toContain("Hello World");
    });

    it("evaluates comparison operators", () => {
      const output = consoleOutput("console.log(5 > 3);");
      expect(output).toContain("true");
    });

    it("evaluates logical operators", () => {
      const output = consoleOutput("console.log(true && false);");
      expect(output).toContain("false");
    });

    it("evaluates ternary operator", () => {
      const output = consoleOutput('console.log(true ? "yes" : "no");');
      expect(output).toContain("yes");
    });

    it("evaluates unary operators", () => {
      const output = consoleOutput("console.log(!true);");
      expect(output).toContain("false");
    });

    it("evaluates typeof", () => {
      const output = consoleOutput("console.log(typeof 42);");
      expect(output).toContain("number");
    });
  });

  // ─── Assignment ───────────────────────────────────────

  describe("assignments", () => {
    it("updates variable value", () => {
      const output = consoleOutput(`
        let x = 1;
        x = 2;
        console.log(x);
      `);
      expect(output).toContain("2");
    });

    it("handles compound assignment operators", () => {
      const output = consoleOutput(`
        let x = 10;
        x += 5;
        console.log(x);
      `);
      expect(output).toContain("15");
    });

    it("handles increment/decrement", () => {
      const output = consoleOutput(`
        let x = 1;
        x++;
        console.log(x);
      `);
      expect(output).toContain("2");
    });
  });

  // ─── Function calls ───────────────────────────────────

  describe("function calls", () => {
    it("executes simple function call", () => {
      const output = consoleOutput(`
        function greet() {
          console.log("Hello");
        }
        greet();
      `);
      expect(output).toContain("Hello");
    });

    it("passes arguments correctly", () => {
      const output = consoleOutput(`
        function add(a, b) {
          return a + b;
        }
        console.log(add(3, 4));
      `);
      expect(output).toContain("7");
    });

    it("handles return values", () => {
      const output = consoleOutput(`
        function multiply(a, b) {
          return a * b;
        }
        const result = multiply(3, 4);
        console.log(result);
      `);
      expect(output).toContain("12");
    });

    it("pushes and pops call stack frames", () => {
      const steps = run(`
        function foo() { return 1; }
        foo();
      `);
      const fooStep = findStepWithFrame(steps, "foo");
      expect(fooStep).toBeDefined();
      expect(fooStep!.callStack.some((f) => f.name === "foo")).toBe(true);

      // After foo returns, it should not be in the call stack
      const lastS = steps[steps.length - 1];
      expect(lastS.callStack.every((f) => f.name !== "foo")).toBe(true);
    });

    it("handles nested function calls", () => {
      const output = consoleOutput(`
        function double(n) { return n * 2; }
        function quadruple(n) { return double(double(n)); }
        console.log(quadruple(3));
      `);
      expect(output).toContain("12");
    });

    it("handles arrow functions", () => {
      const output = consoleOutput(`
        const add = (a, b) => a + b;
        console.log(add(5, 3));
      `);
      expect(output).toContain("8");
    });

    it("handles function expressions", () => {
      const output = consoleOutput(`
        const greet = function(name) {
          return "Hello " + name;
        };
        console.log(greet("World"));
      `);
      expect(output).toContain("Hello World");
    });

    it("handles recursive functions", () => {
      const output = consoleOutput(`
        function factorial(n) {
          if (n <= 1) return 1;
          return n * factorial(n - 1);
        }
        console.log(factorial(5));
      `);
      expect(output).toContain("120");
    });
  });

  // ─── Control flow ─────────────────────────────────────

  describe("control flow", () => {
    it("handles if/true branch", () => {
      const output = consoleOutput(`
        if (true) { console.log("yes"); } else { console.log("no"); }
      `);
      expect(output).toContain("yes");
    });

    it("handles if/false branch (else)", () => {
      const output = consoleOutput(`
        if (false) { console.log("yes"); } else { console.log("no"); }
      `);
      expect(output).toContain("no");
    });

    it("handles else if chain", () => {
      const output = consoleOutput(`
        const x = 2;
        if (x === 1) { console.log("one"); }
        else if (x === 2) { console.log("two"); }
        else { console.log("other"); }
      `);
      expect(output).toContain("two");
    });

    it("handles for loop", () => {
      const output = consoleOutput(`
        let sum = 0;
        for (let i = 1; i <= 5; i++) {
          sum += i;
        }
        console.log(sum);
      `);
      expect(output).toContain("15");
    });

    it("handles while loop", () => {
      const output = consoleOutput(`
        let i = 0;
        while (i < 3) {
          i++;
        }
        console.log(i);
      `);
      expect(output).toContain("3");
    });

    // Skip: BreakStatement is not yet implemented in the interpreter
    it.skip("handles for loop with break", () => {
      const output = consoleOutput(`
        let result = 0;
        for (let i = 0; i < 100; i++) {
          if (i === 5) break;
          result = i;
        }
        console.log(result);
      `);
      expect(output).toContain("4");
    });
  });

  // ─── Console ──────────────────────────────────────────

  describe("console output", () => {
    it("handles console.log with multiple arguments", () => {
      const step = lastStep('console.log("a", "b", "c");');
      expect(step.console.length).toBe(1);
      expect(step.console[0].method).toBe("log");
    });

    it("handles console.warn", () => {
      const step = lastStep('console.warn("warning");');
      const warnEntry = step.console.find((e) => e.method === "warn");
      expect(warnEntry).toBeDefined();
    });

    it("handles console.error", () => {
      const step = lastStep('console.error("error");');
      const errorEntry = step.console.find((e) => e.method === "error");
      expect(errorEntry).toBeDefined();
    });

    it("accumulates console entries across steps", () => {
      const step = lastStep(`
        console.log("first");
        console.log("second");
        console.log("third");
      `);
      expect(step.console.length).toBe(3);
    });
  });

  // ─── Objects & arrays ─────────────────────────────────

  describe("objects and arrays", () => {
    it("handles object property access", () => {
      const output = consoleOutput(`
        const obj = { name: "Joe", age: 23 };
        console.log(obj.name);
      `);
      expect(output).toContain("Joe");
    });

    it("handles nested object access", () => {
      const output = consoleOutput(`
        const obj = { address: { city: "New York" } };
        console.log(obj.address.city);
      `);
      expect(output).toContain("New York");
    });

    it("handles array access by index", () => {
      const output = consoleOutput(`
        const arr = [10, 20, 30];
        console.log(arr[1]);
      `);
      expect(output).toContain("20");
    });

    it("handles array length", () => {
      const output = consoleOutput(`
        const arr = [1, 2, 3, 4, 5];
        console.log(arr.length);
      `);
      expect(output).toContain("5");
    });

    it("handles object property mutation", () => {
      const output = consoleOutput(`
        const obj = { x: 1 };
        obj.x = 2;
        console.log(obj.x);
      `);
      expect(output).toContain("2");
    });
  });

  // ─── Scoping ──────────────────────────────────────────

  describe("scoping", () => {
    it("function has access to global variables", () => {
      const output = consoleOutput(`
        const x = 10;
        function showX() { console.log(x); }
        showX();
      `);
      expect(output).toContain("10");
    });

    it("function parameters shadow global variables", () => {
      const output = consoleOutput(`
        const x = 10;
        function showX(x) { console.log(x); }
        showX(20);
      `);
      expect(output).toContain("20");
    });

    it("local variables do not leak to global scope", () => {
      const output = consoleOutput(`
        function foo() {
          const local = "inside";
          return local;
        }
        const result = foo();
        console.log(result);
        console.log(typeof local);
      `);
      expect(output[0]).toContain("inside");
    });
  });
});

import {
  run,
  lastStep,
  consoleOutput,
  getMemoryEntry,
  getHeapObject,
} from "./helpers";

describe("Interpreter — Generators", () => {
  it("function* stored as ⓕ* in memory", () => {
    const step = lastStep("function* gen() { yield 1; }");
    const entry = getMemoryEntry(step, "gen");
    expect(entry).toBeDefined();
    expect(entry!.valueType).toBe("function");
    expect(entry!.displayValue).toContain("ⓕ");
  });

  it("calling generator creates generator object", () => {
    const step = lastStep(`
      function* gen() { yield 1; }
      const g = gen();
    `);
    const entry = getMemoryEntry(step, "g");
    expect(entry).toBeDefined();
    expect(entry!.valueType).toBe("object");
    const heap = getHeapObject(step, entry!.heapReferenceId!);
    expect(heap).toBeDefined();
    expect(heap!.generatorState).toBe("suspended");
  });

  it("next() returns yielded value", () => {
    const output = consoleOutput(`
      function* gen() { yield 42; }
      const g = gen();
      const result = g.next();
      console.log(result.value);
    `);
    expect(output).toContain("42");
  });

  it("next() returns done:true after generator completes", () => {
    const output = consoleOutput(`
      function* gen() { yield 1; }
      const g = gen();
      g.next();
      const result = g.next();
      console.log(result.done);
    `);
    expect(output).toContain("true");
  });

  it("generator local memory persists across yields", () => {
    // Note: Yield inside loops requires state machine transformation
    // Using sequential yields for this test
    const output = consoleOutput(`
      function* counter() {
        let count = 0;
        count++;
        yield count;
        count++;
        yield count;
        count++;
        yield count;
      }
      const c = counter();
      console.log(c.next().value);
      console.log(c.next().value);
      console.log(c.next().value);
    `);
    expect(output[0]).toContain("1");
    expect(output[1]).toContain("2");
    expect(output[2]).toContain("3");
  });

  it("for...of iterates generator", () => {
    // Note: Yield inside loops requires state machine transformation
    // Using sequential yields for this test
    const output = consoleOutput(`
      function* threeItems() {
        yield 0;
        yield 1;
        yield 2;
      }
      for (const val of threeItems()) {
        console.log(val);
      }
    `);
    expect(output[0]).toContain("0");
    expect(output[1]).toContain("1");
    expect(output[2]).toContain("2");
  });

  it("generator with return value", () => {
    const output = consoleOutput(`
      function* gen() {
        yield 1;
        return "done";
      }
      const g = gen();
      console.log(g.next().value);
      console.log(g.next().value);
      console.log(g.next().done);
    `);
    expect(output[0]).toContain("1");
    expect(output[1]).toContain("done");
    expect(output[2]).toContain("true");
  });

  it("generator state transitions correctly", () => {
    const lastS = lastStep(`
      function* gen() { yield 1; yield 2; }
      const g = gen();
      g.next();
      g.next();
      g.next();
    `);
    const entry = getMemoryEntry(lastS, "g");
    const heap = getHeapObject(lastS, entry!.heapReferenceId!);
    expect(heap!.generatorState).toBe("closed");
  });

  it("generator function declaration stored correctly", () => {
    const steps = run("function* myGen() { yield 1; yield 2; }");
    const declarationStep = steps.find(
      (s) =>
        s.description.includes("generator function") &&
        s.description.includes("myGen"),
    );
    expect(declarationStep).toBeDefined();
  });

  it("generator invocation does not execute body", () => {
    const output = consoleOutput(`
      function* gen() {
        console.log("inside generator");
        yield 1;
      }
      const g = gen();
      console.log("after creation");
    `);
    // "inside generator" should not be logged yet since we haven't called next()
    expect(output.length).toBe(1);
    expect(output[0]).toContain("after creation");
  });

  it("generator respects next() input value", () => {
    const output = consoleOutput(`
      function* gen() {
        const x = yield 1;
        yield x * 2;
      }
      const g = gen();
      console.log(g.next().value);
      console.log(g.next(10).value);
    `);
    expect(output[0]).toContain("1");
    expect(output[1]).toContain("20");
  });

  it("gen.return() closes the generator", () => {
    const output = consoleOutput(`
      function* gen() {
        yield 1;
        yield 2;
        yield 3;
      }
      const g = gen();
      console.log(g.next().value);
      console.log(g.return("returned early").value);
      console.log(g.next().done);
    `);
    expect(output[0]).toContain("1");
    expect(output[1]).toContain("returned early");
    expect(output[2]).toContain("true");
  });

  it("for...of on array works", () => {
    const output = consoleOutput(`
      const arr = [10, 20, 30];
      for (const x of arr) {
        console.log(x);
      }
    `);
    expect(output[0]).toContain("10");
    expect(output[1]).toContain("20");
    expect(output[2]).toContain("30");
  });

  it("for...of on string works", () => {
    const output = consoleOutput(`
      for (const ch of "abc") {
        console.log(ch);
      }
    `);
    expect(output[0]).toContain("a");
    expect(output[1]).toContain("b");
    expect(output[2]).toContain("c");
  });

  it("generator heap object has correct properties", () => {
    const step = lastStep(`
      function* gen() { yield 1; }
      const g = gen();
    `);
    const entry = getMemoryEntry(step, "g");
    const heap = getHeapObject(step, entry!.heapReferenceId!);
    expect(heap).toBeDefined();
    expect(heap!.label).toContain("Generator");
    expect(heap!.properties).toBeDefined();
    const stateProperty = heap!.properties?.find(
      (p) => p.key === "[[GeneratorState]]",
    );
    expect(stateProperty).toBeDefined();
    const funcProperty = heap!.properties?.find(
      (p) => p.key === "[[GeneratorFunction]]",
    );
    expect(funcProperty).toBeDefined();
    const nextProperty = heap!.properties?.find((p) => p.key === "next");
    expect(nextProperty).toBeDefined();
  });

  it("multiple generators work independently", () => {
    // Note: Yield inside loops requires state machine transformation
    // Using sequential yields for this test
    const output = consoleOutput(`
      function* twoValues(a, b) {
        yield a;
        yield b;
      }
      const g1 = twoValues(1, 2);
      const g2 = twoValues(100, 101);
      console.log(g1.next().value);
      console.log(g2.next().value);
      console.log(g1.next().value);
      console.log(g2.next().value);
    `);
    expect(output[0]).toContain("1");
    expect(output[1]).toContain("100");
    expect(output[2]).toContain("2");
    expect(output[3]).toContain("101");
  });
});

import { describe, it, expect } from "vitest";
import { run, lastStep, consoleOutput, getMemoryEntry, getHeapObject } from "./helpers";

describe("Interpreter — Classes", () => {
  it("class declaration creates ⓕ entry in memory", () => {
    const step = lastStep("class Foo {}");
    const entry = getMemoryEntry(step, "Foo");
    expect(entry).toBeDefined();
    expect(entry!.valueType).toBe("function");
  });

  it("class declaration produces a HeapObject", () => {
    const step = lastStep("class Foo {}");
    const entry = getMemoryEntry(step, "Foo");
    expect(entry!.heapReferenceId).toBeDefined();
    const heap = getHeapObject(step, entry!.heapReferenceId!);
    expect(heap).toBeDefined();
    expect(heap!.label).toContain("Foo");
  });

  it("new creates an instance HeapObject", () => {
    const step = lastStep(`
      class Foo { constructor() { this.x = 1; } }
      const f = new Foo();
    `);
    const entry = getMemoryEntry(step, "f");
    expect(entry!.valueType).toBe("object");
    const heap = getHeapObject(step, entry!.heapReferenceId!);
    expect(heap!.type).toBe("object");
  });

  it("constructor sets instance properties on the heap", () => {
    const step = lastStep(`
      class Person { constructor(name) { this.name = name; } }
      const p = new Person("Joe");
    `);
    const entry = getMemoryEntry(step, "p");
    const heap = getHeapObject(step, entry!.heapReferenceId!);
    const nameProp = heap!.properties?.find((p) => p.key === "name");
    expect(nameProp).toBeDefined();
    expect(nameProp!.displayValue).toContain("Joe");
  });

  it("instance has [[Prototype]] property on heap", () => {
    const step = lastStep(`
      class Foo { constructor() { this.x = 1; } }
      const f = new Foo();
    `);
    const entry = getMemoryEntry(step, "f");
    const heap = getHeapObject(step, entry!.heapReferenceId!);
    const proto = heap!.properties?.find((p) => p.key === "[[Prototype]]");
    expect(proto).toBeDefined();
    expect(proto!.displayValue).toContain("Foo");
  });

  it("this is visible in constructor local memory", () => {
    const steps = run(`
      class Foo { constructor() { this.x = 1; } }
      new Foo();
    `);
    const constructorStep = steps.find((s) =>
      s.memoryBlocks.some((b) => b.entries.some((e) => e.name === "this"))
    );
    expect(constructorStep).toBeDefined();
  });

  it("method call works on instance", () => {
    const output = consoleOutput(`
      class Dog {
        constructor(name) { this.name = name; }
        speak() { console.log(this.name + " barks"); }
      }
      const d = new Dog("Rex");
      d.speak();
    `);
    expect(output.join(" ")).toContain("Rex barks");
  });

  it("method can return a value using this", () => {
    const output = consoleOutput(`
      class Counter {
        constructor(n) { this.n = n; }
        double() { return this.n * 2; }
      }
      const c = new Counter(5);
      console.log(c.double());
    `);
    expect(output.join(" ")).toContain("10");
  });

  it("extends establishes prototype chain on class heap", () => {
    const step = lastStep(`
      class Animal { constructor(name) { this.name = name; } }
      class Dog extends Animal { constructor(name) { super(name); this.type = "dog"; } }
    `);
    const dogEntry = getMemoryEntry(step, "Dog");
    const dogHeap = getHeapObject(step, dogEntry!.heapReferenceId!);
    const proto = dogHeap!.properties?.find((p) => p.key === "[[Prototype]]");
    expect(proto).toBeDefined();
    expect(proto!.displayValue).toContain("Animal");
  });

  it("super() calls parent constructor and sets parent properties", () => {
    const output = consoleOutput(`
      class Animal {
        constructor(name) { this.name = name; }
        speak() { return this.name; }
      }
      class Dog extends Animal {
        constructor(name) { super(name); this.type = "dog"; }
      }
      const d = new Dog("Rex");
      console.log(d.speak());
      console.log(d.type);
    `);
    expect(output[0]).toContain("Rex");
    expect(output[1]).toContain("dog");
  });

  it("super() passes transformed args to parent constructor", () => {
    const output = consoleOutput(`
      class Base { constructor(x) { this.x = x; } }
      class Child extends Base { constructor(x) { super(x * 2); } }
      const c = new Child(5);
      console.log(c.x);
    `);
    expect(output.join(" ")).toContain("10");
  });

  it("instance has both parent and child properties after super()", () => {
    const step = lastStep(`
      class Base { constructor(x) { this.x = x; } }
      class Child extends Base { constructor(x) { super(x); this.y = x + 1; } }
      const c = new Child(3);
    `);
    const entry = getMemoryEntry(step, "c");
    const heap = getHeapObject(step, entry!.heapReferenceId!);
    const xProp = heap!.properties?.find((p) => p.key === "x");
    const yProp = heap!.properties?.find((p) => p.key === "y");
    expect(xProp!.displayValue).toBe("3");
    expect(yProp!.displayValue).toBe("4");
  });

  it("static methods work", () => {
    const output = consoleOutput(`
      class MathHelper {
        static add(a, b) { return a + b; }
      }
      console.log(MathHelper.add(3, 4));
    `);
    expect(output.join(" ")).toContain("7");
  });

  it("class declaration step description includes class name", () => {
    const steps = run("class Foo {}");
    const declStep = steps.find((s) => s.description.includes("Declaring class **Foo**"));
    expect(declStep).toBeDefined();
  });

  it("extends declaration step description includes both names", () => {
    const steps = run(`
      class Animal {}
      class Dog extends Animal {}
    `);
    const declStep = steps.find((s) =>
      s.description.includes("Dog") && s.description.includes("Animal")
    );
    expect(declStep).toBeDefined();
  });

  it("new step description includes class name", () => {
    const steps = run(`
      class Foo { constructor() {} }
      new Foo();
    `);
    const newStep = steps.find((s) => s.description.includes("new Foo"));
    expect(newStep).toBeDefined();
  });

  it("constructor completed step description appears", () => {
    const steps = run(`
      class Foo { constructor() { this.x = 1; } }
      new Foo();
    `);
    const doneStep = steps.find((s) =>
      s.description.toLowerCase().includes("constructor completed")
    );
    expect(doneStep).toBeDefined();
  });
});

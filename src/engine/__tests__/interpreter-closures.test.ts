import { describe, it, expect } from 'vitest';
import {
  run,
  lastStep,
  consoleOutput,
  findStep,
  getMemoryEntry,
  getHeapObject,
} from './helpers';

describe('Interpreter — Closures', () => {

  it('closure can access enclosing scope variable', () => {
    const output = consoleOutput(`
      function outer() {
        const x = 10;
        function inner() { console.log(x); }
        inner();
      }
      outer();
    `);
    expect(output).toContain('10');
  });

  it('closure retains access after enclosing scope is popped', () => {
    const output = consoleOutput(`
      function outer() {
        const secret = "hidden";
        return function() { return secret; };
      }
      const fn = outer();
      console.log(fn());
    `);
    expect(output).toContain('hidden');
  });

  it('function HeapObject has closureScope when capturing variables', () => {
    const step = lastStep(`
      function outer() {
        const x = 10;
        const inner = () => x;
        return inner;
      }
      const fn = outer();
    `);
    const entry = getMemoryEntry(step, 'fn');
    expect(entry).toBeDefined();
    expect(entry!.heapReferenceId).toBeDefined();
    const heapObj = getHeapObject(step, entry!.heapReferenceId!);
    expect(heapObj).toBeDefined();
    expect(heapObj!.closureScope).toBeDefined();
    expect(heapObj!.closureScope!.length).toBeGreaterThan(0);
  });

  it('closureScope contains the captured variable name and value', () => {
    const step = lastStep(`
      function outer() {
        const secret = "hello";
        return function() { return secret; };
      }
      const fn = outer();
    `);
    const entry = getMemoryEntry(step, 'fn');
    expect(entry).toBeDefined();
    const heapObj = getHeapObject(step, entry!.heapReferenceId!);
    expect(heapObj).toBeDefined();
    expect(heapObj!.closureScope).toBeDefined();
    const capturedVars = heapObj!.closureScope!.flatMap((s) => s.variables);
    const secretVar = capturedVars.find((v) => v.name === 'secret');
    expect(secretVar).toBeDefined();
    expect(secretVar!.displayValue).toContain('hello');
  });

  it('closure mutation updates [[Scope]] value (counter pattern)', () => {
    const output = consoleOutput(`
      function createCounter() {
        let count = 0;
        return function() {
          count++;
          return count;
        };
      }
      const counter = createCounter();
      console.log(counter());
      console.log(counter());
      console.log(counter());
    `);
    expect(output[0]).toContain('1');
    expect(output[1]).toContain('2');
    expect(output[2]).toContain('3');
  });

  it('multiple closures share the same captured scope', () => {
    const output = consoleOutput(`
      function createPair() {
        let val = 0;
        const get = function() { return val; };
        const set = function(v) { val = v; };
        return { get: get, set: set };
      }
      const pair = createPair();
      pair.set(42);
      console.log(pair.get());
    `);
    expect(output).toContain('42');
  });

  it('enclosing scope MemoryBlock is removed but [[Scope]] persists', () => {
    const step = lastStep(`
      function outer() {
        const x = 10;
        return () => x;
      }
      const fn = outer();
    `);
    // outer's local MemoryBlock should be gone
    const outerBlock = step.memoryBlocks.find((b) => b.label.includes('outer'));
    expect(outerBlock).toBeUndefined();
    // But fn's [[Scope]] should still exist with x
    const entry = getMemoryEntry(step, 'fn');
    expect(entry).toBeDefined();
    const heapObj = getHeapObject(step, entry!.heapReferenceId!);
    expect(heapObj!.closureScope).toBeDefined();
  });

  it('closureScope color matches the original frame color', () => {
    const steps = run(`
      function outer() {
        const x = 1;
        return () => x;
      }
      const fn = outer();
    `);
    // Find a step where outer is on the call stack to get its color
    const outerStep = steps.find((s) =>
      s.callStack.some((f) => f.name === 'outer'),
    );
    expect(outerStep).toBeDefined();
    const outerColor = outerStep!.callStack.find((f) => f.name === 'outer')!.color;

    // On the last step, fn's [[Scope]] should reference that same color
    const lastS = steps[steps.length - 1];
    const entry = getMemoryEntry(lastS, 'fn');
    const heapObj = getHeapObject(lastS, entry!.heapReferenceId!);
    expect(heapObj!.closureScope).toBeDefined();
    expect(heapObj!.closureScope![0].scopeColor).toBe(outerColor);
  });

  it('closureScope scopeName matches the enclosing function name', () => {
    const step = lastStep(`
      function createCounter() {
        let count = 0;
        return function increment() { count++; return count; };
      }
      const counter = createCounter();
    `);
    const entry = getMemoryEntry(step, 'counter');
    expect(entry).toBeDefined();
    const heapObj = getHeapObject(step, entry!.heapReferenceId!);
    expect(heapObj!.closureScope).toBeDefined();
    const scope = heapObj!.closureScope![0];
    expect(scope.scopeName).toBe('createCounter');
  });

  it('let captured variables are marked as mutable', () => {
    const step = lastStep(`
      function outer() {
        let mutable = 0;
        const immutable = 42;
        return () => mutable + immutable;
      }
      const fn = outer();
    `);
    const entry = getMemoryEntry(step, 'fn');
    const heapObj = getHeapObject(step, entry!.heapReferenceId!);
    expect(heapObj!.closureScope).toBeDefined();
    const vars = heapObj!.closureScope!.flatMap((s) => s.variables);
    const mutableVar = vars.find((v) => v.name === 'mutable');
    const immutableVar = vars.find((v) => v.name === 'immutable');
    expect(mutableVar).toBeDefined();
    expect(mutableVar!.isMutable).toBe(true);
    expect(immutableVar).toBeDefined();
    expect(immutableVar!.isMutable).toBe(false);
  });

  it('return description mentions [[Scope]] when closures capture the frame', () => {
    const steps = run(`
      function outer() {
        const x = 10;
        return () => x;
      }
      const fn = outer();
    `);
    const closureReturnStep = findStep(steps, '[[Scope]]');
    expect(closureReturnStep).toBeDefined();
    expect(closureReturnStep!.description).toContain('[[Scope]]');
  });

  it('closure accessing nested outer variables works correctly', () => {
    const output = consoleOutput(`
      function makeAdder(x) {
        return function(y) {
          return x + y;
        };
      }
      const add5 = makeAdder(5);
      console.log(add5(3));
    `);
    expect(output).toContain('8');
  });

  it('closure with var reassignment works', () => {
    const output = consoleOutput(`
      function outer() {
        var n = 1;
        function inc() { n = n + 1; }
        inc();
        inc();
        console.log(n);
      }
      outer();
    `);
    expect(output).toContain('3');
  });

});

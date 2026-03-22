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
      s.callStack.some((f) => f.name === 'outer')
    );
    expect(outerStep).toBeDefined();
    const outerColor = outerStep!.callStack.find(
      (f) => f.name === 'outer'
    )!.color;

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

  // ── Loop closure trap ──────────────────────────────────────────────────────

  it('loop closure trap: var closures all share the same binding', () => {
    const output = consoleOutput(`
      const fns = [];
      for (var i = 0; i < 3; i++) {
        fns.push(function() { return i; });
      }
      console.log(fns[0]());
      console.log(fns[1]());
      console.log(fns[2]());
    `);
    // After the loop, i === 3 for all closures
    expect(output[0]).toContain('3');
    expect(output[1]).toContain('3');
    expect(output[2]).toContain('3');
  });

  it('loop closure trap: let closures capture a fresh binding per iteration', () => {
    const output = consoleOutput(`
      const fns = [];
      for (let j = 0; j < 3; j++) {
        fns.push(function() { return j; });
      }
      console.log(fns[0]());
      console.log(fns[1]());
      console.log(fns[2]());
    `);
    // Each closure captured its own j
    expect(output[0]).toContain('0');
    expect(output[1]).toContain('1');
    expect(output[2]).toContain('2');
  });

  it('loop closure trap: let closures each capture a distinct j value', () => {
    // Each call should return the j value at the time the closure was created,
    // not the final value of j after the loop (which would be 3 with var).
    const output = consoleOutput(`
      const fns = [];
      for (let j = 0; j < 3; j++) {
        fns.push(function() { return j; });
      }
      // Verify each closure captured a distinct snapshot
      const results = [];
      results.push(fns[0]());
      results.push(fns[1]());
      results.push(fns[2]());
      console.log(results[0] !== results[1]);
      console.log(results[1] !== results[2]);
    `);
    expect(output[0]).toContain('true');
    expect(output[1]).toContain('true');
  });

  // ── Memoization via closure ────────────────────────────────────────────────

  it('memoize: first call computes and caches the result', () => {
    const output = consoleOutput(`
      function memoize(fn) {
        const cache = {};
        return function(n) {
          if (cache[n] !== undefined) {
            return cache[n];
          }
          const result = fn(n);
          cache[n] = result;
          return result;
        };
      }
      function double(x) { return x * 2; }
      const memoDouble = memoize(double);
      console.log(memoDouble(6));
      console.log(memoDouble(6));
    `);
    expect(output[0]).toContain('12');
    expect(output[1]).toContain('12');
  });

  it('memoize: cache object lives in [[Scope]] of the returned function', () => {
    const step = lastStep(`
      function memoize(fn) {
        const cache = {};
        return function(n) {
          if (cache[n] !== undefined) return cache[n];
          const result = fn(n);
          cache[n] = result;
          return result;
        };
      }
      function square(x) { return x * x; }
      const memoSquare = memoize(square);
    `);
    const entry = getMemoryEntry(step, 'memoSquare');
    expect(entry).toBeDefined();
    const heapObj = getHeapObject(step, entry!.heapReferenceId!);
    expect(heapObj!.closureScope).toBeDefined();
    const capturedVars = heapObj!.closureScope!.flatMap((s) => s.variables);
    // 'cache' should be captured in [[Scope]]
    const cacheVar = capturedVars.find((v) => v.name === 'cache');
    expect(cacheVar).toBeDefined();
  });

  it('memoize: calling with different args returns independent results', () => {
    const output = consoleOutput(`
      function memoize(fn) {
        const cache = {};
        return function(n) {
          if (cache[n] !== undefined) return cache[n];
          const result = fn(n);
          cache[n] = result;
          return result;
        };
      }
      function square(x) { return x * x; }
      const memoSquare = memoize(square);
      console.log(memoSquare(3));
      console.log(memoSquare(4));
      console.log(memoSquare(3));
    `);
    expect(output[0]).toContain('9');
    expect(output[1]).toContain('16');
    expect(output[2]).toContain('9');
  });
});

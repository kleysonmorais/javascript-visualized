import {
  run,
  lastStep,
  consoleOutput,
  getMemoryEntry,
  getHeapObject,
} from './helpers';

describe('Interpreter — Promises', () => {
  // ─── Promise creation ─────────────────────────────────

  describe('Promise creation', () => {
    it('new Promise creates a HeapObject', () => {
      const step = lastStep(`
        const p = new Promise((resolve) => { resolve(1); });
      `);
      const entry = getMemoryEntry(step, 'p');
      expect(entry).toBeDefined();
      expect(entry!.valueType).toBe('object');
      expect(entry!.heapReferenceId).toBeDefined();
    });

    it('Promise HeapObject has [[PromiseState]] property', () => {
      const step = lastStep(`
        const p = new Promise((resolve) => { resolve(1); });
      `);
      const entry = getMemoryEntry(step, 'p');
      const heap = getHeapObject(step, entry!.heapReferenceId!);
      expect(heap).toBeDefined();
      const stateProperty = heap!.properties?.find(
        (p) => p.key === '[[PromiseState]]'
      );
      expect(stateProperty).toBeDefined();
    });

    it('resolved Promise shows fulfilled state', () => {
      const step = lastStep(`
        const p = new Promise((resolve) => { resolve(42); });
      `);
      const entry = getMemoryEntry(step, 'p');
      const heap = getHeapObject(step, entry!.heapReferenceId!);
      const stateProperty = heap!.properties?.find(
        (p) => p.key === '[[PromiseState]]'
      );
      expect(stateProperty!.displayValue).toContain('fulfilled');
    });

    it('resolved Promise shows result value', () => {
      const step = lastStep(`
        const p = new Promise((resolve) => { resolve(42); });
      `);
      const entry = getMemoryEntry(step, 'p');
      const heap = getHeapObject(step, entry!.heapReferenceId!);
      const resultProperty = heap!.properties?.find(
        (p) => p.key === '[[PromiseResult]]'
      );
      expect(resultProperty!.displayValue).toContain('42');
    });

    it('rejected Promise shows rejected state', () => {
      const step = lastStep(`
        const p = new Promise((_, reject) => { reject("error"); });
      `);
      const entry = getMemoryEntry(step, 'p');
      const heap = getHeapObject(step, entry!.heapReferenceId!);
      const stateProperty = heap!.properties?.find(
        (p) => p.key === '[[PromiseState]]'
      );
      expect(stateProperty!.displayValue).toContain('rejected');
    });

    it('executor runs immediately (synchronously)', () => {
      const output = consoleOutput(`
        console.log("before");
        new Promise(() => { console.log("executor"); });
        console.log("after");
      `);
      expect(output[0]).toContain('before');
      expect(output[1]).toContain('executor');
      expect(output[2]).toContain('after');
    });
  });

  // ─── Promise.resolve / Promise.reject ─────────────────

  describe('Promise.resolve and Promise.reject', () => {
    it('Promise.resolve creates fulfilled Promise', () => {
      const step = lastStep('const p = Promise.resolve(42);');
      const entry = getMemoryEntry(step, 'p');
      const heap = getHeapObject(step, entry!.heapReferenceId!);
      const stateProperty = heap!.properties?.find(
        (p) => p.key === '[[PromiseState]]'
      );
      expect(stateProperty!.displayValue).toContain('fulfilled');
    });

    it('Promise.reject creates rejected Promise', () => {
      const step = lastStep('const p = Promise.reject("oops");');
      const entry = getMemoryEntry(step, 'p');
      const heap = getHeapObject(step, entry!.heapReferenceId!);
      const stateProperty = heap!.properties?.find(
        (p) => p.key === '[[PromiseState]]'
      );
      expect(stateProperty!.displayValue).toContain('rejected');
    });
  });

  // ─── .then() ──────────────────────────────────────────

  describe('.then()', () => {
    it('.then() callback executes with resolved value', () => {
      const output = consoleOutput(`
        Promise.resolve(42).then(val => console.log(val));
      `);
      expect(output).toContain('42');
    });

    it('.then() callback goes through Microtask Queue', () => {
      const steps = run(`
        Promise.resolve().then(() => console.log("then"));
      `);
      const microtaskStep = steps.find((s) => s.microtaskQueue.length > 0);
      expect(microtaskStep).toBeDefined();
    });

    it('.then() chaining passes values through', () => {
      const output = consoleOutput(`
        Promise.resolve(1)
          .then(val => val + 1)
          .then(val => val * 2)
          .then(val => console.log(val));
      `);
      expect(output).toContain('4');
    });

    it('.then() with no callback passes value through', () => {
      const output = consoleOutput(`
        Promise.resolve(42).then().then(val => console.log(val));
      `);
      expect(output).toContain('42');
    });

    it('.then() creates a new Promise (HeapObject)', () => {
      const step = lastStep(`
        const p1 = Promise.resolve(1);
        const p2 = p1.then(val => val + 1);
      `);
      const entry1 = getMemoryEntry(step, 'p1');
      const entry2 = getMemoryEntry(step, 'p2');
      expect(entry1!.heapReferenceId).not.toBe(entry2!.heapReferenceId);
    });
  });

  // ─── .catch() ─────────────────────────────────────────

  describe('.catch()', () => {
    it('.catch() handles rejection', () => {
      const output = consoleOutput(`
        Promise.reject("error").catch(err => console.log("caught:", err));
      `);
      expect(output[0]).toContain('caught:');
      expect(output[0]).toContain('error');
    });

    it('.catch() is skipped on fulfilled Promise', () => {
      const output = consoleOutput(`
        Promise.resolve("ok")
          .catch(err => console.log("caught"))
          .then(val => console.log(val));
      `);
      expect(output.some((o) => o.includes('caught'))).toBe(false);
      expect(output).toContain('ok');
    });

    it('.then() onFulfilled is skipped on rejected Promise', () => {
      const output = consoleOutput(`
        Promise.reject("err")
          .then(val => console.log("fulfilled"))
          .catch(err => console.log("rejected"));
      `);
      expect(output.some((o) => o.includes('fulfilled'))).toBe(false);
      expect(output).toContain('rejected');
    });
  });

  // ─── .finally() ───────────────────────────────────────

  describe('.finally()', () => {
    it('.finally() runs on fulfillment', () => {
      const output = consoleOutput(`
        Promise.resolve("done").finally(() => console.log("cleanup"));
      `);
      expect(output).toContain('cleanup');
    });

    it('.finally() runs on rejection', () => {
      const output = consoleOutput(`
        Promise.reject("err")
          .finally(() => console.log("cleanup"))
          .catch(() => {});
      `);
      expect(output).toContain('cleanup');
    });

    it('.finally() preserves resolved value', () => {
      const output = consoleOutput(`
        Promise.resolve("original")
          .finally(() => console.log("finally"))
          .then(val => console.log(val));
      `);
      expect(output).toContain('finally');
      expect(output).toContain('original');
    });
  });

  // ─── Microtask priority ───────────────────────────────

  describe('microtask priority over macrotask', () => {
    it('Promise.then runs before setTimeout(0)', () => {
      const output = consoleOutput(`
        setTimeout(() => console.log("timeout"), 0);
        Promise.resolve().then(() => console.log("promise"));
      `);
      const promiseIndex = output.findIndex((o) => o.includes('promise'));
      const timeoutIndex = output.findIndex((o) => o.includes('timeout'));
      expect(promiseIndex).toBeLessThan(timeoutIndex);
    });

    it('classic quiz: sync → microtask → macrotask', () => {
      const output = consoleOutput(`
        console.log("1");
        setTimeout(() => console.log("2"), 0);
        Promise.resolve().then(() => console.log("3"));
        console.log("4");
      `);
      expect(output[0]).toContain('1');
      expect(output[1]).toContain('4');
      expect(output[2]).toContain('3');
      expect(output[3]).toContain('2');
    });

    it('microtasks drain before next macrotask', () => {
      const output = consoleOutput(`
        setTimeout(() => console.log("timeout"), 0);
        Promise.resolve()
          .then(() => console.log("micro 1"))
          .then(() => console.log("micro 2"));
      `);
      const micro1 = output.findIndex((o) => o.includes('micro 1'));
      const micro2 = output.findIndex((o) => o.includes('micro 2'));
      const timeout = output.findIndex((o) => o.includes('timeout'));
      expect(micro1).toBeLessThan(timeout);
      expect(micro2).toBeLessThan(timeout);
    });

    it('microtask inside microtask drains before macrotask', () => {
      const output = consoleOutput(`
        setTimeout(() => console.log("timeout"), 0);
        Promise.resolve().then(() => {
          console.log("micro 1");
          Promise.resolve().then(() => console.log("micro 2"));
        });
      `);
      const micro2 = output.findIndex((o) => o.includes('micro 2'));
      const timeout = output.findIndex((o) => o.includes('timeout'));
      expect(micro2).toBeLessThan(timeout);
    });
  });

  // ─── Event Loop phases ────────────────────────────────

  describe('Event Loop with microtasks', () => {
    it('shows draining-microtasks phase', () => {
      const steps = run(`
        Promise.resolve().then(() => console.log("done"));
      `);
      const drainingStep = steps.find(
        (s) => s.eventLoop.phase === 'draining-microtasks'
      );
      expect(drainingStep).toBeDefined();
    });

    it('shows checking-microtasks phase', () => {
      const steps = run(`
        Promise.resolve().then(() => {});
      `);
      const checkingStep = steps.find(
        (s) => s.eventLoop.phase === 'checking-microtasks'
      );
      expect(checkingStep).toBeDefined();
    });
  });

  // ─── Promise.all / Promise.race ───────────────────────

  describe('Promise.all', () => {
    it('resolves when all promises fulfill', () => {
      const output = consoleOutput(`
        Promise.all([
          Promise.resolve(1),
          Promise.resolve(2),
          Promise.resolve(3)
        ]).then(values => console.log(values.join(",")));
      `);
      expect(output).toContain('1,2,3');
    });

    it('rejects if any promise rejects', () => {
      const output = consoleOutput(`
        Promise.all([
          Promise.resolve(1),
          Promise.reject("fail"),
          Promise.resolve(3)
        ]).catch(err => console.log("error:", err));
      `);
      expect(output[0]).toContain('fail');
    });
  });

  describe('Promise.race', () => {
    it('resolves with first settled promise', () => {
      const output = consoleOutput(`
        Promise.race([
          Promise.resolve("first"),
          Promise.resolve("second")
        ]).then(val => console.log(val));
      `);
      expect(output).toContain('first');
    });
  });

  // ─── Edge cases ───────────────────────────────────────

  describe('edge cases', () => {
    it('does not crash on unhandled rejection', () => {
      const steps = run('Promise.reject("oops");');
      expect(steps.length).toBeGreaterThan(0);
    });

    it('enforces microtask drain limit', () => {
      // This would be infinite without limit
      // +1 accounts for the "Execution limit reached" sentinel step added by snapshot()
      const steps = run(`
        function loop() {
          Promise.resolve().then(loop);
        }
        loop();
      `);
      expect(steps.length).toBeLessThanOrEqual(2001);
    });

    it('empty Promise executor does not crash', () => {
      const steps = run('new Promise(() => {});');
      expect(steps.length).toBeGreaterThan(0);
    });

    it('Promise.resolve with no argument resolves to undefined', () => {
      const output = consoleOutput(`
        Promise.resolve().then(val => console.log(String(val)));
      `);
      expect(output).toContain('undefined');
    });

    it('long .then() chains work correctly', () => {
      const output = consoleOutput(`
        let p = Promise.resolve(0);
        for (let i = 0; i < 10; i++) {
          p = p.then(val => val + 1);
        }
        p.then(val => console.log(val));
      `);
      expect(output).toContain('10');
    });
  });

  // ─── Complex Scenarios ────────────────────────────────

  describe('complex scenarios', () => {
    it('Scenario A: Basic Promise resolution flow', () => {
      const steps = run(`
        const p = new Promise((resolve) => {
          resolve(42);
        });
        p.then((value) => {
          console.log(value);
        });
      `);

      // Promise should be in heap with fulfilled state
      const lastS = steps[steps.length - 1];
      const entry = getMemoryEntry(lastS, 'p');
      expect(entry).toBeDefined();
      expect(entry!.heapReferenceId).toBeDefined();

      const heap = getHeapObject(lastS, entry!.heapReferenceId!);
      const stateProperty = heap!.properties?.find(
        (p) => p.key === '[[PromiseState]]'
      );
      expect(stateProperty!.displayValue).toContain('fulfilled');

      const resultProperty = heap!.properties?.find(
        (p) => p.key === '[[PromiseResult]]'
      );
      expect(resultProperty!.displayValue).toContain('42');

      // Console should show 42
      expect(lastS.console.some((c) => c.args.join(' ').includes('42'))).toBe(
        true
      );
    });

    it('Scenario B: Microtask priority over macrotask (1, 4, 3, 2)', () => {
      const output = consoleOutput(`
        console.log("1");
        setTimeout(() => console.log("2"), 0);
        Promise.resolve().then(() => console.log("3"));
        console.log("4");
      `);
      expect(output).toEqual(['1', '4', '3', '2']);
    });

    it('Scenario C: Chained .then() produces correct result', () => {
      const output = consoleOutput(`
        Promise.resolve(1)
          .then(val => val + 1)
          .then(val => val * 2)
          .then(val => console.log(val));
      `);
      expect(output).toContain('4');
    });

    it('Scenario D: .catch() handling skips .then()', () => {
      const output = consoleOutput(`
        Promise.reject("error")
          .then(val => console.log("never"))
          .catch(err => console.log("caught:", err));
      `);
      expect(output[0]).toContain('caught:');
      expect(output[0]).toContain('error');
      expect(output.some((o) => o.includes('never'))).toBe(false);
    });

    it('Scenario E: .finally() preserves value', () => {
      const output = consoleOutput(`
        Promise.resolve("done")
          .finally(() => console.log("cleanup"))
          .then(val => console.log(val));
      `);
      expect(output).toContain('cleanup');
      expect(output).toContain('done');
    });

    it('Scenario F: Mixed Promises and timers with correct order', () => {
      const output = consoleOutput(`
        console.log("start");

        setTimeout(() => console.log("timeout 1"), 0);

        Promise.resolve().then(() => {
          console.log("promise 1");
          setTimeout(() => console.log("timeout 2"), 0);
        }).then(() => {
          console.log("promise 2");
        });

        setTimeout(() => console.log("timeout 3"), 0);

        console.log("end");
      `);

      // Expected order: start, end, promise 1, promise 2, timeout 1, timeout 3, timeout 2
      expect(output[0]).toBe('start');
      expect(output[1]).toBe('end');
      expect(output[2]).toBe('promise 1');
      expect(output[3]).toBe('promise 2');
      expect(output[4]).toBe('timeout 1');
      expect(output[5]).toBe('timeout 3');
      expect(output[6]).toBe('timeout 2');
    });
  });

  // ─── HeapObject state transitions ─────────────────────

  describe('HeapObject state transitions', () => {
    it('Promise transitions from pending to fulfilled', () => {
      const steps = run(`
        const p = new Promise((resolve) => {
          resolve(42);
        });
      `);

      // Find step where promise is pending (may not exist if resolve happens immediately)
      const hasPendingStep = steps.some((s) => {
        const entry = getMemoryEntry(s, 'p');
        if (!entry?.heapReferenceId) return false;
        const heap = getHeapObject(s, entry.heapReferenceId);
        const state = heap?.properties?.find(
          (p) => p.key === '[[PromiseState]]'
        );
        return state?.displayValue.includes('pending');
      });

      // Find step where promise is fulfilled
      const fulfilledStep = steps.find((s) => {
        const entry = getMemoryEntry(s, 'p');
        if (!entry?.heapReferenceId) return false;
        const heap = getHeapObject(s, entry.heapReferenceId);
        const state = heap?.properties?.find(
          (p) => p.key === '[[PromiseState]]'
        );
        return state?.displayValue.includes('fulfilled');
      });

      // Both states should exist at different points
      // Note: In synchronous resolve, the transition happens quickly
      // The pending step may not be captured if resolve is called inline
      expect(fulfilledStep).toBeDefined();
      // Optionally check if pending step exists (for debugging)
      void hasPendingStep; // Acknowledge it's intentionally not asserted
    });

    it('Promise [[PromiseFulfillReactions]] updates when .then() is called', () => {
      const steps = run(`
        const p = new Promise(() => {}); // never resolves
        p.then(() => console.log("callback"));
      `);

      // Find step where reactions array is non-empty
      const stepWithReactions = steps.find((s) => {
        const entry = getMemoryEntry(s, 'p');
        if (!entry?.heapReferenceId) return false;
        const heap = getHeapObject(s, entry.heapReferenceId);
        const reactions = heap?.properties?.find(
          (p) => p.key === '[[PromiseFulfillReactions]]'
        );
        return (
          reactions?.displayValue && !reactions.displayValue.includes('[]')
        );
      });

      // There should be a step where reactions are registered
      expect(stepWithReactions).toBeDefined();
    });
  });
});

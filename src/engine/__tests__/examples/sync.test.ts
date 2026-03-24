import { describe, it, expect } from 'vitest';
import {
  run,
  lastStep,
  consoleOutput,
  getMemoryEntry,
  getHeapObject,
  findStepWithFrame,
  frameNames,
} from '../helpers';
import { SYNC_EXAMPLES } from '@/constants/examples';
import stepDescriptions from '@/utils/stepDescriptions';

describe('Sync Examples', () => {
  describe('all sync examples execute successfully', () => {
    SYNC_EXAMPLES.forEach((example) => {
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

  describe('variables-memory example', () => {
    const example = SYNC_EXAMPLES.find((e) => e.id === 'variables-memory')!;

    it('stores primitive string in memory', () => {
      const step = lastStep(example.code);
      const entry = getMemoryEntry(step, 'myName');
      expect(entry).toBeDefined();
      expect(entry!.displayValue).toContain('Joe');
    });

    it('stores primitive number in memory', () => {
      const step = lastStep(example.code);
      const entry = getMemoryEntry(step, 'age');
      expect(entry).toBeDefined();
      expect(entry!.displayValue).toContain('23');
    });

    it('stores object in heap with reference', () => {
      const step = lastStep(example.code);
      const entry = getMemoryEntry(step, 'person');
      expect(entry).toBeDefined();
      expect(entry!.valueType).toBe('object');
      expect(entry!.heapReferenceId).toBeDefined();
    });

    it('person2 references the same heap object as person', () => {
      const step = lastStep(example.code);
      const person = getMemoryEntry(step, 'person');
      const person2 = getMemoryEntry(step, 'person2');
      expect(person!.heapReferenceId).toBe(person2!.heapReferenceId);
    });

    it('stores function in heap', () => {
      const step = lastStep(example.code);
      const entry = getMemoryEntry(step, 'greet');
      expect(entry).toBeDefined();
      expect(entry!.valueType).toBe('function');
      expect(entry!.heapReferenceId).toBeDefined();
    });

    it('outputs the greeting message', () => {
      const output = consoleOutput(example.code);
      expect(output).toContain('Hello Joe');
    });

    it('message variable contains returned value', () => {
      const step = lastStep(example.code);
      const entry = getMemoryEntry(step, 'message');
      expect(entry).toBeDefined();
      expect(entry!.displayValue).toContain('Hello Joe');
    });

    it('description execution complete', () => {
      const step = lastStep(example.code);
      expect(step.description).toBe(stepDescriptions.executionComplete());
    });
  });

  // ─── Reference vs Value ───────────────────────────────

  describe('reference-vs-value example', () => {
    const example = SYNC_EXAMPLES.find((e) => e.id === 'reference-vs-value')!;

    it('original and copy share the same heap reference', () => {
      const step = lastStep(example.code);
      const original = getMemoryEntry(step, 'original');
      const copy = getMemoryEntry(step, 'copy');
      expect(original!.heapReferenceId).toBe(copy!.heapReferenceId);
    });

    it('modifying copy changes original (same reference)', () => {
      const output = consoleOutput(example.code);
      expect(output[0]).toContain('99');
      expect(output[1]).toContain('99');
    });

    it('original === copy evaluates to true', () => {
      const output = consoleOutput(example.code);
      expect(output[2]).toContain('true');
    });

    it('heap object has both x and y properties', () => {
      const step = lastStep(example.code);
      const entry = getMemoryEntry(step, 'original');
      const heap = getHeapObject(step, entry!.heapReferenceId!);
      expect(heap).toBeDefined();
      const xProp = heap!.properties?.find((p) => p.key === 'x');
      const yProp = heap!.properties?.find((p) => p.key === 'y');
      expect(xProp).toBeDefined();
      expect(xProp!.displayValue).toContain('99');
      expect(yProp).toBeDefined();
    });
  });

  // ─── Function Calls & Scope ───────────────────────────

  describe('function-scope example', () => {
    const example = SYNC_EXAMPLES.find((e) => e.id === 'function-scope')!;

    it('creates multiply frame on call stack', () => {
      const steps = run(example.code);
      const multiplyFrame = findStepWithFrame(steps, 'multiply');
      expect(multiplyFrame).toBeDefined();
    });

    it('creates square frame on call stack', () => {
      const steps = run(example.code);
      const squareFrame = findStepWithFrame(steps, 'square');
      expect(squareFrame).toBeDefined();
    });

    it('nested call shows both frames on stack (multiply on top of square)', () => {
      const steps = run(example.code);
      const nestedStep = steps.find((s) => {
        const names = frameNames(s);
        const multiplyIndex = names.indexOf('multiply');
        const squareIndex = names.indexOf('square');
        return (
          multiplyIndex !== -1 &&
          squareIndex !== -1 &&
          multiplyIndex < squareIndex
        );
      });
      expect(nestedStep).toBeDefined();
    });

    it('outputs 25 (5 squared)', () => {
      const output = consoleOutput(example.code);
      expect(output).toContain('25');
    });

    it('answer variable contains 25', () => {
      const step = lastStep(example.code);
      const entry = getMemoryEntry(step, 'answer');
      expect(entry).toBeDefined();
      expect(entry!.displayValue).toContain('25');
    });

    it('local memory (result) is created inside multiply', () => {
      const steps = run(example.code);
      const multiplyStep = findStepWithFrame(steps, 'multiply');
      if (multiplyStep) {
        const localBlock = multiplyStep.memoryBlocks.find((b) =>
          b.label.toLowerCase().includes('multiply')
        );
        expect(localBlock || multiplyStep.memoryBlocks.length > 1).toBeTruthy();
      }
    });
  });

  // ─── Deep Call Stack ──────────────────────────────────

  describe('deep-call-stack example', () => {
    const example = SYNC_EXAMPLES.find((e) => e.id === 'deep-call-stack')!;

    it('all 10 functions are stored in global memory', () => {
      const step = lastStep(example.code);
      const names = [
        'first',
        'second',
        'third',
        'fourth',
        'fifth',
        'sixth',
        'seventh',
        'eighth',
        'ninth',
        'tenth',
      ];
      for (const name of names) {
        const entry = getMemoryEntry(step, name);
        expect(entry, `${name} should be in memory`).toBeDefined();
        expect(entry!.valueType).toBe('function');
      }
    });

    it('all 10 function heap objects are created', () => {
      const step = lastStep(example.code);
      const names = [
        'first',
        'second',
        'third',
        'fourth',
        'fifth',
        'sixth',
        'seventh',
        'eighth',
        'ninth',
        'tenth',
      ];
      for (const name of names) {
        const entry = getMemoryEntry(step, name);
        expect(entry!.heapReferenceId).toBeDefined();
        const heap = getHeapObject(step, entry!.heapReferenceId!);
        expect(heap, `${name} heap object should exist`).toBeDefined();
      }
    });

    it('call stack reaches depth of 11 (10 functions + global)', () => {
      const steps = run(example.code);
      const maxDepth = Math.max(...steps.map((s) => s.callStack.length));
      expect(maxDepth).toBe(11);
    });

    it('all function frames appear on the call stack at peak depth', () => {
      const steps = run(example.code);
      const peakStep = steps.reduce((max, s) =>
        s.callStack.length > max.callStack.length ? s : max
      );
      const names = frameNames(peakStep);
      expect(names).toContain('first');
      expect(names).toContain('tenth');
    });

    it('frames are ordered correctly at peak (tenth on top, first below)', () => {
      const steps = run(example.code);
      const peakStep = steps.reduce((max, s) =>
        s.callStack.length > max.callStack.length ? s : max
      );
      const names = frameNames(peakStep);
      // frameNames returns top-to-bottom (top of stack first)
      expect(names.indexOf('tenth')).toBeLessThan(names.indexOf('ninth'));
      expect(names.indexOf('ninth')).toBeLessThan(names.indexOf('eighth'));
      expect(names.indexOf('second')).toBeLessThan(names.indexOf('first'));
    });

    it('call stack is empty at the last step', () => {
      const step = lastStep(example.code);
      // Only global frame may remain, or it's fully cleared
      const nonGlobal = step.callStack.filter((f) => f.name !== '<global>');
      expect(nonGlobal.length).toBe(0);
    });

    it('produces no console output', () => {
      const output = consoleOutput(example.code);
      expect(output.length).toBe(0);
    });

    it('total steps', () => {
      const steps = run(example.code);
      expect(steps.length).toBe(32);
    });

    it('last step description is execution complete', () => {
      const step = lastStep(example.code);
      expect(step.description).toBe(stepDescriptions.executionComplete());
    });
  });
});

import { generateSteps } from '@/engine';
import type { ExecutionStep, HeapObject } from '@/types';

/**
 * Generate steps from source code. Wrapper around generateSteps for test convenience.
 * Throws an error if the code fails to execute.
 */
export function run(code: string): ExecutionStep[] {
  const result = generateSteps(code);
  if (!result.success) {
    throw new Error(`Execution failed: ${result.error.message}`);
  }
  return result.steps;
}

/**
 * Get the last step from an execution.
 */
export function lastStep(code: string): ExecutionStep {
  const steps = run(code);
  return steps[steps.length - 1];
}

/**
 * Get all console output values across all steps.
 * Returns the final console state (from the last step).
 */
export function consoleOutput(code: string): string[] {
  const step = lastStep(code);
  return step.console.map((entry) => entry.args.join(' '));
}

/**
 * Find a step by its description (partial match).
 */
export function findStep(
  steps: ExecutionStep[],
  descriptionFragment: string
): ExecutionStep | undefined {
  return steps.find((s) =>
    s.description.toLowerCase().includes(descriptionFragment.toLowerCase())
  );
}

/**
 * Find a step where a specific function is on top of the call stack.
 */
export function findStepWithFrame(
  steps: ExecutionStep[],
  frameName: string
): ExecutionStep | undefined {
  return steps.find(
    (s) =>
      s.callStack.length > 0 &&
      s.callStack[s.callStack.length - 1].name === frameName
  );
}

/**
 * Get all memory entry names from a specific memory block in a step.
 */
export function getMemoryEntryNames(
  step: ExecutionStep,
  blockLabel: string
): string[] {
  const block = step.memoryBlocks.find((b) => b.label.includes(blockLabel));
  return block ? block.entries.map((e) => e.name) : [];
}

/**
 * Get a memory entry by variable name from any block in a step.
 */
export function getMemoryEntry(step: ExecutionStep, varName: string) {
  for (const block of step.memoryBlocks) {
    const entry = block.entries.find((e) => e.name === varName);
    if (entry) return entry;
  }
  return undefined;
}

/**
 * Get a heap object by ID from a step.
 */
export function getHeapObject(
  step: ExecutionStep,
  heapId: string
): HeapObject | undefined {
  return step.heap.find((h) => h.id === heapId);
}

/**
 * Get call stack frame names from a step (top to bottom).
 */
export function frameNames(step: ExecutionStep): string[] {
  return [...step.callStack].reverse().map((f) => f.name);
}

/**
 * Count total steps generated from code.
 */
export function stepCount(code: string): number {
  return run(code).length;
}

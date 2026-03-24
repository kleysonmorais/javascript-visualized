import { parseCode } from './parser';
import { Interpreter } from './interpreter';
import type { ExecutionStep } from '@/types';

export interface ExecutionResult {
  success: true;
  steps: ExecutionStep[];
}

export interface ExecutionError {
  success: false;
  error: {
    message: string;
    line?: number;
    column?: number;
  };
}

export type GenerateStepsResult = ExecutionResult | ExecutionError;

/**
 * Parse and execute JavaScript code, generating an array of execution steps
 * for visualization.
 *
 * @param code The JavaScript source code to execute
 * @returns Either a success result with steps, or an error result with details
 */
export function generateSteps(code: string): GenerateStepsResult {
  try {
    const { ast, sourceType } = parseCode(code);
    const interpreter = new Interpreter();
    const steps = interpreter.execute(ast, code, sourceType);

    return {
      success: true,
      steps,
    };
  } catch (error) {
    // Handle parse errors
    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      'line' in error &&
      'column' in error
    ) {
      return {
        success: false,
        error: {
          message: (error as { message: string }).message,
          line: (error as { line: number }).line,
          column: (error as { column: number }).column,
        },
      };
    }

    // Handle other errors
    return {
      success: false,
      error: {
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
      },
    };
  }
}

// Re-export types and utilities
export { parseCode } from './parser';
export type { SourceType } from './parser';
export { Interpreter } from './interpreter';
export type { ParseError } from './parser';

import type { ExecutionStep } from '@/types';

export type ChallengeLevel = 'basic' | 'intermediate' | 'advanced' | 'expert';

export type RuntimeConcept =
  | 'call-stack'
  | 'global-memory'
  | 'local-memory'
  | 'heap'
  | 'web-apis'
  | 'task-queue'
  | 'microtask-queue'
  | 'event-loop'
  | 'console'
  | 'closures'
  | 'promises'
  | 'async-await'
  | 'generators';

export interface ChallengeResult {
  passed: boolean;
  feedback: string;
  details?: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  level: ChallengeLevel;
  concepts: RuntimeConcept[];
  hint: string;
  starterCode: string;
  solutionCode: string;
  solutionExplanation: string;
  validate: (steps: ExecutionStep[]) => ChallengeResult;
}

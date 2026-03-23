import type { ExecutionStep } from '@/types';

export type ChallengeLevel = 'easy' | 'medium' | 'hard' | 'expert';

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
  titlePtBr?: string;
  description: string;
  descriptionPtBr?: string;
  level: ChallengeLevel;
  concepts: RuntimeConcept[];
  hint: string;
  hintPtBr?: string;
  starterCode: string;
  starterCodePtBr?: string;
  solutionCode: string;
  solutionCodePtBr?: string;
  solutionExplanation: string;
  solutionExplanationPtBr?: string;
  validate: (steps: ExecutionStep[], lang: 'en' | 'pt-BR') => ChallengeResult;
}

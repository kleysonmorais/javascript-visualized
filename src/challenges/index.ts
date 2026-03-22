import type { Challenge } from './types';
import { basicChallenges } from './basic';
import { intermediateChallenges } from './intermediate';
import { advancedChallenges } from './advanced';
import { expertChallenges } from './expert';

export const ALL_CHALLENGES: Challenge[] = [
  ...basicChallenges,
  ...intermediateChallenges,
  ...advancedChallenges,
  ...expertChallenges,
];

export function getChallengeById(id: string): Challenge | undefined {
  return ALL_CHALLENGES.find((c) => c.id === id);
}

export function getChallengesByLevel(level: Challenge['level']): Challenge[] {
  return ALL_CHALLENGES.filter((c) => c.level === level);
}

export {
  type Challenge,
  type ChallengeResult,
  type ChallengeLevel,
  type RuntimeConcept,
} from './types';

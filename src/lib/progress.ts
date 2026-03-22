interface ChallengeProgress {
  completed: boolean;
  attempts: number;
  lastAttemptDate?: string;
}

const STORAGE_KEY = 'js-viz-challenges';

function getAll(): Record<string, ChallengeProgress> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(data: Record<string, ChallengeProgress>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore errors (private browsing, storage full, etc.)
  }
}

export function getProgress(challengeId: string): ChallengeProgress {
  const all = getAll();
  return all[challengeId] || { completed: false, attempts: 0 };
}

export function markAttempt(challengeId: string): void {
  const all = getAll();
  const current = all[challengeId] || { completed: false, attempts: 0 };
  current.attempts++;
  current.lastAttemptDate = new Date().toISOString();
  all[challengeId] = current;
  save(all);
}

export function markCompleted(challengeId: string): void {
  const all = getAll();
  const current = all[challengeId] || { completed: false, attempts: 0 };
  current.completed = true;
  all[challengeId] = current;
  save(all);
}

export function isCompleted(challengeId: string): boolean {
  return getProgress(challengeId).completed;
}

export function getAttempts(challengeId: string): number {
  return getProgress(challengeId).attempts;
}

export function getCompletedCount(): number {
  const all = getAll();
  return Object.values(all).filter((p) => p.completed).length;
}

export function resetProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}

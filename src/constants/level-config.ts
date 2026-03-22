import type { ChallengeLevel } from "@/challenges";

export const LEVEL_CONFIG: Record<
  ChallengeLevel,
  { label: string; color: string }
> = {
  easy: { label: "Easy", color: "#22c55e" },
  medium: { label: "Medium", color: "#F7DF1F" },
  hard: { label: "Hard", color: "#f59e0b" },
  expert: { label: "Expert", color: "#ef4444" },
};

export const LEVELS: ChallengeLevel[] = ["easy", "medium", "hard", "expert"];

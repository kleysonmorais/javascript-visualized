import { create } from 'zustand';
import type { ExecutionStep, PlaybackSpeed } from '@/types';
import { mockSteps } from '@/lib/mockSteps';

const DEFAULT_SOURCE_CODE = `setTimeout(() => {
  console.log("2000ms");
}, 2000);

setTimeout(() => {
  console.log("100ms");
}, 100);

console.log("End of script");`;

interface VisualizerStore {
  // Source code
  sourceCode: string;
  setSourceCode: (code: string) => void;

  // Execution steps
  steps: ExecutionStep[];
  setSteps: (steps: ExecutionStep[]) => void;

  // Navigation
  currentStepIndex: number;
  goToStep: (index: number) => void;
  goNext: () => void;
  goBack: () => void;
  goToStart: () => void;
  goToEnd: () => void;

  // Playback
  isPlaying: boolean;
  speed: PlaybackSpeed;
  setIsPlaying: (playing: boolean) => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  togglePlayback: () => void;

  // Derived state
  currentStep: ExecutionStep | null;
  totalSteps: number;
  hasNext: boolean;
  hasPrevious: boolean;

  // Mock data
  loadMockData: () => void;

  // Reset
  reset: () => void;
}

export const useVisualizerStore = create<VisualizerStore>((set, get) => ({
  sourceCode: DEFAULT_SOURCE_CODE,
  setSourceCode: (code) => set({ sourceCode: code }),

  steps: [],
  setSteps: (steps) =>
    set((state) => ({
      steps,
      currentStep: steps[state.currentStepIndex] ?? null,
      totalSteps: steps.length,
      hasNext: state.currentStepIndex < steps.length - 1,
      hasPrevious: state.currentStepIndex > 0,
    })),

  currentStepIndex: 0,
  goToStep: (index) =>
    set((state) => {
      const clamped = Math.max(0, Math.min(index, state.steps.length - 1));
      return {
        currentStepIndex: clamped,
        currentStep: state.steps[clamped] ?? null,
        hasNext: clamped < state.steps.length - 1,
        hasPrevious: clamped > 0,
      };
    }),
  goNext: () => {
    const { currentStepIndex, steps } = get();
    if (currentStepIndex < steps.length - 1) {
      const next = currentStepIndex + 1;
      set({
        currentStepIndex: next,
        currentStep: steps[next] ?? null,
        hasNext: next < steps.length - 1,
        hasPrevious: next > 0,
      });
    }
  },
  goBack: () => {
    const { currentStepIndex, steps } = get();
    if (currentStepIndex > 0) {
      const prev = currentStepIndex - 1;
      set({
        currentStepIndex: prev,
        currentStep: steps[prev] ?? null,
        hasNext: prev < steps.length - 1,
        hasPrevious: prev > 0,
      });
    }
  },
  goToStart: () =>
    set((state) => ({
      currentStepIndex: 0,
      currentStep: state.steps[0] ?? null,
      hasNext: state.steps.length > 1,
      hasPrevious: false,
    })),
  goToEnd: () =>
    set((state) => {
      const last = state.steps.length - 1;
      return {
        currentStepIndex: Math.max(0, last),
        currentStep: state.steps[last] ?? null,
        hasNext: false,
        hasPrevious: last > 0,
      };
    }),

  isPlaying: false,
  speed: 1,
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setSpeed: (speed) => set({ speed }),
  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),

  // Initial derived state (computed from empty steps)
  currentStep: null,
  totalSteps: 0,
  hasNext: false,
  hasPrevious: false,

  loadMockData: () =>
    set({
      steps: mockSteps,
      currentStepIndex: 0,
      currentStep: mockSteps[0] ?? null,
      totalSteps: mockSteps.length,
      hasNext: mockSteps.length > 1,
      hasPrevious: false,
    }),

  reset: () =>
    set({
      steps: [],
      currentStepIndex: 0,
      currentStep: null,
      totalSteps: 0,
      hasNext: false,
      hasPrevious: false,
      isPlaying: false,
    }),
}));

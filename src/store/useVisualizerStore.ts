import { create } from "zustand";
import type { ExecutionStep, PlaybackSpeed } from "@/types";
import { generateSteps } from "@/engine";
import { mockSteps } from "@/lib/mockSteps";

const DEFAULT_SOURCE_CODE = `function multiply(a, b) {
  const result = a * b;
  return result;
}

const x = 10;
const greeting = "Hello";
const answer = multiply(3, 4);
console.log(answer);`;

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

  // Engine
  isRunning: boolean;
  error: string | null;
  errorLine: number | null;
  runCode: () => void;
  clearError: () => void;
  resetToEdit: () => void;

  // Hover state (for memory interactions)
  hoveredFrameId: string | null;
  hoveredHeapId: string | null;
  hoveredPointerId: string | null;
  setHoveredFrameId: (id: string | null) => void;
  setHoveredHeapId: (id: string | null) => void;
  setHoveredPointerId: (id: string | null) => void;

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

  // Engine state
  isRunning: false,
  error: null,
  errorLine: null,
  runCode: () => {
    const { sourceCode } = get();
    set({ isRunning: true, error: null, errorLine: null });

    try {
      const result = generateSteps(sourceCode);

      if (result.success) {
        set({
          steps: result.steps,
          currentStepIndex: 0,
          currentStep: result.steps[0] ?? null,
          totalSteps: result.steps.length,
          hasNext: result.steps.length > 1,
          hasPrevious: false,
          isRunning: false,
          isPlaying: false,
        });
      } else {
        const errorMsg = result.error.line
          ? `Line ${result.error.line}: ${result.error.message}`
          : result.error.message;
        set({
          error: errorMsg,
          errorLine: result.error.line ?? null,
          steps: [],
          currentStepIndex: 0,
          currentStep: null,
          totalSteps: 0,
          hasNext: false,
          hasPrevious: false,
          isRunning: false,
          isPlaying: false,
        });
      }
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : "An unexpected error occurred",
        errorLine: null,
        steps: [],
        currentStepIndex: 0,
        currentStep: null,
        totalSteps: 0,
        hasNext: false,
        hasPrevious: false,
        isRunning: false,
        isPlaying: false,
      });
    }
  },
  clearError: () => set({ error: null, errorLine: null }),
  resetToEdit: () =>
    set({
      steps: [],
      currentStepIndex: 0,
      currentStep: null,
      totalSteps: 0,
      hasNext: false,
      hasPrevious: false,
      isPlaying: false,
      error: null,
      errorLine: null,
    }),

  // Hover state
  hoveredFrameId: null,
  hoveredHeapId: null,
  hoveredPointerId: null,
  setHoveredFrameId: (id) => set({ hoveredFrameId: id }),
  setHoveredHeapId: (id) => set({ hoveredHeapId: id }),
  setHoveredPointerId: (id) => set({ hoveredPointerId: id }),

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
      error: null,
      errorLine: null,
      hoveredFrameId: null,
      hoveredHeapId: null,
      hoveredPointerId: null,
    }),
}));

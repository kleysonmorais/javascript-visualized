import { useReducedMotion } from 'framer-motion';
import type { Transition } from 'framer-motion';

/**
 * Animation durations in seconds.
 * When reduced motion is preferred, all durations become 0.
 */
interface AnimationDurations {
  /** Fast animations (100-150ms) - button presses, number changes */
  fast: number;
  /** Normal animations (200-250ms) - most enter/exit, hover effects */
  normal: number;
  /** Medium animations (300ms) - card enter/exit, state changes */
  medium: number;
  /** Slow animations (400ms) - stack operations, complex transitions */
  slow: number;
  /** Value highlight flash (600ms) - memory value change highlight */
  highlight: number;
}

type EasingType =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'circIn'
  | 'circOut'
  | 'circInOut'
  | 'backIn'
  | 'backOut'
  | 'backInOut'
  | 'anticipate';

interface AnimationConfig {
  /** Whether animations should be disabled for reduced motion preference */
  shouldReduceMotion: boolean;
  /** Animation durations (all 0 when reduced motion is preferred) */
  duration: AnimationDurations;
  /** Get transition config for a given duration type */
  getTransition: (
    type: keyof AnimationDurations,
    options?: { ease?: EasingType }
  ) => Transition;
  /** Get spring transition config (respects reduced motion) */
  getSpringTransition: (options?: {
    stiffness?: number;
    damping?: number;
  }) => Transition;
}

const BASE_DURATIONS: AnimationDurations = {
  fast: 0.15,
  normal: 0.25,
  medium: 0.3,
  slow: 0.4,
  highlight: 0.6,
};

const ZERO_DURATIONS: AnimationDurations = {
  fast: 0,
  normal: 0,
  medium: 0,
  slow: 0,
  highlight: 0,
};

/**
 * Hook to get animation configuration that respects reduced motion preferences.
 * Returns consistent animation timings and helper functions.
 */
export function useAnimationConfig(): AnimationConfig {
  const shouldReduceMotion = useReducedMotion() ?? false;

  const duration = shouldReduceMotion ? ZERO_DURATIONS : BASE_DURATIONS;

  const getTransition = (
    type: keyof AnimationDurations,
    options?: { ease?: EasingType }
  ): Transition => {
    if (shouldReduceMotion) {
      return { duration: 0 };
    }
    return {
      duration: duration[type],
      ease: options?.ease ?? 'easeOut',
    };
  };

  const getSpringTransition = (options?: {
    stiffness?: number;
    damping?: number;
  }): Transition => {
    if (shouldReduceMotion) {
      return { type: 'tween', duration: 0 };
    }
    return {
      type: 'spring',
      stiffness: options?.stiffness ?? 300,
      damping: options?.damping ?? 25,
    };
  };

  return {
    shouldReduceMotion,
    duration,
    getTransition,
    getSpringTransition,
  };
}

import { useEffect, useRef } from 'react';
import { useVisualizerStore } from '@/store/useVisualizerStore';

export function useAutoPlay() {
  const isPlaying = useVisualizerStore((s) => s.isPlaying);
  const speed = useVisualizerStore((s) => s.speed);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!isPlaying) return;

    const delay = 1000 / speed;
    intervalRef.current = setInterval(() => {
      const store = useVisualizerStore.getState();
      if (!store.hasNext) {
        store.setIsPlaying(false);
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }
      store.goNext();
    }, delay);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, speed]);
}

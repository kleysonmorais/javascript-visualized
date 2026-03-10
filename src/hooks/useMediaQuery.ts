import { useSyncExternalStore } from "react";

/**
 * Hook that tracks whether a CSS media query matches
 * Uses useSyncExternalStore for proper SSR support and avoiding cascading renders
 * @param query - CSS media query string, e.g. "(max-width: 1023px)"
 * @returns boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  // Subscribe function for useSyncExternalStore
  const subscribe = (callback: () => void) => {
    const mediaQueryList = window.matchMedia(query);
    mediaQueryList.addEventListener("change", callback);
    return () => mediaQueryList.removeEventListener("change", callback);
  };

  // Snapshot function that returns current value
  const getSnapshot = () => {
    return window.matchMedia(query).matches;
  };

  // Server snapshot - default to false for SSR
  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Convenience hook for mobile breakpoint (<1024px)
 */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 1023px)");
}

/**
 * Convenience hook for small mobile (<768px)
 */
export function useIsSmallMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}

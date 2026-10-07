import { useCallback, useSyncExternalStore } from 'react';

export const MOBILE = '(max-width: 719.98px)';
export const WIDE = '(min-width: 1100px)';

export function useMedia(query: string): boolean {
  const subscribe = useCallback((cb: () => void) => {
    const m = matchMedia(query);
    m.addEventListener('change', cb);
    return () => m.removeEventListener('change', cb);
  }, [query]);
  return useSyncExternalStore(subscribe, () => matchMedia(query).matches);
}

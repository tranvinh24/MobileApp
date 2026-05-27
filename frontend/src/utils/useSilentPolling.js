import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Runs a "silent" refresh loop while the screen is focused.
 * - No loading UI toggles.
 * - Avoids overlapping requests.
 * - Call `load({ silent: true })` style functions.
 */
export function useSilentPolling(load, deps = [], intervalMs = 3000, runImmediately = true) {
  const inFlightRef = useRef(false);
  const timerRef = useRef(null);

  const tick = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      await load?.({ silent: true });
    } catch {}
    inFlightRef.current = false;
  }, [load, ...deps]);

  useFocusEffect(
    useCallback(() => {
      if (runImmediately) tick();
      timerRef.current = setInterval(tick, intervalMs);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
      };
    }, [tick, intervalMs, runImmediately])
  );

  // Safety: clear timer on unmount (in case focus effect isn't triggered)
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, []);
}


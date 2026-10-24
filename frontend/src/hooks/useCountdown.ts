import { useState, useEffect } from 'react';

/** Whole seconds left until `deadline` (a Date.now() timestamp), updated locally. */
export function useCountdown(deadline: number | null): number {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (deadline === null) return;
    const id = setInterval(() => {
      setTick((t) => t + 1);
      if (Date.now() >= deadline) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
  }, [deadline]);

  // Computed during render so the value is correct on the very first render after `deadline` changes.
  return deadline === null ? 0 : Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}

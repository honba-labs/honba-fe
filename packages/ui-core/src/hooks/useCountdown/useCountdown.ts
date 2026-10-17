// Ported/modernized from bfx-hf-ui-core's src/hooks/useCountdown.js (Apache-2.0).
// Same { countdown, isFinished, resetCountdown } contract as the original, typed for TS.
import { useEffect, useState } from 'react';

export interface UseCountdownResult {
  countdown: number;
  isFinished: boolean;
  resetCountdown: () => void;
}

export function useCountdown(initialCount: number, isActive = true): UseCountdownResult {
  const [countdown, setCountdown] = useState(initialCount);

  useEffect(() => {
    if (!isActive || countdown <= 0) {
      return undefined;
    }

    const timer = setInterval(() => {
      setCountdown((previous) => previous - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, countdown]);

  const resetCountdown = () => setCountdown(initialCount);

  return { countdown, isFinished: countdown === 0, resetCountdown };
}

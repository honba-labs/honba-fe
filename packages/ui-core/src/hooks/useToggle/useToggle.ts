// Ported/modernized from bfx-hf-ui-core's src/hooks/useToggle.js (Apache-2.0).
// Same [value, toggle, setTrue, setFalse] tuple contract as the original, typed for TS.
import { useCallback, useState } from 'react';

export type UseToggleResult = [boolean, () => void, () => void, () => void];

export function useToggle(initialState = false): UseToggleResult {
  const [state, setState] = useState(initialState);

  const toggle = useCallback(() => setState((previous) => !previous), []);
  const setTrue = useCallback(() => setState(true), []);
  const setFalse = useCallback(() => setState(false), []);

  return [state, toggle, setTrue, setFalse];
}

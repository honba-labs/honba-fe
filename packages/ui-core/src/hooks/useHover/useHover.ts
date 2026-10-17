// Ported/modernized from bfx-hf-ui-core's src/hooks/useHover.js (Apache-2.0).
// Same [ref, isHovered] contract as the original (https://usehooks.com/useHover/), typed for TS.
import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export type UseHoverResult<T extends HTMLElement> = [RefObject<T | null>, boolean];

export function useHover<T extends HTMLElement = HTMLDivElement>(): UseHoverResult<T> {
  const [value, setValue] = useState(false);
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return undefined;
    }

    const onMouseOver = () => setValue(true);
    const onMouseOut = () => setValue(false);

    node.addEventListener('mouseover', onMouseOver);
    node.addEventListener('mouseout', onMouseOut);

    return () => {
      node.removeEventListener('mouseover', onMouseOver);
      node.removeEventListener('mouseout', onMouseOut);
    };
  }, []);

  return [ref, value];
}

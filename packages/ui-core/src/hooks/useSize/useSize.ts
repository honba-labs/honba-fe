// Ported/modernized from bfx-hf-ui-core's src/hooks/useSize.js (Apache-2.0).
// Same [ref, size] contract as the original (backed by ResizeObserver); the lodash `_get` call
// is replaced with a plain optional-chain since this package has no lodash dependency.
import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export interface ElementSize {
  width: number;
  height: number;
}

export type UseSizeResult<T extends HTMLElement> = [RefObject<T | null>, ElementSize];

export function useSize<T extends HTMLElement = HTMLDivElement>(): UseSizeResult<T> {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return undefined;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      setSize({
        width: entry?.contentRect.width ?? 0,
        height: entry?.contentRect.height ?? 0,
      });
    });

    resizeObserver.observe(node);

    return () => {
      resizeObserver.unobserve(node);
      resizeObserver.disconnect();
    };
  }, []);

  return [ref, size];
}

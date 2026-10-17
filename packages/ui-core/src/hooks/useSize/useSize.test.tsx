import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useSize } from './useSize';

type ResizeCallback = (entries: Array<{ contentRect: { width: number; height: number } }>) => void;

describe('useSize', () => {
  let observedCallback: ResizeCallback | undefined;
  let observedTarget: Element | undefined;
  const OriginalResizeObserver = globalThis.ResizeObserver;

  beforeEach(() => {
    observedCallback = undefined;
    observedTarget = undefined;

    class MockResizeObserver {
      private readonly callback: ResizeCallback;

      constructor(callback: ResizeCallback) {
        this.callback = callback;
        observedCallback = callback;
      }

      observe(target: Element) {
        observedTarget = target;
      }

      unobserve() {}

      disconnect() {}
    }

    globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    globalThis.ResizeObserver = OriginalResizeObserver;
  });

  function Probe() {
    const [ref, size] = useSize<HTMLDivElement>();
    return <div ref={ref} data-testid="box">{`${size.width}x${size.height}`}</div>;
  }

  it('starts at zero size', () => {
    render(<Probe />);
    expect(screen.getByTestId('box')).toHaveTextContent('0x0');
  });

  it('observes the element the ref is attached to', () => {
    render(<Probe />);
    expect(observedTarget).toBe(screen.getByTestId('box'));
  });

  it('updates size when the observer reports a new content rect', () => {
    render(<Probe />);

    act(() => {
      observedCallback?.([{ contentRect: { width: 320, height: 240 } }]);
    });

    expect(screen.getByTestId('box')).toHaveTextContent('320x240');
  });
});

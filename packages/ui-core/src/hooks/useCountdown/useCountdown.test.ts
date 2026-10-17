import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCountdown } from './useCountdown';

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts at the initial count and is not finished', () => {
    const { result } = renderHook(() => useCountdown(3));
    expect(result.current.countdown).toBe(3);
    expect(result.current.isFinished).toBe(false);
  });

  it('counts down by one every second while active', () => {
    const { result } = renderHook(() => useCountdown(2));

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.countdown).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.countdown).toBe(0);
    expect(result.current.isFinished).toBe(true);
  });

  it('does not tick when inactive', () => {
    const { result } = renderHook(() => useCountdown(2, false));

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.countdown).toBe(2);
  });

  it('resetCountdown restores the initial value', () => {
    const { result } = renderHook(() => useCountdown(2));

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.countdown).toBe(1);

    act(() => {
      result.current.resetCountdown();
    });
    expect(result.current.countdown).toBe(2);
  });
});

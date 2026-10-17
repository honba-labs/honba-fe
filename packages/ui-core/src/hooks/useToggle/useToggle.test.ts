import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useToggle } from './useToggle';

describe('useToggle', () => {
  it('starts false by default', () => {
    const { result } = renderHook(() => useToggle());
    expect(result.current[0]).toBe(false);
  });

  it('honors the initial state argument', () => {
    const { result } = renderHook(() => useToggle(true));
    expect(result.current[0]).toBe(true);
  });

  it('toggle flips the value', () => {
    const { result } = renderHook(() => useToggle(false));

    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);

    act(() => result.current[1]());
    expect(result.current[0]).toBe(false);
  });

  it('setTrue and setFalse force the value', () => {
    const { result } = renderHook(() => useToggle(false));

    act(() => result.current[2]());
    expect(result.current[0]).toBe(true);

    act(() => result.current[3]());
    expect(result.current[0]).toBe(false);
  });
});

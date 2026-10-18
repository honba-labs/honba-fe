import { describe, expect, it, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';

import { BacktestProgressBar } from './BacktestProgressBar';

describe('BacktestProgressBar', () => {
  it('renders the elapsed time and percent at a fixed read time', () => {
    const startedOn = Date.now() - 90_000; // 1m30s ago
    render(<BacktestProgressBar percent={42} startedOn={startedOn} now={Date.now()} />);
    expect(screen.getByTestId('backtest-elapsed').textContent).toMatch(/00:01:30/);
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('renders 00:00:00 when startedOn equals now', () => {
    render(<BacktestProgressBar percent={0} startedOn={Date.now()} now={Date.now()} />);
    expect(screen.getByTestId('backtest-elapsed').textContent).toBe('00:00:00');
  });

  it('ticks the elapsed clock once per second when no `now` override is given', () => {
    vi.useFakeTimers();
    try {
      const startedOn = vi.getMockedSystemTime()?.getTime?.() ?? Date.now();
      render(<BacktestProgressBar percent={10} startedOn={startedOn} />);
      expect(screen.getByTestId('backtest-elapsed').textContent).toBe('00:00:00');

      act(() => {
        vi.advanceTimersByTime(5_000);
      });
      expect(screen.getByTestId('backtest-elapsed').textContent).toBe('00:00:05');
    } finally {
      vi.useRealTimers();
    }
  });
});

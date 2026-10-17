import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { DataFeed } from 'openalgo-charts';

// `openalgo-charts`' widget tier needs a real 2D canvas context, which jsdom doesn't provide
// (see docs/tasks.md Shared conventions: "fixture data, no live backend needed" — this stubs the
// charting engine itself, not the data). The fake widget implements just the subset of the
// `Widget` API `ChartPanel` drives, so these tests assert on the wiring `ChartPanel` owns
// (props -> widget calls, widget events -> callbacks) rather than on canvas rendering.
const createWidget = vi.fn();

vi.mock('openalgo-charts/widget', () => ({
  createWidget: (...args: unknown[]) => createWidget(...args),
}));

import { ChartPanel } from './ChartPanel';

function makeFakeWidget(options: { symbol: string; exchange?: string; interval: string }) {
  let currentSymbol = options.symbol;
  let currentInterval = options.interval;
  return {
    isDestroyed: false,
    symbol: () => currentSymbol,
    interval: () => currentInterval,
    setSymbol: vi.fn((s: string) => {
      currentSymbol = s;
    }),
    setInterval: vi.fn((i: string) => {
      currentInterval = i;
    }),
    setTheme: vi.fn(),
    on: vi.fn(() => () => {}),
    destroy: vi.fn(),
  };
}

const fakeFeed = {} as DataFeed;

describe('ChartPanel', () => {
  beforeEach(() => {
    createWidget.mockReset();
    createWidget.mockImplementation((_container, options) => makeFakeWidget(options));
  });

  it('builds the widget from symbol/exchange/timeframe/theme props', () => {
    render(
      <ChartPanel symbol="RELIANCE" exchange="NSE" timeframe="1d" feed={fakeFeed} theme="dark" />,
    );
    expect(createWidget).toHaveBeenCalledTimes(1);
    const [, options] = createWidget.mock.calls[0];
    expect(options).toMatchObject({
      symbol: 'RELIANCE',
      exchange: 'NSE',
      interval: '1d',
      theme: 'dark',
      feed: fakeFeed,
    });
  });

  it('defaults the panel label to the symbol and shows the current timeframe', () => {
    render(<ChartPanel symbol="TCS" timeframe="1h" feed={fakeFeed} />);
    expect(screen.getByText('TCS')).toBeInTheDocument();
    expect(screen.getByText('1H')).toBeInTheDocument();
  });

  it('drives the live widget via setSymbol/setInterval when props change, without rebuilding it', () => {
    const { rerender } = render(<ChartPanel symbol="TCS" timeframe="1h" feed={fakeFeed} />);
    const widget = createWidget.mock.results[0]!.value;

    rerender(<ChartPanel symbol="INFY" timeframe="1h" feed={fakeFeed} />);
    expect(widget.setSymbol).toHaveBeenCalledWith('INFY', '');

    rerender(<ChartPanel symbol="INFY" timeframe="1d" feed={fakeFeed} />);
    expect(widget.setInterval).toHaveBeenCalledWith('1d');

    expect(createWidget).toHaveBeenCalledTimes(1);
  });

  it('calls onTimeframeChange when a timeframe is picked from the switcher', () => {
    const onTimeframeChange = vi.fn();
    render(
      <ChartPanel
        symbol="TCS"
        timeframe="1h"
        feed={fakeFeed}
        onTimeframeChange={onTimeframeChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /1H/i }));
    fireEvent.click(screen.getByText('1D'));
    expect(onTimeframeChange).toHaveBeenCalledWith('1d');
  });

  it('destroys the widget on unmount', () => {
    const { unmount } = render(<ChartPanel symbol="TCS" timeframe="1h" feed={fakeFeed} />);
    const widget = createWidget.mock.results[0]!.value;
    unmount();
    expect(widget.destroy).toHaveBeenCalledTimes(1);
  });

  it('renders a fullscreen toggle button', () => {
    render(<ChartPanel symbol="TCS" timeframe="1h" feed={fakeFeed} />);
    expect(screen.getByLabelText('Enter fullscreen')).toBeInTheDocument();
  });
});

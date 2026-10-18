import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { BacktestOptionsPanel } from './BacktestOptionsPanel';
import type { BacktestConfig } from './BacktestOptionsPanel';

const baseConfig: BacktestConfig = {
  symbol: 'RELIANCE',
  timeframe: '1d',
  from: '2026-01-01',
  to: '2026-10-01',
  capital: 1000000,
  positionMode: 'long',
};

const markets = [
  { symbol: 'RELIANCE', exchange: 'NSE' },
  { symbol: 'TCS', exchange: 'NSE' },
];

describe('BacktestOptionsPanel', () => {
  it('renders the run-config form fields with the given config', () => {
    render(<BacktestOptionsPanel config={baseConfig} onChange={vi.fn()} />);
    expect(screen.getByText('Instrument (exchange:symbol)')).toBeInTheDocument();
    expect(screen.getByText('Capital')).toBeInTheDocument();
    expect(screen.getByText('Position mode')).toBeInTheDocument();
    expect(screen.getByText('Start backtest')).toBeInTheDocument();
  });

  it('capital edits patch the config through onChange', () => {
    const onChange = vi.fn();
    const { container } = render(<BacktestOptionsPanel config={baseConfig} onChange={onChange} />);
    // Input's field-label is a presentational <p> (see ui/Input), so locate the input by its
    // type — the only number input in the form is Capital.
    const capitalInput = container.querySelector<HTMLInputElement>('input[type="number"]')!;
    fireEvent.change(capitalInput, { target: { value: '2000000' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    // The patch merges into the previous config rather than replacing it wholesale.
    expect(onChange.mock.calls[0][0]).toMatchObject<BacktestConfig>({
      ...baseConfig,
      capital: 2_000_000,
    });
  });

  it('switching position mode patches positionMode only', () => {
    const onChange = vi.fn();
    render(<BacktestOptionsPanel config={baseConfig} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Short only'));
    expect(onChange.mock.calls[0][0]).toMatchObject<BacktestConfig>({
      ...baseConfig,
      positionMode: 'short',
    });
  });

  it('Start reports the whole config', () => {
    const onStart = vi.fn();
    render(<BacktestOptionsPanel config={baseConfig} onChange={vi.fn()} onStart={onStart} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start backtest' }));
    expect(onStart).toHaveBeenCalledWith(baseConfig);
  });

  it('Start is disabled when capital is invalid or symbol/from are missing', () => {
    const { rerender } = render(
      <BacktestOptionsPanel config={{ ...baseConfig, capital: -5 }} onChange={vi.fn()} />,
    );
    expect(
      screen.getByRole('button', { name: 'Start backtest' }).hasAttribute('disabled'),
    ).toBe(true);
    expect(screen.getByText('Capital must be a positive number')).toBeInTheDocument();

    rerender(
      <BacktestOptionsPanel config={{ ...baseConfig, symbol: '' }} onChange={vi.fn()} />,
    );
    expect(
      screen.getByRole('button', { name: 'Start backtest' }).hasAttribute('disabled'),
    ).toBe(true);
  });

  it('while running, hides the form and shows the progress view', () => {
    const startedOn = Date.now();
    render(
      <BacktestOptionsPanel
        config={baseConfig}
        onChange={vi.fn()}
        isRunning
        percent={37}
        startedOn={startedOn}
      />,
    );
    expect(screen.queryByText('Start backtest')).not.toBeInTheDocument();
    expect(screen.getByText('37%')).toBeInTheDocument();
    expect(screen.getByText(/Backtest running/)).toBeInTheDocument();
  });

  it('renders a caller-supplied error as an attention bar', () => {
    render(
      <BacktestOptionsPanel config={baseConfig} onChange={vi.fn()} error="Range exceeds available history" />,
    );
    expect(screen.getByText('Range exceeds available history')).toBeInTheDocument();
  });
});

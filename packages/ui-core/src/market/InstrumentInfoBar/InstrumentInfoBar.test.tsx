import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { InstrumentInfoBar } from './InstrumentInfoBar';

describe('InstrumentInfoBar', () => {
  it('renders the symbol and last price', () => {
    render(<InstrumentInfoBar symbol="RELIANCE" lastPrice={2456.75} />);
    expect(screen.getByText('RELIANCE')).toBeInTheDocument();
    expect(screen.getByText('2,456.75')).toBeInTheDocument();
  });

  it('shows a positive change in the bullish tone with a + sign', () => {
    render(
      <InstrumentInfoBar
        symbol="RELIANCE"
        lastPrice={2456.75}
        changeValue={12.5}
        changePercent={0.51}
      />,
    );
    const value = screen.getByText('Change').nextElementSibling!;
    expect(value).toHaveClass('bullish');
    expect(value.textContent).toContain('+12.50');
    expect(value.textContent).toContain('+0.51%');
  });

  it('shows a negative change in the bearish tone without a + sign', () => {
    render(<InstrumentInfoBar symbol="RELIANCE" lastPrice={2456.75} changeValue={-12.5} />);
    const value = screen.getByText('Change').nextElementSibling!;
    expect(value).toHaveClass('bearish');
    expect(value.textContent).toContain('-12.50');
  });

  it('only renders high/low/volume when supplied', () => {
    render(<InstrumentInfoBar symbol="RELIANCE" lastPrice={2456.75} />);
    expect(screen.queryByText('High')).not.toBeInTheDocument();
    expect(screen.queryByText('Low')).not.toBeInTheDocument();
    expect(screen.queryByText('Volume')).not.toBeInTheDocument();
  });

  it('renders day high/low and volume when supplied', () => {
    render(
      <InstrumentInfoBar
        symbol="RELIANCE"
        lastPrice={2456.75}
        dayHigh={2470}
        dayLow={2440}
        volume={1234567}
      />,
    );
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('2,470.00')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('2,440.00')).toBeInTheDocument();
    expect(screen.getByText('Volume')).toBeInTheDocument();
    expect(screen.getByText('1,234,567')).toBeInTheDocument();
  });
});

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PerformanceMetrics } from './PerformanceMetrics';

describe('PerformanceMetrics', () => {
  const metrics = [
    { label: 'Total P&L', value: '+₹1,42,500.00', tone: 'positive' as const },
    { label: 'Unrealized P&L', value: '-₹82,750.00', tone: 'negative' as const },
    { label: 'Profit factor', value: '0.87', tone: 'warning' as const },
    { label: 'Backtest candles', value: 4200 },
  ];

  it('renders each metric row from props (presentational, no computed fields)', () => {
    render(<PerformanceMetrics metrics={metrics} />);
    expect(screen.getByText('Total P&L')).toBeInTheDocument();
    expect(screen.getByText('+₹1,42,500.00')).toBeInTheDocument();
    expect(screen.getByText('Unrealized P&L')).toBeInTheDocument();
    expect(screen.getByText('0.87')).toBeInTheDocument();
    expect(screen.getByText(4200)).toBeInTheDocument();
  });

  it('applies tone classes for color-coded values', () => {
    render(<PerformanceMetrics metrics={metrics} />);
    expect(screen.getByText('+₹1,42,500.00').className).toMatch(/positive/);
    expect(screen.getByText('-₹82,750.00').className).toMatch(/negative/);
    expect(screen.getByText('0.87').className).toMatch(/warning/);
  });

  it('shows the section label when provided', () => {
    render(<PerformanceMetrics metrics={metrics} label="Backtest run 12" />);
    expect(screen.getByText('Backtest run 12')).toBeInTheDocument();
  });

  it('renders an empty state for no metrics', () => {
    render(<PerformanceMetrics metrics={[]} />);
    expect(screen.getByText('No metrics')).toBeInTheDocument();
    expect(screen.queryByText('Total P&L')).not.toBeInTheDocument();
  });
});

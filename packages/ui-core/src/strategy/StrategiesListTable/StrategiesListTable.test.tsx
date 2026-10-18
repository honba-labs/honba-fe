import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { StrategiesListTable } from './StrategiesListTable';
import type { StrategyListItem } from './StrategiesListTable';

// Same jsdom tolerances as OrdersTable.test.tsx for the virtualizer (see that file's comment).
class StubResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', StubResizeObserver);
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 600 });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 600 });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const rows: StrategyListItem[] = [
  {
    id: 'strat-live-1',
    name: 'Nifty opening range',
    instrument: 'NSE:NIFTY',
    kind: 'active',
    startedOn: '2026-10-16T09:15:00Z',
    profitFactor: 1.42,
    pnl: 84500,
  },
  {
    id: 'strat-past-1',
    name: 'ORB v1 (superseded)',
    instrument: 'NSE:NIFTY',
    kind: 'past',
    startedOn: '2026-10-14T09:15:00Z',
    stoppedOn: '2026-10-14T15:30:00Z',
    profitFactor: 0.64,
    pnl: -12000,
  },
  {
    id: 'strat-saved-1',
    name: 'ORB v2 (library)',
    instrument: 'NSE:NIFTY',
    kind: 'saved',
    strategyType: 'node graph',
    savedOn: '2026-10-15T18:03:00Z',
  },
];

describe('StrategiesListTable', () => {
  it('renders the Active tab first with its columns', () => {
    render(<StrategiesListTable rows={rows} />);
    expect(screen.getByRole('tab', { name: 'Active (1)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Past (1)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Saved (1)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Active (1)' }).className).toMatch(/selected|active/);
    expect(screen.getByText('Nifty opening range')).toBeInTheDocument();
    expect(screen.getByText('Running since')).toBeInTheDocument();
    expect(screen.getByText('1.42')).toBeInTheDocument();
  });

  it('profit factor below 1 is tone-marked, above 1 is not', () => {
    render(<StrategiesListTable rows={rows} />);
    expect(screen.getByText('1.42').className).not.toMatch(/bad/);
    fireEvent.click(screen.getByRole('tab', { name: 'Past (1)' }));
    expect(screen.getByText('0.64').className).toMatch(/bad/);
  });

  it('switching tabs swaps the column set', () => {
    render(<StrategiesListTable rows={rows} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Saved (1)' }));
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('node graph')).toBeInTheDocument();
    expect(screen.queryByText('Running since')).not.toBeInTheDocument();
  });

  it('row click reports the strategy for active rows', () => {
    const onLoad = vi.fn();
    render(<StrategiesListTable rows={rows} onLoad={onLoad} />);
    fireEvent.click(screen.getByText('Nifty opening range'));
    expect(onLoad).toHaveBeenCalledWith(rows[0]);
  });

  it('saved rows surface explicit Load/Delete actions instead of row click', () => {
    const onLoad = vi.fn();
    const onRemove = vi.fn();
    render(<StrategiesListTable rows={rows} onLoad={onLoad} onRemove={onRemove} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Saved (1)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Load ORB v2 (library)' }));
    expect(onLoad).toHaveBeenCalledWith(rows[2]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete ORB v2 (library)' }));
    expect(onRemove).toHaveBeenCalledWith(rows[2]);
  });

  it('renders the empty message when no rows exist', () => {
    render(<StrategiesListTable rows={[]} />);
    expect(screen.getByText('No strategies')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });
});

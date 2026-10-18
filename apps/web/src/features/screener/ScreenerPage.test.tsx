// Batch I slice 4 (docs/tasks.md §Batch I): the Screener route's first slice — the
// parity target is honba-frontend's screener-app (filters/heatmap/indicators; far beyond this
// slice), but the honba backend contract is small and usable today: `GET /screener/scan`
// (universe as a JSON array, a JSON-encoded filter group, tf) answering
// `ScreenerResponse { rows: ScreenerResultRow[] }`. This slice: universe input + a predicate
// builder row set (AND-combined) + a metrics results table.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';

import { createApiClient, type ApiClient } from '../../core/api/client';
import { createQueryClient, setApiClient } from '../../core/api/query';
import { ScreenerPage } from './ScreenerPage';

const ROWS = [
  { instrument_id: { exchange: 'NSE', symbol: 'TCS' }, metrics: { close: 4060, rsi: 61.5 } },
  { instrument_id: { exchange: 'NSE', symbol: 'INFY' }, metrics: { close: 1550, rsi: 44 } },
];

function stubbedClient(scan: ApiClient['getScreenerScan']): ApiClient {
  const base = createApiClient({ baseUrl: '/api', fetchImpl: fetch });
  const client: ApiClient = { ...base, getInstruments: vi.fn(), getScreenerScan: scan };
  setApiClient(client);
  return client;
}

beforeEach(() => {
  // `universe` survives between tests through the input; clear it for a stable blank start.
  const client = stubbedClient(vi.fn());
  void client;
});

function renderPage() {
  return render(
    <QueryClientProvider client={createQueryClient({ retries: 0 })}>
      <ScreenerPage />
    </QueryClientProvider>,
  );
}

describe('ScreenerPage (Batch I slice 4)', () => {
  it('scans a typed universe with no filters and renders rows with metric columns', async () => {
    const scan = vi.fn().mockResolvedValue({ rows: ROWS });
    stubbedClient(scan);
    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/RELIANCE\.NSE/i), {
      target: { value: '["TCS.NSE","INFY.NSE"]' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run scan' }));

    await waitFor(() => expect(scan).toHaveBeenCalledTimes(1));
    expect(scan.mock.calls[0][0].universe).toBe('["TCS.NSE","INFY.NSE"]');
    // No predicate rows edited away → no filters parameter at all.
    expect(scan.mock.calls[0][0].filters).toBeUndefined();

    // Results table: an instrument column plus one column per metric key.
    expect(await screen.findByText('TCS · NSE')).toBeInTheDocument();
    expect(screen.getByText('INFY · NSE')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'close' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'rsi' })).toBeInTheDocument();
    expect(screen.getByText('61.5')).toBeInTheDocument();
  });

  it('AND-combines predicate rows into the JSON-encoded filters parameter', async () => {
    const scan = vi.fn().mockResolvedValue({ rows: [] });
    stubbedClient(scan);
    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/RELIANCE\.NSE/i), {
      target: { value: '["TCS.NSE"]' },
    });
    // Fill the first predicate row and add a second one.
    fireEvent.change(screen.getByPlaceholderText(/metric key/i), { target: { value: 'close' } });
    fireEvent.change(screen.getByLabelText('Operator 1'), { target: { value: 'gt' } });
    fireEvent.change(screen.getByPlaceholderText(/value/i), { target: { value: '2900' } });
    fireEvent.click(screen.getByRole('button', { name: /add predicate/i }));

    const keys = screen.getAllByPlaceholderText(/metric key/i);
    fireEvent.change(keys[1], { target: { value: 'rsi' } });
    const values = screen.getAllByPlaceholderText(/value/i);
    fireEvent.change(values[1], { target: { value: '50' } });

    fireEvent.click(screen.getByRole('button', { name: 'Run scan' }));

    await waitFor(() => expect(scan).toHaveBeenCalledTimes(1));
    expect(JSON.parse(scan.mock.calls[0][0].filters)).toEqual({
      operator: 'AND',
      items: [
        { key: 'close', op: 'gt', value: 2900 },
        { key: 'rsi', op: 'gt', value: 50 },
      ],
    });
  });

  it('surfaces the server refusal instead of an empty table', async () => {
    const scan = vi.fn().mockRejectedValue(new Error('422 invalid_universe'));
    stubbedClient(scan);
    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/RELIANCE\.NSE/i), {
      target: { value: 'not json' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run scan' }));

    expect(await screen.findByText(/invalid_universe/)).toBeInTheDocument();
    // And the stale/failed run renders no results table.
    expect(screen.queryByRole('columnheader', { name: 'close' })).not.toBeInTheDocument();
  });
});

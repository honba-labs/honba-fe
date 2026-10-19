// @vitest-environment jsdom
// The screener body was redesigned (ported from honba-frontend's screener-app): the page is
// now a client-side filtered view over the instrument store — a search bar, the "Popular
// Screens" preset bubbles, and advanced filter pills working on `useScreenerStore` state —
// replacing the old Batch I slice-4 "typed JSON universe → GET /screener/scan" flow. These
// tests cover the shipped behavior: seeding the universe, the search bar narrowing the table,
// and a Popular Screens bubble applying and toggling off.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { QueryClientProvider } from '@tanstack/react-query';

afterEach(() => {
  cleanup();
});

import { createQueryClient } from '../../core/api/query';
import { useScreenerStore } from '../../core/store/use-screener-store';
import { ScreenerPage } from './ScreenerPage';
import type { Instrument } from '../../core/market-data';

const BASE: Instrument = {
  symbol: '?',
  name: '?',
  country: 'IN',
  exchange: 'NSE',
  sector: 'General',
  industry: 'General',
  price: 1000,
  change: 0,
  changePercent: 0,
  volume: 1_000_000,
  avgVolume30d: 1_000_000,
  marketCap: 1_000_000_000,
  marketCapTier: 'large',
  pe: 20,
  forwardPe: 18,
  pb: 3,
  eps: 50,
  dividendYield: 1,
  high52: 1100,
  low52: 800,
  rsi14: 50,
  sma20: 990,
  sma50: 980,
  sma200: 900,
  technicalRating: 'Neutral',
  perf1W: 0,
  perf1M: 0,
  perf3M: 0,
  perf1Y: 0,
  revenueGrowth: 0,
  netMargin: 10,
  roce: 15,
  roe: 18,
  debtToEquity: 0.5,
  sparkline: [],
  history: [],
  description: '',
} as Instrument;

const TCS = { ...BASE, symbol: 'TCS', name: 'Tata Consultancy Services', sector: 'Information Technology', changePercent: 2.4 };
const INFY = { ...BASE, symbol: 'INFY', name: 'Infosys', sector: 'Information Technology', changePercent: -1.1 };
const LT = { ...BASE, symbol: 'LT', name: 'Larsen & Toubro', sector: 'Infrastructure', changePercent: 0.6, dividendYield: 2.4 };

function renderPage() {
  return render(
    <QueryClientProvider client={createQueryClient({ retries: 0 })}>
      <ScreenerPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  // Reset the persisted/local store to a known universe; the FilterBar mutates all three slices.
  useScreenerStore.getState().resetFilters();
  useScreenerStore.setState({ instruments: [TCS, INFY, LT], searchQuery: '', quickPreset: 'all' });
});

describe('ScreenerPage (redesigned screener body)', () => {
  it('shows the seeded universe and narrow it via the AI search bar', async () => {
    renderPage();

    expect(await screen.findByText('TCS')).toBeInTheDocument();
    expect(screen.getByText('INFY')).toBeInTheDocument();
    // `LT` appears in several derived cells; the symbol column is the stable unique anchor.
    expect(screen.getAllByText('LT', { selector: '.tv-col-symbol, .tv-col-symbol *' }).length).toBeGreaterThan(0);

    // Open the AI prompt bar, submit a name query; only the TCS row survives.
    fireEvent.click(screen.getByTitle('Filter stocks using AI prompt'));
    fireEvent.change(screen.getByPlaceholderText(/Ask AI:/i), { target: { value: 'tata' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() => expect(useScreenerStore.getState().searchQuery).toBe('tata'));
    expect(screen.getByText('TCS')).toBeInTheDocument();
    expect(screen.queryByText('INFY')).not.toBeInTheDocument();
    expect(screen.queryByText('LT')).not.toBeInTheDocument();
  });

  it('applies a Popular Screens preset bubble and toggles it back off', async () => {
    renderPage();

    expect(await screen.findByText('INFY')).toBeInTheDocument();

    // "Top gainers" keeps only positive-change instruments.
    fireEvent.click(screen.getByTitle('Apply screen: Top gainers'));
    await waitFor(() => expect(useScreenerStore.getState().quickPreset).toBe('gainers'));
    expect(screen.getByText('TCS')).toBeInTheDocument();
    expect(screen.queryByText('INFY')).not.toBeInTheDocument();

    // Clicking the active bubble again resets to the unfiltered "all" view (bubble toggle-off).
    fireEvent.click(screen.getByTitle('Apply screen: Top gainers'));
    await waitFor(() => expect(useScreenerStore.getState().quickPreset).toBe('all'));
    expect(await screen.findByText('INFY')).toBeInTheDocument();
  });

  it('marks the active preset bubble as active', async () => {
    renderPage();

    const gainers = screen.getByTitle('Apply screen: Top gainers');
    expect(gainers.className).not.toContain('active');
    fireEvent.click(gainers);
    await waitFor(() => expect(gainers.className).toContain('active'));
  });
});

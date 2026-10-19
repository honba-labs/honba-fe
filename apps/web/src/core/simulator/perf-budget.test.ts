import { describe, expect, it } from 'vitest';

import type { Bar as DomainBar, Trade } from '../types/generated/domain';
import type { StrategyGraphShape } from '../../features/algodesigner/model';
import {
  SESSION_CLOSE_UTC,
  SESSION_OPEN_UTC,
  markerToleranceSec,
  resampleBars,
  snapToBars,
  toChartBars,
  unixNanosToSeconds,
} from './chart-data';
import { markersFromPairing, pairTrades } from './trade-pairing';
import { graphSpecs } from './chart-series';
import { deriveRibbonMetrics, equitySeries, monthlyHeatmap, type AnalyticsInput } from './analytics';

/**
 * Simulator data-path CPU budget (Phase 9, HBD-2026-DES-004 §6/§10).
 *
 * The plan's acceptance gate is "the Simulator handles a year of 5-minute
 * bars (~27,000 bars) without dropped frames". **"Dropped frames" is a
 * real-browser compositor/paint concept**: `vitest.config.ts` runs this
 * suite with `environment: 'node'` (no DOM, no `requestAnimationFrame`, no
 * GPU), so it cannot be measured here honestly, and this test does not
 * claim to.
 *
 * What CAN be measured honestly, with real wall-clock timing, is the actual
 * hot data-processing path a run of that size drives: bar normalisation and
 * resampling (`chart-data.ts`), fill -> round-trip pairing and marker
 * placement (`trade-pairing.ts`), indicator spec building (`chart-series.ts`)
 * and the analytics derivation (`analytics.ts`). This is a **CPU-budget
 * proxy** for that data path, not a frame-drop measurement — a pass here is
 * evidence the data pipeline has headroom under the chart's render budget,
 * nothing more.
 */

function nanosFor(seconds: number): { iso: string; unix_nanos: string } {
  return { iso: new Date(seconds * 1000).toISOString(), unix_nanos: `${seconds}000000000` };
}

function domainBar(seconds: number, close: number): DomainBar {
  return {
    bar_type: { instrument_id: { symbol: 'TCS', exchange: 'NSE' }, spec: { aggregation: 'minute', price_type: 'last', step: 5 } },
    open: close - 1,
    high: close + 1.5,
    low: close - 1.5,
    close,
    ts_event: nanosFor(seconds),
    ts_init: nanosFor(seconds),
    volume: 10_000,
  };
}

const DAY_SECONDS = 86_400;
const STEP_SECONDS = 5 * 60;
/** A Monday, so the weekday maths below starts clean. */
const BASE_DAY = Math.floor(Date.UTC(2023, 0, 2) / 1000 / DAY_SECONDS) * DAY_SECONDS;

/**
 * Deterministic 5-minute NSE-session bars, skipping weekends, until `count`
 * is reached — the fixture size the plan's acceptance criterion names
 * ("a year of 5-minute bars (~27,000 bars)").
 */
function generateFiveMinuteSessionBars(count: number): DomainBar[] {
  const bars: DomainBar[] = [];
  let dayIndex = 0;
  while (bars.length < count) {
    const dayStart = BASE_DAY + dayIndex * DAY_SECONDS;
    const weekday = (Math.floor(dayStart / DAY_SECONDS) + 4) % 7; // 0 = Sunday
    dayIndex += 1;
    if (weekday === 0 || weekday === 6) continue;
    const open = dayStart + SESSION_OPEN_UTC;
    const close = dayStart + SESSION_CLOSE_UTC;
    for (let t = open; t < close && bars.length < count; t += STEP_SECONDS) {
      const wobble = Math.sin(t / 3_600) * 5 + Math.cos(t / 86_400) * 2;
      bars.push(domainBar(t, 3_400 + wobble));
    }
  }
  return bars;
}

/** Alternating buy/sell fills every `every` bars — a plausible trade cadence over a year. */
function generateAlternatingTrades(bars: readonly DomainBar[], every: number): Trade[] {
  const trades: Trade[] = [];
  let side: 'buy' | 'sell' = 'buy';
  for (let i = 0; i < bars.length; i += every) {
    const bar = bars[i];
    trades.push({
      costs: { amount: 5, currency: 'INR' },
      instrument_id: { symbol: 'TCS', exchange: 'NSE' },
      order_id: `o-${i}`,
      price: bar.close,
      quantity: 10,
      side,
      ts_event: bar.ts_event,
      ts_init: bar.ts_event,
    });
    side = side === 'buy' ? 'sell' : 'buy';
  }
  return trades;
}

const SMALL_GRAPH: StrategyGraphShape = {
  schema_version: 1,
  name: 'perf_probe',
  universe: { explicit: [{ symbol: 'TCS', exchange: 'NSE' }] },
  driving_timeframe: { interval: 5, aggregation: 'minute' },
  warmup_bars: 20,
  nodes: [
    { id: 'n1', type: 'universe', label: 'Universe' },
    { id: 'f', type: 'indicator', indicator: 'sma', label: 'Fast SMA', params: { period: 9 } },
    { id: 's', type: 'indicator', indicator: 'sma', label: 'Slow SMA', params: { period: 21 } },
  ],
  edges: [
    { id: 'e1', from_node: 'n1', from_port: 'bars', to_node: 'f', to_port: 'input' },
    { id: 'e2', from_node: 'n1', from_port: 'bars', to_node: 's', to_port: 'input' },
  ],
};

describe('simulator data-path CPU budget (Phase 9 proxy, not a frame-drop measurement)', () => {
  it('processes a ~27,000-bar fixture and its derived trades within a generous wall-clock budget', () => {
    const domainBars = generateFiveMinuteSessionBars(27_000);
    expect(domainBars.length).toBe(27_000);
    const trades = generateAlternatingTrades(domainBars, 40);

    const start = performance.now();

    const chartBars = toChartBars(domainBars);
    const dailyBars = resampleBars(chartBars, '1d');
    const weeklyBars = resampleBars(chartBars, '1w');

    const pairing = pairTrades(trades);
    const markers = markersFromPairing(pairing);
    const tolerance = markerToleranceSec('5m');
    const snapped = snapToBars(markers, chartBars, tolerance);

    const specs = graphSpecs(SMALL_GRAPH);

    const firstSec = unixNanosToSeconds(domainBars[0].ts_event)!;
    const lastSec = unixNanosToSeconds(domainBars[domainBars.length - 1].ts_event)!;
    const window = {
      start: new Date(firstSec * 1000).toISOString().slice(0, 10),
      end: new Date((lastSec + DAY_SECONDS) * 1000).toISOString().slice(0, 10),
    };
    const analyticsInput: AnalyticsInput = {
      metrics: { total_return: 0.12, sharpe: 1.1, max_drawdown: 0.08, net_pnl: 120_000, trades: pairing.trips.length },
      trips: pairing.trips,
      window,
      initialCapital: 1_000_000,
    };
    const ribbon = deriveRibbonMetrics(analyticsInput);
    const equity = equitySeries(analyticsInput);
    const heatmap = monthlyHeatmap(analyticsInput);

    const elapsedMs = performance.now() - start;

    // Sanity: the pipeline did real work, not a short-circuit on empty input.
    expect(chartBars.length).toBe(27_000);
    expect(dailyBars.length).toBeGreaterThan(0);
    expect(weeklyBars.length).toBeGreaterThan(0);
    expect(pairing.trips.length).toBeGreaterThan(0);
    expect(snapped.length).toBe(markers.length);
    expect(specs.length).toBe(2);
    expect(ribbon.length).toBeGreaterThan(0);
    expect(equity.equity.length).toBeGreaterThan(0);
    expect(heatmap.cells.length).toBeGreaterThan(0);

    // Generous CPU budget ("a few hundred ms"), nowhere near a 60fps/16ms
    // frame budget — a floor-level regression guard, not a micro-benchmark,
    // and explicitly NOT a claim about dropped frames in a real browser.
    expect(elapsedMs).toBeLessThan(500);
  });
});

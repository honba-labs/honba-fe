// honba-fe — mirror of the honba wire types for the thin typed client (core/api/client.ts).
// Source of truth: honba-kokoro/schema/openapi/openapi.json (API_VERSION 1.0.0, SCHEMA_VERSION 4),
// generated from the Rust wire types. The domain shapes are re-exported from
// ./generated/domain.ts (same codegen run), so this file cannot drift from the backend: only the
// helpers, the served `Instrument` JSON shape (honba-ya-api/src/market.rs `instrument_json`, which
// is richer than the schema's bare `InstrumentId[]`), the screener filter grammar, and the Batch J
// report types (honba-ya-api/src/responses.rs, which the schema does not carry) live here.

import type {
  BacktestResponse as WireBacktestResponse,
  BacktestMetrics as WireBacktestMetrics,
  Money,
  Order as WireOrder,
  OrderSide,
  OrderType,
  OrdersRequest as WireOrdersRequest,
  PortfolioAccount as WirePortfolioAccount,
  PortfolioGreeks,
  PortfolioHolding as WirePortfolioHolding,
  PortfolioMode,
  PortfolioPosition as WirePortfolioPosition,
  PortfolioSnapshot as WirePortfolioSnapshot,
  PortfolioSource,
  PositionSide,
  Product,
  Profile as WireProfile,
  QuoteTick as WireQuoteTick,
  RunStatus as WireRunStatus,
  TimeInForce,
  Trade as WireTrade,
  TradingState as WireTradingState,
} from './generated/domain';

export const API_VERSION = '1.0.0';
export const SCHEMA_VERSION = 4;

// --- Core primitives (wire) -------------------------------------------------------------------

export interface UnixNanos {
  /** Nanoseconds since epoch as a decimal string (avoids JS integer overflow). */
  unix_nanos: string;
  /** ISO-8601 rendering; the serde representation always carries it. */
  iso: string;
}

/**
 * An honba failure, normalized to this shape wherever one came from (error envelope, non-JSON
 * gateway response, network failure, envelope-shape bug). `code` is the wire
 * `ErrorDetail.code` vocabulary or a transport pseudo-code; the retry policy keys off
 * `retryable` (see core/api/client.ts).
 */
export interface ErrorDetail {
  code: string;
  message: string;
  retryable: boolean;
  context?: unknown;
}

export interface InstrumentId {
  symbol: string;
  exchange: string;
}

/** Convert `SYMBOL.EXCHANGE` → `{symbol, exchange}` for path params. */
export function instrumentIdPath(id: InstrumentId): string {
  return `${id.symbol}.${id.exchange}`;
}

/** Parse `SYMBOL.EXCHANGE` → `{symbol, exchange}`. */
export function parseInstrumentId(path: string): InstrumentId {
  const idx = path.lastIndexOf('.');
  if (idx <= 0 || idx === path.length - 1) {
    throw new Error(`invalid instrument id: ${path}`);
  }
  return { symbol: path.slice(0, idx), exchange: path.slice(idx + 1) };
}

/** Key function for map/object keys: `EXCHANGE:SYMBOL` (colon-separated, matches bfx-hf-ui-core convention). */
export function instrumentIdKey(id: InstrumentId): string {
  return `${id.exchange}:${id.symbol}`;
}

// --- Instruments (the served JSON shape; honba-ya-api instrument_json) -------------------------

/** One instrument as `GET /instruments` and `GET /instruments/{id}` serve it. */
export interface Instrument {
  id: InstrumentId;
  /** `equity` | `etf` | `bond` | `ipo` | `future` | `option` | `fx` | `index` | `mutual_fund` | `other`. */
  kind: InstrumentKind;
  currency: string;
  lot_size: number;
  tick_size: number;
}

export type InstrumentKind =
  | 'equity'
  | 'etf'
  | 'bond'
  | 'ipo'
  | 'future'
  | 'option'
  | 'fx'
  | 'index'
  | 'mutual_fund'
  | 'other';

export interface InstrumentsResponse {
  instruments: Instrument[];
}

// --- Market data (wire) ------------------------------------------------------------------------

export type QuoteTick = WireQuoteTick;

export interface DepthLevel {
  price: number;
  /** Quantity resting at this level (the wire spells it `qty`). */
  qty: number;
}

/** `GET /depth/{id}`: an order book cut to the requested levels per side. Opaque to
 * instrument identity — the caller chose `id` in the path. */
export interface DepthResponse {
  bids: DepthLevel[];
  asks: DepthLevel[];
}

// --- Orders (wire) ------------------------------------------------------------------------------

export type OrderSideValue = OrderSide;
export type OrderTypeValue = OrderType;
export type TimeInForceValue = TimeInForce;

export type OrdersRequest = WireOrdersRequest;

export type Order = WireOrder;

// --- Portfolio (wire) ---------------------------------------------------------------------------

export type { Money, Currency } from './generated/domain';
export type { PositionSide, Product, PortfolioMode, PortfolioSource, PortfolioGreeks };
export type PortfolioAccount = WirePortfolioAccount;
export type PortfolioHolding = WirePortfolioHolding;
export type PortfolioPosition = WirePortfolioPosition;
export type PortfolioPositionsResponse = { positions: PortfolioPosition[] };
export type { PortfolioTotals } from './generated/domain';
export type PortfolioSnapshot = WirePortfolioSnapshot;

export type Trade = WireTrade;

export interface ScreenerFilterItem {
  key: string;
  op: string;
  value: string | number | [number, number];
}

export interface ScreenerFilterGroup {
  operator: 'AND' | 'OR';
  items: (ScreenerFilterItem | ScreenerFilterGroup)[];
}

export type Timeframe =
  | '1m' | '5m' | '15m' | '30m'
  | '1h' | '2h' | '4h'
  | '1d' | '1w' | '1M';

export type TimeframeValue = Timeframe;

export interface ScreenerRow {
  instrument_id: InstrumentId;
  /** Metric key → latest value ("null" while a metric is still warming up). */
  metrics: Record<string, number | null>;
  /** Optional sector/industry metadata for grouping/filtering. */
  sector?: string;
}

export interface ScreenerResponse {
  rows: ScreenerRow[];
}

export interface TradesResponse {
  trades: Trade[];
}

// --- Engine state (wire) -----------------------------------------------------------------------

/** `GET /trading-state` / the `state` field of `PUT /trading-state`: the operator trading
 * state the write routes evaluate against — normal, winding down, or stopped. */
export type TradingState = WireTradingState;

export type TradingStateRequest = { state: TradingState; reason?: string | null };
export type TradingStateResponse = { state: TradingState };
export type TradingStateChange = { state: TradingState; previous: TradingState };

// --- Profile & layouts (wire) ------------------------------------------------------------------

/** The caller's own profile. Layout documents are opaque JSON to the server — see
 * `LayoutDocument`. Everything is optional: a fresh profile has no keys yet. */
export type Profile = WireProfile;

/** Profile compare-and-swap revision (the `GET /profile` body's `revision`). */
export type ProfileRevision = { revision: number };

/** `PUT /profile/layouts/{name}`: the body is the layout, any JSON (opaque to the server). */
export type LayoutDocument = unknown;

// --- Backtests (wire) --------------------------------------------------------------------------

export type BacktestMetrics = WireBacktestMetrics;
export type BacktestResponse = WireBacktestResponse;
export type { ValidationBlock } from './generated/domain';
export type RunStatus = WireRunStatus;

export interface Event {
  type: string;
  [key: string]: unknown;
}

export interface Message {
  event: Event;
  [key: string]: unknown;
}

export interface StreamFrame {
  kind: 'status' | 'record';
  seq: number;
  status?: RunStatus;
  error?: ErrorDetail;
  message?: Message;
}

export interface Bar {
  ts_event: UnixNanos;
  ts_init: UnixNanos;
  open: number;
  high: number;
  low: number;
  close: number;
  /** Bar volume; honba's bar evaluator always carries it. */
  volume: number;
}

export interface BarsResponse {
  bars: Bar[];
}

// ===== Batch J: Reporting Types =====

export interface ReportsQuery {
  page?: number;
  page_size?: number;
  from?: string | number;
  to?: string | number;
  search?: string;
  instrument?: string;
}

export interface LedgerEntry {
  id: string;
  ts_event: UnixNanos;
  date: string;
  category: string;
  description: string;
  currency: string;
  amount: number;
  amount_usd?: number;
  balance: number;
  balance_usd?: number;
  wallet?: string;
  instrument?: string;
  side?: 'buy' | 'sell';
  fees?: number;
}

export interface LedgerHistoryResponse {
  entries: LedgerEntry[];
  total_count: number;
}

export interface TaxTransaction {
  id: string;
  ts_event: UnixNanos;
  date: string;
  instrument: string;
  symbol: string;
  exchange: string;
  side: 'buy' | 'sell';
  quantity: number;
  buy_price: number;
  sell_price: number;
  buy_date: string;
  sell_date: string;
  holding_period_days: number;
  gain_loss: number;
  gain_loss_usd?: number;
  stcg: number;
  ltcg: number;
  stt: number;
  stamp_duty: number;
  exchange_charges: number;
  sebi_fees: number;
  gst: number;
  total_charges: number;
  net_gain_loss: number;
  tax_liability: number;
  category: 'STCG' | 'LTCG' | 'Exempt';
}

export interface TaxReportSummary {
  total_stcg: number;
  total_ltcg: number;
  total_stt: number;
  total_stamp_duty: number;
  total_exchange_charges: number;
  total_sebi_fees: number;
  total_gst: number;
  total_net_gain_loss: number;
  total_tax_liability: number;
}

export interface TaxReportResponse {
  transactions: TaxTransaction[];
  total_count: number;
  summary: TaxReportSummary;
}

export interface SnapshotEntry {
  id: string;
  ts_event: UnixNanos;
  date: string;
  total_equity: number;
  total_cash: number;
  positions_value: number;
  unrealized_pnl: number;
  realized_pnl: number;
  day_change: number;
  day_change_pct: number;
  accounts: number;
  positions: number;
}

export interface PortfolioSnapshotsResponse {
  snapshots: SnapshotEntry[];
  total_count: number;
}

export interface AuditEntry {
  id: string;
  ts_event: UnixNanos;
  date: string;
  instrument: string;
  side: 'buy' | 'sell';
  quantity_change: number;
  price: number;
  position_after: number;
  avg_price_after: number;
  realized_pnl: number;
  order_id: string;
  reason: string;
}

export interface PositionAuditTrailResponse {
  entries: AuditEntry[];
  total_count: number;
}

export interface ConcentrationEntry {
  instrument: string;
  symbol: string;
  exchange: string;
  market_value: number;
  pct_of_portfolio: number;
  quantity: number;
  avg_price: number;
  mark: number;
  unrealized_pnl: number;
  realized_pnl: number;
  sector?: string;
}

export interface ConcentrationRiskResponse {
  entries: ConcentrationEntry[];
  total_portfolio_value: number;
  hhi: number;
  top5_concentration: number;
  top10_concentration: number;
}

export interface WACEntry {
  instrument: string;
  symbol: string;
  exchange: string;
  quantity: number;
  weighted_avg_cost: number;
  mark: number;
  market_value: number;
  unrealized_pnl: number;
  realized_pnl: number;
  total_cost_basis: number;
  total_proceeds: number;
}

export interface WeightedAverageCostResponse {
  entries: WACEntry[];
}

export interface FeeEntry {
  id: string;
  ts_event: UnixNanos;
  date: string;
  fee_type: string;
  instrument?: string;
  amount: number;
  currency: string;
  order_id?: string;
}

export interface FeeTypeSummary {
  fee_type: string;
  total_amount: number;
  count: number;
}

export interface FeesReportResponse {
  entries: FeeEntry[];
  total_count: number;
  by_type: FeeTypeSummary[];
}

export interface EquityPoint {
  ts_event: UnixNanos;
  date: string;
  equity: number;
  cash: number;
  positions_value: number;
  unrealized_pnl: number;
  realized_pnl: number;
  drawdown: number;
  drawdown_pct: number;
}

export interface EquityCurveSummary {
  start_equity: number;
  end_equity: number;
  total_return: number;
  total_return_pct: number;
  max_drawdown: number;
  max_drawdown_pct: number;
  sharpe?: number;
}

export interface PortfolioValueChartResponse {
  points: EquityPoint[];
  summary: EquityCurveSummary;
}

export interface FillEntry {
  id: string;
  order_id: string;
  ts_event: UnixNanos;
  date: string;
  instrument: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  costs: number;
  currency: string;
}

export interface OrderFillsResponse {
  fills: FillEntry[];
  total_count: number;
}
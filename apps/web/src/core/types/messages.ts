// honba-fe — hand-written mirror of honba-kokoro-messages types
// Source: honba/schema/openapi/openapi.json (API_VERSION 1.0.0, SCHEMA_VERSION 4)
// Used by the thin typed client (core/api/client.ts) to avoid depending on generated code.

export const API_VERSION = '1.0.0';
export const SCHEMA_VERSION = 4;

export interface UnixNanos {
  /** Nanoseconds since epoch as a decimal string (avoids JS integer overflow). */
  unix_nanos: string;
  /** ISO-8601 fallback when string parsing fails. */
  iso?: string;
}

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

export interface Instrument {
  instrument_id: InstrumentId;
  /** Human-readable name (e.g., "TCS Ltd"). */
  name?: string;
  /** `equity` | `index` | `future` | `option` | ... */
  kind?: string;
  lot_size?: number;
  tick_size?: number;
  /** `true` if the instrument is tradable in the current session. */
  tradable?: boolean;
}

export interface QuoteTick {
  instrument_id: InstrumentId;
  ts_event: UnixNanos;
  bid_price?: number;
  bid_size?: number;
  ask_price?: number;
  ask_size?: number;
  last_price?: number;
  last_size?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  change_pct?: number;
}

export interface DepthLevel {
  price: number;
  size: number;
  order_count?: number;
}

export interface DepthResponse {
  instrument_id: InstrumentId;
  ts_event: UnixNanos;
  bids: DepthLevel[];
  asks: DepthLevel[];
}

export type OrderSideValue = 'buy' | 'sell';

export type OrderTypeValue = 'market' | 'limit' | 'stop_limit';

export type TimeInForceValue = 'day' | 'ioc' | 'gtc' | 'gtd';

export interface OrdersRequest {
  client_order_id: string;
  instrument_id: InstrumentId;
  side: OrderSideValue;
  type: OrderTypeValue;
  quantity: number;
  price?: number;
  trigger_price?: number;
  time_in_force?: TimeInForceValue;
  /** ISO date for GTD orders. */
  expire_date?: string;
  /** Strategy/order algo metadata (optional). */
  meta?: Record<string, unknown>;
}

export interface Order {
  order_id: string;
  client_order_id: string;
  instrument_id: InstrumentId;
  side: OrderSideValue;
  type: OrderTypeValue;
  quantity: number;
  price?: number;
  trigger_price?: number;
  filled_quantity: number;
  avg_fill_price?: number;
  status: 'open' | 'partial' | 'filled' | 'cancelled' | 'rejected' | 'expired';
  time_in_force: TimeInForceValue;
  expire_date?: string;
  ts_init: UnixNanos;
  ts_event: UnixNanos;
  meta?: Record<string, unknown>;
}

export interface PortfolioAccount {
  account_id: string;
  name: string;
  currency: string;
  mode: 'live' | 'sandbox' | 'paper';
  /** Total equity (cash + positions mark-to-market). */
  equity: number;
  /** Available cash for new orders. */
  available_cash: number;
  /** Initial deposit / capital. */
  initial_capital?: number;
}

export interface PortfolioPosition {
  instrument_id: InstrumentId;
  quantity: number;
  avg_price: number;
  current_price: number;
  unrealized_pnl: number;
  realized_pnl: number;
  market_value: number;
  side: 'long' | 'short';
  ts_open: UnixNanos;
}

export interface PortfolioPositionsResponse {
  positions: PortfolioPosition[];
}

export interface PortfolioSnapshot {
  accounts: PortfolioAccount[];
  positions: PortfolioPosition[];
  /** Totals across all accounts. */
  total_equity: number;
  total_unrealized_pnl: number;
  total_realized_pnl: number;
  total_cash: number;
}

export interface Trade {
  trade_id: string;
  order_id: string;
  instrument_id: InstrumentId;
  side: OrderSideValue;
  price: number;
  quantity: number;
  costs: { amount: number; currency: string };
  ts_event: UnixNanos;
  ts_init: UnixNanos;
}

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
  /** Metric key → value (e.g., "rsi": 65.2, "sma_20": 1500). */
  metrics: Record<string, number | string | null>;
  /** Optional sector/industry metadata for grouping/filtering. */
  sector?: string;
}

export interface ScreenerResponse {
  rows: ScreenerRow[];
  /** Metric keys returned for this scan. */
  metric_keys: string[];
}

export interface TradingState {
  /** Global kill switch — when `true`, new order placement is rejected. */
  trading_halted: boolean;
  /** Per-account overrides (optional). */
  accounts?: Record<string, { trading_halted: boolean }>;
  /** Max notional per order (in account currency). */
  max_notional_per_order?: number;
  /** Max position size per instrument (in lots). */
  max_position_per_instrument?: number;
  /** Max drawdown from peak equity (fraction, e.g., 0.1 = 10%). */
  max_drawdown_pct?: number;
  /** Max orders per minute per account. */
  max_order_rate_per_minute?: number;
}

export interface Profile {
  revision: number;
  preferences: Record<string, unknown>;
  layouts: Record<string, LayoutDocument>;
}

export interface LayoutDocument {
  version: number;
  /** Serialized dockview state. */
  document: unknown;
  updated_at: string;
}

export interface BacktestMetrics {
  total_return?: number;
  sharpe?: number;
  max_drawdown?: number;
  net_pnl?: number;
  trades?: number;
}

export interface BacktestResponse {
  run_id?: string;
  status?: 'idle' | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  metrics?: BacktestMetrics;
  error?: ErrorDetail | null;
  /** Validation badges (DSR/PBO) — server-side computed. */
  validation?: {
    dsr_passed?: boolean;
    pbo_passed?: boolean;
  };
  /** Assumptions the backtest engine did NOT model. */
  assumptions?: {
    not_modelled?: string[];
  };
  start_date?: string;
  end_date?: string;
}

export type RunStatus = 'idle' | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

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
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface BarsResponse {
  bars: Bar[];
}

export interface TradesResponse {
  trades: Trade[];
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
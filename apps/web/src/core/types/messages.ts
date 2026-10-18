// Batch H (docs/tasks.md): hand-written wire mirrors of the honba messages the FE consumes,
// transcribed from `honba/schema/openapi/openapi.json` (which is generated from the Rust
// `honba-kokoro-messages` crate) — the doc-gen'd-TS cutover from `honba-kao`/`honba`-codegen
// (plan.md §3.4) hasn't been pointed at honba-fe yet, so these stand in until it is. Keep this
// file a *mirror*: every type here must quote the schema file it came from and stay
// name-compatible with the wire (snake_case), so a future swap to generated types is a
// delete of this file, not a rename.
//
// Version pins are part of the contract: `ResponseEnvelope` rejects api/schema versions it
// wasn't built for (honba-kokoro-messages/src/api.rs), and this client validates the same axes.
// Pinned to what honba-ya currently serves: API_VERSION = "1.0.0", SCHEMA_VERSION = 4.
export const API_VERSION = '1.0.0';
export const SCHEMA_VERSION = 4;

// --- Shared scalars (openapi.json) -----------------------------------------------------------

/** `UnixNanos` — `{ iso, unix_nanos }` wire pair. */
export interface UnixNanos {
  iso: string;
  unix_nanos: string;
}

/** `Money` — integer minor units (paise for INR). */
export interface Money {
  amount: number;
  currency: string;
}

/** `Exchange` — a plain string (`NSE`, `BSE`, …). */
export type Exchange = string;

/** `InstrumentId` — symbol + exchange. */
export interface InstrumentId {
  exchange: Exchange;
  symbol: string;
}

/** Path form for endpoints taking `{id}` (`SYMBOL.EXCHANGE`; `parse_instrument_id` rsplit '.'). */
export function instrumentIdPath(id: InstrumentId): string {
  return `${id.symbol}.${id.exchange}`;
}

/** Canonical wire key for charts/stores (`exchange:symbol`); mirrors Rentropy-era conventions. */
export function instrumentIdKey(id: InstrumentId): string {
  return `${id.exchange}:${id.symbol}`;
}

// --- Market data (market.rs responses) -------------------------------------------------------

/** `QuoteTick` — top-of-book quote. */
export interface QuoteTick {
  instrument_id: InstrumentId;
  bid_price: number;
  bid_size: number;
  ask_price: number;
  ask_size: number;
  ts_event: UnixNanos;
  ts_init: UnixNanos;
}

/** `DepthLevel` — one price level of the book. */
export interface DepthLevel {
  price: number;
  size: number;
  /** Number of resting orders at the level; absent when the source doesn't track it. */
  orders?: number;
}

/** `GET /depth/{id}` response — bids best (highest) first, asks best (lowest) first. */
export interface DepthResponse {
  bids: DepthLevel[];
  asks: DepthLevel[];
}

/** Wire shape of a `GET /instruments` item (opaque to the server; see honba-ya-api/market.rs
 * `instrument_json`): id/kind/currency/lot_size/tick_size. */
export interface Instrument {
  id: InstrumentId;
  kind: 'equity' | 'etf' | 'bond' | 'ipo' | 'future' | 'option' | 'fx' | 'index' | 'mutual_fund' | 'other';
  currency: string;
  lot_size: number;
  tick_size: number;
}

// --- Orders (orders.rs) ----------------------------------------------------------------------

/** `OrderStatus` lifecycle enum. */
export type OrderStatus =
  | 'initialized'
  | 'submitted'
  | 'accepted'
  | 'partially_filled'
  | 'filled'
  | 'cancelled'
  | 'rejected'
  | 'expired';

/** `OrderSide` — includes the record-only `no_order_side`. */
export type OrderSide = 'buy' | 'sell' | 'no_order_side';

/** `OrderType` — the fixed five honba types (no algo catalog). */
export type OrderType = 'market' | 'limit' | 'stop_market' | 'stop_limit' | 'trailing_stop';

/** `TimeInForce` — note honba's `gtd` (the ui-core OrderForm's draft union has no gtd yet). */
export type TimeInForce = 'day' | 'gtc' | 'ioc' | 'fok' | 'gtd';

/** `Product` — the holding-period vocabulary (ADR 0010). */
export type Product = 'delivery' | 'intraday' | 'carry';

/** `POST /orders` request — `OrdersRequest` verbatim (idempotency key = client_order_id). */
export interface OrdersRequest {
  instrument_id?: InstrumentId | null;
  order_type?: OrderType | null;
  price?: number | null;
  qty?: number | null;
  side?: 'buy' | 'sell' | null;
  tif?: TimeInForce | null;
  client_order_id?: string | null;
}

/** `Order` row (`GET /orders` → `OrdersResponse`); schema-quoted field-for-field. */
export interface Order {
  order_id: string;
  instrument_id: InstrumentId;
  side: OrderSide;
  order_type: OrderType;
  status: OrderStatus;
  quantity: number;
  /** Cumulative filled qty (0 until a fill; omitted from the wire while 0 — ADR 0012 rule 1). */
  filled_qty?: number;
  price?: number | null;
  trigger_price?: number | null;
  trail_amount?: number | null;
  trail_percent?: number | null;
  avg_fill_price?: number | null;
  time_in_force?: TimeInForce;
  product?: Product | null;
  cancel_requested?: boolean;
  reject_reason?: { code: string; message: string } | null;
  filled_at?: UnixNanos | null;
  ts_event: UnixNanos;
  ts_init: UnixNanos;
}

// --- Positions & trades (portfolio.rs) -------------------------------------------------------

/** `PositionSide` — sign carried here, not in `quantity`. */
export type PositionSide = 'long' | 'short' | 'no_position_side';

/** `PortfolioPosition` — the valued open position (ADR 0032 §2). */
export interface PortfolioPosition {
  instrument_id: InstrumentId;
  side: PositionSide;
  /** Absolute quantity held. */
  quantity: number;
  avg_price: number;
  mark: number;
  market_value: Money;
  realized_pnl: Money;
  unrealized_pnl: Money;
  product: Product;
  group_name?: string | null;
  strategy_id?: string | null;
  tags?: string[];
}

/** `Trade` — a completed fill. */
export interface Trade {
  order_id: string;
  instrument_id: InstrumentId;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  costs: Money;
  ts_event: UnixNanos;
  ts_init: UnixNanos;
}

// --- Profile (profile.rs) --------------------------------------------------------------------

/** `GET/PUT /profile/layouts` — layouts by name, documents opaque to the server (dockview JSON). */
export type LayoutDocument = Record<string, unknown>;

/** `Profile` — everything stored for one user; revision is checked on `PUT` (optimistic). */
export interface Profile {
  layouts: Record<string, LayoutDocument>;
  modules: Record<string, unknown>;
  workbench: unknown;
  preferences: unknown;
  alerts: unknown;
  shortlist: string[];
  watchlists: Record<string, string[]>;
  revision: number;
}

// --- Engine (trading_state.rs) ---------------------------------------------------------------

/** `GET/PUT /trading-state` — active/reducing/halted operator switch. */
export type TradingState = 'active' | 'reducing' | 'halted';

// --- Errors & envelope (honba-kokoro-messages/src/{api,errors}.rs) ---------------------------

/** `ErrorDetail` — every failure, REST responses and envelopes alike. */
export interface ErrorDetail {
  code: string;
  message: string;
  retryable: boolean;
  context?: unknown;
}

/** `StreamFrame` (streams.rs): SSE frames on `GET /backtests/{id}/events`. */
export type StreamFrame =
  | { status: { status: string; seq: number; error?: ErrorDetail | null }; seq: number; kind: 'status' }
  | { seq: number; message: unknown; kind: 'record' };

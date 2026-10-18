// Fixture data for the component dashboard's live demos. Everything here is static demo data
// shaped after honba's REST API payloads (the same wire shapes the ui-core row types mirror) —
// no live backend is involved. When a real feature (Batch H/I) wires these same components up,
// it replaces this file with honba's `core/api` + `core/ws` data.
import type {
  BacktestConfig,
  BalancesTableProps,
  InstrumentId,
  MarketOption,
  OrdersTableProps,
  PerformanceMetric,
  PositionRow,
  PriceLevel,
  StrategyListItem,
  StrategyTradeRow,
  Trade,
} from '@honba/ui-core';

export const REUTERS: InstrumentId = { exchange: 'NSE', symbol: 'RELIANCE' };

export const inr = (amount: number) => ({ amount, currency: 'INR' });

// --- OrderBook / OrderBookPanel -------------------------------------------------------------
// bids sorted best-first (descending), asks best-first (ascending) — the contract
// `OrderBook` documents on `OrderBookData` (it does not re-sort).
function buildSide(best: number, step: number, sizes: number[], descending: boolean): PriceLevel[] {
  return sizes.map((size, i) => ({
    price: descending ? best - i * step : best + i * step,
    size,
  }));
}

const BID_SIZES = [1200, 800, 2400, 400, 1600, 950, 2100, 600];
const ASK_SIZES = [900, 1500, 700, 2600, 1100, 500, 1800, 1300];

export const orderBookData = {
  bids: buildSide(2985.55, 0.05, BID_SIZES, true),
  asks: buildSide(2985.95, 0.05, ASK_SIZES, false),
};

// --- OrdersTable / OrdersTablePanel ----------------------------------------------------------
// Mix of working + terminal statuses so the `statusFilter` states are all visible.
export const ordersFixture: OrdersTableProps['rows'] = [
  {
    order_id: 'ORD-182',
    instrument_id: REUTERS,
    side: 'buy',
    order_type: 'limit',
    status: 'submitted',
    quantity: 100,
    price: 2980,
    time_in_force: 'day',
  },
  {
    order_id: 'ORD-183',
    instrument_id: { exchange: 'NSE', symbol: 'TCS' },
    side: 'sell',
    order_type: 'market',
    status: 'accepted',
    quantity: 25,
    time_in_force: 'ioc',
    cancel_requested: true,
  },
  {
    order_id: 'ORD-184',
    instrument_id: { exchange: 'NSE', symbol: 'INFY' },
    side: 'buy',
    order_type: 'stop_market',
    status: 'partially_filled',
    quantity: 200,
    filled_qty: 80,
    trigger_price: 1520,
    time_in_force: 'gtc',
  },
  {
    order_id: 'ORD-171',
    instrument_id: REUTERS,
    side: 'buy',
    order_type: 'market',
    status: 'filled',
    quantity: 50,
    filled_qty: 50,
    avg_fill_price: 2978.4,
    time_in_force: 'day',
    filled_at: '2026-10-16T09:31:12Z',
  },
  {
    order_id: 'ORD-175',
    instrument_id: { exchange: 'BSE', symbol: 'SBIN' },
    side: 'sell',
    order_type: 'limit',
    status: 'cancelled',
    quantity: 150,
    price: 812,
    time_in_force: 'day',
  },
  {
    order_id: 'ORD-176',
    instrument_id: { exchange: 'NSE', symbol: 'HDFCBANK' },
    side: 'buy',
    order_type: 'limit',
    status: 'rejected',
    quantity: 75,
    price: 1745,
    time_in_force: 'day',
  },
];

// --- PositionsTable / PositionsTablePanel -----------------------------------------------------
export const positionsFixture: PositionRow[] = [
  {
    instrument_id: REUTERS,
    side: 'long',
    quantity: 350,
    avg_price: 2961.2,
    mark: 2985.55,
    market_value: inr(104494250),
    realized_pnl: inr(1245000),
    unrealized_pnl: inr(8522500),
    product: 'intraday',
    group_name: 'core-nifty',
  },
  {
    instrument_id: { exchange: 'NSE', symbol: 'TCS' },
    side: 'short',
    quantity: 120,
    avg_price: 4102.5,
    mark: 4075.1,
    market_value: inr(489012000),
    realized_pnl: inr(-82000),
    unrealized_pnl: inr(3288000),
    product: 'intraday',
  },
  {
    instrument_id: { exchange: 'NSE', symbol: 'NIFTY24OCT24500CE' },
    side: 'long',
    quantity: 400,
    avg_price: 112.4,
    mark: 134.85,
    market_value: inr(53940000),
    realized_pnl: inr(0),
    unrealized_pnl: inr(898000),
    product: 'carry',
    group_name: 'option-scalp',
  },
  {
    instrument_id: { exchange: 'NSE', symbol: 'SBIN' },
    side: 'long',
    quantity: 0,
    avg_price: 808.1,
    realized_pnl: inr(-14500),
    product: 'delivery',
  },
];

// --- BalancesTable / BalancesTablePanel ----------------------------------------------------
export const balancesFixture: BalancesTableProps['rows'] = [
  {
    id: 'acc-main',
    name: 'Main trading account',
    broker: 'adapter-zerodha',
    mode: 'live',
    currency: 'INR',
    cash: inr(125400000),
    equity: inr(4891200000),
    leverage: 1.8,
    realized_pnl: inr(21405000),
    unrealized_pnl: inr(14773000),
    holdings: [
      {
        instrument_id: REUTERS,
        quantity: 3500,
        avg_price: 2870.1,
        mark: 2985.55,
        market_value: inr(10449425000),
        realized_pnl: inr(0),
        unrealized_pnl: inr(404175000),
        group_name: 'core',
        tags: ['nifty50'],
      },
      {
        instrument_id: { exchange: 'NSE', symbol: 'HDFCBANK' },
        quantity: 1200,
        avg_price: 1698.45,
        mark: 1744.9,
        market_value: inr(2093880000),
        realized_pnl: inr(0),
        unrealized_pnl: inr(55740000),
        tags: ['nifty50'],
      },
      {
        instrument_id: { exchange: 'NSE', symbol: 'ITC' },
        quantity: 8000,
        avg_price: 402.1,
        mark: 415.35,
        market_value: inr(3322800000),
        realized_pnl: inr(0),
        unrealized_pnl: inr(106000000),
      },
    ],
    greeks: null,
  },
  {
    id: 'acc-paper',
    name: 'Paper account',
    broker: null,
    mode: 'sandbox',
    currency: 'INR',
    cash: inr(1000000000),
    equity: inr(1002340000),
    leverage: 0.5,
    realized_pnl: inr(-1420000),
    unrealized_pnl: inr(2340000),
    holdings: [
      {
        instrument_id: { exchange: 'NSE', symbol: 'NIFTY24OCT24500CE' },
        quantity: 4000,
        avg_price: 108.2,
        mark: 134.85,
        market_value: inr(539400000),
        realized_pnl: inr(0),
        unrealized_pnl: inr(106600000),
      },
    ],
    greeks: { delta: 2120, gamma: 3.4, theta: -18400, vega: 91500 },
  },
];

// --- TradesTablePanel -------------------------------------------------------------------------
export const tradesFixture: Trade[] = [
  {
    order_id: 'ORD-171',
    instrument_id: REUTERS,
    side: 'buy',
    quantity: 50,
    price: 2978.4,
    costs: inr(1489.2),
    ts_event: { iso: '2026-10-16T09:31:12Z', unix_nanos: '1760609472000000000' },
    ts_init: { iso: '2026-10-16T09:31:12Z', unix_nanos: '1760609472000000000' },
  },
  {
    order_id: 'ORD-168',
    instrument_id: { exchange: 'NSE', symbol: 'TCS' },
    side: 'sell',
    quantity: 120,
    price: 4108.75,
    costs: inr(2465.25),
    ts_event: { iso: '2026-10-16T10:02:44Z', unix_nanos: '1760611364000000000' },
  },
  {
    order_id: 'ORD-169',
    instrument_id: { exchange: 'NSE', symbol: 'NIFTY24OCT24500CE' },
    side: 'buy',
    quantity: 400,
    price: 112.4,
    costs: inr(449.6),
    ts_event: { iso: '2026-10-16T10:15:03Z', unix_nanos: '1760612103000000000' },
  },
  {
    order_id: 'ORD-163',
    instrument_id: REUTERS,
    side: 'buy',
    quantity: 80,
    price: 2971.15,
    costs: inr(2377.0),
    ts_event: { iso: '2026-10-15T09:45:51Z', unix_nanos: '1760523351000000000' },
  },
  {
    order_id: 'ORD-158',
    instrument_id: { exchange: 'BSE', symbol: 'SBIN' },
    side: 'sell',
    quantity: 150,
    price: 811.6,
    costs: inr(1218.0),
    ts_event: { iso: '2026-10-14T15:14:09Z', unix_nanos: '1760447649000000000' },
  },
];

// --- MarketSelect / ChartPanel -----------------------------------------------------------------
export const marketsFixture: MarketOption[] = [
  { symbol: 'RELIANCE', exchange: 'NSE' },
  { symbol: 'TCS', exchange: 'NSE' },
  { symbol: 'INFY', exchange: 'NSE' },
  { symbol: 'SBIN', exchange: 'BSE' },
  { symbol: 'HDFCBANK', exchange: 'NSE' },
  { symbol: 'NIFTY24OCT24500CE', exchange: 'NFO' },
];

// --- PerformanceMetrics ---------------------------------------------------------------------------
// Already-computed rows (the calling feature derives these from `GET /backtests/{id}` result
// fields and assigns the tones; the component only renders them).
export const strategyMetricsFixture: PerformanceMetric[] = [
  { label: 'Total P&L', value: '+₹18,40,842', tone: 'positive' },
  { label: 'Profit factor', value: '1.82', tone: 'positive' },
  { label: 'Win rate', value: '61.4%' },
  { label: 'Sharpe', value: '1.76' },
  { label: 'Sortino', value: '2.31' },
  { label: 'Max drawdown', value: '-₹4,82,300 (-4.9%)', tone: 'negative' },
  { label: 'Trades', value: '87 (5 open)' },
  { label: 'Avg trade', value: '+₹21,158', tone: 'positive' },
  { label: 'Costs paid', value: '₹1,26,904' },
];

// --- StrategyTradesTable ----------------------------------------------------------------------------
// Closed round trips + one still-open trade (no closedAt/closingPrice — renders as dashes).
export const strategyTradesFixture: StrategyTradeRow[] = [
  {
    id: '1',
    entryAt: '2026-10-15T09:45:51Z',
    closedAt: '2026-10-16T10:02:44Z',
    entryPrice: 2971.15,
    closingPrice: 2985.55,
    amount: 50,
    realizedPnl: 7200,
    side: 'long',
    orderId: 'ORD-171',
    orderType: 'market',
  },
  {
    id: '2',
    entryAt: '2026-10-15T11:15:00Z',
    entryPrice: 4102.5,
    closingPrice: null,
    amount: -120,
    realizedPnl: -980,
    side: 'short',
    orderId: 'ORD-188',
    orderType: 'limit',
  },
  {
    id: '3',
    entryAt: '2026-10-16T09:31:12Z',
    closedAt: '2026-10-16T13:40:02Z',
    entryPrice: 112.4,
    closingPrice: 134.85,
    amount: 400,
    realizedPnl: 8980,
    side: 'long',
    orderId: 'ORD-193',
    orderType: 'market',
  },
];

// --- StrategiesListTable ---------------------------------------------------------------------------
export const strategiesListFixture: StrategyListItem[] = [
  {
    id: 's1',
    name: 'momentum-breakout',
    instrument: 'NSE:RELIANCE',
    kind: 'active',
    startedOn: '2026-10-16T09:15:00Z',
    profitFactor: 1.82,
    pnl: 1840842,
    strategyType: 'graph',
  },
  {
    id: 's2',
    name: 'alpha30-equalweight',
    instrument: 'NSE:alpha30',
    kind: 'active',
    startedOn: '2026-10-15T09:20:00Z',
    profitFactor: 1.24,
    pnl: 3288000,
    strategyType: 'portfolio',
  },
  {
    id: 's3',
    name: 'rsi-reversal',
    instrument: 'NSE:TCS',
    kind: 'past',
    startedOn: '2026-10-01T09:30:00Z',
    stoppedOn: '2026-10-14T15:30:00Z',
    profitFactor: 0.91,
    pnl: -82000,
    strategyType: 'code',
  },
  {
    id: 's4',
    name: 'intraday-cpr-bounce',
    instrument: 'NSE:SBIN',
    kind: 'past',
    startedOn: '2026-09-20T09:30:00Z',
    stoppedOn: '2026-09-24T15:30:00Z',
    profitFactor: 1.09,
    pnl: 14500,
    strategyType: 'code',
  },
  {
    id: 's5',
    name: 'graph-2026-10-16-sweep-best',
    instrument: 'NSE:RELIANCE',
    kind: 'saved',
    savedOn: '2026-10-16T18:05:00Z',
    strategyType: 'graph',
  },
  {
    id: 's6',
    name: 'sma-crossover-tuned',
    instrument: 'NSE:INFY',
    kind: 'saved',
    savedOn: '2026-10-12T11:42:00Z',
    strategyType: 'code',
  },
];

// --- BacktestOptionsPanel ----------------------------------------------------------------------------
export const backtestConfigFixture: BacktestConfig = {
  symbol: 'NSE:RELIANCE',
  timeframe: '1d',
  from: '2026-04-01',
  to: '2026-10-16',
  capital: 100000000,
  positionMode: 'neutral',
};


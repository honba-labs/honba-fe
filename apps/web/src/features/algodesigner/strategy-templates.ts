// Strategy Templates - pre-built strategy graphs
// Mirrors honba-frontend core/designer/strategy-templates.ts

import type { StrategyGraphShape } from './nodes/types';
import { defaultGraph } from './model';

export interface StrategyTemplate {
  name: string;
  label: string;
  category: string;
  nodes: number;
  description: string;
  graph: StrategyGraphShape;
}

// Simple SMA Cross (default)
const smaCrossGraph: StrategyGraphShape = {
  schema_version: 1,
  name: 'sma_cross',
  universe: { explicit: [{ symbol: 'TCS', exchange: 'NSE' }] },
  driving_timeframe: { interval: 1, aggregation: 'minute' },
  warmup_bars: 2,
  subscriptions: { quotes: false, trades: false },
  nodes: [
    { id: 'n1', type: 'universe', label: 'Universe' },
    { id: 'f', type: 'indicator', indicator: 'sma', label: 'Fast SMA', params: { period: 5 } },
    { id: 's', type: 'indicator', indicator: 'sma', label: 'Slow SMA', params: { period: 20 } },
    { id: 'c', type: 'condition', label: 'Cross', params: { op: 'crosses_above' } },
    { id: 'o', type: 'order', label: 'Entry Long', params: { side: 'buy', quantity: 1 } },
  ],
  edges: [
    { id: 'e1', from_node: 'n1', from_port: 'bars', to_node: 'f', to_port: 'input' },
    { id: 'e2', from_node: 'n1', from_port: 'bars', to_node: 's', to_port: 'input' },
    { id: 'e3', from_node: 'f', from_port: 'value', to_node: 'c', to_port: 'left' },
    { id: 'e4', from_node: 's', from_port: 'value', to_node: 'c', to_port: 'right' },
    { id: 'e5', from_node: 'c', from_port: 'signal', to_node: 'o', to_port: 'signal' },
  ],
};

// EMA Trend Follow
const emaTrendGraph: StrategyGraphShape = {
  schema_version: 1,
  name: 'ema_trend',
  universe: { explicit: [{ symbol: 'RELIANCE', exchange: 'NSE' }] },
  driving_timeframe: { interval: 5, aggregation: 'minute' },
  warmup_bars: 5,
  subscriptions: { quotes: false, trades: false },
  nodes: [
    { id: 'n1', type: 'universe', label: 'Universe' },
    { id: 'fast', type: 'indicator', indicator: 'ema', label: 'Fast EMA', params: { period: 9 } },
    { id: 'slow', type: 'indicator', indicator: 'ema', label: 'Slow EMA', params: { period: 21 } },
    { id: 'c', type: 'condition', label: 'Trend Up', params: { op: 'gt' } },
    { id: 'buy', type: 'order', label: 'Buy', params: { side: 'buy', quantity: 1 } },
    { id: 'sell', type: 'order', label: 'Sell', params: { side: 'sell', quantity: 1 } },
    { id: 'c2', type: 'condition', label: 'Trend Down', params: { op: 'lt' } },
  ],
  edges: [
    { id: 'e1', from_node: 'n1', from_port: 'bars', to_node: 'fast', to_port: 'input' },
    { id: 'e2', from_node: 'n1', from_port: 'bars', to_node: 'slow', to_port: 'input' },
    { id: 'e3', from_node: 'fast', from_port: 'value', to_node: 'c', to_port: 'left' },
    { id: 'e4', from_node: 'slow', from_port: 'value', to_node: 'c', to_port: 'right' },
    { id: 'e5', from_node: 'c', from_port: 'signal', to_node: 'buy', to_port: 'signal' },
    { id: 'e6', from_node: 'fast', from_port: 'value', to_node: 'c2', to_port: 'left' },
    { id: 'e7', from_node: 'slow', from_port: 'value', to_node: 'c2', to_port: 'right' },
    { id: 'e8', from_node: 'c2', from_port: 'signal', to_node: 'sell', to_port: 'signal' },
  ],
};

// RSI Mean Reversion
const rsiMeanReversionGraph: StrategyGraphShape = {
  schema_version: 1,
  name: 'rsi_mr',
  universe: { explicit: [{ symbol: 'INFY', exchange: 'NSE' }] },
  driving_timeframe: { interval: 15, aggregation: 'minute' },
  warmup_bars: 14,
  subscriptions: { quotes: false, trades: false },
  nodes: [
    { id: 'n1', type: 'universe', label: 'Universe' },
    { id: 'rsi', type: 'indicator', indicator: 'rsi', label: 'RSI 14', params: { period: 14 } },
    { id: 'oversold', type: 'condition', label: 'Oversold (< 30)', params: { op: 'lt', threshold: 30 } },
    { id: 'overbought', type: 'condition', label: 'Overbought (> 70)', params: { op: 'gt', threshold: 70 } },
    { id: 'buy', type: 'order', label: 'Buy (Oversold)', params: { side: 'buy', quantity: 1 } },
    { id: 'sell', type: 'order', label: 'Sell (Overbought)', params: { side: 'sell', quantity: 1 } },
  ],
  edges: [
    { id: 'e1', from_node: 'n1', from_port: 'bars', to_node: 'rsi', to_port: 'input' },
    { id: 'e2', from_node: 'rsi', from_port: 'value', to_node: 'oversold', to_port: 'left' },
    { id: 'e3', from_node: 'rsi', from_port: 'value', to_node: 'overbought', to_port: 'left' },
    { id: 'e4', from_node: 'oversold', from_port: 'signal', to_node: 'buy', to_port: 'signal' },
    { id: 'e5', from_node: 'overbought', from_port: 'signal', to_node: 'sell', to_port: 'signal' },
  ],
};

// MACD Trend + RSI Filter
const macdRsiGraph: StrategyGraphShape = {
  schema_version: 1,
  name: 'macd_rsi',
  universe: { explicit: [{ symbol: 'HDFCBANK', exchange: 'NSE' }] },
  driving_timeframe: { interval: 30, aggregation: 'minute' },
  warmup_bars: 26,
  subscriptions: { quotes: false, trades: false },
  nodes: [
    { id: 'n1', type: 'universe', label: 'Universe' },
    { id: 'macd', type: 'indicator', indicator: 'macd', label: 'MACD', params: { fast: 12, slow: 26, signal: 9 } },
    { id: 'rsi', type: 'indicator', indicator: 'rsi', label: 'RSI 14', params: { period: 14 } },
    { id: 'macd_cross', type: 'condition', label: 'MACD Cross Up', params: { op: 'crosses_above' } },
    { id: 'rsi_filter', type: 'condition', label: 'RSI < 70', params: { op: 'lt', threshold: 70 } },
    { id: 'and', type: 'logic', label: 'AND', params: { op: 'and' } },
    { id: 'buy', type: 'order', label: 'Buy', params: { side: 'buy', quantity: 1 } },
  ],
  edges: [
    { id: 'e1', from_node: 'n1', from_port: 'bars', to_node: 'macd', to_port: 'input' },
    { id: 'e2', from_node: 'n1', from_port: 'bars', to_node: 'rsi', to_port: 'input' },
    { id: 'e3', from_node: 'macd', from_port: 'macd', to_node: 'macd_cross', to_port: 'left' },
    { id: 'e4', from_node: 'macd', from_port: 'signal', to_node: 'macd_cross', to_port: 'right' },
    { id: 'e5', from_node: 'rsi', from_port: 'value', to_node: 'rsi_filter', to_port: 'left' },
    { id: 'e6', from_node: 'macd_cross', from_port: 'signal', to_node: 'and', to_port: 'a' },
    { id: 'e7', from_node: 'rsi_filter', from_port: 'signal', to_node: 'and', to_port: 'b' },
    { id: 'e8', from_node: 'and', from_port: 'signal', to_node: 'buy', to_port: 'signal' },
  ],
};

// Bollinger Band Breakout
const bollingerBreakoutGraph: StrategyGraphShape = {
  schema_version: 1,
  name: 'bb_breakout',
  universe: { explicit: [{ symbol: 'ICICIBANK', exchange: 'NSE' }] },
  driving_timeframe: { interval: 15, aggregation: 'minute' },
  warmup_bars: 20,
  subscriptions: { quotes: false, trades: false },
  nodes: [
    { id: 'n1', type: 'universe', label: 'Universe' },
    { id: 'bb', type: 'indicator', indicator: 'bollinger', label: 'Bollinger Bands', params: { length: 20, std: 2.0 } },
    { id: 'upper_break', type: 'condition', label: 'Break Upper', params: { op: 'crosses_above' } },
    { id: 'lower_break', type: 'condition', label: 'Break Lower', params: { op: 'crosses_below' } },
    { id: 'buy', type: 'order', label: 'Buy Breakout', params: { side: 'buy', quantity: 1 } },
    { id: 'sell', type: 'order', label: 'Sell Breakdown', params: { side: 'sell', quantity: 1 } },
  ],
  edges: [
    { id: 'e1', from_node: 'n1', from_port: 'bars', to_node: 'bb', to_port: 'input' },
    { id: 'e2', from_node: 'bb', from_port: 'upper', to_node: 'upper_break', to_port: 'left' },
    { id: 'e3', from_node: 'n1', from_port: 'bars', to_node: 'upper_break', to_port: 'right' },
    { id: 'e4', from_node: 'bb', from_port: 'lower', to_node: 'lower_break', to_port: 'right' },
    { id: 'e5', from_node: 'n1', from_port: 'bars', to_node: 'lower_break', to_port: 'left' },
    { id: 'e6', from_node: 'upper_break', from_port: 'signal', to_node: 'buy', to_port: 'signal' },
    { id: 'e7', from_node: 'lower_break', from_port: 'signal', to_node: 'sell', to_port: 'signal' },
  ],
};

// ATR Trailing Stop Trend
const atrTrailingGraph: StrategyGraphShape = {
  schema_version: 1,
  name: 'atr_trailing',
  universe: { explicit: [{ symbol: 'BAJFINANCE', exchange: 'NSE' }] },
  driving_timeframe: { interval: 60, aggregation: 'minute' },
  warmup_bars: 14,
  subscriptions: { quotes: false, trades: false },
  nodes: [
    { id: 'n1', type: 'universe', label: 'Universe' },
    { id: 'ema', type: 'indicator', indicator: 'ema', label: 'EMA 200', params: { period: 200 } },
    { id: 'atr', type: 'indicator', indicator: 'atr', label: 'ATR 14', params: { period: 14 } },
    { id: 'trend_up', type: 'condition', label: 'Price > EMA', params: { op: 'gt' } },
    { id: 'trailing', type: 'risk', label: 'ATR Trailing Stop', params: { max_drawdown: 0.03 } },
    { id: 'buy', type: 'order', label: 'Buy', params: { side: 'buy', quantity: 1 } },
    { id: 'sz', type: 'sizing', label: 'Vol Sizing', params: { mode: 'percent_equity', value: 10 } },
  ],
  edges: [
    { id: 'e1', from_node: 'n1', from_port: 'bars', to_node: 'ema', to_port: 'input' },
    { id: 'e2', from_node: 'n1', from_port: 'bars', to_node: 'atr', to_port: 'input' },
    { id: 'e3', from_node: 'n1', from_port: 'bars', to_node: 'trend_up', to_port: 'left' },
    { id: 'e4', from_node: 'ema', from_port: 'value', to_node: 'trend_up', to_port: 'right' },
    { id: 'e5', from_node: 'trend_up', from_port: 'signal', to_node: 'trailing', to_port: 'signal' },
    { id: 'e6', from_node: 'trailing', from_port: 'signal', to_node: 'sz', to_port: 'signal' },
    { id: 'e7', from_node: 'sz', from_port: 'size', to_node: 'buy', to_port: 'size' },
    { id: 'e8', from_node: 'trailing', from_port: 'signal', to_node: 'buy', to_port: 'signal' },
  ],
};

export const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  {
    name: 'sma_cross',
    label: 'SMA Cross (Classic)',
    category: 'trend',
    nodes: 5,
    description: 'Classic dual-SMA crossover. Fast crosses above slow = buy. Good for trending markets.',
    graph: smaCrossGraph,
  },
  {
    name: 'ema_trend',
    label: 'EMA Trend Follow',
    category: 'trend',
    nodes: 7,
    description: 'Dual-EMA trend following with both long and short signals. Faster than SMA.',
    graph: emaTrendGraph,
  },
  {
    name: 'rsi_mr',
    label: 'RSI Mean Reversion',
    category: 'mean_reversion',
    nodes: 6,
    description: 'RSI-based mean reversion. Buys oversold (<30), sells overbought (>70). Best in ranging markets.',
    graph: rsiMeanReversionGraph,
  },
  {
    name: 'macd_rsi',
    label: 'MACD + RSI Filter',
    category: 'trend',
    nodes: 7,
    description: 'MACD crossover confirmed by RSI filter. Reduces whipsaws in choppy conditions.',
    graph: macdRsiGraph,
  },
  {
    name: 'bb_breakout',
    label: 'Bollinger Band Breakout',
    category: 'breakout',
    nodes: 7,
    description: 'Price breaking Bollinger bands. Captures volatility expansion moves.',
    graph: bollingerBreakoutGraph,
  },
  {
    name: 'atr_trailing',
    label: 'ATR Trailing Stop Trend',
    category: 'volatility',
    nodes: 8,
    description: 'Long-term EMA trend filter with ATR-based trailing stop and volatility position sizing.',
    graph: atrTrailingGraph,
  },
];
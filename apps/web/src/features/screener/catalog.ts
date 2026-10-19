import type { TimeframeValue } from '../../core/types/messages';

export interface MetricDefinition {
  key: string;
  label: string;
  description?: string;
  group?: 'Price & Momentum' | 'Moving Averages' | 'Oscillators' | 'Volatility' | 'Volume' | 'Valuation';
  defaultTimeframe?: TimeframeValue;
}

export const DEFAULT_TIMEFRAMES: TimeframeValue[] = [
  '1m',
  '5m',
  '15m',
  '30m',
  '1h',
  '4h',
  '1d',
  '1w',
];

export const UNIVERSE_PRESETS: { id: string; label: string; instruments: string[] }[] = [
  {
    id: 'nifty50',
    label: 'NIFTY 50 Bluechips',
    instruments: [
      'NSE:RELIANCE',
      'NSE:TCS',
      'NSE:HDFCBANK',
      'NSE:INFY',
      'NSE:ICICIBANK',
      'NSE:BHARTIARTL',
      'NSE:SBIN',
      'NSE:ITC',
      'NSE:LICI',
      'NSE:HINDUNILVR',
      'NSE:LT',
      'NSE:BAJFINANCE',
      'NSE:HCLTECH',
      'NSE:MARUTI',
      'NSE:SUNPHARMA',
      'NSE:TATAMOTORS',
      'NSE:KOTAKBANK',
      'NSE:TITAN',
      'NSE:ONGC',
      'NSE:NTPC',
    ],
  },
  {
    id: 'niftybank',
    label: 'NIFTY Bank',
    instruments: [
      'NSE:HDFCBANK',
      'NSE:ICICIBANK',
      'NSE:SBIN',
      'NSE:KOTAKBANK',
      'NSE:AXISBANK',
      'NSE:INDUSINDBK',
      'NSE:BANKBARODA',
      'NSE:PNB',
      'NSE:AUBANK',
      'NSE:FEDERALBNK',
      'NSE:IDFCFIRSTB',
      'NSE:BANDHANBNK',
    ],
  },
  {
    id: 'niftyit',
    label: 'NIFTY IT',
    instruments: [
      'NSE:TCS',
      'NSE:INFY',
      'NSE:HCLTECH',
      'NSE:WIPRO',
      'NSE:TECHM',
      'NSE:LTIM',
      'NSE:PERSISTENT',
      'NSE:COFORGE',
      'NSE:MPHASIS',
      'NSE:LTTS',
    ],
  },
  {
    id: 'niftyauto',
    label: 'NIFTY Auto',
    instruments: [
      'NSE:TATAMOTORS',
      'NSE:MARUTI',
      'NSE:M&M',
      'NSE:BAJAJ-AUTO',
      'NSE:EICHERMOT',
      'NSE:HEROMOTOCO',
      'NSE:TVSMOTOR',
      'NSE:BHARATFORG',
    ],
  },
  {
    id: 'fo_heavyweights',
    label: 'F&O Liquid Top 15',
    instruments: [
      'NSE:RELIANCE',
      'NSE:HDFCBANK',
      'NSE:ICICIBANK',
      'NSE:INFY',
      'NSE:TCS',
      'NSE:SBIN',
      'NSE:BHARTIARTL',
      'NSE:LT',
      'NSE:BAJFINANCE',
      'NSE:TATAMOTORS',
      'NSE:AXISBANK',
      'NSE:MARUTI',
      'NSE:ITC',
      'NSE:SUNPHARMA',
      'NSE:KOTAKBANK',
    ],
  },
];

export const MetricCatalog: MetricDefinition[] = [
  // Price & Momentum
  {
    key: 'close',
    label: 'Last Traded Price (LTP)',
    description: 'Latest closing or last traded price of the asset',
    group: 'Price & Momentum',
    defaultTimeframe: '1d',
  },
  {
    key: 'change_pct_1d',
    label: '1D % Change',
    description: 'Percentage change over previous trading session',
    group: 'Price & Momentum',
    defaultTimeframe: '1d',
  },
  {
    key: 'change_pct_1w',
    label: '1W % Change',
    description: 'Weekly percentage return',
    group: 'Price & Momentum',
    defaultTimeframe: '1w',
  },
  {
    key: 'change_pct_1m',
    label: '1M % Change',
    description: 'Monthly percentage return',
    group: 'Price & Momentum',
    defaultTimeframe: '1d',
  },
  {
    key: 'ath_drawdown_pct',
    label: 'Drawdown from 52W High (%)',
    description: 'Percentage drop from 52-week peak',
    group: 'Price & Momentum',
    defaultTimeframe: '1d',
  },

  // Oscillators
  {
    key: 'rsi_14',
    label: 'RSI (14)',
    description: 'Relative Strength Index (standard 14-period)',
    group: 'Oscillators',
    defaultTimeframe: '1d',
  },
  {
    key: 'rsi_oversold_30',
    label: 'RSI < 30 (Oversold)',
    description: 'Oversold condition trigger when RSI drops below 30',
    group: 'Oscillators',
    defaultTimeframe: '1d',
  },
  {
    key: 'macd',
    label: 'MACD (12, 26, 9)',
    description: 'Moving Average Convergence Divergence line',
    group: 'Oscillators',
    defaultTimeframe: '1d',
  },
  {
    key: 'macd_signal',
    label: 'MACD Signal',
    description: '9-period exponential moving average of MACD',
    group: 'Oscillators',
    defaultTimeframe: '1d',
  },

  // Moving Averages
  {
    key: 'ema_20',
    label: 'EMA 20',
    description: '20-period Exponential Moving Average',
    group: 'Moving Averages',
    defaultTimeframe: '1d',
  },
  {
    key: 'ema_50',
    label: 'EMA 50',
    description: '50-period Exponential Moving Average (medium term trend)',
    group: 'Moving Averages',
    defaultTimeframe: '1d',
  },
  {
    key: 'ema_200',
    label: 'EMA 200',
    description: '200-period Exponential Moving Average (long term trend benchmark)',
    group: 'Moving Averages',
    defaultTimeframe: '1d',
  },
  {
    key: 'golden_cross',
    label: 'Golden Cross (50 EMA > 200 EMA)',
    description: 'Bullish trend filter where 50 EMA is above 200 EMA',
    group: 'Moving Averages',
    defaultTimeframe: '1d',
  },
  {
    key: 'vwap',
    label: 'VWAP',
    description: 'Volume Weighted Average Price for the session',
    group: 'Moving Averages',
    defaultTimeframe: '5m',
  },

  // Volatility
  {
    key: 'bb_upper',
    label: 'Bollinger Upper Band (20, 2)',
    description: 'Upper boundary for volatility expansion',
    group: 'Volatility',
    defaultTimeframe: '1d',
  },
  {
    key: 'bb_lower',
    label: 'Bollinger Lower Band (20, 2)',
    description: 'Lower boundary for mean reversion',
    group: 'Volatility',
    defaultTimeframe: '1d',
  },
  {
    key: 'atr_14',
    label: 'Average True Range (14)',
    description: '14-period Average True Range measure of volatility',
    group: 'Volatility',
    defaultTimeframe: '1d',
  },

  // Volume
  {
    key: 'volume',
    label: 'Trading Volume',
    description: 'Total shares traded during the period',
    group: 'Volume',
    defaultTimeframe: '1d',
  },
  {
    key: 'volume_surge_2x',
    label: 'Volume Surge > 2x Avg',
    description: 'Volume exceeding 200% of 20-day average volume',
    group: 'Volume',
    defaultTimeframe: '1d',
  },
  {
    key: 'turnover_cr',
    label: 'Turnover (₹ Crores)',
    description: 'Gross traded value in Crores',
    group: 'Volume',
    defaultTimeframe: '1d',
  },

  // Valuation
  {
    key: 'pe_ratio',
    label: 'P/E Ratio',
    description: 'Price to Earnings ratio',
    group: 'Valuation',
    defaultTimeframe: '1d',
  },
  {
    key: 'market_cap_cr',
    label: 'Market Cap (₹ Crores)',
    description: 'Total market capitalization in ₹ Crores',
    group: 'Valuation',
    defaultTimeframe: '1d',
  },
];

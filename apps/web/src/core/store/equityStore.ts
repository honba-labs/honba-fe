import { create } from 'zustand';
import { useNotifications } from './notifications';

export interface EquityInstrument {
  symbol: string;
  name: string;
  exchange: 'NSE' | 'BSE' | 'NASDAQ' | 'NYSE';
  ticker: string; // e.g. "NSE:RELIANCE"
  price: number;
  currency: 'INR' | 'USD';
  change24h: number;
  change1h: number;
  change7d: number;
  high24h: number;
  low24h: number;
  vwap: number;
  volShares: number;
  turnoverCr: number;
  marketCapCr: number;
  sector: string;
  peRatio: number;
  sparkline: number[];
  color: string;
  isWatchlist?: boolean;
}

export interface EquityHolding {
  symbol: string;
  name: string;
  exchange: string;
  ticker: string;
  quantity: number;
  available: number;
  inOrders: number;
  avgBuyPrice: number;
  currency: 'INR' | 'USD';
  color: string;
}

export interface OrderBookRow {
  price: number;
  amount: number; // quantity in shares
  total: number; // order value
  depth: number; // 0 to 100
}

export interface EquityOrder {
  id: string;
  timestamp: number;
  ticker: string;
  exchange: string;
  symbol: string;
  side: 'buy' | 'sell';
  product: 'CNC' | 'MIS'; // CNC = Delivery, MIS = Intraday
  type: 'limit' | 'market' | 'sl';
  price: number;
  quantity: number;
  total: number;
  filled: number;
  status: 'open' | 'filled' | 'cancelled';
}

export interface EquityFill {
  id: string;
  orderId: string;
  timestamp: number;
  ticker: string;
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
  brokerage: number;
  total: number;
}

interface EquityStoreState {
  currency: 'INR' | 'USD';
  instruments: Record<string, EquityInstrument>;
  activeTicker: string;
  selectedInstrument: EquityInstrument;
  
  // Funds & Margin
  totalCash: number;
  availableMargin: number;
  usedMargin: number;
  collateralMargin: number;
  holdings: Record<string, EquityHolding>;
  
  // Terminal state
  activeSide: 'buy' | 'sell';
  activeProduct: 'CNC' | 'MIS';
  activeOrderType: 'limit' | 'market' | 'sl';
  chartTimeframe: string;
  chartType: 'candles' | 'line';
  showMa20: boolean;
  orderBook: {
    asks: OrderBookRow[];
    bids: OrderBookRow[];
    spread: number;
  };
  openOrders: EquityOrder[];
  orderHistory: EquityOrder[];
  tradeHistory: EquityFill[];
  
  // Modals & UI
  isFundsModalOpen: boolean;
  isWithdrawModalOpen: boolean;
  isSearchModalOpen: boolean;
  tradingMode: 'paper' | 'live';
  
  // Actions
  setTradingMode: (mode: 'paper' | 'live') => void;
  setCurrency: (ccy: 'INR' | 'USD') => void;
  setActiveTicker: (ticker: string) => void;
  setActiveSide: (side: 'buy' | 'sell') => void;
  setActiveProduct: (product: 'CNC' | 'MIS') => void;
  setActiveOrderType: (type: 'limit' | 'market' | 'sl') => void;
  setChartTimeframe: (tf: string) => void;
  setChartType: (type: 'candles' | 'line') => void;
  setShowMa20: (show: boolean) => void;
  toggleWatchlist: (symbol: string) => void;
  setFundsModalOpen: (open: boolean) => void;
  setWithdrawModalOpen: (open: boolean) => void;
  setSearchModalOpen: (open: boolean) => void;
  
  // Trading actions
  placeOrder: (params: {
    side: 'buy' | 'sell';
    product: 'CNC' | 'MIS';
    type: 'limit' | 'market' | 'sl';
    price: number;
    quantity: number;
  }) => boolean;
  cancelOrder: (orderId: string) => void;
  addFunds: (amount: number) => void;
  withdrawFunds: (amount: number, bankAccount: string) => boolean;
  simulateTick: () => void;
}

const INITIAL_EQUITIES: Record<string, EquityInstrument> = {
  RELIANCE: {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd',
    exchange: 'NSE',
    ticker: 'NSE:RELIANCE',
    price: 2940.5,
    currency: 'INR',
    change24h: 1.85,
    change1h: 0.22,
    change7d: 3.4,
    high24h: 2965.0,
    low24h: 2912.0,
    vwap: 2938.4,
    volShares: 6850000,
    turnoverCr: 2012.4,
    marketCapCr: 1989400,
    sector: 'Oil & Gas / Retail',
    peRatio: 28.4,
    sparkline: [2860, 2880, 2910, 2895, 2925, 2935, 2940.5],
    color: '#0052cc',
    isWatchlist: true,
  },
  TCS: {
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    exchange: 'NSE',
    ticker: 'NSE:TCS',
    price: 4180.25,
    currency: 'INR',
    change24h: 2.15,
    change1h: -0.1,
    change7d: 5.1,
    high24h: 4210.0,
    low24h: 4120.0,
    vwap: 4165.2,
    volShares: 2420000,
    turnoverCr: 1011.5,
    marketCapCr: 1512400,
    sector: 'IT Consulting & Software',
    peRatio: 31.2,
    sparkline: [4010, 4050, 4110, 4090, 4140, 4160, 4180.25],
    color: '#008080',
    isWatchlist: true,
  },
  HDFCBANK: {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd',
    exchange: 'NSE',
    ticker: 'NSE:HDFCBANK',
    price: 1685.4,
    currency: 'INR',
    change24h: 0.95,
    change1h: 0.15,
    change7d: 2.2,
    high24h: 1698.0,
    low24h: 1670.0,
    vwap: 1682.0,
    volShares: 14200000,
    turnoverCr: 2388.0,
    marketCapCr: 1284500,
    sector: 'Private Sector Bank',
    peRatio: 19.8,
    sparkline: [1650, 1662, 1675, 1668, 1679, 1682, 1685.4],
    color: '#004c8f',
    isWatchlist: true,
  },
  INFY: {
    symbol: 'INFY',
    name: 'Infosys Ltd',
    exchange: 'NSE',
    ticker: 'NSE:INFY',
    price: 1920.8,
    currency: 'INR',
    change24h: 2.45,
    change1h: 0.35,
    change7d: 6.8,
    high24h: 1940.0,
    low24h: 1895.0,
    vwap: 1915.0,
    volShares: 8120000,
    turnoverCr: 1555.2,
    marketCapCr: 798400,
    sector: 'IT Software & Services',
    peRatio: 29.5,
    sparkline: [1820, 1845, 1880, 1865, 1895, 1910, 1920.8],
    color: '#007cc3',
    isWatchlist: true,
  },
  ICICIBANK: {
    symbol: 'ICICIBANK',
    name: 'ICICI Bank Ltd',
    exchange: 'NSE',
    ticker: 'NSE:ICICIBANK',
    price: 1245.6,
    currency: 'INR',
    change24h: -0.65,
    change1h: -0.15,
    change7d: 1.4,
    high24h: 1260.0,
    low24h: 1238.0,
    vwap: 1248.5,
    volShares: 9450000,
    turnoverCr: 1180.0,
    marketCapCr: 876200,
    sector: 'Private Sector Bank',
    peRatio: 18.4,
    sparkline: [1260, 1255, 1258, 1250, 1248, 1244, 1245.6],
    color: '#bd4b00',
    isWatchlist: false,
  },
  BHARTIARTL: {
    symbol: 'BHARTIARTL',
    name: 'Bharti Airtel Ltd',
    exchange: 'NSE',
    ticker: 'NSE:BHARTIARTL',
    price: 1690.3,
    currency: 'INR',
    change24h: 1.4,
    change1h: 0.1,
    change7d: 4.1,
    high24h: 1705.0,
    low24h: 1675.0,
    vwap: 1686.0,
    volShares: 5320000,
    turnoverCr: 899.0,
    marketCapCr: 998200,
    sector: 'Telecom Services',
    peRatio: 54.2,
    sparkline: [1630, 1648, 1665, 1660, 1678, 1685, 1690.3],
    color: '#e31837',
    isWatchlist: true,
  },
  TATAMOTORS: {
    symbol: 'TATAMOTORS',
    name: 'Tata Motors Ltd',
    exchange: 'NSE',
    ticker: 'NSE:TATAMOTORS',
    price: 960.2,
    currency: 'INR',
    change24h: 3.2,
    change1h: 0.45,
    change7d: 8.5,
    high24h: 975.0,
    low24h: 940.0,
    vwap: 955.0,
    volShares: 12400000,
    turnoverCr: 1190.5,
    marketCapCr: 353200,
    sector: 'Automobile (Commercial & EV)',
    peRatio: 10.6,
    sparkline: [890, 910, 935, 925, 945, 955, 960.2],
    color: '#0f4c81',
    isWatchlist: true,
  },
  ITC: {
    symbol: 'ITC',
    name: 'ITC Ltd',
    exchange: 'NSE',
    ticker: 'NSE:ITC',
    price: 492.5,
    currency: 'INR',
    change24h: -0.4,
    change1h: 0.05,
    change7d: -1.2,
    high24h: 498.0,
    low24h: 489.0,
    vwap: 493.2,
    volShares: 11200000,
    turnoverCr: 552.0,
    marketCapCr: 614200,
    sector: 'FMCG & Cigarettes',
    peRatio: 29.8,
    sparkline: [502, 499, 498, 496, 495, 493, 492.5],
    color: '#2d68c4',
    isWatchlist: false,
  },
  LT: {
    symbol: 'LT',
    name: 'Larsen & Toubro Ltd',
    exchange: 'NSE',
    ticker: 'NSE:LT',
    price: 3620.0,
    currency: 'INR',
    change24h: 1.1,
    change1h: 0.18,
    change7d: 3.8,
    high24h: 3655.0,
    low24h: 3590.0,
    vwap: 3612.0,
    volShares: 2180000,
    turnoverCr: 787.0,
    marketCapCr: 497800,
    sector: 'Heavy Infrastructure & EPC',
    peRatio: 33.4,
    sparkline: [3510, 3535, 3570, 3560, 3595, 3610, 3620.0],
    color: '#ffd100',
    isWatchlist: false,
  },
  SBIN: {
    symbol: 'SBIN',
    name: 'State Bank of India',
    exchange: 'NSE',
    ticker: 'NSE:SBIN',
    price: 815.4,
    currency: 'INR',
    change24h: 0.75,
    change1h: 0.1,
    change7d: 2.9,
    high24h: 824.0,
    low24h: 808.0,
    vwap: 813.5,
    volShares: 14500000,
    turnoverCr: 1180.0,
    marketCapCr: 727800,
    sector: 'Public Sector Banking',
    peRatio: 10.8,
    sparkline: [795, 802, 810, 808, 812, 814, 815.4],
    color: '#0083ca',
    isWatchlist: false,
  },
  AAPL: {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    exchange: 'NASDAQ',
    ticker: 'NASDAQ:AAPL',
    price: 235.1,
    currency: 'USD',
    change24h: 1.65,
    change1h: 0.12,
    change7d: 3.8,
    high24h: 237.2,
    low24h: 232.5,
    vwap: 234.8,
    volShares: 48500000,
    turnoverCr: 95000,
    marketCapCr: 29500000,
    sector: 'Consumer Electronics & Services',
    peRatio: 34.2,
    sparkline: [228, 230, 232, 231, 234, 235, 235.1],
    color: '#a3aaae',
    isWatchlist: false,
  },
  NVDA: {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    exchange: 'NASDAQ',
    ticker: 'NASDAQ:NVDA',
    price: 138.25,
    currency: 'USD',
    change24h: 3.85,
    change1h: 0.4,
    change7d: 9.4,
    high24h: 140.5,
    low24h: 134.8,
    vwap: 137.9,
    volShares: 65200000,
    turnoverCr: 75000,
    marketCapCr: 28200000,
    sector: 'AI Hardware & Semiconductors',
    peRatio: 52.8,
    sparkline: [128, 131, 134, 133, 136, 137, 138.25],
    color: '#76b900',
    isWatchlist: false,
  },
};

const INITIAL_HOLDINGS: Record<string, EquityHolding> = {
  RELIANCE: {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd',
    exchange: 'NSE',
    ticker: 'NSE:RELIANCE',
    quantity: 120,
    available: 120,
    inOrders: 0,
    avgBuyPrice: 2780.0,
    currency: 'INR',
    color: '#0052cc',
  },
  TCS: {
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    exchange: 'NSE',
    ticker: 'NSE:TCS',
    quantity: 60,
    available: 40,
    inOrders: 20,
    avgBuyPrice: 3950.0,
    currency: 'INR',
    color: '#008080',
  },
  INFY: {
    symbol: 'INFY',
    name: 'Infosys Ltd',
    exchange: 'NSE',
    ticker: 'NSE:INFY',
    quantity: 150,
    available: 150,
    inOrders: 0,
    avgBuyPrice: 1810.0,
    currency: 'INR',
    color: '#007cc3',
  },
  HDFCBANK: {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd',
    exchange: 'NSE',
    ticker: 'NSE:HDFCBANK',
    quantity: 200,
    available: 200,
    inOrders: 0,
    avgBuyPrice: 1640.0,
    currency: 'INR',
    color: '#004c8f',
  },
  TATAMOTORS: {
    symbol: 'TATAMOTORS',
    name: 'Tata Motors Ltd',
    exchange: 'NSE',
    ticker: 'NSE:TATAMOTORS',
    quantity: 250,
    available: 250,
    inOrders: 0,
    avgBuyPrice: 890.0,
    currency: 'INR',
    color: '#0f4c81',
  },
  BHARTIARTL: {
    symbol: 'BHARTIARTL',
    name: 'Bharti Airtel Ltd',
    exchange: 'NSE',
    ticker: 'NSE:BHARTIARTL',
    quantity: 80,
    available: 80,
    inOrders: 0,
    avgBuyPrice: 1610.0,
    currency: 'INR',
    color: '#e31837',
  },
};

function generateOrderBook(midPrice: number) {
  const asks: OrderBookRow[] = [];
  const bids: OrderBookRow[] = [];
  let askCum = 0;
  let bidCum = 0;

  for (let i = 8; i >= 1; i--) {
    const p = Number((midPrice + i * 0.75).toFixed(2));
    const qty = Math.floor(50 + Math.random() * 450);
    askCum += qty;
    asks.push({
      price: p,
      amount: qty,
      total: Number((p * qty).toFixed(2)),
      depth: Math.min(100, Math.round((askCum / 2400) * 100)),
    });
  }

  for (let i = 1; i <= 8; i++) {
    const p = Number((midPrice - i * 0.75).toFixed(2));
    const qty = Math.floor(50 + Math.random() * 450);
    bidCum += qty;
    bids.push({
      price: p,
      amount: qty,
      total: Number((p * qty).toFixed(2)),
      depth: Math.min(100, Math.round((bidCum / 2400) * 100)),
    });
  }

  return {
    asks,
    bids,
    spread: 1.5,
  };
}

export const useEquityStore = create<EquityStoreState>((set, get) => ({
  currency: 'INR',
  instruments: INITIAL_EQUITIES,
  activeTicker: 'NSE:RELIANCE',
  selectedInstrument: INITIAL_EQUITIES.RELIANCE,

  totalCash: 245800.0,
  availableMargin: 245800.0,
  usedMargin: 115400.0,
  collateralMargin: 320000.0,
  holdings: INITIAL_HOLDINGS,

  activeSide: 'buy',
  activeProduct: 'CNC',
  activeOrderType: 'limit',
  chartTimeframe: '1D',
  chartType: 'candles',
  showMa20: true,
  orderBook: generateOrderBook(2940.5),

  openOrders: [
    {
      id: 'ord-nse-4401',
      timestamp: Date.now() - 3600000,
      ticker: 'NSE:RELIANCE',
      exchange: 'NSE',
      symbol: 'RELIANCE',
      side: 'buy',
      product: 'CNC',
      type: 'limit',
      price: 2920.0,
      quantity: 25,
      total: 73000.0,
      filled: 0,
      status: 'open',
    },
    {
      id: 'ord-nse-4402',
      timestamp: Date.now() - 7200000,
      ticker: 'NSE:TCS',
      exchange: 'NSE',
      symbol: 'TCS',
      side: 'sell',
      product: 'CNC',
      type: 'limit',
      price: 4250.0,
      quantity: 10,
      total: 42500.0,
      filled: 0,
      status: 'open',
    },
  ],
  orderHistory: [
    {
      id: 'ord-nse-4389',
      timestamp: Date.now() - 86400000,
      ticker: 'NSE:INFY',
      exchange: 'NSE',
      symbol: 'INFY',
      side: 'buy',
      product: 'CNC',
      type: 'market',
      price: 1895.0,
      quantity: 50,
      total: 94750.0,
      filled: 50,
      status: 'filled',
    },
  ],
  tradeHistory: [
    {
      id: 'fl-nse-901',
      orderId: 'ord-nse-4389',
      timestamp: Date.now() - 86400000,
      ticker: 'NSE:INFY',
      side: 'buy',
      price: 1895.0,
      quantity: 50,
      brokerage: 20.0,
      total: 94750.0,
    },
  ],

  isFundsModalOpen: false,
  isWithdrawModalOpen: false,
  isSearchModalOpen: false,
  tradingMode: 'paper',

  setTradingMode: (mode) => set({ tradingMode: mode }),
  setCurrency: (ccy) => set({ currency: ccy }),
  setActiveTicker: (ticker) => {
    const symbol = ticker.includes(':') ? ticker.split(':')[1] : ticker;
    const inst = get().instruments[symbol] || INITIAL_EQUITIES.RELIANCE;
    set({
      activeTicker: ticker,
      selectedInstrument: inst,
      orderBook: generateOrderBook(inst.price),
    });
  },

  setActiveSide: (side) => set({ activeSide: side }),
  setActiveProduct: (product) => set({ activeProduct: product }),
  setActiveOrderType: (type) => set({ activeOrderType: type }),
  setChartTimeframe: (tf) => set({ chartTimeframe: tf }),
  setChartType: (type) => set({ chartType: type }),
  setShowMa20: (show) => set({ showMa20: show }),

  toggleWatchlist: (symbol) => {
    set((state) => {
      const inst = state.instruments[symbol];
      if (!inst) return state;
      return {
        instruments: {
          ...state.instruments,
          [symbol]: { ...inst, isWatchlist: !inst.isWatchlist },
        },
      };
    });
  },

  setFundsModalOpen: (open) => set({ isFundsModalOpen: open }),
  setWithdrawModalOpen: (open) => set({ isWithdrawModalOpen: open }),
  setSearchModalOpen: (open) => set({ isSearchModalOpen: open }),

  placeOrder: ({ side, product, type, price, quantity }) => {
    const state = get();
    const total = price * quantity;
    const symbol = state.selectedInstrument.symbol;

    if (side === 'buy' && total > state.availableMargin) {
      useNotifications.getState().push({
        severity: 'error',
        title: 'Margin Refusal',
        message: `Available margin (₹${state.availableMargin.toLocaleString()}) is less than required (₹${total.toLocaleString()})`,
      });
      return false;
    }

    if (side === 'sell') {
      const h = state.holdings[symbol];
      if (!h || h.available < quantity) {
        useNotifications.getState().push({
          severity: 'error',
          title: 'Insufficient Shares in Demat',
          message: `Available shares (${h?.available ?? 0}) is less than order quantity (${quantity})`,
        });
        return false;
      }
    }

    const orderId = `ord-nse-${Math.floor(4000 + Math.random() * 5000)}`;

    if (type === 'market') {
      const fill: EquityFill = {
        id: `fl-${Math.floor(1000 + Math.random() * 9000)}`,
        orderId,
        timestamp: Date.now(),
        ticker: state.activeTicker,
        side,
        price,
        quantity,
        brokerage: 20.0,
        total,
      };

      set((s) => {
        const h = { ...s.holdings };
        let newCash = s.totalCash;
        let newAvail = s.availableMargin;

        if (side === 'buy') {
          newCash -= total;
          newAvail -= total;
          const curr = h[symbol] || {
            symbol,
            name: s.selectedInstrument.name,
            exchange: s.selectedInstrument.exchange,
            ticker: s.selectedInstrument.ticker,
            quantity: 0,
            available: 0,
            inOrders: 0,
            avgBuyPrice: price,
            currency: 'INR',
            color: s.selectedInstrument.color,
          };
          h[symbol] = {
            ...curr,
            quantity: curr.quantity + quantity,
            available: curr.available + quantity,
          };
        } else {
          newCash += total;
          newAvail += total;
          const curr = h[symbol];
          if (curr) {
            h[symbol] = {
              ...curr,
              quantity: curr.quantity - quantity,
              available: curr.available - quantity,
            };
          }
        }

        return {
          totalCash: newCash,
          availableMargin: newAvail,
          holdings: h,
          tradeHistory: [fill, ...s.tradeHistory],
          orderHistory: [
            {
              id: orderId,
              timestamp: Date.now(),
              ticker: s.activeTicker,
              exchange: s.selectedInstrument.exchange,
              symbol,
              side,
              product,
              type,
              price,
              quantity,
              total,
              filled: quantity,
              status: 'filled',
            },
            ...s.orderHistory,
          ],
        };
      });

      useNotifications.getState().push({
        severity: 'info',
        title: 'Order Executed',
        message: `${side.toUpperCase()} ${quantity} ${symbol} @ ₹${price.toLocaleString()} executed on ${state.selectedInstrument.exchange}`,
      });
      return true;
    }

    // Limit Order
    const newOrder: EquityOrder = {
      id: orderId,
      timestamp: Date.now(),
      ticker: state.activeTicker,
      exchange: state.selectedInstrument.exchange,
      symbol,
      side,
      product,
      type,
      price,
      quantity,
      total,
      filled: 0,
      status: 'open',
    };

    set((s) => {
      const h = { ...s.holdings };
      let avail = s.availableMargin;
      let used = s.usedMargin;

      if (side === 'buy') {
        avail -= total;
        used += total;
      } else {
        const curr = h[symbol];
        if (curr) {
          h[symbol] = {
            ...curr,
            available: curr.available - quantity,
            inOrders: curr.inOrders + quantity,
          };
        }
      }

      return {
        availableMargin: avail,
        usedMargin: used,
        holdings: h,
        openOrders: [newOrder, ...s.openOrders],
      };
    });

    useNotifications.getState().push({
      severity: 'info',
      title: 'Limit Order Placed',
      message: `${side.toUpperCase()} ${quantity} shares of ${symbol} placed at ₹${price.toLocaleString()}`,
    });
    return true;
  },

  cancelOrder: (orderId) => {
    const order = get().openOrders.find((o) => o.id === orderId);
    if (!order) return;

    set((s) => {
      const h = { ...s.holdings };
      let avail = s.availableMargin;
      let used = s.usedMargin;

      if (order.side === 'buy') {
        avail += order.total;
        used -= order.total;
      } else {
        const curr = h[order.symbol];
        if (curr) {
          h[order.symbol] = {
            ...curr,
            available: curr.available + order.quantity,
            inOrders: Math.max(0, curr.inOrders - order.quantity),
          };
        }
      }

      return {
        availableMargin: avail,
        usedMargin: used,
        holdings: h,
        openOrders: s.openOrders.filter((o) => o.id !== orderId),
        orderHistory: [{ ...order, status: 'cancelled' }, ...s.orderHistory],
      };
    });

    useNotifications.getState().push({
      severity: 'warning',
      title: 'Order Cancelled',
      message: `Order #${orderId} was cancelled`,
    });
  },

  addFunds: (amount) => {
    set((s) => ({
      totalCash: s.totalCash + amount,
      availableMargin: s.availableMargin + amount,
    }));

    useNotifications.getState().push({
      severity: 'info',
      title: 'Funds Added (Simulated)',
      message: `Credited ₹${amount.toLocaleString()} to trading account via NetBanking / UPI`,
    });
  },

  withdrawFunds: (amount, bankAccount) => {
    const state = get();
    if (amount > state.availableMargin) {
      useNotifications.getState().push({
        severity: 'error',
        title: 'Payout Failed',
        message: 'Withdrawal amount exceeds available trading balance',
      });
      return false;
    }

    set((s) => ({
      totalCash: s.totalCash - amount,
      availableMargin: s.availableMargin - amount,
    }));

    useNotifications.getState().push({
      severity: 'info',
      title: 'Payout Initiated (Simulated)',
      message: `₹${amount.toLocaleString()} scheduled for transfer to ${bankAccount}`,
    });
    return true;
  },

  simulateTick: () => {
    set((s) => {
      const deltaRatio = (Math.random() - 0.49) * 0.0015;
      const curRel = s.instruments.RELIANCE.price;
      const nextRel = Number((curRel * (1 + deltaRatio)).toFixed(2));
      const relInst = {
        ...s.instruments.RELIANCE,
        price: nextRel,
        sparkline: [...s.instruments.RELIANCE.sparkline.slice(1), nextRel],
      };

      const instruments = {
        ...s.instruments,
        RELIANCE: relInst,
      };

      return {
        instruments,
        selectedInstrument:
          s.selectedInstrument.symbol === 'RELIANCE' ? relInst : s.selectedInstrument,
        orderBook:
          s.selectedInstrument.symbol === 'RELIANCE'
            ? generateOrderBook(nextRel)
            : s.orderBook,
      };
    });
  },
}));

// Also export alias as useCryptoStore for backward compatibility if any
export const useCryptoStore = useEquityStore;
export type CryptoAsset = EquityInstrument;

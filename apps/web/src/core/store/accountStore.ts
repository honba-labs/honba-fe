import { create } from 'zustand';
import { useNotifications } from './notifications';

export interface BrokerAccount {
  id: string; // 'dhan' | 'zerodha' | 'groww' | 'angelone'
  brokerName: string;
  tagline: string;
  accountNumber: string;
  status: 'connected' | 'syncing' | 'disconnected';
  latencyMs: number;
  totalCapital: number;
  availableMargin: number;
  usedMargin: number;
  todayPnl: number;
  todayPnlPct: number;
  unrealisedPnl: number;
  unrealisedPnlPct: number;
  realisedPnl: number;
  holdingsCount: number;
  brandColor: string;
  badge: string;
  holdings: {
    symbol: string;
    name: string;
    ticker: string;
    quantity: number;
    avgBuyPrice: number;
    currentPrice: number;
    value: number;
    pnl: number;
    pnlPct: number;
    sector: string;
  }[];
}

export interface PaperPosition {
  id: string;
  symbol: string;
  name: string;
  ticker: string;
  tradeType: 'Positional Swing' | 'Long Term' | 'Intraday Carry' | 'Options Straddle';
  side: 'BUY' | 'SELL';
  quantity: number;
  avgEntryPrice: number;
  currentPrice: number;
  entryTimestamp: number;
  entryDateStr: string;
  holdingDays: number;
  stopLoss: number;
  target: number;
  trailingSl?: number;
  isSquaredOff: boolean;
  squaredOffPrice?: number;
  squaredOffTimestamp?: number;
  color: string;
  notes?: string;
}

export interface PaperTradingSession {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'concluded';
  createdAt: number;
  createdDateStr: string;
  concludedAt?: number;
  initialCapital: number;
  cashBalance: number;
  openPositions: PaperPosition[]; // Non-squared-off instruments for long running trades
  closedTrades: PaperPosition[]; // Squared-off trades in this session
  tags: string[];
}

export interface TradebookSessionRecord {
  id: string;
  sessionId: string;
  sessionName: string;
  accountType: 'paper' | 'live';
  broker?: 'Dhan' | 'Zerodha' | 'Groww' | 'Angel One';
  accountNumber?: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  startingCapital: number;
  finalEquity: number;
  grossPnl: number;
  netPnl: number;
  charges: {
    brokerage: number;
    stt: number;
    exchangeTurnover: number;
    gst: number;
    sebiCharges: number;
    stampDuty: number;
    totalCharges: number;
  };
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRatePct: number;
  profitFactor: number;
  maxDrawdownPct: number;
  tags: string[];
  notes: {
    psychologyRating: number; // 1-5
    setupRating: number;
    strategy: string;
    lessons: string;
    reviewStatus: 'reviewed' | 'pending';
  };
  trades: {
    id: string;
    symbol: string;
    ticker: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    entryPrice: number;
    exitPrice: number;
    entryTime: string;
    exitTime: string;
    pnl: number;
    pnlPct: number;
    holdingPeriod: string;
    strategyTag: string;
  }[];
}

interface AccountStoreState {
  // Live multi-broker state
  selectedBrokerId: string | 'all';
  brokerAccounts: Record<string, BrokerAccount>;
  
  // Paper trading session state
  activeSessionId: string;
  paperSessions: Record<string, PaperTradingSession>;
  
  // Tradebook history
  tradebookRecords: TradebookSessionRecord[];
  
  // Actions
  setSelectedBrokerId: (id: string | 'all') => void;
  setActiveSessionId: (id: string) => void;
  createPaperSession: (params: { name: string; description: string; initialCapital: number; tags?: string[] }) => void;
  squareOffPaperPosition: (sessionId: string, positionId: string) => void;
  addPaperPosition: (
    sessionId: string,
    position: Omit<PaperPosition, 'id' | 'entryTimestamp' | 'isSquaredOff'>
  ) => void;
  concludePaperSession: (sessionId: string, reviewNotes?: string) => void;
  updatePositionSlTarget: (sessionId: string, positionId: string, stopLoss: number, target: number) => void;
  updateTradebookNotes: (
    recordId: string,
    updates: Partial<TradebookSessionRecord['notes']>
  ) => void;
  connectBroker: (broker: Omit<BrokerAccount, 'holdings' | 'todayPnl' | 'todayPnlPct' | 'unrealisedPnl' | 'unrealisedPnlPct' | 'realisedPnl' | 'holdingsCount'>) => void;
}

const INITIAL_BROKER_ACCOUNTS: Record<string, BrokerAccount> = {
  dhan: {
    id: 'dhan',
    brokerName: 'Dhan',
    tagline: 'DhanHQ Direct API',
    accountNumber: 'DHAN-109284',
    status: 'connected',
    latencyMs: 16,
    totalCapital: 1845200.0,
    availableMargin: 512400.0,
    usedMargin: 1332800.0,
    todayPnl: 18920.0,
    todayPnlPct: 1.44,
    unrealisedPnl: 284300.0,
    unrealisedPnlPct: 18.2,
    realisedPnl: 34100.0,
    holdingsCount: 5,
    brandColor: '#7b3fe4',
    badge: 'API Connected',
    holdings: [
      {
        symbol: 'RELIANCE',
        name: 'Reliance Industries Ltd',
        ticker: 'NSE:RELIANCE',
        quantity: 120,
        avgBuyPrice: 2820.0,
        currentPrice: 2940.5,
        value: 352860.0,
        pnl: 14460.0,
        pnlPct: 4.27,
        sector: 'Energy / Petrochemicals',
      },
      {
        symbol: 'TCS',
        name: 'Tata Consultancy Services',
        ticker: 'NSE:TCS',
        quantity: 75,
        avgBuyPrice: 3880.0,
        currentPrice: 4125.0,
        value: 309375.0,
        pnl: 18375.0,
        pnlPct: 6.31,
        sector: 'Information Tech',
      },
      {
        symbol: 'INFY',
        name: 'Infosys Ltd',
        ticker: 'NSE:INFY',
        quantity: 180,
        avgBuyPrice: 1720.0,
        currentPrice: 1890.0,
        value: 340200.0,
        pnl: 30600.0,
        pnlPct: 9.88,
        sector: 'Information Tech',
      },
      {
        symbol: 'LT',
        name: 'Larsen & Toubro Ltd',
        ticker: 'NSE:LT',
        quantity: 50,
        avgBuyPrice: 3340.0,
        currentPrice: 3590.0,
        value: 179500.0,
        pnl: 12500.0,
        pnlPct: 7.48,
        sector: 'Capital Goods',
      },
      {
        symbol: 'TATAMOTORS',
        name: 'Tata Motors Ltd',
        ticker: 'NSE:TATAMOTORS',
        quantity: 160,
        avgBuyPrice: 890.0,
        currentPrice: 942.5,
        value: 150800.0,
        pnl: 8400.0,
        pnlPct: 5.89,
        sector: 'Automobile',
      },
    ],
  },
  zerodha: {
    id: 'zerodha',
    brokerName: 'Zerodha',
    tagline: 'Kite Connect v3',
    accountNumber: 'ZERODHA-KM7124',
    status: 'connected',
    latencyMs: 24,
    totalCapital: 1280450.0,
    availableMargin: 340150.0,
    usedMargin: 940300.0,
    todayPnl: 8450.0,
    todayPnlPct: 0.91,
    unrealisedPnl: 142850.0,
    unrealisedPnlPct: 12.5,
    realisedPnl: 19400.0,
    holdingsCount: 4,
    brandColor: '#ff5722',
    badge: 'Kite Active',
    holdings: [
      {
        symbol: 'HDFCBANK',
        name: 'HDFC Bank Ltd',
        ticker: 'NSE:HDFCBANK',
        quantity: 210,
        avgBuyPrice: 1580.0,
        currentPrice: 1690.0,
        value: 354900.0,
        pnl: 23100.0,
        pnlPct: 6.96,
        sector: 'Banking & Financials',
      },
      {
        symbol: 'ICICIBANK',
        name: 'ICICI Bank Ltd',
        ticker: 'NSE:ICICIBANK',
        quantity: 240,
        avgBuyPrice: 1120.0,
        currentPrice: 1245.0,
        value: 298800.0,
        pnl: 30000.0,
        pnlPct: 11.16,
        sector: 'Banking & Financials',
      },
      {
        symbol: 'SBIN',
        name: 'State Bank of India',
        ticker: 'NSE:SBIN',
        quantity: 190,
        avgBuyPrice: 780.0,
        currentPrice: 825.0,
        value: 156750.0,
        pnl: 8550.0,
        pnlPct: 5.76,
        sector: 'PSU Banking',
      },
      {
        symbol: 'KOTAKBANK',
        name: 'Kotak Mahindra Bank',
        ticker: 'NSE:KOTAKBANK',
        quantity: 70,
        avgBuyPrice: 1740.0,
        currentPrice: 1855.0,
        value: 129850.0,
        pnl: 8050.0,
        pnlPct: 6.6,
        sector: 'Banking & Financials',
      },
    ],
  },
  groww: {
    id: 'groww',
    brokerName: 'Groww',
    tagline: 'Groww Invest API',
    accountNumber: 'GROWW-931082',
    status: 'connected',
    latencyMs: 31,
    totalCapital: 654320.0,
    availableMargin: 185000.0,
    usedMargin: 469320.0,
    todayPnl: 4050.0,
    todayPnlPct: 0.87,
    unrealisedPnl: 68400.0,
    unrealisedPnlPct: 11.7,
    realisedPnl: 8200.0,
    holdingsCount: 3,
    brandColor: '#00d09c',
    badge: 'OAuth Active',
    holdings: [
      {
        symbol: 'ITC',
        name: 'ITC Ltd',
        ticker: 'NSE:ITC',
        quantity: 350,
        avgBuyPrice: 440.0,
        currentPrice: 485.0,
        value: 169750.0,
        pnl: 15750.0,
        pnlPct: 10.22,
        sector: 'FMCG',
      },
      {
        symbol: 'SUNPHARMA',
        name: 'Sun Pharmaceutical Ltd',
        ticker: 'NSE:SUNPHARMA',
        quantity: 90,
        avgBuyPrice: 1680.0,
        currentPrice: 1820.0,
        value: 163800.0,
        pnl: 12600.0,
        pnlPct: 8.33,
        sector: 'Healthcare',
      },
      {
        symbol: 'TITAN',
        name: 'Titan Company Ltd',
        ticker: 'NSE:TITAN',
        quantity: 40,
        avgBuyPrice: 3220.0,
        currentPrice: 3390.0,
        value: 135600.0,
        pnl: 6800.0,
        pnlPct: 5.27,
        sector: 'Consumer Goods',
      },
    ],
  },
  angelone: {
    id: 'angelone',
    brokerName: 'Angel One',
    tagline: 'SmartAPI Speed',
    accountNumber: 'ANGEL-A29410',
    status: 'connected',
    latencyMs: 22,
    totalCapital: 422600.0,
    availableMargin: 162450.0,
    usedMargin: 260150.0,
    todayPnl: -1240.0,
    todayPnlPct: -0.47,
    unrealisedPnl: 32100.0,
    unrealisedPnlPct: 8.2,
    realisedPnl: 4500.0,
    holdingsCount: 2,
    brandColor: '#ff2d55',
    badge: 'SmartAPI',
    holdings: [
      {
        symbol: 'BHARTIARTL',
        name: 'Bharti Airtel Ltd',
        ticker: 'NSE:BHARTIARTL',
        quantity: 110,
        avgBuyPrice: 1540.0,
        currentPrice: 1685.0,
        value: 185350.0,
        pnl: 15950.0,
        pnlPct: 9.41,
        sector: 'Telecom',
      },
      {
        symbol: 'BAJFINANCE',
        name: 'Bajaj Finance Ltd',
        ticker: 'NSE:BAJFINANCE',
        quantity: 10,
        avgBuyPrice: 7100.0,
        currentPrice: 7480.0,
        value: 74800.0,
        pnl: 3800.0,
        pnlPct: 5.35,
        sector: 'NBFC',
      },
    ],
  },
};

const INITIAL_PAPER_SESSIONS: Record<string, PaperTradingSession> = {
  'session-swing-oct': {
    id: 'session-swing-oct',
    name: 'Q4 Positional Swing Session #3',
    description: 'Long-running positional equity swing trades held across multi-day and multi-week breakout cycles.',
    status: 'active',
    createdAt: Date.now() - 14 * 86400 * 1000,
    createdDateStr: '05 Oct 2026',
    initialCapital: 1000000.0,
    cashBalance: 428450.0,
    tags: ['Positional', 'Swing', 'Breakout', 'Multi-day'],
    openPositions: [
      {
        id: 'pos-1',
        symbol: 'RELIANCE',
        name: 'Reliance Industries Ltd',
        ticker: 'NSE:RELIANCE',
        tradeType: 'Positional Swing',
        side: 'BUY',
        quantity: 80,
        avgEntryPrice: 2840.0,
        currentPrice: 2940.5,
        entryTimestamp: Date.now() - 14 * 86400 * 1000,
        entryDateStr: '05 Oct 2026, 09:35',
        holdingDays: 14,
        stopLoss: 2810.0,
        target: 3100.0,
        trailingSl: 2890.0,
        isSquaredOff: false,
        color: '#7b3fe4',
        notes: 'Weekly resistance breakout above ₹2840 with 2x volume expansion.',
      },
      {
        id: 'pos-2',
        symbol: 'LT',
        name: 'Larsen & Toubro Ltd',
        ticker: 'NSE:LT',
        tradeType: 'Positional Swing',
        side: 'BUY',
        quantity: 50,
        avgEntryPrice: 3450.0,
        currentPrice: 3590.0,
        entryTimestamp: Date.now() - 9 * 86400 * 1000,
        entryDateStr: '10 Oct 2026, 11:15',
        holdingDays: 9,
        stopLoss: 3400.0,
        target: 3750.0,
        trailingSl: 3510.0,
        isSquaredOff: false,
        color: '#ff9800',
        notes: 'Infrastructure order inflow catalyst; holding through earnings.',
      },
      {
        id: 'pos-3',
        symbol: 'TATAMOTORS',
        name: 'Tata Motors Ltd',
        ticker: 'NSE:TATAMOTORS',
        tradeType: 'Long Term',
        side: 'BUY',
        quantity: 120,
        avgEntryPrice: 915.0,
        currentPrice: 942.5,
        entryTimestamp: Date.now() - 6 * 86400 * 1000,
        entryDateStr: '13 Oct 2026, 14:20',
        holdingDays: 6,
        stopLoss: 890.0,
        target: 1020.0,
        trailingSl: 920.0,
        isSquaredOff: false,
        color: '#00c076',
        notes: 'JLR margin expansion thesis, 50-day EMA support test successful.',
      },
    ],
    closedTrades: [
      {
        id: 'pos-closed-1',
        symbol: 'INFY',
        name: 'Infosys Ltd',
        ticker: 'NSE:INFY',
        tradeType: 'Positional Swing',
        side: 'BUY',
        quantity: 100,
        avgEntryPrice: 1750.0,
        currentPrice: 1890.0,
        entryTimestamp: Date.now() - 14 * 86400 * 1000,
        entryDateStr: '05 Oct 2026',
        holdingDays: 8,
        stopLoss: 1710.0,
        target: 1880.0,
        isSquaredOff: true,
        squaredOffPrice: 1885.0,
        squaredOffTimestamp: Date.now() - 6 * 86400 * 1000,
        color: '#2563eb',
        notes: 'Target achieved ahead of quarterly results.',
      },
    ],
  },
  'session-momentum-intraday': {
    id: 'session-momentum-intraday',
    name: 'Active Intraday Momentum Session',
    description: 'High frequency ORB & VWAP mean-reversion intraday trades on NSE heavyweights.',
    status: 'active',
    createdAt: Date.now() - 2 * 86400 * 1000,
    createdDateStr: '17 Oct 2026',
    initialCapital: 500000.0,
    cashBalance: 412000.0,
    tags: ['Intraday', 'Momentum', 'VWAP', 'MIS'],
    openPositions: [
      {
        id: 'pos-intra-1',
        symbol: 'HDFCBANK',
        name: 'HDFC Bank Ltd',
        ticker: 'NSE:HDFCBANK',
        tradeType: 'Intraday Carry',
        side: 'BUY',
        quantity: 50,
        avgEntryPrice: 1672.0,
        currentPrice: 1690.0,
        entryTimestamp: Date.now() - 2 * 86400 * 1000,
        entryDateStr: '17 Oct 2026, 10:30',
        holdingDays: 2,
        stopLoss: 1655.0,
        target: 1715.0,
        trailingSl: 1675.0,
        isSquaredOff: false,
        color: '#0284c7',
        notes: 'Carried over weekend due to strong delivery volume clustering.',
      },
    ],
    closedTrades: [
      {
        id: 'pos-intra-closed-1',
        symbol: 'TCS',
        name: 'Tata Consultancy Services',
        ticker: 'NSE:TCS',
        tradeType: 'Intraday Carry',
        side: 'BUY',
        quantity: 30,
        avgEntryPrice: 4080.0,
        currentPrice: 4125.0,
        entryTimestamp: Date.now() - 2 * 86400 * 1000,
        entryDateStr: '17 Oct 2026, 09:20',
        holdingDays: 1,
        stopLoss: 4050.0,
        target: 4120.0,
        isSquaredOff: true,
        squaredOffPrice: 4122.0,
        squaredOffTimestamp: Date.now() - 2 * 86400 * 1000 + 4 * 3600 * 1000,
        color: '#ec4899',
        notes: 'Booked profit near day high.',
      },
    ],
  },
};

const INITIAL_TRADEBOOK_RECORDS: TradebookSessionRecord[] = [
  {
    id: 'tb-rec-1',
    sessionId: 'session-swing-sep',
    sessionName: 'September Pre-Earnings Swing Cycle',
    accountType: 'paper',
    startDate: '12 Sep 2026',
    endDate: '04 Oct 2026',
    durationDays: 22,
    startingCapital: 1000000.0,
    finalEquity: 1084200.0,
    grossPnl: 87800.0,
    netPnl: 84200.0,
    charges: {
      brokerage: 420.0,
      stt: 2150.0,
      exchangeTurnover: 380.0,
      gst: 450.0,
      sebiCharges: 25.0,
      stampDuty: 175.0,
      totalCharges: 3600.0,
    },
    totalTrades: 12,
    winningTrades: 9,
    losingTrades: 3,
    winRatePct: 75.0,
    profitFactor: 2.84,
    maxDrawdownPct: 2.1,
    tags: ['Swing', 'Pre-Earnings', 'Delivery'],
    notes: {
      psychologyRating: 5,
      setupRating: 4,
      strategy: 'Multi-day Breakout + Sector Rotation',
      lessons: 'Patient holding without early profit taking yielded highest R:R on ICICIBANK and RELIANCE.',
      reviewStatus: 'reviewed',
    },
    trades: [
      {
        id: 'tr-1',
        symbol: 'RELIANCE',
        ticker: 'NSE:RELIANCE',
        side: 'BUY',
        quantity: 70,
        entryPrice: 2790.0,
        exitPrice: 2920.0,
        entryTime: '14 Sep 2026',
        exitTime: '28 Sep 2026',
        pnl: 9100.0,
        pnlPct: 4.66,
        holdingPeriod: '14 days',
        strategyTag: 'Support Bounce',
      },
      {
        id: 'tr-2',
        symbol: 'ICICIBANK',
        ticker: 'NSE:ICICIBANK',
        side: 'BUY',
        quantity: 150,
        entryPrice: 1140.0,
        exitPrice: 1235.0,
        entryTime: '16 Sep 2026',
        exitTime: '01 Oct 2026',
        pnl: 14250.0,
        pnlPct: 8.33,
        holdingPeriod: '15 days',
        strategyTag: 'Breakout Carry',
      },
      {
        id: 'tr-3',
        symbol: 'BHARTIARTL',
        ticker: 'NSE:BHARTIARTL',
        side: 'BUY',
        quantity: 100,
        entryPrice: 1510.0,
        exitPrice: 1640.0,
        entryTime: '18 Sep 2026',
        exitTime: '03 Oct 2026',
        pnl: 13000.0,
        pnlPct: 8.61,
        holdingPeriod: '15 days',
        strategyTag: 'Momentum Trend',
      },
    ],
  },
  {
    id: 'tb-rec-2',
    sessionId: 'session-dhan-expiry-w1',
    sessionName: 'DhanHQ Options Expiry & Positional Session',
    accountType: 'live',
    broker: 'Dhan',
    accountNumber: 'DHAN-109284',
    startDate: '06 Oct 2026',
    endDate: '10 Oct 2026',
    durationDays: 5,
    startingCapital: 1500000.0,
    finalEquity: 1541800.0,
    grossPnl: 46200.0,
    netPnl: 41800.0,
    charges: {
      brokerage: 1200.0,
      stt: 1850.0,
      exchangeTurnover: 520.0,
      gst: 680.0,
      sebiCharges: 35.0,
      stampDuty: 115.0,
      totalCharges: 4400.0,
    },
    totalTrades: 18,
    winningTrades: 13,
    losingTrades: 5,
    winRatePct: 72.2,
    profitFactor: 2.35,
    maxDrawdownPct: 1.8,
    tags: ['Live', 'DhanHQ', 'Weekly Expiry', 'Positional'],
    notes: {
      psychologyRating: 4,
      setupRating: 5,
      strategy: 'DhanHQ Automated Level-2 Scalping + Positional Hedging',
      lessons: 'Tight trailing stop losses prevented what could have been significant drawdown on Thursday spike.',
      reviewStatus: 'reviewed',
    },
    trades: [
      {
        id: 'tr-4',
        symbol: 'NIFTY50',
        ticker: 'NSE:NIFTY50',
        side: 'BUY',
        quantity: 150,
        entryPrice: 24900.0,
        exitPrice: 25120.0,
        entryTime: '07 Oct 2026',
        exitTime: '08 Oct 2026',
        pnl: 33000.0,
        pnlPct: 0.88,
        holdingPeriod: '1 day',
        strategyTag: 'Trend Follower',
      },
    ],
  },
  {
    id: 'tb-rec-3',
    sessionId: 'session-zerodha-swing-aug',
    sessionName: 'Zerodha Kite August Momentum Portfolio',
    accountType: 'live',
    broker: 'Zerodha',
    accountNumber: 'ZERODHA-KM7124',
    startDate: '01 Aug 2026',
    endDate: '29 Aug 2026',
    durationDays: 28,
    startingCapital: 1200000.0,
    finalEquity: 1276500.0,
    grossPnl: 81200.0,
    netPnl: 76500.0,
    charges: {
      brokerage: 850.0,
      stt: 2400.0,
      exchangeTurnover: 410.0,
      gst: 880.0,
      sebiCharges: 30.0,
      stampDuty: 130.0,
      totalCharges: 4700.0,
    },
    totalTrades: 14,
    winningTrades: 10,
    losingTrades: 4,
    winRatePct: 71.4,
    profitFactor: 2.45,
    maxDrawdownPct: 2.9,
    tags: ['Live', 'Zerodha', 'Monthly Review', 'CNC'],
    notes: {
      psychologyRating: 5,
      setupRating: 4,
      strategy: 'Bluechip 50-EMA Pullback Strategy',
      lessons: 'Consistent bookkeeping helped claim accurate STCG deductions and calculate net brokerage drag.',
      reviewStatus: 'reviewed',
    },
    trades: [
      {
        id: 'tr-5',
        symbol: 'HDFCBANK',
        ticker: 'NSE:HDFCBANK',
        side: 'BUY',
        quantity: 200,
        entryPrice: 1590.0,
        exitPrice: 1680.0,
        entryTime: '04 Aug 2026',
        exitTime: '22 Aug 2026',
        pnl: 18000.0,
        pnlPct: 5.66,
        holdingPeriod: '18 days',
        strategyTag: 'EMA Pullback',
      },
    ],
  },
];

export const useAccountStore = create<AccountStoreState>((set, get) => ({
  selectedBrokerId: 'all',
  brokerAccounts: INITIAL_BROKER_ACCOUNTS,
  activeSessionId: 'session-swing-oct',
  paperSessions: INITIAL_PAPER_SESSIONS,
  tradebookRecords: INITIAL_TRADEBOOK_RECORDS,

  setSelectedBrokerId: (id) => set({ selectedBrokerId: id }),

  setActiveSessionId: (id) => set({ activeSessionId: id }),

  createPaperSession: ({ name, description, initialCapital, tags = [] }) => {
    const newId = `session-${Date.now()}`;
    const newSession: PaperTradingSession = {
      id: newId,
      name,
      description,
      status: 'active',
      createdAt: Date.now(),
      createdDateStr: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      initialCapital,
      cashBalance: initialCapital,
      openPositions: [],
      closedTrades: [],
      tags: tags.length ? tags : ['Positional', 'Paper'],
    };

    set((state) => ({
      paperSessions: {
        ...state.paperSessions,
        [newId]: newSession,
      },
      activeSessionId: newId,
    }));

    useNotifications.getState().push({
      severity: 'info',
      title: 'Paper Trading Session Created',
      message: `Started session "${name}" with ₹${initialCapital.toLocaleString()} initial margin`,
    });
  },

  squareOffPaperPosition: (sessionId, positionId) => {
    const session = get().paperSessions[sessionId];
    if (!session) return;

    const pos = session.openPositions.find((p) => p.id === positionId);
    if (!pos) return;

    const pnl = (pos.currentPrice - pos.avgEntryPrice) * pos.quantity;
    const proceeds = pos.quantity * pos.currentPrice;

    const squaredOffPos: PaperPosition = {
      ...pos,
      isSquaredOff: true,
      squaredOffPrice: pos.currentPrice,
      squaredOffTimestamp: Date.now(),
    };

    const nextOpen = session.openPositions.filter((p) => p.id !== positionId);
    const nextClosed = [squaredOffPos, ...session.closedTrades];

    set((state) => ({
      paperSessions: {
        ...state.paperSessions,
        [sessionId]: {
          ...session,
          cashBalance: session.cashBalance + proceeds,
          openPositions: nextOpen,
          closedTrades: nextClosed,
        },
      },
    }));

    useNotifications.getState().push({
      severity: pnl >= 0 ? 'info' : 'error',
      title: 'Position Squared Off',
      message: `${pos.symbol}: ${pnl >= 0 ? '+' : ''}₹${pnl.toFixed(2)} realized in session "${session.name}"`,
    });
  },

  addPaperPosition: (sessionId, positionData) => {
    const session = get().paperSessions[sessionId];
    if (!session) return;

    const totalCost = positionData.quantity * positionData.avgEntryPrice;
    if (totalCost > session.cashBalance) {
      useNotifications.getState().push({
        severity: 'error',
        title: 'Insufficient Paper Funds',
        message: `Order requires ₹${totalCost.toLocaleString()}, but session cash balance is ₹${session.cashBalance.toLocaleString()}`,
      });
      return;
    }

    const newPosition: PaperPosition = {
      ...positionData,
      id: `pos-${Date.now()}`,
      entryTimestamp: Date.now(),
      isSquaredOff: false,
    };

    set((state) => ({
      paperSessions: {
        ...state.paperSessions,
        [sessionId]: {
          ...session,
          cashBalance: session.cashBalance - totalCost,
          openPositions: [newPosition, ...session.openPositions],
        },
      },
    }));

    useNotifications.getState().push({
      severity: 'info',
      title: 'Paper Position Opened',
      message: `Bought ${positionData.quantity} shares of ${positionData.symbol} @ ₹${positionData.avgEntryPrice}`,
    });
  },

  updatePositionSlTarget: (sessionId, positionId, stopLoss, target) => {
    const session = get().paperSessions[sessionId];
    if (!session) return;

    const updatedOpen = session.openPositions.map((pos) =>
      pos.id === positionId ? { ...pos, stopLoss, target } : pos
    );

    set((state) => ({
      paperSessions: {
        ...state.paperSessions,
        [sessionId]: {
          ...session,
          openPositions: updatedOpen,
        },
      },
    }));

    useNotifications.getState().push({
      severity: 'info',
      title: 'Risk Levels Updated',
      message: `Stop Loss updated to ₹${stopLoss}, Target to ₹${target}`,
    });
  },

  concludePaperSession: (sessionId, reviewNotes = 'Completed and archived from Portfolio view') => {
    const session = get().paperSessions[sessionId];
    if (!session) return;

    // Calculate gross & net PnL from closed trades
    let grossPnl = 0;
    session.closedTrades.forEach((t) => {
      const exit = t.squaredOffPrice || t.currentPrice;
      grossPnl += (exit - t.avgEntryPrice) * t.quantity;
    });

    const totalCharges = Number((session.closedTrades.length * 120 + Math.abs(grossPnl) * 0.003).toFixed(2));
    const netPnl = Number((grossPnl - totalCharges).toFixed(2));
    const finalEquity = Number((session.cashBalance + (session.openPositions.reduce((acc, p) => acc + p.quantity * p.currentPrice, 0))).toFixed(2));
    const winningTrades = session.closedTrades.filter((t) => (t.squaredOffPrice || t.currentPrice) >= t.avgEntryPrice).length;
    const losingTrades = session.closedTrades.length - winningTrades;
    const winRate = session.closedTrades.length > 0 ? (winningTrades / session.closedTrades.length) * 100 : 0;

    const newRecord: TradebookSessionRecord = {
      id: `tb-${Date.now()}`,
      sessionId: session.id,
      sessionName: session.name,
      accountType: 'paper',
      startDate: session.createdDateStr,
      endDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      durationDays: Math.max(1, Math.round((Date.now() - session.createdAt) / (86400 * 1000))),
      startingCapital: session.initialCapital,
      finalEquity,
      grossPnl,
      netPnl,
      charges: {
        brokerage: Number((session.closedTrades.length * 40).toFixed(2)),
        stt: Number((totalCharges * 0.4).toFixed(2)),
        exchangeTurnover: Number((totalCharges * 0.15).toFixed(2)),
        gst: Number((totalCharges * 0.25).toFixed(2)),
        sebiCharges: 15.0,
        stampDuty: 50.0,
        totalCharges,
      },
      totalTrades: session.closedTrades.length,
      winningTrades,
      losingTrades,
      winRatePct: Number(winRate.toFixed(1)),
      profitFactor: losingTrades > 0 ? Number((1 + (winningTrades / losingTrades) * 0.8).toFixed(2)) : 3.2,
      maxDrawdownPct: 2.4,
      tags: session.tags,
      notes: {
        psychologyRating: 4,
        setupRating: 4,
        strategy: session.tags.join(', '),
        lessons: reviewNotes,
        reviewStatus: 'reviewed',
      },
      trades: session.closedTrades.map((t) => ({
        id: t.id,
        symbol: t.symbol,
        ticker: t.ticker,
        side: t.side,
        quantity: t.quantity,
        entryPrice: t.avgEntryPrice,
        exitPrice: t.squaredOffPrice || t.currentPrice,
        entryTime: t.entryDateStr,
        exitTime: new Date().toLocaleDateString('en-GB'),
        pnl: Number(((t.squaredOffPrice || t.currentPrice) - t.avgEntryPrice) * t.quantity),
        pnlPct: Number(((((t.squaredOffPrice || t.currentPrice) - t.avgEntryPrice) / t.avgEntryPrice) * 100).toFixed(2)),
        holdingPeriod: `${t.holdingDays} days`,
        strategyTag: t.tradeType,
      })),
    };

    set((state) => ({
      paperSessions: {
        ...state.paperSessions,
        [sessionId]: {
          ...session,
          status: 'concluded',
          concludedAt: Date.now(),
        },
      },
      tradebookRecords: [newRecord, ...state.tradebookRecords],
    }));

    useNotifications.getState().push({
      severity: 'info',
      title: 'Session Concluded & Archived',
      message: `Archived "${session.name}" to Tradebook with net P&L ₹${netPnl.toLocaleString()}`,
    });
  },

  updateTradebookNotes: (recordId, updates) => {
    set((state) => ({
      tradebookRecords: state.tradebookRecords.map((r) =>
        r.id === recordId ? { ...r, notes: { ...r.notes, ...updates } } : r
      ),
    }));

    useNotifications.getState().push({
      severity: 'info',
      title: 'Journal Saved',
      message: 'Tradebook psychological notes and analysis updated',
    });
  },

  connectBroker: (broker) => {
    const fullBroker: BrokerAccount = {
      ...broker,
      holdings: [],
      todayPnl: 0,
      todayPnlPct: 0,
      unrealisedPnl: 0,
      unrealisedPnlPct: 0,
      realisedPnl: 0,
      holdingsCount: 0,
    };

    set((state) => ({
      brokerAccounts: {
        ...state.brokerAccounts,
        [broker.id]: fullBroker,
      },
      selectedBrokerId: broker.id,
    }));

    useNotifications.getState().push({
      severity: 'info',
      title: 'Broker Account Connected',
      message: `${broker.brokerName} (${broker.accountNumber}) is now active`,
    });
  },
}));

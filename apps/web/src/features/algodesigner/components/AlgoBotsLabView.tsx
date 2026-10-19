import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
  Play,
  Square,
  Plus,
  Workflow,
  PlayCircle,
  Code2,
  Sliders,
  History,
  Terminal,
  FileCode,
  ShieldAlert,
} from 'lucide-react';
import {
  Panel,
  Button,
  Tabs,
  Indicator,
  PerformanceMetrics,
  StrategiesListTable,
  StrategyTradesTable,
  BacktestOptionsPanel,
  type StrategyListItem,
  type StrategyTradeRow,
  type BacktestConfig,
  type PerformanceMetric,
  type TabItem,
} from '@honba/ui-core';
import './AlgoBotsLabView.css';

export interface Strategy {
  id: string;
  name: string;
  ticker: string;
  type: string;
  kind: 'active' | 'past' | 'saved';
  status: 'running' | 'idle' | 'backtest';
  pnl: number;
  winRate: number;
  trades: number;
  sharpe: number;
  profitFactor: number;
  maxDrawdown: number;
  startedOn?: string;
  stoppedOn?: string;
  savedOn?: string;
  code: string;
  recentTrades: StrategyTradeRow[];
}

export const INITIAL_STRATEGIES: Strategy[] = [
  {
    id: 'strat-1',
    name: 'NIFTY Intraday Momentum',
    ticker: 'NSE:NIFTY50',
    type: 'Momentum Breakout (MIS)',
    kind: 'active',
    status: 'running',
    pnl: 48520.0,
    winRate: 68.4,
    trades: 142,
    sharpe: 2.15,
    profitFactor: 2.12,
    maxDrawdown: -4.8,
    startedOn: '2026-10-18T09:15:00',
    code: `// Honba Equities Algo Strategy: NIFTY Intraday Momentum
// Execution: NSE Simulated / Colocated Low-Latency API
import { EquityTick, OrderIntent } from '@honba/algo-runtime';

export default class NiftyIntradayMomentum {
  private fastPeriod = 14;
  private vwapDeviationPct = 0.45;
  private maxRiskPerTradeInr = 25000;

  onTick(tick: EquityTick): OrderIntent | void {
    if (!tick.isMarketOpen) return;

    const vwapSpread = ((tick.price - tick.vwap) / tick.vwap) * 100;

    // Momentum breakout trigger when price exceeds VWAP + threshold
    if (vwapSpread > this.vwapDeviationPct && this.hasAvailableMargin()) {
      return {
        action: 'BUY',
        ticker: 'NSE:NIFTY50',
        product: 'MIS', // Intraday with 5x leverage
        orderType: 'MARKET',
        quantity: Math.floor(this.maxRiskPerTradeInr / tick.price),
      };
    }
  }

  private hasAvailableMargin(): boolean {
    return true;
  }
}`,
    recentTrades: [
      {
        id: 'tr-101',
        entryAt: '2026-10-19 14:10:00',
        closedAt: '2026-10-19 14:32:00',
        entryPrice: 24850.5,
        closingPrice: 24925.0,
        amount: 50,
        realizedPnl: 3725.0,
        side: 'long',
        orderId: 'ORD-99120',
        orderType: 'MARKET',
      },
      {
        id: 'tr-102',
        entryAt: '2026-10-19 11:20:00',
        closedAt: '2026-10-19 11:45:00',
        entryPrice: 24780.0,
        closingPrice: 24840.0,
        amount: 50,
        realizedPnl: 3000.0,
        side: 'long',
        orderId: 'ORD-98834',
        orderType: 'LIMIT',
      },
      {
        id: 'tr-103',
        entryAt: '2026-10-19 09:30:00',
        closedAt: '2026-10-19 09:48:00',
        entryPrice: 24720.0,
        closingPrice: 24695.0,
        amount: 50,
        realizedPnl: -1250.0,
        side: 'long',
        orderId: 'ORD-98411',
        orderType: 'STOP_LOSS',
      },
    ],
  },
  {
    id: 'strat-2',
    name: 'Reliance VWAP Mean-Reversion',
    ticker: 'NSE:RELIANCE',
    type: 'VWAP Bands & Statistical Arb',
    kind: 'active',
    status: 'running',
    pnl: 28450.5,
    winRate: 64.2,
    trades: 86,
    sharpe: 1.94,
    profitFactor: 1.88,
    maxDrawdown: -5.2,
    startedOn: '2026-10-18T10:00:00',
    code: `// Honba Equities Algo Strategy: Reliance VWAP Mean-Reversion
import { EquityTick, OrderIntent } from '@honba/algo-runtime';

export default class RelianceVwapStrategy {
  private vwapTolerance = 0.6;

  onTick(tick: EquityTick): OrderIntent | void {
    if (tick.price < tick.vwap * (1 - this.vwapTolerance / 100)) {
      return {
        action: 'BUY',
        ticker: 'NSE:RELIANCE',
        product: 'MIS',
        orderType: 'LIMIT',
        limitPrice: tick.bestBid,
        quantity: 100,
      };
    }
  }
}`,
    recentTrades: [
      {
        id: 'tr-201',
        entryAt: '2026-10-19 13:00:00',
        closedAt: '2026-10-19 13:25:00',
        entryPrice: 2980.0,
        closingPrice: 3005.0,
        amount: 100,
        realizedPnl: 2500.0,
        side: 'long',
        orderId: 'ORD-84912',
        orderType: 'LIMIT',
      },
      {
        id: 'tr-202',
        entryAt: '2026-10-19 10:15:00',
        closedAt: '2026-10-19 10:55:00',
        entryPrice: 2995.0,
        closingPrice: 3012.0,
        amount: 100,
        realizedPnl: 1700.0,
        side: 'long',
        orderId: 'ORD-83901',
        orderType: 'LIMIT',
      },
    ],
  },
  {
    id: 'strat-3',
    name: 'Tata Motors 20/50 EMA Trend',
    ticker: 'NSE:TATAMOTORS',
    type: 'Trend Following Delivery (CNC)',
    kind: 'past',
    status: 'idle',
    pnl: -4200.0,
    winRate: 47.0,
    trades: 34,
    sharpe: 0.95,
    profitFactor: 0.88,
    maxDrawdown: -8.1,
    startedOn: '2026-10-10T09:15:00',
    stoppedOn: '2026-10-17T15:30:00',
    code: `// Honba Equities Algo Strategy: Tata Motors EMA Cross
export default class TataMotorsEmaCross {
  onBar(bar: any) {
    if (bar.ema20 > bar.ema50 && bar.prevEma20 <= bar.prevEma50) {
      return { action: 'BUY', ticker: 'NSE:TATAMOTORS', quantity: 200 };
    }
  }
}`,
    recentTrades: [
      {
        id: 'tr-301',
        entryAt: '2026-10-17 10:00:00',
        closedAt: '2026-10-17 14:30:00',
        entryPrice: 940.0,
        closingPrice: 919.0,
        amount: 200,
        realizedPnl: -4200.0,
        side: 'long',
        orderId: 'ORD-77123',
        orderType: 'STOP_LOSS',
      },
    ],
  },
  {
    id: 'strat-4',
    name: 'BankNIFTY Opening Range Breakout',
    ticker: 'NSE:BANKNIFTY',
    type: 'ORB 15-Min Bracket',
    kind: 'active',
    status: 'running',
    pnl: 36700.0,
    winRate: 71.0,
    trades: 59,
    sharpe: 2.38,
    profitFactor: 2.45,
    maxDrawdown: -3.5,
    startedOn: '2026-10-19T09:15:00',
    code: `// Honba Equities Algo Strategy: BankNIFTY ORB 15-Min
export default class BankNiftyORB {
  onSessionOpen() {
    // Determine 09:15 - 09:30 candle highs and lows
  }
}`,
    recentTrades: [
      {
        id: 'tr-401',
        entryAt: '2026-10-19 09:31:00',
        closedAt: '2026-10-19 10:15:00',
        entryPrice: 51200.0,
        closingPrice: 51580.0,
        amount: 30,
        realizedPnl: 11400.0,
        side: 'long',
        orderId: 'ORD-91283',
        orderType: 'MARKET',
      },
    ],
  },
  {
    id: 'strat-5',
    name: 'HDFC Bank Statistical Arbitrage',
    ticker: 'NSE:HDFCBANK',
    type: 'Pairs & Mean Reversion',
    kind: 'saved',
    status: 'idle',
    pnl: 18200.0,
    winRate: 62.5,
    trades: 40,
    sharpe: 1.75,
    profitFactor: 1.68,
    maxDrawdown: -4.1,
    savedOn: '2026-10-16T18:00:00',
    code: `// Saved Custom Strategy: HDFC Bank Pairs Mean Reversion
export default class HdfcBankStatArb {
  // Pairs spread calculation against BankNifty Index weight
}`,
    recentTrades: [],
  },
];

const RIGHT_PANEL_TABS: TabItem<string>[] = [
  { value: 'code', label: 'Script & Runtime', icon: <Code2 size={13} /> },
  { value: 'backtest', label: 'Backtest & Parameters', icon: <Sliders size={13} /> },
  { value: 'trades', label: 'Executed Trades', icon: <History size={13} /> },
  { value: 'telemetry', label: 'Engine Telemetry', icon: <Terminal size={13} /> },
];

export const AlgoBotsLabView: React.FC = () => {
  const navigate = useNavigate();
  const [strategies, setStrategies] = useState<Strategy[]>(INITIAL_STRATEGIES);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>(INITIAL_STRATEGIES[0].id);
  const [activeTab, setActiveTab] = useState<string>('code');

  const selectedStrategy = useMemo(() => {
    return strategies.find((s) => s.id === selectedStrategyId) ?? strategies[0];
  }, [strategies, selectedStrategyId]);

  // Backtest options state
  const [backtestConfig, setBacktestConfig] = useState<BacktestConfig>({
    symbol: selectedStrategy.ticker,
    timeframe: '5m',
    from: '2026-09-01',
    to: '2026-10-19',
    capital: 500000,
    positionMode: 'long',
  });
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [backtestPercent, setBacktestPercent] = useState(0);
  const [backtestStartedOn, setBacktestStartedOn] = useState<number | undefined>();

  // Map strategies to @honba/ui-core StrategiesListTable format
  const tableRows = useMemo<StrategyListItem[]>(() => {
    return strategies.map((s) => ({
      id: s.id,
      name: s.name,
      instrument: s.ticker,
      kind: s.kind,
      startedOn: s.startedOn,
      stoppedOn: s.stoppedOn,
      savedOn: s.savedOn,
      profitFactor: s.profitFactor,
      pnl: s.pnl,
      strategyType: s.type,
    }));
  }, [strategies]);

  // Build @honba/ui-core PerformanceMetrics
  const performanceMetrics = useMemo<PerformanceMetric[]>(() => {
    return [
      {
        label: 'Realized P&L',
        value: `${selectedStrategy.pnl >= 0 ? '+' : ''}₹${Math.abs(selectedStrategy.pnl).toLocaleString('en-IN')}`,
        tone: selectedStrategy.pnl >= 0 ? 'positive' : 'negative',
      },
      {
        label: 'Win Rate',
        value: `${selectedStrategy.winRate.toFixed(1)}%`,
        tone: selectedStrategy.winRate >= 50 ? 'positive' : 'warning',
      },
      {
        label: 'Profit Factor',
        value: selectedStrategy.profitFactor.toFixed(2),
        tone: selectedStrategy.profitFactor >= 1.5 ? 'positive' : selectedStrategy.profitFactor >= 1 ? 'neutral' : 'negative',
      },
      {
        label: 'Sharpe Ratio',
        value: selectedStrategy.sharpe.toFixed(2),
        tone: selectedStrategy.sharpe >= 1.5 ? 'positive' : 'neutral',
      },
      {
        label: 'Trades Executed',
        value: String(selectedStrategy.trades),
        tone: 'neutral',
      },
      {
        label: 'Max Drawdown',
        value: `${selectedStrategy.maxDrawdown.toFixed(1)}%`,
        tone: 'negative',
      },
    ];
  }, [selectedStrategy]);

  const toggleStrategyStatus = (id: string) => {
    setStrategies((list) =>
      list.map((s) => {
        if (s.id === id) {
          const next = s.status === 'running' ? 'idle' : 'running';
          const nextKind = next === 'running' ? 'active' : 'past';
          return { ...s, status: next, kind: nextKind };
        }
        return s;
      })
    );
  };

  const handleAddNewStrategy = () => {
    const newId = `strat-${Date.now()}`;
    const newStrat: Strategy = {
      id: newId,
      name: 'Custom NSE Momentum Bot',
      ticker: 'NSE:INFY',
      type: 'Custom Logic (MIS)',
      kind: 'saved',
      status: 'idle',
      pnl: 0,
      winRate: 50,
      trades: 0,
      sharpe: 1.0,
      profitFactor: 1.0,
      maxDrawdown: 0,
      savedOn: new Date().toISOString(),
      code: `// Honba Equities Algo Strategy: Custom NSE Momentum Bot
export default class CustomBot {
  onTick(tick: any) {
    // Write your custom strategy logic
  }
}`,
      recentTrades: [],
    };
    setStrategies((prev) => [...prev, newStrat]);
    setSelectedStrategyId(newId);
  };

  const handleRemoveStrategy = (item: StrategyListItem) => {
    setStrategies((prev) => prev.filter((s) => s.id !== item.id));
  };

  const handleStartBacktest = (config: BacktestConfig) => {
    setIsBacktesting(true);
    setBacktestPercent(0);
    setBacktestStartedOn(Date.now());

    let current = 0;
    const interval = setInterval(() => {
      current += 20;
      setBacktestPercent(current);
      if (current >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsBacktesting(false);
        }, 500);
      }
    }, 400);
  };

  return (
    <div className="algo-bots-lab-root">
      {/* Top Banner & Header Toolbar */}
      <div className="algo-bots-header">
        <div>
          <h2 className="algo-bots-title">Algo Bots & Strategy Lab</h2>
          <p className="algo-bots-subtitle">
            Simulated quantitative execution engines, NSE/BSE intraday algos, and automated execution pipelines
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button
            variant="default"
            onClick={() => navigate('/strategy-studio?mode=designer')}
          >
            <Workflow size={13} style={{ marginRight: 6 }} /> Visual Flow Designer
          </Button>
          <Button
            variant="blue"
            onClick={handleAddNewStrategy}
          >
            <Plus size={13} style={{ marginRight: 6 }} /> New Strategy Bot
          </Button>
        </div>
      </div>

      {/* Main 2-Column Grid using @honba/ui-core Panels */}
      <div className="algo-bots-grid">
        {/* Left Panel: Strategy Portfolio Directory */}
        <Panel
          label="Equities Algo Bots"
          className="algo-bots-left-panel"
          headerComponents={
            <span className="algo-bots-badge-total">{strategies.length} Total</span>
          }
        >
          <div className="algo-bots-table-wrapper">
            <StrategiesListTable
              rows={tableRows}
              height={520}
              onLoad={(item) => setSelectedStrategyId(item.id)}
              onRemove={handleRemoveStrategy}
            />
          </div>
        </Panel>

        {/* Right Panel: Selected Strategy Execution Console */}
        <Panel
          label={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Indicator
                color={selectedStrategy.status === 'running' ? 'green' : 'grey'}
                blinking={selectedStrategy.status === 'running'}
              />
              <span style={{ fontWeight: 700, fontSize: 14 }}>{selectedStrategy.name}</span>
              <span className="algo-bots-ticker-pill">{selectedStrategy.ticker}</span>
              <span className="algo-bots-type-pill">{selectedStrategy.type}</span>
            </span>
          }
          className="algo-bots-right-panel"
          headerComponents={
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Button
                variant={selectedStrategy.status === 'running' ? 'red' : 'green'}
                onClick={() => toggleStrategyStatus(selectedStrategy.id)}
              >
                {selectedStrategy.status === 'running' ? (
                  <>
                    <Square size={12} style={{ marginRight: 4 }} /> Halt Bot
                  </>
                ) : (
                  <>
                    <Play size={12} style={{ marginRight: 4 }} /> Start Execution
                  </>
                )}
              </Button>
              <Button
                variant="default"
                onClick={() =>
                  navigate(
                    `/simulator?strategy=${encodeURIComponent(selectedStrategy.name)}&symbol=${encodeURIComponent(
                      selectedStrategy.ticker
                    )}`
                  )
                }
                title="Launch Simulation Replay Workbench with this strategy"
              >
                <PlayCircle size={12} style={{ marginRight: 4 }} /> Simulate &rarr;
              </Button>
            </div>
          }
        >
          <div className="algo-bots-panel-body">
            {/* Top Metrics Row: Institutional PerformanceMetrics */}
            <div className="algo-bots-metrics-box">
              <PerformanceMetrics
                metrics={performanceMetrics}
                label="Risk & Performance Telemetry (Simulated)"
              />
            </div>

            {/* Sub-tab Navigation */}
            <div className="algo-bots-tabs-row">
              <Tabs
                tabs={RIGHT_PANEL_TABS}
                activeTab={activeTab}
                onTabClick={setActiveTab}
              />
            </div>

            {/* Tab Contents */}
            <div className="algo-bots-tab-content">
              {activeTab === 'code' && (
                <div className="algo-bots-monaco-wrapper">
                  <div className="algo-bots-editor-bar">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FileCode size={13} /> {selectedStrategy.name}.ts — Honba Quantitative Runtime Script
                    </span>
                    <span className="algo-bots-env-tag">Runtime: Node / Colocation Sandbox</span>
                  </div>
                  <Editor
                    height="360px"
                    defaultLanguage="typescript"
                    language="typescript"
                    theme="vs-dark"
                    value={selectedStrategy.code}
                    options={{
                      readOnly: false,
                      minimap: { enabled: false },
                      fontSize: 12.5,
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                    }}
                  />
                </div>
              )}

              {activeTab === 'backtest' && (
                <div className="algo-bots-backtest-wrapper">
                  <BacktestOptionsPanel
                    config={backtestConfig}
                    onChange={setBacktestConfig}
                    onStart={handleStartBacktest}
                    isRunning={isBacktesting}
                    percent={backtestPercent}
                    startedOn={backtestStartedOn}
                  />
                </div>
              )}

              {activeTab === 'trades' && (
                <div className="algo-bots-trades-wrapper">
                  <StrategyTradesTable
                    rows={selectedStrategy.recentTrades}
                    height={360}
                    emptyMessage="No executed trades recorded for this strategy session."
                  />
                </div>
              )}

              {activeTab === 'telemetry' && (
                <div className="algo-bots-telemetry-wrapper">
                  <div className="algo-bots-logs-box">
                    <div className="algo-bots-logs-title">Engine Stream & Live Heartbeat</div>
                    <div className="algo-bots-logs-content">
                      <div className="algo-bots-log-row">
                        <Indicator color="green" blinking />
                        <span>WebSocket gateway: NSE Colocation Multicast gateway active (0.42ms latency)</span>
                      </div>
                      <div className="algo-bots-log-row">
                        <Indicator color="green" />
                        <span>Tick ingest rate: 1,420 ticks/sec across monitored instruments</span>
                      </div>
                      <div className="algo-bots-log-row">
                        <Indicator color="grey" />
                        <span>Signal dispatch queue: 0 pending, memory footprint 42MB</span>
                      </div>
                      <div className="algo-bots-log-row">
                        <ShieldAlert size={12} color="var(--bullish)" />
                        <span>Risk manager: Circuit breaker healthy, drawdown ceiling ₹50,000</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
};

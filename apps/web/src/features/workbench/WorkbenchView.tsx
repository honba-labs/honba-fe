import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Square,
  Plus,
  Cpu,
  BarChart2,
  CheckCircle2,
  Clock,
  Code2,
  Sparkles,
} from 'lucide-react';
import { themeEngine } from '../../core/theme-engine';
import { HonbaClient } from '../../core/api/generated/client';
import { useWorkbenchStore } from '../../core/workbench/store';
import { WorkbenchToolbar } from './workbench-toolbar';
import { MultiChartGrid } from './multi-chart-grid';
import { OrderTicket } from './order-ticket';
import { OrderModal } from './order-modal';
import { TradingDrawer } from './trading-drawer';
import './WorkbenchView.css';

interface Strategy {
  id: string;
  name: string;
  ticker: string;
  type: string;
  status: 'running' | 'idle' | 'backtest';
  pnl: number;
  winRate: number;
  trades: number;
  sharpe: number;
}

const INITIAL_STRATEGIES: Strategy[] = [
  {
    id: 'strat-1',
    name: 'NIFTY Intraday Momentum',
    ticker: 'NSE:NIFTY50',
    type: 'Momentum Breakout (MIS)',
    status: 'running',
    pnl: 48520.0,
    winRate: 68.4,
    trades: 142,
    sharpe: 2.15,
  },
  {
    id: 'strat-2',
    name: 'Reliance VWAP Mean-Reversion',
    ticker: 'NSE:RELIANCE',
    type: 'VWAP Bands & Statistical Arb',
    status: 'running',
    pnl: 28450.5,
    winRate: 64.2,
    trades: 86,
    sharpe: 1.94,
  },
  {
    id: 'strat-3',
    name: 'Tata Motors 20/50 EMA Trend',
    ticker: 'NSE:TATAMOTORS',
    type: 'Trend Following Delivery (CNC)',
    status: 'idle',
    pnl: -4200.0,
    winRate: 47.0,
    trades: 34,
    sharpe: 0.95,
  },
  {
    id: 'strat-4',
    name: 'BankNIFTY Opening Range Breakout',
    ticker: 'NSE:BANKNIFTY',
    type: 'ORB 15-Min Bracket',
    status: 'running',
    pnl: 36700.0,
    winRate: 71.0,
    trades: 59,
    sharpe: 2.38,
  },
];

export function WorkbenchView() {
  const [activeTab, setActiveTab] = useState<'terminal' | 'bots'>('terminal');
  const client = useMemo(() => new HonbaClient({}), []);
  const { fetchState, isOrderTicketOpen } = useWorkbenchStore();

  const [strategies, setStrategies] = useState<Strategy[]>(INITIAL_STRATEGIES);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy>(INITIAL_STRATEGIES[0]);
  const [code, setCode] = useState(`// Honba Equities Algo Strategy: ${selectedStrategy.name}
// Execution: NSE Simulated / Colocated Low-Latency API
import { EquityTick, OrderIntent } from '@honba/algo-runtime';

export default class StrategyRunner {
  private fastPeriod = 14;
  private vwapDeviationPct = 0.45;
  private maxRiskPerTradeInr = 25000;

  onTick(tick: EquityTick): OrderIntent | void {
    // Filter outside regular NSE market hours (09:15 - 15:30 IST)
    if (!tick.isMarketOpen) return;

    const vwapSpread = (tick.price - tick.vwap) / tick.vwap * 100;

    // Mean-reversion trigger when price dips below VWAP lower band
    if (vwapSpread < -this.vwapDeviationPct && this.hasAvailableMargin()) {
      return {
        action: 'BUY',
        ticker: '${selectedStrategy.ticker}',
        product: 'MIS', // Intraday with 5x leverage
        orderType: 'LIMIT',
        limitPrice: tick.bestBid,
        quantity: Math.floor(this.maxRiskPerTradeInr / tick.price),
      };
    }
  }
}`);

  useEffect(() => {
    themeEngine.applyToDOM();
    void fetchState(client);
  }, [client, fetchState]);

  const toggleStrategyStatus = (id: string) => {
    setStrategies((list) =>
      list.map((s) => {
        if (s.id === id) {
          const next = s.status === 'running' ? 'idle' : 'running';
          return { ...s, status: next };
        }
        return s;
      })
    );
  };

  return (
    <div className="workbench-view-root">
      {/* Workbench Subheader Mode Switcher */}
      <div className="workbench-mode-header">
        <div className="workbench-mode-nav">
          <button
            type="button"
            className={`workbench-mode-btn ${activeTab === 'terminal' ? 'active' : ''}`}
            onClick={() => setActiveTab('terminal')}
          >
            <BarChart2 size={15} />
            <span>Multi-Chart Terminal</span>
            <span className="badge-openalgo">OpenAlgo Charts</span>
          </button>
          <button
            type="button"
            className={`workbench-mode-btn ${activeTab === 'bots' ? 'active' : ''}`}
            onClick={() => setActiveTab('bots')}
          >
            <Cpu size={15} />
            <span>Algo Bots & Strategy Lab</span>
            <span className="badge-count">{strategies.length}</span>
          </button>
        </div>

        <div className="workbench-mode-right">
          {activeTab === 'terminal' ? (
            <div className="workbench-tagline">
              <Sparkles size={13} className="text-accent" />
              <span>Multi-Pane NSE/BSE Grid • 502 Technical Indicators • Live Execution</span>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                const newStrat: Strategy = {
                  id: `strat-${Date.now()}`,
                  name: 'Custom NSE Momentum Bot',
                  ticker: 'NSE:INFY',
                  type: 'Custom Logic (MIS)',
                  status: 'idle',
                  pnl: 0,
                  winRate: 50,
                  trades: 0,
                  sharpe: 1.0,
                };
                setStrategies([...strategies, newStrat]);
                setSelectedStrategy(newStrat);
              }}
            >
              <Plus size={14} /> New Strategy
            </button>
          )}
        </div>
      </div>

      {/* Mode 1: Multi-Chart Terminal (OpenAlgo Charts) */}
      {activeTab === 'terminal' ? (
        <div className="workbench-terminal-area">
          <WorkbenchToolbar client={client} />

          <div className="workbench-charts-container">
            <MultiChartGrid />
            {isOrderTicketOpen && <OrderTicket client={client} />}
          </div>

          <TradingDrawer client={client} />
          <OrderModal client={client} />
        </div>
      ) : (
        /* Mode 2: Strategy Lab & Algo Bots */
        <div className="workbench-container">
          <div className="workbench-header">
            <div>
              <h2 className="workbench-title">Algo Workbench & Strategy Lab</h2>
              <p className="workbench-subtitle">
                Simulated quantitative execution engines, NSE/BSE intraday algos, and backtest pipelines
              </p>
            </div>
          </div>

          <div className="workbench-grid">
            {/* Left: Strategy List */}
            <div className="card workbench-list-card">
              <div className="workbench-card-head">
                <span className="workbench-card-title">Equities Algo Bots</span>
                <span className="pill pill-neutral">{strategies.length} Total</span>
              </div>

              <div className="workbench-strat-list">
                {strategies.map((strat) => (
                  <div
                    key={strat.id}
                    className={`workbench-strat-item ${selectedStrategy.id === strat.id ? 'active' : ''}`}
                    onClick={() => setSelectedStrategy(strat)}
                  >
                    <div className="workbench-strat-top">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: strat.status === 'running' ? 'var(--bullish)' : 'var(--fg-muted)',
                          }}
                        />
                        <span className="workbench-strat-name">{strat.name}</span>
                      </div>
                      <span className={`pill ${strat.status === 'running' ? 'pill-bullish' : 'pill-neutral'}`}>
                        {strat.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="workbench-strat-metrics">
                      <div>
                        <span className="workbench-metric-lbl">Scrip: </span>
                        <span className="workbench-metric-val">{strat.ticker}</span>
                      </div>
                      <div>
                        <span className="workbench-metric-lbl">P&L: </span>
                        <span
                          className={`num workbench-metric-val ${
                            strat.pnl >= 0 ? 'color-bullish' : 'color-bearish'
                          }`}
                        >
                          {strat.pnl >= 0 ? '+' : ''}₹{Math.abs(strat.pnl).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div>
                        <span className="workbench-metric-lbl">Win: </span>
                        <span className="workbench-metric-val">{strat.winRate}%</span>
                      </div>
                    </div>

                    <div className="workbench-strat-actions">
                      <button
                        type="button"
                        className={`btn btn-xs ${strat.status === 'running' ? 'btn-danger' : 'btn-outline'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStrategyStatus(strat.id);
                        }}
                      >
                        {strat.status === 'running' ? <Square size={12} /> : <Play size={12} />}
                        {strat.status === 'running' ? 'Stop Bot' : 'Run Bot'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Strategy Detail & Editor */}
            <div className="card workbench-detail-card">
              <div className="workbench-detail-head">
                <div>
                  <div className="workbench-strat-title">{selectedStrategy.name}</div>
                  <div className="workbench-strat-type">{selectedStrategy.type}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className={`btn ${selectedStrategy.status === 'running' ? 'btn-danger' : 'btn-primary'} btn-sm`}
                    onClick={() => toggleStrategyStatus(selectedStrategy.id)}
                  >
                    {selectedStrategy.status === 'running' ? <Square size={14} /> : <Play size={14} />}
                    {selectedStrategy.status === 'running' ? 'Halt Bot' : 'Start Execution'}
                  </button>
                </div>
              </div>

              {/* Strategy Parameters */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '12px',
                  marginBottom: '16px',
                }}
              >
                <div className="stat-card" style={{ padding: '10px' }}>
                  <div className="stat-label">Total Realized P&L</div>
                  <div
                    className={`num stat-val ${
                      selectedStrategy.pnl >= 0 ? 'color-bullish' : 'color-bearish'
                    }`}
                  >
                    {selectedStrategy.pnl >= 0 ? '+' : ''}₹
                    {Math.abs(selectedStrategy.pnl).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="stat-card" style={{ padding: '10px' }}>
                  <div className="stat-label">Win Rate</div>
                  <div className="num stat-val">{selectedStrategy.winRate}%</div>
                </div>
                <div className="stat-card" style={{ padding: '10px' }}>
                  <div className="stat-label">Trades Executed</div>
                  <div className="num stat-val">{selectedStrategy.trades}</div>
                </div>
                <div className="stat-card" style={{ padding: '10px' }}>
                  <div className="stat-label">Sharpe Ratio</div>
                  <div className="num stat-val">{selectedStrategy.sharpe}</div>
                </div>
              </div>

              {/* Code Editor */}
              <div className="workbench-code-editor-wrapper">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '8px',
                    fontSize: '12px',
                    color: 'var(--fg-muted)',
                  }}
                >
                  <Code2 size={14} /> Algo Execution Script (TypeScript / Honba Runtime)
                </div>
                <textarea
                  className="workbench-code-textarea"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  spellCheck={false}
                />
              </div>

              {/* Runtime Logs / Backtest summary */}
              <div className="workbench-logs-box">
                <div className="workbench-logs-title">Engine Stream & Live Heartbeat</div>
                <div className="workbench-logs-content">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={13} color="var(--bullish)" />
                    <span>WebSocket feeds connected: NSE Colocation Multicast gateway active (0.4ms)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={13} color="var(--fg-muted)" />
                    <span>Tick ingest rate: 1,420 ticks/sec across 20 monitored NIFTY50 instruments</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import {
  Play,
  Square,
  Plus,
  Cpu,
  BarChart2,
  Sliders,
  CheckCircle2,
  Clock,
  Code2,
} from 'lucide-react';
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
    <div className="workbench-container">
      {/* Header */}
      <div className="workbench-header">
        <div>
          <h2 className="workbench-title">Algo Workbench & Strategy Lab</h2>
          <p className="workbench-subtitle">
            Simulated quantitative execution engines, NSE/BSE intraday algos, and backtest pipelines
          </p>
        </div>
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
      </div>

      {/* Strategies Grid */}
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
                    <span className="num workbench-metric-val">{strat.winRate}%</span>
                  </div>
                </div>

                <div className="workbench-strat-actions">
                  <button
                    type="button"
                    className={`btn btn-sm ${strat.status === 'running' ? 'btn-outline' : 'btn-primary'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStrategyStatus(strat.id);
                    }}
                  >
                    {strat.status === 'running' ? (
                      <>
                        <Square size={12} /> Pause
                      </>
                    ) : (
                      <>
                        <Play size={12} /> Deploy
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Strategy Configuration & Code Canvas */}
        <div className="card workbench-detail-card">
          <div className="workbench-detail-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Code2 size={18} color="var(--primary)" />
              <div>
                <h3 className="workbench-strat-title">{selectedStrategy.name}</h3>
                <span className="workbench-strat-type">{selectedStrategy.type} · {selectedStrategy.ticker}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => alert(`Running backtest for ${selectedStrategy.name} across last 180 days of NSE tick data... Return: +24.8%, Max DD: 4.2%, Sharpe: 2.3`)}
              >
                <BarChart2 size={13} /> Run Backtest
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => alert('Strategy logic saved and deployed to paper trading sandbox!')}
              >
                Save
              </button>
            </div>
          </div>

          <div className="workbench-code-editor-wrapper">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="workbench-code-textarea num"
              spellCheck={false}
            />
          </div>

          <div className="workbench-logs-box">
            <div className="workbench-logs-title">Execution Log (NSE Live Simulated Feed)</div>
            <div className="workbench-logs-content num">
              <div>[09:15:02 IST] Market opened. Strategy {selectedStrategy.id} subscribed to {selectedStrategy.ticker}</div>
              <div>[09:15:10 IST] Available trading margin: ₹4,85,000 verified. Risk limit: ₹25,000/order</div>
              <div>[09:22:45 IST] Signal trigger: VWAP deviation -0.48% detected on {selectedStrategy.ticker}</div>
              <div>[09:22:46 IST] Order placed: BUY 50 shares @ ₹2,938.50 MIS Limit. Exchange ack received</div>
              <div style={{ color: 'var(--bullish)' }}>[09:22:48 IST] Order FILLED: 50/50 @ ₹2,938.50. Position active. Unrealised P&L: +₹480.00</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

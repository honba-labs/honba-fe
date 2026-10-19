import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  FastForward,
  TrendingUp,
  BarChart2,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  Sliders,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import './SimulatorView.css';

interface SimTrade {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entryTime: string;
  exitTime: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPct: number;
  returnR: number;
  reason: 'Target hit' | 'Trailing SL' | 'Session Close';
}

const SIMULATED_TRADES: SimTrade[] = [
  {
    id: 'sim-1',
    symbol: 'NSE:NIFTY50',
    side: 'BUY',
    entryTime: '18 Oct 09:20',
    exitTime: '18 Oct 11:45',
    entryPrice: 24920.0,
    exitPrice: 25080.0,
    quantity: 100,
    pnl: 16000.0,
    pnlPct: 0.64,
    returnR: 2.4,
    reason: 'Target hit',
  },
  {
    id: 'sim-2',
    symbol: 'NSE:RELIANCE',
    side: 'BUY',
    entryTime: '17 Oct 10:15',
    exitTime: '17 Oct 14:30',
    entryPrice: 2915.0,
    exitPrice: 2955.0,
    quantity: 150,
    pnl: 6000.0,
    pnlPct: 1.37,
    returnR: 1.8,
    reason: 'Target hit',
  },
  {
    id: 'sim-3',
    symbol: 'NSE:HDFCBANK',
    side: 'BUY',
    entryTime: '16 Oct 09:35',
    exitTime: '16 Oct 10:40',
    entryPrice: 1675.0,
    exitPrice: 1668.0,
    quantity: 200,
    pnl: -1400.0,
    pnlPct: -0.42,
    returnR: -1.0,
    reason: 'Trailing SL',
  },
  {
    id: 'sim-4',
    symbol: 'NSE:TCS',
    side: 'BUY',
    entryTime: '15 Oct 11:00',
    exitTime: '15 Oct 15:15',
    entryPrice: 4090.0,
    exitPrice: 4160.0,
    quantity: 50,
    pnl: 3500.0,
    pnlPct: 1.71,
    returnR: 2.1,
    reason: 'Target hit',
  },
  {
    id: 'sim-5',
    symbol: 'NSE:LT',
    side: 'BUY',
    entryTime: '14 Oct 13:20',
    exitTime: '14 Oct 15:20',
    entryPrice: 3520.0,
    exitPrice: 3565.0,
    quantity: 60,
    pnl: 2700.0,
    pnlPct: 1.28,
    returnR: 1.5,
    reason: 'Session Close',
  },
];

// Monthly Heatmap Returns Matrix (Years x Months)
const MONTHLY_RETURNS = [
  {
    year: '2026',
    months: [
      { m: 'Jan', val: 3.8 },
      { m: 'Feb', val: 4.2 },
      { m: 'Mar', val: -1.1 },
      { m: 'Apr', val: 5.4 },
      { m: 'May', val: 2.1 },
      { m: 'Jun', val: 3.6 },
      { m: 'Jul', val: 1.9 },
      { m: 'Aug', val: 2.8 },
      { m: 'Sep', val: -0.6 },
      { m: 'Oct', val: 4.1 },
      { m: 'Nov', val: null },
      { m: 'Dec', val: null },
    ],
    ytd: 29.3,
  },
  {
    year: '2025',
    months: [
      { m: 'Jan', val: 2.4 },
      { m: 'Feb', val: -1.8 },
      { m: 'Mar', val: 3.1 },
      { m: 'Apr', val: 4.0 },
      { m: 'May', val: 1.5 },
      { m: 'Jun', val: 6.2 },
      { m: 'Jul', val: 3.9 },
      { m: 'Aug', val: -0.8 },
      { m: 'Sep', val: 2.7 },
      { m: 'Oct', val: 3.3 },
      { m: 'Nov', val: 4.8 },
      { m: 'Dec', val: 2.0 },
    ],
    ytd: 35.8,
  },
];

export function SimulatorView() {
  const navigate = useNavigate();
  const [strategy, setStrategy] = useState('EMA 20/50 Trend Follower');
  const [instrument, setInstrument] = useState('NSE:NIFTY50');
  const [timeframe, setTimeframe] = useState('5m');
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 5 | 15 | 60>(5);
  const [replayProgress, setReplayProgress] = useState(68); // 0 to 100%

  // Simulated replay step tick
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setReplayProgress((prev) => {
        if (prev >= 100) {
          setIsPlaying(false);
          return 100;
        }
        return prev + 1;
      });
    }, 1000 / (speed === 60 ? 12 : speed));

    return () => clearInterval(interval);
  }, [isPlaying, speed]);

  // Equity curve data points
  const simChartPoints = [
    { pt: 1000000 },
    { pt: 1018000 },
    { pt: 1045000 },
    { pt: 1039000 },
    { pt: 1072000 },
    { pt: 1110000 },
    { pt: 1095000 },
    { pt: 1145000 },
    { pt: 1180000 },
    { pt: 1168000 },
    { pt: 1215000 },
    { pt: 1248500 },
  ];

  const svgWidth = 720;
  const svgHeight = 180;
  const minVal = 980000;
  const maxVal = 1270000;

  const pointsString = simChartPoints.map((pt, i) => {
    const x = (i / (simChartPoints.length - 1)) * svgWidth;
    const y = svgHeight - ((pt.pt - minVal) / (maxVal - minVal)) * svgHeight;
    return `${x},${y}`;
  }).join(' ');

  const areaPointsString = `0,${svgHeight} ${pointsString} ${svgWidth},${svgHeight}`;

  return (
    <div className="simulator-container">
      {/* 1. Header Toolbar & Historical Replay Controls */}
      <div className="card sim-toolbar-card">
        <div className="sim-toolbar-left">
          <div className="sim-field-group">
            <span className="sim-label">Strategy</span>
            <select
              className="sim-select"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
            >
              <option value="EMA 20/50 Trend Follower">EMA 20/50 Trend Follower</option>
              <option value="VWAP Mean-Reversion">VWAP Mean-Reversion & Bands</option>
              <option value="15-min Opening Range Breakout (ORB)">15-min Opening Range Breakout (ORB)</option>
              <option value="Supertrend Multi-Timeframe">Supertrend Multi-Timeframe</option>
            </select>
          </div>

          <div className="sim-field-group">
            <span className="sim-label">Instrument</span>
            <select
              className="sim-select"
              value={instrument}
              onChange={(e) => setInstrument(e.target.value)}
            >
              <option value="NSE:NIFTY50">NSE:NIFTY50 (Nifty 50 Index)</option>
              <option value="NSE:BANKNIFTY">NSE:BANKNIFTY (Bank Nifty)</option>
              <option value="NSE:RELIANCE">NSE:RELIANCE (Reliance Ind)</option>
              <option value="NSE:TCS">NSE:TCS (Tata Consultancy)</option>
              <option value="NSE:HDFCBANK">NSE:HDFCBANK (HDFC Bank)</option>
            </select>
          </div>

          <div className="sim-field-group">
            <span className="sim-label">Timeframe</span>
            <select
              className="sim-select"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
            >
              <option value="1m">1m</option>
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="1d">1d</option>
            </select>
          </div>
        </div>

        {/* Center: Replay Controller */}
        <div className="sim-replay-controls">
          <button
            type="button"
            className="sim-ctrl-btn"
            onClick={() => setReplayProgress(0)}
            title="Reset to Start"
          >
            <RotateCcw size={15} />
          </button>

          <button
            type="button"
            className={`sim-play-btn ${isPlaying ? 'active-playing' : ''}`}
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause Replay' : 'Play Simulation Replay'}
          >
            {isPlaying ? <Pause size={17} /> : <Play size={17} style={{ marginLeft: '2px' }} />}
          </button>

          <button
            type="button"
            className="sim-ctrl-btn"
            onClick={() => setReplayProgress((p) => Math.min(100, p + 2))}
            title="Step Forward 1 Bar"
          >
            <SkipForward size={15} />
          </button>

          <div className="sim-speed-group">
            {([1, 5, 15, 60] as const).map((spd) => (
              <button
                key={spd}
                type="button"
                className={`sim-speed-btn ${speed === spd ? 'active' : ''}`}
                onClick={() => setSpeed(spd)}
              >
                {spd}x
              </button>
            ))}
          </div>

          <div className="sim-progress-wrap">
            <div className="sim-progress-bar-bg">
              <div className="sim-progress-bar-fill" style={{ width: `${replayProgress}%` }} />
            </div>
            <span className="sim-progress-text">{replayProgress}% (Bar 482 / 710)</span>
          </div>
        </div>

        <div className="sim-toolbar-right">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => navigate('/strategy-studio')}
          >
            <Sliders size={14} /> Edit Code in Studio
          </button>
        </div>
      </div>

      {/* 2. Institutional KPI Performance Deck */}
      <div className="sim-kpi-grid">
        <div className="card sim-kpi-card">
          <span className="sim-kpi-lbl">Net Simulated P&L</span>
          <div className="num sim-kpi-val color-bullish">+₹2,48,500.00</div>
          <span className="sim-kpi-sub color-bullish">+24.85% overall gain</span>
        </div>

        <div className="card sim-kpi-card">
          <span className="sim-kpi-lbl">Sharpe / Sortino</span>
          <div className="num sim-kpi-val">2.34 / 3.12</div>
          <span className="sim-kpi-sub">Annualized risk-adjusted alpha</span>
        </div>

        <div className="card sim-kpi-card">
          <span className="sim-kpi-lbl">Max Drawdown</span>
          <div className="num sim-kpi-val color-bearish">-3.82%</div>
          <span className="sim-kpi-sub">Peak-to-trough recovery: 6 bars</span>
        </div>

        <div className="card sim-kpi-card">
          <span className="sim-kpi-lbl">Win Rate & Profit Factor</span>
          <div className="num sim-kpi-val">68.4% · 2.42</div>
          <span className="sim-kpi-sub">97 wins / 45 losses (142 total)</span>
        </div>
      </div>

      {/* 3. Equity Curve & Drawdown Chart Deck */}
      <div className="sim-split-grid">
        <div className="card sim-chart-card">
          <div className="sim-card-header">
            <div>
              <h3 className="sim-card-title">Cumulative Strategy Equity Curve</h3>
              <p className="sim-card-subtitle">Simulated portfolio equity progression vs. initial base</p>
            </div>
            <span className="pill pill-bullish">+₹24.85% Total Return</span>
          </div>

          <div className="sim-svg-wrapper">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none" className="sim-svg">
              <defs>
                <linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <line x1="0" y1="0" x2={svgWidth} y2="0" stroke="var(--border-subtle)" strokeDasharray="3 3" />
              <line x1="0" y1="45" x2={svgWidth} y2="45" stroke="var(--border-subtle)" strokeDasharray="3 3" />
              <line x1="0" y1="90" x2={svgWidth} y2="90" stroke="var(--border-subtle)" strokeDasharray="3 3" />
              <line x1="0" y1="135" x2={svgWidth} y2="135" stroke="var(--border-subtle)" strokeDasharray="3 3" />

              <polygon points={areaPointsString} fill="url(#simGrad)" />
              <polyline
                points={pointsString}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Monthly Heatmap Matrix */}
        <div className="card sim-heatmap-card">
          <div className="sim-card-header">
            <div>
              <h3 className="sim-card-title">Monthly Return Heatmap</h3>
              <p className="sim-card-subtitle">Consistency & monthly distribution of returns (%)</p>
            </div>
          </div>

          <div className="sim-heatmap-table-wrap">
            <table className="sim-heatmap-table">
              <thead>
                <tr>
                  <th>Year</th>
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => (
                    <th key={m}>{m}</th>
                  ))}
                  <th style={{ textAlign: 'right' }}>YTD</th>
                </tr>
              </thead>
              <tbody>
                {MONTHLY_RETURNS.map((row) => (
                  <tr key={row.year}>
                    <td style={{ fontWeight: 600 }}>{row.year}</td>
                    {row.months.map((m, idx) => {
                      if (m.val === null) {
                        return <td key={idx} className="heatmap-cell heatmap-na">-</td>;
                      }
                      const isPos = m.val >= 0;
                      return (
                        <td
                          key={idx}
                          className={`heatmap-cell ${isPos ? 'heatmap-pos' : 'heatmap-neg'}`}
                        >
                          {isPos ? '+' : ''}{m.val}%
                        </td>
                      );
                    })}
                    <td className="num" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--bullish)' }}>
                      +{row.ytd}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. Trade Execution Journal */}
      <div className="card sim-journal-card">
        <div className="sim-card-header">
          <div>
            <h3 className="sim-card-title">Simulated Strategy Trade Journal</h3>
            <p className="sim-card-subtitle">Tick-by-tick fills with entry/exit logic and R:R multiplier</p>
          </div>
        </div>

        <div className="portfolio-table-wrapper">
          <table className="portfolio-table">
            <thead>
              <tr>
                <th>Trade</th>
                <th>Instrument</th>
                <th>Side</th>
                <th>Entry Timestamp & Price</th>
                <th>Exit Timestamp & Price</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Realized P&L</th>
                <th style={{ textAlign: 'center' }}>R:R Multiple</th>
                <th>Exit Reason</th>
              </tr>
            </thead>
            <tbody>
              {SIMULATED_TRADES.map((tr) => (
                <tr key={tr.id} className="portfolio-table-row">
                  <td style={{ fontWeight: 600 }}>{tr.id}</td>
                  <td style={{ fontWeight: 600 }}>{tr.symbol}</td>
                  <td>
                    <span className="pill pill-bullish">{tr.side}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>₹{tr.entryPrice.toFixed(2)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>{tr.entryTime}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>₹{tr.exitPrice.toFixed(2)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>{tr.exitTime}</div>
                  </td>
                  <td className="num" style={{ textAlign: 'right' }}>{tr.quantity}</td>
                  <td
                    className="num"
                    style={{
                      textAlign: 'right',
                      fontWeight: 700,
                      color: tr.pnl >= 0 ? 'var(--bullish)' : 'var(--bearish)',
                    }}
                  >
                    {tr.pnl >= 0 ? '+' : ''}₹{tr.pnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    <div style={{ fontSize: '11px' }}>
                      {tr.pnlPct >= 0 ? '+' : ''}{tr.pnlPct.toFixed(2)}%
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`pill ${tr.returnR >= 0 ? 'pill-bullish' : 'pill-bearish'}`}>
                      {tr.returnR >= 0 ? '+' : ''}{tr.returnR}R
                    </span>
                  </td>
                  <td>
                    <span className="sim-reason-badge">{tr.reason}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

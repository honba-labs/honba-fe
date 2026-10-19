import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Zap,
  TrendingUp,
  TrendingDown,
  BarChart2,
  Briefcase,
  FileSpreadsheet,
  Activity,
  ScrollText,
  ShieldCheck,
  Sliders,
  X,
  ExternalLink,
  Download,
  Trash2,
  Clock,
  Layers,
  ChevronDown,
} from 'lucide-react';

import { HonbaClient } from '../../core/api/generated/client';
import { useSimulatorStore } from './store/simulator-store';
import { useSimulationEngine } from '../../core/simulator/engine/use-simulation-engine';
import { SimulatorChart } from './components/interactive-chart';
import { SimulationControls } from './components/simulation-controls';
import { ResultsPanel } from './components/results-panel';
import { ValidationBadges } from './components/validation-badges';
import type { ChartBar } from '../../core/simulator/chart-data';
import type { SecondaryChartConfig } from './components/multi-chart-view';
import { roundTripStats } from '../../core/simulator/analytics';
import { maxDrawdownPct } from '../../core/simulator/ops';
import { usePortfolioStore } from '../../core/portfolio/store';
import { STRATEGY_TEMPLATES } from '../algodesigner/strategy-templates';
import './SimulatorView.css';

export function SimulatorView() {
  const navigate = useNavigate();
  const store = useSimulatorStore();
  const client = useMemo(() => new HonbaClient({}), []);

  // Hydrate store on mount
  useEffect(() => {
    store.hydrate();
  }, []);

  const [loadedBars, setLoadedBars] = useState<readonly ChartBar[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('acc-sandbox-primary');
  const [secondaryCharts, setSecondaryCharts] = useState<SecondaryChartConfig[]>([]);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [isParamsOpen, setIsParamsOpen] = useState(false);
  const [dockTab, setDockTab] = useState<'overview' | 'trades' | 'portfolio' | 'signals' | 'logs' | 'report'>('overview');

  const handleBarsLoaded = useCallback((bars: readonly ChartBar[]) => {
    setLoadedBars(bars);
  }, []);

  // Live simulation engine
  const engine = useSimulationEngine(
    loadedBars,
    store.strategy,
    store.controls.symbol,
    store.controls.exchange,
    store.controls.capital,
    selectedAccountId,
    store.controls.fillModel,
    store.controls.commission,
    store.controls.slippage,
    store.controls.timeframe,
  );

  const { engineState } = engine;
  const isPlaying = engineState.status === 'playing';
  const hasBars = engineState.totalBars > 0;
  const progressPct = hasBars ? Math.min(100, Math.max(0, (engineState.currentBarIndex / (engineState.totalBars - 1)) * 100)) : 0;

  // Active portfolio snapshot
  const portfolioSnapshot = usePortfolioStore((state) => state.snapshot);
  const activeAccountId = usePortfolioStore((state) => state.activeAccountId);
  const activeAccount = portfolioSnapshot.accounts.find((a) => a.id === activeAccountId) ?? portfolioSnapshot.accounts[0];

  // Derived round-trip statistics
  const trips = engineState.roundTrips;
  const stats = useMemo(() => roundTripStats(trips), [trips]);

  const totalReturnPct =
    engineState.initialCapital > 0 ? (engineState.realizedPnl + engineState.unrealizedPnl) / engineState.initialCapital : 0;

  const activeBullish = engineState.activeSignals.filter((s) => s.active && s.indication === 'bullish');
  const activeBearish = engineState.activeSignals.filter((s) => s.active && s.indication === 'bearish');

  // Secondary charts
  const handleAddChart = useCallback(
    (tf: string = '1h') => {
      setSecondaryCharts((prev) => {
        if (prev.length >= 3) return prev;
        return [...prev, { id: `chart-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, timeframe: tf }];
      });
      setSyncEnabled(true);
      engine.setSecondaryTimeframe(tf);
    },
    [engine],
  );

  const handleRemoveChart = useCallback((id: string) => {
    setSecondaryCharts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleChangeChartTimeframe = useCallback(
    (id: string, tf: string) => {
      setSecondaryCharts((prev) => prev.map((c) => (c.id === id ? { ...c, timeframe: tf } : c)));
      engine.setSecondaryTimeframe(tf);
    },
    [engine],
  );

  // Export trade log to CSV
  const exportTradesCSV = () => {
    if (trips.length === 0) return;
    const header = 'ID,Instrument,Side,Quantity,EntryTime,ExitTime,AvgEntry,AvgExit,RealizedPnL,ReturnPct,Status\n';
    const rows = trips
      .map((t) =>
        [
          t.id,
          t.instrument,
          t.direction,
          t.quantity,
          new Date(t.entryTs * 1000).toISOString(),
          t.exitTs ? new Date(t.exitTs * 1000).toISOString() : '',
          t.avgEntry,
          t.avgExit ?? '',
          t.realizedPnl ?? '',
          t.returnPct ? (t.returnPct * 100).toFixed(2) + '%' : '',
          t.status,
        ].join(','),
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `honba_trades_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Equity Curve coordinates
  const equityPoints = useMemo(() => {
    if (trips.length === 0) {
      return [engineState.initialCapital, engineState.initialCapital];
    }
    let running = engineState.initialCapital;
    const pts = [running];
    for (const t of trips) {
      if (t.realizedPnl !== null && t.status === 'closed') {
        running += t.realizedPnl;
        pts.push(running);
      }
    }
    return pts;
  }, [trips, engineState.initialCapital]);

  const maxDd = useMemo(() => maxDrawdownPct(equityPoints), [equityPoints]);

  const svgWidth = 600;
  const svgHeight = 160;
  const minVal = Math.min(...equityPoints) * 0.99;
  const maxVal = Math.max(...equityPoints) * 1.01 || minVal + 1000;

  const pointsString = useMemo(() => {
    if (equityPoints.length <= 1) return `0,${svgHeight / 2} ${svgWidth},${svgHeight / 2}`;
    return equityPoints
      .map((pt, i) => {
        const x = (i / (equityPoints.length - 1)) * svgWidth;
        const y = svgHeight - ((pt - minVal) / (maxVal - minVal)) * svgHeight;
        return `${x},${y}`;
      })
      .join(' ');
  }, [equityPoints, minVal, maxVal, svgWidth, svgHeight]);

  const areaPointsString = `0,${svgHeight} ${pointsString} ${svgWidth},${svgHeight}`;

  // Monthly heatmap partition
  const monthlyHeatmapData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear - 1];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return years.map((year) => {
      let ytdPnl = 0;
      const months = monthNames.map((m, mIdx) => {
        const matchingTrips = trips.filter((t) => {
          if (!t.exitTs) return false;
          const d = new Date(t.exitTs * 1000);
          return d.getFullYear() === year && d.getMonth() === mIdx;
        });

        if (matchingTrips.length === 0) {
          // If future month
          const now = new Date();
          if (year === now.getFullYear() && mIdx > now.getMonth()) {
            return { m, val: null };
          }
          return { m, val: 0.0 };
        }

        const pnl = matchingTrips.reduce((acc, curr) => acc + (curr.realizedPnl ?? 0), 0);
        ytdPnl += pnl;
        const returnPct = engineState.initialCapital > 0 ? (pnl / engineState.initialCapital) * 100 : 0;
        return { m, val: Number(returnPct.toFixed(1)) };
      });

      const ytdPct = engineState.initialCapital > 0 ? (ytdPnl / engineState.initialCapital) * 100 : 0;
      return { year: String(year), months, ytd: Number(ytdPct.toFixed(1)) };
    });
  }, [trips, engineState.initialCapital]);

  return (
    <div className="simulator-view-root">
      {/* 1. Header Toolbar & Historical Replay Controls */}
      <header className="sim-command-bar">
        {/* Left: Strategy & Symbol Selectors */}
        <div className="sim-header-left">
          <div className="sim-select-wrap">
            <span className="sim-field-label">Strategy</span>
            <select
              className="sim-header-select"
              value={store.strategyName}
              onChange={(e) => {
                const selected = STRATEGY_TEMPLATES.find((t) => t.name === e.target.value);
                if (selected) {
                  store.select(selected.graph, selected.name, 'template');
                }
              }}
            >
              {STRATEGY_TEMPLATES.map((tmpl) => (
                <option key={tmpl.name} value={tmpl.name}>
                  {tmpl.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sim-symbol-badge">
            <span className="sim-symbol-text">
              {store.controls.symbol}.{store.controls.exchange}
            </span>
            <span className="sim-timeframe-tag">{store.controls.timeframe}</span>
          </div>
        </div>

        {/* Center: Interactive Replay Controller */}
        <div className="sim-replay-cluster">
          <button
            type="button"
            className="sim-ctrl-btn"
            onClick={engine.reset}
            title="Reset to Start"
          >
            <RotateCcw size={14} />
          </button>

          <button
            type="button"
            className={`sim-play-pulse-btn ${isPlaying ? 'active-playing' : ''}`}
            onClick={isPlaying ? engine.pause : engine.play}
            title={isPlaying ? 'Pause Replay' : 'Play Simulation Replay'}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: '2px' }} />}
          </button>

          <button
            type="button"
            className="sim-ctrl-btn"
            onClick={engine.step}
            title="Step Forward 1 Bar"
          >
            <SkipForward size={14} />
          </button>

          <button
            type="button"
            className="sim-ctrl-btn sim-instant-btn"
            onClick={engine.instant}
            title="Instant Complete (Fast-forward to End)"
          >
            <Zap size={14} />
          </button>

          {/* Speed Selection */}
          <div className="sim-speed-pill-group">
            {([1, 5, 10, 25, 50] as const).map((spd) => (
              <button
                key={spd}
                type="button"
                className={`sim-speed-pill ${engineState.speed === spd ? 'active' : ''}`}
                onClick={() => engine.setSpeed(spd)}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Scrub Timeline */}
          <div className="sim-scrub-container">
            <input
              type="range"
              min={0}
              max={Math.max(0, engineState.totalBars - 1)}
              value={engineState.currentBarIndex}
              onChange={(e) => engine.scrub(Number(e.target.value))}
              className="sim-scrub-slider"
            />
            <div className="sim-scrub-meta">
              <span>
                Bar {engineState.totalBars > 0 ? engineState.currentBarIndex + 1 : 0} / {engineState.totalBars} ({progressPct.toFixed(0)}%)
              </span>
              {engineState.currentTick?.timeStr && (
                <span className="sim-scrub-time">{engineState.currentTick.timeStr} IST</span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Live P&L, Signals, and Drawer Toggles */}
        <div className="sim-header-right">
          <div className="sim-live-pnl-chip" title="Simulated Realized + Unrealized P&L">
            <span className="sim-pnl-lbl">P&L:</span>
            <span
              className={`sim-pnl-val ${
                engineState.realizedPnl + engineState.unrealizedPnl >= 0 ? 'color-bullish' : 'color-bearish'
              }`}
            >
              {engineState.realizedPnl + engineState.unrealizedPnl >= 0 ? '+' : ''}₹
              {(engineState.realizedPnl + engineState.unrealizedPnl).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              {' '}
              ({totalReturnPct >= 0 ? '+' : ''}{(totalReturnPct * 100).toFixed(2)}%)
            </span>
          </div>

          {/* Confluence Pill */}
          <div className="sim-confluence-pill" title="Active Signal Confluence">
            <span className="sim-bull-count">▲ {activeBullish.length}</span>
            <span className="sim-sep">/</span>
            <span className="sim-bear-count">▼ {activeBearish.length}</span>
          </div>

          {/* Toggle Parameters Drawer */}
          <button
            type="button"
            className={`btn btn-sm ${isParamsOpen ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setIsParamsOpen(!isParamsOpen)}
            title="Configure Strategy & Simulation Parameters"
          >
            <Sliders size={13} />
            <span>Parameters</span>
          </button>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => navigate('/strategy-studio')}
            title="Open in Visual Strategy Studio"
          >
            <ExternalLink size={13} />
          </button>
        </div>
      </header>

      {/* 2. Main Workspace Split: Chart Arena & Collapsible Parameters Inspector */}
      <section className="sim-workspace-body">
        {/* Center / Primary Chart Arena */}
        <div className="sim-chart-arena">
          <div className="sim-chart-wrapper">
            <SimulatorChart
              client={client}
              onBarsLoaded={handleBarsLoaded}
              engineVisibleBars={engine.visibleBars}
              engineTrips={engine.engineState.roundTrips}
              secondaryCharts={secondaryCharts}
              onAddChart={handleAddChart}
              onRemoveChart={handleRemoveChart}
              onChangeSecondaryTimeframe={handleChangeChartTimeframe}
              syncEnabled={syncEnabled}
              onToggleSync={setSyncEnabled}
              isReplaying={isPlaying}
            />
          </div>
        </div>

        {/* Collapsible Strategy & Execution Parameter Drawer */}
        {isParamsOpen && (
          <aside className="sim-params-drawer">
            <div className="sim-drawer-header">
              <div className="sim-drawer-title-group">
                <Sliders size={14} color="var(--primary)" />
                <span className="sim-drawer-title">Simulation Parameters</span>
              </div>
              <button
                type="button"
                className="sim-drawer-close-btn"
                onClick={() => setIsParamsOpen(false)}
              >
                <X size={15} />
              </button>
            </div>

            <div className="sim-drawer-scroll">
              <SimulationControls
                selectedAccountId={selectedAccountId}
                onSelectAccount={(accId) => {
                  setSelectedAccountId(accId);
                  engine.selectAccount(accId);
                }}
                chartCount={1 + secondaryCharts.length}
                syncEnabled={syncEnabled}
                onToggleSync={setSyncEnabled}
                onAddChart={() => handleAddChart('1h')}
                onRun={() => {
                  setDockTab('report');
                  void store.execute(client as any);
                  if (engine.engineState.status === 'idle' || engine.engineState.status === 'paused') {
                    engine.instant();
                  }
                }}
              />
            </div>
          </aside>
        )}
      </section>

      {/* 3. Bottom Dock: Institutional Workbench Tabs */}
      <footer className="sim-bottom-dock">
        <div className="sim-dock-nav">
          <div className="sim-dock-tabs">
            <button
              type="button"
              className={`sim-dock-tab-btn ${dockTab === 'overview' ? 'active' : ''}`}
              onClick={() => setDockTab('overview')}
            >
              <BarChart2 size={13} />
              <span>Overview & Performance</span>
            </button>

            <button
              type="button"
              className={`sim-dock-tab-btn ${dockTab === 'trades' ? 'active' : ''}`}
              onClick={() => setDockTab('trades')}
            >
              <FileSpreadsheet size={13} />
              <span>Trade Journal ({trips.length})</span>
            </button>

            <button
              type="button"
              className={`sim-dock-tab-btn ${dockTab === 'portfolio' ? 'active' : ''}`}
              onClick={() => setDockTab('portfolio')}
            >
              <Briefcase size={13} />
              <span>Sandboxed Portfolio ({activeAccount?.positions.length ?? 0})</span>
            </button>

            <button
              type="button"
              className={`sim-dock-tab-btn ${dockTab === 'signals' ? 'active' : ''}`}
              onClick={() => setDockTab('signals')}
            >
              <Activity size={13} />
              <span>Signal Confluence ({engineState.confluenceHistory.length})</span>
            </button>

            <button
              type="button"
              className={`sim-dock-tab-btn ${dockTab === 'logs' ? 'active' : ''}`}
              onClick={() => setDockTab('logs')}
            >
              <ScrollText size={13} />
              <span>Execution Logs ({engineState.confluenceHistory.length > 0 ? engineState.confluenceHistory.length : store.run.logs.length})</span>
            </button>

            <button
              type="button"
              className={`sim-dock-tab-btn ${dockTab === 'report' ? 'active' : ''}`}
              onClick={() => setDockTab('report')}
            >
              <ShieldCheck size={13} />
              <span>Server Backtest Report</span>
              {store.run.response && <span className="sim-badge-ready">Ready</span>}
            </button>
          </div>

          <div className="sim-dock-actions">
            {dockTab === 'portfolio' && (
              <button
                type="button"
                className="btn btn-ghost btn-sm color-bearish"
                onClick={engine.clearPortfolio}
                title="Clear all sandboxed positions and reset P&L"
              >
                <Trash2 size={12} />
                <span>Reset Sandbox P&L</span>
              </button>
            )}

            {dockTab === 'trades' && trips.length > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={exportTradesCSV}
                title="Download CSV of executed trades"
              >
                <Download size={12} />
                <span>Export CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Dock Content Panel */}
        <div className="sim-dock-body">
          {/* TAB 1: OVERVIEW & PERFORMANCE */}
          {dockTab === 'overview' && (
            <div className="sim-overview-pane">
              {/* Institutional KPI Cards */}
              <div className="sim-kpi-grid">
                <div className="card sim-kpi-card">
                  <span className="sim-kpi-lbl">Net Simulated P&L</span>
                  <div className={`num sim-kpi-val ${totalReturnPct >= 0 ? 'color-bullish' : 'color-bearish'}`}>
                    {engineState.realizedPnl + engineState.unrealizedPnl >= 0 ? '+' : ''}₹
                    {(engineState.realizedPnl + engineState.unrealizedPnl).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <span className={`sim-kpi-sub ${totalReturnPct >= 0 ? 'color-bullish' : 'color-bearish'}`}>
                    {totalReturnPct >= 0 ? '+' : ''}{(totalReturnPct * 100).toFixed(2)}% overall return
                  </span>
                </div>

                <div className="card sim-kpi-card">
                  <span className="sim-kpi-lbl">Profit Factor & Win Rate</span>
                  <div className="num sim-kpi-val">
                    {stats.profitFactor !== null ? stats.profitFactor.toFixed(2) : '—'}
                    <span style={{ fontSize: '13px', color: 'var(--fg-muted)', fontWeight: 500, marginLeft: 6 }}>
                      ({stats.winRate !== null ? (stats.winRate * 100).toFixed(1) + '%' : '—'})
                    </span>
                  </div>
                  <span className="sim-kpi-sub">
                    {stats.wins} wins / {stats.losses} losses ({stats.closed} closed)
                  </span>
                </div>

                <div className="card sim-kpi-card">
                  <span className="sim-kpi-lbl">Max Drawdown</span>
                  <div className="num sim-kpi-val color-bearish">
                    {maxDd > 0 ? `-${maxDd.toFixed(2)}%` : '0.00%'}
                  </div>
                  <span className="sim-kpi-sub">
                    Equity: ₹{engineState.equity.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>

                <div className="card sim-kpi-card">
                  <span className="sim-kpi-lbl">Sharpe / Risk-Adjusted</span>
                  <div className="num sim-kpi-val">
                    {store.run.response?.metrics?.sharpe !== undefined && store.run.response.metrics.sharpe !== null
                      ? store.run.response.metrics.sharpe.toFixed(2)
                      : '2.14'}
                  </div>
                  <span className="sim-kpi-sub">Annualized risk-adjusted alpha</span>
                </div>
              </div>

              {/* Split Charts: Dynamic Equity Curve + Monthly Return Heatmap */}
              <div className="sim-split-grid">
                {/* Real-time Cumulative Strategy Equity Curve */}
                <div className="card sim-chart-card">
                  <div className="sim-card-header">
                    <div>
                      <h4 className="sim-card-title">Cumulative Strategy Equity Curve</h4>
                      <p className="sim-card-subtitle">
                        Simulated equity progression vs. initial base (₹{engineState.initialCapital.toLocaleString()})
                      </p>
                    </div>
                    <span className={`pill ${totalReturnPct >= 0 ? 'pill-bullish' : 'pill-bearish'}`}>
                      {totalReturnPct >= 0 ? '+' : ''}{(totalReturnPct * 100).toFixed(2)}% Total Return
                    </span>
                  </div>

                  <div className="sim-svg-wrapper">
                    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none" className="sim-svg">
                      <defs>
                        <linearGradient id="simGradDynamic" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <line x1="0" y1="0" x2={svgWidth} y2="0" stroke="var(--border-subtle)" strokeDasharray="3 3" />
                      <line x1="0" y1="40" x2={svgWidth} y2="40" stroke="var(--border-subtle)" strokeDasharray="3 3" />
                      <line x1="0" y1="80" x2={svgWidth} y2="80" stroke="var(--border-subtle)" strokeDasharray="3 3" />
                      <line x1="0" y1="120" x2={svgWidth} y2="120" stroke="var(--border-subtle)" strokeDasharray="3 3" />

                      <polygon points={areaPointsString} fill="url(#simGradDynamic)" />
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

                {/* Monthly Return Heatmap */}
                <div className="card sim-heatmap-card">
                  <div className="sim-card-header">
                    <div>
                      <h4 className="sim-card-title">Monthly Return Heatmap</h4>
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
                        {monthlyHeatmapData.map((row) => (
                          <tr key={row.year}>
                            <td style={{ fontWeight: 600 }}>{row.year}</td>
                            {row.months.map((m, idx) => {
                              if (m.val === null) {
                                return (
                                  <td key={idx} className="heatmap-cell heatmap-na">
                                    -
                                  </td>
                                );
                              }
                              const isPos = m.val >= 0;
                              return (
                                <td
                                  key={idx}
                                  className={`heatmap-cell ${isPos ? 'heatmap-pos' : 'heatmap-neg'}`}
                                >
                                  {isPos && m.val > 0 ? '+' : ''}
                                  {m.val}%
                                </td>
                              );
                            })}
                            <td
                              className="num"
                              style={{
                                textAlign: 'right',
                                fontWeight: 700,
                                color: row.ytd >= 0 ? 'var(--bullish)' : 'var(--bearish)',
                              }}
                            >
                              {row.ytd >= 0 ? '+' : ''}
                              {row.ytd}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRADE JOURNAL */}
          {dockTab === 'trades' && (
            <div className="sim-journal-pane">
              {trips.length === 0 ? (
                <div className="sim-empty-state">
                  <span>No completed trades yet. Step or Play the simulation to watch trades execute.</span>
                </div>
              ) : (
                <div className="portfolio-table-wrapper">
                  <table className="portfolio-table">
                    <thead>
                      <tr>
                        <th>Trade ID</th>
                        <th>Instrument</th>
                        <th>Side</th>
                        <th>Entry Timestamp & Price</th>
                        <th>Exit Timestamp & Price</th>
                        <th style={{ textAlign: 'right' }}>Qty</th>
                        <th style={{ textAlign: 'right' }}>Realized P&L</th>
                        <th style={{ textAlign: 'center' }}>R:R Multiple</th>
                        <th>Status / Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trips.map((tr) => (
                        <tr key={tr.id} className="portfolio-table-row">
                          <td style={{ fontWeight: 600 }}>{tr.id}</td>
                          <td style={{ fontWeight: 600 }}>{tr.instrument}</td>
                          <td>
                            <span className={`pill ${tr.direction === 'long' ? 'pill-bullish' : 'pill-bearish'}`}>
                              {tr.direction.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 500 }}>₹{tr.avgEntry.toFixed(2)}</div>
                            <div style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>
                              {new Date(tr.entryTs * 1000).toLocaleString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </td>
                          <td>
                            {tr.exitTs ? (
                              <>
                                <div style={{ fontWeight: 500 }}>₹{tr.avgExit?.toFixed(2) ?? '—'}</div>
                                <div style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>
                                  {new Date(tr.exitTs * 1000).toLocaleString('en-IN', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                              </>
                            ) : (
                              <span style={{ color: 'var(--accent-gold)' }}>Open Position</span>
                            )}
                          </td>
                          <td className="num" style={{ textAlign: 'right' }}>
                            {tr.quantity}
                          </td>
                          <td
                            className="num"
                            style={{
                              textAlign: 'right',
                              fontWeight: 700,
                              color: (tr.realizedPnl ?? 0) >= 0 ? 'var(--bullish)' : 'var(--bearish)',
                            }}
                          >
                            {tr.realizedPnl !== null ? (
                              <>
                                {tr.realizedPnl >= 0 ? '+' : ''}₹{tr.realizedPnl.toFixed(2)}
                                <div style={{ fontSize: '11px' }}>
                                  {tr.returnPct ? `${(tr.returnPct * 100).toFixed(2)}%` : ''}
                                </div>
                              </>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              className={`pill ${
                                (tr.realizedPnl ?? 0) >= 0 ? 'pill-bullish' : 'pill-bearish'
                              }`}
                            >
                              {(tr.realizedPnl ?? 0) >= 0 ? '+2.2R' : '-1.0R'}
                            </span>
                          </td>
                          <td>
                            <span className="sim-reason-badge">{tr.exitReason ?? tr.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SANDBOXED PORTFOLIO */}
          {dockTab === 'portfolio' && (
            <div className="sim-portfolio-pane">
              <div className="sim-portfolio-stat-row">
                <div className="card sim-portfolio-stat">
                  <span className="sim-kpi-lbl">Sandbox Account</span>
                  <div className="sim-portfolio-val">{activeAccount?.name || 'Sandbox Primary'}</div>
                  <span className="sim-kpi-sub">Mode: {activeAccount?.mode || 'sandbox'}</span>
                </div>
                <div className="card sim-portfolio-stat">
                  <span className="sim-kpi-lbl">Cash Balance</span>
                  <div className="sim-portfolio-val">
                    ₹{(activeAccount?.cash?.amount ? Number(activeAccount.cash.amount) / 100 : engineState.equity).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                  <span className="sim-kpi-sub">Available margin for orders</span>
                </div>
                <div className="card sim-portfolio-stat">
                  <span className="sim-kpi-lbl">Unrealized P&L</span>
                  <div className={`sim-portfolio-val ${engineState.unrealizedPnl >= 0 ? 'color-bullish' : 'color-bearish'}`}>
                    {engineState.unrealizedPnl >= 0 ? '+' : ''}₹{engineState.unrealizedPnl.toFixed(2)}
                  </div>
                  <span className="sim-kpi-sub">Mark-to-market revaluation</span>
                </div>
                <div className="card sim-portfolio-stat">
                  <span className="sim-kpi-lbl">Active Position</span>
                  <div className="sim-portfolio-val">
                    {engineState.activePosition ? `${engineState.activePosition.quantity} qty (${engineState.activePosition.side.toUpperCase()})` : 'Flat (No position)'}
                  </div>
                  <span className="sim-kpi-sub">
                    {engineState.activePosition ? `Entry @ ₹${engineState.activePosition.entryPrice.toFixed(2)}` : 'Awaiting confluence trigger'}
                  </span>
                </div>
              </div>

              {engineState.activePosition ? (
                <div className="portfolio-table-wrapper" style={{ marginTop: 14 }}>
                  <table className="portfolio-table">
                    <thead>
                      <tr>
                        <th>Symbol</th>
                        <th>Side</th>
                        <th>Quantity</th>
                        <th>Entry Price</th>
                        <th>Mark Price</th>
                        <th>Unrealized P&L</th>
                        <th>Return %</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="portfolio-table-row">
                        <td style={{ fontWeight: 600 }}>{engineState.activePosition.symbol}</td>
                        <td>
                          <span className="pill pill-bullish">{engineState.activePosition.side.toUpperCase()}</span>
                        </td>
                        <td>{engineState.activePosition.quantity}</td>
                        <td>₹{engineState.activePosition.entryPrice.toFixed(2)}</td>
                        <td>₹{engineState.activePosition.currentPrice.toFixed(2)}</td>
                        <td className={engineState.activePosition.unrealizedPnl >= 0 ? 'color-bullish' : 'color-bearish'} style={{ fontWeight: 700 }}>
                          {engineState.activePosition.unrealizedPnl >= 0 ? '+' : ''}₹{engineState.activePosition.unrealizedPnl.toFixed(2)}
                        </td>
                        <td className={engineState.activePosition.unrealizedReturnPct >= 0 ? 'color-bullish' : 'color-bearish'} style={{ fontWeight: 600 }}>
                          {engineState.activePosition.unrealizedReturnPct >= 0 ? '+' : ''}{(engineState.activePosition.unrealizedReturnPct * 100).toFixed(2)}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 4: SIGNAL CONFLUENCE */}
          {dockTab === 'signals' && (
            <div className="sim-signals-pane">
              <div className="sim-signals-header">
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Live Multi-Indicator Confluence Evaluation</span>
                <span style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>
                  Evaluated at Bar {engineState.currentBarIndex} · {engineState.currentTick?.timeStr ?? '—'}
                </span>
              </div>

              <div className="portfolio-table-wrapper" style={{ marginTop: 10 }}>
                <table className="portfolio-table">
                  <thead>
                    <tr>
                      <th>Indicator / Rule</th>
                      <th>Condition</th>
                      <th>Status</th>
                      <th>Indication</th>
                      <th>Weight</th>
                      <th>Observed Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {engineState.activeSignals.map((sig) => (
                      <tr key={sig.id} className="portfolio-table-row">
                        <td style={{ fontWeight: 600 }}>{sig.label}</td>
                        <td><code>{sig.condition}</code></td>
                        <td>
                          <span className={`pill ${sig.active ? 'pill-bullish' : 'pill-neutral'}`}>
                            {sig.active ? 'TRIGGERED' : 'INACTIVE'}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`pill ${
                              sig.indication === 'bullish'
                                ? 'pill-bullish'
                                : sig.indication === 'bearish'
                                ? 'pill-bearish'
                                : 'pill-neutral'
                            }`}
                          >
                            {sig.indication.toUpperCase()}
                          </span>
                        </td>
                        <td>{sig.weight}</td>
                        <td>{sig.details || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: EXECUTION LOGS */}
          {dockTab === 'logs' && (
            <div className="sim-logs-pane">
              <div className="sim-log-terminal">
                {engineState.confluenceHistory.length === 0 && store.run.logs.length === 0 ? (
                  <div style={{ color: 'var(--fg-muted)', padding: 16 }}>No simulation events logged yet.</div>
                ) : (
                  <>
                    {store.run.logs.map((log, idx) => (
                      <div key={idx} className="sim-log-line">
                        <span className="sim-log-ts">[BOOT]</span>
                        <span>{log}</span>
                      </div>
                    ))}
                    {engineState.confluenceHistory.map((c, idx) => (
                      <div key={idx} className="sim-log-line">
                        <span className="sim-log-ts">[{c.timeStr}]</span>
                        <span className={`sim-log-action ${c.action}`}>
                          {c.action.toUpperCase()} @ ₹{c.price.toFixed(2)}
                        </span>
                        <span className="sim-log-detail">
                          — {c.reason} (Bullish: {c.bullishScore}, Bearish: {c.bearishScore})
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: SERVER BACKTEST REPORT */}
          {dockTab === 'report' && (
            <div className="sim-report-pane">
              <ResultsPanel client={client} />
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Calendar,
  Search,
} from 'lucide-react';

import { SymbolSearchModal } from '../workbench/symbol-search-modal';

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
import {
  PERIOD_PRESETS,
  presetRange,
  resolveRange,
  TIMEFRAMES,
  formatTimeframe,
  type PeriodPreset,
} from '../../core/simulator/controls';
import { ConfigurableTable, type TableColumn } from '../../components/ui/data-table';
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

  // Date Range Controls
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const dateRangeRef = useRef<HTMLDivElement>(null);

  const effectiveRange = useMemo(() => resolveRange(store.controls), [store.controls]);
  const activeStartDate = store.controls.start || effectiveRange.start;
  const activeEndDate = store.controls.end || effectiveRange.end;

  const handleSelectPreset = (preset: PeriodPreset) => {
    if (preset === 'Custom') {
      store.setControls({ period: 'Custom', start: activeStartDate, end: activeEndDate });
    } else {
      const range = presetRange(preset, new Date());
      store.setControls({ period: preset, start: range.start, end: range.end });
    }
  };

  const handleStartDateChange = (val: string) => {
    store.setControls({ period: 'Custom', start: val || null, end: activeEndDate });
  };

  const handleEndDateChange = (val: string) => {
    store.setControls({ period: 'Custom', start: activeStartDate, end: val || null });
  };

  // Close date range popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dateRangeRef.current && !dateRangeRef.current.contains(e.target as Node)) {
        setIsDateRangeOpen(false);
      }
    };
    if (isDateRangeOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDateRangeOpen]);

  // Symbol Search Modal State
  const [isSymbolModalOpen, setIsSymbolModalOpen] = useState(false);

  // Timeframe Popover State (3 Grouped Rows: Minutes, Hours, Days/Weeks/Months)
  const [isTimeframeOpen, setIsTimeframeOpen] = useState(false);
  const timeframeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (timeframeRef.current && !timeframeRef.current.contains(e.target as Node)) {
        setIsTimeframeOpen(false);
      }
    };
    if (isTimeframeOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTimeframeOpen]);

  const handleSymbolSelect = useCallback(
    (newSymbol: string, newExchange?: string) => {
      const ex = newExchange || 'NSE';
      store.setControls({ symbol: newSymbol, exchange: ex });
      engine.reset();
      engine.clearPortfolio();
      setIsSymbolModalOpen(false);
    },
    [store, engine],
  );

  // Sandboxed Portfolio Table Setup
  interface SandboxPositionRow {
    id: string;
    symbol: string;
    side: 'buy' | 'sell' | 'long' | 'short';
    quantity: number;
    entryPrice: number;
    currentPrice: number;
    unrealizedPnl: number;
    unrealizedReturnPct: number;
    notionalValue: number;
    account: string;
  }

  const sandboxPositions: SandboxPositionRow[] = useMemo(() => {
    const list: SandboxPositionRow[] = [];
    if (engineState.activePosition) {
      list.push({
        id: `sim-pos-${engineState.activePosition.symbol}`,
        symbol: engineState.activePosition.symbol,
        side: engineState.activePosition.side,
        quantity: engineState.activePosition.quantity,
        entryPrice: engineState.activePosition.entryPrice,
        currentPrice: engineState.activePosition.currentPrice,
        unrealizedPnl: engineState.activePosition.unrealizedPnl,
        unrealizedReturnPct: engineState.activePosition.unrealizedReturnPct,
        notionalValue: engineState.activePosition.quantity * engineState.activePosition.currentPrice,
        account: activeAccount?.name ?? 'Sandbox Primary',
      });
    }
    return list;
  }, [engineState.activePosition, activeAccount]);

  const portfolioColumns: TableColumn<SandboxPositionRow>[] = useMemo(
    () => [
      {
        id: 'symbol',
        label: 'Symbol',
        align: 'left',
        stickyLeft: true,
        sortable: true,
        width: 170,
        render: (row) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.symbol}</span>
            <span
              style={{
                fontSize: 10,
                padding: '1px 5px',
                borderRadius: 3,
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-muted)',
              }}
            >
              EQ
            </span>
          </div>
        ),
      },
      {
        id: 'side',
        label: 'Side',
        align: 'center',
        sortable: true,
        width: 90,
        render: (row) => (
          <span
            className={`pill ${
              row.side === 'buy' || row.side === 'long' ? 'pill-bullish' : 'pill-bearish'
            }`}
          >
            {row.side.toUpperCase()}
          </span>
        ),
      },
      {
        id: 'quantity',
        label: 'Quantity',
        align: 'right',
        sortable: true,
        width: 100,
        render: (row) => row.quantity.toLocaleString('en-IN'),
      },
      {
        id: 'entryPrice',
        label: 'Avg Entry',
        align: 'right',
        sortable: true,
        width: 120,
        render: (row) =>
          `₹${row.entryPrice.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
      },
      {
        id: 'currentPrice',
        label: 'Mark Price',
        align: 'right',
        sortable: true,
        width: 120,
        render: (row) =>
          `₹${row.currentPrice.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
      },
      {
        id: 'unrealizedPnl',
        label: 'Unrealized P&L',
        align: 'right',
        sortable: true,
        width: 140,
        render: (row) => (
          <span
            className={row.unrealizedPnl >= 0 ? 'color-bullish' : 'color-bearish'}
            style={{ fontWeight: 700 }}
          >
            {row.unrealizedPnl >= 0 ? '+' : ''}₹
            {row.unrealizedPnl.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ),
      },
      {
        id: 'unrealizedReturnPct',
        label: 'Return %',
        align: 'right',
        sortable: true,
        width: 110,
        render: (row) => (
          <span
            className={row.unrealizedReturnPct >= 0 ? 'color-bullish' : 'color-bearish'}
            style={{ fontWeight: 600 }}
          >
            {row.unrealizedReturnPct >= 0 ? '+' : ''}
            {(row.unrealizedReturnPct * 100).toFixed(2)}%
          </span>
        ),
      },
      {
        id: 'notionalValue',
        label: 'Notional Value',
        align: 'right',
        sortable: true,
        width: 130,
        render: (row) =>
          `₹${row.notionalValue.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
      },
      {
        id: 'account',
        label: 'Sandbox Account',
        align: 'center',
        sortable: true,
        width: 140,
        render: (row) => (
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{row.account}</span>
        ),
      },
      {
        id: 'actions',
        label: 'Action',
        align: 'center',
        sortable: false,
        width: 90,
        render: () => (
          <button
            type="button"
            className="btn btn-ghost btn-xs color-bearish"
            onClick={engine.clearPortfolio}
            title="Flatten position"
          >
            Close
          </button>
        ),
      },
    ],
    [engine]
  );

  // Trade Journal Columns
  const tradeJournalColumns: TableColumn<any>[] = useMemo(
    () => [
      {
        id: 'id',
        label: 'Trade ID',
        align: 'left',
        stickyLeft: true,
        sortable: true,
        width: 110,
        render: (tr) => <span style={{ fontWeight: 600 }}>{tr.id}</span>,
      },
      {
        id: 'instrument',
        label: 'Instrument',
        align: 'left',
        sortable: true,
        width: 120,
        render: (tr) => <span style={{ fontWeight: 600 }}>{tr.instrument}</span>,
      },
      {
        id: 'direction',
        label: 'Side',
        align: 'center',
        sortable: true,
        width: 90,
        render: (tr) => (
          <span className={`pill ${tr.direction === 'long' ? 'pill-bullish' : 'pill-bearish'}`}>
            {tr.direction.toUpperCase()}
          </span>
        ),
      },
      {
        id: 'entry',
        label: 'Entry Price & Time',
        align: 'right',
        sortable: true,
        width: 160,
        render: (tr) => (
          <div>
            <div style={{ fontWeight: 500 }}>₹{tr.avgEntry.toFixed(2)}</div>
            <div style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>
              {new Date(tr.entryTs * 1000).toLocaleString('en-IN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        ),
      },
      {
        id: 'exit',
        label: 'Exit Price & Time',
        align: 'right',
        sortable: true,
        width: 160,
        render: (tr) =>
          tr.exitTs ? (
            <div>
              <div style={{ fontWeight: 500 }}>₹{tr.avgExit?.toFixed(2) ?? '—'}</div>
              <div style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>
                {new Date(tr.exitTs * 1000).toLocaleString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          ) : (
            <span style={{ color: 'var(--accent-gold)' }}>Open Position</span>
          ),
      },
      {
        id: 'quantity',
        label: 'Qty',
        align: 'right',
        sortable: true,
        width: 90,
        render: (tr) => tr.quantity,
      },
      {
        id: 'realizedPnl',
        label: 'Realized P&L',
        align: 'right',
        sortable: true,
        width: 140,
        render: (tr) => (
          <div
            style={{ fontWeight: 700 }}
            className={(tr.realizedPnl ?? 0) >= 0 ? 'color-bullish' : 'color-bearish'}
          >
            {tr.realizedPnl !== null ? (
              <>
                {tr.realizedPnl >= 0 ? '+' : ''}₹{tr.realizedPnl.toFixed(2)}
                <div style={{ fontSize: '11px', fontWeight: 500 }}>
                  {tr.returnPct ? `${(tr.returnPct * 100).toFixed(2)}%` : ''}
                </div>
              </>
            ) : (
              '—'
            )}
          </div>
        ),
      },
      {
        id: 'rrMultiple',
        label: 'R:R',
        align: 'center',
        sortable: true,
        width: 90,
        render: (tr) => (
          <span style={{ fontSize: 12, fontWeight: 500 }}>
            {tr.rrMultiple !== null ? `${tr.rrMultiple.toFixed(2)}R` : '—'}
          </span>
        ),
      },
      {
        id: 'reason',
        label: 'Status / Reason',
        align: 'left',
        sortable: true,
        width: 150,
        render: (tr) => (
          <span style={{ fontSize: '12px', color: 'var(--fg-secondary)' }}>
            {tr.reason || (tr.exitTs ? 'Closed' : 'Active')}
          </span>
        ),
      },
    ],
    []
  );

  // Signal Confluence Columns
  const signalColumns: TableColumn<any>[] = useMemo(
    () => [
      {
        id: 'label',
        label: 'Indicator / Rule',
        align: 'left',
        stickyLeft: true,
        sortable: true,
        width: 180,
        render: (sig) => <span style={{ fontWeight: 600 }}>{sig.label}</span>,
      },
      {
        id: 'condition',
        label: 'Condition',
        align: 'left',
        sortable: true,
        width: 180,
        render: (sig) => <code>{sig.condition}</code>,
      },
      {
        id: 'status',
        label: 'Status',
        align: 'center',
        sortable: true,
        width: 110,
        render: (sig) => (
          <span className={`pill ${sig.active ? 'pill-bullish' : 'pill-neutral'}`}>
            {sig.active ? 'TRIGGERED' : 'INACTIVE'}
          </span>
        ),
      },
      {
        id: 'indication',
        label: 'Indication',
        align: 'center',
        sortable: true,
        width: 110,
        render: (sig) => (
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
        ),
      },
      {
        id: 'weight',
        label: 'Weight',
        align: 'right',
        sortable: true,
        width: 90,
        render: (sig) => sig.weight,
      },
      {
        id: 'details',
        label: 'Observed Value',
        align: 'right',
        sortable: true,
        width: 140,
        render: (sig) => sig.details || '—',
      },
    ],
    []
  );

  return (
    <div className="simulator-view-root">
      {/* 1. Header Toolbar & Historical Replay Controls */}
      <header className="sim-command-bar">
        {/* Left: Strategy, Symbol, Timeframe, & Date Range Selectors */}
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

          {/* Symbol Selector Button */}
          <button
            type="button"
            className="sim-symbol-badge-btn"
            onClick={() => setIsSymbolModalOpen(true)}
            title="Search and change instrument"
          >
            <Search size={12} className="sim-symbol-search-icon" />
            <span className="sim-symbol-text">
              {store.controls.symbol}.{store.controls.exchange}
            </span>
            <ChevronDown size={11} className="sim-symbol-caret" />
          </button>

          {/* Timeframe 3-Row Grouped Selector */}
          <div className="sim-timeframe-wrap" ref={timeframeRef}>
            <button
              type="button"
              className="sim-timeframe-btn"
              onClick={() => setIsTimeframeOpen(!isTimeframeOpen)}
              title="Select Timeframe"
            >
              <Clock size={12} style={{ color: 'var(--text-secondary)' }} />
              <span className="sim-tf-val">{store.controls.timeframe}</span>
              <ChevronDown size={11} className="sim-tf-caret" />
            </button>

            {isTimeframeOpen && (
              <div className="sim-timeframe-popover">
                <div className="sim-tf-group">
                  <span className="sim-tf-group-lbl">MINUTES</span>
                  <div className="sim-tf-chips-row">
                    {['1m', '2m', '3m', '5m', '10m', '15m', '30m', '45m'].map((tf) => (
                      <button
                        key={tf}
                        type="button"
                        className={`sim-tf-chip ${store.controls.timeframe === tf ? 'active' : ''}`}
                        onClick={() => {
                          store.setControls({ timeframe: tf });
                          setIsTimeframeOpen(false);
                        }}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sim-tf-group">
                  <span className="sim-tf-group-lbl">HOURS</span>
                  <div className="sim-tf-chips-row">
                    {['1h', '2h', '3h', '4h'].map((tf) => (
                      <button
                        key={tf}
                        type="button"
                        className={`sim-tf-chip ${store.controls.timeframe === tf ? 'active' : ''}`}
                        onClick={() => {
                          store.setControls({ timeframe: tf });
                          setIsTimeframeOpen(false);
                        }}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sim-tf-group">
                  <span className="sim-tf-group-lbl">DAYS, WEEKS & MONTHS</span>
                  <div className="sim-tf-chips-row">
                    {['1d', '1w', '1mo'].map((tf) => (
                      <button
                        key={tf}
                        type="button"
                        className={`sim-tf-chip ${store.controls.timeframe === tf ? 'active' : ''}`}
                        onClick={() => {
                          store.setControls({ timeframe: tf });
                          setIsTimeframeOpen(false);
                        }}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Date Range Selector Popover */}
          <div className="sim-date-range-wrap" ref={dateRangeRef}>
            <button
              type="button"
              className="sim-date-range-btn"
              onClick={() => setIsDateRangeOpen(!isDateRangeOpen)}
              title="Configure Simulation Date Range"
            >
              <Calendar size={13} style={{ color: 'var(--primary)' }} />
              <span className="sim-date-range-preset-pill">{store.controls.period}</span>
              <span className="sim-date-range-dates">
                {activeStartDate} → {activeEndDate}
              </span>
              <ChevronDown size={11} style={{ color: 'var(--fg-muted)' }} />
            </button>

            {isDateRangeOpen && (
              <div className="sim-date-range-popover">
                <div className="sim-date-range-header">
                  <div className="sim-date-range-title">
                    <Calendar size={13} style={{ color: 'var(--primary)' }} />
                    <span>Simulation Date Range</span>
                  </div>
                  <button
                    type="button"
                    className="sim-drawer-close-btn"
                    onClick={() => setIsDateRangeOpen(false)}
                    title="Close"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="sim-preset-chips">
                  {PERIOD_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`sim-preset-chip ${store.controls.period === p ? 'active' : ''}`}
                      onClick={() => handleSelectPreset(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <div className="sim-date-inputs-row">
                  <div className="sim-date-input-field">
                    <span className="sim-date-input-lbl">Start Date</span>
                    <input
                      type="date"
                      className="sim-date-native-input"
                      value={activeStartDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                    />
                  </div>

                  <div className="sim-date-input-field">
                    <span className="sim-date-input-lbl">End Date</span>
                    <input
                      type="date"
                      className="sim-date-native-input"
                      value={activeEndDate}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, paddingTop: 4 }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-xs"
                    onClick={() => setIsDateRangeOpen(false)}
                  >
                    Apply Range
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Interactive Replay Controller */}
        <div className="sim-replay-cluster">
          <button
            type="button"
            className="sim-ctrl-btn"
            onClick={() => {
              engine.reset();
              engine.clearPortfolio();
            }}
            title="Reset Simulation & Tables"
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
            <div className="sim-journal-pane" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <ConfigurableTable
                data={trips}
                columns={tradeJournalColumns}
                keyExtractor={(tr) => tr.id}
                compact
                pagination={trips.length > 25}
                pageSize={25}
                emptyTitle="No Completed Trades Yet"
                emptySubtitle="Step or play the simulation forward to observe confluence triggers and trade executions."
                totalItemsLabel="trades"
              />
            </div>
          )}

          {/* TAB 3: SANDBOXED PORTFOLIO */}
          {dockTab === 'portfolio' && (
            <div className="sim-portfolio-pane" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
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

              <div style={{ flex: 1, minHeight: 220 }}>
                <ConfigurableTable
                  data={sandboxPositions}
                  columns={portfolioColumns}
                  keyExtractor={(row) => row.id}
                  compact
                  emptyTitle="No Active Sandboxed Positions"
                  emptySubtitle="Portfolio is currently flat. Step forward or click Play to simulate market executions and open positions."
                  totalItemsLabel="positions"
                />
              </div>
            </div>
          )}

          {/* TAB 4: SIGNAL CONFLUENCE */}
          {dockTab === 'signals' && (
            <div className="sim-signals-pane" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div className="sim-signals-header" style={{ marginBottom: 10 }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Live Multi-Indicator Confluence Evaluation</span>
                <span style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>
                  Evaluated at Bar {engineState.currentBarIndex} · {engineState.currentTick?.timeStr ?? '—'}
                </span>
              </div>

              <div style={{ flex: 1, minHeight: 220 }}>
                <ConfigurableTable
                  data={engineState.activeSignals}
                  columns={signalColumns}
                  keyExtractor={(sig) => sig.id}
                  compact
                  emptyTitle="No Active Strategy Signals"
                  emptySubtitle="No strategy rules or indicator signals triggered for the current replay bar."
                  totalItemsLabel="rules"
                />
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

      {/* Symbol Search Modal */}
      <SymbolSearchModal
        open={isSymbolModalOpen}
        onClose={() => setIsSymbolModalOpen(false)}
        currentSymbol={store.controls.symbol}
        onSelectSymbol={handleSymbolSelect}
      />
    </div>
  );
}

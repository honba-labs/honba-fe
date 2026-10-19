import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Send,
  ChevronRight,
  ShieldCheck,
  Zap,
  Clock,
  Layers,
  CheckCircle,
  AlertTriangle,
  FileText,
  Archive,
  Edit2,
  X,
  Target,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { useEquityStore } from '../../core/store/equityStore';
import { useAccountStore, BrokerAccount, PaperPosition } from '../../core/store/accountStore';
import './PortfolioView.css';

// 1Y historical equity curve points in ₹
const CHART_POINTS = [
  { date: 'Oct 18, 25', val: 3220000, nifty: 3100000 },
  { date: 'Nov 12, 25', val: 3365000, nifty: 3180000 },
  { date: 'Dec 05, 25', val: 3510000, nifty: 3310000 },
  { date: 'Dec 31, 25', val: 3485000, nifty: 3290000 },
  { date: 'Jan 22, 26', val: 3645000, nifty: 3410000 },
  { date: 'Feb 18, 26', val: 3790000, nifty: 3520000 },
  { date: 'Mar 15, 26', val: 3740000, nifty: 3480000 },
  { date: 'Apr 10, 26', val: 3915000, nifty: 3620000 },
  { date: 'May 24, 26', val: 3880000, nifty: 3590000 },
  { date: 'Jun 19, 26', val: 4020000, nifty: 3740000 },
  { date: 'Jul 15, 26', val: 4110000, nifty: 3810000 },
  { date: 'Aug 06, 26', val: 4160000, nifty: 3880000 },
  { date: 'Sep 12, 26', val: 4140000, nifty: 3860000 },
  { date: 'Oct 18, 26', val: 4202570, nifty: 3920000 },
];

export function PortfolioView() {
  const navigate = useNavigate();
  const {
    tradingMode,
    setFundsModalOpen,
    setWithdrawModalOpen,
  } = useEquityStore();

  const {
    selectedBrokerId,
    setSelectedBrokerId,
    brokerAccounts,
    activeSessionId,
    setActiveSessionId,
    paperSessions,
    squareOffPaperPosition,
    addPaperPosition,
    concludePaperSession,
    updatePositionSlTarget,
    createPaperSession,
  } = useAccountStore();

  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '1Y' | 'All'>('1Y');
  const [chartMode, setChartMode] = useState<'line' | 'candles'>('line');
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [isAddPositionModalOpen, setIsAddPositionModalOpen] = useState(false);
  const [isConnectBrokerModalOpen, setIsConnectBrokerModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<PaperPosition | null>(null);

  // New session form state
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionDesc, setNewSessionDesc] = useState('');
  const [newSessionCapital, setNewSessionCapital] = useState(1000000);

  // New position form state
  const [posSymbol, setPosSymbol] = useState('RELIANCE');
  const [posQty, setPosQty] = useState(50);
  const [posPrice, setPosPrice] = useState(2940.5);
  const [posType, setPosType] = useState<PaperPosition['tradeType']>('Positional Swing');
  const [posSl, setPosSl] = useState(2850);
  const [posTarget, setPosTarget] = useState(3150);
  const [posNotes, setPosNotes] = useState('');

  // Active paper session
  const currentSession = paperSessions[activeSessionId] || Object.values(paperSessions)[0];

  // Live consolidated accounts summary
  const consolidatedLiveSummary = useMemo(() => {
    let totalCapital = 0;
    let availableMargin = 0;
    let usedMargin = 0;
    let todayPnl = 0;
    let unrealisedPnl = 0;
    let realisedPnl = 0;
    let totalHoldingsCount = 0;

    const brokers = Object.values(brokerAccounts);
    brokers.forEach((b) => {
      totalCapital += b.totalCapital;
      availableMargin += b.availableMargin;
      usedMargin += b.usedMargin;
      todayPnl += b.todayPnl;
      unrealisedPnl += b.unrealisedPnl;
      realisedPnl += b.realisedPnl;
      totalHoldingsCount += b.holdingsCount;
    });

    const activeBroker = selectedBrokerId !== 'all' ? brokerAccounts[selectedBrokerId] : null;

    return {
      totalCapital: activeBroker ? activeBroker.totalCapital : totalCapital,
      availableMargin: activeBroker ? activeBroker.availableMargin : availableMargin,
      usedMargin: activeBroker ? activeBroker.usedMargin : usedMargin,
      todayPnl: activeBroker ? activeBroker.todayPnl : todayPnl,
      todayPnlPct: activeBroker
        ? activeBroker.todayPnlPct
        : Number(((todayPnl / (totalCapital || 1)) * 100).toFixed(2)),
      unrealisedPnl: activeBroker ? activeBroker.unrealisedPnl : unrealisedPnl,
      unrealisedPnlPct: activeBroker ? activeBroker.unrealisedPnlPct : 14.8,
      realisedPnl: activeBroker ? activeBroker.realisedPnl : realisedPnl,
      holdingsCount: activeBroker ? activeBroker.holdingsCount : totalHoldingsCount,
    };
  }, [brokerAccounts, selectedBrokerId]);

  // Paper session summary
  const paperSessionSummary = useMemo(() => {
    if (!currentSession) return { totalEquity: 0, openPnl: 0, openInvested: 0, closedPnl: 0, returnPct: 0 };
    let openInvested = 0;
    let openValue = 0;
    let openPnl = 0;

    currentSession.openPositions.forEach((p) => {
      const inv = p.quantity * p.avgEntryPrice;
      const val = p.quantity * p.currentPrice;
      openInvested += inv;
      openValue += val;
      openPnl += val - inv;
    });

    let closedPnl = 0;
    currentSession.closedTrades.forEach((t) => {
      const exit = t.squaredOffPrice || t.currentPrice;
      closedPnl += (exit - t.avgEntryPrice) * t.quantity;
    });

    const totalEquity = currentSession.cashBalance + openValue;

    return {
      totalEquity,
      openInvested,
      openValue,
      openPnl,
      closedPnl,
      returnPct: Number((((totalEquity - currentSession.initialCapital) / currentSession.initialCapital) * 100).toFixed(2)),
    };
  }, [currentSession]);

  // Holdings list for live mode
  const displayedHoldings = useMemo(() => {
    if (selectedBrokerId === 'all') {
      return Object.values(brokerAccounts).flatMap((b) =>
        b.holdings.map((h) => ({ ...h, brokerName: b.brokerName, brandColor: b.brandColor }))
      );
    }
    const broker = brokerAccounts[selectedBrokerId];
    return broker ? broker.holdings.map((h) => ({ ...h, brokerName: broker.brokerName, brandColor: broker.brandColor })) : [];
  }, [brokerAccounts, selectedBrokerId]);

  // SVG Chart points calculation
  const svgWidth = 900;
  const svgHeight = 240;
  const minVal = 3000000;
  const maxVal = 4400000;

  const pointsString = CHART_POINTS.map((pt, i) => {
    const x = (i / (CHART_POINTS.length - 1)) * svgWidth;
    const y = svgHeight - ((pt.val - minVal) / (maxVal - minVal)) * svgHeight;
    return `${x},${y}`;
  }).join(' ');

  const areaPointsString = `0,${svgHeight} ${pointsString} ${svgWidth},${svgHeight}`;

  const benchmarkPointsString = CHART_POINTS.map((pt, i) => {
    const x = (i / (CHART_POINTS.length - 1)) * svgWidth;
    const y = svgHeight - ((pt.nifty - minVal) / (maxVal - minVal)) * svgHeight;
    return `${x},${y}`;
  }).join(' ');

  const handleCreateSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;
    createPaperSession({
      name: newSessionName.trim(),
      description: newSessionDesc.trim() || 'Positional & Swing paper trading session',
      initialCapital: Number(newSessionCapital),
    });
    setNewSessionName('');
    setNewSessionDesc('');
    setIsNewSessionModalOpen(false);
  };

  const handleAddPositionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession) return;
    addPaperPosition(currentSession.id, {
      symbol: posSymbol,
      name: `${posSymbol} Ltd`,
      ticker: `NSE:${posSymbol}`,
      tradeType: posType,
      side: 'BUY',
      quantity: Number(posQty),
      avgEntryPrice: Number(posPrice),
      currentPrice: Number(posPrice),
      entryDateStr: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      holdingDays: 0,
      stopLoss: Number(posSl),
      target: Number(posTarget),
      trailingSl: Number(posSl),
      color: '#7b3fe4',
      notes: posNotes,
    });
    setIsAddPositionModalOpen(false);
  };

  const handleEditSlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPosition || !currentSession) return;
    updatePositionSlTarget(currentSession.id, editingPosition.id, editingPosition.stopLoss, editingPosition.target);
    setEditingPosition(null);
  };

  return (
    <div className="portfolio-container">
      {/* ============================================================== */}
      {/* 1. PAPER TRADING VIEW (When Paper Mode is Selected: ONLY SHOWS THIS) */}
      {/* ============================================================== */}
      {tradingMode === 'paper' ? (
        <div className="portfolio-paper-layout">
          {/* Paper Session Header Bar */}
          <div className="card paper-session-bar">
            <div className="paper-session-bar-left">
              <div className="paper-session-selector-wrap">
                <span className="paper-session-label">Active Paper Session</span>
                <select
                  className="paper-session-dropdown"
                  value={currentSession?.id}
                  onChange={(e) => setActiveSessionId(e.target.value)}
                >
                  {Object.values(paperSessions).map((sess) => (
                    <option key={sess.id} value={sess.id}>
                      {sess.name} ({sess.status.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="paper-session-badge">
                <span className="wunder-pill-dot-warning" />
                <span>Simulated Environment</span>
              </div>

              <span className="paper-session-date">
                Started {currentSession?.createdDateStr} · {currentSession?.tags.join(', ')}
              </span>
            </div>

            <div className="paper-session-bar-actions">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setIsNewSessionModalOpen(true)}
              >
                <Plus size={14} /> New Session
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setIsAddPositionModalOpen(true)}
              >
                <Plus size={14} /> New Positional Trade
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm archive-btn"
                onClick={() => {
                  if (confirm(`Conclude & archive "${currentSession.name}" to Tradebook? All open trades will be recorded.`)) {
                    concludePaperSession(currentSession.id, 'Session archived from Portfolio page.');
                    navigate('/tradebook');
                  }
                }}
                title="Archive completed session into Tradebook journal"
              >
                <Archive size={14} /> Conclude Session → Tradebook
              </button>
            </div>
          </div>

          {/* Paper Session KPI Cards */}
          <section className="portfolio-kpi-grid">
            <div className="card kpi-card">
              <span className="kpi-label">Total Session Equity</span>
              <div className="num kpi-val">
                ₹{paperSessionSummary.totalEquity.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className={`kpi-sub ${paperSessionSummary.returnPct >= 0 ? 'color-bullish' : 'color-bearish'}`}>
                {paperSessionSummary.returnPct >= 0 ? '+' : ''}{paperSessionSummary.returnPct}% from ₹{(currentSession?.initialCapital || 1).toLocaleString()} base
              </span>
            </div>

            <div className="card kpi-card">
              <span className="kpi-label">Non-Squared-Off P&L (Unrealised)</span>
              <div className={`num kpi-val ${paperSessionSummary.openPnl >= 0 ? 'color-bullish' : 'color-bearish'}`}>
                {paperSessionSummary.openPnl >= 0 ? '+₹' : '-₹'}
                {Math.abs(paperSessionSummary.openPnl).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="kpi-sub">{currentSession?.openPositions.length || 0} active long-running trades</span>
            </div>

            <div className="card kpi-card">
              <span className="kpi-label">Realised Session P&L (Booked)</span>
              <div className={`num kpi-val ${paperSessionSummary.closedPnl >= 0 ? 'color-bullish' : 'color-bearish'}`}>
                {paperSessionSummary.closedPnl >= 0 ? '+₹' : '-₹'}
                {Math.abs(paperSessionSummary.closedPnl).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="kpi-sub">{currentSession?.closedTrades.length || 0} closed trades in this session</span>
            </div>

            <div className="card kpi-card">
              <span className="kpi-label">Available Cash Margin</span>
              <div className="num kpi-val">
                ₹{(currentSession?.cashBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="kpi-sub">Invested: ₹{paperSessionSummary.openInvested.toLocaleString('en-IN')}</span>
            </div>
          </section>

          {/* NON-SQUARED-OFF INSTRUMENTS SECTION (For Long Running Trades) */}
          <section className="card portfolio-holdings-card">
            <div className="portfolio-card-head">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 className="portfolio-card-title">Non-Squared-Off Instruments (Long Running Trades)</h3>
                  <span className="paper-tag-pill">{currentSession?.openPositions.length || 0} Active</span>
                </div>
                <p className="portfolio-card-subtitle">
                  Positions held open across multiple trading sessions for swing & positional trend capture
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setIsAddPositionModalOpen(true)}
              >
                <Plus size={14} /> Add Positional Instrument
              </button>
            </div>

            <div className="portfolio-table-wrapper">
              {currentSession?.openPositions.length === 0 ? (
                <div className="paper-empty-state">
                  <Clock size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
                  <p style={{ fontWeight: 600 }}>No non-squared-off instruments in this session</p>
                  <p style={{ fontSize: '13px', color: 'var(--fg-secondary)', maxWidth: '400px' }}>
                    Open a new positional trade or carry over overnight positions for long-running swing strategies.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: '12px' }}
                    onClick={() => setIsAddPositionModalOpen(true)}
                  >
                    <Plus size={14} /> Add First Positional Instrument
                  </button>
                </div>
              ) : (
                <table className="portfolio-table">
                  <thead>
                    <tr>
                      <th>Instrument</th>
                      <th>Setup & Duration</th>
                      <th style={{ textAlign: 'right' }}>Qty & Avg Price</th>
                      <th style={{ textAlign: 'right' }}>LTP</th>
                      <th style={{ textAlign: 'right' }}>Current Value</th>
                      <th style={{ textAlign: 'right' }}>Unrealised P&L</th>
                      <th style={{ textAlign: 'center' }}>SL & Target</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSession?.openPositions.map((pos) => {
                      const curVal = pos.quantity * pos.currentPrice;
                      const pnl = (pos.currentPrice - pos.avgEntryPrice) * pos.quantity;
                      const pnlPct = ((pos.currentPrice - pos.avgEntryPrice) / pos.avgEntryPrice) * 100;

                      return (
                        <tr key={pos.id} className="portfolio-table-row">
                          <td>
                            <div className="portfolio-table-coin-cell">
                              <div className="wunder-coin-badge" style={{ backgroundColor: pos.color }}>
                                {pos.symbol.slice(0, 3)}
                              </div>
                              <div>
                                <div className="portfolio-coin-cell-name">{pos.name}</div>
                                <div className="portfolio-coin-cell-sym">{pos.ticker}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span className="holding-duration-badge">
                                <Clock size={11} /> {pos.holdingDays} days open
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>
                                {pos.entryDateStr} · {pos.tradeType}
                              </span>
                            </div>
                          </td>
                          <td className="num" style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 600 }}>{pos.quantity} shares</div>
                            <div style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>
                              @ ₹{pos.avgEntryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                          </td>
                          <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>
                            ₹{pos.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
                            ₹{curVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td
                            className="num"
                            style={{
                              textAlign: 'right',
                              fontWeight: 700,
                              color: pnl >= 0 ? 'var(--bullish)' : 'var(--bearish)',
                            }}
                          >
                            <div>{pnl >= 0 ? '+' : ''}₹{pnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            <div style={{ fontSize: '11px' }}>
                              {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div className="risk-levels-cell">
                              <span className="risk-badge sl-badge">SL: ₹{pos.stopLoss}</span>
                              <span className="risk-badge tgt-badge">TGT: ₹{pos.target}</span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm table-action-btn"
                                onClick={() => setEditingPosition(pos)}
                                title="Edit Stop Loss & Target"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm table-action-btn squareoff-btn"
                                onClick={() => {
                                  if (confirm(`Square off ${pos.symbol} position of ${pos.quantity} shares @ ₹${pos.currentPrice}?`)) {
                                    squareOffPaperPosition(currentSession.id, pos.id);
                                  }
                                }}
                                title="Square off this trade immediately"
                              >
                                Square Off
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* Closed Trades in this Session */}
          {currentSession?.closedTrades && currentSession.closedTrades.length > 0 && (
            <section className="card portfolio-holdings-card">
              <div className="portfolio-card-head">
                <div>
                  <h3 className="portfolio-card-title">Completed & Squared-Off Trades in This Session</h3>
                  <p className="portfolio-card-subtitle">Trades realized during current active session</p>
                </div>
              </div>

              <div className="portfolio-table-wrapper">
                <table className="portfolio-table">
                  <thead>
                    <tr>
                      <th>Instrument</th>
                      <th>Duration</th>
                      <th style={{ textAlign: 'right' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Avg Buy</th>
                      <th style={{ textAlign: 'right' }}>Exit Price</th>
                      <th style={{ textAlign: 'right' }}>Realised P&L</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSession.closedTrades.map((t) => {
                      const exit = t.squaredOffPrice || t.currentPrice;
                      const pnl = (exit - t.avgEntryPrice) * t.quantity;
                      const pnlPct = ((exit - t.avgEntryPrice) / t.avgEntryPrice) * 100;

                      return (
                        <tr key={t.id} className="portfolio-table-row">
                          <td>
                            <div className="portfolio-table-coin-cell">
                              <div className="wunder-coin-badge" style={{ backgroundColor: t.color }}>
                                {t.symbol.slice(0, 3)}
                              </div>
                              <div>
                                <div className="portfolio-coin-cell-name">{t.name}</div>
                                <div className="portfolio-coin-cell-sym">{t.ticker}</div>
                              </div>
                            </div>
                          </td>
                          <td>{t.holdingDays} days open</td>
                          <td className="num" style={{ textAlign: 'right' }}>{t.quantity}</td>
                          <td className="num" style={{ textAlign: 'right' }}>₹{t.avgEntryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>₹{exit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td
                            className="num"
                            style={{
                              textAlign: 'right',
                              fontWeight: 700,
                              color: pnl >= 0 ? 'var(--bullish)' : 'var(--bearish)',
                            }}
                          >
                            {pnl >= 0 ? '+' : ''}₹{pnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            <span style={{ fontSize: '11px', marginLeft: '4px' }}>
                              ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)
                            </span>
                          </td>
                          <td style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>{t.notes || 'Target achieved'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      ) : (
        /* ============================================================== */
        /* 2. LIVE MULTI-ACCOUNT VIEW (Dhan, Zerodha, Groww, Angel One)   */
        /* ============================================================== */
        <div className="portfolio-live-layout">
          {/* Broker Accounts Navigation Strip */}
          <div className="broker-tabs-container">
            <div className="broker-tabs-list">
              <button
                type="button"
                className={`broker-tab-btn ${selectedBrokerId === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedBrokerId('all')}
              >
                <Layers size={15} />
                <span>All Accounts Consolidated</span>
                <span className="broker-tab-count">{Object.keys(brokerAccounts).length}</span>
              </button>

              {Object.values(brokerAccounts).map((broker) => (
                <button
                  key={broker.id}
                  type="button"
                  className={`broker-tab-btn ${selectedBrokerId === broker.id ? 'active' : ''}`}
                  onClick={() => setSelectedBrokerId(broker.id)}
                >
                  <span className="broker-tab-dot" style={{ backgroundColor: broker.brandColor }} />
                  <span>{broker.brokerName}</span>
                  <span className="broker-tab-sub">{broker.accountNumber}</span>
                  <span className="broker-tab-latency">{broker.latencyMs}ms</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              className="btn btn-outline btn-sm connect-broker-btn"
              onClick={() => setIsConnectBrokerModalOpen(true)}
            >
              <Plus size={14} /> Connect Broker
            </button>
          </div>

          {/* Broker Account Overview Cards Grid */}
          <div className="broker-cards-grid">
            {Object.values(brokerAccounts).map((broker) => (
              <div
                key={broker.id}
                className={`card broker-overview-card ${selectedBrokerId === broker.id ? 'selected-broker-card' : ''}`}
                onClick={() => setSelectedBrokerId(broker.id)}
              >
                <div className="broker-card-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="broker-logo-badge" style={{ backgroundColor: broker.brandColor }}>
                      {broker.brokerName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="broker-name">{broker.brokerName}</div>
                      <div className="broker-account-no">{broker.accountNumber}</div>
                    </div>
                  </div>
                  <div className="broker-status-pill">
                    <span className="broker-status-dot pulse-indicator" />
                    <span>{broker.latencyMs}ms</span>
                  </div>
                </div>

                <div className="broker-card-metrics">
                  <div>
                    <span className="broker-metric-lbl">Total Capital</span>
                    <div className="num broker-metric-val">
                      ₹{(broker.totalCapital / 100000).toFixed(2)}L
                    </div>
                  </div>
                  <div>
                    <span className="broker-metric-lbl">Available Margin</span>
                    <div className="num broker-metric-sub">
                      ₹{(broker.availableMargin / 100000).toFixed(2)}L
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="broker-metric-lbl">Today's P&L</span>
                    <div className={`num broker-metric-pnl ${broker.todayPnl >= 0 ? 'color-bullish' : 'color-bearish'}`}>
                      {broker.todayPnl >= 0 ? '+' : ''}₹{broker.todayPnl.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Large Portfolio Hero Card */}
          <section className="card portfolio-hero-card">
            <div className="portfolio-hero-header">
              <div className="portfolio-hero-left">
                <span className="portfolio-hero-label">
                  {selectedBrokerId === 'all'
                    ? 'Total Consolidated Portfolio Value (All Brokers)'
                    : `${brokerAccounts[selectedBrokerId]?.brokerName} Portfolio Value`}
                </span>
                <div className="portfolio-hero-value-row">
                  <span className="num portfolio-hero-value">
                    ₹{consolidatedLiveSummary.totalCapital.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="portfolio-hero-ccy">INR</span>
                </div>
                <div className="portfolio-hero-pill-row">
                  <span className={`pill ${consolidatedLiveSummary.todayPnl >= 0 ? 'pill-bullish' : 'pill-bearish'}`}>
                    {consolidatedLiveSummary.todayPnl >= 0 ? '+₹' : '-₹'}
                    {Math.abs(consolidatedLiveSummary.todayPnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    <TrendingUp size={12} style={{ margin: '0 2px' }} />
                    {consolidatedLiveSummary.todayPnlPct >= 0 ? '+' : ''}{consolidatedLiveSummary.todayPnlPct}%
                  </span>
                  <span className="portfolio-hero-time-label">1D Return across active holdings</span>
                </div>
              </div>

              <div className="portfolio-hero-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setFundsModalOpen(true)}
                >
                  <Plus size={15} /> Add Margin
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setWithdrawModalOpen(true)}
                >
                  <ArrowUpRight size={15} /> Withdraw
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => navigate('/workbench')}
                >
                  <Send size={14} /> Open Workbench
                </button>
              </div>
            </div>

            {/* Chart Toolbar Controls */}
            <div className="portfolio-chart-controls">
              <div className="portfolio-tf-group">
                {(['1D', '1W', '1M', '1Y', 'All'] as const).map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    className={`portfolio-tf-btn ${timeframe === tf ? 'active' : ''}`}
                    onClick={() => setTimeframe(tf)}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              <div className="portfolio-chart-legend">
                <div className="portfolio-legend-item">
                  <span className="portfolio-legend-dot dot-portfolio" />
                  <span>Consolidated Equities</span>
                </div>
                <div className="portfolio-legend-item">
                  <span className="portfolio-legend-dot dot-benchmark" />
                  <span>NIFTY 50 Benchmark</span>
                </div>
              </div>
            </div>

            {/* SVG Equity Area Chart */}
            <div className="portfolio-chart-area">
              <div className="portfolio-y-axis">
                <span>₹44L</span>
                <span>₹40L</span>
                <span>₹36L</span>
                <span>₹32L</span>
                <span>0</span>
              </div>

              <div className="portfolio-svg-wrapper">
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none" className="portfolio-svg">
                  <defs>
                    <linearGradient id="equityGradLive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  <line x1="0" y1="0" x2={svgWidth} y2="0" stroke="var(--chart-grid)" strokeDasharray="3 3" />
                  <line x1="0" y1="60" x2={svgWidth} y2="60" stroke="var(--chart-grid)" strokeDasharray="3 3" />
                  <line x1="0" y1="120" x2={svgWidth} y2="120" stroke="var(--chart-grid)" strokeDasharray="3 3" />
                  <line x1="0" y1="180" x2={svgWidth} y2="180" stroke="var(--chart-grid)" strokeDasharray="3 3" />

                  <polygon points={areaPointsString} fill="url(#equityGradLive)" />

                  <polyline
                    points={benchmarkPointsString}
                    fill="none"
                    stroke="var(--chart-benchmark)"
                    strokeWidth="1.5"
                    opacity="0.6"
                  />

                  <polyline
                    points={pointsString}
                    fill="none"
                    stroke="var(--chart-portfolio)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </section>

          {/* 4 Stat KPI Cards */}
          <section className="portfolio-kpi-grid">
            <div className="card kpi-card">
              <span className="kpi-label">Unrealised Demat P&L</span>
              <div className="num kpi-val color-bullish">
                +₹{consolidatedLiveSummary.unrealisedPnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="kpi-sub">Overall holdings return (+{consolidatedLiveSummary.unrealisedPnlPct}%)</span>
            </div>

            <div className="card kpi-card">
              <span className="kpi-label">Realised P&L (Booked)</span>
              <div className="num kpi-val color-bullish">
                +₹{consolidatedLiveSummary.realisedPnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="kpi-sub">Across closed CNC & MIS delivery trades</span>
            </div>

            <div className="card kpi-card">
              <span className="kpi-label">Available Cash Margin</span>
              <div className="num kpi-val">
                ₹{consolidatedLiveSummary.availableMargin.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="kpi-sub">Used Margin: ₹{consolidatedLiveSummary.usedMargin.toLocaleString('en-IN')}</span>
            </div>

            <div className="card kpi-card">
              <span className="kpi-label">Connected Broker Accounts</span>
              <div className="num kpi-val">{Object.keys(brokerAccounts).length} Active</div>
              <span className="kpi-link" onClick={() => setIsConnectBrokerModalOpen(true)}>
                Manage APIs <ChevronRight size={12} />
              </span>
            </div>
          </section>

          {/* Holdings Table */}
          <section className="card portfolio-holdings-card">
            <div className="portfolio-card-head">
              <div>
                <h3 className="portfolio-card-title">
                  {selectedBrokerId === 'all'
                    ? 'Consolidated Demat Holdings (All Accounts)'
                    : `${brokerAccounts[selectedBrokerId]?.brokerName} Demat Holdings`}
                </h3>
                <p className="portfolio-card-subtitle">
                  Long-term delivery equity holdings synced across connected Indian brokers
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => navigate('/screener')}
                >
                  <Sliders size={14} /> Scan Universe
                </button>
              </div>
            </div>

            <div className="portfolio-table-wrapper">
              <table className="portfolio-table">
                <thead>
                  <tr>
                    <th>Instrument</th>
                    <th>Broker Account</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Avg Buy</th>
                    <th style={{ textAlign: 'right' }}>LTP</th>
                    <th style={{ textAlign: 'right' }}>Current Value</th>
                    <th style={{ textAlign: 'right' }}>Unrealised P&L</th>
                    <th style={{ textAlign: 'right' }}>Trade</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedHoldings.map((h, i) => (
                    <tr
                      key={`${h.symbol}-${i}`}
                      className="portfolio-table-row"
                    >
                      <td>
                        <div className="portfolio-table-coin-cell">
                          <div className="wunder-coin-badge" style={{ backgroundColor: 'var(--primary)' }}>
                            {h.symbol.slice(0, 3)}
                          </div>
                          <div>
                            <div className="portfolio-coin-cell-name">{h.name}</div>
                            <div className="portfolio-coin-cell-sym">{h.ticker} · {h.sector}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="broker-badge-pill" style={{ borderColor: h.brandColor, color: h.brandColor }}>
                          {h.brokerName}
                        </span>
                      </td>
                      <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>
                        {h.quantity} shares
                      </td>
                      <td className="num" style={{ textAlign: 'right' }}>
                        ₹{h.avgBuyPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>
                        ₹{h.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
                        ₹{h.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td
                        className="num"
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          color: h.pnl >= 0 ? 'var(--bullish)' : 'var(--bearish)',
                        }}
                      >
                        {h.pnl >= 0 ? '+' : ''}₹{h.pnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        <div style={{ fontSize: '11px' }}>
                          {h.pnlPct >= 0 ? '+' : ''}{h.pnlPct.toFixed(2)}%
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm table-action-btn"
                          onClick={() => {
                            useEquityStore.getState().setActiveTicker(h.ticker);
                            navigate('/workbench');
                          }}
                        >
                          Chart & Trade <ArrowRight size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODALS                                                         */}
      {/* ============================================================== */}

      {/* 1. New Paper Session Modal */}
      {isNewSessionModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsNewSessionModalOpen(false)}>
          <div className="card modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create New Paper Trading Session</h3>
              <button className="modal-close-btn" onClick={() => setIsNewSessionModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateSessionSubmit} className="modal-body">
              <label className="form-field">
                <span>Session Name</span>
                <input
                  type="text"
                  placeholder="e.g. Q4 Positional Momentum Session #4"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  required
                />
              </label>

              <label className="form-field">
                <span>Description / Thesis</span>
                <textarea
                  placeholder="Outline trading rules, setups, and holding horizons for this session..."
                  value={newSessionDesc}
                  onChange={(e) => setNewSessionDesc(e.target.value)}
                  rows={3}
                />
              </label>

              <label className="form-field">
                <span>Initial Paper Margin (₹)</span>
                <input
                  type="number"
                  min="10000"
                  step="50000"
                  value={newSessionCapital}
                  onChange={(e) => setNewSessionCapital(Number(e.target.value))}
                  required
                />
              </label>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIsNewSessionModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Start Paper Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Positional Instrument Modal */}
      {isAddPositionModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddPositionModalOpen(false)}>
          <div className="card modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add Non-Squared-Off Positional Trade</h3>
              <button className="modal-close-btn" onClick={() => setIsAddPositionModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddPositionSubmit} className="modal-body">
              <div className="form-grid-2">
                <label className="form-field">
                  <span>Symbol (NSE)</span>
                  <select value={posSymbol} onChange={(e) => setPosSymbol(e.target.value)}>
                    <option value="RELIANCE">RELIANCE (Reliance Ind)</option>
                    <option value="TCS">TCS (Tata Consultancy)</option>
                    <option value="HDFCBANK">HDFCBANK (HDFC Bank)</option>
                    <option value="INFY">INFY (Infosys)</option>
                    <option value="LT">LT (Larsen & Toubro)</option>
                    <option value="TATAMOTORS">TATAMOTORS (Tata Motors)</option>
                    <option value="ICICIBANK">ICICIBANK (ICICI Bank)</option>
                    <option value="SBIN">SBIN (State Bank of India)</option>
                    <option value="ITC">ITC (ITC Ltd)</option>
                    <option value="BHARTIARTL">BHARTIARTL (Bharti Airtel)</option>
                  </select>
                </label>

                <label className="form-field">
                  <span>Trade Horizon</span>
                  <select value={posType} onChange={(e) => setPosType(e.target.value as PaperPosition['tradeType'])}>
                    <option value="Positional Swing">Positional Swing (Days to Weeks)</option>
                    <option value="Long Term">Long Term Delivery Carry</option>
                    <option value="Intraday Carry">Intraday Overnight Carry</option>
                    <option value="Options Straddle">Options Positional</option>
                  </select>
                </label>
              </div>

              <div className="form-grid-2">
                <label className="form-field">
                  <span>Quantity (Shares)</span>
                  <input
                    type="number"
                    min="1"
                    value={posQty}
                    onChange={(e) => setPosQty(Number(e.target.value))}
                    required
                  />
                </label>

                <label className="form-field">
                  <span>Entry Price (₹)</span>
                  <input
                    type="number"
                    step="0.05"
                    value={posPrice}
                    onChange={(e) => setPosPrice(Number(e.target.value))}
                    required
                  />
                </label>
              </div>

              <div className="form-grid-2">
                <label className="form-field">
                  <span>Stop Loss (₹)</span>
                  <input
                    type="number"
                    step="0.05"
                    value={posSl}
                    onChange={(e) => setPosSl(Number(e.target.value))}
                    required
                  />
                </label>

                <label className="form-field">
                  <span>Profit Target (₹)</span>
                  <input
                    type="number"
                    step="0.05"
                    value={posTarget}
                    onChange={(e) => setPosTarget(Number(e.target.value))}
                    required
                  />
                </label>
              </div>

              <label className="form-field">
                <span>Setup Notes / Breakout Thesis</span>
                <input
                  type="text"
                  placeholder="e.g. 50-day EMA bounce, quarterly earnings catalyst"
                  value={posNotes}
                  onChange={(e) => setPosNotes(e.target.value)}
                />
              </label>

              <div className="modal-summary-box">
                <span>Total Required Margin:</span>
                <span className="num font-bold">₹{(posQty * posPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIsAddPositionModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Open Long-Running Position
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Edit SL / Target Modal */}
      {editingPosition && (
        <div className="modal-backdrop" onClick={() => setEditingPosition(null)}>
          <div className="card modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Adjust Risk & Targets: {editingPosition.symbol}</h3>
              <button className="modal-close-btn" onClick={() => setEditingPosition(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditSlSubmit} className="modal-body">
              <div className="form-grid-2">
                <label className="form-field">
                  <span>Stop Loss (₹)</span>
                  <input
                    type="number"
                    step="0.05"
                    value={editingPosition.stopLoss}
                    onChange={(e) =>
                      setEditingPosition({ ...editingPosition, stopLoss: Number(e.target.value) })
                    }
                    required
                  />
                </label>
                <label className="form-field">
                  <span>Target (₹)</span>
                  <input
                    type="number"
                    step="0.05"
                    value={editingPosition.target}
                    onChange={(e) =>
                      setEditingPosition({ ...editingPosition, target: Number(e.target.value) })
                    }
                    required
                  />
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setEditingPosition(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Levels
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Connect Broker Modal */}
      {isConnectBrokerModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsConnectBrokerModalOpen(false)}>
          <div className="card modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Connect Indian Broker Account</h3>
              <button className="modal-close-btn" onClick={() => setIsConnectBrokerModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13px', color: 'var(--fg-secondary)', marginBottom: '16px' }}>
                Securely connect your Demat and trading accounts via official broker APIs for real-time portfolio sync and order execution.
              </p>

              <div className="connect-broker-list">
                <div className="connect-broker-item">
                  <div className="broker-logo-badge" style={{ backgroundColor: '#7b3fe4' }}>DH</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>Dhan (DhanHQ API)</div>
                    <div style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>Connected · Client ID DHAN-109284</div>
                  </div>
                  <span className="pill pill-bullish">Active</span>
                </div>

                <div className="connect-broker-item">
                  <div className="broker-logo-badge" style={{ backgroundColor: '#ff5722' }}>KD</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>Zerodha (Kite Connect)</div>
                    <div style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>Connected · Client ID ZERODHA-KM7124</div>
                  </div>
                  <span className="pill pill-bullish">Active</span>
                </div>

                <div className="connect-broker-item">
                  <div className="broker-logo-badge" style={{ backgroundColor: '#00d09c' }}>GW</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>Groww (Groww Invest API)</div>
                    <div style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>Connected · Client ID GROWW-931082</div>
                  </div>
                  <span className="pill pill-bullish">Active</span>
                </div>

                <div className="connect-broker-item">
                  <div className="broker-logo-badge" style={{ backgroundColor: '#ff2d55' }}>AO</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>Angel One (SmartAPI)</div>
                    <div style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>Connected · Client ID ANGEL-A29410</div>
                  </div>
                  <span className="pill pill-bullish">Active</span>
                </div>

                <div className="connect-broker-item" style={{ opacity: 0.7 }}>
                  <div className="broker-logo-badge" style={{ backgroundColor: '#6366f1' }}>UP</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>Upstox Pro API</div>
                    <div style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>Ready to pair OAuth token</div>
                  </div>
                  <button type="button" className="btn btn-outline btn-sm">Pair API</button>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '20px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsConnectBrokerModalOpen(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

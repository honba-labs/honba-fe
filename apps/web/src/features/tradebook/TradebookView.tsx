import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Calendar,
  Layers,
  Search,
  Filter,
  Download,
  Star,
  CheckCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Edit3,
  Check,
} from 'lucide-react';
import { useAccountStore, TradebookSessionRecord } from '../../core/store/accountStore';
import './TradebookView.css';

export function TradebookView() {
  const { tradebookRecords, updateTradebookNotes } = useAccountStore();
  const [filterType, setFilterType] = useState<'all' | 'live' | 'paper'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(tradebookRecords[0]?.id || null);

  // Editing state for reflection notes
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editLessons, setEditLessons] = useState('');
  const [editPsychRating, setEditPsychRating] = useState(5);
  const [editSetupRating, setEditSetupRating] = useState(4);

  // Filtered session records
  const filteredRecords = useMemo(() => {
    return tradebookRecords.filter((rec) => {
      if (filterType !== 'all' && rec.accountType !== filterType) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = rec.sessionName.toLowerCase().includes(query);
        const matchesBroker = rec.broker?.toLowerCase().includes(query);
        const matchesTags = rec.tags.some((t) => t.toLowerCase().includes(query));
        const matchesTrades = rec.trades.some((t) => t.symbol.toLowerCase().includes(query));
        if (!matchesName && !matchesBroker && !matchesTags && !matchesTrades) return false;
      }
      return true;
    });
  }, [tradebookRecords, filterType, searchQuery]);

  // Aggregate bookkeeping & tax summary
  const bookkeepingSummary = useMemo(() => {
    let grossPnl = 0;
    let netPnl = 0;
    let totalBrokerage = 0;
    let totalStt = 0;
    let totalExchange = 0;
    let totalGst = 0;
    let totalSebi = 0;
    let totalStamp = 0;
    let totalTrades = 0;
    let winningTrades = 0;

    filteredRecords.forEach((r) => {
      grossPnl += r.grossPnl;
      netPnl += r.netPnl;
      totalBrokerage += r.charges.brokerage;
      totalStt += r.charges.stt;
      totalExchange += r.charges.exchangeTurnover;
      totalGst += r.charges.gst;
      totalSebi += r.charges.sebiCharges;
      totalStamp += r.charges.stampDuty;
      totalTrades += r.totalTrades;
      winningTrades += r.winningTrades;
    });

    const totalCharges = totalBrokerage + totalStt + totalExchange + totalGst + totalSebi + totalStamp;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    return {
      grossPnl,
      netPnl,
      totalCharges,
      totalBrokerage,
      totalStt,
      totalExchange,
      totalGst,
      totalSebi,
      totalStamp,
      totalTrades,
      winRate: Number(winRate.toFixed(1)),
      stcgTaxEstimate: netPnl > 0 ? Number((netPnl * 0.2).toFixed(2)) : 0, // STCG @ 20%
    };
  }, [filteredRecords]);

  const handleStartEdit = (rec: TradebookSessionRecord) => {
    setEditingRecordId(rec.id);
    setEditLessons(rec.notes.lessons);
    setEditPsychRating(rec.notes.psychologyRating);
    setEditSetupRating(rec.notes.setupRating);
  };

  const handleSaveNotes = (recordId: string) => {
    updateTradebookNotes(recordId, {
      lessons: editLessons,
      psychologyRating: editPsychRating,
      setupRating: editSetupRating,
      reviewStatus: 'reviewed',
    });
    setEditingRecordId(null);
  };

  const handleExportCsv = () => {
    const csvRows = [
      ['Session ID', 'Session Name', 'Account Type', 'Broker', 'Start Date', 'End Date', 'Duration (Days)', 'Gross PnL (INR)', 'Total Charges (INR)', 'Net PnL (INR)', 'Win Rate %', 'Trades Count'],
      ...filteredRecords.map((r) => [
        r.sessionId,
        `"${r.sessionName}"`,
        r.accountType,
        r.broker || 'Simulated Paper',
        r.startDate,
        r.endDate,
        r.durationDays,
        r.grossPnl,
        r.charges.totalCharges,
        r.netPnl,
        r.winRatePct,
        r.totalTrades,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `honba_tradebook_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="tradebook-container">
      {/* 1. Header Toolbar with Filter & Export */}
      <div className="card tb-toolbar-card">
        <div className="tb-toolbar-left">
          <div className="tb-filter-pills">
            <button
              type="button"
              className={`tb-filter-pill ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All Completed Sessions ({tradebookRecords.length})
            </button>
            <button
              type="button"
              className={`tb-filter-pill ${filterType === 'live' ? 'active' : ''}`}
              onClick={() => setFilterType('live')}
            >
              Live Broker Sessions (Dhan, Zerodha)
            </button>
            <button
              type="button"
              className={`tb-filter-pill ${filterType === 'paper' ? 'active' : ''}`}
              onClick={() => setFilterType('paper')}
            >
              Paper Trading Sessions
            </button>
          </div>

          <div className="tb-search-wrap">
            <Search size={14} color="var(--fg-muted)" />
            <input
              type="text"
              placeholder="Search session, ticker, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="tb-search-input"
            />
          </div>
        </div>

        <div className="tb-toolbar-right">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleExportCsv}
            title="Export CSV Statement for Tax & Accounting"
          >
            <Download size={14} /> Export Tax & Ledger CSV
          </button>
        </div>
      </div>

      {/* 2. Bookkeeping & Statutory Tax Breakdown Cards */}
      <section className="tb-stats-grid">
        <div className="card tb-stat-card">
          <span className="tb-stat-lbl">Gross Realized P&L</span>
          <div className="num tb-stat-val color-bullish">
            +₹{bookkeepingSummary.grossPnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="tb-stat-sub">Across {filteredRecords.length} completed sessions ({bookkeepingSummary.totalTrades} trades)</span>
        </div>

        <div className="card tb-stat-card">
          <span className="tb-stat-lbl">Statutory Charges & Brokerage</span>
          <div className="num tb-stat-val color-bearish">
            -₹{bookkeepingSummary.totalCharges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="tb-stat-sub">STT ₹{bookkeepingSummary.totalStt.toLocaleString()} · GST ₹{bookkeepingSummary.totalGst.toLocaleString()}</span>
        </div>

        <div className="card tb-stat-card highlight-card">
          <span className="tb-stat-lbl">Net Realized P&L (In Bank)</span>
          <div className="num tb-stat-val color-bullish">
            +₹{bookkeepingSummary.netPnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="tb-stat-sub">After all exchange, broker & government levies</span>
        </div>

        <div className="card tb-stat-card">
          <span className="tb-stat-lbl">Estimated STCG Tax (20%)</span>
          <div className="num tb-stat-val">
            ₹{bookkeepingSummary.stcgTaxEstimate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="tb-stat-sub">Section 111A Short Term Capital Gains provision</span>
        </div>
      </section>

      {/* 3. Detailed Statutory Charges Ledger Strip */}
      <div className="card tb-ledger-card">
        <div className="tb-ledger-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Receipt size={16} color="var(--primary)" />
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>Statutory Charges & Fee Breakdown Ledger</h4>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>SEBI / Exchange / Govt compliant</span>
        </div>

        <div className="tb-ledger-grid">
          <div className="tb-ledger-item">
            <span className="tb-ledger-lbl">Brokerage</span>
            <span className="num tb-ledger-val">₹{bookkeepingSummary.totalBrokerage.toFixed(2)}</span>
          </div>
          <div className="tb-ledger-item">
            <span className="tb-ledger-lbl">Securities Transaction Tax (STT)</span>
            <span className="num tb-ledger-val">₹{bookkeepingSummary.totalStt.toFixed(2)}</span>
          </div>
          <div className="tb-ledger-item">
            <span className="tb-ledger-lbl">Exchange Turnover Charges</span>
            <span className="num tb-ledger-val">₹{bookkeepingSummary.totalExchange.toFixed(2)}</span>
          </div>
          <div className="tb-ledger-item">
            <span className="tb-ledger-lbl">Goods & Services Tax (GST 18%)</span>
            <span className="num tb-ledger-val">₹{bookkeepingSummary.totalGst.toFixed(2)}</span>
          </div>
          <div className="tb-ledger-item">
            <span className="tb-ledger-lbl">SEBI Turnover Charges</span>
            <span className="num tb-ledger-val">₹{bookkeepingSummary.totalSebi.toFixed(2)}</span>
          </div>
          <div className="tb-ledger-item">
            <span className="tb-ledger-lbl">Stamp Duty</span>
            <span className="num tb-ledger-val">₹{bookkeepingSummary.totalStamp.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 4. Completed Sessions List & Expandable Journal Details */}
      <section className="tb-sessions-section">
        <div className="tb-section-header">
          <h3 className="tb-section-title">Completed Portfolio Sessions & Journals</h3>
          <span style={{ fontSize: '13px', color: 'var(--fg-muted)' }}>
            Showing {filteredRecords.length} completed sessions
          </span>
        </div>

        <div className="tb-sessions-list">
          {filteredRecords.map((rec) => {
            const isExpanded = expandedSessionId === rec.id;
            const isEditing = editingRecordId === rec.id;

            return (
              <div key={rec.id} className="card tb-session-card">
                {/* Session Card Header */}
                <div
                  className="tb-session-header"
                  onClick={() => setExpandedSessionId(isExpanded ? null : rec.id)}
                >
                  <div className="tb-session-header-left">
                    <div className="tb-session-title-row">
                      <span className="tb-session-name">{rec.sessionName}</span>
                      <span className={`tb-type-pill ${rec.accountType === 'live' ? 'pill-live' : 'pill-paper'}`}>
                        {rec.accountType === 'live' ? `Live · ${rec.broker}` : 'Paper Trading'}
                      </span>
                    </div>

                    <div className="tb-session-meta-row">
                      <span className="tb-meta-item">
                        <Calendar size={12} /> {rec.startDate} — {rec.endDate} ({rec.durationDays} days)
                      </span>
                      <span className="tb-meta-dot">·</span>
                      <span className="tb-meta-item">
                        {rec.totalTrades} Trades ({rec.winningTrades}W / {rec.losingTrades}L)
                      </span>
                      <span className="tb-meta-dot">·</span>
                      <span className="tb-meta-item">Win Rate: {rec.winRatePct}%</span>
                    </div>
                  </div>

                  <div className="tb-session-header-right">
                    <div style={{ textAlign: 'right' }}>
                      <div className="num tb-header-net-pnl color-bullish">
                        +₹{rec.netPnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>
                        Gross: ₹{rec.grossPnl.toLocaleString('en-IN')} (Charges ₹{rec.charges.totalCharges.toFixed(0)})
                      </div>
                    </div>

                    <button type="button" className="tb-expand-btn">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Session Details */}
                {isExpanded && (
                  <div className="tb-session-expanded-body">
                    {/* Session Psychological Reflection & Notes Block */}
                    <div className="tb-reflection-block">
                      <div className="tb-reflection-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <BookOpen size={15} color="var(--primary)" />
                          <span style={{ fontWeight: 600, fontSize: '13px' }}>Trader Analysis & Psychological Reflection</span>
                        </div>

                        {!isEditing && (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(rec);
                            }}
                          >
                            <Edit3 size={13} /> Edit Reflection & Ratings
                          </button>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="tb-edit-reflection-form">
                          <div className="tb-ratings-row">
                            <label className="tb-rating-field">
                              <span>Discipline & Psychology Rating (1-5):</span>
                              <div className="star-rating-select">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <button
                                    key={s}
                                    type="button"
                                    className={`star-btn ${editPsychRating >= s ? 'active' : ''}`}
                                    onClick={() => setEditPsychRating(s)}
                                  >
                                    ★
                                  </button>
                                ))}
                              </div>
                            </label>

                            <label className="tb-rating-field">
                              <span>Setup Execution Quality (1-5):</span>
                              <div className="star-rating-select">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <button
                                    key={s}
                                    type="button"
                                    className={`star-btn ${editSetupRating >= s ? 'active' : ''}`}
                                    onClick={() => setEditSetupRating(s)}
                                  >
                                    ★
                                  </button>
                                ))}
                              </div>
                            </label>
                          </div>

                          <label className="tb-notes-field">
                            <span>Key Learnings, Rules Adhered & Mistakes:</span>
                            <textarea
                              rows={3}
                              value={editLessons}
                              onChange={(e) => setEditLessons(e.target.value)}
                              className="tb-notes-textarea"
                            />
                          </label>

                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => setEditingRecordId(null)}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => handleSaveNotes(rec.id)}
                            >
                              <Check size={14} /> Save to Journal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="tb-reflection-content">
                          <div className="tb-ratings-display">
                            <div className="tb-rating-badge">
                              <span>Discipline:</span>
                              <span className="stars">{'★'.repeat(rec.notes.psychologyRating)}{'☆'.repeat(5 - rec.notes.psychologyRating)}</span>
                            </div>
                            <div className="tb-rating-badge">
                              <span>Setup Execution:</span>
                              <span className="stars">{'★'.repeat(rec.notes.setupRating)}{'☆'.repeat(5 - rec.notes.setupRating)}</span>
                            </div>
                            <div className="tb-strategy-badge">
                              <span>Strategy:</span> {rec.notes.strategy}
                            </div>
                          </div>

                          <div className="tb-lessons-text">
                            <strong>Trader Reflection:</strong> {rec.notes.lessons}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Trades Log Table for this session */}
                    <div className="tb-trades-table-wrap">
                      <div className="tb-trades-title">Fills & Positions Executed in this Session</div>
                      <table className="portfolio-table">
                        <thead>
                          <tr>
                            <th>Symbol</th>
                            <th>Side</th>
                            <th style={{ textAlign: 'right' }}>Qty</th>
                            <th style={{ textAlign: 'right' }}>Entry Price</th>
                            <th style={{ textAlign: 'right' }}>Exit Price</th>
                            <th>Entry & Exit Dates</th>
                            <th>Holding Duration</th>
                            <th style={{ textAlign: 'right' }}>P&L (₹)</th>
                            <th>Setup Tag</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rec.trades.map((t) => (
                            <tr key={t.id} className="portfolio-table-row">
                              <td style={{ fontWeight: 600 }}>{t.symbol}</td>
                              <td>
                                <span className={`pill ${t.side === 'BUY' ? 'pill-bullish' : 'pill-bearish'}`}>
                                  {t.side}
                                </span>
                              </td>
                              <td className="num" style={{ textAlign: 'right' }}>{t.quantity}</td>
                              <td className="num" style={{ textAlign: 'right' }}>₹{t.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>₹{t.exitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>
                                {t.entryTime} → {t.exitTime}
                              </td>
                              <td>{t.holdingPeriod}</td>
                              <td
                                className="num"
                                style={{
                                  textAlign: 'right',
                                  fontWeight: 700,
                                  color: t.pnl >= 0 ? 'var(--bullish)' : 'var(--bearish)',
                                }}
                              >
                                {t.pnl >= 0 ? '+' : ''}₹{t.pnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                <span style={{ fontSize: '11px', marginLeft: '4px' }}>
                                  ({t.pnlPct >= 0 ? '+' : ''}{t.pnlPct}%)
                                </span>
                              </td>
                              <td>
                                <span className="tb-tag-badge">{t.strategyTag}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

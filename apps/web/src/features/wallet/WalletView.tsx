import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  ArrowUpRight,
  Send,
  Building2,
  TrendingUp,
  ShieldCheck,
  Search,
  CheckCircle2,
  PieChart,
} from 'lucide-react';
import { useEquityStore } from '../../core/store/equityStore';
import './WalletView.css';

export function WalletView() {
  const navigate = useNavigate();
  const {
    instruments,
    holdings,
    totalCash,
    availableMargin,
    usedMargin,
    setFundsModalOpen,
    setWithdrawModalOpen,
    setActiveTicker,
  } = useEquityStore();

  const [hideSmall, setHideSmall] = useState(false);
  const [search, setSearch] = useState('');

  // Holdings list with live values, invested capital, and PnL
  const holdingsList = useMemo(() => {
    return Object.values(holdings)
      .map((h) => {
        const inst = instruments[h.symbol];
        const currentPrice = inst ? inst.price : h.avgBuyPrice;
        const change24h = inst ? inst.change24h : 0;
        const value = h.quantity * currentPrice;
        const invested = h.quantity * h.avgBuyPrice;
        const pnl = value - invested;
        const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;

        return {
          ...h,
          currentPrice,
          change24h,
          value,
          invested,
          pnl,
          pnlPct,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [holdings, instruments]);

  // Aggregate totals
  const summary = useMemo(() => {
    const totalHoldingsValue = holdingsList.reduce((acc, h) => acc + h.value, 0);
    const totalInvested = holdingsList.reduce((acc, h) => acc + h.invested, 0);
    const totalUnrealizedPnl = totalHoldingsValue - totalInvested;
    const totalPnlPct = totalInvested > 0 ? (totalUnrealizedPnl / totalInvested) * 100 : 0;
    const totalAccountValue = totalCash + totalHoldingsValue;

    return {
      totalAccountValue,
      totalHoldingsValue,
      totalInvested,
      totalUnrealizedPnl,
      totalPnlPct,
    };
  }, [holdingsList, totalCash]);

  // Filtered holdings
  const filteredHoldings = useMemo(() => {
    return holdingsList.filter((h) => {
      if (hideSmall && h.value < 20000) return false;
      if (search.trim() !== '') {
        const q = search.toLowerCase();
        return (
          h.name.toLowerCase().includes(q) ||
          h.symbol.toLowerCase().includes(q) ||
          h.ticker.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [holdingsList, hideSmall, search]);

  // Allocation segments
  const allocationSegments = useMemo(() => {
    const total = summary.totalHoldingsValue || 1;
    return holdingsList.map((h) => ({
      name: h.name,
      symbol: h.symbol,
      pct: Number(((h.value / total) * 100).toFixed(1)),
      value: h.value,
      color: h.color,
    }));
  }, [holdingsList, summary.totalHoldingsValue]);

  return (
    <div className="wallet-container">
      {/* 1. Hero Card */}
      <section className="card wallet-hero-card">
        <div className="wallet-hero-header">
          <div className="wallet-hero-left">
            <span className="wallet-hero-label">Total Account & Demat Value</span>
            <div className="wallet-hero-val-row">
              <span className="num wallet-hero-val">
                ₹{summary.totalAccountValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="wallet-hero-ccy">INR</span>
            </div>
            <span className="num wallet-hero-sub">
              Demat Holdings: ₹{summary.totalHoldingsValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} · Available Cash: ₹{availableMargin.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>

          <div className="wallet-hero-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setFundsModalOpen(true)}
            >
              <Plus size={15} /> Add Funds
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setWithdrawModalOpen(true)}
            >
              <ArrowUpRight size={15} /> Payout Withdrawal
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate('/trade')}
            >
              <Send size={14} /> Trade Equities
            </button>
          </div>
        </div>

        {/* 3 Sub-stat Cards */}
        <div className="wallet-sub-stat-grid">
          <div className="wallet-stat-box">
            <div className="wallet-stat-head">
              <span className="wallet-dot-green" />
              <span>Available Margin</span>
            </div>
            <div className="num wallet-stat-number">
              ₹{availableMargin.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>
              Free for Delivery (CNC) & Intraday (MIS)
            </span>
          </div>

          <div className="wallet-stat-box">
            <div className="wallet-stat-head">
              <span className="wallet-dot-orange" />
              <span>Used / Blocked Margin</span>
            </div>
            <div className="num wallet-stat-number">
              ₹{usedMargin.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>
              Committed to active orders & positions
            </span>
          </div>

          <div className="wallet-stat-box">
            <div className="wallet-stat-head">
              <span className="wallet-dot-blue" />
              <span>Demat Holdings Value</span>
            </div>
            <div className="num wallet-stat-number">
              ₹{summary.totalHoldingsValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span style={{ fontSize: '11px', color: summary.totalUnrealizedPnl >= 0 ? 'var(--bullish)' : 'var(--bearish)' }}>
              Overall PnL: {summary.totalUnrealizedPnl >= 0 ? '+' : ''}₹{summary.totalUnrealizedPnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({summary.totalPnlPct.toFixed(2)}%)
            </span>
          </div>
        </div>
      </section>

      {/* 2. Split: Balance History & Allocation */}
      <section className="wallet-split-grid">
        {/* Balance History Area Chart */}
        <div className="card wallet-history-card">
          <div className="wallet-card-head">
            <h3 className="wallet-card-title">Capital & Margin History</h3>
            <p className="wallet-card-sub">Combined Demat portfolio + liquid cash trajectory · Last 12 Months</p>
          </div>

          <div className="wallet-chart-wrapper">
            <div className="wallet-y-axis">
              <span>₹18L</span>
              <span>₹14L</span>
              <span>₹10L</span>
              <span>₹6L</span>
              <span>₹0</span>
            </div>

            <div className="wallet-svg-area">
              <svg viewBox="0 0 600 160" preserveAspectRatio="none" width="100%" height="160">
                <defs>
                  <linearGradient id="equityWalletGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <polygon
                  points="0,160 0,90 50,84 100,78 150,82 200,68 250,62 300,55 350,52 400,45 450,42 500,36 550,30 600,24 600,160"
                  fill="url(#equityWalletGrad)"
                />
                <polyline
                  points="0,90 50,84 100,78 150,82 200,68 250,62 300,55 350,52 400,45 450,42 500,36 550,30 600,24"
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="2.2"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Allocation Bar & Legend */}
        <div className="card wallet-alloc-card">
          <div className="wallet-card-head">
            <h3 className="wallet-card-title">Demat Allocation</h3>
            <p className="wallet-card-sub">{allocationSegments.length} active holdings · Sector diversified</p>
          </div>

          {/* Segmented Horizontal Bar */}
          <div className="wallet-alloc-bar">
            {allocationSegments.map((seg) => (
              <div
                key={seg.symbol}
                style={{
                  width: `${seg.pct}%`,
                  backgroundColor: seg.color,
                  height: '100%',
                }}
                title={`${seg.name}: ${seg.pct}%`}
              />
            ))}
          </div>

          {/* Legend Rows */}
          <div className="wallet-alloc-legend-list">
            {allocationSegments.map((seg) => (
              <div key={seg.symbol} className="wallet-alloc-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="wallet-alloc-dot" style={{ backgroundColor: seg.color }} />
                  <span className="wallet-alloc-name">{seg.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span className="num wallet-alloc-pct">{seg.pct}%</span>
                  <span className="num wallet-alloc-val">₹{seg.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Balances Table */}
      <section className="card wallet-table-card">
        <div className="wallet-table-header">
          <div>
            <h3 className="wallet-card-title">Demat Holdings & Collateral Ledger</h3>
            <p className="wallet-card-sub">Active equity holdings eligible for margin & delivery</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search Demat holdings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  height: '32px',
                  padding: '0 10px 0 28px',
                  fontSize: '12px',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--fg-primary)',
                }}
              />
              <Search
                size={13}
                style={{
                  position: 'absolute',
                  left: '9px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--fg-muted)',
                }}
              />
            </div>

            <button
              type="button"
              className={`btn btn-outline btn-sm ${hideSmall ? 'active' : ''}`}
              onClick={() => setHideSmall(!hideSmall)}
            >
              {hideSmall ? 'Show all' : 'Hide small (< ₹20k)'}
            </button>
          </div>
        </div>

        <div className="wallet-table-scroll">
          <table className="wallet-table">
            <thead>
              <tr>
                <th>Scrip / Instrument</th>
                <th style={{ textAlign: 'right' }}>Demat Qty</th>
                <th style={{ textAlign: 'right' }}>Available</th>
                <th style={{ textAlign: 'right' }}>In Orders</th>
                <th style={{ textAlign: 'right' }}>Avg Price</th>
                <th style={{ textAlign: 'right' }}>LTP</th>
                <th style={{ textAlign: 'right' }}>Current Value</th>
                <th style={{ textAlign: 'right' }}>Unrealized P&L</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHoldings.map((h) => (
                <tr key={h.symbol} className="wallet-table-row">
                  <td>
                    <div className="wallet-coin-cell">
                      <div className="wunder-coin-badge" style={{ backgroundColor: h.color }}>
                        {h.symbol.slice(0, 3)}
                      </div>
                      <div>
                        <div className="wallet-coin-name">{h.name}</div>
                        <div className="wallet-coin-sym">
                          <span className="pill pill-neutral" style={{ fontSize: '10px', padding: '1px 5px', marginRight: '6px' }}>
                            {h.exchange}
                          </span>
                          {h.symbol}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>
                    {h.quantity} shares
                  </td>
                  <td className="num" style={{ textAlign: 'right' }}>
                    {h.available}
                  </td>
                  <td className="num" style={{ textAlign: 'right', color: 'var(--fg-muted)' }}>
                    {h.inOrders}
                  </td>
                  <td className="num" style={{ textAlign: 'right' }}>
                    ₹{h.avgBuyPrice.toFixed(2)}
                  </td>
                  <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>
                    ₹{h.currentPrice.toFixed(2)}
                  </td>
                  <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>
                    ₹{h.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={`pill ${h.pnl >= 0 ? 'pill-bullish' : 'pill-bearish'}`}>
                      {h.pnl >= 0 ? '+' : ''}
                      ₹{h.pnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({h.pnlPct.toFixed(2)}%)
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          setActiveTicker(h.ticker);
                          navigate('/trade');
                        }}
                      >
                        Trade
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

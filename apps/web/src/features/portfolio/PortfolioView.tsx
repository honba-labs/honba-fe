import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Send,
  ChevronRight,
} from 'lucide-react';
import { useEquityStore } from '../../core/store/equityStore';
import './PortfolioView.css';

// 1Y historical equity curve in ₹ Lakhs
const CHART_POINTS = [
  { date: 'Oct 18, 25', val: 1120000, nifty: 1100000 },
  { date: 'Nov 12, 25', val: 1165000, nifty: 1130000 },
  { date: 'Dec 05, 25', val: 1210000, nifty: 1180000 },
  { date: 'Dec 31, 25', val: 1195000, nifty: 1175000 },
  { date: 'Jan 22, 26', val: 1245000, nifty: 1210000 },
  { date: 'Feb 18, 26', val: 1290000, nifty: 1250000 },
  { date: 'Mar 15, 26', val: 1272000, nifty: 1230000 },
  { date: 'Apr 10, 26', val: 1345000, nifty: 1290000 },
  { date: 'May 24, 26', val: 1330000, nifty: 1275000 },
  { date: 'Jun 19, 26', val: 1395000, nifty: 1340000 },
  { date: 'Jul 15, 26', val: 1420000, nifty: 1360000 },
  { date: 'Aug 06, 26', val: 1450000, nifty: 1390000 },
  { date: 'Sep 12, 26', val: 1442000, nifty: 1385000 },
  { date: 'Oct 18, 26', val: 1482610, nifty: 1410000 },
];

export function PortfolioView() {
  const navigate = useNavigate();
  const {
    instruments,
    holdings,
    availableMargin,
    usedMargin,
    totalCash,
    openOrders,
    setFundsModalOpen,
    setWithdrawModalOpen,
  } = useEquityStore();

  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '1Y' | 'All'>('1Y');
  const [chartMode, setChartMode] = useState<'line' | 'candles'>('line');

  // Calculate live portfolio value and unrealised PnL
  const portfolioSummary = useMemo(() => {
    let totalStockValue = 0;
    let totalCostBasis = 0;

    Object.values(holdings).forEach((h) => {
      const inst = instruments[h.symbol];
      const price = inst ? inst.price : h.avgBuyPrice;
      const val = h.quantity * price;
      totalStockValue += val;
      totalCostBasis += h.quantity * h.avgBuyPrice;
    });

    const totalPortfolioValue = totalStockValue + totalCash;
    const unrealisedPnl = totalStockValue - totalCostBasis;
    const unrealisedPct = totalCostBasis > 0 ? (unrealisedPnl / totalCostBasis) * 100 : 0;

    return {
      totalPortfolioValue,
      totalStockValue,
      unrealisedPnl,
      unrealisedPct,
    };
  }, [holdings, instruments, totalCash]);

  // Holdings list sorted by total value
  const holdingsList = useMemo(() => {
    return Object.values(holdings)
      .map((h) => {
        const inst = instruments[h.symbol];
        const currentPrice = inst ? inst.price : h.avgBuyPrice;
        const value = h.quantity * currentPrice;
        const pnl = (currentPrice - h.avgBuyPrice) * h.quantity;
        return {
          ...h,
          currentPrice,
          change24h: inst ? inst.change24h : 0,
          sector: inst?.sector || 'Equity',
          value,
          pnl,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [holdings, instruments]);

  // Sector & Asset Allocation
  const allocationSegments = useMemo(() => {
    const total = portfolioSummary.totalPortfolioValue || 1;
    const segs = holdingsList.map((h) => ({
      name: h.name,
      symbol: h.symbol,
      value: h.value,
      pct: Number(((h.value / total) * 100).toFixed(1)),
      color: h.color,
    }));

    // Add Cash segment
    segs.push({
      name: 'Cash Margin',
      symbol: 'CASH',
      value: totalCash,
      pct: Number(((totalCash / total) * 100).toFixed(1)),
      color: 'var(--primary)',
    });

    return segs.sort((a, b) => b.value - a.value);
  }, [holdingsList, portfolioSummary.totalPortfolioValue, totalCash]);

  // SVG Chart points calculation
  const svgWidth = 900;
  const svgHeight = 260;
  const minVal = 1000000;
  const maxVal = 1550000;

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

  return (
    <div className="portfolio-container">
      {/* 1. Large Portfolio Hero Card */}
      <section className="card portfolio-hero-card">
        <div className="portfolio-hero-header">
          <div className="portfolio-hero-left">
            <span className="portfolio-hero-label">Total Equity Portfolio Value</span>
            <div className="portfolio-hero-value-row">
              <span className="num portfolio-hero-value">
                ₹{portfolioSummary.totalPortfolioValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="portfolio-hero-ccy">INR</span>
            </div>
            <div className="portfolio-hero-pill-row">
              <span className="pill pill-bullish">
                +₹31,420.00
                <TrendingUp size={12} style={{ margin: '0 2px' }} />
                +2.16%
              </span>
              <span className="portfolio-hero-time-label">1D Return</span>
            </div>
          </div>

          <div className="portfolio-hero-actions">
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
              <ArrowUpRight size={15} /> Withdraw
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate('/trade')}
            >
              <Send size={14} /> Trade Stocks
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
              <span>Honba Equity Portfolio</span>
            </div>
            <div className="portfolio-legend-item">
              <span className="portfolio-legend-dot dot-benchmark" />
              <span>NIFTY 50 Benchmark</span>
            </div>
            <div className="portfolio-mode-toggle">
              <button
                type="button"
                className={`portfolio-mode-btn ${chartMode === 'line' ? 'active' : ''}`}
                onClick={() => setChartMode('line')}
              >
                Line
              </button>
              <button
                type="button"
                className={`portfolio-mode-btn ${chartMode === 'candles' ? 'active' : ''}`}
                onClick={() => setChartMode('candles')}
              >
                Candles
              </button>
            </div>
          </div>
        </div>

        {/* SVG Equity Area Chart */}
        <div className="portfolio-chart-area">
          <div className="portfolio-y-axis">
            <span>₹15L</span>
            <span>₹13.5L</span>
            <span>₹12L</span>
            <span>₹10.5L</span>
            <span>0</span>
          </div>

          <div className="portfolio-svg-wrapper">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none" className="portfolio-svg">
              <defs>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="0" x2={svgWidth} y2="0" stroke="var(--chart-grid)" strokeDasharray="3 3" />
              <line x1="0" y1="65" x2={svgWidth} y2="65" stroke="var(--chart-grid)" strokeDasharray="3 3" />
              <line x1="0" y1="130" x2={svgWidth} y2="130" stroke="var(--chart-grid)" strokeDasharray="3 3" />
              <line x1="0" y1="195" x2={svgWidth} y2="195" stroke="var(--chart-grid)" strokeDasharray="3 3" />

              {/* Area Gradient */}
              <polygon points={areaPointsString} fill="url(#equityGrad)" />

              {/* NIFTY 50 Benchmark Line */}
              <polyline
                points={benchmarkPointsString}
                fill="none"
                stroke="var(--chart-benchmark)"
                strokeWidth="1.5"
                opacity="0.6"
              />

              {/* Main Equity Curve */}
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

        <div className="portfolio-x-axis">
          <span>Oct 18, 25</span>
          <span>Dec 31, 25</span>
          <span>Mar 15, 26</span>
          <span>May 24, 26</span>
          <span>Aug 6, 26</span>
          <span>Oct 18, 26</span>
        </div>
      </section>

      {/* 2. 4 Stat KPI Cards */}
      <section className="portfolio-kpi-grid">
        <div className="card kpi-card">
          <span className="kpi-label">Unrealised P&L</span>
          <div className="num kpi-val color-bullish">
            +₹{portfolioSummary.unrealisedPnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="kpi-sub">vs. cost basis (+{portfolioSummary.unrealisedPct.toFixed(2)}%)</span>
        </div>

        <div className="card kpi-card">
          <span className="kpi-label">Realised P&L (Booked)</span>
          <div className="num kpi-val color-bullish">+₹44,520.00</div>
          <span className="kpi-sub">all closed delivery & intraday trades</span>
        </div>

        <div className="card kpi-card">
          <span className="kpi-label">Available Cash Margin</span>
          <div className="num kpi-val">
            ₹{availableMargin.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="kpi-sub">Used in orders ₹{usedMargin.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>

        <div className="card kpi-card">
          <span className="kpi-label">Active Orders</span>
          <div className="num kpi-val">{openOrders.length}</div>
          <span className="kpi-link" onClick={() => navigate('/trade')}>
            Manage orders <ChevronRight size={12} />
          </span>
        </div>
      </section>

      {/* 3. Top Equities Overview Strip */}
      <section className="portfolio-strip-section">
        <div className="portfolio-section-header">
          <h3 className="portfolio-section-title">NIFTY 50 Bluechip Movers</h3>
          <span className="portfolio-link-viewall" onClick={() => navigate('/markets')}>
            View all stocks <ArrowRight size={14} />
          </span>
        </div>

        <div className="portfolio-asset-row">
          {Object.values(instruments)
            .slice(0, 6)
            .map((inst) => (
              <div
                key={inst.symbol}
                className="card portfolio-asset-pill"
                onClick={() => {
                  useEquityStore.getState().setActiveTicker(inst.ticker);
                  navigate('/trade');
                }}
              >
                <div className="portfolio-pill-top">
                  <div className="portfolio-coin-circle" style={{ backgroundColor: inst.color }}>
                    {inst.symbol.slice(0, 3)}
                  </div>
                  <span className="portfolio-pill-name">{inst.symbol}</span>
                  <span className="portfolio-pill-sym">· {inst.exchange}</span>
                </div>
                <div className="portfolio-pill-bottom">
                  <span className="num portfolio-pill-price">
                    {inst.currency === 'INR' ? '₹' : '$'}
                    {inst.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className={`pill ${inst.change24h >= 0 ? 'pill-bullish' : 'pill-bearish'}`}>
                    {inst.change24h >= 0 ? '↗ +' : '↘ '}
                    {inst.change24h}%
                  </span>
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* 4. Split Grid: Stock Holdings Table & Sector Allocation */}
      <section className="portfolio-split-grid">
        {/* Holdings Table */}
        <div className="card portfolio-holdings-card">
          <div className="portfolio-card-head">
            <div>
              <h3 className="portfolio-card-title">Demat Holdings</h3>
              <p className="portfolio-card-subtitle">CNC long-term equity delivery holdings</p>
            </div>
            <button
              type="button"
              className="portfolio-link-action"
              onClick={() => navigate('/wallet')}
            >
              Funds & Limits <ArrowRight size={14} />
            </button>
          </div>

          <div className="portfolio-table-wrapper">
            <table className="portfolio-table">
              <thead>
                <tr>
                  <th>Instrument</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Avg Buy</th>
                  <th style={{ textAlign: 'right' }}>LTP</th>
                  <th style={{ textAlign: 'right' }}>1D %</th>
                  <th style={{ textAlign: 'right' }}>Current Value</th>
                  <th style={{ textAlign: 'right' }}>Unrealised P&L</th>
                </tr>
              </thead>
              <tbody>
                {holdingsList.map((h) => (
                  <tr
                    key={h.symbol}
                    className="portfolio-table-row"
                    onClick={() => {
                      useEquityStore.getState().setActiveTicker(h.ticker);
                      navigate('/trade');
                    }}
                  >
                    <td>
                      <div className="portfolio-table-coin-cell">
                        <div className="wunder-coin-badge" style={{ backgroundColor: h.color }}>
                          {h.symbol.slice(0, 3)}
                        </div>
                        <div>
                          <div className="portfolio-coin-cell-name">{h.name}</div>
                          <div className="portfolio-coin-cell-sym">{h.ticker}</div>
                        </div>
                      </div>
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
                    <td style={{ textAlign: 'right' }}>
                      <span className={`pill ${h.change24h >= 0 ? 'pill-bullish' : 'pill-bearish'}`}>
                        {h.change24h >= 0 ? '+' : ''}
                        {h.change24h}%
                      </span>
                    </td>
                    <td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
                      ₹{h.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td
                      className="num"
                      style={{
                        textAlign: 'right',
                        fontWeight: 600,
                        color: h.pnl >= 0 ? 'var(--bullish)' : 'var(--bearish)',
                      }}
                    >
                      {h.pnl >= 0 ? '+' : ''}
                      ₹{h.pnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Allocation Donut Card */}
        <div className="card portfolio-allocation-card">
          <div className="portfolio-card-head">
            <div>
              <h3 className="portfolio-card-title">Portfolio Allocation</h3>
              <p className="portfolio-card-subtitle">{allocationSegments.length} assets · simulated portfolio</p>
            </div>
          </div>

          <div className="portfolio-donut-section">
            <div className="portfolio-donut-wrapper">
              <svg viewBox="0 0 160 160" width="160" height="160">
                <circle cx="80" cy="80" r="62" fill="none" stroke="var(--border)" strokeWidth="18" />
                {allocationSegments.map((seg, i) => {
                  const circumference = 2 * Math.PI * 62;
                  const strokeDasharray = `${(seg.pct / 100) * circumference} ${circumference}`;
                  let offset = 0;
                  for (let j = 0; j < i; j++) {
                    offset += (allocationSegments[j].pct / 100) * circumference;
                  }
                  return (
                    <circle
                      key={seg.symbol}
                      cx="80"
                      cy="80"
                      r="62"
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="18"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={-offset}
                      style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />
                  );
                })}
              </svg>
              <div className="portfolio-donut-center">
                <span className="portfolio-donut-total-lbl">Total Value</span>
                <span className="num portfolio-donut-total-val">
                  ₹{(portfolioSummary.totalPortfolioValue / 100000).toFixed(1)}L
                </span>
              </div>
            </div>

            {/* Allocation Legend */}
            <div className="portfolio-allocation-legend">
              {allocationSegments.map((seg) => (
                <div key={seg.symbol} className="portfolio-allocation-legend-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="portfolio-alloc-dot" style={{ backgroundColor: seg.color }} />
                    <span className="portfolio-alloc-name">{seg.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="num portfolio-alloc-pct">{seg.pct}%</span>
                    <span className="num portfolio-alloc-val">
                      ₹{seg.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

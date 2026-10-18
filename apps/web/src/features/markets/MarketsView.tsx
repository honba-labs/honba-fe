import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Download,
  Star,
  Search,
  ArrowRight,
} from 'lucide-react';
import { useEquityStore, EquityInstrument } from '../../core/store/equityStore';
import './MarketsView.css';

// Mini SVG sparkline generator
function Sparkline({ data, isPositive }: { data: number[]; isPositive: boolean }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 110;
  const height = 30;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={points}
        fill="none"
        stroke={isPositive ? 'var(--bullish)' : 'var(--bearish)'}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Market Breadth Semicircular Gauge
function MarketBreadthGauge({ score = 68 }: { score: number }) {
  const cx = 100;
  const cy = 95;
  const needleAngle = -90 + (score / 100) * 180;

  return (
    <div className="fear-greed-gauge-container">
      <svg width="200" height="110" viewBox="0 0 200 110">
        <path d="M 20 95 A 80 80 0 0 1 43.4 38.4" fill="none" stroke="#ef4444" strokeWidth="16" strokeLinecap="round" />
        <path d="M 49 33 A 80 80 0 0 1 85 16.4" fill="none" stroke="#f97316" strokeWidth="16" />
        <path d="M 91 15.3 A 80 80 0 0 1 109 15.3" fill="none" stroke="#eab308" strokeWidth="16" />
        <path d="M 115 16.4 A 80 80 0 0 1 151 33" fill="none" stroke="#10b981" strokeWidth="16" />
        <path d="M 156.6 38.4 A 80 80 0 0 1 180 95" fill="none" stroke="#00c076" strokeWidth="16" strokeLinecap="round" />

        <g transform={`rotate(${needleAngle} ${cx} ${cy})`}>
          <line x1={cx} y1={cy} x2={cx} y2={cy - 65} stroke="var(--fg-primary)" strokeWidth="3" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="6" fill="var(--fg-primary)" />
        </g>
      </svg>

      <div className="fear-greed-score-wrapper">
        <span className="num fear-greed-score">{score}</span>
        <span className="fear-greed-status">Bullish Breadth</span>
      </div>

      <div className="fear-greed-legend">
        <span>Declines: 680</span>
        <span>Advances: 1,420</span>
      </div>
    </div>
  );
}

export function MarketsView() {
  const navigate = useNavigate();
  const { instruments, toggleWatchlist, setActiveTicker } = useEquityStore();

  const [filterTab, setFilterTab] = useState<'all' | 'nifty' | 'tech' | 'banks' | 'auto' | 'us'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const instrumentsList = Object.values(instruments);

  const filtered = useMemo(() => {
    return instrumentsList.filter((a) => {
      if (filterTab === 'nifty' && a.exchange !== 'NSE') return false;
      if (filterTab === 'tech' && !a.sector.includes('IT')) return false;
      if (filterTab === 'banks' && !a.sector.includes('Bank')) return false;
      if (filterTab === 'auto' && !a.sector.includes('Auto')) return false;
      if (filterTab === 'us' && a.exchange !== 'NASDAQ' && a.exchange !== 'NYSE') return false;

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return (
          a.name.toLowerCase().includes(q) ||
          a.symbol.toLowerCase().includes(q) ||
          a.ticker.toLowerCase().includes(q) ||
          a.sector.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [instrumentsList, filterTab, searchQuery]);

  const trendingStocks = [
    { ...instruments.RELIANCE, sparkline: [2860, 2880, 2910, 2895, 2925, 2935, 2940.5] },
    { ...instruments.TATAMOTORS, sparkline: [890, 910, 935, 925, 945, 955, 960.2] },
    { ...instruments.INFY, sparkline: [1820, 1845, 1880, 1865, 1895, 1910, 1920.8] },
    { ...instruments.TCS, sparkline: [4010, 4050, 4110, 4090, 4140, 4160, 4180.25] },
    { ...instruments.HDFCBANK, sparkline: [1650, 1662, 1675, 1668, 1679, 1682, 1685.4] },
  ];

  return (
    <div className="markets-container">
      {/* 1. Header Banner */}
      <div className="markets-header-banner">
        <div>
          <h2 className="markets-title">Equities Markets & Indices</h2>
          <p className="markets-subtitle">
            NSE / BSE & Global Equities live data feed. Simulated execution against market depth.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => alert('Exported Equities market scanner CSV.')}
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* 2. Top Metric Row: NIFTY 50, Advance-Decline, Trending Equities */}
      <section className="markets-metric-grid">
        {/* NIFTY 50 Index Card */}
        <div className="card markets-cap-card">
          <div className="markets-cap-head">
            <span className="markets-card-title">NIFTY 50 Index</span>
            <span className="markets-card-sub">National Stock Exchange benchmark</span>
          </div>
          <div className="markets-cap-val-row">
            <span className="num markets-cap-val">24,854.20</span>
            <span className="pill pill-bullish">
              <TrendingUp size={12} /> +0.62%
            </span>
          </div>
          <div className="markets-cap-chart">
            <svg viewBox="0 0 320 80" preserveAspectRatio="none" width="100%" height="80">
              <defs>
                <linearGradient id="niftyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <polygon
                points="0,80 0,55 40,52 80,48 120,49 160,42 200,43 240,38 280,36 320,32 320,80"
                fill="url(#niftyGrad)"
              />
              <polyline
                points="0,55 40,52 80,48 120,49 160,42 200,43 240,38 280,36 320,32"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>

        {/* Market Breadth Card */}
        <div className="card markets-fear-card">
          <div className="markets-cap-head">
            <span className="markets-card-title">Market Breadth (A/D)</span>
            <span className="markets-card-sub">NSE 500 Advance / Decline sentiment</span>
          </div>
          <MarketBreadthGauge score={68} />
        </div>

        {/* Trending Stocks Card */}
        <div className="card markets-trending-card">
          <div className="markets-card-header-row">
            <span className="markets-card-title">Active Volume Leaders</span>
            <span className="markets-viewall-btn" onClick={() => setFilterTab('all')}>
              View all
            </span>
          </div>

          <div className="markets-trending-list">
            <div className="markets-trending-head">
              <span>Stock</span>
              <span style={{ textAlign: 'right' }}>LTP</span>
              <span style={{ textAlign: 'right' }}>7 days</span>
            </div>
            {trendingStocks.map((stock) => (
              <div
                key={stock.symbol}
                className="markets-trending-row"
                onClick={() => {
                  setActiveTicker(stock.ticker);
                  navigate('/trade');
                }}
              >
                <div className="markets-trending-coin">
                  <div className="wunder-coin-badge" style={{ backgroundColor: stock.color }}>
                    {stock.symbol.slice(0, 3)}
                  </div>
                  <div>
                    <span className="markets-trending-sym">{stock.symbol}</span>
                    <span style={{ fontSize: '10px', color: 'var(--fg-muted)', display: 'block' }}>{stock.exchange}</span>
                  </div>
                </div>
                <div className="num markets-trending-price">
                  ₹{stock.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="markets-trending-spark">
                  <Sparkline data={stock.sparkline} isPositive={stock.change7d >= 0} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. NIFTY 50 Heavyweights Strip */}
      <section className="markets-majors-section">
        <div className="markets-majors-head">
          <h3 className="markets-section-title">NIFTY 50 Heavyweights</h3>
          <span className="markets-viewall-link" onClick={() => setFilterTab('all')}>
            View all equities <ArrowRight size={13} />
          </span>
        </div>
        <div className="markets-majors-grid">
          {instrumentsList.slice(0, 6).map((inst) => (
            <div
              key={inst.symbol}
              className="card markets-major-card"
              onClick={() => {
                setActiveTicker(inst.ticker);
                navigate('/trade');
              }}
            >
              <div className="markets-major-top">
                <div className="wunder-coin-badge" style={{ backgroundColor: inst.color }}>
                  {inst.symbol.slice(0, 3)}
                </div>
                <span className="markets-major-name">{inst.symbol}</span>
                <span className="markets-major-sym">· {inst.exchange}</span>
              </div>
              <div className="markets-major-bottom">
                <span className="num markets-major-price">
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

      {/* 4. Full Equities Screener Table */}
      <section className="card markets-table-section">
        <div className="markets-table-header">
          <div className="markets-table-filter-pills">
            {[
              { id: 'all', label: 'All Stocks' },
              { id: 'nifty', label: 'NIFTY 50' },
              { id: 'tech', label: 'IT & Software' },
              { id: 'banks', label: 'Banking & Finance' },
              { id: 'auto', label: 'Automobile' },
              { id: 'us', label: 'US Equities' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`markets-filter-pill ${filterTab === tab.id ? 'active' : ''}`}
                onClick={() => setFilterTab(tab.id as any)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="markets-table-search">
            <Search size={14} color="var(--fg-muted)" />
            <input
              type="text"
              placeholder="Search stock by name, ticker, sector..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="markets-search-input"
            />
          </div>
        </div>

        <div className="markets-table-scroll">
          <table className="markets-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>Company & Ticker</th>
                <th style={{ textAlign: 'right' }}>LTP</th>
                <th style={{ textAlign: 'right' }}>1D %</th>
                <th style={{ textAlign: 'right' }}>VWAP</th>
                <th style={{ textAlign: 'right' }}>24h High / Low</th>
                <th style={{ textAlign: 'center' }}>Last 7 Days</th>
                <th style={{ textAlign: 'right' }}>Mkt Cap (₹ Cr)</th>
                <th style={{ textAlign: 'right' }}>Volume (Shares)</th>
                <th style={{ textAlign: 'right' }}>P/E Ratio</th>
                <th style={{ textAlign: 'center', width: '80px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inst, index) => (
                <tr key={inst.symbol} className="markets-table-row">
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWatchlist(inst.symbol);
                        }}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <Star
                          size={13}
                          color={inst.isWatchlist ? '#f59e0b' : 'var(--fg-muted)'}
                          fill={inst.isWatchlist ? '#f59e0b' : 'transparent'}
                        />
                      </button>
                      <span className="num" style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>
                        {index + 1}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="markets-table-coin-cell">
                      <div className="wunder-coin-badge" style={{ backgroundColor: inst.color }}>
                        {inst.symbol.slice(0, 3)}
                      </div>
                      <div>
                        <div className="markets-coin-name">{inst.name}</div>
                        <div className="markets-coin-sym">{inst.ticker} · {inst.sector}</div>
                      </div>
                    </div>
                  </td>
                  <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>
                    {inst.currency === 'INR' ? '₹' : '$'}
                    {inst.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td
                    className="num"
                    style={{
                      textAlign: 'right',
                      color: inst.change24h >= 0 ? 'var(--bullish)' : 'var(--bearish)',
                      fontWeight: 600,
                    }}
                  >
                    {inst.change24h >= 0 ? '+' : ''}
                    {inst.change24h}%
                  </td>
                  <td className="num" style={{ textAlign: 'right', color: 'var(--fg-secondary)' }}>
                    ₹{inst.vwap.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="num" style={{ textAlign: 'right', fontSize: '11px' }}>
                    <div style={{ color: 'var(--bullish)' }}>H: ₹{inst.high24h.toLocaleString()}</div>
                    <div style={{ color: 'var(--bearish)' }}>L: ₹{inst.low24h.toLocaleString()}</div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <Sparkline data={inst.sparkline} isPositive={inst.change7d >= 0} />
                  </td>
                  <td className="num" style={{ textAlign: 'right' }}>
                    ₹{(inst.marketCapCr / 1000).toFixed(1)}K Cr
                  </td>
                  <td className="num" style={{ textAlign: 'right' }}>
                    <div>{(inst.volShares / 1e6).toFixed(2)}M</div>
                    <div style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>₹{inst.turnoverCr} Cr</div>
                  </td>
                  <td className="num" style={{ textAlign: 'right', color: 'var(--fg-secondary)' }}>
                    {inst.peRatio}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        setActiveTicker(inst.ticker);
                        navigate('/trade');
                      }}
                    >
                      Trade
                    </button>
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

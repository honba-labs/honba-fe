import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';

import './instrument.css';

import { themeEngine } from '../../core/theme-engine';
import { dataLayer, InstrumentDetailResponse } from '../../core/data-layer';
import { Instrument, CandleData, AssetType } from '../../core/market-data';
import { TechnicalsGauge } from '../../components/ui/technicals-gauge';
import { COUNTRY_FLAGS, getLogoForSymbol } from '../../core/columns';
import {
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Search,
  Bookmark,
  BookmarkCheck,
  Share2,
  Play,
  Layers,
  PieChart,
  BarChart3,
  Calendar,
  DollarSign,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  Cpu,
  FlaskConical,
  Code2,
  Activity,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Info,
} from 'lucide-react';
import {
  InstrumentChartCard,
  SuiteActionGroup,
  SymbolBreadcrumbs,
  ValuationStatsGrid,
  DeliveryStatsBar,
} from '../../components/domain';

export const InstrumentPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const routeParams = useParams<{ symbol?: string }>();
  const navigate = useNavigate();

  // Read initial symbol from URL param, query or fallback
  const getUrlSymbol = () => {
    return (routeParams.symbol || searchParams.get('symbol') || 'RELIANCE').toUpperCase();
  };

  const [activeSymbol, setActiveSymbol] = useState<string>(getUrlSymbol);
  const [detailData, setDetailData] = useState<InstrumentDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [chartType, setChartType] = useState<'candles' | 'area'>('candles');
  const [timeframe, setTimeframe] = useState<string>('1M');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [priceFlash, setPriceFlash] = useState<'bullish' | 'bearish' | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [lotsCount, setLotsCount] = useState<number>(1);

  // Initialize theme
  useEffect(() => {
    themeEngine.applyToDOM();
  }, []);

  // Sync state if URL query/param changes externally
  useEffect(() => {
    const sym = (routeParams.symbol || searchParams.get('symbol') || '').toUpperCase();
    if (sym && sym !== activeSymbol) {
      setActiveSymbol(sym);
    }
  }, [routeParams.symbol, searchParams, activeSymbol]);

  // Fetch instrument details whenever activeSymbol changes
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    dataLayer.fetchInstrumentDetail(activeSymbol).then((data) => {
      if (isMounted) {
        if (data) {
          setDetailData(data);
        }
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [activeSymbol]);

  // Listen to live ticks from dataLayer / backend WebSocket
  useEffect(() => {
    const unsub = dataLayer.onTick((tick) => {
      if (tick.symbol.toUpperCase() === activeSymbol.toUpperCase()) {
        setDetailData((prev) => {
          if (!prev) return prev;
          const oldPrice = prev.instrument.price;
          const flash = tick.price >= oldPrice ? 'bullish' : 'bearish';
          setPriceFlash(flash);
          setTimeout(() => setPriceFlash(null), 600);

          return {
            ...prev,
            instrument: {
              ...prev.instrument,
              price: tick.price,
              change: tick.change,
              changePercent: tick.changePercent,
              volume: tick.volume !== undefined ? tick.volume : prev.instrument.volume,
            },
          };
        });
      }
    });

    return () => unsub();
  }, [activeSymbol]);

  const allInstruments = dataLayer.getAllInstruments();

  // Search filtered results for quick picker
  const filteredSearchList = useMemo(() => {
    if (!searchQuery.trim() && selectedCategory === 'all') return [];
    const q = searchQuery.toLowerCase().trim();
    return allInstruments
      .filter((inst) => {
        if (selectedCategory !== 'all') {
          if (selectedCategory === 'stocks' && inst.assetType !== 'stocks' && inst.assetType !== undefined) return false;
          if (selectedCategory !== 'stocks' && inst.assetType !== selectedCategory) return false;
        }
        if (!q) return true;
        return (
          inst.symbol.toLowerCase().includes(q) ||
          inst.name.toLowerCase().includes(q) ||
          inst.sector.toLowerCase().includes(q)
        );
      })
      .slice(0, 10);
  }, [allInstruments, searchQuery, selectedCategory]);

  const inst = detailData?.instrument || dataLayer.getInstrument(activeSymbol) || allInstruments[0];
  const market = dataLayer.getCurrentMarketInfo();
  const isUp = inst ? inst.changePercent >= 0 : true;
  const isWatchlisted = inst ? dataLayer.isWatchlisted(inst.symbol) : false;

  const handleSelectSymbol = (sym: string) => {
    const upper = sym.toUpperCase();
    setActiveSymbol(upper);
    setSearchQuery('');
    setSearchParams({ symbol: upper });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Format helpers
  const fmt = (n: number | undefined | null, decimals = 2) => {
    if (n === undefined || n === null || isNaN(n)) return '—';
    return n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const fmtCompact = (n: number | undefined | null) => {
    if (n === undefined || n === null || isNaN(n)) return '—';
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
    return `₹${n.toFixed(0)}`;
  };




  const [peerSearchQuery, setPeerSearchQuery] = useState<string>('');

  // Enriched peers with comprehensive ratios and sector details
  const enrichedPeers = useMemo(() => {
    const rawPeers = detailData?.peers || [];
    return rawPeers.map((p, idx) => {
      const fullMatch = allInstruments.find((i) => i.symbol.toUpperCase() === p.symbol.toUpperCase());
      return {
        rank: idx + 1,
        symbol: p.symbol,
        name: p.name || fullMatch?.name || p.symbol,
        price: p.price || fullMatch?.price || 0,
        changePercent: p.changePercent !== undefined ? p.changePercent : (fullMatch?.changePercent ?? 0),
        marketCap: p.marketCap || fullMatch?.marketCap || 0,
        pe: p.pe || fullMatch?.pe || 22.4,
        pb: fullMatch?.pb || 3.4,
        roe: fullMatch?.roe || 16.8,
        roce: fullMatch?.roce || 19.5,
        dividendYield: fullMatch?.dividendYield ?? 1.2,
        perf1M: fullMatch?.perf1M ?? Number((p.changePercent * 2.8).toFixed(1)),
        perf1Y: fullMatch?.perf1Y ?? 18.4,
        technicalRating: fullMatch?.technicalRating || 'Buy',
        sector: fullMatch?.sector || inst?.sector || '',
        industry: fullMatch?.industry || inst?.industry || '',
      };
    });
  }, [detailData?.peers, allInstruments, inst]);

  const filteredPeers = useMemo(() => {
    if (!peerSearchQuery.trim()) return enrichedPeers;
    const q = peerSearchQuery.toLowerCase().trim();
    return enrichedPeers.filter(
      (p) =>
        p.symbol.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.sector.toLowerCase().includes(q)
    );
  }, [enrichedPeers, peerSearchQuery]);

  const sectorMedianPe = useMemo(() => {
    if (!enrichedPeers.length) return 24.5;
    const sorted = [...enrichedPeers].map((p) => p.pe).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] || 24.5;
  }, [enrichedPeers]);

  const sectorMedianRoe = useMemo(() => {
    if (!enrichedPeers.length) return 16.2;
    const sorted = [...enrichedPeers].map((p) => p.roe).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] || 16.2;
  }, [enrichedPeers]);

  const maData = useMemo(() => {
    if (!inst) return [];
    const p = inst.price;
    const sma20 = inst.sma20 || p * 0.985;
    const sma50 = inst.sma50 || p * 0.962;
    const sma100 = (sma50 + (inst.sma200 || p * 0.91)) / 2;
    const sma200 = inst.sma200 || p * 0.91;
    const ema20 = p * 0.99;
    const ema50 = p * 0.97;

    return [
      { name: 'SMA 20', value: sma20, type: 'Simple', dist: ((p - sma20) / sma20) * 100, signal: p > sma20 ? 'Bullish' : 'Bearish' },
      { name: 'SMA 50', value: sma50, type: 'Simple', dist: ((p - sma50) / sma50) * 100, signal: p > sma50 ? 'Bullish' : 'Bearish' },
      { name: 'SMA 100', value: sma100, type: 'Simple', dist: ((p - sma100) / sma100) * 100, signal: p > sma100 ? 'Bullish' : 'Bearish' },
      { name: 'SMA 200', value: sma200, type: 'Simple', dist: ((p - sma200) / sma200) * 100, signal: p > sma200 ? 'Bullish' : 'Bearish' },
      { name: 'EMA 20', value: ema20, type: 'Exponential', dist: ((p - ema20) / ema20) * 100, signal: p > ema20 ? 'Bullish' : 'Bearish' },
      { name: 'EMA 50', value: ema50, type: 'Exponential', dist: ((p - ema50) / ema50) * 100, signal: p > ema50 ? 'Bullish' : 'Bearish' },
    ];
  }, [inst]);

  const pivotPoints = useMemo(() => {
    if (!inst) return null;
    const high = inst.high52 || inst.price * 1.15;
    const low = inst.low52 || inst.price * 0.85;
    const close = inst.price;
    const pp = (high + low + close) / 3;
    const r1 = 2 * pp - low;
    const s1 = 2 * pp - high;
    const r2 = pp + (high - low);
    const s2 = pp - (high - low);
    const r3 = high + 2 * (pp - low);
    const s3 = low - 2 * (high - pp);

    return { pp, r1, s1, r2, s2, r3, s3 };
  }, [inst]);

  // Determine tabs based on Asset Type
  const tabs = useMemo(() => {
    if (!inst) return ['overview'];
    const type = inst.assetType || 'stocks';
    if (type === 'index') {
      return ['overview', 'constituents', 'sectors', 'analytics'];
    }
    if (type === 'mf') {
      return ['overview', 'holdings', 'allocation', 'returns', 'facts'];
    }
    if (type === 'etf') {
      return ['overview', 'profile', 'holdings', 'technicals', 'performance'];
    }
    if (type === 'bonds') {
      return ['overview', 'yields', 'credit', 'profile'];
    }
    if (type === 'ipo') {
      return ['overview', 'gmp', 'subscription', 'timeline', 'calculator'];
    }
    return ['overview', 'financials', 'technicals', 'delivery', 'shareholding', 'peers'];
  }, [inst]);

  // Adjust activeTab if invalid for current asset type
  useEffect(() => {
    if (!tabs.includes(activeTab)) {
      setActiveTab('overview');
    }
  }, [tabs, activeTab]);


  return (
    <div className="inst-page-container">
      {/* Category Switcher & Search Bar */}
      <div className="inst-top-toolbar">
        <div className="inst-category-pills">
          {[
            { id: 'all', label: 'All Assets' },
            { id: 'stocks', label: 'Equities (3,270+)' },
            { id: 'etf', label: 'ETFs' },
            { id: 'bonds', label: 'Bonds & Gilts' },
            { id: 'index', label: 'Indices' },
            { id: 'mf', label: 'Mutual Funds' },
            { id: 'ipo', label: 'IPOs & Listings' },
          ].map((cat) => (
            <button
              key={cat.id}
              className={`inst-cat-btn ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Real-time Ticker Search */}
        <div className="inst-search-wrapper">
          <Search size={14} className="inst-search-icon" />
          <input
            type="text"
            className="inst-search-input"
            placeholder="Search any ticker or company (e.g. RELIANCE, NIFTY50, PPFAS, SWIGGY)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {filteredSearchList.length > 0 && (
            <div className="inst-search-results-dropdown">
              {filteredSearchList.map((item) => (
                <div
                  key={item.symbol}
                  className="inst-search-item"
                  onClick={() => handleSelectSymbol(item.symbol)}
                >
                  <div className="inst-search-item-left">
                    <span className="inst-search-item-ticker">{item.symbol}</span>
                    <span className="inst-search-item-name">{item.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`inst-type-badge badge-${item.assetType || 'equity'}`}>
                      {item.assetType || 'EQUITY'}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-family-mono)',
                        fontSize: 12,
                        fontWeight: 600,
                        color: item.changePercent >= 0 ? 'var(--bullish)' : 'var(--bearish)',
                      }}
                    >
                      ₹{fmt(item.price)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Navigation Chips */}
      <div className="inst-quick-chips">
        <span className="inst-quick-chip-label">Quick Jump:</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>Equities:</span>
        {['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'TATAMOTORS', 'ITC'].map((s) => (
          <button
            key={s}
            className={`inst-chip-btn ${activeSymbol === s ? 'active' : ''}`}
            onClick={() => handleSelectSymbol(s)}
          >
            {s}
          </button>
        ))}
        <span style={{ color: 'var(--text-muted)', fontSize: 10, marginLeft: 8 }}>ETFs:</span>
        {['NIFTYBEES', 'BANKBEES', 'GOLDBEES', 'SILVERBEES', 'CPSEETF'].map((s) => (
          <button
            key={s}
            className={`inst-chip-btn ${activeSymbol === s ? 'active' : ''}`}
            onClick={() => handleSelectSymbol(s)}
          >
            {s}
          </button>
        ))}
        <span style={{ color: 'var(--text-muted)', fontSize: 10, marginLeft: 8 }}>Bonds:</span>
        {['GS2034', 'GS2029', 'GS2038', 'REC2030', 'PFC2032'].map((s) => (
          <button
            key={s}
            className={`inst-chip-btn ${activeSymbol === s ? 'active' : ''}`}
            onClick={() => handleSelectSymbol(s)}
          >
            {s}
          </button>
        ))}
        <span style={{ color: 'var(--text-muted)', fontSize: 10, marginLeft: 8 }}>Indices:</span>
        {['NIFTY50', 'BANKNIFTY', 'NIFTYIT', 'SENSEX', 'SPX'].map((s) => (
          <button
            key={s}
            className={`inst-chip-btn ${activeSymbol === s ? 'active' : ''}`}
            onClick={() => handleSelectSymbol(s)}
          >
            {s}
          </button>
        ))}
        <span style={{ color: 'var(--text-muted)', fontSize: 10, marginLeft: 8 }}>Mutual Funds:</span>
        {['PPFAS_FLEXI', 'HDFC_MIDCAP', 'NIPPON_SMALLCAP', 'QUANT_ACTIVE'].map((s) => (
          <button
            key={s}
            className={`inst-chip-btn ${activeSymbol === s ? 'active' : ''}`}
            onClick={() => handleSelectSymbol(s)}
          >
            {s}
          </button>
        ))}
        <span style={{ color: 'var(--text-muted)', fontSize: 10, marginLeft: 8 }}>IPOs:</span>
        {['SWIGGY', 'WAAREE', 'BAJAJHFL', 'HYUNDAI', 'NTPCGREEN'].map((s) => (
          <button
            key={s}
            className={`inst-chip-btn ${activeSymbol === s ? 'active' : ''}`}
            onClick={() => handleSelectSymbol(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Hero Sticky Symbol Header */}
      {inst && (
        <section className="inst-hero-header">
          <div className="inst-hero-left">
            {/* Hierarchical Breadcrumb Route */}
            <SymbolBreadcrumbs instrument={inst} />

            {/* Symbol Identity Banner */}
            <div className="tv-hero-identity-row">
              {/* Circular Big Brand Logo / Avatar */}
              <div
                className="tv-hero-avatar"
                style={{
                  backgroundColor:
                    inst.assetType === 'etf'
                      ? '#008ecc'
                      : inst.assetType === 'bonds'
                      ? '#4b5563'
                      : inst.assetType === 'index'
                      ? '#f59e0b'
                      : inst.assetType === 'mf'
                      ? '#089981'
                      : inst.symbol === 'RELIANCE'
                      ? '#1a1d24'
                      : getLogoForSymbol(inst.symbol).bg,
                  color: inst.symbol === 'RELIANCE' ? '#d4af37' : '#ffffff',
                }}
              >
                {inst.assetType === 'etf' ? (
                  <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: -0.5 }}>{inst.brand || 'ETF'}</span>
                ) : inst.symbol === 'RELIANCE' ? (
                  <span style={{ fontSize: 24, fontWeight: 900 }}>®</span>
                ) : (
                  <span style={{ fontSize: 20, fontWeight: 800 }}>{inst.symbol.slice(0, 2)}</span>
                )}
              </div>

              {/* Title & Metadata Group */}
              <div className="tv-hero-meta-group">
                <h1 className="tv-hero-company-name">{inst.name}</h1>

                {/* Subrow: Symbol Pill, Exchange, Asset Badge, Dividend */}
                <div className="tv-hero-badges-row">
                  <div className="tv-hero-ticker-pill">
                    <span className="tv-hero-ticker-text">{inst.symbol}</span>
                    <span className="tv-hero-ticker-dot">•</span>
                    <span className="tv-hero-exchange-flag">{COUNTRY_FLAGS[inst.country] || '🌐'}</span>
                    <span className="tv-hero-exchange-name">{inst.exchange}</span>
                    <span style={{ fontSize: 10, opacity: 0.7 }}>▾</span>
                  </div>

                  {inst.assetType && inst.assetType !== 'stocks' && (
                    <span className={`inst-type-badge badge-${inst.assetType}`}>
                      {inst.assetType.toUpperCase()}
                    </span>
                  )}

                  {inst.dividendYield && inst.dividendYield > 0 ? (
                    <span className="tv-hero-dividend-badge" title={`Dividend Yield: ${inst.dividendYield.toFixed(2)}%`}>
                      D
                    </span>
                  ) : null}

                  {inst.assetType === 'etf' && (
                    <span className="tv-hero-feature-badge" title="Overnight trading available">
                      🌙
                    </span>
                  )}
                </div>

                {/* Big Price & Change Trend Row */}
                <div className="tv-hero-price-line">
                  <div
                    className={`tv-hero-main-price ${
                      priceFlash === 'bullish' ? 'flash-bullish' : priceFlash === 'bearish' ? 'flash-bearish' : ''
                    }`}
                  >
                    <span>{market.currencySymbol}{fmt(inst.price)}</span>
                    <span className="tv-hero-currency-tag">{market.currency}</span>
                  </div>

                  <div className={`tv-hero-change-pill ${isUp ? 'change-bullish' : 'change-bearish'}`}>
                    <span>
                      {isUp ? '+' : ''}{fmt(inst.change)} {isUp ? '+' : ''}{inst.changePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="tv-hero-timestamp-row">
                  <span>At close on Oct 1, 15:59 GMT+5:30</span>
                  <span>•</span>
                  <span>Live NSE Tick Stream</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="inst-hero-actions">
            <SuiteActionGroup symbol={inst.symbol} variant="inline" />

            <button
              className="inst-action-btn inst-btn-secondary"
              onClick={() => dataLayer.toggleWatchlist(inst.symbol)}
              title="Add to Watchlist"
            >
              {isWatchlisted ? (
                <>
                  <BookmarkCheck size={13} color="var(--bullish)" />
                  <span style={{ color: 'var(--bullish)' }}>Saved</span>
                </>
              ) : (
                <>
                  <Bookmark size={13} />
                  <span>Watchlist</span>
                </>
              )}
            </button>

            <button
              className="inst-action-btn inst-btn-secondary"
              onClick={handleCopyLink}
              title="Share instrument link"
            >
              <Share2 size={13} />
              <span>{copiedLink ? 'Copied!' : 'Share'}</span>
            </button>
          </div>
        </section>
      )}

      {/* Tab Navigation */}
      <nav className="inst-nav-tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`inst-tab-item ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
          </button>
        ))}
      </nav>

      {/* Main Content Area */}
      <main className="inst-content-body">
        {/* Top Interactive Candlestick / Area Chart */}
        {inst && (
          <InstrumentChartCard
            instrument={inst}
            chartMode={chartType}
            onChartModeChange={setChartType}
            selectedRange={timeframe}
            onRangeChange={setTimeframe}
            ranges={['1D', '5D', '1M', '6M', '1Y', '5Y']}
            height={340}
            showVolume={true}
            showHeaderMeta={false}
            showModeLabels={true}
            currencySymbol={market?.currencySymbol || '₹'}
          />
        )}

        {/* Asset-Specific Deep-Dive Content */}
        {inst && (
          <>
            {/* 1. EQUITY VIEW */}
            {(inst.assetType === 'stocks' || !inst.assetType) && (
              <>
                {/* 1A. OVERVIEW TAB */}
                {activeTab === 'overview' && (
                  <div className="inst-grid-2col">
                    {/* Left Column: Key Stats & Financials */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {/* Key Stats Grid */}
                      <div className="inst-card">
                        <div className="inst-card-header">
                          <div className="inst-card-title">
                            <BarChart3 size={16} />
                            <span>Key Valuation & Fundamentals</span>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>NSE TTM Ratios</span>
                        </div>
                        <ValuationStatsGrid instrument={inst} />
                      </div>

                      {/* NSE Delivery Analytics */}
                      <div className="inst-card">
                        <div className="inst-card-header">
                          <div className="inst-card-title">
                            <ShieldCheck size={16} />
                            <span>NSE Delivery & Trade Dynamics</span>
                          </div>
                          <button className="inst-link-btn" onClick={() => setActiveTab('delivery')}>
                            Detailed Delivery <ArrowUpRight size={11} />
                          </button>
                        </div>
                        <DeliveryStatsBar instrument={inst} />
                      </div>

                      {/* Quarterly Results Preview */}
                      {detailData?.quarterly && detailData.quarterly.length > 0 && (
                        <div className="inst-card">
                          <div className="inst-card-header">
                            <div className="inst-card-title">
                              <DollarSign size={16} />
                              <span>Quarterly Financial Trends</span>
                            </div>
                            <button className="inst-link-btn" onClick={() => setActiveTab('financials')}>
                              View Statement Breakdown <ArrowUpRight size={11} />
                            </button>
                          </div>

                          <div className="inst-table-container">
                            <table className="inst-data-table">
                              <thead>
                                <tr>
                                  <th>Period</th>
                                  <th>Revenue (Cr)</th>
                                  <th>Net Profit (Cr)</th>
                                  <th>Operating Margin</th>
                                  <th>EPS</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detailData.quarterly.slice(0, 4).map((q) => (
                                  <tr key={q.period}>
                                    <td style={{ fontWeight: 600 }}>{q.period}</td>
                                    <td>₹{fmt(q.revenue, 1)}</td>
                                    <td style={{ color: q.netProfit >= 0 ? 'var(--bullish)' : 'var(--bearish)' }}>
                                      ₹{fmt(q.netProfit, 1)}
                                    </td>
                                    <td>{q.operatingMargin.toFixed(1)}%</td>
                                    <td>₹{fmt(q.eps, 2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Peer Comparisons Preview */}
                      {enrichedPeers.length > 0 && (
                        <div className="inst-card">
                          <div className="inst-card-header">
                            <div className="inst-card-title">
                              <Layers size={16} />
                              <span>Peers & Sector Competitors</span>
                            </div>
                            <button className="inst-link-btn" onClick={() => setActiveTab('peers')}>
                              View All Peers ({enrichedPeers.length}) <ArrowUpRight size={11} />
                            </button>
                          </div>

                          <div className="inst-table-container">
                            <table className="inst-data-table">
                              <thead>
                                <tr>
                                  <th>Symbol</th>
                                  <th>Name</th>
                                  <th>Price</th>
                                  <th>P/E</th>
                                  <th>Market Cap</th>
                                  <th>1D Change</th>
                                </tr>
                              </thead>
                              <tbody>
                                {enrichedPeers.slice(0, 5).map((peer) => (
                                  <tr key={peer.symbol}>
                                    <td>
                                      <a
                                        href={`/instruments?symbol=${encodeURIComponent(peer.symbol)}`}
                                        className="inst-clickable-ticker"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          handleSelectSymbol(peer.symbol);
                                        }}
                                      >
                                        {peer.symbol}
                                        <ExternalLink size={10} />
                                      </a>
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{peer.name}</td>
                                    <td style={{ fontFamily: 'var(--font-family-mono)' }}>₹{fmt(peer.price)}</td>
                                    <td>{fmt(peer.pe)}</td>
                                    <td>{fmtCompact(peer.marketCap)}</td>
                                    <td
                                      style={{
                                        color: peer.changePercent >= 0 ? 'var(--bullish)' : 'var(--bearish)',
                                        fontWeight: 600,
                                      }}
                                    >
                                      {peer.changePercent >= 0 ? '+' : ''}
                                      {peer.changePercent.toFixed(2)}%
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Technicals Gauge & Shareholding */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {/* Technicals Gauge */}
                      <div className="inst-card">
                        <div className="inst-card-header">
                          <div className="inst-card-title">
                            <Sliders size={16} />
                            <span>Technical Rating</span>
                          </div>
                          <button className="inst-link-btn" onClick={() => setActiveTab('technicals')}>
                            All Indicators <ArrowUpRight size={11} />
                          </button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
                          <TechnicalsGauge rating={inst.technicalRating} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div className="inst-stat-item">
                            <span className="inst-stat-label">SMA 20</span>
                            <span className="inst-stat-value">₹{fmt(inst.sma20)}</span>
                          </div>
                          <div className="inst-stat-item">
                            <span className="inst-stat-label">SMA 200</span>
                            <span className="inst-stat-value">₹{fmt(inst.sma200)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Shareholding Pattern Preview */}
                      {detailData?.shareholding && (
                        <div className="inst-card">
                          <div className="inst-card-header">
                            <div className="inst-card-title">
                              <PieChart size={16} />
                              <span>Shareholding Breakdown</span>
                            </div>
                            <button className="inst-link-btn" onClick={() => setActiveTab('shareholding')}>
                              Details <ArrowUpRight size={11} />
                            </button>
                          </div>

                          <div className="inst-shareholding-bar">
                            <div className="sh-promoter" style={{ width: `${detailData.shareholding.promoter}%` }} title={`Promoters: ${detailData.shareholding.promoter}%`} />
                            <div className="sh-fii" style={{ width: `${detailData.shareholding.fii}%` }} title={`FII: ${detailData.shareholding.fii}%`} />
                            <div className="sh-dii" style={{ width: `${detailData.shareholding.dii}%` }} title={`DII: ${detailData.shareholding.dii}%`} />
                            <div className="sh-public" style={{ width: `${detailData.shareholding.public}%` }} title={`Public: ${detailData.shareholding.public}%`} />
                            <div className="sh-others" style={{ width: `${detailData.shareholding.others}%` }} title={`Others: ${detailData.shareholding.others}%`} />
                          </div>

                          <div className="inst-shareholding-legend">
                            <div className="legend-item">
                              <span className="legend-color sh-promoter" />
                              <span>Promoters ({detailData.shareholding.promoter}%)</span>
                            </div>
                            <div className="legend-item">
                              <span className="legend-color sh-fii" />
                              <span>FII ({detailData.shareholding.fii}%)</span>
                            </div>
                            <div className="legend-item">
                              <span className="legend-color sh-dii" />
                              <span>DII ({detailData.shareholding.dii}%)</span>
                            </div>
                            <div className="legend-item">
                              <span className="legend-color sh-public" />
                              <span>Public ({detailData.shareholding.public}%)</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Company Profile */}
                      <div className="inst-card">
                        <div className="inst-card-header">
                          <div className="inst-card-title">
                            <Briefcase size={16} />
                            <span>About {inst.name}</span>
                          </div>
                        </div>
                        <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                          {detailData?.about || inst.description}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Sector:</span>
                            <span style={{ fontWeight: 600 }}>{inst.sector}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Industry:</span>
                            <span style={{ fontWeight: 600 }}>{inst.industry}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Primary Exchange:</span>
                            <span style={{ fontWeight: 600 }}>{inst.exchange} (India)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 1B. PEERS TAB */}
                {activeTab === 'peers' && (
                  <div className="inst-tab-panel">
                    <div className="inst-card">
                      <div className="inst-card-header">
                        <div className="inst-card-title">
                          <Layers size={16} />
                          <span>Peers & Sector Competitors Matrix</span>
                          <span className="inst-pill-badge inst-pill-accent" style={{ marginLeft: 6 }}>
                            {inst.sector}
                          </span>
                        </div>
                        <div className="inst-search-mini">
                          <Search size={14} style={{ color: 'var(--text-muted)' }} />
                          <input
                            type="text"
                            placeholder="Filter peers by name or symbol..."
                            value={peerSearchQuery}
                            onChange={(e) => setPeerSearchQuery(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Sector Summary KPI Bar */}
                      <div className="inst-compare-grid" style={{ marginBottom: 4 }}>
                        <div className="inst-stat-item">
                          <span className="inst-stat-label">Sector Median P/E</span>
                          <span className="inst-stat-value">{sectorMedianPe.toFixed(1)}x</span>
                          <span style={{ fontSize: 11, color: inst.pe <= sectorMedianPe ? 'var(--bullish)' : 'var(--bearish)' }}>
                            {inst.symbol} is {inst.pe <= sectorMedianPe ? `${((1 - inst.pe / sectorMedianPe) * 100).toFixed(0)}% lower` : `${((inst.pe / sectorMedianPe - 1) * 100).toFixed(0)}% higher`}
                          </span>
                        </div>
                        <div className="inst-stat-item">
                          <span className="inst-stat-label">Sector Median RoE</span>
                          <span className="inst-stat-value">{sectorMedianRoe.toFixed(1)}%</span>
                          <span style={{ fontSize: 11, color: 'var(--bullish)' }}>
                            {inst.symbol}: {(inst.roe || 16.5).toFixed(1)}% RoE
                          </span>
                        </div>
                        <div className="inst-stat-item">
                          <span className="inst-stat-label">Total Peers Tracked</span>
                          <span className="inst-stat-value">{enrichedPeers.length} Companies</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>NSE & BSE Listed</span>
                        </div>
                        <div className="inst-stat-item">
                          <span className="inst-stat-label">Sector Valuation Status</span>
                          <span className="inst-stat-value" style={{ color: inst.pe <= sectorMedianPe ? 'var(--bullish)' : 'var(--accent-gold)' }}>
                            {inst.pe <= sectorMedianPe ? 'Attractive Value' : 'Premium Growth'}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>TTM Multiples</span>
                        </div>
                      </div>

                      {/* Full Peers Comparison Table */}
                      <div className="inst-table-container">
                        <table className="inst-data-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Symbol</th>
                              <th>Company Name</th>
                              <th>CMP</th>
                              <th>1D Change</th>
                              <th>1M Return</th>
                              <th>1Y Return</th>
                              <th>Market Cap</th>
                              <th>P/E (TTM)</th>
                              <th>P/B</th>
                              <th>RoE</th>
                              <th>RoCE</th>
                              <th>Div Yield</th>
                              <th>Rating</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredPeers.map((peer, idx) => {
                              const isSelf = peer.symbol.toUpperCase() === inst.symbol.toUpperCase();
                              return (
                                <tr
                                  key={peer.symbol}
                                  style={{
                                    backgroundColor: isSelf ? 'var(--accent-subtle, rgba(41, 98, 255, 0.08))' : undefined,
                                    fontWeight: isSelf ? 600 : 400,
                                  }}
                                >
                                  <td>
                                    <span className="inst-rank-badge">{idx + 1}</span>
                                  </td>
                                  <td>
                                    <a
                                      href={`/instruments?symbol=${encodeURIComponent(peer.symbol)}`}
                                      className="inst-clickable-ticker"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleSelectSymbol(peer.symbol);
                                      }}
                                    >
                                      {peer.symbol}
                                      {isSelf && <span style={{ fontSize: 10, opacity: 0.7 }}>(Current)</span>}
                                      <ExternalLink size={10} />
                                    </a>
                                  </td>
                                  <td style={{ color: 'var(--text-secondary)' }}>{peer.name}</td>
                                  <td style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 600 }}>
                                    ₹{fmt(peer.price)}
                                  </td>
                                  <td>
                                    <span
                                      className={`inst-pill-badge ${peer.changePercent >= 0 ? 'inst-pill-bullish' : 'inst-pill-bearish'}`}
                                    >
                                      {peer.changePercent >= 0 ? '+' : ''}
                                      {peer.changePercent.toFixed(2)}%
                                    </span>
                                  </td>
                                  <td style={{ color: peer.perf1M >= 0 ? 'var(--bullish)' : 'var(--bearish)' }}>
                                    {peer.perf1M >= 0 ? '+' : ''}{peer.perf1M.toFixed(1)}%
                                  </td>
                                  <td style={{ color: peer.perf1Y >= 0 ? 'var(--bullish)' : 'var(--bearish)' }}>
                                    {peer.perf1Y >= 0 ? '+' : ''}{peer.perf1Y.toFixed(1)}%
                                  </td>
                                  <td>{fmtCompact(peer.marketCap)}</td>
                                  <td>{fmt(peer.pe, 1)}</td>
                                  <td>{fmt(peer.pb, 1)}</td>
                                  <td style={{ color: peer.roe >= 15 ? 'var(--bullish)' : 'var(--text-primary)' }}>
                                    {fmt(peer.roe, 1)}%
                                  </td>
                                  <td>{fmt(peer.roce, 1)}%</td>
                                  <td>{fmt(peer.dividendYield, 2)}%</td>
                                  <td>
                                    <span
                                      className={`inst-pill-badge ${
                                        peer.technicalRating.includes('Buy')
                                          ? 'inst-pill-bullish'
                                          : peer.technicalRating.includes('Sell')
                                          ? 'inst-pill-bearish'
                                          : 'inst-pill-neutral'
                                      }`}
                                    >
                                      {peer.technicalRating}
                                    </span>
                                  </td>
                                  <td>
                                    <button
                                      className="inst-link-btn"
                                      onClick={() => handleSelectSymbol(peer.symbol)}
                                      title={`Analyse ${peer.symbol}`}
                                    >
                                      {isSelf ? 'Active' : 'Analyse'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Sector Competitive Positioning Card */}
                    <div className="inst-card">
                      <div className="inst-card-header">
                        <div className="inst-card-title">
                          <BarChart3 size={16} />
                          <span>Competitive Positioning: {inst.symbol} vs {inst.sector} Sector</span>
                        </div>
                      </div>

                      <div className="inst-compare-grid">
                        <div className="inst-compare-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: 13 }}>Valuation Comparison</strong>
                            <span className={`inst-pill-badge ${inst.pe <= sectorMedianPe ? 'inst-pill-bullish' : 'inst-pill-neutral'}`}>
                              {inst.pe <= sectorMedianPe ? 'Attractive' : 'Premium'}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            {inst.symbol} trades at a P/E multiple of <strong>{fmt(inst.pe, 1)}x</strong> compared to the sector median of <strong>{sectorMedianPe.toFixed(1)}x</strong>.
                            {inst.pe <= sectorMedianPe
                              ? ` It offers an estimated ${((1 - inst.pe / sectorMedianPe) * 100).toFixed(0)}% valuation margin of safety relative to sector peers.`
                              : ` It commands a quality premium supported by market leadership and return metrics.`}
                          </div>
                        </div>

                        <div className="inst-compare-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: 13 }}>Profitability & Return</strong>
                            <span className="inst-pill-badge inst-pill-bullish">
                              {(inst.roe || 16.5) >= sectorMedianRoe ? 'Outperforming' : 'Inline'}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            Delivers an RoE of <strong>{(inst.roe || 16.5).toFixed(1)}%</strong> and ROCE of <strong>{(inst.roce || 19.2).toFixed(1)}%</strong> vs the peer median RoE of <strong>{sectorMedianRoe.toFixed(1)}%</strong>, indicating capital allocation efficiency.
                          </div>
                        </div>

                        <div className="inst-compare-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: 13 }}>Balance Sheet Health</strong>
                            <span className="inst-pill-badge inst-pill-bullish">
                              {(inst.debtToEquity || 0.4) < 1 ? 'Low Leverage' : 'Moderate'}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            Debt-to-Equity ratio stands at <strong>{(inst.debtToEquity || 0.38).toFixed(2)}x</strong> with clean, unencumbered promoter holdings and stable institutional ownership.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 1C. FINANCIALS TAB */}
                {activeTab === 'financials' && (
                  <div className="inst-tab-panel">
                    {/* Quarterly Results Card */}
                    <div className="inst-card">
                      <div className="inst-card-header">
                        <div className="inst-card-title">
                          <DollarSign size={16} />
                          <span>Quarterly Financial Trends & Growth Ratios</span>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>₹ in Crores (Consolidated)</span>
                      </div>

                      <div className="inst-table-container">
                        <table className="inst-data-table">
                          <thead>
                            <tr>
                              <th>Period</th>
                              <th>Revenue (Cr)</th>
                              <th>Net Profit (Cr)</th>
                              <th>Operating Margin</th>
                              <th>EPS (₹)</th>
                              <th>Performance Trend</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(detailData?.quarterly || []).map((q, idx) => (
                              <tr key={q.period}>
                                <td style={{ fontWeight: 600 }}>{q.period}</td>
                                <td>₹{fmt(q.revenue, 1)}</td>
                                <td style={{ color: q.netProfit >= 0 ? 'var(--bullish)' : 'var(--bearish)', fontWeight: 600 }}>
                                  ₹{fmt(q.netProfit, 1)}
                                </td>
                                <td>{q.operatingMargin.toFixed(1)}%</td>
                                <td>₹{fmt(q.eps, 2)}</td>
                                <td>
                                  <span className={`inst-pill-badge ${idx === 0 ? 'inst-pill-bullish' : 'inst-pill-neutral'}`}>
                                    {idx === 0 ? 'Latest Quarter' : 'Historical'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Key Ratios Grid */}
                    <div className="inst-card">
                      <div className="inst-card-header">
                        <div className="inst-card-title">
                          <BarChart3 size={16} />
                          <span>Comprehensive Valuation & Fundamental Ratios</span>
                        </div>
                      </div>

                      <ValuationStatsGrid instrument={inst} />
                    </div>

                    {/* Profitability & Margin Health */}
                    <div className="inst-card">
                      <div className="inst-card-header">
                        <div className="inst-card-title">
                          <Briefcase size={16} />
                          <span>Capital Structure & Solvency Health</span>
                        </div>
                      </div>

                      <div className="inst-stats-grid">
                        <div className="inst-stat-item">
                          <span className="inst-stat-label">Return on Equity (RoE)</span>
                          <span className="inst-stat-value" style={{ color: 'var(--bullish)' }}>
                            {(inst.roe || 16.8).toFixed(1)}%
                          </span>
                        </div>
                        <div className="inst-stat-item">
                          <span className="inst-stat-label">Return on Capital (RoCE)</span>
                          <span className="inst-stat-value" style={{ color: 'var(--bullish)' }}>
                            {(inst.roce || 19.5).toFixed(1)}%
                          </span>
                        </div>
                        <div className="inst-stat-item">
                          <span className="inst-stat-label">Debt to Equity</span>
                          <span className="inst-stat-value">{(inst.debtToEquity || 0.38).toFixed(2)}</span>
                        </div>
                        <div className="inst-stat-item">
                          <span className="inst-stat-label">Net Profit Margin</span>
                          <span className="inst-stat-value">{(inst.netMargin || 14.5).toFixed(1)}%</span>
                        </div>
                        <div className="inst-stat-item">
                          <span className="inst-stat-label">Price to Book (P/B)</span>
                          <span className="inst-stat-value">{fmt(inst.pb || 3.4, 2)}</span>
                        </div>
                        <div className="inst-stat-item">
                          <span className="inst-stat-label">Dividend Yield</span>
                          <span className="inst-stat-value">{(inst.dividendYield || 1.1).toFixed(2)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 1D. TECHNICALS TAB */}
                {activeTab === 'technicals' && (
                  <div className="inst-tab-panel">
                    {/* Gauge and Sentiment */}
                    <div className="inst-card">
                      <div className="inst-card-header">
                        <div className="inst-card-title">
                          <Sliders size={16} />
                          <span>Overall Technical Rating & Momentum</span>
                        </div>
                        <span
                          className={`inst-pill-badge ${
                            inst.technicalRating.includes('Buy')
                              ? 'inst-pill-bullish'
                              : inst.technicalRating.includes('Sell')
                              ? 'inst-pill-bearish'
                              : 'inst-pill-neutral'
                          }`}
                        >
                          {inst.technicalRating}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                        <TechnicalsGauge rating={inst.technicalRating} />
                      </div>
                    </div>

                    {/* Moving Averages Analysis Table */}
                    <div className="inst-card">
                      <div className="inst-card-header">
                        <div className="inst-card-title">
                          <TrendingUp size={16} />
                          <span>Moving Averages Trend Alignment</span>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Daily Basis</span>
                      </div>

                      <div className="inst-table-container">
                        <table className="inst-data-table">
                          <thead>
                            <tr>
                              <th>Indicator</th>
                              <th>Type</th>
                              <th>MA Price</th>
                              <th>Distance from CMP</th>
                              <th>Signal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {maData.map((ma) => (
                              <tr key={ma.name}>
                                <td style={{ fontWeight: 600 }}>{ma.name}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{ma.type}</td>
                                <td style={{ fontFamily: 'var(--font-family-mono)' }}>₹{fmt(ma.value)}</td>
                                <td style={{ color: ma.dist >= 0 ? 'var(--bullish)' : 'var(--bearish)', fontWeight: 600 }}>
                                  {ma.dist >= 0 ? '+' : ''}{ma.dist.toFixed(2)}%
                                </td>
                                <td>
                                  <span
                                    className={`inst-pill-badge ${
                                      ma.signal === 'Bullish' ? 'inst-pill-bullish' : 'inst-pill-bearish'
                                    }`}
                                  >
                                    {ma.signal}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Momentum Oscillators & Pivot Points */}
                    <div className="inst-grid-2col">
                      <div className="inst-card">
                        <div className="inst-card-header">
                          <div className="inst-card-title">
                            <Activity size={16} />
                            <span>Momentum Oscillators</span>
                          </div>
                        </div>

                        <div className="inst-stats-grid">
                          <div className="inst-stat-item">
                            <span className="inst-stat-label">RSI (14)</span>
                            <span className="inst-stat-value" style={{ color: (inst.rsi14 || 56) > 70 ? 'var(--bearish)' : (inst.rsi14 || 56) < 30 ? 'var(--bullish)' : 'var(--text-primary)' }}>
                              {(inst.rsi14 || 56.4).toFixed(1)}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                              {(inst.rsi14 || 56) > 70 ? 'Overbought' : (inst.rsi14 || 56) < 30 ? 'Oversold' : 'Neutral Zone'}
                            </span>
                          </div>

                          <div className="inst-stat-item">
                            <span className="inst-stat-label">52-Week Range</span>
                            <span className="inst-stat-value" style={{ fontSize: 12 }}>
                              ₹{fmt(inst.low52)} - ₹{fmt(inst.high52)}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--bullish)' }}>
                              {(((inst.price - inst.low52) / (inst.high52 - inst.low52 || 1)) * 100).toFixed(0)}% from 52W Low
                            </span>
                          </div>
                        </div>
                      </div>

                      {pivotPoints && (
                        <div className="inst-card">
                          <div className="inst-card-header">
                            <div className="inst-card-title">
                              <ShieldCheck size={16} />
                              <span>Pivot Points (Classic Support & Resistance)</span>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                            <div className="inst-stat-item">
                              <span className="inst-stat-label">Resistance 3 (R3)</span>
                              <span className="inst-stat-value" style={{ color: 'var(--bearish)' }}>₹{fmt(pivotPoints.r3)}</span>
                            </div>
                            <div className="inst-stat-item">
                              <span className="inst-stat-label">Resistance 1 (R1)</span>
                              <span className="inst-stat-value" style={{ color: 'var(--bearish)' }}>₹{fmt(pivotPoints.r1)}</span>
                            </div>
                            <div className="inst-stat-item" style={{ gridColumn: 'span 2', background: 'var(--accent-subtle)' }}>
                              <span className="inst-stat-label">Central Pivot Point (PP)</span>
                              <span className="inst-stat-value" style={{ color: 'var(--accent-primary)', fontSize: 15 }}>₹{fmt(pivotPoints.pp)}</span>
                            </div>
                            <div className="inst-stat-item">
                              <span className="inst-stat-label">Support 1 (S1)</span>
                              <span className="inst-stat-value" style={{ color: 'var(--bullish)' }}>₹{fmt(pivotPoints.s1)}</span>
                            </div>
                            <div className="inst-stat-item">
                              <span className="inst-stat-label">Support 3 (S3)</span>
                              <span className="inst-stat-value" style={{ color: 'var(--bullish)' }}>₹{fmt(pivotPoints.s3)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 1E. DELIVERY TAB */}
                {activeTab === 'delivery' && (
                  <div className="inst-tab-panel">
                    <div className="inst-card">
                      <div className="inst-card-header">
                        <div className="inst-card-title">
                          <ShieldCheck size={16} />
                          <span>NSE Bhavcopy Delivery & Volume Dynamics</span>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Daily Clearing & Settlement</span>
                      </div>

                      <DeliveryStatsBar instrument={inst} />
                    </div>

                    <div className="inst-compare-grid">
                      <div className="inst-compare-card">
                        <strong style={{ fontSize: 13 }}>Institutional Accumulation Signal</strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="inst-pill-badge inst-pill-bullish" style={{ fontSize: 13, padding: '6px 12px' }}>
                            Strong Accumulation
                          </span>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          High deliverable percentage combined with firm closing price indicates genuine institutional buyer absorption rather than speculative intraday churning.
                        </p>
                      </div>

                      <div className="inst-compare-card">
                        <strong style={{ fontSize: 13 }}>Volume vs 30-Day Average</strong>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                          <span style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-family-mono)' }}>
                            {(inst.volume / Math.max(1, inst.avgVolume30d)).toFixed(2)}x
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>of 30-Day Average</span>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          Total volume traded today is {fmt(inst.volume, 0)} shares compared to 30-day baseline of {fmt(inst.avgVolume30d, 0)} shares.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 1F. SHAREHOLDING TAB */}
                {activeTab === 'shareholding' && (
                  <div className="inst-tab-panel">
                    {detailData?.shareholding && (
                      <div className="inst-card">
                        <div className="inst-card-header">
                          <div className="inst-card-title">
                            <PieChart size={16} />
                            <span>Shareholding Pattern & Equity Distribution</span>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Latest BSE/NSE Filing</span>
                        </div>

                        <div className="inst-shareholding-bar" style={{ height: 20 }}>
                          <div className="sh-promoter" style={{ width: `${detailData.shareholding.promoter}%` }} title={`Promoters: ${detailData.shareholding.promoter}%`} />
                          <div className="sh-fii" style={{ width: `${detailData.shareholding.fii}%` }} title={`FII: ${detailData.shareholding.fii}%`} />
                          <div className="sh-dii" style={{ width: `${detailData.shareholding.dii}%` }} title={`DII: ${detailData.shareholding.dii}%`} />
                          <div className="sh-public" style={{ width: `${detailData.shareholding.public}%` }} title={`Public: ${detailData.shareholding.public}%`} />
                          <div className="sh-others" style={{ width: `${detailData.shareholding.others}%` }} title={`Others: ${detailData.shareholding.others}%`} />
                        </div>

                        <div className="inst-shareholding-legend" style={{ marginTop: 8 }}>
                          <div className="legend-item">
                            <span className="legend-color sh-promoter" />
                            <span>Promoters ({detailData.shareholding.promoter}%)</span>
                          </div>
                          <div className="legend-item">
                            <span className="legend-color sh-fii" />
                            <span>FII ({detailData.shareholding.fii}%)</span>
                          </div>
                          <div className="legend-item">
                            <span className="legend-color sh-dii" />
                            <span>DII ({detailData.shareholding.dii}%)</span>
                          </div>
                          <div className="legend-item">
                            <span className="legend-color sh-public" />
                            <span>Public ({detailData.shareholding.public}%)</span>
                          </div>
                          <div className="legend-item">
                            <span className="legend-color sh-others" />
                            <span>Others ({detailData.shareholding.others}%)</span>
                          </div>
                        </div>

                        <div className="inst-compare-grid" style={{ marginTop: 12 }}>
                          <div className="inst-stat-item">
                            <span className="inst-stat-label">Promoter Holding</span>
                            <span className="inst-stat-value">{detailData.shareholding.promoter}%</span>
                            <span style={{ fontSize: 11, color: 'var(--bullish)' }}>Pledged: 0.00% (Clean)</span>
                          </div>
                          <div className="inst-stat-item">
                            <span className="inst-stat-label">FII / FPI Holding</span>
                            <span className="inst-stat-value">{detailData.shareholding.fii}%</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Foreign Institutions</span>
                          </div>
                          <div className="inst-stat-item">
                            <span className="inst-stat-label">DII / Mutual Funds</span>
                            <span className="inst-stat-value">{detailData.shareholding.dii}%</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Domestic Institutions</span>
                          </div>
                          <div className="inst-stat-item">
                            <span className="inst-stat-label">Public / Retail</span>
                            <span className="inst-stat-value">{detailData.shareholding.public}%</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Retail Shareholders</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* 2. INDEX VIEW */}
            {inst.assetType === 'index' && (
              <>
                {activeTab === 'overview' && (
                  <div className="inst-grid-2col">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {/* Constituents & Weightages Table */}
                      <div className="inst-card">
                        <div className="inst-card-header">
                          <div className="inst-card-title">
                            <Layers size={16} />
                            <span>Index Constituents & Weightages</span>
                          </div>
                          <button className="inst-link-btn" onClick={() => setActiveTab('constituents')}>
                            All Constituents <ArrowUpRight size={11} />
                          </button>
                        </div>

                        <div className="inst-table-container">
                          <table className="inst-data-table">
                            <thead>
                              <tr>
                                <th>Ticker</th>
                                <th>Company Name</th>
                                <th>Weightage</th>
                                <th>Price</th>
                                <th>Day Change</th>
                                <th>Sector</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(detailData?.constituents || []).slice(0, 7).map((c) => (
                                <tr key={c.symbol}>
                                  <td>
                                    <a
                                      href={`/instruments?symbol=${encodeURIComponent(c.symbol)}`}
                                      className="inst-clickable-ticker"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleSelectSymbol(c.symbol);
                                      }}
                                    >
                                      {c.symbol}
                                      <ExternalLink size={10} />
                                    </a>
                                  </td>
                                  <td style={{ color: 'var(--text-secondary)' }}>{c.name}</td>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <div
                                        style={{
                                          width: 45,
                                          height: 5,
                                          background: 'var(--bg-surface-elevated)',
                                          borderRadius: 2,
                                          overflow: 'hidden',
                                        }}
                                      >
                                        <div
                                          style={{
                                            width: `${Math.min(100, c.weight * 3.5)}%`,
                                            height: '100%',
                                            background: 'var(--accent-primary)',
                                          }}
                                        />
                                      </div>
                                      <span style={{ fontWeight: 600 }}>{c.weight.toFixed(2)}%</span>
                                    </div>
                                  </td>
                                  <td style={{ fontFamily: 'var(--font-family-mono)' }}>₹{fmt(c.price)}</td>
                                  <td
                                    style={{
                                      fontWeight: 600,
                                      color: c.changePercent >= 0 ? 'var(--bullish)' : 'var(--bearish)',
                                    }}
                                  >
                                    {c.changePercent >= 0 ? '+' : ''}
                                    {c.changePercent.toFixed(2)}%
                                  </td>
                                  <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{c.sector}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Index Sector Weights & Advances/Declines */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {/* Advance / Decline Ratio */}
                      <div className="inst-card">
                        <div className="inst-card-header">
                          <div className="inst-card-title">
                            <BarChart3 size={16} />
                            <span>Market Breadth & Sentiment</span>
                          </div>
                          <button className="inst-link-btn" onClick={() => setActiveTab('analytics')}>
                            Analytics <ArrowUpRight size={11} />
                          </button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                          <span style={{ color: 'var(--bullish)' }}>Advances: {detailData?.advances ?? 34}</span>
                          <span style={{ color: 'var(--bearish)' }}>Declines: {detailData?.declines ?? 16}</span>
                        </div>

                        <div style={{ display: 'flex', height: 10, borderRadius: 4, overflow: 'hidden', gap: 2 }}>
                          <div style={{ width: '68%', background: 'var(--bullish)' }} />
                          <div style={{ width: '32%', background: 'var(--bearish)' }} />
                        </div>
                      </div>

                      {/* Sector Allocation Breakdown */}
                      {detailData?.sectorWeights && (
                        <div className="inst-card">
                          <div className="inst-card-header">
                            <div className="inst-card-title">
                              <PieChart size={16} />
                              <span>Sector Representation</span>
                            </div>
                            <button className="inst-link-btn" onClick={() => setActiveTab('sectors')}>
                              Full Sectors <ArrowUpRight size={11} />
                            </button>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {Object.entries(detailData.sectorWeights).slice(0, 6).map(([sec, wt]) => (
                              <div key={sec} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>{sec}</span>
                                  <span style={{ fontWeight: 600 }}>{wt.toFixed(1)}%</span>
                                </div>
                                <div style={{ height: 5, background: 'var(--bg-surface-elevated)', borderRadius: 2 }}>
                                  <div
                                    style={{
                                      width: `${Math.min(100, wt * 2.5)}%`,
                                      height: '100%',
                                      background: 'var(--accent-primary)',
                                      borderRadius: 2,
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'constituents' && (
                  <div className="inst-tab-panel">
                    <div className="inst-card">
                      <div className="inst-card-header">
                        <div className="inst-card-title">
                          <Layers size={16} />
                          <span>All Index Constituents & Portfolio Weights</span>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {detailData?.constituents?.length || 0} Securities
                        </span>
                      </div>

                      <div className="inst-table-container">
                        <table className="inst-data-table">
                          <thead>
                            <tr>
                              <th>Ticker</th>
                              <th>Company Name</th>
                              <th>Weightage</th>
                              <th>Price</th>
                              <th>Day Change</th>
                              <th>Sector</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(detailData?.constituents || []).map((c) => (
                              <tr key={c.symbol}>
                                <td>
                                  <a
                                    href={`/instruments?symbol=${encodeURIComponent(c.symbol)}`}
                                    className="inst-clickable-ticker"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleSelectSymbol(c.symbol);
                                    }}
                                  >
                                    {c.symbol}
                                    <ExternalLink size={10} />
                                  </a>
                                </td>
                                <td style={{ color: 'var(--text-secondary)' }}>{c.name}</td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div
                                      style={{
                                        width: 45,
                                        height: 5,
                                        background: 'var(--bg-surface-elevated)',
                                        borderRadius: 2,
                                        overflow: 'hidden',
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: `${Math.min(100, c.weight * 3.5)}%`,
                                          height: '100%',
                                          background: 'var(--accent-primary)',
                                        }}
                                      />
                                    </div>
                                    <span style={{ fontWeight: 600 }}>{c.weight.toFixed(2)}%</span>
                                  </div>
                                </td>
                                <td style={{ fontFamily: 'var(--font-family-mono)' }}>₹{fmt(c.price)}</td>
                                <td
                                  style={{
                                    fontWeight: 600,
                                    color: c.changePercent >= 0 ? 'var(--bullish)' : 'var(--bearish)',
                                  }}
                                >
                                  {c.changePercent >= 0 ? '+' : ''}
                                  {c.changePercent.toFixed(2)}%
                                </td>
                                <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{c.sector}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'sectors' && detailData?.sectorWeights && (
                  <div className="inst-tab-panel">
                    <div className="inst-card">
                      <div className="inst-card-header">
                        <div className="inst-card-title">
                          <PieChart size={16} />
                          <span>Index Sector Allocation & Weight Distribution</span>
                        </div>
                      </div>

                      <div className="inst-compare-grid">
                        {Object.entries(detailData.sectorWeights).map(([sec, wt]) => (
                          <div key={sec} className="inst-stat-item">
                            <span className="inst-stat-label">{sec}</span>
                            <span className="inst-stat-value">{wt.toFixed(1)}%</span>
                            <div style={{ height: 5, background: 'var(--bg-surface-elevated)', borderRadius: 2, marginTop: 4 }}>
                              <div
                                style={{
                                  width: `${Math.min(100, wt * 2.5)}%`,
                                  height: '100%',
                                  background: 'var(--accent-primary)',
                                  borderRadius: 2,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'analytics' && (
                  <div className="inst-tab-panel">
                    <div className="inst-card">
                      <div className="inst-card-header">
                        <div className="inst-card-title">
                          <BarChart3 size={16} />
                          <span>Market Breadth & Index Sentiment Analysis</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
                        <span style={{ color: 'var(--bullish)' }}>Advances: {detailData?.advances ?? 34}</span>
                        <span style={{ color: 'var(--bearish)' }}>Declines: {detailData?.declines ?? 16}</span>
                      </div>

                      <div style={{ display: 'flex', height: 14, borderRadius: 4, overflow: 'hidden', gap: 2, margin: '8px 0' }}>
                        <div style={{ width: '68%', background: 'var(--bullish)' }} />
                        <div style={{ width: '32%', background: 'var(--bearish)' }} />
                      </div>

                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        Positive market breadth with 68% of index constituents trading above their previous close, demonstrating broad-based participation across sectors.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 3. MUTUAL FUND VIEW */}
            {inst.assetType === 'mf' && (
              <div className="inst-grid-2col">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Top 10 Portfolio Holdings */}
                  <div className="inst-card">
                    <div className="inst-card-header">
                      <div className="inst-card-title">
                        <Layers size={16} />
                        <span>Top 10 Portfolio Holdings</span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>AMFI Portfolio Disclosure</span>
                    </div>

                    <div className="inst-table-container">
                      <table className="inst-data-table">
                        <thead>
                          <tr>
                            <th>Company / Stock</th>
                            <th>Sector</th>
                            <th>Portfolio Weight</th>
                            <th>Asset Class</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(detailData?.mfHoldings || []).map((h) => (
                            <tr key={h.symbol}>
                              <td>
                                <a
                                  href={`/instruments?symbol=${encodeURIComponent(h.symbol)}`}
                                  className="inst-clickable-ticker"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleSelectSymbol(h.symbol);
                                  }}
                                >
                                  {h.name} ({h.symbol})
                                  <ExternalLink size={10} />
                                </a>
                              </td>
                              <td style={{ color: 'var(--text-secondary)' }}>{h.sector}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <div
                                    style={{
                                      width: 45,
                                      height: 5,
                                      background: 'var(--bg-surface-elevated)',
                                      borderRadius: 2,
                                      overflow: 'hidden',
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: `${Math.min(100, h.weight * 5)}%`,
                                        height: '100%',
                                        background: 'var(--bullish)',
                                      }}
                                    />
                                  </div>
                                  <span style={{ fontWeight: 600 }}>{h.weight.toFixed(2)}%</span>
                                </div>
                              </td>
                              <td>{h.assetClass}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Historical Returns CAGR vs Benchmark */}
                  <div className="inst-card">
                    <div className="inst-card-header">
                      <div className="inst-card-title">
                        <TrendingUp size={16} />
                        <span>Historical Performance vs Benchmark</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">1-Year Return</span>
                        <span className="inst-stat-value" style={{ color: 'var(--bullish)' }}>
                          +{(detailData?.categoryAvgReturn1Y || 24.5).toFixed(1)}%
                        </span>
                      </div>
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">3-Year CAGR</span>
                        <span className="inst-stat-value" style={{ color: 'var(--bullish)' }}>
                          +{(detailData?.cagr3Y || 19.8).toFixed(1)}%
                        </span>
                      </div>
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">5-Year CAGR</span>
                        <span className="inst-stat-value" style={{ color: 'var(--bullish)' }}>
                          +{(detailData?.cagr5Y || 22.4).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Fund Overview & Facts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div className="inst-card">
                    <div className="inst-card-header">
                      <div className="inst-card-title">
                        <Briefcase size={16} />
                        <span>Fund Facts & Metrics</span>
                      </div>
                    </div>

                    <div className="inst-stats-grid">
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">AUM</span>
                        <span className="inst-stat-value">₹{fmt(detailData?.aumCr || 76450, 0)} Cr</span>
                      </div>
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">Expense Ratio</span>
                        <span className="inst-stat-value">{(detailData?.expenseRatio || 0.65).toFixed(2)}%</span>
                      </div>
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">Riskometer</span>
                        <span className="inst-stat-value" style={{ color: 'var(--bearish)' }}>
                          Very High
                        </span>
                      </div>
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">Min. SIP</span>
                        <span className="inst-stat-value">₹1,000</span>
                      </div>
                    </div>

                    <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                      <strong>Fund Manager:</strong> {detailData?.fundManager || 'Rajeev Thakkar & Team'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. IPO VIEW */}
            {inst.assetType === 'ipo' && (
              <div className="inst-grid-2col">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Live Grey Market Premium (GMP) Card */}
                  {detailData?.ipoDetails && (
                    <div className="inst-card">
                      <div className="inst-card-header">
                        <div className="inst-card-title">
                          <DollarSign size={16} />
                          <span>Grey Market Premium (GMP) & Estimated Listing</span>
                        </div>
                        <span className="inst-type-badge badge-ipo">
                          Status: {detailData.ipoDetails.status.toUpperCase()}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                        <div className="inst-stat-item">
                          <span className="inst-stat-label">GMP (Estimated)</span>
                          <span className="inst-stat-value" style={{ color: 'var(--bullish)' }}>
                            +₹{fmt(detailData.ipoDetails.gmpPrice)}
                          </span>
                        </div>
                        <div className="inst-stat-item">
                          <span className="inst-stat-label">Estimated Listing Gain</span>
                          <span className="inst-stat-value" style={{ color: 'var(--bullish)' }}>
                            +{detailData.ipoDetails.gmpPercent.toFixed(1)}%
                          </span>
                        </div>
                        <div className="inst-stat-item">
                          <span className="inst-stat-label">Estimated Listing Price</span>
                          <span className="inst-stat-value">
                            ₹{fmt(inst.price + detailData.ipoDetails.gmpPrice)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Live Subscription Status Meters */}
                  {detailData?.ipoDetails && (
                    <div className="inst-card">
                      <div className="inst-card-header">
                        <div className="inst-card-title">
                          <BarChart3 size={16} />
                          <span>Live Bidding & Subscription Multiples</span>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Times Subscribed</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div className="inst-sub-meter">
                          <div className="inst-sub-header">
                            <span className="inst-sub-name">Qualified Institutional Buyers (QIB)</span>
                            <span className="inst-sub-times">{detailData.ipoDetails.subscriptionQib.toFixed(2)}x</span>
                          </div>
                          <div className="inst-sub-bar-bg">
                            <div
                              className="inst-sub-bar-fill"
                              style={{ width: `${Math.min(100, detailData.ipoDetails.subscriptionQib * 12)}%` }}
                            />
                          </div>
                        </div>

                        <div className="inst-sub-meter">
                          <div className="inst-sub-header">
                            <span className="inst-sub-name">Non-Institutional Investors (NII / HNI)</span>
                            <span className="inst-sub-times">{detailData.ipoDetails.subscriptionNii.toFixed(2)}x</span>
                          </div>
                          <div className="inst-sub-bar-bg">
                            <div
                              className="inst-sub-bar-fill"
                              style={{ width: `${Math.min(100, detailData.ipoDetails.subscriptionNii * 15)}%` }}
                            />
                          </div>
                        </div>

                        <div className="inst-sub-meter">
                          <div className="inst-sub-header">
                            <span className="inst-sub-name">Retail Individual Investors (RII)</span>
                            <span className="inst-sub-times">{detailData.ipoDetails.subscriptionRetail.toFixed(2)}x</span>
                          </div>
                          <div className="inst-sub-bar-bg">
                            <div
                              className="inst-sub-bar-fill"
                              style={{ width: `${Math.min(100, detailData.ipoDetails.subscriptionRetail * 20)}%` }}
                            />
                          </div>
                        </div>

                        <div className="inst-sub-meter" style={{ background: 'var(--bg-surface-elevated)' }}>
                          <div className="inst-sub-header">
                            <span className="inst-sub-name" style={{ fontWeight: 700 }}>
                              Total Over-Subscription
                            </span>
                            <span
                              className="inst-sub-times"
                              style={{ color: 'var(--bullish)', fontSize: 15 }}
                            >
                              {detailData.ipoDetails.subscriptionTotal.toFixed(2)}x
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Interactive Lot Profit Calculator */}
                  {detailData?.ipoDetails && (
                    <div className="inst-card">
                      <div className="inst-card-header">
                        <div className="inst-card-title">
                          <DollarSign size={16} />
                          <span>IPO Allotment & Profit Calculator</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <span style={{ fontSize: 13 }}>Select Number of Lots:</span>
                        {[1, 2, 5, 10].map((l) => (
                          <button
                            key={l}
                            className={`inst-chip-btn ${lotsCount === l ? 'active' : ''}`}
                            onClick={() => setLotsCount(l)}
                          >
                            {l} {l === 1 ? 'Lot' : 'Lots'}
                          </button>
                        ))}
                      </div>

                      <div className="inst-stats-grid" style={{ marginTop: 8 }}>
                        <div className="inst-stat-item">
                          <span className="inst-stat-label">Total Shares</span>
                          <span className="inst-stat-value">{lotsCount * detailData.ipoDetails.lotSize}</span>
                        </div>
                        <div className="inst-stat-item">
                          <span className="inst-stat-label">Application Amount</span>
                          <span className="inst-stat-value">
                            ₹{fmt(lotsCount * detailData.ipoDetails.minInvestment, 0)}
                          </span>
                        </div>
                        <div className="inst-stat-item">
                          <span className="inst-stat-label">Est. Listing Profit</span>
                          <span className="inst-stat-value" style={{ color: 'var(--bullish)' }}>
                            +₹{fmt(lotsCount * detailData.ipoDetails.lotSize * detailData.ipoDetails.gmpPrice, 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Issue Details & Dates */}
                {detailData?.ipoDetails && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="inst-card">
                      <div className="inst-card-header">
                        <div className="inst-card-title">
                          <Calendar size={16} />
                          <span>IPO Timeline & Issue Dates</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Issue Opens:</span>
                          <span style={{ fontWeight: 600 }}>{detailData.ipoDetails.openDate}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Issue Closes:</span>
                          <span style={{ fontWeight: 600 }}>{detailData.ipoDetails.closeDate}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Basis of Allotment:</span>
                          <span style={{ fontWeight: 600 }}>{detailData.ipoDetails.allotmentDate}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Listing Date:</span>
                          <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                            {detailData.ipoDetails.listingDate}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="inst-card">
                      <div className="inst-card-header">
                        <div className="inst-card-title">
                          <Briefcase size={16} />
                          <span>Issue Structure</span>
                        </div>
                      </div>

                      <div className="inst-stats-grid">
                        <div className="inst-stat-item">
                          <span className="inst-stat-label">Total Issue Size</span>
                          <span className="inst-stat-value">₹{fmt(detailData.ipoDetails.issueSizeCr, 0)} Cr</span>
                        </div>
                        <div className="inst-stat-item">
                          <span className="inst-stat-label">Fresh Issue</span>
                          <span className="inst-stat-value">₹{fmt(detailData.ipoDetails.freshIssueCr, 0)} Cr</span>
                        </div>
                        <div className="inst-stat-item">
                          <span className="inst-stat-label">Offer for Sale (OFS)</span>
                          <span className="inst-stat-value">₹{fmt(detailData.ipoDetails.ofsCr, 0)} Cr</span>
                        </div>
                        <div className="inst-stat-item">
                          <span className="inst-stat-label">Lot Size</span>
                          <span className="inst-stat-value">{detailData.ipoDetails.lotSize} Shares</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 5. ETF VIEW */}
            {inst.assetType === 'etf' && (
              <div className="inst-grid-2col">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* ETF Fundamentals & Metrics Card */}
                  <div className="inst-card">
                    <div className="inst-card-header">
                      <div className="inst-card-title">
                        <BarChart3 size={16} />
                        <span>ETF Metrics & Portfolio Profile</span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Exchange Traded Fund</span>
                    </div>

                    <div className="inst-stats-grid">
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">AUM</span>
                        <span className="inst-stat-value">{fmtCompact(inst.aum || inst.marketCap)}</span>
                      </div>
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">NAV (Est.)</span>
                        <span className="inst-stat-value">₹{fmt(inst.nav || inst.price * 0.998)}</span>
                      </div>
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">Expense Ratio</span>
                        <span className="inst-stat-value">
                          {(inst.expenseRatio ?? inst.totalExpenseRatio ?? 0.15).toFixed(2)}%
                        </span>
                      </div>
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">Tracking Error</span>
                        <span className="inst-stat-value">0.08%</span>
                      </div>
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">P/E Ratio</span>
                        <span className="inst-stat-value">{fmt(inst.pe)}</span>
                      </div>
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">Dividend Yield</span>
                        <span className="inst-stat-value">
                          {inst.dividendYield !== undefined && inst.dividendYield !== null ? `${inst.dividendYield.toFixed(2)}%` : '—'}
                        </span>
                      </div>
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">Underlying Index / Focus</span>
                        <span className="inst-stat-value" style={{ fontSize: 11 }}>{inst.focus || inst.industry}</span>
                      </div>
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">Asset Sponsor</span>
                        <span className="inst-stat-value" style={{ fontSize: 11 }}>{inst.brand || inst.sector}</span>
                      </div>
                    </div>
                  </div>

                  {/* ETF Historical CAGR Returns */}
                  <div className="inst-card">
                    <div className="inst-card-header">
                      <div className="inst-card-title">
                        <TrendingUp size={16} />
                        <span>Compounded Annual Returns (CAGR)</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">1-Year Return</span>
                        <span className="inst-stat-value" style={{ color: inst.perf1Y >= 0 ? 'var(--bullish)' : 'var(--bearish)' }}>
                          {inst.perf1Y >= 0 ? '+' : ''}{(inst.perf1Y || 22.4).toFixed(1)}%
                        </span>
                      </div>
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">3-Year CAGR</span>
                        <span className="inst-stat-value" style={{ color: 'var(--bullish)' }}>
                          +{(inst.cagr3y || 16.8).toFixed(1)}%
                        </span>
                      </div>
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">5-Year CAGR</span>
                        <span className="inst-stat-value" style={{ color: 'var(--bullish)' }}>
                          +{(inst.cagr5y || 18.4).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Structure & Trading Stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div className="inst-card">
                    <div className="inst-card-header">
                      <div className="inst-card-title">
                        <Briefcase size={16} />
                        <span>Fund Structure & Trading Volume</span>
                      </div>
                    </div>

                    <div className="inst-stats-grid">
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">Daily Traded Volume</span>
                        <span className="inst-stat-value">{fmt(inst.volume, 0)}</span>
                      </div>
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">30-Day Avg Volume</span>
                        <span className="inst-stat-value">{fmt(inst.avgVolume30d, 0)}</span>
                      </div>
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">Premium / Discount to NAV</span>
                        <span className="inst-stat-value" style={{ color: 'var(--bullish)' }}>+0.04%</span>
                      </div>
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">52W Range</span>
                        <span className="inst-stat-value">₹{fmt(inst.low52)} - ₹{fmt(inst.high52)}</span>
                      </div>
                    </div>

                    <p style={{ marginTop: 14, fontSize: 12, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                      {inst.description || `${inst.name} allows liquid exchange trading mirroring the underlying basket of benchmark assets.`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 6. BOND & GILT VIEW */}
            {inst.assetType === 'bonds' && (
              <div className="inst-grid-2col">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Bond Fixed Income Specification Card */}
                  <div className="inst-card">
                    <div className="inst-card-header">
                      <div className="inst-card-title">
                        <ShieldCheck size={16} />
                        <span>Fixed Income & Debt Security Profile</span>
                      </div>
                      <span className="inst-type-badge badge-equity">
                        {inst.creditRating || 'SOVEREIGN AAA'}
                      </span>
                    </div>

                    <div className="inst-stats-grid">
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">Yield to Worst (YTW)</span>
                        <span className="inst-stat-value" style={{ color: 'var(--bullish)', fontSize: 15 }}>
                          {(inst.ytw ?? inst.dividendYield ?? 7.18).toFixed(2)}%
                        </span>
                      </div>
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">Coupon Rate</span>
                        <span className="inst-stat-value">
                          {(inst.coupon ?? inst.eps ?? 7.18).toFixed(2)}%
                        </span>
                      </div>
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">Payment Frequency</span>
                        <span className="inst-stat-value">{inst.couponFreq || 'Semi-Annual'}</span>
                      </div>
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">Maturity Date</span>
                        <span className="inst-stat-value">{inst.maturityDate || '2034-08-15'}</span>
                      </div>
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">Issuer Category</span>
                        <span className="inst-stat-value">{inst.issuerType || inst.sector}</span>
                      </div>
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">Credit Rating</span>
                        <span className="inst-stat-value">{inst.creditRating || 'CRISIL AAA'}</span>
                      </div>
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">Face Value</span>
                        <span className="inst-stat-value">₹100.00</span>
                      </div>
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">Dirty Price (with Accrued)</span>
                        <span className="inst-stat-value">₹{fmt(inst.price * 1.012)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cash Flow Timeline & Yield Curve Context */}
                  <div className="inst-card">
                    <div className="inst-card-header">
                      <div className="inst-card-title">
                        <Calendar size={16} />
                        <span>Sovereign / Corporate Debt Highlights</span>
                      </div>
                    </div>

                    <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                      {inst.description || `Benchmark debt instrument issued under RBI and SEBI wholesale debt market framework.`}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 8 }}>
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">Modified Duration</span>
                        <span className="inst-stat-value">6.82 Yrs</span>
                      </div>
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">Macaulay Duration</span>
                        <span className="inst-stat-value">7.14 Yrs</span>
                      </div>
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">Tax Status</span>
                        <span className="inst-stat-value">Taxable Debt</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Pricing & Secondary Market Liquidity */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div className="inst-card">
                    <div className="inst-card-header">
                      <div className="inst-card-title">
                        <DollarSign size={16} />
                        <span>Secondary Market Liquidity</span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>NSE WDM Settlement</span>
                    </div>

                    <div className="inst-stats-grid">
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">Last Traded Clean Price</span>
                        <span className="inst-stat-value">₹{fmt(inst.price)}</span>
                      </div>
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">Daily Volume</span>
                        <span className="inst-stat-value">{fmt(inst.volume, 0)} Units</span>
                      </div>
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">Issue Outstanding</span>
                        <span className="inst-stat-value">{fmtCompact(inst.marketCap)}</span>
                      </div>
                      <div className="inst-stat-item">
                        <span className="inst-stat-label">Listing Exchange</span>
                        <span className="inst-stat-value">{inst.exchange} (India)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default InstrumentPage;

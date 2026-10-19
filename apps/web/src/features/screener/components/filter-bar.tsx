import React, { useState, useEffect, useRef } from 'react';
import { useScreenerStore } from '../../../core/store/use-screener-store';
import { useLayoutStore } from '../../../layouts/use-layout-store';
import { dataLayer } from '../../../core/data-layer';
import { CountryCode } from '../../../core/market-data';
import { PillDropdown } from '../../../components/ui/pill-dropdown';
import {
  Download,
  RotateCcw,
  Search,
  ChevronDown,
  RotateCw,
  Maximize2,
  Minimize2,
  Table as TableIcon,
  LineChart,
  LayoutGrid,
  Sparkles,
  Undo2,
  Redo2,
  Check,
  X,
  Layers,
  TrendingUp,
  TrendingDown,
  Crown,
  Rocket,
  Gem,
  Coins,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from 'lucide-react';
import { IndexDrawer } from './index-drawer';
import { getIndicesForMarket } from '../../../core/indices';
import { ScreenerType, SCREENER_CONFIG } from '../../../core/filter-config';

export const SCREENER_TYPES: { id: ScreenerType; name: string; defaultPresetTitle: string }[] = [
  { id: 'stocks', name: 'Stock Screener', defaultPresetTitle: 'All stocks' },
  { id: 'etf', name: 'ETF Screener', defaultPresetTitle: 'ETF vault' },
  { id: 'bonds', name: 'Bond Screener', defaultPresetTitle: 'All bonds' },
  { id: 'mf', name: 'MF Screener', defaultPresetTitle: 'All mutual funds' },
];

export interface ScreenPresetItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number; style?: React.CSSProperties }>;
  iconClass?: string;
}

export const SCREEN_PRESETS: ScreenPresetItem[] = [
  { id: 'all', name: 'All stocks', icon: Layers },
  { id: 'gainers', name: 'Top gainers', icon: TrendingUp, iconClass: 'preset-icon-gainers' },
  { id: 'losers', name: 'Top losers', icon: TrendingDown, iconClass: 'preset-icon-losers' },
  { id: 'most_capitalized', name: 'Most capitalized', icon: Crown },
  { id: 'momentum', name: 'Bullish momentum', icon: Rocket },
  { id: 'value', name: 'Value stocks (P/E < 25)', icon: Gem },
  { id: 'dividend', name: 'High dividend yield', icon: Coins },
  { id: 'most_active', name: 'Volume leaders', icon: Flame },
  { id: 'high52', name: '52-week high', icon: ArrowUpRight },
  { id: 'oversold', name: 'Oversold RSI (<35)', icon: ArrowDownRight },
  { id: 'overbought', name: 'Overbought RSI (>70)', icon: Activity },
];

export const HONBA_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'performance', label: 'Performance' },
  { id: 'technicals', label: 'Technicals' },
  { id: 'extended_hours', label: 'Extended hours' },
  { id: 'forecasts', label: 'Forecasts' },
  { id: 'valuation', label: 'Valuation' },
  { id: 'dividends', label: 'Dividends' },
  { id: 'profitability', label: 'Profitability' },
  { id: 'income_statement', label: 'Income statement' },
  { id: 'balance_sheet', label: 'Balance sheet' },
  { id: 'cash_flow', label: 'Cash flow' },
  { id: 'per_share', label: 'Per share' },
];

interface FilterBarProps {
  totalCount: number;
  filteredCount: number;
  onExportCSV: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  totalCount,
  filteredCount,
  onExportCSV,
}) => {
  const activeTab = useScreenerStore((state) => state.activeTab);
  const setActiveTab = useScreenerStore((state) => state.setActiveTab);
  const screenerType = useScreenerStore((state) => state.screenerType || 'stocks');
  const setScreenerType = useScreenerStore((state) => state.setScreenerType);
  const autosave = useScreenerStore((state) => state.autosave);
  const setAutosave = useScreenerStore((state) => state.setAutosave);
  const quickPreset = useScreenerStore((state) => state.quickPreset);
  const setQuickPreset = useScreenerStore((state) => state.setQuickPreset);
  const searchQuery = useScreenerStore((state) => state.searchQuery);
  const setSearchQuery = useScreenerStore((state) => state.setSearchQuery);
  const advanced = useScreenerStore((state) => state.advancedFilters);
  const setAdvanced = useScreenerStore((state) => state.setAdvancedFilters);
  const resetFilters = useScreenerStore((state) => state.resetFilters);

  const currentMarket = useScreenerStore((state) => state.currentMarket);
  const setMarket = useScreenerStore((state) => state.setMarket);
  const shortlistedSymbols = useScreenerStore((state) => state.shortlistedSymbols);

  const isDrawerOpen = useLayoutStore((state) => state.isDrawerOpen);
  const viewMode = useLayoutStore((state) => state.viewMode);
  const setViewMode = useLayoutStore((state) => state.setViewMode);
  const setFilterModalOpen = useScreenerStore((state) => state.setFilterModalOpen);
  const setColumnModalOpen = useScreenerStore((state) => state.setColumnModalOpen);

  // Active Dropdown Pill
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAiSearch, setShowAiSearch] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

  // Button refs for anchoring floating dropdowns
  const marketBtnRef = useRef<HTMLButtonElement>(null);
  const watchlistBtnRef = useRef<HTMLButtonElement>(null);
  const indexBtnRef = useRef<HTMLButtonElement>(null);
  const priceBtnRef = useRef<HTMLButtonElement>(null);
  const chgBtnRef = useRef<HTMLButtonElement>(null);
  const mktCapBtnRef = useRef<HTMLButtonElement>(null);
  const peBtnRef = useRef<HTMLButtonElement>(null);
  const dividendBtnRef = useRef<HTMLButtonElement>(null);
  const sectorBtnRef = useRef<HTMLButtonElement>(null);
  const ratingBtnRef = useRef<HTMLButtonElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  // ETF filter button refs
  const etfFocusBtnRef = useRef<HTMLButtonElement>(null);
  const etfExpenseBtnRef = useRef<HTMLButtonElement>(null);
  const etfBrandBtnRef = useRef<HTMLButtonElement>(null);

  // Bond filter button refs
  const bondIssuerBtnRef = useRef<HTMLButtonElement>(null);
  const bondRatingBtnRef = useRef<HTMLButtonElement>(null);
  const bondYtwBtnRef = useRef<HTMLButtonElement>(null);

  // Mutual Fund filter button refs
  const mfTypeBtnRef = useRef<HTMLButtonElement>(null);
  const mfCategoryBtnRef = useRef<HTMLButtonElement>(null);
  const mfAmcBtnRef = useRef<HTMLButtonElement>(null);
  const mfExpenseBtnRef = useRef<HTMLButtonElement>(null);
  const mfSharpeBtnRef = useRef<HTMLButtonElement>(null);
  const mfCagr3yBtnRef = useRef<HTMLButtonElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target?.closest?.('.tv-pill-dropdown')) {
        return;
      }
      if (containerRef.current && !containerRef.current.contains(target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const marketInfo = dataLayer.getCurrentMarketInfo();
  const allMarkets = dataLayer.getSupportedMarkets();

  const toggleDropdown = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveDropdown((prev) => (prev === id ? null : id));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleSelectPreset = (presetId: string) => {
    if (presetId === quickPreset && presetId !== 'all') {
      // Toggle off if already active -> reset to 'all'
      handleSelectPreset('all');
      return;
    }

    setQuickPreset(presetId);

    switch (presetId) {
      case 'all':
        setAdvanced({
          minChangePercent: null,
          maxChangePercent: null,
          marketCapTier: 'all',
          peMin: null,
          peMax: null,
          minDividendYield: null,
          technicalRating: 'all',
          minVolume: null,
          near52WeekHigh: false,
          rsiMin: null,
          rsiMax: null,
        });
        break;

      case 'gainers':
        setAdvanced({
          minChangePercent: 0,
          maxChangePercent: null,
          marketCapTier: 'all',
          peMin: null,
          peMax: null,
          minDividendYield: null,
          technicalRating: 'all',
          near52WeekHigh: false,
          rsiMin: null,
          rsiMax: null,
        });
        break;

      case 'losers':
        setAdvanced({
          minChangePercent: null,
          maxChangePercent: 0,
          marketCapTier: 'all',
          peMin: null,
          peMax: null,
          minDividendYield: null,
          technicalRating: 'all',
          near52WeekHigh: false,
          rsiMin: null,
          rsiMax: null,
        });
        break;

      case 'most_capitalized':
        setAdvanced({
          marketCapTier: 'large',
          minChangePercent: null,
          maxChangePercent: null,
          peMin: null,
          peMax: null,
          minDividendYield: null,
          technicalRating: 'all',
          near52WeekHigh: false,
          rsiMin: null,
          rsiMax: null,
        });
        break;

      case 'momentum':
        setAdvanced({
          technicalRating: 'Buy',
          minChangePercent: null,
          maxChangePercent: null,
          marketCapTier: 'all',
          peMin: null,
          peMax: null,
          minDividendYield: null,
          near52WeekHigh: false,
          rsiMin: null,
          rsiMax: null,
        });
        break;

      case 'value':
        setAdvanced({
          peMin: 0,
          peMax: 25,
          minChangePercent: null,
          maxChangePercent: null,
          marketCapTier: 'all',
          minDividendYield: null,
          technicalRating: 'all',
          near52WeekHigh: false,
          rsiMin: null,
          rsiMax: null,
        });
        break;

      case 'dividend':
        setAdvanced({
          minDividendYield: 2.0,
          minChangePercent: null,
          maxChangePercent: null,
          marketCapTier: 'all',
          peMin: null,
          peMax: null,
          technicalRating: 'all',
          near52WeekHigh: false,
          rsiMin: null,
          rsiMax: null,
        });
        break;

      case 'most_active':
        setAdvanced({
          minVolume: 2000000,
          minChangePercent: null,
          maxChangePercent: null,
          marketCapTier: 'all',
          peMin: null,
          peMax: null,
          minDividendYield: null,
          technicalRating: 'all',
          near52WeekHigh: false,
          rsiMin: null,
          rsiMax: null,
        });
        break;

      case 'high52':
        setAdvanced({
          near52WeekHigh: true,
          minChangePercent: null,
          maxChangePercent: null,
          marketCapTier: 'all',
          peMin: null,
          peMax: null,
          minDividendYield: null,
          technicalRating: 'all',
          rsiMin: null,
          rsiMax: null,
        });
        break;

      case 'oversold':
        setAdvanced({
          rsiMax: 35,
          rsiMin: null,
          minChangePercent: null,
          maxChangePercent: null,
          marketCapTier: 'all',
          peMin: null,
          peMax: null,
          minDividendYield: null,
          technicalRating: 'all',
          near52WeekHigh: false,
        });
        break;

      case 'overbought':
        setAdvanced({
          rsiMin: 70,
          rsiMax: null,
          minChangePercent: null,
          maxChangePercent: null,
          marketCapTier: 'all',
          peMin: null,
          peMax: null,
          minDividendYield: null,
          technicalRating: 'all',
          near52WeekHigh: false,
        });
        break;

      default:
        break;
    }
  };

  const isPresetActive = (presetId: string) => {
    if (presetId === 'all') {
      return (
        (quickPreset === 'all' || !quickPreset) &&
        advanced.minChangePercent === null &&
        advanced.maxChangePercent === null &&
        advanced.marketCapTier === 'all' &&
        advanced.peMin === null &&
        advanced.peMax === null &&
        advanced.minDividendYield === null &&
        advanced.technicalRating === 'all' &&
        !advanced.near52WeekHigh &&
        advanced.rsiMin === null &&
        advanced.rsiMax === null &&
        (advanced.minVolume === null || advanced.minVolume === undefined)
      );
    }
    if (presetId === 'gainers') {
      return quickPreset === 'gainers' || (advanced.minChangePercent !== null && advanced.minChangePercent !== undefined && advanced.minChangePercent >= 0);
    }
    if (presetId === 'losers') {
      return quickPreset === 'losers' || (advanced.maxChangePercent !== null && advanced.maxChangePercent !== undefined && advanced.maxChangePercent <= 0);
    }
    if (presetId === 'most_capitalized') {
      return quickPreset === 'most_capitalized' || advanced.marketCapTier === 'large' || advanced.marketCapTier === 'mega';
    }
    if (presetId === 'value') {
      return quickPreset === 'value' || (advanced.peMax !== null && advanced.peMax <= 25);
    }
    if (presetId === 'dividend') {
      return quickPreset === 'dividend' || (advanced.minDividendYield !== null && advanced.minDividendYield >= 1.5);
    }
    if (presetId === 'momentum') {
      return quickPreset === 'momentum' || advanced.technicalRating === 'Buy' || advanced.technicalRating === 'Strong Buy';
    }
    if (presetId === 'high52') {
      return quickPreset === 'high52' || !!advanced.near52WeekHigh;
    }
    if (presetId === 'oversold') {
      return quickPreset === 'oversold' || (advanced.rsiMax !== null && advanced.rsiMax <= 35);
    }
    if (presetId === 'overbought') {
      return quickPreset === 'overbought' || (advanced.rsiMin !== null && advanced.rsiMin >= 70);
    }
    if (presetId === 'most_active') {
      return quickPreset === 'most_active' || (advanced.minVolume !== null && advanced.minVolume !== undefined && advanced.minVolume >= 2000000);
    }
    return quickPreset === presetId;
  };

  const handleAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    const q = aiPrompt.toLowerCase();
    if (q.includes('high dividend') || q.includes('dividend')) {
      handleSelectPreset('dividend');
    } else if (q.includes('gain') || q.includes('bullish') || q.includes('top gainers')) {
      handleSelectPreset('gainers');
    } else if (q.includes('value') || q.includes('low pe')) {
      handleSelectPreset('value');
    } else if (q.includes('tech') || q.includes('it')) {
      setAdvanced({ sector: 'Technology' });
    } else if (q.includes('bank') || q.includes('finance')) {
      setAdvanced({ sector: 'Financials' });
    } else {
      setSearchQuery(aiPrompt);
    }
    setShowAiSearch(false);
    setAiPrompt('');
  };

  return (
    <div className="tv-screener-header-container" ref={containerRef}>
      {/* Row 1: Popular Screens Bubbles & Header Actions */}
      <div className="tv-header-title-row">
        <div className="tv-popular-screens-container">
          <div className="tv-popular-screens-label">
            Popular Screens:
          </div>
          <div className="tv-popular-bubbles-list">
            {SCREEN_PRESETS.map((preset) => {
              const active = isPresetActive(preset.id);
              const PresetIcon = preset.icon;
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`tv-popular-bubble ${active ? 'active' : ''} preset-${preset.id}`}
                  onClick={() => handleSelectPreset(preset.id)}
                  title={`Apply screen: ${preset.name}`}
                >
                  <span className={`tv-popular-bubble-icon ${preset.iconClass || ''}`}>
                    <PresetIcon size={13} strokeWidth={1.8} />
                  </span>
                  <span className="tv-popular-bubble-name">{preset.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right toolbar icons: Undo, Redo */}
        <div className="tv-header-actions">
          <button className="tv-icon-circle-btn" title="Undo (Ctrl+Z)" disabled>
            <Undo2 size={14} />
          </button>
          <button className="tv-icon-circle-btn" title="Redo (Ctrl+Y)" disabled>
            <Redo2 size={14} />
          </button>
        </div>
      </div>

      {/* Row 2: Signature Filter Pills (✦ AI, IN, Watchlist, Index, Price, Chg%, Mkt cap, P/E, etc.) */}
      <div className="tv-filter-pills-row">
        {/* ✦ AI Filter Pill */}
        <button
          className="tv-ai-pill"
          onClick={() => setShowAiSearch(!showAiSearch)}
          title="Filter stocks using AI prompt"
        >
          <Sparkles size={13} style={{ color: '#c084fc' }} />
          <span>AI</span>
        </button>

        {/* Market Country Selector Pill */}
        <div className="tv-filter-pill-wrapper">
          <button
            ref={marketBtnRef}
            className="tv-filter-pill"
            onClick={() => toggleDropdown('market')}
            title="Select Country & Market"
          >
            <span style={{ fontSize: 13 }}>{marketInfo.flag}</span>
            <span>{marketInfo.code}</span>
            <ChevronDown size={11} style={{ opacity: 0.6 }} />
          </button>

          <PillDropdown
            isOpen={activeDropdown === 'market'}
            onClose={() => setActiveDropdown(null)}
            triggerRef={marketBtnRef}
            width={220}
          >
            <div style={{ padding: '6px 12px 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
              Select Market Region
            </div>
            {allMarkets.map((m) => (
              <div
                key={m.code}
                className={`tv-pill-option ${m.code === currentMarket ? 'selected' : ''}`}
                onClick={() => {
                  setMarket(m.code as CountryCode);
                  setActiveDropdown(null);
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{m.flag}</span>
                  <span>{m.name}</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.primaryExchanges[0]}</span>
              </div>
            ))}
          </PillDropdown>
        </div>

        {/* Watchlist Pill */}
        <div className="tv-filter-pill-wrapper">
          <button
            ref={watchlistBtnRef}
            className={`tv-filter-pill ${shortlistedSymbols.length > 0 && quickPreset === 'watchlist' ? 'active' : ''}`}
            onClick={() => toggleDropdown('watchlist')}
            title="Watchlist filter options"
          >
            <span>Watchlist</span>
            {shortlistedSymbols.length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 2 }}>({shortlistedSymbols.length})</span>
            )}
            <ChevronDown size={11} style={{ opacity: 0.6 }} />
          </button>

          <PillDropdown
            isOpen={activeDropdown === 'watchlist'}
            onClose={() => setActiveDropdown(null)}
            triggerRef={watchlistBtnRef}
            width={220}
          >
            <div style={{ padding: '6px 12px 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
              Watchlist Filter
            </div>
            <div
              className={`tv-pill-option ${quickPreset !== 'watchlist' ? 'selected' : ''}`}
              onClick={() => {
                setQuickPreset('all');
                setActiveDropdown(null);
              }}
            >
              <span>All Stocks ({totalCount})</span>
              {quickPreset !== 'watchlist' && <Check size={13} />}
            </div>
            <div
              className={`tv-pill-option ${quickPreset === 'watchlist' ? 'selected' : ''}`}
              onClick={() => {
                setQuickPreset('watchlist');
                setActiveDropdown(null);
              }}
            >
              <span>Watchlist Only ({shortlistedSymbols.length})</span>
              {quickPreset === 'watchlist' && <Check size={13} />}
            </div>
            <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />
            <div
              className="tv-pill-option"
              style={{
                color: shortlistedSymbols.length > 0 ? '#f23645' : 'var(--text-muted)',
                opacity: shortlistedSymbols.length > 0 ? 1 : 0.5,
                cursor: shortlistedSymbols.length > 0 ? 'pointer' : 'default',
              }}
              onClick={() => {
                if (shortlistedSymbols.length > 0) {
                  useScreenerStore.getState().clearShortlist();
                  if (quickPreset === 'watchlist') {
                    setQuickPreset('all');
                  }
                  setActiveDropdown(null);
                }
              }}
            >
              <span>Clear Watchlist</span>
            </div>
          </PillDropdown>
        </div>

        {/* ===================== STOCKS SPECIFIC PILLS ===================== */}
        {screenerType === 'stocks' && (
          <>
            {/* Index Pill (Honba Index Drawer) */}
            <div className="tv-filter-pill-wrapper">
              <button
                ref={indexBtnRef}
                className={`tv-filter-pill ${advanced.indices && advanced.indices.length > 0 ? 'active' : ''}`}
                onClick={() => toggleDropdown('index')}
              >
                <span>
                  {advanced.indices && advanced.indices.length === 1
                    ? `Index: ${getIndicesForMarket(currentMarket).find((i) => i.code === advanced.indices[0])?.name || advanced.indices[0]}`
                    : advanced.indices && advanced.indices.length > 1
                    ? `Index: ${advanced.indices.length} selected`
                    : 'Index: All'}
                </span>
                <ChevronDown size={11} style={{ opacity: 0.6 }} />
              </button>
              <IndexDrawer
                isOpen={activeDropdown === 'index'}
                onClose={() => setActiveDropdown(null)}
                triggerRef={indexBtnRef}
                selectedIndices={advanced.indices || []}
                onSelectIndices={(indices) => setAdvanced({ indices })}
                country={currentMarket}
              />
            </div>

            {/* Price Pill */}
            <div className="tv-filter-pill-wrapper">
              <button
                ref={priceBtnRef}
                className={`tv-filter-pill ${advanced.minPrice !== null || advanced.maxPrice !== null ? 'active' : ''}`}
                onClick={() => toggleDropdown('price')}
              >
                <span>
                  Price
                  {advanced.minPrice !== null || advanced.maxPrice !== null ? ` (${advanced.minPrice || 0}-${advanced.maxPrice || '∞'})` : ''}
                </span>
                <ChevronDown size={11} style={{ opacity: 0.6 }} />
              </button>
              <PillDropdown
                isOpen={activeDropdown === 'price'}
                onClose={() => setActiveDropdown(null)}
                triggerRef={priceBtnRef}
                width={200}
              >
                <div
                  className="tv-pill-option"
                  onClick={() => {
                    setAdvanced({ minPrice: null, maxPrice: null });
                    setActiveDropdown(null);
                  }}
                >
                  <span>Any Price</span>
                </div>
                <div
                  className="tv-pill-option"
                  onClick={() => {
                    setAdvanced({ minPrice: null, maxPrice: 100 });
                    setActiveDropdown(null);
                  }}
                >
                  <span>Under ₹100</span>
                </div>
                <div
                  className="tv-pill-option"
                  onClick={() => {
                    setAdvanced({ minPrice: 100, maxPrice: 500 });
                    setActiveDropdown(null);
                  }}
                >
                  <span>₹100 – ₹500</span>
                </div>
                <div
                  className="tv-pill-option"
                  onClick={() => {
                    setAdvanced({ minPrice: 500, maxPrice: 2000 });
                    setActiveDropdown(null);
                  }}
                >
                  <span>₹500 – ₹2,000</span>
                </div>
                <div
                  className="tv-pill-option"
                  onClick={() => {
                    setAdvanced({ minPrice: 2000, maxPrice: null });
                    setActiveDropdown(null);
                  }}
                >
                  <span>Over ₹2,000</span>
                </div>
              </PillDropdown>
            </div>

            {/* Chg % Pill */}
            <div className="tv-filter-pill-wrapper">
              <button
                ref={chgBtnRef}
                className={`tv-filter-pill ${quickPreset === 'gainers' || quickPreset === 'losers' || (advanced.minChangePercent !== null && advanced.minChangePercent !== undefined) || (advanced.maxChangePercent !== null && advanced.maxChangePercent !== undefined) ? 'active' : ''}`}
                onClick={() => toggleDropdown('chg')}
              >
                <span>
                  Chg %
                  {quickPreset === 'gainers' || (advanced.minChangePercent !== null && advanced.minChangePercent !== undefined && advanced.minChangePercent >= 0)
                    ? ': Gainers'
                    : quickPreset === 'losers' || (advanced.maxChangePercent !== null && advanced.maxChangePercent !== undefined && advanced.maxChangePercent <= 0)
                    ? ': Losers'
                    : ''}
                </span>
                <ChevronDown size={11} style={{ opacity: 0.6 }} />
              </button>
              <PillDropdown
                isOpen={activeDropdown === 'chg'}
                onClose={() => setActiveDropdown(null)}
                triggerRef={chgBtnRef}
                width={180}
              >
                <div
                  className={`tv-pill-option ${quickPreset !== 'gainers' && quickPreset !== 'losers' && advanced.minChangePercent === null && advanced.maxChangePercent === null ? 'selected' : ''}`}
                  onClick={() => {
                    handleSelectPreset('all');
                    setActiveDropdown(null);
                  }}
                >
                  <span>All Changes</span>
                  {quickPreset !== 'gainers' && quickPreset !== 'losers' && advanced.minChangePercent === null && advanced.maxChangePercent === null && <Check size={13} />}
                </div>
                <div
                  className={`tv-pill-option ${quickPreset === 'gainers' || (advanced.minChangePercent !== null && advanced.minChangePercent !== undefined && advanced.minChangePercent >= 0) ? 'selected' : ''}`}
                  onClick={() => {
                    handleSelectPreset('gainers');
                    setActiveDropdown(null);
                  }}
                >
                  <span style={{ color: '#089981', fontWeight: 600 }}>▲ Gainers (&gt; 0%)</span>
                  {(quickPreset === 'gainers' || (advanced.minChangePercent !== null && advanced.minChangePercent !== undefined && advanced.minChangePercent >= 0)) && <Check size={13} />}
                </div>
                <div
                  className={`tv-pill-option ${quickPreset === 'losers' || (advanced.maxChangePercent !== null && advanced.maxChangePercent !== undefined && advanced.maxChangePercent <= 0) ? 'selected' : ''}`}
                  onClick={() => {
                    handleSelectPreset('losers');
                    setActiveDropdown(null);
                  }}
                >
                  <span style={{ color: '#f23645', fontWeight: 600 }}>▼ Losers (&lt; 0%)</span>
                  {(quickPreset === 'losers' || (advanced.maxChangePercent !== null && advanced.maxChangePercent !== undefined && advanced.maxChangePercent <= 0)) && <Check size={13} />}
                </div>
              </PillDropdown>
            </div>

            {/* Mkt cap Pill */}
            <div className="tv-filter-pill-wrapper">
              <button
                ref={mktCapBtnRef}
                className={`tv-filter-pill ${advanced.marketCapTier !== 'all' || quickPreset === 'most_capitalized' ? 'active' : ''}`}
                onClick={() => toggleDropdown('mktCap')}
              >
                <span>
                  Mkt cap: {advanced.marketCapTier === 'all' ? (quickPreset === 'most_capitalized' ? 'Large Cap' : 'All') : advanced.marketCapTier}
                </span>
                <ChevronDown size={11} style={{ opacity: 0.6 }} />
              </button>
              <PillDropdown
                isOpen={activeDropdown === 'mktCap'}
                onClose={() => setActiveDropdown(null)}
                triggerRef={mktCapBtnRef}
                width={220}
              >
                {[
                  { id: 'all', label: 'All Market Caps' },
                  { id: 'mega', label: 'Mega Cap (> ₹2T)' },
                  { id: 'large', label: 'Large Cap (> ₹500B)' },
                  { id: 'mid', label: 'Mid Cap (₹100B–₹500B)' },
                  { id: 'small', label: 'Small Cap (< ₹100B)' },
                ].map((tier) => (
                  <div
                    key={tier.id}
                    className={`tv-pill-option ${advanced.marketCapTier === tier.id ? 'selected' : ''}`}
                    onClick={() => {
                      if (tier.id === 'all') {
                        setAdvanced({ marketCapTier: 'all' });
                        if (quickPreset === 'most_capitalized') setQuickPreset('all');
                      } else {
                        setAdvanced({ marketCapTier: tier.id as any });
                        if (tier.id === 'large' || tier.id === 'mega') {
                          setQuickPreset('most_capitalized');
                        } else if (quickPreset === 'most_capitalized') {
                          setQuickPreset('all');
                        }
                      }
                      setActiveDropdown(null);
                    }}
                  >
                    <span>{tier.label}</span>
                    {advanced.marketCapTier === tier.id && <Check size={13} />}
                  </div>
                ))}
              </PillDropdown>
            </div>

            {/* P/E Pill */}
            <div className="tv-filter-pill-wrapper">
              <button
                ref={peBtnRef}
                className={`tv-filter-pill ${advanced.peMin !== null || advanced.peMax !== null || quickPreset === 'value' ? 'active' : ''}`}
                onClick={() => toggleDropdown('pe')}
              >
                <span>
                  P/E
                  {advanced.peMin === 0 && advanced.peMax === 15
                    ? ': < 15'
                    : advanced.peMax === 25
                    ? ': < 25'
                    : advanced.peMin === 25 && advanced.peMax === 50
                    ? ': 25–50'
                    : advanced.peMin !== null || advanced.peMax !== null
                    ? ': Active'
                    : quickPreset === 'value'
                    ? ': < 25'
                    : ''}
                </span>
                <ChevronDown size={11} style={{ opacity: 0.6 }} />
              </button>
              <PillDropdown
                isOpen={activeDropdown === 'pe'}
                onClose={() => setActiveDropdown(null)}
                triggerRef={peBtnRef}
                width={190}
              >
                <div
                  className={`tv-pill-option ${advanced.peMin === null && advanced.peMax === null && quickPreset !== 'value' ? 'selected' : ''}`}
                  onClick={() => {
                    setAdvanced({ peMin: null, peMax: null });
                    if (quickPreset === 'value') setQuickPreset('all');
                    setActiveDropdown(null);
                  }}
                >
                  <span>Any P/E</span>
                  {advanced.peMin === null && advanced.peMax === null && quickPreset !== 'value' && <Check size={13} />}
                </div>
                <div
                  className={`tv-pill-option ${advanced.peMin === 0 && advanced.peMax === 15 ? 'selected' : ''}`}
                  onClick={() => {
                    setAdvanced({ peMin: 0, peMax: 15 });
                    setQuickPreset('value');
                    setActiveDropdown(null);
                  }}
                >
                  <span>Value (&lt; 15)</span>
                  {advanced.peMin === 0 && advanced.peMax === 15 && <Check size={13} />}
                </div>
                <div
                  className={`tv-pill-option ${(advanced.peMax === 25 && (advanced.peMin === 0 || advanced.peMin === null)) || (quickPreset === 'value' && advanced.peMax === 25) ? 'selected' : ''}`}
                  onClick={() => {
                    setAdvanced({ peMin: 0, peMax: 25 });
                    setQuickPreset('value');
                    setActiveDropdown(null);
                  }}
                >
                  <span>Reasonable (&lt; 25)</span>
                  {((advanced.peMax === 25 && (advanced.peMin === 0 || advanced.peMin === null)) || (quickPreset === 'value' && advanced.peMax === 25)) && <Check size={13} />}
                </div>
                <div
                  className={`tv-pill-option ${advanced.peMin === 25 && advanced.peMax === 50 ? 'selected' : ''}`}
                  onClick={() => {
                    setAdvanced({ peMin: 25, peMax: 50 });
                    if (quickPreset === 'value') setQuickPreset('all');
                    setActiveDropdown(null);
                  }}
                >
                  <span>Growth (25 – 50)</span>
                  {advanced.peMin === 25 && advanced.peMax === 50 && <Check size={13} />}
                </div>
              </PillDropdown>
            </div>

            {/* Div yield % Pill */}
            <div className="tv-filter-pill-wrapper">
              <button
                ref={dividendBtnRef}
                className={`tv-filter-pill ${advanced.minDividendYield !== null || quickPreset === 'dividend' ? 'active' : ''}`}
                onClick={() => toggleDropdown('dividend')}
              >
                <span>
                  Div yield %
                  {advanced.minDividendYield !== null
                    ? `: > ${advanced.minDividendYield}%`
                    : quickPreset === 'dividend'
                    ? ': > 1.5%'
                    : ''}
                </span>
                <ChevronDown size={11} style={{ opacity: 0.6 }} />
              </button>
              <PillDropdown
                isOpen={activeDropdown === 'dividend'}
                onClose={() => setActiveDropdown(null)}
                triggerRef={dividendBtnRef}
                width={190}
              >
                <div
                  className={`tv-pill-option ${advanced.minDividendYield === null && quickPreset !== 'dividend' ? 'selected' : ''}`}
                  onClick={() => {
                    setAdvanced({ minDividendYield: null });
                    if (quickPreset === 'dividend') setQuickPreset('all');
                    setActiveDropdown(null);
                  }}
                >
                  <span>Any Yield</span>
                  {advanced.minDividendYield === null && quickPreset !== 'dividend' && <Check size={13} />}
                </div>
                <div
                  className={`tv-pill-option ${advanced.minDividendYield === 1.0 ? 'selected' : ''}`}
                  onClick={() => {
                    setAdvanced({ minDividendYield: 1.0 });
                    setQuickPreset('dividend');
                    setActiveDropdown(null);
                  }}
                >
                  <span>Over 1%</span>
                  {advanced.minDividendYield === 1.0 && <Check size={13} />}
                </div>
                <div
                  className={`tv-pill-option ${advanced.minDividendYield === 2.0 || (quickPreset === 'dividend' && advanced.minDividendYield === 2.0) ? 'selected' : ''}`}
                  onClick={() => {
                    setAdvanced({ minDividendYield: 2.0 });
                    setQuickPreset('dividend');
                    setActiveDropdown(null);
                  }}
                >
                  <span>Over 2%</span>
                  {(advanced.minDividendYield === 2.0 || (quickPreset === 'dividend' && advanced.minDividendYield === 2.0)) && <Check size={13} />}
                </div>
                <div
                  className={`tv-pill-option ${advanced.minDividendYield === 4.0 ? 'selected' : ''}`}
                  onClick={() => {
                    setAdvanced({ minDividendYield: 4.0 });
                    setQuickPreset('dividend');
                    setActiveDropdown(null);
                  }}
                >
                  <span>High Yield (&gt; 4%)</span>
                  {advanced.minDividendYield === 4.0 && <Check size={13} />}
                </div>
              </PillDropdown>
            </div>

            {/* Sector Pill */}
            <div className="tv-filter-pill-wrapper">
              <button
                ref={sectorBtnRef}
                className={`tv-filter-pill ${advanced.sector !== 'all' ? 'active' : ''}`}
                onClick={() => toggleDropdown('sector')}
              >
                <span>Sector: {advanced.sector === 'all' ? 'All' : advanced.sector}</span>
                <ChevronDown size={11} style={{ opacity: 0.6 }} />
              </button>
              <PillDropdown
                isOpen={activeDropdown === 'sector'}
                onClose={() => setActiveDropdown(null)}
                triggerRef={sectorBtnRef}
                width={220}
                maxHeight={320}
              >
                {[
                  'all',
                  'Financials',
                  'Technology',
                  'Energy',
                  'Healthcare',
                  'Automobile',
                  'Consumer Goods',
                  'Materials',
                  'Telecom',
                  'Industrials',
                ].map((sec) => (
                  <div
                    key={sec}
                    className={`tv-pill-option ${advanced.sector === sec ? 'selected' : ''}`}
                    onClick={() => {
                      setAdvanced({ sector: sec });
                      setActiveDropdown(null);
                    }}
                  >
                    <span>{sec === 'all' ? 'All Sectors' : sec}</span>
                    {advanced.sector === sec && <Check size={13} />}
                  </div>
                ))}
              </PillDropdown>
            </div>

            {/* Analyst Rating Pill */}
            <div className="tv-filter-pill-wrapper">
              <button
                ref={ratingBtnRef}
                className={`tv-filter-pill ${advanced.technicalRating !== 'all' || quickPreset === 'momentum' ? 'active' : ''}`}
                onClick={() => toggleDropdown('rating')}
              >
                <span>
                  Analyst rating: {advanced.technicalRating === 'all' ? (quickPreset === 'momentum' ? 'Buy' : 'All') : advanced.technicalRating}
                </span>
                <ChevronDown size={11} style={{ opacity: 0.6 }} />
              </button>
              <PillDropdown
                isOpen={activeDropdown === 'rating'}
                onClose={() => setActiveDropdown(null)}
                triggerRef={ratingBtnRef}
                width={200}
              >
                {[
                  { id: 'all', label: 'All Ratings' },
                  { id: 'Strong Buy', label: 'Strong Buy', color: '#089981', bold: true },
                  { id: 'Buy', label: 'Buy', color: '#089981' },
                  { id: 'Neutral', label: 'Neutral', color: 'var(--text-secondary)' },
                  { id: 'Sell', label: 'Sell', color: '#f23645' },
                  { id: 'Strong Sell', label: 'Strong Sell', color: '#f23645', bold: true },
                ].map((r) => (
                  <div
                    key={r.id}
                    className={`tv-pill-option ${advanced.technicalRating === r.id ? 'selected' : ''}`}
                    onClick={() => {
                      setAdvanced({ technicalRating: r.id as any });
                      if (r.id === 'Buy' || r.id === 'Strong Buy') {
                        setQuickPreset('momentum');
                      } else if (quickPreset === 'momentum') {
                        setQuickPreset('all');
                      }
                      setActiveDropdown(null);
                    }}
                  >
                    <span style={{ color: r.color, fontWeight: r.bold ? 700 : r.id !== 'all' ? 500 : 400 }}>{r.label}</span>
                    {advanced.technicalRating === r.id && <Check size={13} />}
                  </div>
                ))}
              </PillDropdown>
            </div>
          </>
        )}

        {/* ===================== ETF SPECIFIC PILLS ===================== */}
        {screenerType === 'etf' && (
          <>
            {/* Focus Pill */}
            <div className="tv-filter-pill-wrapper">
              <button
                ref={etfFocusBtnRef}
                className={`tv-filter-pill ${advanced.focus && advanced.focus !== 'all' ? 'active' : ''}`}
                onClick={() => toggleDropdown('etf_focus')}
              >
                <span>Focus: {advanced.focus === 'all' || !advanced.focus ? 'All' : advanced.focus}</span>
                <ChevronDown size={11} style={{ opacity: 0.6 }} />
              </button>
              <PillDropdown
                isOpen={activeDropdown === 'etf_focus'}
                onClose={() => setActiveDropdown(null)}
                triggerRef={etfFocusBtnRef}
                width={200}
              >
                {['all', 'Broad Market', 'Large Cap', 'Technology', 'Gold & Metals', 'PSU & Div'].map((f) => (
                  <div
                    key={f}
                    className={`tv-pill-option ${advanced.focus === f ? 'selected' : ''}`}
                    onClick={() => {
                      setAdvanced({ focus: f });
                      setActiveDropdown(null);
                    }}
                  >
                    <span>{f === 'all' ? 'All Focuses' : f}</span>
                    {advanced.focus === f && <Check size={13} />}
                  </div>
                ))}
              </PillDropdown>
            </div>

            {/* Expense Ratio Pill */}
            <div className="tv-filter-pill-wrapper">
              <button
                ref={etfExpenseBtnRef}
                className={`tv-filter-pill ${advanced.maxExpenseRatio !== null && advanced.maxExpenseRatio !== undefined ? 'active' : ''}`}
                onClick={() => toggleDropdown('etf_expense')}
              >
                <span>Expense: {advanced.maxExpenseRatio ? `≤ ${advanced.maxExpenseRatio}%` : 'All'}</span>
                <ChevronDown size={11} style={{ opacity: 0.6 }} />
              </button>
              <PillDropdown
                isOpen={activeDropdown === 'etf_expense'}
                onClose={() => setActiveDropdown(null)}
                triggerRef={etfExpenseBtnRef}
                width={190}
              >
                {[
                  { label: 'Any Expense Ratio', val: null },
                  { label: '≤ 0.15% (Ultra-Low)', val: 0.15 },
                  { label: '≤ 0.30% (Standard)', val: 0.30 },
                  { label: '≤ 0.50%', val: 0.50 },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`tv-pill-option ${advanced.maxExpenseRatio === item.val ? 'selected' : ''}`}
                    onClick={() => {
                      setAdvanced({ maxExpenseRatio: item.val });
                      setActiveDropdown(null);
                    }}
                  >
                    <span>{item.label}</span>
                    {advanced.maxExpenseRatio === item.val && <Check size={13} />}
                  </div>
                ))}
              </PillDropdown>
            </div>

            {/* Brand / AMC Pill */}
            <div className="tv-filter-pill-wrapper">
              <button
                ref={etfBrandBtnRef}
                className={`tv-filter-pill ${advanced.brand && advanced.brand !== 'all' ? 'active' : ''}`}
                onClick={() => toggleDropdown('etf_brand')}
              >
                <span>Brand: {advanced.brand === 'all' || !advanced.brand ? 'All' : advanced.brand}</span>
                <ChevronDown size={11} style={{ opacity: 0.6 }} />
              </button>
              <PillDropdown
                isOpen={activeDropdown === 'etf_brand'}
                onClose={() => setActiveDropdown(null)}
                triggerRef={etfBrandBtnRef}
                width={180}
              >
                {['all', 'Nippon', 'HDFC', 'SBI', 'ICICI', 'Vanguard', 'iShares'].map((b) => (
                  <div
                    key={b}
                    className={`tv-pill-option ${advanced.brand === b ? 'selected' : ''}`}
                    onClick={() => {
                      setAdvanced({ brand: b });
                      setActiveDropdown(null);
                    }}
                  >
                    <span>{b === 'all' ? 'All Brands' : b}</span>
                    {advanced.brand === b && <Check size={13} />}
                  </div>
                ))}
              </PillDropdown>
            </div>
          </>
        )}

        {/* ===================== BOND SPECIFIC PILLS ===================== */}
        {screenerType === 'bonds' && (
          <>
            {/* Issuer Type Pill */}
            <div className="tv-filter-pill-wrapper">
              <button
                ref={bondIssuerBtnRef}
                className={`tv-filter-pill ${advanced.issuerType && advanced.issuerType !== 'all' ? 'active' : ''}`}
                onClick={() => toggleDropdown('bond_issuer_type')}
              >
                <span>Issuer: {advanced.issuerType === 'all' || !advanced.issuerType ? 'All' : advanced.issuerType}</span>
                <ChevronDown size={11} style={{ opacity: 0.6 }} />
              </button>
              <PillDropdown
                isOpen={activeDropdown === 'bond_issuer_type'}
                onClose={() => setActiveDropdown(null)}
                triggerRef={bondIssuerBtnRef}
                width={200}
              >
                {['all', 'Sovereign', 'Corporate PSU', 'Corporate Private'].map((t) => (
                  <div
                    key={t}
                    className={`tv-pill-option ${advanced.issuerType === t ? 'selected' : ''}`}
                    onClick={() => {
                      setAdvanced({ issuerType: t });
                      setActiveDropdown(null);
                    }}
                  >
                    <span>{t === 'all' ? 'All Issuer Types' : t}</span>
                    {advanced.issuerType === t && <Check size={13} />}
                  </div>
                ))}
              </PillDropdown>
            </div>

            {/* Credit Rating Pill */}
            <div className="tv-filter-pill-wrapper">
              <button
                ref={bondRatingBtnRef}
                className={`tv-filter-pill ${advanced.creditRating && advanced.creditRating !== 'all' ? 'active' : ''}`}
                onClick={() => toggleDropdown('bond_rating')}
              >
                <span>Rating: {advanced.creditRating === 'all' || !advanced.creditRating ? 'All' : advanced.creditRating}</span>
                <ChevronDown size={11} style={{ opacity: 0.6 }} />
              </button>
              <PillDropdown
                isOpen={activeDropdown === 'bond_rating'}
                onClose={() => setActiveDropdown(null)}
                triggerRef={bondRatingBtnRef}
                width={180}
              >
                {['all', 'SOV', 'AAA', 'AA+', 'AA'].map((r) => (
                  <div
                    key={r}
                    className={`tv-pill-option ${advanced.creditRating === r ? 'selected' : ''}`}
                    onClick={() => {
                      setAdvanced({ creditRating: r });
                      setActiveDropdown(null);
                    }}
                  >
                    <span>{r === 'all' ? 'All Ratings' : r}</span>
                    {advanced.creditRating === r && <Check size={13} />}
                  </div>
                ))}
              </PillDropdown>
            </div>

            {/* YTW % Pill */}
            <div className="tv-filter-pill-wrapper">
              <button
                ref={bondYtwBtnRef}
                className={`tv-filter-pill ${advanced.minYtw !== null && advanced.minYtw !== undefined ? 'active' : ''}`}
                onClick={() => toggleDropdown('bond_ytw')}
              >
                <span>YTW: {advanced.minYtw ? `≥ ${advanced.minYtw}%` : 'All'}</span>
                <ChevronDown size={11} style={{ opacity: 0.6 }} />
              </button>
              <PillDropdown
                isOpen={activeDropdown === 'bond_ytw'}
                onClose={() => setActiveDropdown(null)}
                triggerRef={bondYtwBtnRef}
                width={190}
              >
                {[
                  { label: 'Any Yield to Worst', val: null },
                  { label: '≥ 7.0% Yield', val: 7.0 },
                  { label: '≥ 7.3% Yield', val: 7.3 },
                  { label: '≥ 7.5% Yield', val: 7.5 },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`tv-pill-option ${advanced.minYtw === item.val ? 'selected' : ''}`}
                    onClick={() => {
                      setAdvanced({ minYtw: item.val });
                      setActiveDropdown(null);
                    }}
                  >
                    <span>{item.label}</span>
                    {advanced.minYtw === item.val && <Check size={13} />}
                  </div>
                ))}
              </PillDropdown>
            </div>
          </>
        )}

        {/* ===================== MUTUAL FUND (MF) SPECIFIC PILLS ===================== */}
        {screenerType === 'mf' && (
          <>
            {/* Scheme Type Pill */}
            <div className="tv-filter-pill-wrapper">
              <button
                ref={mfTypeBtnRef}
                className={`tv-filter-pill ${advanced.mfSchemeType && advanced.mfSchemeType !== 'all' ? 'active' : ''}`}
                onClick={() => toggleDropdown('mf_type')}
              >
                <span>Type: {advanced.mfSchemeType === 'all' || !advanced.mfSchemeType ? 'All' : advanced.mfSchemeType}</span>
                <ChevronDown size={11} style={{ opacity: 0.6 }} />
              </button>
              <PillDropdown
                isOpen={activeDropdown === 'mf_type'}
                onClose={() => setActiveDropdown(null)}
                triggerRef={mfTypeBtnRef}
                width={190}
              >
                {['all', 'Growth', 'Liquid', 'Debt', 'Hybrid', 'ELSS'].map((t) => (
                  <div
                    key={t}
                    className={`tv-pill-option ${advanced.mfSchemeType === t ? 'selected' : ''}`}
                    onClick={() => {
                      setAdvanced({ mfSchemeType: t });
                      setActiveDropdown(null);
                    }}
                  >
                    <span>{t === 'all' ? 'All Types' : t}</span>
                    {advanced.mfSchemeType === t && <Check size={13} />}
                  </div>
                ))}
              </PillDropdown>
            </div>

            {/* Category Pill */}
            <div className="tv-filter-pill-wrapper">
              <button
                ref={mfCategoryBtnRef}
                className={`tv-filter-pill ${advanced.mfCategory && advanced.mfCategory !== 'all' ? 'active' : ''}`}
                onClick={() => toggleDropdown('mf_category')}
              >
                <span>Category: {advanced.mfCategory === 'all' || !advanced.mfCategory ? 'All' : advanced.mfCategory}</span>
                <ChevronDown size={11} style={{ opacity: 0.6 }} />
              </button>
              <PillDropdown
                isOpen={activeDropdown === 'mf_category'}
                onClose={() => setActiveDropdown(null)}
                triggerRef={mfCategoryBtnRef}
                width={220}
              >
                {['all', 'Equity: Large Cap', 'Equity: Mid Cap', 'Equity: Small Cap', 'Equity: Flexi Cap'].map((c) => (
                  <div
                    key={c}
                    className={`tv-pill-option ${advanced.mfCategory === c ? 'selected' : ''}`}
                    onClick={() => {
                      setAdvanced({ mfCategory: c });
                      setActiveDropdown(null);
                    }}
                  >
                    <span>{c === 'all' ? 'All Categories' : c}</span>
                    {advanced.mfCategory === c && <Check size={13} />}
                  </div>
                ))}
              </PillDropdown>
            </div>

            {/* AMC / Fund House Pill */}
            <div className="tv-filter-pill-wrapper">
              <button
                ref={mfAmcBtnRef}
                className={`tv-filter-pill ${advanced.brand && advanced.brand !== 'all' ? 'active' : ''}`}
                onClick={() => toggleDropdown('mf_amc')}
              >
                <span>AMC: {advanced.brand === 'all' || !advanced.brand ? 'All' : advanced.brand}</span>
                <ChevronDown size={11} style={{ opacity: 0.6 }} />
              </button>
              <PillDropdown
                isOpen={activeDropdown === 'mf_amc'}
                onClose={() => setActiveDropdown(null)}
                triggerRef={mfAmcBtnRef}
                width={200}
              >
                {['all', 'PPFAS', 'HDFC', 'Nippon', 'Mirae Asset', 'SBI', 'ICICI'].map((a) => (
                  <div
                    key={a}
                    className={`tv-pill-option ${advanced.brand === a ? 'selected' : ''}`}
                    onClick={() => {
                      setAdvanced({ brand: a });
                      setActiveDropdown(null);
                    }}
                  >
                    <span>{a === 'all' ? 'All AMCs' : a}</span>
                    {advanced.brand === a && <Check size={13} />}
                  </div>
                ))}
              </PillDropdown>
            </div>

            {/* Expense Ratio (Base + Total) Pill */}
            <div className="tv-filter-pill-wrapper">
              <button
                ref={mfExpenseBtnRef}
                className={`tv-filter-pill ${advanced.maxExpenseRatio !== null && advanced.maxExpenseRatio !== undefined ? 'active' : ''}`}
                onClick={() => toggleDropdown('mf_expense')}
              >
                <span>Exp Ratio (Base+Total): {advanced.maxExpenseRatio ? `≤ ${advanced.maxExpenseRatio}%` : 'All'}</span>
                <ChevronDown size={11} style={{ opacity: 0.6 }} />
              </button>
              <PillDropdown
                isOpen={activeDropdown === 'mf_expense'}
                onClose={() => setActiveDropdown(null)}
                triggerRef={mfExpenseBtnRef}
                width={220}
              >
                {[
                  { label: 'Any Expense Ratio', val: null },
                  { label: '≤ 0.50% (Cat Low)', val: 0.50 },
                  { label: '≤ 0.70% (Direct Plan)', val: 0.70 },
                  { label: '≤ 1.00%', val: 1.00 },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`tv-pill-option ${advanced.maxExpenseRatio === item.val ? 'selected' : ''}`}
                    onClick={() => {
                      setAdvanced({ maxExpenseRatio: item.val });
                      setActiveDropdown(null);
                    }}
                  >
                    <span>{item.label}</span>
                    {advanced.maxExpenseRatio === item.val && <Check size={13} />}
                  </div>
                ))}
              </PillDropdown>
            </div>

            {/* Sharpe Ratio Pill */}
            <div className="tv-filter-pill-wrapper">
              <button
                ref={mfSharpeBtnRef}
                className={`tv-filter-pill ${advanced.minSharpeRatio !== null && advanced.minSharpeRatio !== undefined ? 'active' : ''}`}
                onClick={() => toggleDropdown('mf_sharpe')}
              >
                <span>Sharpe: {advanced.minSharpeRatio ? `≥ ${advanced.minSharpeRatio}` : 'All'}</span>
                <ChevronDown size={11} style={{ opacity: 0.6 }} />
              </button>
              <PillDropdown
                isOpen={activeDropdown === 'mf_sharpe'}
                onClose={() => setActiveDropdown(null)}
                triggerRef={mfSharpeBtnRef}
                width={200}
              >
                {[
                  { label: 'Any Sharpe Ratio', val: null },
                  { label: '≥ 1.0 (Above Avg)', val: 1.0 },
                  { label: '≥ 1.3 (High Alpha)', val: 1.3 },
                  { label: '≥ 1.5 (Top Decile)', val: 1.5 },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`tv-pill-option ${advanced.minSharpeRatio === item.val ? 'selected' : ''}`}
                    onClick={() => {
                      setAdvanced({ minSharpeRatio: item.val });
                      setActiveDropdown(null);
                    }}
                  >
                    <span>{item.label}</span>
                    {advanced.minSharpeRatio === item.val && <Check size={13} />}
                  </div>
                ))}
              </PillDropdown>
            </div>

            {/* 3Y Return % Pill */}
            <div className="tv-filter-pill-wrapper">
              <button
                ref={mfCagr3yBtnRef}
                className={`tv-filter-pill ${advanced.minCagr3y !== null && advanced.minCagr3y !== undefined ? 'active' : ''}`}
                onClick={() => toggleDropdown('mf_cagr3y')}
              >
                <span>3Y CAGR: {advanced.minCagr3y ? `≥ ${advanced.minCagr3y}%` : 'All'}</span>
                <ChevronDown size={11} style={{ opacity: 0.6 }} />
              </button>
              <PillDropdown
                isOpen={activeDropdown === 'mf_cagr3y'}
                onClose={() => setActiveDropdown(null)}
                triggerRef={mfCagr3yBtnRef}
                width={200}
              >
                {[
                  { label: 'Any 3Y Return', val: null },
                  { label: '≥ 15% CAGR', val: 15 },
                  { label: '≥ 20% CAGR', val: 20 },
                  { label: '≥ 25% CAGR', val: 25 },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`tv-pill-option ${advanced.minCagr3y === item.val ? 'selected' : ''}`}
                    onClick={() => {
                      setAdvanced({ minCagr3y: item.val });
                      setActiveDropdown(null);
                    }}
                  >
                    <span>{item.label}</span>
                    {advanced.minCagr3y === item.val && <Check size={13} />}
                  </div>
                ))}
              </PillDropdown>
            </div>
          </>
        )}

        {/* Add Filter (+) Button */}
        <button
          className="tv-filter-pill"
          onClick={() => setFilterModalOpen(true)}
          title="Add filter parameter"
          style={{ width: 30, height: 30, padding: 0, justifyContent: 'center' }}
        >
          <span style={{ fontSize: 15, fontWeight: 600 }}>+</span>
        </button>

        {/* Reset / Actions (•••) */}
        <div className="tv-filter-pill-wrapper">
          <button
            ref={moreBtnRef}
            className="tv-filter-pill"
            onClick={() => toggleDropdown('more')}
            title="More filter actions"
            style={{ width: 30, height: 30, padding: 0, justifyContent: 'center' }}
          >
            <span style={{ fontSize: 13, letterSpacing: 1 }}>•••</span>
          </button>
          <PillDropdown
            isOpen={activeDropdown === 'more'}
            onClose={() => setActiveDropdown(null)}
            triggerRef={moreBtnRef}
            width={180}
            align="right"
          >
            <div
              className="tv-pill-option"
              onClick={() => {
                resetFilters();
                setActiveDropdown(null);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f23645' }}>
                <RotateCcw size={13} />
                <span>Reset All Filters</span>
              </div>
            </div>
            <div
              className="tv-pill-option"
              onClick={() => {
                onExportCSV();
                setActiveDropdown(null);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Download size={13} />
                <span>Export to CSV</span>
              </div>
            </div>
          </PillDropdown>
        </div>
      </div>

      {/* Optional AI Natural Language Search Prompt Bar */}
      {showAiSearch && (
        <form
          onSubmit={handleAiSubmit}
          style={{
            padding: '4px 20px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--bg-app)',
          }}
        >
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--bg-surface-elevated)',
              border: '1px solid #c084fc',
              borderRadius: 'var(--radius-full)',
              padding: '0 14px',
              height: 34,
            }}
          >
            <Sparkles size={14} style={{ color: '#c084fc' }} />
            <input
              type="text"
              autoFocus
              placeholder="Ask AI: e.g. 'Show me large cap tech stocks with low P/E and high dividend'"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: 13,
              }}
            />
            {aiPrompt && (
              <button
                type="button"
                onClick={() => setAiPrompt('')}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={13} />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="tv-prominent-filters-btn active"
            style={{ height: 34, padding: '0 14px', borderRadius: 'var(--radius-full)' }}
          >
            Apply
          </button>
        </form>
      )}

      {/* Row 3: Views Toggle, Category Tabs Strip, and Action Toolbar */}
      <div className="tv-tabs-bar-row">
        <div className="tv-tabs-left">
          {/* View Mode Icons: [Table] [Chart Preview] [Heatmap] */}
          <div className="tv-views-group">
            <button
              className={`tv-view-btn ${viewMode === 'table' && !isDrawerOpen ? 'active' : ''}`}
              onClick={() => {
                setViewMode('table');
              }}
              title="Table View (Full Screen)"
            >
              <TableIcon size={14} />
            </button>
            <button
              className={`tv-view-btn ${isDrawerOpen ? 'active' : ''}`}
              onClick={() => {
                if (isDrawerOpen) {
                  useLayoutStore.getState().setDrawerOpen(false);
                } else {
                  setViewMode('chart');
                }
              }}
              title="Split View / Symbol Details & Chart Preview"
            >
              <LineChart size={14} />
            </button>
            <button
              className={`tv-view-btn ${viewMode === 'matrix' ? 'active' : ''}`}
              onClick={() => setViewMode(viewMode === 'matrix' ? 'table' : 'matrix')}
              title="Stock Heatmap View"
            >
              <LayoutGrid size={14} />
            </button>
          </div>

          {/* View Category Tabs (Dynamic based on selected asset class) */}
          <div className="tv-tabs-group">
            {(SCREENER_CONFIG[screenerType]?.tabs || HONBA_TABS).map((tab) => (
              <button
                key={tab.id}
                className={`tv-category-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Toolbar: Export, Refresh, Fullscreen */}
        <div className="tv-tabs-right">
          {/* Export CSV */}
          <button
            className="tv-icon-circle-btn"
            onClick={onExportCSV}
            title="Export Screen to CSV"
            style={{ width: 28, height: 28 }}
          >
            <Download size={13} />
          </button>

          {/* Refresh Button */}
          <button
            className="tv-icon-circle-btn"
            onClick={() => useScreenerStore.getState().refreshFromDataLayer()}
            title="Refresh Market Data"
            style={{ width: 28, height: 28 }}
          >
            <RotateCw size={13} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            className="tv-icon-circle-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Screener'}
            style={{ width: 28, height: 28 }}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export const HbFilterBar = FilterBar;

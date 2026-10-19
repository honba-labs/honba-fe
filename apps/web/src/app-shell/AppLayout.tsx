import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  SlidersHorizontal,
  BarChart2,
  BrainCircuit,
  PlayCircle,
  BookOpen,
  Settings,
  Bell,
  Sun,
  Moon,
  Search,
  CheckCircle,
  AlertCircle,
  X,
  Plus,
  Activity,
} from 'lucide-react';
import { useEquityStore } from '../core/store/equityStore';
import { useNotifications } from '../core/store/notifications';
import { themeEngine } from '../core/theme-engine';
import { SearchModal } from './SearchModal';
import { DepositModal } from './DepositModal';
import { WithdrawModal } from './WithdrawModal';
import './AppLayout.css';

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'dark' | 'light'>(themeEngine.current);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { setSearchModalOpen, setFundsModalOpen, simulateTick, tradingMode, setTradingMode } = useEquityStore();
  const { rows, remove, clearAll } = useNotifications();

  // Subtle real-time tick updates
  useEffect(() => {
    themeEngine.applyToDOM();
    const tickInterval = setInterval(() => {
      simulateTick();
    }, 2800);
    return () => clearInterval(tickInterval);
  }, [simulateTick]);

  const handleToggleTheme = () => {
    themeEngine.toggle();
    setTheme(themeEngine.current);
  };

  const getHeaderTitle = () => {
    const p = location.pathname;
    if (p === '/' || p === '/portfolio') return 'Portfolio & Accounts';
    if (p === '/screener') return 'Stock Screener';
    if (p.startsWith('/instrument')) return 'Instruments · Asset Deep-Dive';
    if (p === '/workbench') return 'Trading Workbench';
    if (p === '/strategy-studio' || p === '/algodesigner') return 'Strategy Studio';
    if (p === '/simulator') return 'Simulation & Backtest Replay';
    if (p === '/tradebook') return 'Tradebook & Session Journal';
    if (p === '/markets') return 'Markets Overview';
    if (p === '/trade') return `Terminal · ${useEquityStore.getState().activeTicker}`;
    if (p === '/wallet') return 'Funds & Margin';
    if (p === '/settings') return 'Settings & Preferences';
    return 'Honba';
  };

  return (
    <div className="wunder-app">
      {/* 1. Primary Slim Left Icon Navigation (68px) */}
      <aside className="wunder-nav-primary">
        <div className="wunder-logo-wrapper" onClick={() => navigate('/')}>
          <div className="wunder-logo-mark" title="Honba Equities">
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
              <path
                d="M6 8L16 3L26 8V24L16 29L6 24V8Z"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="M16 11V21M11 14L16 17.5L21 14"
                stroke="var(--primary)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Primary nav links in exact user-specified order:
            1. Portfolio (Landing)
            2. Screener
            3. Workbench
            4. Strategy Studio
            5. Simulator
            6. Tradebook */}
        <nav className="wunder-nav-links">
          <NavLink
            to="/portfolio"
            className={({ isActive }) =>
              `wunder-nav-item ${isActive || location.pathname === '/' ? 'active' : ''}`
            }
            title="Portfolio & Accounts"
          >
            <LayoutGrid size={20} />
          </NavLink>

          <NavLink
            to="/screener"
            className={({ isActive }) => `wunder-nav-item ${isActive ? 'active' : ''}`}
            title="Stock Screener"
          >
            <SlidersHorizontal size={20} />
          </NavLink>

          <NavLink
            to="/instruments"
            className={({ isActive }) =>
              `wunder-nav-item ${isActive || location.pathname.startsWith('/instrument') ? 'active' : ''}`
            }
            title="Instruments & Assets"
          >
            <Activity size={20} />
          </NavLink>

          <NavLink
            to="/workbench"
            className={({ isActive }) => `wunder-nav-item ${isActive ? 'active' : ''}`}
            title="Trading Workbench"
          >
            <BarChart2 size={20} />
          </NavLink>

          <NavLink
            to="/strategy-studio"
            className={({ isActive }) =>
              `wunder-nav-item ${isActive || location.pathname.startsWith('/algodesigner') ? 'active' : ''}`
            }
            title="Strategy Studio"
          >
            <BrainCircuit size={20} />
          </NavLink>

          <NavLink
            to="/simulator"
            className={({ isActive }) => `wunder-nav-item ${isActive ? 'active' : ''}`}
            title="Simulator & Backtest Replay"
          >
            <PlayCircle size={20} />
          </NavLink>

          <NavLink
            to="/tradebook"
            className={({ isActive }) => `wunder-nav-item ${isActive ? 'active' : ''}`}
            title="Tradebook & Session Journal"
          >
            <BookOpen size={20} />
          </NavLink>
        </nav>

        {/* Bottom Navigation */}
        <div className="wunder-nav-bottom">
          <button
            type="button"
            className="wunder-nav-item wunder-icon-btn"
            onClick={handleToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <NavLink
            to="/settings"
            className={({ isActive }) => `wunder-nav-item ${isActive ? 'active' : ''}`}
            title="Settings"
          >
            <Settings size={19} />
          </NavLink>
          <div
            className="wunder-user-avatar"
            onClick={() => navigate('/settings')}
            title="Honba Trader (AM) · Demat Account"
          >
            AM
          </div>
        </div>
      </aside>

      {/* 2. Main Wrapper */}
      <div className="wunder-main-wrapper">
        {/* Top Header Bar */}
        <header className="wunder-header">
          <div className="wunder-header-left">
            <h1 className="wunder-header-title">{getHeaderTitle()}</h1>
          </div>

          <div className="wunder-header-center">
            <div className="wunder-search-box" onClick={() => setSearchModalOpen(true)}>
              <Search size={15} color="var(--fg-muted)" />
              <span className="wunder-search-placeholder">Search stocks, indices (e.g. NSE:RELIANCE)...</span>
              <kbd className="wunder-kbd">⌘K</kbd>
            </div>
          </div>

          <div className="wunder-header-right">
            {/* Mutually exclusive Trading Environment Selector */}
            <div className="wunder-mode-group" role="tablist" aria-label="Trading Mode">
              <button
                type="button"
                role="tab"
                aria-selected={tradingMode === 'paper'}
                className={`wunder-mode-btn ${tradingMode === 'paper' ? 'active-paper' : ''}`}
                onClick={() => {
                  setTradingMode('paper');
                  useNotifications.getState().push({
                    severity: 'info',
                    title: 'Trading Mode',
                    message: 'Active: PaperTrading',
                  });
                }}
                title="Switch to PaperTrading"
              >
                <span className={tradingMode === 'paper' ? 'wunder-pill-dot-warning' : 'wunder-mode-dot-inactive'} />
                <span>PaperTrading</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={tradingMode === 'live'}
                className={`wunder-mode-btn ${tradingMode === 'live' ? 'active-live' : ''}`}
                onClick={() => {
                  setTradingMode('live');
                  useNotifications.getState().push({
                    severity: 'info',
                    title: 'Trading Mode',
                    message: 'Active: Live (NSE)',
                  });
                }}
                title="Switch to Live (NSE)"
              >
                <span className={tradingMode === 'live' ? 'pulse-indicator' : 'wunder-mode-dot-inactive'} />
                <span>Live (NSE)</span>
              </button>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-sm wunder-deposit-btn"
              onClick={() => setFundsModalOpen(true)}
            >
              <Plus size={14} /> Add Funds
            </button>

            {/* Notification Bell */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="wunder-header-icon-btn"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                title="Notifications"
              >
                <Bell size={17} />
                {rows.length > 0 && <span className="wunder-bell-badge">{rows.length}</span>}
              </button>

              {notificationsOpen && (
                <div className="wunder-notifications-panel card">
                  <div className="wunder-notifications-header">
                    <span style={{ fontWeight: 600 }}>Notifications & Fills</span>
                    {rows.length > 0 && (
                      <button onClick={clearAll} className="btn btn-ghost btn-sm" style={{ fontSize: '11px' }}>
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="wunder-notifications-body">
                    {rows.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: '13px' }}>
                        No notifications
                      </div>
                    ) : (
                      rows.map((row) => (
                        <div key={row.cid} className="wunder-notification-item">
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            {row.severity === 'error' ? (
                              <AlertCircle size={15} color="var(--bearish)" />
                            ) : (
                              <CheckCircle size={15} color="var(--bullish)" />
                            )}
                            <div style={{ flex: 1 }}>
                              {row.title && <div style={{ fontWeight: 600, fontSize: '12px' }}>{row.title}</div>}
                              <div style={{ fontSize: '12px', color: 'var(--fg-secondary)' }}>{row.message}</div>
                            </div>
                            <button
                              onClick={() => remove(row.cid)}
                              style={{ background: 'transparent', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content View */}
        <main className="wunder-content">
          <Outlet />
        </main>
      </div>

      {/* Global Modals */}
      <SearchModal />
      <DepositModal />
      <WithdrawModal />
    </div>
  );
}

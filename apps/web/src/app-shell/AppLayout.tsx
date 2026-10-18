import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  TrendingUp,
  BarChart2,
  Wallet,
  Cpu,
  Settings,
  Bell,
  Sun,
  Moon,
  Search,
  CheckCircle,
  AlertCircle,
  X,
  Plus,
  ShieldAlert,
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
  const { instruments, setSearchModalOpen, setFundsModalOpen, simulateTick } = useEquityStore();
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

  // Contextual information based on current route
  const getContextInfo = () => {
    const path = location.pathname;
    if (path === '/' || path === '/portfolio') {
      return {
        title: 'Overview',
        subtitle: 'Equity portfolio & holdings',
        links: [
          { name: 'Holdings', path: '/' },
          { name: 'Watchlist', path: '/markets', badge: '6' },
          { name: 'Price alerts', path: '/', badge: '2' },
        ],
      };
    }
    if (path.startsWith('/markets') || path.startsWith('/screener')) {
      return {
        title: 'Markets',
        subtitle: 'NSE & Global Equities Screener',
        links: [
          { name: 'Indices overview', path: '/markets' },
          { name: 'NIFTY 50', path: '/markets' },
          { name: 'Top gainers', path: '/markets' },
          { name: '52W High / Low', path: '/markets' },
          { name: 'Advance / Decline', path: '/markets' },
        ],
      };
    }
    if (path.startsWith('/trade')) {
      return {
        title: 'Trade',
        subtitle: 'NSE / BSE Trading Terminal',
        links: [
          { name: 'NSE:RELIANCE', path: '/trade' },
          { name: 'NSE:TCS', path: '/trade' },
          { name: 'NSE:INFY', path: '/trade' },
          { name: 'Order book', path: '/trade' },
        ],
      };
    }
    if (path.startsWith('/wallet')) {
      return {
        title: 'Funds & Margin',
        subtitle: 'Trading limits and Demat holdings',
        links: [
          { name: 'Funds overview', path: '/wallet' },
          { name: 'Add funds', path: '/wallet' },
          { name: 'Withdraw payout', path: '/wallet' },
          { name: 'Demat ledger', path: '/wallet' },
        ],
      };
    }
    return {
      title: 'Honba',
      subtitle: 'Algorithmic Equities Engine',
      links: [
        { name: 'Workbench', path: '/workbench' },
        { name: 'Settings', path: '/settings' },
      ],
    };
  };

  const contextInfo = getContextInfo();
  const watchlist = Object.values(instruments).filter((a) => a.isWatchlist);

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

        <nav className="wunder-nav-links">
          <NavLink
            to="/"
            className={({ isActive }) => `wunder-nav-item ${isActive && location.pathname === '/' ? 'active' : ''}`}
            title="Equity Portfolio"
          >
            <LayoutGrid size={20} />
          </NavLink>
          <NavLink
            to="/markets"
            className={({ isActive }) => `wunder-nav-item ${isActive ? 'active' : ''}`}
            title="Markets & Indices"
          >
            <TrendingUp size={20} />
          </NavLink>
          <NavLink
            to="/trade"
            className={({ isActive }) => `wunder-nav-item ${isActive ? 'active' : ''}`}
            title="Trading Terminal"
          >
            <BarChart2 size={20} />
          </NavLink>
          <NavLink
            to="/wallet"
            className={({ isActive }) => `wunder-nav-item ${isActive ? 'active' : ''}`}
            title="Funds & Margins"
          >
            <Wallet size={20} />
          </NavLink>
          <NavLink
            to="/workbench"
            className={({ isActive }) => `wunder-nav-item ${isActive ? 'active' : ''}`}
            title="Algo Workbench"
          >
            <Cpu size={20} />
          </NavLink>
        </nav>

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
          <div className="wunder-user-avatar" title="Honba Trader (Demat)">
            HB
          </div>
        </div>
      </aside>

      {/* 2. Secondary Contextual Sub-Sidebar (230px) */}
      <aside className="wunder-nav-sub">
        <div className="wunder-sub-header">
          <h2 className="wunder-sub-title">{contextInfo.title}</h2>
          <p className="wunder-sub-subtitle">{contextInfo.subtitle}</p>
        </div>

        <div className="wunder-sub-menu">
          {contextInfo.links.map((link) => (
            <div
              key={link.name}
              className={`wunder-sub-link ${location.pathname === link.path ? 'active' : ''}`}
              onClick={() => navigate(link.path)}
            >
              <span className="wunder-sub-link-label">{link.name}</span>
              {link.badge && <span className="wunder-sub-link-badge">{link.badge}</span>}
            </div>
          ))}
        </div>

        {/* Live Equities Watchlist */}
        <div className="wunder-sub-watchlist">
          <div className="wunder-watchlist-title">Equities Watchlist</div>
          <div className="wunder-watchlist-list">
            {watchlist.slice(0, 5).map((inst) => (
              <div
                key={inst.symbol}
                className="wunder-watchlist-row"
                onClick={() => {
                  useEquityStore.getState().setActiveTicker(inst.ticker);
                  navigate('/trade');
                }}
              >
                <div className="wunder-watchlist-coin">
                  <div className="wunder-coin-badge" style={{ backgroundColor: inst.color }}>
                    {inst.symbol.slice(0, 3)}
                  </div>
                  <div>
                    <span className="wunder-coin-sym">{inst.symbol}</span>
                    <span style={{ fontSize: '10px', color: 'var(--fg-muted)', display: 'block' }}>
                      {inst.exchange}
                    </span>
                  </div>
                </div>
                <div className="wunder-watchlist-prices">
                  <span className="num wunder-watchlist-price">
                    {inst.currency === 'INR' ? '₹' : '$'}
                    {inst.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span
                    className={`num wunder-watchlist-change ${
                      inst.change24h >= 0 ? 'color-bullish' : 'color-bearish'
                    }`}
                  >
                    {inst.change24h >= 0 ? '+' : ''}
                    {inst.change24h}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Paper Trading Environment Card */}
        <div className="wunder-env-card">
          <div className="wunder-env-icon">
            <ShieldAlert size={14} color="var(--warning)" />
            <span className="wunder-env-title">Paper Trading Mode</span>
          </div>
          <p className="wunder-env-text">
            Simulated equities market. Orders execute against the local matching engine without real cash.
          </p>
        </div>
      </aside>

      {/* 3. Main Wrapper */}
      <div className="wunder-main-wrapper">
        {/* Top Header Bar */}
        <header className="wunder-header">
          <div className="wunder-header-left">
            <h1 className="wunder-header-title">
              {location.pathname === '/' || location.pathname === '/portfolio'
                ? 'Portfolio'
                : location.pathname === '/markets' || location.pathname === '/screener'
                ? 'Markets overview'
                : location.pathname === '/trade'
                ? `Terminal · ${useEquityStore.getState().activeTicker}`
                : location.pathname === '/wallet'
                ? 'Funds & Margin'
                : 'Workbench'}
            </h1>
          </div>

          <div className="wunder-header-center">
            <div className="wunder-search-box" onClick={() => setSearchModalOpen(true)}>
              <Search size={15} color="var(--fg-muted)" />
              <span className="wunder-search-placeholder">Search stocks, indices (e.g. NSE:RELIANCE)...</span>
              <kbd className="wunder-kbd">⌘K</kbd>
            </div>
          </div>

          <div className="wunder-header-right">
            <div className="wunder-pill-env">
              <span className="wunder-pill-dot-warning" />
              <span>Simulated · Paper trading</span>
            </div>

            <div className="wunder-pill-feed">
              <span className="pulse-indicator" />
              <span>NSE feed · live</span>
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

            <div className="wunder-header-user" onClick={() => navigate('/settings')}>
              <div className="wunder-user-circle">AM</div>
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

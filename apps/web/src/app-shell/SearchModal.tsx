import React, { useState, useEffect } from 'react';
import { Search, X, TrendingUp, BarChart2, Wallet, LayoutGrid, SlidersHorizontal, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEquityStore } from '../core/store/equityStore';

export function SearchModal() {
  const { isSearchModalOpen, setSearchModalOpen, instruments, setActiveTicker } = useEquityStore();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen(!isSearchModalOpen);
      }
      if (e.key === 'Escape' && isSearchModalOpen) {
        setSearchModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchModalOpen, setSearchModalOpen]);

  if (!isSearchModalOpen) return null;

  const filtered = Object.values(instruments).filter(
    (a) =>
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.symbol.toLowerCase().includes(query.toLowerCase()) ||
      a.ticker.toLowerCase().includes(query.toLowerCase()) ||
      a.sector.toLowerCase().includes(query.toLowerCase())
  );

  const quickPages = [
    { name: 'Equity Portfolio', path: '/', icon: <LayoutGrid size={15} /> },
    { name: 'Stock Screener', path: '/screener', icon: <SlidersHorizontal size={15} /> },
    { name: 'Instruments Deep-Dive', path: '/instruments', icon: <Activity size={15} /> },
    { name: 'NSE Market & Indices', path: '/markets', icon: <TrendingUp size={15} /> },
    { name: 'Trading Terminal (NSE:RELIANCE)', path: '/trade', icon: <BarChart2 size={15} /> },
    { name: 'Funds & Margin Overview', path: '/wallet', icon: <Wallet size={15} /> },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '80px',
        zIndex: 1000,
      }}
      onClick={() => setSearchModalOpen(false)}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'var(--bg-card)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-strong)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
            gap: '12px',
          }}
        >
          <Search size={18} color="var(--fg-muted)" />
          <input
            autoFocus
            type="text"
            placeholder="Search stock, ticker or index (e.g. NSE:RELIANCE, TCS, NIFTY)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--fg-primary)',
              fontSize: '15px',
              fontFamily: 'var(--font-sans)',
            }}
          />
          <button
            onClick={() => setSearchModalOpen(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--fg-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '8px' }}>
          {query.trim() === '' && (
            <div style={{ marginBottom: '12px' }}>
              <div
                style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: 'var(--fg-muted)',
                  letterSpacing: '0.05em',
                }}
              >
                Quick Navigation
              </div>
              {quickPages.map((page) => (
                <div
                  key={page.path}
                  onClick={() => {
                    navigate(page.path);
                    setSearchModalOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    color: 'var(--fg-primary)',
                    fontSize: '13px',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <span style={{ color: 'var(--fg-muted)' }}>{page.icon}</span>
                  <span>{page.name}</span>
                </div>
              ))}
            </div>
          )}

          <div>
            <div
              style={{
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: 'var(--fg-muted)',
                letterSpacing: '0.05em',
              }}
            >
              Equities & Stocks
            </div>
            {filtered.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: '13px' }}>
                No equities found matching "{query}"
              </div>
            ) : (
              filtered.map((inst) => (
                <div
                  key={inst.symbol}
                  onClick={() => {
                    setActiveTicker(inst.ticker);
                    navigate('/trade');
                    setSearchModalOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: inst.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '9px',
                        fontWeight: 700,
                        color: '#ffffff',
                      }}
                    >
                      {inst.exchange}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--fg-primary)', fontSize: '13px' }}>
                        {inst.ticker}
                      </div>
                      <div style={{ color: 'var(--fg-muted)', fontSize: '11px' }}>
                        {inst.name} · {inst.sector}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="num" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fg-primary)' }}>
                      {inst.currency === 'INR' ? '₹' : '$'}
                      {inst.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div
                      className="num"
                      style={{
                        fontSize: '11px',
                        color: inst.change24h >= 0 ? 'var(--bullish)' : 'var(--bearish)',
                      }}
                    >
                      {inst.change24h >= 0 ? '+' : ''}
                      {inst.change24h}%
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

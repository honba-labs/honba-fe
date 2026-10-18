// Run Panel - backtest execution and metrics
// Mirrors honba-frontend apps/algodesigner/panels.tsx (RunPanel)

import React, { useMemo, useState } from 'react';
import { Play, RefreshCw, Shield, TrendingDown, TrendingUp } from 'lucide-react';

import type { BacktestResponse, BacktestMetrics } from '../domain';
import { EquityDrawdownChart } from './EquityDrawdownChart';

export interface RunPanelProps {
  status: string;
  runId: string | null;
  response: BacktestResponse | null;
  error: string | null;
  onRun: (seed?: number) => void;
  onViewResults?: () => void;
}

export const RunPanel: React.FC<RunPanelProps> = ({ status, runId, response, error, onRun, onViewResults }) => {
  const [seed, setSeed] = useState(42);
  const isRunning = status === 'pending' || status === 'running';
  const metrics = response?.metrics;

  return (
    <div style={{ padding: 20, maxWidth: 960, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Event-Driven Backtest Diagnostics
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Bar-level deterministic simulation executing on Honba core engine with latency & slippage modelling.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
            <span>Seed:</span>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value) || 0)}
              style={{
                width: 65,
                padding: '4px 8px',
                background: 'var(--bg-surface, #1e222d)',
                border: '1px solid var(--border-subtle, #2a2e39)',
                borderRadius: 'var(--radius-sm, 4px)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-family-mono)',
                fontSize: 12,
              }}
            />
          </div>

          <button
            type="button"
            className="shortlist-btn shortlist-btn-primary"
            onClick={() => onRun(seed)}
            disabled={isRunning}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px' }}
          >
            <Play size={14} />
            <span>{isRunning ? 'Simulating...' : 'Run Backtest'}</span>
          </button>

          {response?.validation && onViewResults ? (
            <button
              type="button"
              className="shortlist-btn"
              onClick={onViewResults}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px' }}
            >
              <Shield size={13} style={{ color: 'var(--accent-primary, #2962ff)' }} />
              <span>Trust Badges</span>
            </button>
          ) : null}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 14px',
          borderRadius: 'var(--radius-md, 6px)',
          background: 'var(--bg-surface, #1e222d)',
          border: '1px solid var(--border-subtle, #2a2e39)',
          fontSize: 12,
        }}
      >
        <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
        <span
          style={{
            padding: '2px 8px',
            borderRadius: 12,
            fontSize: 11,
            fontWeight: 600,
            background:
              status === 'completed'
                ? 'rgba(8, 153, 129, 0.15)'
                : status === 'failed'
                ? 'rgba(242, 54, 69, 0.15)'
                : isRunning
                ? 'rgba(41, 98, 255, 0.15)'
                : 'var(--bg-surface-elevated, #2a2e39)',
            color:
              status === 'completed'
                ? 'var(--bullish, #089981)'
                : status === 'failed'
                ? 'var(--bearish, #f23645)'
                : isRunning
                ? 'var(--accent-primary, #2962ff)'
                : 'var(--text-muted)',
          }}
        >
          {status.toUpperCase()}
        </span>

        {runId ? (
          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-family-mono)', fontSize: 11 }}>
            Run ID: {runId}
          </span>
        ) : null}
      </div>

      {error ? (
        <div
          style={{
            padding: 14,
            borderRadius: 'var(--radius-md, 6px)',
            background: 'rgba(242, 54, 69, 0.1)',
            border: '1px solid var(--bearish, #f23645)',
            color: 'var(--bearish, #f23645)',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 18 }}>✕</span>
          <span>{error}</span>
        </div>
      ) : null}

      {metrics ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <div
            style={{
              padding: 12,
              borderRadius: 'var(--radius-md, 6px)',
              background: 'var(--bg-surface, #1e222d)',
              border: '1px solid var(--border-subtle, #2a2e39)',
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Sharpe Ratio</div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                marginTop: 4,
                color: metrics.sharpe >= 1 ? 'var(--bullish, #089981)' : metrics.sharpe < 0 ? 'var(--bearish, #f23645)' : 'var(--text-primary)',
              }}
            >
              {metrics.sharpe.toFixed(2)}
            </div>
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 'var(--radius-md, 6px)',
              background: 'var(--bg-surface, #1e222d)',
              border: '1px solid var(--border-subtle, #2a2e39)',
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Max Drawdown</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: 'var(--bearish, #f23645)' }}>
              -{(metrics.max_drawdown * 100).toFixed(2)}%
            </div>
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 'var(--radius-md, 6px)',
              background: 'var(--bg-surface, #1e222d)',
              border: '1px solid var(--border-subtle, #2a2e39)',
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Total Return</div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                marginTop: 4,
                color: metrics.total_return >= 0 ? 'var(--bullish, #089981)' : 'var(--bearish, #f23645)',
              }}
            >
              {metrics.total_return >= 0 ? '+' : ''}{(metrics.total_return * 100).toFixed(2)}%
            </div>
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 'var(--radius-md, 6px)',
              background: 'var(--bg-surface, #1e222d)',
              border: '1px solid var(--border-subtle, #2a2e39)',
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Net PnL</div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                marginTop: 4,
                fontFamily: 'var(--font-family-mono)',
                color: metrics.net_pnl >= 0 ? 'var(--bullish, #089981)' : 'var(--bearish, #f23645)',
              }}
            >
              ₹{metrics.net_pnl.toLocaleString()}
            </div>
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 'var(--radius-md, 6px)',
              background: 'var(--bg-surface, #1e222d)',
              border: '1px solid var(--border-subtle, #2a2e39)',
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Total Trades</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: 'var(--text-primary)' }}>
              {metrics.trades}
            </div>
          </div>
        </div>
      ) : null}

      {(status === 'completed' || metrics) && (
        <EquityDrawdownChart metrics={metrics} />
      )}
    </div>
  );
};
// Ops Panel - Live Trading Operations
// Mirrors honba-frontend apps/algodesigner/panels.tsx (OpsPanel)

import React from 'react';
import { RefreshCw, Flame, Shield, ShieldAlert } from 'lucide-react';

import { useOpsStore } from '../ops-store';
import type { ApiClient } from '../../../core/api/client';

export interface OpsPanelProps {
  client: ApiClient;
  onRefresh?: () => void;
  onClose?: () => void;
}

export const OpsPanel: React.FC<OpsPanelProps> = ({ client, onRefresh, onClose }) => {
  const ops = useOpsStore();

  const handleModeChange = (targetMode: 'paper' | 'signal_only' | 'live') => {
    if (targetMode === 'live' && !ops.approved) {
      if (!window.confirm('WARNING: Live mode initiates real capital order routing to broker venues. Confirm switch to Live execution?')) {
        return;
      }
    }
    ops.setMode(targetMode);
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      onRefresh();
    } else {
      await ops.refresh(client);
    }
  };

  const handleCloseAll = async () => {
    if (window.confirm('EMERGENCY: Are you sure you want to close ALL open positions immediately at market?')) {
      if (onClose) {
        onClose();
      } else {
        await ops.closePositions(client);
      }
    }
  };

  const activeBadge = ops.badge();

  return (
    <div style={{ padding: 20, maxWidth: 960, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Operations & Live Venue Console (ADR 0029 S6)
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Broker execution router, emergency risk latches, and real-time order lifecycle management.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="shortlist-btn"
            onClick={() => void handleRefresh()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px' }}
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="shortlist-btn"
            onClick={() => void handleCloseAll()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              color: 'var(--bearish, #f23645)',
              borderColor: 'var(--bearish, #f23645)',
            }}
          >
            <Flame size={13} />
            <span>Emergency Close All</span>
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          padding: 16,
          borderRadius: 'var(--radius-md, 6px)',
          background: 'var(--bg-surface, #1e222d)',
          border: '1px solid var(--border-subtle, #2a2e39)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Execution Mode:</span>
          {(['paper', 'signal_only', 'live'] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={ops.mode === m ? 'shortlist-btn shortlist-btn-primary' : 'shortlist-btn'}
              onClick={() => handleModeChange(m)}
              style={{
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: ops.mode === m ? 600 : 400,
                color:
                  ops.mode === m
                    ? '#fff'
                    : m === 'live'
                    ? 'var(--accent-gold, #f7a600)'
                    : 'var(--text-primary)',
              }}
            >
              {m === 'paper' ? 'Paper Sim' : m === 'signal_only' ? 'Signal Only' : 'Live Venue'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => ops.setKillSwitch(!ops.killSwitch)}
            aria-pressed={ops.killSwitch}
            aria-label={ops.killSwitch ? 'Kill switch engaged; click to re-arm the system' : 'System armed; click to engage the kill switch'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm, 4px)',
              border: `1px solid ${ops.killSwitch ? 'var(--bearish, #f23645)' : 'var(--border-subtle, #2a2e39)'}`,
              background: ops.killSwitch ? 'rgba(242, 54, 69, 0.2)' : 'var(--bg-surface-elevated, #2a2e39)',
              color: ops.killSwitch ? 'var(--bearish, #f23645)' : 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            {ops.killSwitch ? <ShieldAlert size={16} /> : <Shield size={16} style={{ color: 'var(--bullish, #089981)' }} />}
            <span>{ops.killSwitch ? 'KILL SWITCH ENGAGED (BLOCKED)' : 'SYSTEM ARMED & READY'}</span>
          </button>

          <span
            style={{
              padding: '3px 8px',
              borderRadius: 4,
              fontSize: 11,
              background: activeBadge.blocked ? 'rgba(242, 54, 69, 0.15)' : 'rgba(8, 153, 129, 0.15)',
              color: activeBadge.blocked ? 'var(--bearish, #f23645)' : 'var(--bullish, #089981)',
              fontWeight: 600,
            }}
          >
            {activeBadge.label} {activeBadge.blocked ? '(BLOCKED)' : '(ACTIVE)'}
          </span>
        </div>
      </div>

      <div
        style={{
          borderRadius: 'var(--radius-md, 6px)',
          background: 'var(--bg-surface, #1e222d)',
          border: '1px solid var(--border-subtle, #2a2e39)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '10px 14px',
            borderBottom: '1px solid var(--border-subtle, #2a2e39)',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>Live Orders ({ops.orders.length})</span>
          {ops.error ? <span style={{ fontSize: 11, color: 'var(--bearish, #f23645)' }}>{ops.error}</span> : null}
        </div>

        {ops.orders.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            No pending or active orders on venue.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface-elevated, #2a2e39)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px' }}>Order ID</th>
                <th style={{ padding: '8px 12px' }}>Instrument</th>
                <th style={{ padding: '8px 12px' }}>Side</th>
                <th style={{ padding: '8px 12px' }}>Qty</th>
                <th style={{ padding: '8px 12px' }}>Type</th>
                <th style={{ padding: '8px 12px' }}>Status</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {ops.orders.map((order) => (
                <tr key={order.order_id} style={{ borderBottom: '1px solid var(--border-subtle, #2a2e39)' }}>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--font-family-mono)', color: 'var(--text-muted)' }}>
                    {order.order_id}
                  </td>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                    {order.instrument_id.symbol}.{order.instrument_id.exchange}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: 3,
                        fontSize: 10,
                        fontWeight: 700,
                        background: order.side.toLowerCase() === 'buy' ? 'rgba(8, 153, 129, 0.15)' : 'rgba(242, 54, 69, 0.15)',
                        color: order.side.toLowerCase() === 'buy' ? 'var(--bullish, #089981)' : 'var(--bearish, #f23645)',
                      }}
                    >
                      {order.side.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--font-family-mono)' }}>{order.quantity}</td>
                  <td style={{ padding: '8px 12px', textTransform: 'uppercase', fontSize: 11 }}>{order.order_type}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{order.status}</span>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    <button
                      type="button"
                      className="shortlist-btn"
                      onClick={() => void ops.cancelOrder(client, order.order_id)}
                      style={{ padding: '2px 8px', fontSize: 11, color: 'var(--bearish, #f23645)' }}
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div
        style={{
          borderRadius: 'var(--radius-md, 6px)',
          background: '#0d1117',
          border: '1px solid var(--border-subtle, #2a2e39)',
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 11, marginBottom: 4 }}>
          <span style={{ fontSize: 13 }}>▮</span>
          <span>Operations Audit Terminal</span>
        </div>

        <div style={{ maxHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {ops.log.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-family-mono)' }}>
              Ready. Listening for execution engine events...
            </div>
          ) : (
            ops.log.map((entry, idx) => (
              <div key={idx} style={{ fontSize: 11, fontFamily: 'var(--font-family-mono)', display: 'flex', gap: 8 }}>
                <span style={{ color: '#484f58' }}>{new Date(entry.ts).toLocaleTimeString()}</span>
                <span
                  style={{
                    color:
                      entry.level === 'error'
                        ? '#f85149'
                        : entry.level === 'warning'
                        ? '#d29922'
                        : '#58a6ff',
                  }}
                >
                  [{entry.level.toUpperCase()}]
                </span>
                <span style={{ color: '#c9d1d9' }}>{entry.text}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
// Results Panel - Trust Badges & Overfitting Metrics
// Mirrors honba-frontend apps/algodesigner/panels.tsx (ResultsPanel)

import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

import type { BacktestResponse } from '../domain';

interface TrustBadge {
  key: string;
  label: string;
  passed: boolean;
}

function trustBadges(validation: Record<string, unknown> | null): TrustBadge[] {
  if (!validation) return [];
  const badges: TrustBadge[] = [];
  const checks = [
    { key: 'dsr', label: 'Deflated Sharpe Ratio (DSR)', passed: Boolean(validation.dsr_passed) },
    { key: 'pbo', label: 'Probability of Backtest Overfitting (PBO)', passed: Boolean(validation.pbo_passed) },
    { key: 'holdout', label: 'Hold-Out Test', passed: Boolean(validation.holdout_passed) },
    { key: 'walk_forward', label: 'Walk-Forward Analysis', passed: Boolean(validation.walk_forward_passed) },
    { key: 'monte_carlo', label: 'Monte Carlo Resampling', passed: Boolean(validation.monte_carlo_passed) },
    { key: 'cost_stress', label: 'Cost Stress Test', passed: Boolean(validation.cost_stress_passed) },
  ];
  for (const c of checks) {
    if (c.key in validation) badges.push(c);
  }
  return badges;
}

const trustDescriptions: Record<string, string> = {
  dsr: 'Deflated Sharpe Ratio: Corrects for selection bias across multiple trial runs.',
  pbo: 'Probability of Backtest Overfitting: Likelihood of in-sample overfit underperforming OOS.',
  holdout: 'Hold-Out Test: Independent out-of-sample partition testing.',
  walk_forward: 'Walk-Forward Analysis: Rolling-window forward test validation.',
  monte_carlo: 'Monte Carlo Resampling: Randomized trade sequence drawdown testing.',
  cost_stress: 'Cost Stress: Friction tolerance under 2x-5x fee/slippage multipliers.',
};

export interface ResultsPanelProps {
  response: BacktestResponse | null;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ response }) => {
  const validation = (response as unknown as { validation?: Record<string, unknown> } | null)?.validation ?? null;
  const badges = trustBadges(validation);
  const assumptions = (response as unknown as { assumptions?: { not_modelled?: string[] } } | null)?.assumptions;

  return (
    <div style={{ padding: 20, maxWidth: 960, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
          Institutional Trust & Overfitting Badges (ADR 0029 S7)
        </h2>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
          Quantitative safeguards certifying that strategy returns are not artifacts of statistical overfit or unmodelled friction.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        {badges.map((badge) => (
          <div
            key={badge.key}
            style={{
              padding: 14,
              borderRadius: 'var(--radius-md, 6px)',
              background: 'var(--bg-surface, #1e222d)',
              border: `1px solid ${badge.passed ? 'rgba(8, 153, 129, 0.4)' : 'rgba(242, 54, 69, 0.4)'}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{badge.label}</span>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: badge.passed ? 'rgba(8, 153, 129, 0.15)' : 'rgba(242, 54, 69, 0.15)',
                  color: badge.passed ? 'var(--bullish, #089981)' : 'var(--bearish, #f23645)',
                }}
              >
                {badge.passed ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                {badge.passed ? 'PASS' : 'FAIL'}
              </span>
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {trustDescriptions[badge.key] || 'Quantitative test constraint.'}
            </div>
          </div>
        ))}

        {badges.length === 0 && (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: 24,
              borderRadius: 'var(--radius-md, 6px)',
              background: 'var(--bg-surface, #1e222d)',
              border: '1px dashed var(--border-subtle, #2a2e39)',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 13,
            }}
          >
            No validation block returned in latest response. Run a backtest or sweep to calculate DSR, PBO, and Holdout metrics.
          </div>
        )}
      </div>

      <div
        style={{
          padding: 16,
          borderRadius: 'var(--radius-md, 6px)',
          background: 'var(--bg-surface, #1e222d)',
          border: '1px solid var(--border-subtle, #2a2e39)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <AlertCircle size={15} style={{ color: 'var(--accent-gold, #f7a600)' }} />
          <h3 style={{ fontSize: 13, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
            Institutional Friction Assumptions (Not Modelled)
          </h3>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 12px' }}>
          Per ADR 0029, Honba guarantees governance honesty by declaring which microstructure phenomena are currently excluded:
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(assumptions?.not_modelled ?? ['borrow_fee', 'spread_slippage', 'market_impact', 'circuit_breaker_halts']).map((name) => (
            <span
              key={name}
              style={{
                fontFamily: 'var(--font-family-mono)',
                fontSize: 11,
                padding: '3px 8px',
                borderRadius: 4,
                background: 'var(--bg-surface-elevated, #2a2e39)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle, #363a45)',
              }}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
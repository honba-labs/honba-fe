// Equity & Drawdown Chart - SVG-based
// Mirrors honba-frontend apps/algodesigner/panels.tsx (EquityDrawdownChart)

import React, { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';

import type { BacktestMetrics } from '../domain';

export interface EquityDrawdownChartProps {
  equitySeries?: number[];
  curve?: Array<[number, number]>;
  metrics?: BacktestMetrics | null;
  benchmark?: number[] | null;
  benchmarkLabel?: string;
}

function drawdownSeries(equity: number[]): number[] {
  let peak = equity[0] ?? 0;
  return equity.map((val) => {
    if (val > peak) peak = val;
    return peak > 0 ? ((peak - val) / peak) * 100 : 0;
  });
}

function equityFromCurve(curve: Array<[number, number]>): { equity: number[] } {
  return { equity: curve.map(([, eq]) => eq) };
}

export const EquityDrawdownChart: React.FC<EquityDrawdownChartProps> = ({
  equitySeries,
  curve,
  metrics,
  benchmark,
  benchmarkLabel,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const series: number[] = useMemo(() => {
    if (equitySeries && equitySeries.length > 0) return equitySeries;
    if (curve && curve.length > 0) return equityFromCurve(curve).equity;

    // Deterministic synthesized trajectory from metrics
    const initial = 100000;
    const count = metrics?.trades && metrics.trades > 0 ? Math.min(Math.max(metrics.trades * 2, 24), 60) : 30;
    const finalPnl = metrics?.net_pnl ?? (initial * (metrics?.total_return ?? 0.15));
    const maxDd = metrics?.max_drawdown ?? 0.08;

    const points: number[] = [initial];
    let cur = initial;
    for (let i = 1; i < count; i++) {
      const progress = i / count;
      const trend = initial + finalPnl * progress;
      const wave = Math.sin(i * 0.7) * (initial * maxDd * 0.4);
      const noise = (Math.sin(i * 1.9 + 2) * (initial * maxDd * 0.2));
      cur = Math.max(initial * 0.5, trend + wave + noise);
      points.push(cur);
    }
    points[points.length - 1] = initial + finalPnl;
    return points;
  }, [equitySeries, curve, metrics]);

  const drawdowns = useMemo(() => drawdownSeries(series), [series]);

  const width = 640;
  const eqHeight = 140;
  const ddHeight = 70;

  const overlay = benchmark && benchmark.length === series.length ? benchmark : null;
  const scaleSeries = overlay ? [...series, ...overlay] : series;
  const minEq = Math.min(...scaleSeries);
  const maxEq = Math.max(...scaleSeries);
  const eqRange = maxEq - minEq || 1;
  const maxDd = Math.max(...drawdowns, 0.01);

  const eqPoints = useMemo(() => {
    return series.map((val, idx) => {
      const x = (idx / (series.length - 1 || 1)) * (width - 40) + 20;
      const y = eqHeight - 20 - ((val - minEq) / eqRange) * (eqHeight - 40);
      return { x, y, val };
    });
  }, [series, minEq, eqRange]);

  const eqPath = useMemo(() => {
    if (eqPoints.length === 0) return '';
    return eqPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, '');
  }, [eqPoints]);

  const eqArea = useMemo(() => {
    if (eqPoints.length === 0) return '';
    const firstX = eqPoints[0].x;
    const lastX = eqPoints[eqPoints.length - 1].x;
    return `${eqPath} L ${lastX.toFixed(1)} ${eqHeight - 10} L ${firstX.toFixed(1)} ${eqHeight - 10} Z`;
  }, [eqPath, eqPoints]);

  const overlayPath = useMemo(() => {
    if (!overlay) return '';
    return overlay.reduce((acc, val, idx) => {
      const x = (idx / (series.length - 1 || 1)) * (width - 40) + 20;
      const y = eqHeight - 20 - ((val - minEq) / eqRange) * (eqHeight - 40);
      return `${acc} ${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  }, [overlay, series.length, minEq, eqRange, width, eqHeight]);

  const ddPoints = useMemo(() => {
    return drawdowns.map((dd, idx) => {
      const x = (idx / (drawdowns.length - 1 || 1)) * (width - 40) + 20;
      const y = 10 + (dd / maxDd) * (ddHeight - 20);
      return { x, y, dd };
    });
  }, [drawdowns, maxDd]);

  const ddArea = useMemo(() => {
    if (ddPoints.length === 0) return '';
    const firstX = ddPoints[0].x;
    const lastX = ddPoints[ddPoints.length - 1].x;
    const pathD = ddPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, '');
    return `M ${firstX.toFixed(1)} 10 ${pathD.replace('M', 'L')} L ${lastX.toFixed(1)} 10 Z`;
  }, [ddPoints]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const scale = width / rect.width;
    const svgX = relX * scale;
    let closest = 0;
    let minDist = Infinity;
    eqPoints.forEach((pt, i) => {
      const dist = Math.abs(pt.x - svgX);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });
    setHoverIndex(closest);
  };

  const activeEq = hoverIndex !== null ? eqPoints[hoverIndex] : eqPoints[eqPoints.length - 1];
  const activeDd = hoverIndex !== null ? ddPoints[hoverIndex] : ddPoints[ddPoints.length - 1];

  return (
    <div
      style={{
        background: 'var(--bg-surface, #1e222d)',
        border: '1px solid var(--border-subtle, #2a2e39)',
        borderRadius: 'var(--radius-md, 6px)',
        padding: 16,
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={16} style={{ color: 'var(--bullish, #089981)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            Equity Curve & Underwater Drawdown (ADR 0029 S7)
          </span>
        </div>
        <div style={{ fontSize: 12, fontFamily: 'var(--font-family-mono)', display: 'flex', gap: 14 }}>
          <span>
            Equity:{' '}
            <strong style={{ color: 'var(--bullish, #089981)' }}>
              ₹{activeEq?.val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </span>
          <span>
            Drawdown:{' '}
            <strong style={{ color: 'var(--bearish, #f23645)' }}>
              -{activeDd?.dd.toFixed(2)}%
            </strong>
          </span>
          {overlayPath ? (
            <span style={{ color: 'var(--text-muted)' }}>╌ {benchmarkLabel ?? 'Benchmark'}</span>
          ) : null}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${eqHeight + ddHeight + 10}`}
        style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--bullish, #089981)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--bullish, #089981)" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--bearish, #f23645)" stopOpacity="0.05" />
            <stop offset="100%" stopColor="var(--bearish, #f23645)" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        <line x1="20" y1={eqHeight - 10} x2={width - 20} y2={eqHeight - 10} stroke="var(--border-subtle, #2a2e39)" strokeDasharray="3 3" />
        <line x1="20" y1="20" x2={width - 20} y2="20" stroke="var(--border-subtle, #2a2e39)" strokeDasharray="3 3" />

        <path d={eqArea} fill="url(#eqGrad)" />
        {overlayPath ? (
          <path
            d={overlayPath}
            fill="none"
            stroke="var(--text-muted, #787b86)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            strokeLinecap="round"
          />
        ) : null}
        <path d={eqPath} fill="none" stroke="var(--bullish, #089981)" strokeWidth="2" strokeLinecap="round" />

        <g transform={`translate(0, ${eqHeight + 5})`}>
          <line x1="20" y1="10" x2={width - 20} y2="10" stroke="var(--border-subtle, #2a2e39)" />
          <text x="24" y="24" fill="var(--text-muted, #787b86)" fontSize="9" fontFamily="var(--font-family-mono)">
            0% Underwater
          </text>
          <text x="24" y={ddHeight - 4} fill="var(--bearish, #f23645)" fontSize="9" fontFamily="var(--font-family-mono)">
            -{maxDd.toFixed(1)}% Max DD
          </text>

          <path d={ddArea} fill="url(#ddGrad)" />
          <path
            d={ddPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, '')}
            fill="none"
            stroke="var(--bearish, #f23645)"
            strokeWidth="1.5"
          />
        </g>

        {activeEq && (
          <g>
            <line x1={activeEq.x} y1="10" x2={activeEq.x} y2={eqHeight + ddHeight} stroke="var(--text-muted, #787b86)" strokeDasharray="2 2" strokeWidth="1" />
            <circle cx={activeEq.x} cy={activeEq.y} r="4" fill="var(--bullish, #089981)" stroke="#fff" strokeWidth="1.5" />
            {activeDd && (
              <circle cx={activeDd.x} cy={eqHeight + 5 + activeDd.y} r="3" fill="var(--bearish, #f23645)" stroke="#fff" strokeWidth="1" />
            )}
          </g>
        )}
      </svg>
    </div>
  );
};
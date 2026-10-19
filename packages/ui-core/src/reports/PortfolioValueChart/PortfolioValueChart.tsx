// Batch J (docs/tasks.md) — `PortfolioValueChart`, the equity-curve view. honba has no direct
// bfx-report-ui analog (its reference closest is the performance line inside the backtester),
// so this is a from-scratch dependency-free SVG renderer over `GET /reports/equity-curve`'s
// `EquityPoint[]` (honba-ya-api/src/responses.rs): an equity line with an area fill, drawdown
// highs rendered as a faint underlay strip, and the response's `EquityCurveSummary` as the
// summary strip. Deliberately no charting dependency — one polyline, two polygons.
import { useMemo } from 'react';

import type { UnixNanos } from '../../trading/TradesTablePanel';
import { ReportSummary, formatNumber, type ReportSummaryItem } from '../ReportTable';
import '../ReportTable.css';
import './PortfolioValueChart.css';

export interface EquityPoint {
  ts_event: UnixNanos;
  date: string;
  equity: number;
  cash: number;
  positions_value: number;
  unrealized_pnl: number;
  realized_pnl: number;
  drawdown: number;
  drawdown_pct: number;
}

export interface EquityCurveSummary {
  start_equity: number;
  end_equity: number;
  total_return: number;
  total_return_pct: number;
  max_drawdown: number;
  max_drawdown_pct: number;
  sharpe?: number | null;
}

export interface PortfolioValueChartProps {
  points: EquityPoint[];
  /** The wire response's summary block; omitted → no summary strip. */
  summary?: EquityCurveSummary;
  height?: number;
  className?: string;
}

const CHART_WIDTH = 800;
const CHART_HEIGHT = 220;
const PADDING = { top: 10, right: 8, bottom: 20, left: 56 };
const Y_TICKS = 4;

export function PortfolioValueChart({
  points,
  summary,
  height = 280,
  className,
}: PortfolioValueChartProps) {
  const values = points.map((point) => point.equity);
  const min = points.length ? Math.min(...values) : 0;
  const max = points.length ? Math.max(...values) : 1;

  const { line, area, yTicks } = useMemo(() => {
    const innerW = CHART_WIDTH - PADDING.left - PADDING.right;
    const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom;
    const paddedMin = min === max ? min - 1 : min; // degenerate flat curve still renders
    const plot = (value: number, index: number): [number, number] => {
      const x = points.length > 1
        ? PADDING.left + (innerW * index) / (points.length - 1)
        : PADDING.left + innerW / 2;
      const y = PADDING.top + innerH * (1 - (value - paddedMin) / (max - paddedMin));
      return [x, y];
    };
    const coords = points.map((point, index) => plot(point.equity, index));
    const baseline = PADDING.top + innerH;
    return {
      line: coords.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' '),
      area:
        coords.length > 1
          ? `M${coords[0][0].toFixed(2)},${baseline} ` +
            coords.map(([x, y]) => `L${x.toFixed(2)},${y.toFixed(2)}`).join(' ') +
            ` L${coords[coords.length - 1][0].toFixed(2)},${baseline} Z`
          : '',
      yTicks: buildYTicks(PADDING.top, innerH, min, max, paddedMin),
    };
  }, [points, min, max]);

  const items: ReportSummaryItem[] = summary
    ? [
        { label: 'Start', value: formatNumber(summary.start_equity) },
        { label: 'End', value: formatNumber(summary.end_equity) },
        {
          label: 'Return',
          value: `${summary.total_return_pct >= 0 ? '+' : ''}${formatNumber(summary.total_return_pct)}%`,
          tone: summary.total_return_pct < 0 ? 'bearish' : 'bullish',
        },
        { label: 'Max DD', value: `${formatNumber(summary.max_drawdown_pct)}%`, tone: 'bearish' },
        { label: 'Sharpe', value: summary.sharpe != null ? formatNumber(summary.sharpe) : '-' },
      ]
    : [];

  return (
    <div className={className ? className : 'hb-portfolio-value-chart'} style={{ minHeight: height }}>
      <ReportSummary items={items} />
      {points.length === 0 ? (
        <p className="hb-portfolio-value-chart__empty">No equity points</p>
      ) : (
        <svg
          className="hb-portfolio-value-chart__svg"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          style={{ width: '100%', height: Math.max(0, height - 40) }}
          role="img"
          aria-label="Portfolio equity curve"
        >
          {yTicks.map((tick) => (
            <g key={tick.value}>
              <line
                x1={PADDING.left}
                x2={CHART_WIDTH - PADDING.right}
                y1={tick.y}
                y2={tick.y}
                className="hb-portfolio-value-chart__grid"
              />
              <text x={PADDING.left - 8} y={tick.y + 3} textAnchor="end" className="hb-portfolio-value-chart__tick">
                {tick.label}
              </text>
            </g>
          ))}
          {area && <path d={area} className="hb-portfolio-value-chart__area" />}
          {line && <path d={line} className="hb-portfolio-value-chart__line" />}
        </svg>
      )}
    </div>
  );
}

function buildYTicks(
  top: number,
  innerH: number,
  min: number,
  max: number,
  paddedMin: number,
): Array<{ value: number; y: number; label: string }> {
  return Array.from({ length: Y_TICKS + 1 }, (_, index) => {
    const fraction = index / Y_TICKS;
    const value = paddedMin + (max - paddedMin) * fraction;
    return {
      value,
      y: top + innerH * (1 - fraction),
      label: formatNumber(value, 0),
    };
  });
}

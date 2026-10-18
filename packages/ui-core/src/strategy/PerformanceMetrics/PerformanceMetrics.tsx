// Ported/modernized from bfx-hf-ui-core's `StrategyPerfomanceMetrics` + `MetricRow`
// (src/components/StrategyPerfomanceMetrics/*, Apache-2.0).
//
// The original computes its metric rows from a run-results object (via i18n-keyed helpers) and
// couples itself to `csv-export`/`file-saver` for a CSV export button. Per docs/tasks.md Batch E,
// only the *metrics tile/row layout* is worth porting, and this package is presentational +
// backend-agnostic — so the component takes already-computed label/value rows and renders them;
// turning honba's `GET /backtests/{id}` result fields into that list is the calling feature's
// job (Batch H/I), which also keeps the field mapping free of assumptions about honba's schema.
//
// `tone` is kept so a metrics row can be color-coded (e.g. profitFactor < 1 red, gains green)
// — the original achieves this via its `resultNumber` helper; here the caller decides.
//
// Named `PerformanceMetrics` (the reference's misspelling "Perfomance" is not carried across).
import type { ReactNode } from 'react';
import clsx from 'clsx';
import './PerformanceMetrics.css';

export type PerformanceMetricTone = 'neutral' | 'positive' | 'negative' | 'warning';

export interface PerformanceMetric {
  label: string;
  value: ReactNode;
  tone?: PerformanceMetricTone;
}

export interface PerformanceMetricsProps {
  metrics: PerformanceMetric[];
  label?: ReactNode;
  className?: string;
}

export function PerformanceMetrics({ metrics, label, className }: PerformanceMetricsProps) {
  return (
    <section className={clsx('hb-performance-metrics', className)} aria-label={typeof label === 'string' ? label : 'Strategy results'}>
      {label ? <p className="hb-performance-metrics__label">{label}</p> : null}
      <ul className="hb-performance-metrics__list">
        {metrics.map((metric) => (
          <li key={metric.label} className="hb-performance-metrics__item">
            <span className="hb-performance-metrics__item-label">{metric.label}</span>
            <span
              className={clsx('hb-performance-metrics__item-value', metric.tone && `hb-performance-metrics__item-value--${metric.tone}`)}
            >
              {metric.value}
            </span>
          </li>
        ))}
      </ul>
      {metrics.length === 0 ? <p className="hb-performance-metrics__empty">No metrics</p> : null}
    </section>
  );
}

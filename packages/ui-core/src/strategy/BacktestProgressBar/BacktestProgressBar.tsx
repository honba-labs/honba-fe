// Ported/modernized from bfx-hf-ui-core's `BacktestProgressBar`
// (src/components/BacktestProgressBar/BacktestProgressBar.js, Apache-2.0).
//
// What's kept: the elapsed-time readout + percent progress + percent label layout, and the
// `percent`/`startedOn` prop contract (startedOn is epoch ms). What's dropped: `react-timer-hook`'s
// stopwatch (replaced with a plain interval over `Date.now() - startedOn`), `rc-progress` (replaced
// with this package's own `ui/ProgressBar` — same horizontal track, one less dependency),
// i18n, theme-selector indirection (charts colors come from tokens.css).
//
// Presentational + backend-agnostic: the caller owns the percent; this component only ticks an
// elapsed-time display locally.
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { ProgressBar } from '../../ui/ProgressBar';
import './BacktestProgressBar.css';

function pad2(value: number): string {
  return String(Math.floor(value)).padStart(2, '0');
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, ms / 1000);
  return `${pad2(totalSeconds / 3600)}:${pad2((totalSeconds % 3600) / 60)}:${pad2(totalSeconds % 60)}`;
}

export interface BacktestProgressBarProps {
  percent: number;
  /** Epoch ms (or any `Date.now()`-comparable timestamp) the run started at. */
  startedOn: number;
  /** Override for the elapsed-time clock; used by tests and callers that already tick. */
  now?: number;
  className?: string;
}

export function BacktestProgressBar({
  percent,
  startedOn,
  now: initialNow,
  className,
}: BacktestProgressBarProps) {
  const [now, setNow] = useState(() => initialNow ?? Date.now());

  useEffect(() => {
    if (initialNow !== undefined) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [initialNow]);

  return (
    <div className={clsx('hb-backtest-progress', className)}>
      <div className="hb-backtest-progress__time">
        <span className="hb-backtest-progress__field">Elapsed</span>
        <span className="hb-backtest-progress__value" data-testid="backtest-elapsed">
          {formatElapsed(now - startedOn)}
        </span>
      </div>
      <ProgressBar percent={percent} />
      <div className="hb-backtest-progress__percent">
        <span className="hb-backtest-progress__field">Progress</span>
        <span className="hb-backtest-progress__value">{percent}%</span>
      </div>
    </div>
  );
}

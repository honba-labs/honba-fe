// Live demos for `ui-core/src/strategy/*` (Batch E, docs/tasks.md — PerformanceMetrics,
// StrategyTradesTable, StrategiesListTable, BacktestProgressBar, BacktestOptionsPanel).
// The trades/list rows come from `fixtures.ts` (shaped after honba's backtest + strategy
// payloads); the backtest run state is simulated locally (the feature layer maps the form's
// draft onto `POST /backtests` + polling in Batch H). Demos render raw content — the
// dashboard's `DemoTile` frames them.
import { useEffect, useRef, useState } from 'react';
import type { BacktestConfig } from '@honba/ui-core';
import {
  BacktestOptionsPanel,
  BacktestProgressBar,
  PerformanceMetrics,
  StrategiesListTable,
  StrategyTradesTable,
} from '@honba/ui-core';
import {
  backtestConfigFixture,
  strategyMetricsFixture,
  strategiesListFixture,
  strategyTradesFixture,
} from './fixtures';

function PerformanceMetricsDemo() {
  return (
    <div className="demo-stack">
      <p className="demo-label">
        Rows are already computed — the feature layer derives them from `GET /backtests/{"{id}"}`,
        the component only renders them:
      </p>
      <PerformanceMetrics metrics={strategyMetricsFixture} label="Backtest run — RELIANCE 1h (neutral)" />
    </div>
  );
}

function StrategyTradesTableDemo() {
  return (
    <StrategyTradesTable
      rows={strategyTradesFixture}
      height={280}
      // Trade #1's expandable order detail is three rows tall.
    />
  );
}

function StrategiesListTableDemo() {
  return (
    <StrategiesListTable
      rows={strategiesListFixture}
      height={280}
      onLoad={(item) => console.info('strategy load', item.id)}
      onRemove={(item) => console.info('strategy remove', item.id)}
    />
  );
}

// One tile for the whole run flow: the controlled `BacktestOptionsPanel` form starts a run,
// swaps to its in-panel `BacktestProgressBar` while percent ticks up, and the finished state
// offers a reset back to the form. This simulates exactly what `POST /backtests` + polling
// will drive from Batch H — the component itself stays controlled/backend-agnostic.
function BacktestRunDemo() {
  const [config, setConfig] = useState<BacktestConfig>(backtestConfigFixture);
  const [run, setRun] = useState<{ isRunning: boolean; percent: number; startedOn: number }>({
    isRunning: false,
    percent: 0,
    startedOn: 0,
  });
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!run.isRunning) return undefined;
    timerRef.current = window.setInterval(() => {
      setRun((prev) => {
        const percent = Math.min(100, prev.percent + 4);
        if (percent >= 100) {
          window.clearInterval(timerRef.current ?? 0);
        }
        return { ...prev, percent };
      });
    }, 300);
    return () => {
      window.clearInterval(timerRef.current ?? 0);
    };
  }, [run.isRunning]);

  const start = () => {
    setRun({ isRunning: true, percent: 0, startedOn: Date.now() });
  };

  const reset = () => {
    setRun({ isRunning: false, percent: 0, startedOn: 0 });
  };

  return (
    <div className="demo-stack">
      {run.percent >= 100 ? (
        <p className="demo-label">
          Run finished locally (nothing was submitted — no backend). Restart to replay the flow:
        </p>
      ) : null}
      <div className="demo-row" style={{ marginBottom: 10 }}>
        {run.isRunning ? null : (
          <button
            key="reset"
            type="button"
            className="demo-tag"
            aria-pressed={false}
            onClick={reset}
          >
            reset config
          </button>
        )}
      </div>
      <BacktestOptionsPanel
        config={config}
        onChange={setConfig}
        onStart={start}
        isRunning={run.isRunning}
        percent={run.percent}
        startedOn={run.startedOn}
      />
    </div>
  );
}

function BacktestProgressBarDemo() {
  // A stationary-looking run: fixed percent + a clock offset that only moves in real time
  // (the component ticks its own elapsed counter once per second).
  return (
    <BacktestProgressBar percent={62} startedOn={Date.now() - 142_000} />
  );
}

// Same tile shape as demos-*.tsx: the dashboard renders each `node` inside a DemoTile and
// derives section counts from these arrays.
export const strategyTiles = [
  {
    id: 'performance-metrics',
    name: 'PerformanceMetrics',
    source: 'strategy/PerformanceMetrics',
    description: 'Already-computed metric rows with tone-coded values; the caller derives them from backtest results.',
    node: <PerformanceMetricsDemo />,
  },
  {
    id: 'strategy-trades',
    name: 'StrategyTradesTable',
    source: 'strategy/StrategyTradesTable',
    description: 'Round trips (open ones render as dashes) with an expandable per-trade order-detail row.',
    wide: true,
    pad: false,
    node: <StrategyTradesTableDemo />,
  },
  {
    id: 'strategies-list',
    name: 'StrategiesListTable',
    source: 'strategy/StrategiesListTable',
    description: 'Active / past / saved library tabs (GET /-strategies); load + remove are caller callbacks.',
    wide: true,
    pad: false,
    node: <StrategiesListTableDemo />,
  },
  {
    id: 'backtest-run',
    name: 'BacktestOptionsPanel (+ BacktestProgressBar in-panel)',
    source: 'strategy/BacktestOptionsPanel',
    description: 'Controlled run-config form; Start simulates a run locally — the in-panel progress view is the same BacktestProgressBar.',
    wide: true,
    pad: false,
    node: <BacktestRunDemo />,
  },
  {
    id: 'backtest-progress',
    name: 'BacktestProgressBar (bare)',
    source: 'strategy/BacktestProgressBar',
    description: 'Progress + ticking elapsed clock; the caller owns the run timer.',
    node: <BacktestProgressBarDemo />,
  },
];

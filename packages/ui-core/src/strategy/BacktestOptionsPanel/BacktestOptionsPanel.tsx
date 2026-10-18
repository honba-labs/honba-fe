// Ported/adapted from bfx-hf-ui-core's `BacktestOptionsPanel`
// (src/components/BacktestOptionsPanel/*, Apache-2.0) + its `NewTest` tab form.
//
// The original is a redux-coupled tab panel (new test / history list / history details) whose
// form fields (symbol, TF, capital, candle range, …) dispatch against bfx's algo/backtest
// services. Per docs/tasks.md Batch E only the run-config-form + progress UX is worth porting;
// honba's history list/details views come from its own `GET /backtests` API and are Batch H/I
// work. So: one controlled run-config form (built from Batch A's `Input`/`DatePicker`/`Button`/
// `RadioButton`/`AttentionBar` and Batch C's `TimeFrameDropdown` + optional `MarketSelect`)
// plus an in-panel `BacktestProgressBar` while a run is in flight. The draft handed to
// `onStart` mirrors the reference's fields but stays schema-free — mapping it onto honba's
// `POST /backtests` request is the feature layer's job.
//
// Presentational + backend-agnostic: state is caller-owned (controlled `config`), no fetching.
import clsx from 'clsx';
import { Play } from 'lucide-react';

import { AttentionBar } from '../../ui/AttentionBar';
import { Button } from '../../ui/Button';
import { DatePicker } from '../../ui/DatePicker';
import { Indicator } from '../../ui/Indicator';
import { Input } from '../../ui/Input';
import { RadioButton } from '../../ui/RadioButton';
import { MarketSelect } from '../../market/MarketSelect';
import type { MarketOption } from '../../market/MarketSelect';
import { TimeFrameDropdown } from '../../market/TimeFrameDropdown';
import { BacktestProgressBar } from '../BacktestProgressBar';
import './BacktestOptionsPanel.css';

/** Direction the backtest capital is applied in, continuing from the same position on every
 * bar (the reference's long/short radio pair in `NewTest`); `neutral` folds both into one
 * statistically-symmetric run, which honba's engine supports and bfx's did not — kept as an
 * option rather than an assumption. */
export type BacktestPositionMode = 'long' | 'short' | 'neutral';

export interface BacktestConfig {
  /** Instrument identifier; preformatted `exchange:symbol` label handled by `MarketSelect`
   * when `markets` is given, free-text otherwise. */
  symbol: string;
  timeframe: string;
  /** ISO date strings (what `DatePicker` produces through `onChange`). */
  from: string | null;
  to: string | null;
  /** Starting (paper) capital in display units. */
  capital: number;
  positionMode: BacktestPositionMode;
}

export interface BacktestOptionsPanelProps {
  config: BacktestConfig;
  onChange: (config: BacktestConfig) => void;
  /** Called with the current config when Start backtest is pressed. */
  onStart?: (config: BacktestConfig) => void;
  /** True while `POST /backtests` runs (caller-owned); swaps the form for the progress view. */
  isRunning?: boolean;
  /** 0–100 progress while running. */
  percent?: number;
  /** Epoch ms the running backtest started at; drives `BacktestProgressBar`'s elapsed clock. */
  startedOn?: number;
  /** Validation/errors from the caller (e.g. the API's 400 body), rendered as an AttentionBar. */
  error?: string | null;
  /** Optional market universe; when provided, instrument selection uses `MarketSelect`. */
  markets?: MarketOption[];
  className?: string;
}

export function BacktestOptionsPanel({
  config,
  onChange,
  onStart,
  isRunning = false,
  percent = 0,
  startedOn,
  error = null,
  markets,
  className,
}: BacktestOptionsPanelProps) {
  const patch = (partial: Partial<BacktestConfig>) => onChange({ ...config, ...partial });

  const capitalInvalid = Number.isNaN(config.capital) || config.capital <= 0;

  return (
    <div className={clsx('hb-backtest-options', className)}>
      {isRunning ? (
        <>
          <div className="hb-backtest-options__running-badge">
            <Indicator color="green" blinking />
            <span>Backtest running — {config.symbol}</span>
          </div>
          <BacktestProgressBar percent={percent} startedOn={startedOn ?? Date.now()} />
          <p className="hb-backtest-options__hint">
            The caller owns run state (<code>POST /backtests</code> &rarr; poll/
            {'GET /backtests/{id}'}); this view is purely an in-panel reflection of it.
          </p>
        </>
      ) : (
        <>
          <Input
            label={markets ? 'Instrument' : 'Instrument (exchange:symbol)'}
            value={config.symbol}
            onChange={(value) => patch({ symbol: value })}
            placeholder="e.g. NSE:RELIANCE"
          />
          {markets ? (
            <MarketSelect
              markets={markets}
              value={config.symbol}
              onChange={(symbol) => patch({ symbol })}
            />
          ) : null}
          <TimeFrameDropdown
            value={config.timeframe}
            onChange={(timeframe) => patch({ timeframe })}
          />
          <div className="hb-backtest-options__date-row">
            <DatePicker
              label="From"
              value={config.from ? new Date(config.from) : null}
              onChange={(date) => patch({ from: date ? date.toISOString().slice(0, 10) : null })}
            />
            <DatePicker
              label="To"
              value={config.to ? new Date(config.to) : null}
              onChange={(date) => patch({ to: date ? date.toISOString().slice(0, 10) : null })}
            />
          </div>
          <Input
            label="Capital"
            type="number"
            value={config.capital}
            onChange={(value) => patch({ capital: Number(value) })}
          />
          {capitalInvalid ? (
            <AttentionBar tone="yellow">Capital must be a positive number</AttentionBar>
          ) : null}
          <fieldset className="hb-backtest-options__mode">
            <legend className="hb-backtest-options__mode-legend">Position mode</legend>
            <div className="hb-backtest-options__mode-row">
              <RadioButton
                id="backtest-mode-long"
                checked={config.positionMode === 'long'}
                onChange={() => patch({ positionMode: 'long' })}
                label="Long only"
              />
              <RadioButton
                id="backtest-mode-neutral"
                checked={config.positionMode === 'neutral'}
                onChange={() => patch({ positionMode: 'neutral' })}
                label="Neutral"
              />
              <RadioButton
                id="backtest-mode-short"
                checked={config.positionMode === 'short'}
                onChange={() => patch({ positionMode: 'short' })}
                label="Short only"
              />
            </div>
          </fieldset>
          <div className="hb-backtest-options__footer">
            <Button
              label="Start backtest"
              variant="blue"
              disabled={capitalInvalid || !config.symbol || !config.from}
              onClick={() => onStart?.(config)}
            />
            <Play size={14} className="hb-backtest-options__footer-icon" />
          </div>
        </>
      )}
      {error ? <AttentionBar tone="red">{error}</AttentionBar> : null}
    </div>
  );
}

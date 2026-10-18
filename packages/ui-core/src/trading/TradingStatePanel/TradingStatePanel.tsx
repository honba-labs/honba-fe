// "Ported" from bfx-hf-ui-core's `TradingStatePanel` in name only -- the original component
// (`.reference/bfx-hf-ui-core/src/components/TradingStatePanel`) is actually a tabbed dashboard
// folding Positions/AtomicOrders/AlgoOrders/Balances tables together with a market filter; it has
// nothing to do with a trading on/off switch. honba has no equivalent to that tabbed-dashboard
// concept (the sibling tables already exist as their own panels in this batch -- see
// `PositionsTablePanel`, `OrdersTablePanel`, `BalancesTablePanel`), but honba *does* have a
// `GET`/`PUT /trading-state` endpoint with no bfx-hf-ui-core UI counterpart at all. Per
// docs/tasks.md Batch D ("`TradingStatePanel` -> `GET`/`PUT /trading-state`"), this component is
// therefore a from-scratch control panel built to that endpoint's contract, reusing only the
// name and the `Panel` shell convention from the reference, not its layout or behavior.
//
// Schema (verified against `honba/schema/openapi/openapi.json`): `TradingState` is a 3-value
// enum (`active`/`reducing`/`halted`) controlled by `PUT /trading-state`
// (`TradingStateRequest { state, reason? }` -> `TradingStateChange { previous, state }`). Every
// transition, including requesting the already-current state (a no-op -- `previous == state`),
// is allowed, so this UI does not disable or hide the current-state button; it's styled as
// selected instead. This package does no fetching (see Shared conventions) -- `onChange` is
// called with the requested state and optional reason; wiring it to the real `PUT` call, and
// supplying `pending` while that call is in flight, is Batch H/I's job.
import { useState } from 'react';
import type { ReactNode } from 'react';
import clsx from 'clsx';

import { Panel } from '../../ui/Panel';
import './TradingStatePanel.css';

/** honba's `TradingState` (ADR 0018 decision 7): whether the engine is trading, winding down, or
 * stopped. Every transition between these is allowed by the API; setting the current state again
 * is a no-op. */
export type TradingState = 'active' | 'reducing' | 'halted';

export interface TradingStatePanelProps {
  currentState: TradingState;
  /** Requests a transition to `nextState`, with an optional operator-supplied reason (logged, not
   * interpreted, by `PUT /trading-state`). This component makes no API call itself. */
  onChange: (nextState: TradingState, reason?: string) => void;
  /** True while a requested `PUT /trading-state` change is in flight; disables the controls. */
  pending?: boolean;
  label?: ReactNode;
  removeable?: boolean;
  onRemove?: () => void;
  panelClassName?: string;
  className?: string;
}

const STATE_ORDER: TradingState[] = ['active', 'reducing', 'halted'];

const STATE_LABELS: Record<TradingState, string> = {
  active: 'Active',
  reducing: 'Reducing',
  halted: 'Halted',
};

export function TradingStatePanel({
  currentState,
  onChange,
  pending = false,
  label = 'Trading State',
  removeable = false,
  onRemove,
  panelClassName,
  className,
}: TradingStatePanelProps) {
  const [reason, setReason] = useState('');

  const requestTransition = (nextState: TradingState) => {
    const trimmed = reason.trim();
    onChange(nextState, trimmed === '' ? undefined : trimmed);
  };

  return (
    <Panel
      label={label}
      removeable={removeable}
      onRemove={onRemove}
      className={panelClassName}
    >
      <div className={clsx('hb-trading-state-panel', className)}>
        <div className="hb-trading-state-panel__current">
          <span className="hb-trading-state-panel__current-label">Current state</span>
          <span
            className={clsx(
              'hb-trading-state-panel__badge',
              `hb-trading-state-panel__badge--${currentState}`,
            )}
          >
            {STATE_LABELS[currentState]}
          </span>
        </div>

        <label className="hb-trading-state-panel__reason-label">
          Reason (optional)
          <input
            type="text"
            className="hb-trading-state-panel__reason-input"
            value={reason}
            disabled={pending}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Why is this changing?"
          />
        </label>

        <div
          className="hb-trading-state-panel__actions"
          role="group"
          aria-label="Request trading state change"
        >
          {STATE_ORDER.map((state) => (
            <button
              key={state}
              type="button"
              disabled={pending}
              className={clsx('hb-trading-state-panel__action', {
                'hb-trading-state-panel__action--current': state === currentState,
              })}
              onClick={() => requestTransition(state)}
            >
              {STATE_LABELS[state]}
            </button>
          ))}
        </div>

        {pending && <p className="hb-trading-state-panel__pending">Applying…</p>}
      </div>
    </Panel>
  );
}

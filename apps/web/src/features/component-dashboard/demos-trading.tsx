// Live demos for `ui-core/src/trading/*` (Batch D, docs/tasks.md — order entry, orders,
// positions, balances, trades, trading state). Tables take fixture rows shaped after honba's
// `GET /orders`, `GET /portfolio/*` payloads; actions (cancel/close/state change) write to
// local demo state only. Demos render raw content — the dashboard's `DemoTile` frames them.
import { useState } from 'react';
import type { OrderDraft, TradingState } from '@honba/ui-core';
import {
  BalancesTablePanel,
  OrderForm,
  OrdersTablePanel,
  PositionsTable,
  PositionsTablePanel,
  TradesTablePanel,
  TradingStatePanel,
} from '@honba/ui-core';
import {
  balancesFixture,
  inr,
  ordersFixture,
  positionsFixture,
  REUTERS,
  tradesFixture,
} from './fixtures';

function OrderFormDemo() {
  const [lastDraft, setLastDraft] = useState<OrderDraft | null>(null);
  return (
    <div className="demo-row" style={{ alignItems: 'flex-start' }}>
      <div style={{ flex: '0 0 360px' }}>
        <OrderForm
          instrumentId={REUTERS}
          onSubmit={(draft) => {
            setLastDraft(draft);
            console.info('order submit', draft);
          }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 260 }}>
        <p className="demo-label">
          Last submitted draft — the exact shape `onSubmit` hands the caller; features map this
          onto `POST /orders` in Batch H:
        </p>
        <pre className="demo-box">
          <code>{lastDraft ? JSON.stringify(lastDraft, null, 2) : '(submit an order in the ticket)'}</code>
        </pre>
      </div>
    </div>
  );
}

function OrdersTablePanelDemo() {
  const [statusFilter, setStatusFilter] = useState<'open' | 'history' | 'all'>('all');
  return (
    <div>
      <div className="demo-row" style={{ marginBottom: 10 }}>
        {(['open', 'history', 'all'] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            className="demo-tag"
            aria-pressed={statusFilter === filter}
            onClick={() => setStatusFilter(filter)}
          >
            statusFilter: {filter}
          </button>
        ))}
      </div>
      <OrdersTablePanel
        rows={ordersFixture}
        statusFilter={statusFilter}
        height={240}
        onCancel={(orderId) => console.info('cancel', orderId)}
      />
    </div>
  );
}

function PositionsTablePanelDemo() {
  return (
    <PositionsTablePanel
      rows={positionsFixture}
      height={220}
      onClose={(instrumentId) => console.info('close', instrumentId)}
    />
  );
}

function BalancesTablePanelDemo() {
  return <BalancesTablePanel rows={balancesFixture} height={300} />;
}

function TradesTablePanelDemo() {
  return <TradesTablePanel rows={tradesFixture} height={220} />;
}

function PositionsTableEmptyDemo() {
  return (
    <div className="demo-stack">
      <p className="demo-label">Bare table with empty message:</p>
      <PositionsTable rows={[]} emptyMessage="No open positions" height={140} />
      <p className="demo-label">formatMoney (also exported for feature reuse):</p>
      <p className="demo-value">
        <code>formatMoney({JSON.stringify(inr(104494250))})</code>
      </p>
    </div>
  );
}

function TradingStatePanelDemo() {
  const [state, setState] = useState<TradingState>('active');
  return (
    <div className="demo-stack">
      <TradingStatePanel
        currentState={state}
        onChange={(nextState) => {
          console.info('trading state change', nextState);
          setState(nextState);
        }}
      />
      <p className="demo-value">
        Local demo state mirrors the requested change — `PUT /trading-state` wiring is Batch H.
      </p>
    </div>
  );
}

// Unified tile shape across every demos-*.tsx: the dashboard renders each `node` inside a
// DemoTile (with `wide`/`pad` framing hints) and derives section counts from these arrays.
export const tradingTiles = [
  {
    id: 'orderform',
    name: 'OrderForm',
    source: 'trading/OrderForm',
    description: 'Order ticket with side/type/TIF/qty/price + validation; drafts land in the adjacent pane.',
    wide: true,
    pad: false,
    node: <OrderFormDemo />,
  },
  {
    id: 'orders',
    name: 'OrdersTablePanel',
    source: 'trading/OrdersTable{,Panel}',
    description: "statusFilter folds bfx-hf-ui-core's atomic/algo/history tables into one virtualized table (open | history | all).",
    wide: true,
    pad: false,
    node: <OrdersTablePanelDemo />,
  },
  {
    id: 'positions',
    name: 'PositionsTablePanel',
    source: 'trading/PositionsTable{,Panel}',
    description: 'PortfolioPosition rows (GET /portfolio/positions); per-row close wired by the feature.',
    wide: true,
    pad: false,
    node: <PositionsTablePanelDemo />,
  },
  {
    id: 'balances',
    name: 'BalancesTablePanel',
    source: 'trading/BalancesTable{,Panel}',
    description: 'One row per PortfolioAccount (GET /portfolio/accounts), holdings explorable inline.',
    wide: true,
    pad: false,
    node: <BalancesTablePanelDemo />,
  },
  {
    id: 'trades',
    name: 'TradesTablePanel',
    source: 'trading/TradesTablePanel',
    description: 'Executed trades (GET /portfolio/trades) with a computed notional column.',
    wide: true,
    pad: false,
    node: <TradesTablePanelDemo />,
  },
  {
    id: 'positions-bare',
    name: 'PositionsTable (bare · empty)',
    source: 'trading/PositionsTable',
    description: 'The bare table + empty-message variant, and formatMoney.',
    node: <PositionsTableEmptyDemo />,
  },
  {
    id: 'trading-state',
    name: 'TradingStatePanel',
    source: 'trading/TradingStatePanel',
    description: 'Active / reducing / halted operator switch for GET/PUT /trading-state.',
    node: <TradingStatePanelDemo />,
  },
];

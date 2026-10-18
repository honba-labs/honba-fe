// Batch H end-to-end slice (docs/tasks.md) → Batch I slices 1–2: the Workbench route. The
// OrderBook renders live data from `/depth/{id}` through `useMarketStore` (Batch H); since
// Batch I slice 2 the page is also the order-entry route — OrderForm (Batch D) → POST /orders
// with the draft→wire mapping below, and an open-orders panel (OrdersTablePanel) reconciled
// into `useOrdersStore` (cancel → DELETE /orders/{id}). Phase 3's exit ("place/cancel an
// order end-to-end against honba serve") lives here.
//
// Draft→wire decision: ui-core's OrderDraft carries trigger_price/trail_* fields ahead of
// honba's current OrdersRequest (wire has neither — the OrderForm header documents the gap).
// Drop those knowingly here until the API accepts them; sending only the fields the wire
// contract defines is the honest mapping. client_order_id (the idempotency key) is generated
// per submit when the caller hasn't pinned one.
import { useEffect, useMemo, useState } from 'react';

import { MarketSelect, OrderBookPanel, OrderForm, OrdersTablePanel, Panel } from '@honba/ui-core';
import type { MarketOption, OrderDraft, Order as OrdersTableRow } from '@honba/ui-core';

import { getLiveSocket } from '../../core/liveSocket';
import { useInstruments, useOrders, usePlaceOrder, useCancelOrder } from '../../core/api/query';
import { useMarketStore } from '../../core/store/market';
import { useConnectionStore } from '../../core/store/connection';
import { useOrdersStore } from '../../core/store/orders';
import type {
  InstrumentId,
  InstrumentKind,
  Order,
  OrdersRequest,
} from '../../core/types/messages';
import './WorkbenchPage.css';

const CONN_LABELS: Record<string, string> = {
  idle: 'Idle',
  connecting: 'Connecting…',
  live: 'Live',
  reconnecting: 'Reconnecting…',
  failed: 'Data feed failed',
};

const WORKBENCH_KINDS: InstrumentKind[] = ['equity', 'etf', 'index'];

function toInstrumentId(optionSymbol: string): InstrumentId | null {
  const [exchange, ...rest] = optionSymbol.split(':');
  const sym = rest.join(':');
  if (!exchange || !sym) return null;
  return { exchange, symbol: sym };
}

function draftToRequest(draft: OrderDraft): OrdersRequest {
  return {
    instrument_id: draft.instrument_id,
    side: draft.side,
    order_type: draft.order_type,
    qty: draft.qty,
    price: draft.price ?? null,
    tif: draft.tif,
    client_order_id:
      draft.client_order_id ?? `hb-${crypto.randomUUID()}`// idempotency key, one per submit
  };
}

/** Wire `Order` → OrdersTable row. The two shape gaps: `filled_at` is a `UnixNanos` object on
 * the wire (the table prints a primitive) and wire TIF has `gtd`, a value the table's TIF
 * union predates (the column isn't rendered, so it's simply dropped here). */
function toOrderRow(order: Order): OrdersTableRow {
  return {
    order_id: order.order_id,
    instrument_id: order.instrument_id,
    side: order.side,
    order_type: order.order_type,
    status: order.status,
    quantity: order.quantity,
    filled_qty: order.filled_qty,
    price: order.price,
    trigger_price: order.trigger_price,
    trail_amount: order.trail_amount,
    trail_percent: order.trail_percent,
    avg_fill_price: order.avg_fill_price,
    time_in_force: order.time_in_force === 'gtd' ? undefined : order.time_in_force,
    cancel_requested: order.cancel_requested,
    filled_at: order.filled_at?.iso ?? null,
  };
}

export function WorkbenchPage() {
  const { data, isLoading, error } = useInstruments();
  const [selected, setSelected] = useState<InstrumentId | null>(null);
  const book = useMarketStore((state) => (selected ? state.getDepth(selected) : undefined));
  const status = useConnectionStore((state) => state.status);

  // Orders: GET snapshot reconciles the store; the ticket's POST response and any future
  // lifecycle stream upsert individual rows.
  const ordersQuery = useOrders();
  const placeOrder = usePlaceOrder();
  const cancelOrder = useCancelOrder();
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (ordersQuery.data) {
      useOrdersStore.getState().replaceRows(ordersQuery.data.orders);
    }
  }, [ordersQuery.data]);

  const orderIds = useOrdersStore((state) => state.orderIds);
  const orderRows = useOrdersStore((state) => state.rows);
  const orderRowList = useMemo(
    () => orderIds.map((id) => toOrderRow(orderRows[id])),
    [orderIds, orderRows],
  );

  // Subscribe the shared gateway to this instrument's channels while it's selected; every
  // update lands in useMarketStore (the store, not local state, is the subscriber target).
  useEffect(() => {
    if (!selected) return;
    const socket = getLiveSocket();
    const subscriptions = [
      socket.subscribe({ kind: 'depth', instrument: selected }, (update) => {
        useMarketStore.getState().applyDepth(selected, update.payload);
      }),
      socket.subscribe({ kind: 'quotes', instrument: selected }, (update) => {
        useMarketStore.getState().applyQuote(update.payload);
      }),
    ];
    return () => {
      for (const unsubscribe of subscriptions) unsubscribe();
    };
  }, [selected]);

  const markets = useMemo<MarketOption[]>(
    () =>
      (data?.instruments ?? [])
        .filter((instrument) => WORKBENCH_KINDS.includes(instrument.kind))
        .map((instrument) => ({
          // The option id doubles as the display label (Dropdown's labelFor default) —
          // exchange:symbol is honba's canonical wire key.
          symbol: `${instrument.id.exchange}:${instrument.id.symbol}`,
        })),
    [data],
  );

  function submitDraft(draft: OrderDraft) {
    setSubmitError(null);
    placeOrder.mutate(draftToRequest(draft), {
      onSuccess: (row) => {
        useOrdersStore.getState().upsert(row);
      },
      onError: (error) => {
        setSubmitError((error as Error).message);
      },
    });
  }

  return (
    <div className="workbench">
      <header className="workbench__header">
        <h2>Workbench</h2>
        <p className="workbench__conn" data-status={status}>
          {CONN_LABELS[status]} — depth streamed from <code>/depth/&#123;id&#125;</code> via the
          LiveSocket gateway
        </p>
      </header>
      {error && <p className="workbench__error">Instrument list failed: {(error as Error).message}</p>}
      <div className="workbench__panels">
        <OrderBookPanel
          className="workbench__book"          label={selected ? `Order Book — ${selected.exchange}:${selected.symbol}` : 'Order Book'}
          bids={book?.bids ?? []}
          asks={book?.asks ?? []}
          priceDecimals={2}
          sizeDecimals={0}
          headerComponents={
            <MarketSelect
              className="workbench__market-select"
              markets={markets}
              value={selected ? `${selected.exchange}:${selected.symbol}` : undefined}
              placeholder={isLoading ? 'Loading instruments…' : 'Select a market'}
              onChange={(symbol) => setSelected(toInstrumentId(symbol))}
            />
          }
        />
        <section className="workbench__side" aria-label="Order ticket">
          {selected ? (
            <Panel label="Order Ticket">
              <OrderForm
                instrumentId={selected}
                onSubmit={submitDraft}
                isSubmitting={placeOrder.isPending}
                submitError={submitError}
              />
            </Panel>
          ) : (
            <Panel label="Order Ticket">
              <p className="workbench__hint">Select a market to enable the order ticket.</p>
            </Panel>
          )}
          <OrdersTablePanel
            label="Working Orders"
            rows={orderRowList}
            onCancel={(orderId: string) => cancelOrder.mutate(orderId)}
          />
        </section>
      </div>
      {selected && !book && (
        <p className="workbench__waiting">Waiting for the first depth update…</p>
      )}
    </div>
  );
}

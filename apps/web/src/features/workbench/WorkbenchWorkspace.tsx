// Batch I slice 3 (docs/tasks.md §Batch I): the Workbench as a dockview workspace — the first
// real consumer of `dockview-react` (decision recorded in docs/plan.md §3.3). The three
// functional slices from the Batch H/I proof page (book, ticket, working orders) become
// dockview panels whose content still reads the Batch H stores/hooks — dockview is layout
// chrome, not a data layer (shared-conventions rule: fetching/WS/Zustand stay in apps/web).
//
// Layout persistence runs through `useLayoutStore` (Batch H): GET on boot (a saved document
// wins over the default panel set; an unparsable one falls back to defaults), PUT on Save —
// the document round-trips `api.toJSON()`/`fromJSON()` verbatim to
// `/profile/layouts/workbench-default`. `LayoutControlToolbar` (Batch F) is the save/switch UI.
import { useEffect, useMemo, useState } from 'react';
import { DockviewReact } from 'dockview-react';
import type { DockviewReadyEvent, IDockviewPanelProps } from 'dockview-react';
import type { DockviewApi } from 'dockview-core';
import { create } from 'zustand';

import {
  LayoutControlToolbar,
  MarketSelect,
  OrderBookPanel,
  OrderForm,
  OrdersTablePanel,
  Panel,
} from '@honba/ui-core';
import type { MarketOption, OrderDraft as TicketDraft } from '@honba/ui-core';

import { getLiveSocket } from '../../core/liveSocket';
import {
  getApiClient,
  useInstruments,
  useOrders,
  usePlaceOrder,
  useCancelOrder,
} from '../../core/api/query';
import { useMarketStore } from '../../core/store/market';
import { useLayoutStore } from '../../core/store/layout';
import { useOrdersStore } from '../../core/store/orders';
import type { InstrumentId, InstrumentKind, Order, OrdersRequest } from '../../core/types/messages';
import 'dockview-react/dist/styles/dockview.css';
import './WorkbenchWorkspace.css';

/** The server-side layout slot this workspace round-trips through (plan.md §3.3). */
export const WORKBENCH_LAYOUT_NAME = 'workbench-default';

// --- Workspace-shared selection ---------------------------------------------------------------

interface WorkbenchSelectionState {
  selected: InstrumentId | null;
  setSelected: (instrument: InstrumentId | null) => void;
}

/** Shared by the book (sets it) and the ticket (consumes it) dockview panels. */
export const useWorkbenchSelection = create<WorkbenchSelectionState>((set) => ({
  selected: null,
  setSelected: (instrument) => set({ selected: instrument }),
}));

// --- Created-in-slice-2 helpers (unchanged, now shared by the ticket panel) --------------------

const WORKBENCH_KINDS: InstrumentKind[] = ['equity', 'etf', 'index'];

function toInstrumentId(optionSymbol: string): InstrumentId | null {
  const [exchange, ...rest] = optionSymbol.split(':');
  const sym = rest.join(':');
  if (!exchange || !sym) return null;
  return { exchange, symbol: sym };
}

function draftToRequest(draft: TicketDraft): OrdersRequest {
  return {
    instrument_id: draft.instrument_id,
    side: draft.side,
    order_type: draft.order_type,
    qty: draft.qty,
    price: draft.price ?? null,
    tif: draft.tif,
    // Idempotency key, one per submit (the draft/wire gap is documented in OrderForm's header).
    client_order_id: draft.client_order_id ?? `hb-${crypto.randomUUID()}`,
  };
}

/** Wire `Order` → OrdersTable row: `filled_at` is a `UnixNanos` object on the wire (the table
 * prints a primitive) and wire TIF has `gtd`, a value the table's TIF union predates (the
 * column isn't rendered, so it can be dropped here). */
function toOrderRow(order: Order): OrderRow {
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

type OrderRow = Parameters<typeof OrdersTablePanel>[0]['rows'][number];

// --- Panel slices -----------------------------------------------------------------------------

/** Order book panel: market select + LiveSocket depth/quotes subscription → useMarketStore. */
function OrderBookSlice(_props: IDockviewPanelProps) {
  const { data, isLoading, error } = useInstruments();
  const selected = useWorkbenchSelection((state) => state.selected);
  const setSelected = useWorkbenchSelection((state) => state.setSelected);
  const book = useMarketStore((state) => (selected ? state.getDepth(selected) : undefined));

  useEffect(() => {
    if (!selected) return;
    const socket = getLiveSocket();
    const subscriptions = [
      socket.subscribe({ kind: 'depth', instrument: selected }, (update) => {
        useMarketStore.getState().applyDepth(selected!, update.payload);
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
          symbol: `${instrument.id.exchange}:${instrument.id.symbol}`,
        })),
    [data],
  );

  return (
    <div className="workbench-panel workbench-panel--full">
      {error && (
        <p className="workbench-panel__error">Instrument list failed: {(error as Error).message}</p>
      )}
      <OrderBookPanel
        label={selected ? `Order Book — ${selected.exchange}:${selected.symbol}` : 'Order Book'}
        bids={book?.bids ?? []}
        asks={book?.asks ?? []}
        priceDecimals={2}
        sizeDecimals={0}
        headerComponents={
          <MarketSelect
            className="workbench-panel__market-select"
            markets={markets}
            value={selected ? `${selected.exchange}:${selected.symbol}` : undefined}
            placeholder={isLoading ? 'Loading instruments…' : 'Select a market'}
            onChange={(symbol) => setSelected(toInstrumentId(symbol))}
          />
        }
      />
      {selected && !book && (
        <p className="workbench-panel__hint">Waiting for the first depth update…</p>
      )}
    </div>
  );
}

/** Order ticket panel (Batch D's OrderForm → POST /orders). */
function TicketSlice(_props: IDockviewPanelProps) {
  const selected = useWorkbenchSelection((state) => state.selected);
  const placeOrder = usePlaceOrder();
  const [submitError, setSubmitError] = useState<string | null>(null);

  function submitDraft(draft: TicketDraft) {
    setSubmitError(null);
    placeOrder.mutate(draftToRequest(draft), {
      onSuccess: (row) => {
        // Place the returned row immediately (fill/cancel lifecycle handling stays store-side).
        useOrdersStore.getState().upsert(row);
      },
      onError: (error) => {
        setSubmitError((error as Error).message);
      },
    });
  }

  return (
    <div className="workbench-panel workbench-panel--full">
      <Panel label="Order Ticket">
        {selected ? (
          <OrderForm
            instrumentId={selected}
            onSubmit={submitDraft}
            isSubmitting={placeOrder.isPending}
            submitError={submitError}
          />
        ) : (
          <p className="workbench-panel__hint">Select a market to enable the order ticket.</p>
        )}
      </Panel>
    </div>
  );
}

/** Working orders panel: GET snapshot reconciles the store, cancel → DELETE /orders/{id}. */
function WorkingOrdersSlice(_props: IDockviewPanelProps) {
  const ordersQuery = useOrders();
  const cancelOrder = useCancelOrder();

  useEffect(() => {
    if (ordersQuery.data) {
      useOrdersStore.getState().replaceRows(ordersQuery.data.orders);
    }
  }, [ordersQuery.data]);

  const orderIds = useOrdersStore((state) => state.orderIds);
  const orderRows = useOrdersStore((state) => state.rows);
  const rows = useMemo(
    () => orderIds.map((id) => toOrderRow(orderRows[id])),
    [orderIds, orderRows],
  );

  return (
    <div className="workbench-panel workbench-panel--full">
      <OrdersTablePanel
        label="Working Orders"
        rows={rows}
        onCancel={(orderId: string) => cancelOrder.mutate(orderId)}
      />
    </div>
  );
}

// --- The dockview host ------------------------------------------------------------------------

const WORKBENCH_COMPONENTS = {
  'workbench:orderBook': OrderBookSlice,
  'workbench:ticket': TicketSlice,
  'workbench:workingOrders': WorkingOrdersSlice,
};

/**
 * The Workbench's default layout preset (plan.md §3.3): book | ticket side by side, orders on
 * the right. This is the full `SerializedDockview` shape verbatim (probe-verified under jsdom:
 * `grid.root` leaves are *group* view states listing `views`, and the `panels` map carries each
 * panel's `contentComponent`). Booting from a document (not imperative `addPanel`) keeps the
 * default layout deterministic, and it is exactly the document form saved to
 * `/profile/layouts`, so "default" and "saved" layouts share one code path.
 */
const DEFAULT_LAYOUT = {
  grid: {
    orientation: 'HORIZONTAL',
    height: 700,
    width: 1200,
    root: {
      type: 'branch',
      data: [
        {
          type: 'leaf',
          data: {
            id: 'workbench-group:orderBook',
            views: ['workbench:orderBook'],
            activeView: 'workbench:orderBook',
          },
        },
        {
          type: 'leaf',
          data: {
            id: 'workbench-group:ticket',
            views: ['workbench:ticket'],
            activeView: 'workbench:ticket',
          },
        },
        {
          type: 'leaf',
          data: {
            id: 'workbench-group:workingOrders',
            views: ['workbench:workingOrders'],
            activeView: 'workbench:workingOrders',
          },
        },
      ],
    },
  },
  panels: {
    'workbench:orderBook': {
      id: 'workbench:orderBook',
      contentComponent: 'workbench:orderBook',
      title: 'Order Book',
    },
    'workbench:ticket': {
      id: 'workbench:ticket',
      contentComponent: 'workbench:ticket',
      title: 'Order Ticket',
    },
    'workbench:workingOrders': {
      id: 'workbench:workingOrders',
      contentComponent: 'workbench:workingOrders',
      title: 'Working Orders',
    },
  },
  activeGroup: 'workbench-group:orderBook',
} as unknown as Parameters<DockviewApi['fromJSON']>[0];

export function WorkbenchWorkspace() {
  const [api, setApi] = useState<DockviewApi | null>(null);
  const layouts = useLayoutStore((state) => state.layouts);
  const activeLayout = useLayoutStore((state) => state.activeLayout);
  // The toolbar unlocks Save only for dirty layouts (the reference's `layoutDirty`); any
  // dockview layout change marks it, saving clears it.
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!api) return;
    const disposable = api.onDidLayoutChange(() => setDirty(true));
    return () => disposable.dispose();
  }, [api]);

  const handleReady = (event: DockviewReadyEvent) => {
    setApi(event.api);
    void (async () => {
      const layoutStore = useLayoutStore.getState();
      await layoutStore.load(getApiClient());
      const saved = useLayoutStore.getState().layouts[WORKBENCH_LAYOUT_NAME];
      if (saved) {
        try {
          event.api.fromJSON(saved as unknown as Parameters<DockviewApi['fromJSON']>[0]);
          useLayoutStore.getState().setActive(WORKBENCH_LAYOUT_NAME);
          return;
        } catch {
          // A stored document the current dockview can't parse: fall back to the preset below.
        }
      }
      event.api.fromJSON(DEFAULT_LAYOUT as unknown as Parameters<DockviewApi['fromJSON']>[0]);
    })();
  };

  const summaryItems = useMemo(
    () =>
      Object.keys(layouts).map((name) => ({
        id: name,
        label: name,
        canDelete: true,
      })),
    [layouts],
  );

  async function saveLayout() {
    if (!api) return;
    await useLayoutStore.getState().save(
      getApiClient(),
      WORKBENCH_LAYOUT_NAME,
      api.toJSON() as unknown as Record<string, unknown>,
    );
    useLayoutStore.getState().setActive(WORKBENCH_LAYOUT_NAME);
    setDirty(false);
  }

  /** Switch to a stored layout: parse its document in-place (an unparsable one is refused,
   * never silently reset — that would erase the user's panels). */
  function switchLayout(name: string) {
    if (!api) return;
    const saved = layouts[name];
    if (!saved) return;
    try {
      api.fromJSON(saved as unknown as Parameters<DockviewApi['fromJSON']>[0]);
      useLayoutStore.getState().setActive(name);
    } catch {
      useLayoutStore.getState().setActive(activeLayout);
    }
  }

  return (
    <div className="workbench-workspace">
      <div className="workbench-workspace__toolbar">
        <LayoutControlToolbar
          layouts={summaryItems}
          activeLayoutId={activeLayout ?? undefined}
          layoutDirty={dirty}
          onChangeLayout={switchLayout}
          onSaveLayout={() => {
            void saveLayout();
          }}
        />
      </div>
      <DockviewReact
        components={WORKBENCH_COMPONENTS}
        onReady={handleReady}
        className="workbench-workspace__dockview"
      />
    </div>
  );
}

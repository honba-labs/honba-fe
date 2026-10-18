// Live demos for `ui-core/src/modals/*` (Batch G, docs/tasks.md — ClosePositionModal,
// InstrumentInfoModal, EditOrderModal, AppSettingsModal, ActiveOrdersModal,
// OrderDetailsModal). Each tile keeps its own open/close state and fixture domain objects;
// "intents" (close/confirm/amend/cancel) log via console.info and show inline in the tile as
// backticks — exactly how the feature layer will wire them onto honba's REST endpoints
// (Batch H). Demo tiles render raw content — the dashboard's DemoTile frames them.
import { useState } from 'react';
import type { Order, PositionSide } from '@honba/ui-core';
import {
  ActiveOrdersModal,
  AppSettingsModal,
  ClosePositionModal,
  EditOrderModal,
  InstrumentInfoModal,
  OrderDetailsModal,
  formatMoney,
} from '@honba/ui-core';
import type { AppSettings, Trade } from '@honba/ui-core';

const closePosition = {
  instrument_id: { exchange: 'NSE', symbol: 'RELIANCE' },
  side: 'long' as PositionSide,
  quantity: 350,
  avg_price: 2961.2,
};

const editOrder: Order = {
  order_id: 'ORD-182',
  instrument_id: { exchange: 'NSE', symbol: 'RELIANCE' },
  side: 'buy',
  order_type: 'limit',
  status: 'submitted',
  quantity: 100,
  price: 2980,
  time_in_force: 'day',
};

const detailOrder: Order = {
  ...editOrder,
  order_id: 'ORD-171',
  status: 'partially_filled',
  quantity: 50,
  filled_qty: 50,
  avg_fill_price: 2978.4,
};

const fills: Trade[] = [
  {
    order_id: 'ORD-171',
    instrument_id: { exchange: 'NSE', symbol: 'RELIANCE' },
    side: 'buy',
    quantity: 50,
    price: 2978.4,
    costs: { amount: 148920, currency: 'INR' },
    ts_event: { iso: '2026-10-16T09:31:12Z', unix_nanos: '1760609472000000000' },
  },
];

const activeRows: Order[] = [
  detailOrder,
  {
    ...editOrder,
    order_id: 'ORD-183',
    instrument_id: { exchange: 'NSE', symbol: 'TCS' },
    side: 'sell',
    order_type: 'market',
    status: 'partially_filled',
    quantity: 25,
    filled_qty: 10,
    price: null,
  },
];

// Renders an `onSubmit`-style payload inline under the modal button (no console peeking).
function IntentBox({ value }: { value: unknown }) {
  return (
    <pre className="demo-box">
      <code>{value == null ? '(click a demo action)' : JSON.stringify(value, null, 2)}</code>
    </pre>
  );
}

function ModalCard(props: {
  note: string;
  openLabel: string;
  onOpen: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="demo-stack">
      <p className="demo-label">{props.note}</p>
      <div className="demo-row" style={{ marginBottom: 10 }}>
        <button type="button" className="demo-tag" onClick={props.onOpen}>
          {props.openLabel}
        </button>
      </div>
      {props.children}
    </div>
  );
}

function ClosePositionModalDemo() {
  const [open, setOpen] = useState(false);
  const [intent, setIntent] = useState<unknown>(null);
  return (
    <>
      <ModalCard
        note="Confirm-close for a portfolio position (POST /portfolio/close intent)."
        openLabel="Open close-position"
        onOpen={() => setOpen(true)}
      >
        <IntentBox value={intent} />
      </ModalCard>
      <ClosePositionModal
        isOpen={open}
        onClose={() => setOpen(false)}
        position={closePosition}
        onConfirm={() => {
          setIntent({ action: 'close-position', instrument: 'NSE:RELIANCE' });
          setOpen(false);
        }}
      />
    </>
  );
}

function InstrumentInfoModalDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ModalCard
        note="Server-sourced article HTML (GET /instruments/{id}/info — Batch H wiring)."
        openLabel="Open instrument info"
        onOpen={() => setOpen(true)}
      />
      <InstrumentInfoModal
        isOpen={open}
        onClose={() => setOpen(false)}
        article={{
          title: 'RELIANCE — Reliance Industries Ltd.',
          body:
            '<p>Reliance Industries Ltd is India’s largest private-sector conglomerate, spanning energy, retail and telecom.</p>' +
            '<ul><li>NSE: RELIANCE</li><li>Sector: Energy / Petroleum</li></ul>' +
            '<p><a href="https://example.invalid/ril">Article page</a></p>',
        }}
      />
    </>
  );
}

function EditOrderModalDemo() {
  const [open, setOpen] = useState(false);
  const [intent, setIntent] = useState<unknown>(null);
  return (
    <>
      <ModalCard
        note="Amend quantity/price of a working order (broker amend intent, errors via `error`)."
        openLabel="Open edit order"
        onOpen={() => setOpen(true)}
      >
        <IntentBox value={intent} />
      </ModalCard>
      <EditOrderModal
        isOpen={open}
        onClose={() => setOpen(false)}
        order={editOrder}
        onSubmit={(patch) => {
          setIntent({ action: 'amend-order', ...patch });
          setOpen(false);
        }}
      />
    </>
  );
}

function AppSettingsModalDemo() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({ theme: 'dark', clock24h: true });
  return (
    <>
      <div className="demo-row" style={{ marginBottom: 10 }}>
        <button
          type="button"
          className="demo-tag"
          aria-pressed={false}
          onClick={() => setOpen(true)}
        >
          Open app settings
        </button>
        <span className="demo-label">
          settings: theme={settings.theme} clock24h={String(settings.clock24h)}
        </span>
      </div>
      <AppSettingsModal
        isOpen={open}
        onClose={() => setOpen(false)}
        settings={settings}
        onChange={(patch) => setSettings((prev) => ({ ...prev, ...patch }))}
      />
      <IntentBox value={settings} />
    </>
  );
}

function ActiveOrdersModalDemo() {
  const [open, setOpen] = useState(false);
  const [intent, setIntent] = useState<unknown>(null);
  return (
    <>
      <ModalCard
        note="Resume/cancel flow over working orders after a reconnect (Batch H WS wiring)."
        openLabel="Open active orders"
        onOpen={() => setOpen(true)}
      >
        <IntentBox value={intent} />
      </ModalCard>
      <ActiveOrdersModal
        isOpen={open}
        onClose={() => setOpen(false)}
        rows={activeRows}
        restoredAfterReconnect
        onCancel={(ids) => {
          setIntent({ action: 'cancel-order-set', ids });
          setOpen(false);
        }}
        onResume={(ids) => {
          setIntent({ action: 'resend-order-set', ids });
          setOpen(false);
        }}
      />
    </>
  );
}

function OrderDetailsModalDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ModalCard
        note="One order's facts + its fills; export stays app-owned (saveAsJSON at Batch H)."
        openLabel="Open order details"
        onOpen={() => setOpen(true)}
      />
      <OrderDetailsModal
        isOpen={open}
        onClose={() => setOpen(false)}
        order={detailOrder}
        fills={fills}
        onExport={(rows) => console.info('export fills', rows.map((row) => row.order_id))}
      />
    </>
  );
}

export const modalTiles = [
  {
    id: 'close-position-modal',
    name: 'ClosePositionModal',
    source: 'modals/ClosePositionModal',
    description: "Close-position confirm dialog — onConfirm hands the intent to the caller.",
    node: <ClosePositionModalDemo />,
  },
  {
    id: 'instrument-info-modal',
    name: 'InstrumentInfoModal',
    source: 'modals/InstrumentInfoModal',
    description: 'Instrument article (CcyInfoModal rename); trusted server HTML + link hardening.',
    node: <InstrumentInfoModalDemo />,
  },
  {
    id: 'edit-order-modal',
    name: 'EditOrderModal',
    source: 'modals/EditOrderModal',
    description: 'Working-order amend (qty/price) with client + caller validation surfaces.',
    node: <EditOrderModalDemo />,
  },
  {
    id: 'app-settings-modal',
    name: 'AppSettingsModal',
    source: 'modals/AppSettingsModal',
    description: 'Theme + clock-format settings (reference tabs collapsed to honba’s real set).',
    node: <AppSettingsModalDemo />,
  },
  {
    id: 'active-orders-modal',
    name: 'ActiveOrdersModal',
    source: 'modals/ActiveOrdersModal',
    description: 'ActiveAlgoOrdersModal rename: reconnect resume/cancel over working orders.',
    node: <ActiveOrdersModalDemo />,
  },
  {
    id: 'order-details-modal',
    name: 'OrderDetailsModal',
    source: 'modals/OrderDetailsModal',
    description: `AlgoOrderDetailsModal rename: order facts + fills (avg fill ${fills[0].price.toLocaleString()}, costs ${formatMoney(fills[0].costs)}).`,
    node: <OrderDetailsModalDemo />,
  },
];

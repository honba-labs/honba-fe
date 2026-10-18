// Batch H (docs/tasks.md) — the exit criterion: Workbench's OrderBook renders live data from
// `/depth/{id}` through a real `useMarketStore` subscription. This is the first real app page
// (it replaces the Batch F placeholder for /workbench): MarketSelect (Batch C) feeds the
// instrument; on selection, the page subscribes the shared LiveSocket's quotes+depth channels
// for that instrument and every tick lands in `useMarketStore`, which this panel reads.
//
// What's deliberately still out of scope (Batch I): the dockable workspace shell
// (dockview-react), the order ticket/stats panels, and layout persistence UI — the page is
// the end-to-end proof slice, not the finished Workbench.
import { useEffect, useMemo, useState } from 'react';

import { MarketSelect, OrderBookPanel } from '@honba/ui-core';
import type { MarketOption } from '@honba/ui-core';

import { getLiveSocket } from '../../core/liveSocket';
import { useInstruments } from '../../core/api/query';
import { useMarketStore } from '../../core/store/market';
import { useConnectionStore } from '../../core/store/connection';
import type { InstrumentId, InstrumentKind } from '../../core/types/messages';
import './WorkbenchPage.css';

const CONN_LABELS: Record<string, string> = {
  idle: 'Idle',
  connecting: 'Connecting…',
  live: 'Live',
  reconnecting: 'Reconnecting…',
  failed: 'Data feed failed',
};

/** The kinds a Workbench book can stream today (equity-only F&O symbols come with Batch I). */
const WORKBENCH_KINDS: InstrumentKind[] = ['equity', 'etf', 'index'];

function toInstrumentId(optionSymbol: string): InstrumentId | null {
  const [exchange, ...rest] = optionSymbol.split(':');
  const sym = rest.join(':');
  if (!exchange || !sym) return null;
  return { exchange, symbol: sym };
}

export function WorkbenchPage() {
  const { data, isLoading, error } = useInstruments();
  const [selected, setSelected] = useState<InstrumentId | null>(null);
  const book = useMarketStore((state) => (selected ? state.getDepth(selected) : undefined));
  const status = useConnectionStore((state) => state.status);

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
      <OrderBookPanel
        label={selected ? `Order Book — ${selected.exchange}:${selected.symbol}` : 'Order Book'}
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
      {selected && !book && (
        <p className="workbench__waiting">Waiting for the first depth update…</p>
      )}
    </div>
  );
}

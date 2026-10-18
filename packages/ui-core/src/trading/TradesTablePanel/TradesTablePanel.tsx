// Ported/modernized from bfx-hf-ui-core's `TradesTablePanel` (Apache-2.0). The original wires a
// WS-subscribed per-market trades feed (`useWidgetMarket`, `WSSubscribeChannel`/
// `WSUnsubscribeChannel`, `@ufx-ui/core`'s `Trades`) straight into a `Panel`. This package does
// no fetching/WS/Redux (see Shared conventions in docs/tasks.md), so all of that is dropped: the
// component here is a pure `rows: Trade[]` -> table renderer, same shape as `OrdersTablePanel`/
// `PositionsTablePanel` (a combined table+panel, since the reference has no separate bare
// "TradesTable" to port). Market selection (the original's `MarketSelect` header slot) is left as
// the generic `headerComponents` slot, same convention as the sibling Batch D panels, rather than
// baked in here.
//
// Schema note (verified against `honba/schema/openapi/openapi.json`, as the brief asked):
// `GET /portfolio/trades` returns `TradesResponse { trades: Trade[] }` exactly as the task brief
// described -- no correction needed here (unlike `PositionsTable`'s and `BalancesTable`'s slices,
// which each found a response-shape mismatch). `Trade` is a completed fill: `order_id`,
// `instrument_id`, `side` (`buy`/`sell` only -- a trade, unlike a resting order, never carries
// `no_order_side`), `quantity`, `price`, `costs` (`Money`, defaults to zero), `ts_event` (fill
// time) and `ts_init` (both `UnixNanos`). `ts_init` isn't rendered as its own column -- `ts_event`
// is the fill timestamp the brief calls for -- but is kept optional on the row type for wire
// fidelity. `notional` (`quantity * price`) isn't a wire field; it's derived here per the brief.
//
// `Money`/`formatMoney` are reused from `../PositionsTable` rather than redefined -- same wire
// shape (`honba`'s `Money`: integer minor units + currency code), and redefining them here would
// create a duplicate exported name once both land in `ui-core/src/index.ts`.
import { useMemo, useRef } from 'react';
import { useTable, tableFeatures, flexRender, type ColumnDef } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import clsx from 'clsx';

// See OrdersTable.tsx's header comment: @tanstack/react-table 9.x needs an explicit (possibly
// empty) `features` registry even when no optional feature (sorting, filtering, sizing, ...) is
// used -- column widths are fixed in CSS/inline styles here rather than the sizing feature.
const tableFeatureSet = tableFeatures({});
type TradesTableFeatures = typeof tableFeatureSet;

import type { ReactNode } from 'react';
import type { InstrumentId } from '../OrderForm';
import type { Money } from '../PositionsTable';
import { formatMoney } from '../PositionsTable';
import { Panel } from '../../ui/Panel';
import './TradesTablePanel.css';

/** honba's `UnixNanos` wire shape: an ISO-8601 string paired with the raw nanosecond count. */
export interface UnixNanos {
  iso: string;
  unix_nanos: string;
}

/**
 * Row shape for this table. Mirrors `GET /portfolio/trades`'s `Trade`
 * (`honba/schema/openapi/openapi.json`, wrapped as `TradesResponse { trades: Trade[] }`) as-is --
 * see the component header comment for the one field (`ts_init`) kept optional/unrendered.
 */
export interface Trade {
  order_id: string;
  instrument_id: InstrumentId;
  /** A trade always has a side -- never `no_order_side` (that's only possible for a resting order). */
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  costs: Money;
  ts_event: UnixNanos;
  ts_init?: UnixNanos;
}

export interface TradesTablePanelProps {
  rows: Trade[];
  label?: ReactNode;
  /** Slot for header controls (e.g. a market filter). */
  headerComponents?: ReactNode;
  /** Slot for extra header icon buttons. */
  extraIcons?: ReactNode;
  removeable?: boolean;
  onRemove?: () => void;
  emptyMessage?: string;
  /** Scroll-container height in px, passed to the virtualizer. */
  height?: number;
  panelClassName?: string;
  className?: string;
}

function notionalOf(row: Trade): number {
  return row.quantity * row.price;
}

const COLUMN_WIDTHS: Record<string, number> = {
  instrument: 150,
  side: 70,
  quantity: 90,
  price: 110,
  notional: 130,
  costs: 110,
  timestamp: 190,
};

export function TradesTablePanel({
  rows,
  label = 'Trades',
  headerComponents,
  extraIcons,
  removeable = false,
  onRemove,
  emptyMessage = 'No trades',
  height = 320,
  panelClassName,
  className,
}: TradesTablePanelProps) {
  const columns = useMemo<ColumnDef<TradesTableFeatures, Trade>[]>(
    () => [
      {
        id: 'instrument',
        header: 'Instrument',
        accessorFn: (row) => `${row.instrument_id.symbol} · ${row.instrument_id.exchange}`,
      },
      {
        id: 'side',
        header: 'Side',
        accessorFn: (row) => row.side,
        cell: ({ row }) => (
          <span className={clsx('hb-trades-table__side', `hb-trades-table__side--${row.original.side}`)}>
            {row.original.side.toUpperCase()}
          </span>
        ),
      },
      {
        id: 'quantity',
        header: 'Qty',
        accessorFn: (row) => String(row.quantity),
      },
      {
        id: 'price',
        header: 'Price',
        accessorFn: (row) => String(row.price),
      },
      {
        id: 'notional',
        header: 'Notional',
        accessorFn: (row) => notionalOf(row).toFixed(2),
      },
      {
        id: 'costs',
        header: 'Costs',
        accessorFn: (row) => formatMoney(row.costs),
      },
      {
        id: 'timestamp',
        header: 'Time',
        accessorFn: (row) => row.ts_event.iso,
      },
    ],
    [],
  );

  const table = useTable({
    features: tableFeatureSet,
    data: rows,
    columns,
  });

  const tableRows = table.getRowModel().rows;
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 36,
    overscan: 8,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <Panel
      label={label}
      headerComponents={headerComponents}
      extraIcons={extraIcons}
      removeable={removeable}
      onRemove={onRemove}
      className={panelClassName}
    >
      <div className={clsx('hb-trades-table', className)}>
        {rows.length === 0 ? (
          <p className="hb-trades-table__empty">{emptyMessage}</p>
        ) : (
          <div ref={scrollRef} className="hb-trades-table__scroll" style={{ height }}>
            <table className="hb-trades-table__table" style={{ display: 'grid' }}>
              <thead style={{ display: 'grid', position: 'sticky', top: 0, zIndex: 1 }}>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} style={{ display: 'flex', width: '100%' }}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} style={{ width: COLUMN_WIDTHS[header.column.id] }}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody
                style={{
                  display: 'grid',
                  height: `${virtualizer.getTotalSize()}px`,
                  position: 'relative',
                }}
              >
                {virtualItems.map((virtualRow) => {
                  const row = tableRows[virtualRow.index];
                  return (
                    <tr
                      key={row.id}
                      style={{
                        display: 'flex',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {row.getAllCells().map((cell) => (
                        <td key={cell.id} style={{ width: COLUMN_WIDTHS[cell.column.id] }}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Panel>
  );
}

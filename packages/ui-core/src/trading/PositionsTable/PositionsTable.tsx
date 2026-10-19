// Ported/modernized from bfx-hf-ui-core's `PositionsTable`/`PositionsTable.columns` (Apache-2.0).
//
// Schema note (resolved by reading `honba/schema/openapi/openapi.json` directly, correcting an
// assumption in this task's brief): `GET /portfolio/positions` actually returns
// `PortfolioPositionsResponse` -> `PortfolioPosition[]`, the richer "valued position" shape
// (ADR-0032: `mark`/`market_value`/`unrealized_pnl`/`product`/`group_name` alongside the bare
// fields), not the plain `PositionsResponse` -> `Position[]` the brief described as the route's
// response. The bare `Position[]` shape is what `POST /positions/close` returns instead. Rather
// than re-litigate which is "the" row type, `PositionRow` below makes the fields both shapes
// share required, and the richer valuation fields `PortfolioPosition` adds optional -- so this
// table renders correctly against either response.
//
// Dropped from the original: Redux (`setClosePositionModal` dispatch, `tableState`
// persistence), `@ufx-ui/core`'s `PrettyValue`/`VirtualTable` (hand-rolled formatting/
// virtualization -- this package uses `@tanstack/react-table` + `@tanstack/react-virtual`
// instead, per docs/tasks.md Batch D), `liquidationPrice`/`marginFunding` columns (margin/funding
// concepts with no honba equivalent today), i18n. What's kept: a side badge (long/short/flat),
// avg price vs. mark, a PnL readout (via ui-core's `PLNumber`) and a close-action slot
// (`onClose`) -- this package does no fetching/Redux/WS (see Shared conventions); wiring
// `onClose` to `POST /positions/close` is Batch H/I's job, not this one.
import { useMemo, useRef } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import clsx from 'clsx';

// See OrdersTable.tsx's header comment: @tanstack/react-table 9.x keeps the core row model
// opt-in via `getCoreRowModel()`; no add-on features (sorting/filtering/sizing) are used here --
// column widths are fixed in CSS/inline styles rather than the `columnSizing` feature state.

import type { InstrumentId } from '../OrderForm';
import { PLNumber } from '../../ui/PLNumber';
import './PositionsTable.css';

/** honba's `PositionSide` -- a *held* position is always long or short; `quantity === 0` (flat)
 * carries whichever side it last held, so this table derives a distinct "FLAT" badge from
 * `quantity`, not from `side`. */
export type PositionSide = 'long' | 'short';

/** honba's `Product` holding-period tag (ADR 0010); optional because the bare `Position` shape
 * doesn't carry it. */
export type PositionProduct = 'delivery' | 'intraday' | 'carry';

/** honba's `Money`: an integer amount in minor units plus its currency code. */
export interface Money {
  amount: number;
  currency: string;
}

/**
 * Row shape for this table. Required fields mirror the bare `Position`
 * (`instrument_id`/`side`/`quantity`/`avg_price`/`realized_pnl`); `mark`/`market_value`/
 * `unrealized_pnl`/`product`/`group_name` are the `PortfolioPosition` (ADR-0032) additions, kept
 * optional so this table renders usefully against either shape -- see the header comment above
 * for which one the real `GET /portfolio/positions` route actually returns.
 */
export interface PositionRow {
  instrument_id: InstrumentId;
  side: PositionSide;
  /** Always `>= 0`; the side carries direction. `0` means flat. */
  quantity: number;
  avg_price: number;
  realized_pnl: Money;
  mark?: number;
  market_value?: Money;
  unrealized_pnl?: Money;
  product?: PositionProduct;
  group_name?: string | null;
}

export interface PositionsTableProps {
  rows: PositionRow[];
  /** Called with the row's `instrument_id` when its close control is clicked. Omitted entirely
   * for flat (`quantity === 0`) rows -- there is nothing to close. */
  onClose?: (instrumentId: InstrumentId) => void;
  emptyMessage?: string;
  /** Scroll-container height in px, passed to the virtualizer. */
  height?: number;
  className?: string;
}

/** honba amounts are integer minor units (see `Currency`'s minor exponent); every `Currency`
 * variant today (INR/USD/EUR/GBP) uses 2 minor digits, so this assumes that rather than carrying
 * a currency-keyed lookup table -- revisit if/when a different-minor-exponent currency ships. */
export function formatMoney(money: Money): string {
  return `${(money.amount / 100).toFixed(2)} ${money.currency}`;
}

function isFlat(row: PositionRow): boolean {
  return row.quantity === 0;
}

const PRODUCT_LABELS: Record<PositionProduct, string> = {
  delivery: 'Delivery',
  intraday: 'Intraday',
  carry: 'Carry',
};

const COLUMN_WIDTHS: Record<string, number> = {
  instrument: 150,
  side: 70,
  quantity: 90,
  avg_price: 100,
  mark: 100,
  market_value: 130,
  realized_pnl: 120,
  unrealized_pnl: 120,
  product: 90,
  actions: 90,
};

export function PositionsTable({
  rows,
  onClose,
  emptyMessage = 'No open positions',
  height = 320,
  className,
}: PositionsTableProps) {
  const columns = useMemo<ColumnDef<PositionRow>[]>(() => {
    const cols: ColumnDef<PositionRow>[] = [
      {
        id: 'instrument',
        header: 'Instrument',
        accessorFn: (row) => `${row.instrument_id.symbol} · ${row.instrument_id.exchange}`,
      },
      {
        id: 'side',
        header: 'Side',
        accessorFn: (row) => row.side,
        cell: ({ row }) => {
          const flat = isFlat(row.original);
          const tone = flat ? 'flat' : row.original.side;
          return (
            <span className={clsx('hb-positions-table__side', `hb-positions-table__side--${tone}`)}>
              {flat ? 'FLAT' : row.original.side.toUpperCase()}
            </span>
          );
        },
      },
      {
        id: 'quantity',
        header: 'Qty',
        accessorFn: (row) => String(row.quantity),
      },
      {
        id: 'avg_price',
        header: 'Avg Price',
        accessorFn: (row) => String(row.avg_price),
      },
      {
        id: 'mark',
        header: 'Mark',
        accessorFn: (row) => (row.mark != null ? String(row.mark) : '-'),
      },
      {
        id: 'market_value',
        header: 'Mkt Value',
        accessorFn: (row) => (row.market_value ? formatMoney(row.market_value) : '-'),
      },
      {
        id: 'realized_pnl',
        header: 'Realized P&L',
        cell: ({ row }) => (
          <PLNumber value={row.original.realized_pnl.amount / 100} ccy={row.original.realized_pnl.currency} />
        ),
      },
      {
        id: 'unrealized_pnl',
        header: 'Unrealized P&L',
        cell: ({ row }) => {
          const upnl = row.original.unrealized_pnl;
          if (!upnl) return <span>-</span>;
          return <PLNumber value={upnl.amount / 100} ccy={upnl.currency} />;
        },
      },
      {
        id: 'product',
        header: 'Product',
        accessorFn: (row) => (row.product ? PRODUCT_LABELS[row.product] : '-'),
      },
    ];

    if (onClose) {
      cols.push({
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const position = row.original;
          if (isFlat(position)) return null;

          return (
            <button
              type="button"
              className="hb-positions-table__close"
              onClick={() => onClose(position.instrument_id)}
            >
              Close
            </button>
          );
        },
      });
    }

    return cols;
  }, [onClose]);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const tableRows = table.getRowModel().rows;
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 36,
    overscan: 8,
  });

  if (rows.length === 0) {
    return (
      <div className={clsx('hb-positions-table', className)}>
        <p className="hb-positions-table__empty">{emptyMessage}</p>
      </div>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className={clsx('hb-positions-table', className)}>
      <div ref={scrollRef} className="hb-positions-table__scroll" style={{ height }}>
        <table className="hb-positions-table__table" style={{ display: 'grid' }}>
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
    </div>
  );
}

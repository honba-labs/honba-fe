// Ported/modernized from bfx-hf-ui-core's `StrategyTradesTable` + `StrategyTradesTable.columns`
// (src/components/StrategyTradesTable/*, Apache-2.0).
//
// The original renders a backtest/live strategy's *closed positions* with an expandable row
// exposing the underlying order details. Dropped from the original: Redux (`tableState`
// persistence, layout-config expand/compress — that's `apps/web`'s docking concern, Batch F),
// `@ufx-ui/core`'s `VirtualTable`/`PrettyValue` (replaced with `@tanstack/react-table` +
// `@tanstack/react-virtual` per docs/tasks.md Batch D conventions), the CSV export button
// (`csv-export`/`file-saver` — callers export their feature's data if they need it), i18n.
//
// Row shape: a closed *round trip* (entry → exit), the analog of honba's backtest trade events
// (`GET /backtests/{id}/events` of type trade / a backtest's `trades[]`). Times accept epoch ms
// numbers or ISO strings — honba's `UnixNanos` carries an ISO twin, so both wire shapes will
// pass through; formatting is kept plain (the caller can pre-format via a custom value node if
// a locale wants it).
//
// Presentational + backend-agnostic: rows in, expansion state owned locally, callbacks (row
// selection) out.
import { useMemo, useRef, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import clsx from 'clsx';
import { Minus, Plus } from 'lucide-react';

// See OrdersTable.tsx's header comment: @tanstack/react-table 9.x keeps the core row model
// opt-in via `getCoreRowModel()`; no add-on features (sorting/filtering/sizing) are used here.

export type TradeRowSide = 'long' | 'short';

export interface StrategyTradeRow {
  id: string;
  /** Trade entry time; epoch ms number or ISO string (honba's `UnixNanos.iso` twin). */
  entryAt: number | string;
  /** Exit time; omitted while the trade is still open. */
  closedAt?: number | string;
  entryPrice: number;
  closingPrice?: number | null;
  amount: number;
  realizedPnl: number;
  side?: TradeRowSide;
  /** Underlying order reference surfaced in the expanded detail row (from the reference's
   * expandable `order_js` detail). */
  orderId?: string;
  orderType?: string;
}

export interface StrategyTradesTableProps {
  rows: StrategyTradeRow[];
  emptyMessage?: string;
  /** Scroll-container height in px, passed to the virtualizer. */
  height?: number;
  className?: string;
}

const COLUMN_WIDTHS: Record<string, number> = {
  select: 40,
  id: 60,
  entry_at: 180,
  closed_at: 180,
  entry_price: 120,
  closing_price: 120,
  amount: 110,
  realized_pnl: 140,
  side: 70,
};

const TRADE_ROW_HEIGHT = 36;
const DETAIL_ROW_HEIGHT = 72;

function formatTime(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return new Date(value).toISOString().replace('T', ' ').replace('Z', '');
  return value.replace('T', ' ').replace('Z', '');
}

function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

function formatPnl(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('en-US', { maximumFractionDigits: 6 })}`;
}

export function StrategyTradesTable({
  rows,
  emptyMessage = 'No trades',
  height = 240,
  className,
}: StrategyTradesTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const columns = useMemo<ColumnDef<StrategyTradeRow>[]>(() => [
    {
      id: 'select',
      header: '',
      cell: ({ row }) => (
        <button
          type="button"
          className="hb-strategy-trades-table__toggle"
          aria-label={row.original.id === expandedId ? 'Collapse trade' : 'Expand trade'}
          onClick={() => setExpandedId((current) => (current === row.original.id ? null : row.original.id))}
        >
          {row.original.id === expandedId ? <Minus size={12} /> : <Plus size={12} />}
        </button>
      ),
    },
    {
      id: 'id',
      header: '#',
      accessorFn: (row) => `#${row.id}`,
    },
    {
      id: 'entry_at',
      header: 'Entry',
      accessorFn: (row) => String(row.entryAt),
      cell: ({ row }) => formatTime(row.original.entryAt),
    },
    {
      id: 'closed_at',
      header: 'Closed',
      accessorFn: (row) => String(row.closedAt ?? ''),
      cell: ({ row }) => formatTime(row.original.closedAt),
    },
    {
      id: 'entry_price',
      header: 'Entry Price',
      cell: ({ row }) => formatPrice(row.original.entryPrice),
    },
    {
      id: 'closing_price',
      header: 'Close Price',
      cell: ({ row }) => formatPrice(row.original.closingPrice),
    },
    {
      id: 'amount',
      header: 'Amount',
      accessorFn: (row) => String(row.amount),
    },
    {
      id: 'realized_pnl',
      header: 'Realized P&L',
      accessorFn: (row) => String(row.realizedPnl),
      cell: ({ row }) => (
        <span
          className={clsx('hb-strategy-trades-table__pnl', {
            positive: row.original.realizedPnl > 0,
            negative: row.original.realizedPnl < 0,
          })}
        >
          {formatPnl(row.original.realizedPnl)}
        </span>
      ),
    },
    {
      id: 'side',
      header: 'Side',
      accessorFn: (row) => row.side ?? '',
      cell: ({ row }) => (row.original.side ? row.original.side.toUpperCase() : '—'),
    },
  ], [expandedId]);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const tableRows = table.getRowModel().rows;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mixed-kind virtualized list (same trick as BalancesTable): a trade row plus, when expanded,
  // one deterministic-height detail row under it — so `estimateSize` stays a plain function of
  // the item index and `measureElement` isn't needed.
  const items = useMemo(() => (
    tableRows.flatMap((row) => {
      const trade = { kind: 'trade' as const, row, height: TRADE_ROW_HEIGHT };
      return row.original.id === expandedId
        ? [trade, { kind: 'detail' as const, row, height: DETAIL_ROW_HEIGHT }]
        : [trade];
    })
  ), [tableRows, expandedId]);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => items[index].height,
    overscan: 8,
  });

  if (rows.length === 0) {
    return (
      <div className={clsx('hb-strategy-trades-table', className)}>
        <p className="hb-strategy-trades-table__empty">{emptyMessage}</p>
      </div>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className={clsx('hb-strategy-trades-table', className)}>
      <div ref={scrollRef} className="hb-strategy-trades-table__scroll" style={{ height }}>
        <table className="hb-strategy-trades-table__table" style={{ display: 'grid' }}>
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
            {virtualItems.map((virtualItem) => {
              const item = items[virtualItem.index];
              if (item.kind === 'trade') {
                return (
                  <tr
                    key={item.row.id}
                    style={{
                      display: 'flex',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    {item.row.getAllCells().map((cell) => (
                      <td key={cell.id} style={{ width: COLUMN_WIDTHS[cell.column.id] }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              }
              const trade = item.row.original;
              return (
                <tr
                  key={`${trade.id}-detail`}
                  className="hb-strategy-trades-table__detail-row"
                  style={{
                    display: 'flex',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${DETAIL_ROW_HEIGHT}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <td colSpan={9} style={{ width: '100%' }}>
                    <div className="hb-strategy-trades-table__detail">
                      <span>Order: {trade.orderId ?? '—'}</span>
                      <span>Type: {trade.orderType ?? '—'}</span>
                      <span>Side: {trade.side ?? '—'}</span>
                      <span>Amount: {trade.amount}</span>
                      <span>Entry: {formatTime(trade.entryAt)}</span>
                      <span>Closed: {formatTime(trade.closedAt)}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

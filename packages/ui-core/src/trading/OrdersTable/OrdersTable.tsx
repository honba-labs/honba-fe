// This component's intent is ported/modernized from three bfx-hf-ui-core components, folded
// into one (Apache-2.0): `src/components/AtomicOrdersTable` (the live/working-orders grid with a
// cancel action) and `src/components/OrderHistory` (the closed-orders view) are the same table
// with a different status filter, so they're one component here with a `statusFilter` prop
// instead of two near-duplicate ones. `src/components/{AlgoOrdersTable,AlgoOrdersTablePanel,
// AlgoOrdersHistoryButton}` aren't ported as separate components at all: honba's `Order` type
// (see `honba/schema/openapi/openapi.json`) has one `order_type` enum
// (market/limit/stop_market/stop_limit/trailing_stop) and no distinct "algo order" concept the
// way Bitfinex's OCO/Iceberg/TWAP/etc. catalog does, so there is nothing structurally separate to
// port — their UX intent (a type badge per row, and a history toggle) becomes this table's type
// badge column and `statusFilter` prop respectively.
//
// Dropped from the originals: Redux (`cancelOrder`/`editOrder` dispatch, `tableState`
// persistence), `@ufx-ui/core`'s `VirtualTable`/`UfxOrderHistory` (hand-rolled virtualization —
// this package uses `@tanstack/react-table` + `@tanstack/react-virtual` instead per
// docs/tasks.md Batch D), i18n, and the edit-order action (no honba equivalent yet). What's kept:
// a type badge, a status column, and a cancel-action slot (`onCancel`) for working orders — this
// package does no fetching/Redux/WS (see Shared conventions); wiring `onCancel` to
// `DELETE /orders/{id}` is Batch H/I's job, not this one.
import { useMemo, useRef } from 'react';
import { useTable, tableFeatures, flexRender, type ColumnDef } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import clsx from 'clsx';

// @tanstack/react-table 9.x replaced the v8 `useReactTable({ getCoreRowModel: getCoreRowModel() })`
// API with a feature-registry model: the core row model is always on, and every other behavior
// (sorting, filtering, sizing, ...) is an opt-in entry in a `features` object. This table needs
// none of those — status filtering happens in plain JS below, and column widths are fixed in CSS
// rather than driven by the `columnSizingFeature` state slice — so `features` is empty and
// `table.getRowModel()` is used as-is.
const tableFeatureSet = tableFeatures({});
type OrdersTableFeatures = typeof tableFeatureSet;

import type { InstrumentId, OrderType, TimeInForce } from '../OrderForm';
import './OrdersTable.css';

/** honba's order lifecycle states (`OrderStatus` in `honba/schema/openapi/openapi.json`). */
export type OrderStatus =
  | 'initialized'
  | 'submitted'
  | 'accepted'
  | 'partially_filled'
  | 'filled'
  | 'cancelled'
  | 'rejected'
  | 'expired';

/** honba's `OrderSide`; a resting/record order may carry no side (`no_order_side`). */
export type OrderRowSide = 'buy' | 'sell' | 'no_order_side';

/**
 * Row shape for this table. Mirrors `GET /orders`'s `Order` (honba/schema/openapi/openapi.json,
 * wrapped as `OrdersResponse { orders: Order[] }`), trimmed/renamed only where this is a UI row
 * rather than the wire DTO — see the component header for what's deliberately not ported.
 */
export interface Order {
  order_id: string;
  instrument_id: InstrumentId;
  side: OrderRowSide;
  order_type: OrderType;
  status: OrderStatus;
  quantity: number;
  filled_qty?: number;
  price?: number | null;
  trigger_price?: number | null;
  trail_amount?: number | null;
  trail_percent?: number | null;
  avg_fill_price?: number | null;
  time_in_force?: TimeInForce;
  /** A cancel was asked for and not yet answered (ADR 0019); only meaningful while working. */
  cancel_requested?: boolean;
  /** Event time of the latest fill; `undefined`/`null` until a fill. */
  filled_at?: number | string | null;
}

const WORKING_STATUSES: OrderStatus[] = ['initialized', 'submitted', 'accepted', 'partially_filled'];
const TERMINAL_STATUSES: OrderStatus[] = ['filled', 'cancelled', 'rejected', 'expired'];

function isCancellable(status: OrderStatus): boolean {
  return WORKING_STATUSES.includes(status);
}

const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  market: 'Market',
  limit: 'Limit',
  stop_market: 'Stop',
  stop_limit: 'Stop Limit',
  trailing_stop: 'Trailing Stop',
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  initialized: 'Initialized',
  submitted: 'Submitted',
  accepted: 'Accepted',
  partially_filled: 'Partially Filled',
  filled: 'Filled',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
  expired: 'Expired',
};

const STATUS_TONE: Record<OrderStatus, 'neutral' | 'working' | 'positive' | 'negative'> = {
  initialized: 'neutral',
  submitted: 'working',
  accepted: 'working',
  partially_filled: 'working',
  filled: 'positive',
  cancelled: 'neutral',
  rejected: 'negative',
  expired: 'neutral',
};

function formatQty(order: Order): string {
  const filled = order.filled_qty;
  if (filled && filled > 0 && filled !== order.quantity) {
    return `${filled} / ${order.quantity}`;
  }
  return String(order.quantity);
}

function formatPrice(order: Order): string {
  if (order.order_type === 'trailing_stop') {
    if (order.trail_amount != null) return `±${order.trail_amount}`;
    if (order.trail_percent != null) return `±${order.trail_percent}%`;
    return '-';
  }
  if (order.trigger_price != null && order.price != null) {
    return `${order.price} @ ${order.trigger_price}`;
  }
  if (order.trigger_price != null) return `@ ${order.trigger_price}`;
  if (order.price != null) return String(order.price);
  return '-';
}

export type OrdersTableStatusFilter = 'open' | 'history' | 'all';

export interface OrdersTableProps {
  rows: Order[];
  /**
   * `'open'` (default) shows only working orders (folds in bfx-hf-ui-core's AtomicOrdersTable);
   * `'history'` shows only closed/terminal orders (folds in bfx-hf-ui-core's OrderHistory);
   * `'all'` applies no status filter.
   */
  statusFilter?: OrdersTableStatusFilter;
  /** Called with `order_id` when the cancel control for a working order is clicked. */
  onCancel?: (orderId: string) => void;
  emptyMessage?: string;
  /** Scroll-container height in px, passed to the virtualizer. */
  height?: number;
  className?: string;
}

function filterRows(rows: Order[], statusFilter: OrdersTableStatusFilter): Order[] {
  if (statusFilter === 'open') return rows.filter((row) => WORKING_STATUSES.includes(row.status));
  if (statusFilter === 'history') return rows.filter((row) => TERMINAL_STATUSES.includes(row.status));
  return rows;
}

// Column widths, fixed here rather than via the (unused) `columnSizingFeature` state slice -
// this table has no need for interactive column resizing.
const COLUMN_WIDTHS: Record<string, number> = {
  order_id: 90,
  instrument: 150,
  side: 70,
  order_type: 110,
  quantity: 100,
  price: 130,
  avg_fill_price: 100,
  status: 150,
  actions: 110,
};

export function OrdersTable({
  rows,
  statusFilter = 'open',
  onCancel,
  emptyMessage = 'No orders',
  height = 320,
  className,
}: OrdersTableProps) {
  const data = useMemo(() => filterRows(rows, statusFilter), [rows, statusFilter]);

  const columns = useMemo<ColumnDef<OrdersTableFeatures, Order>[]>(() => {
    const cols: ColumnDef<OrdersTableFeatures, Order>[] = [
      {
        id: 'order_id',
        header: 'Order ID',
        accessorFn: (row) => row.order_id,
      },
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
          <span className={clsx('hb-orders-table__side', `hb-orders-table__side--${row.original.side}`)}>
            {row.original.side === 'no_order_side' ? '-' : row.original.side.toUpperCase()}
          </span>
        ),
      },
      {
        id: 'order_type',
        header: 'Type',
        accessorFn: (row) => row.order_type,
        cell: ({ row }) => (
          <span className="hb-orders-table__type-badge">{ORDER_TYPE_LABELS[row.original.order_type]}</span>
        ),
      },
      {
        id: 'quantity',
        header: 'Qty',
        accessorFn: (row) => formatQty(row),
      },
      {
        id: 'price',
        header: 'Price',
        accessorFn: (row) => formatPrice(row),
      },
      {
        id: 'avg_fill_price',
        header: 'Avg Fill',
        accessorFn: (row) => (row.avg_fill_price != null ? String(row.avg_fill_price) : '-'),
      },
      {
        id: 'status',
        header: 'Status',
        accessorFn: (row) => row.status,
        cell: ({ row }) => (
          <span
            className={clsx(
              'hb-orders-table__status',
              `hb-orders-table__status--${STATUS_TONE[row.original.status]}`,
            )}
          >
            {STATUS_LABELS[row.original.status]}
          </span>
        ),
      },
    ];

    if (onCancel) {
      cols.push({
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const order = row.original;
          if (!isCancellable(order.status)) return null;

          if (order.cancel_requested) {
            return (
              <button type="button" className="hb-orders-table__cancel" disabled>
                {'Cancelling…'}
              </button>
            );
          }

          return (
            <button
              type="button"
              className="hb-orders-table__cancel"
              onClick={() => onCancel(order.order_id)}
            >
              Cancel
            </button>
          );
        },
      });
    }

    return cols;
  }, [onCancel]);

  const table = useTable({
    features: tableFeatureSet,
    data,
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

  if (data.length === 0) {
    return (
      <div className={clsx('hb-orders-table', className)}>
        <p className="hb-orders-table__empty">{emptyMessage}</p>
      </div>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className={clsx('hb-orders-table', className)}>
      <div ref={scrollRef} className="hb-orders-table__scroll" style={{ height }}>
        <table className="hb-orders-table__table" style={{ display: 'grid' }}>
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

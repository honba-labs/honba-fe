// Batch J (docs/tasks.md §Batch J) — reporting & history widgets ported/modernized from
// bfx-report-ui (Apache-2.0, pinned at `.reference/bfx-report-ui`, see Shared conventions).
//
// All eight report views share one rendering skeleton. The originals are each a
// `Redux-connected container -> VirtualTable(columns)` pair (`Ledgers`, `TaxReport`,
// `Snapshots`, `PositionsAudit`, `ConcentrationRisk`, `WeightedAverages`, `FeesReport`,
// `AccountBalance`) — the container half (fetch/WS/Redux/i18n/export dialogs) is dropped per the
// package's Shared conventions, and the table half folds into this shared `ReportTable`: fixed
// header row, virtualized body (same `display: grid` + `@tanstack/react-virtual` pattern as the
// Batch D trading tables), plain `render(row)` cells instead of column-def accessors (these
// views only ever read fields — no sorting/filtering feature state worth dragging in).
//
// Wire-fidelity note (verified against `honba-ya-api/src/responses.rs`, which serves this data
// and whose shapes the schema does not carry): report amounts are plain floats in the account
// currency — NOT integer minor units like the live-table `Money` — so these views format numbers
// directly and keep an explicit `Currency` column wherever the wire carries one.
import { useMemo, useRef } from 'react';

import type { ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import clsx from 'clsx';

/** One column of a report table. `render` receives the row; widths are fixed (px) or flexible
 * ("auto" → flex-grow), matching the grid-table layout of the Batch D tables. */
export interface ReportColumn<Row> {
  id: string;
  header: string;
  width?: number;
  /** `right` for numeric columns. */
  align?: 'left' | 'right';
  render: (row: Row) => ReactNode;
}

export interface ReportTableProps<Row> {
  rows: Row[];
  columns: ReportColumn<Row>[];
  emptyMessage?: string;
  loadingMessage?: string;
  /** True while the caller's query is fetching its first page. */
  isLoading?: boolean;
  /** Scroll-container height in px. */
  height?: number;
  className?: string;
}

const ROW_HEIGHT = 28;

export function ReportTable<Row>({
  rows,
  columns,
  emptyMessage = 'No records',
  loadingMessage = 'Loading history…',
  isLoading = false,
  height = 360,
  className,
}: ReportTableProps<Row>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className={clsx('hb-report-table', className)} data-loading={isLoading || undefined}>
      {isLoading && rows.length === 0 ? (
        <p className="hb-report-table__empty">{loadingMessage}</p>
      ) : rows.length === 0 ? (
        <p className="hb-report-table__empty">{emptyMessage}</p>
      ) : (
        <div ref={scrollRef} className="hb-report-table__scroll" style={{ height }}>
          <table className="hb-report-table__table" style={{ display: 'grid' }}>
            <thead style={{ display: 'grid', position: 'sticky', top: 0, zIndex: 1 }}>
              <tr style={{ display: 'flex', width: '100%' }}>
                {columns.map((column) => (
                  <th
                    key={column.id}
                    style={{
                      width: column.width,
                      flex: column.width ? undefined : 1,
                      textAlign: column.align,
                    }}
                    scope="col"
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody
              style={{ display: 'grid', height: virtualizer.getTotalSize(), position: 'relative' }}
            >
              {virtualItems.map((virtualRow) => {
                const row = rows[virtualRow.index];
                return (
                  <tr
                    key={virtualRow.index}
                    style={{
                      display: 'flex',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: virtualRow.size,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.id}
                        style={{
                          width: column.width,
                          flex: column.width ? undefined : 1,
                          textAlign: column.align,
                          verticalAlign: 'middle',
                        }}
                      >
                        {column.render(row)}
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
  );
}

/** A one-row metric strip above a report table (`Summary` panels in the bfx-report-ui views).
 * `items` in reading order; values render tone-colored. */
export interface ReportSummaryItem {
  label: string;
  value: string;
  tone?: 'bullish' | 'bearish' | 'neutral';
}

export function ReportSummary({ items }: { items: ReportSummaryItem[] }) {
  if (items.length === 0) return null;
  return (
    <dl className="hb-report-table__summary">
      {items.map((item) => (
        <div key={item.label} className="hb-report-table__summary-item">
          <dt>{item.label}</dt>
          <dd
            className={clsx(
              item.tone === 'bullish' && 'hb-report-table__summary-bull',
              item.tone === 'bearish' && 'hb-report-table__summary-bear',
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Signed, 2-decimal grouping — the position/pnl number format used across these views. */
export function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** `+`/`-` prefixed variant for P&L columns (silence is `0.00`, not `+0.00`). */
export function formatSigned(value: number, decimals = 2): string {
  const fixed = formatNumber(Math.abs(value), decimals);
  return value < 0 ? `-${fixed}` : `+${fixed}`;
}

/** Amount is negative for debits === bearish. Amounts are plain floats (see file comment). */
export function pnlTone(value: number): 'bullish' | 'bearish' {
  return value < 0 ? 'bearish' : 'bullish';
}

/** Build tone-colored P&L cell content once — every view renders P&L the same way. */
export function renderPnl(value: number, decimals = 2): ReactNode {
  return (
    <span className={clsx('hb-report-table__pnl', `hb-report-table__pnl--${pnlTone(value)}`)}>
      {formatSigned(value, decimals)}
    </span>
  );
}

/** A `[0..100]` share bar for concentration/weight columns. */
export function renderShareBar(pct: number): ReactNode {
  return (
    <span className="hb-report-table__share">
      <span className="hb-report-table__share-track">
        <span className="hb-report-table__share-fill" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      </span>
      <span className="hb-report-table__share-value">{formatNumber(pct)}%</span>
    </span>
  );
}

/** Stable React key helper for report rows (all wire rows carry a server `id` or a composite). */
export function rowKey(id: string, index: number): string {
  return id || `row-${index}`;
}

export function useColumns<Row>(build: () => ReportColumn<Row>[]): ReportColumn<Row>[] {
  return useMemo(build, []);
}

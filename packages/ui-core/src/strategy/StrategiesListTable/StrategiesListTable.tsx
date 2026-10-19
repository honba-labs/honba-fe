// Ported/modernized from bfx-hf-ui-core's `StrategiesListTable` +
// `StrategiesList.columns.js` (src/components/StrategiesListTable/*, Apache-2.0).
//
// The original is three tabbed VirtualTable column sets (active strategies, past strategies,
// saved strategies) with saved-strategy action icons (copy/rename/delete) and a
// component-state persistence layer. Kept: the single tabbed widget with one row shape and
// columns that vary by kind. Dropped: `@ufx-ui/core`'s VirtualTable (this package renders with
// @tanstack/react-table + @tanstack/react-virtual, docs/tasks.md Batch D conventions), Redux
// component-state persistence (tab state is local here; a layout feature can lift it later),
// `prepareStrategyToLoad` domain massaging (honba's strategy shapes are different — the caller
// owns loading), copy/rename actions (honba's AlgoDesigner library has different edit flows;
// only load + remove are carried across), i18n.
//
// Presentational + backend-agnostic: `rows` in, row-click/removal callbacks out — honored
// against honba's GET /-strategies (graph strategies in AlgoDesigner) by the feature layer.
import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import clsx from 'clsx';
import { Trash2, Upload } from 'lucide-react';

import { Tabs } from '../../ui/Tabs';
import type { TabItem } from '../../ui/Tabs';
import './StrategiesListTable.css';

// See OrdersTable.tsx's header comment: @tanstack/react-table 9.x keeps the core row model
// opt-in via `getCoreRowModel()`; no add-on features (sorting/filtering/sizing) are used here.

export type StrategyListKind = 'active' | 'past' | 'saved';

const KIND_LABELS: Record<StrategyListKind, string> = {
  active: 'Active',
  past: 'Past',
  saved: 'Saved',
};

export interface StrategyListItem {
  id: string;
  name: string;
  /** Display instrument label (e.g. `NSE:RELIANCE`); caller decides the exact format. */
  instrument: string;
  kind: StrategyListKind;
  /** epoch ms or ISO string (honba's `UnixNanos.iso` sibling), same convention as
   * StrategyTradeRow. */
  startedOn?: number | string;
  stoppedOn?: number | string;
  savedOn?: number | string;
  profitFactor?: number;
  pnl?: number;
  strategyType?: string | null;
}

export interface StrategiesListTableProps {
  rows: StrategyListItem[];
  /** Called when a row is activated (click for active/past, the Load button for saved). */
  onLoad?: (item: StrategyListItem) => void;
  /** Only surfaced for `saved` rows. */
  onRemove?: (item: StrategyListItem) => void;
  emptyMessage?: string;
  height?: number;
  className?: string;
}

const TABLE_ROW_HEIGHT = 36;

function formatWhen(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return new Date(value).toISOString().replace('T', ' ').slice(0, 16);
  return value.replace('T', ' ').slice(0, 16);
}

/** Profit factor is tone-coded by its own threshold (< 1 is unprofitable), independent of the
 * P&L sign — same convention as the reference's `resultNumber(value, null, value >= 1)`. */
function pfNode(value: number | undefined): ReactNode {
  if (value === undefined) return '—';
  return (
    <span className={clsx('hb-strategies-list__pf', { 'hb-strategies-list__pf--bad': value < 1 })}>
      {value.toFixed(2)}
    </span>
  );
}

function buildColumns(
  kind: StrategyListKind,
  onLoad: StrategiesListTableProps['onLoad'],
  onRemove: StrategiesListTableProps['onRemove'],
): ColumnDef<StrategyListItem>[] {
  const base: ColumnDef<StrategyListItem>[] = [
    {
      id: 'name',
      header: 'Name',
      accessorFn: (row) => row.name,
      cell: ({ row }) => <strong className="hb-strategies-list__name">{row.original.name}</strong>,
    },
    {
      id: 'instrument',
      header: 'Instrument',
      accessorFn: (row) => row.instrument,
    },
  ];

  if (kind === 'active') {
    base.push(
      {
        id: 'started_on',
        header: 'Running since',
        accessorFn: (row) => String(row.startedOn ?? ''),
        cell: ({ row }) => formatWhen(row.original.startedOn),
      },
      { id: 'profit_factor', header: 'PF', accessorFn: (row) => String(row.profitFactor ?? ''), cell: ({ row }) => pfNode(row.original.profitFactor) },
      { id: 'pnl', header: 'P&L', accessorFn: (row) => String(row.pnl ?? ''), cell: ({ row }) => formatPnlValue(row.original.pnl) },
    );
  }

  if (kind === 'past') {
    base.push(
      { id: 'started_on', header: 'Started', accessorFn: (row) => String(row.startedOn ?? ''), cell: ({ row }) => formatWhen(row.original.startedOn) },
      { id: 'stopped_on', header: 'Stopped', accessorFn: (row) => String(row.stoppedOn ?? ''), cell: ({ row }) => formatWhen(row.original.stoppedOn) },
      { id: 'profit_factor', header: 'PF', accessorFn: (row) => String(row.profitFactor ?? ''), cell: ({ row }) => pfNode(row.original.profitFactor) },
      { id: 'pnl', header: 'P&L', accessorFn: (row) => String(row.pnl ?? ''), cell: ({ row }) => formatPnlValue(row.original.pnl) },
    );
  }

  if (kind === 'saved') {
    base.push(
      {
        id: 'strategy_type',
        header: 'Type',
        accessorFn: (row) => row.strategyType ?? '',
        cell: ({ row }) => row.original.strategyType ?? '—',
      },
      {
        id: 'saved_on',
        header: 'Saved',
        accessorFn: (row) => String(row.savedOn ?? ''),
        cell: ({ row }) => formatWhen(row.original.savedOn),
      },
    );
    if (onLoad || onRemove) {
      base.push({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <span className="hb-strategies-list__actions">
            {onLoad && (
              <button
                type="button"
                className="hb-strategies-list__action"
                aria-label={`Load ${row.original.name}`}
                onClick={() => onLoad(row.original)}
              >
                <Upload size={13} />
              </button>
            )}
            {onRemove && (
              <button
                type="button"
                className="hb-strategies-list__action"
                aria-label={`Delete ${row.original.name}`}
                onClick={() => onRemove(row.original)}
              >
                <Trash2 size={13} />
              </button>
            )}
          </span>
        ),
      });
    }
  }

  return base;
}

function formatPnlValue(pnl: number | undefined): string {
  if (pnl === undefined) return '—';
  const sign = pnl > 0 ? '+' : '';
  return `${sign}${pnl.toLocaleString('en-US', { maximumFractionDigits: 6 })}`;
}

const COLUMN_WIDTHS: Record<string, Record<string, number>> = {
  common: { name: 200, instrument: 120, actions: 90 },
  active: { started_on: 150, profit_factor: 60, pnl: 120 },
  past: { started_on: 140, stopped_on: 140, profit_factor: 60, pnl: 120 },
  saved: { strategy_type: 140, saved_on: 150 },
};

function columnWidth(kind: StrategyListKind, columnId: string): number | undefined {
  const common = { ...COLUMN_WIDTHS.common };
  if (common[columnId] !== undefined) return common[columnId];
  return COLUMN_WIDTHS[kind]?.[columnId];
}

export function StrategiesListTable({
  rows,
  onLoad,
  onRemove,
  emptyMessage = 'No strategies',
  height = 260,
  className,
}: StrategiesListTableProps) {
  const kinds = useMemo<StrategyListKind[]>(() => {
    const present = new Set(rows.map((row) => row.kind));
    const ordered: StrategyListKind[] = ['active', 'past', 'saved'];
    return ordered.filter((kind) => present.has(kind));
  }, [rows]);

  const [activeKind, setActiveKind] = useState<StrategyListKind | null>(null);
  const currentKind = activeKind && kinds.includes(activeKind) ? activeKind : kinds[0];

  const tabs = useMemo<TabItem<StrategyListKind>[]>(
    () => kinds.map((kind) => ({
      value: kind,
      label: `${KIND_LABELS[kind]} (${rows.filter((row) => row.kind === kind).length})`,
    })),
    [kinds, rows],
  );

  const kindRows = useMemo(
    () => rows.filter((row) => row.kind === currentKind),
    [rows, currentKind],
  );

  const columns = useMemo(
    () => buildColumns(currentKind ?? 'active', onLoad, onRemove),
    [currentKind, onLoad, onRemove],
  );

  const table = useReactTable({
    data: kindRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const tableRows = table.getRowModel().rows;
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => TABLE_ROW_HEIGHT,
    overscan: 8,
  });

  return (
    <div
      className={clsx('hb-strategies-list', className)}
    >
      {tabs.length > 0 ? (
        <Tabs tabs={tabs} activeTab={currentKind ?? 'active'} onTabClick={setActiveKind} />
      ) : null}
      {kindRows.length === 0 || currentKind === undefined ? (
        <p className="hb-strategies-list__empty">{emptyMessage}</p>
      ) : (
        <div ref={scrollRef} className="hb-strategies-list__scroll" style={{ height }}>
          <table className="hb-strategies-list__table" style={{ display: 'grid' }}>
            <thead style={{ display: 'grid', position: 'sticky', top: 0, zIndex: 1 }}>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} style={{ display: 'flex', width: '100%' }}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{ width: columnWidth(currentKind, header.column.id) }}
                    >
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
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const row = tableRows[virtualRow.index];
                const clickable = currentKind !== 'saved' && onLoad;
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
                      cursor: clickable ? 'pointer' : undefined,
                    }}
                    onClick={clickable ? () => onLoad!(row.original) : undefined}
                  >
                    {row.getAllCells().map((cell) => (
                      <td
                        key={cell.id}
                        style={{ width: columnWidth(currentKind, cell.column.id) }}
                      >
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
  );
}

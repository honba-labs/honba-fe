// Batch J (docs/tasks.md) — `PortfolioSnapshots`, ported/modernized from bfx-report-ui's
// `src/components/Snapshots` (Apache-2.0: wallets/positions/tickers snapshot tabs under one
// view). honba has one historical snapshot stream — `GET /reports/snapshots`'s
// `SnapshotEntry[]` (valued portfolio cut per day) — so this is a single table, and the
// original's note/editor chrome is dropped. Day-over-day change renders tone-colored per the
// original's green/red styling.
import clsx from 'clsx';

import type { UnixNanos } from '../../trading/TradesTablePanel';
import {
  ReportTable,
  ReportSummary,
  formatNumber,
  renderPnl,
  type ReportColumn,
  type ReportSummaryItem,
} from '../ReportTable';
import '../ReportTable.css';

export interface SnapshotEntry {
  id: string;
  ts_event: UnixNanos;
  date: string;
  total_equity: number;
  total_cash: number;
  positions_value: number;
  unrealized_pnl: number;
  realized_pnl: number;
  day_change: number;
  day_change_pct: number;
  accounts: number;
  positions: number;
}

export interface PortfolioSnapshotsProps {
  rows: SnapshotEntry[];
  isLoading?: boolean;
  emptyMessage?: string;
  height?: number;
  className?: string;
}

export function PortfolioSnapshots({
  rows,
  isLoading = false,
  emptyMessage = 'No snapshots',
  height = 360,
  className,
}: PortfolioSnapshotsProps) {
  const items: ReportSummaryItem[] = rows.length
    ? [
        {
          label: 'Latest equity',
          value: formatNumber(rows[0].total_equity),
        },
        {
          label: 'Day change',
          value: `${formatSignedDay(rows[0].day_change)} (${formatNumber(rows[0].day_change_pct)}%)`,
          tone: rows[0].day_change < 0 ? 'bearish' : 'bullish',
        },
      ]
    : [];

  const columns: ReportColumn<SnapshotEntry>[] = [
    { id: 'date', header: 'Date', width: 110, render: (row) => row.date },
    {
      id: 'equity',
      header: 'Equity',
      width: 110,
      align: 'right',
      render: (row) => formatNumber(row.total_equity),
    },
    { id: 'cash', header: 'Cash', width: 110, align: 'right', render: (row) => formatNumber(row.total_cash) },
    {
      id: 'positions_value',
      header: 'Positions',
      width: 110,
      align: 'right',
      render: (row) => formatNumber(row.positions_value),
    },
    {
      id: 'unrealized',
      header: 'Unreal. P&L',
      width: 100,
      align: 'right',
      render: (row) => renderPnl(row.unrealized_pnl),
    },
    {
      id: 'realized',
      header: 'Real. P&L',
      width: 100,
      align: 'right',
      render: (row) => renderPnl(row.realized_pnl),
    },
    {
      id: 'day',
      header: 'Day',
      width: 100,
      align: 'right',
      render: (row) => (
        <span className={clsx('hb-portfolio-snapshots__day', row.day_change < 0 && 'hb-portfolio-snapshots__day--down')}>
          {formatNumber(row.day_change)} ({formatNumber(row.day_change_pct)}%)
        </span>
      ),
    },
    { id: 'accounts', header: 'Accts', width: 64, align: 'right', render: (row) => String(row.accounts) },
    { id: 'positions', header: 'Pos', width: 56, align: 'right', render: (row) => String(row.positions) },
  ];

  return (
    <div className={clsx('hb-portfolio-snapshots', className)}>
      <ReportSummary items={items} />
      <ReportTable rows={rows} columns={columns} isLoading={isLoading} emptyMessage={emptyMessage} height={height} />
    </div>
  );
}

function formatSignedDay(value: number): string {
  return value < 0 ? `-${formatNumber(Math.abs(value))}` : `+${formatNumber(value)}`;
}

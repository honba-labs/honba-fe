// Batch J (docs/tasks.md) — `FeesReport`, ported/modernized from bfx-report-ui's
// `src/components/FeesReport` (Apache-2.0). The original is a container + `FeesTable` with a
// summary blob of per-type totals; honba's `GET /reports/fees` serves both (`FeeEntry[]` +
// `FeeTypeSummary[]`), so this renders the by-type breakdown as chips above the entry table.
// Fee amounts render positive (cost) rather than tone-signed — a fee is never a gain.
import clsx from 'clsx';

import type { UnixNanos } from '../../trading/TradesTablePanel';
import {
  ReportTable,
  ReportSummary,
  formatNumber,
  type ReportColumn,
  type ReportSummaryItem,
} from '../ReportTable';
import '../ReportTable.css';
import './FeesReport.css';

export interface FeeEntry {
  id: string;
  ts_event: UnixNanos;
  date: string;
  fee_type: string;
  instrument?: string | null;
  amount: number;
  currency: string;
  order_id?: string | null;
}

export interface FeeTypeSummary {
  fee_type: string;
  total_amount: number;
  count: number;
}

export interface FeesReportProps {
  rows: FeeEntry[];
  /** The wire response's `by_type` block; omitted → no breakdown strip. */
  byType?: FeeTypeSummary[];
  isLoading?: boolean;
  emptyMessage?: string;
  height?: number;
  className?: string;
}

export function FeesReport({
  rows,
  byType,
  isLoading = false,
  emptyMessage = 'No fees recorded',
  height = 360,
  className,
}: FeesReportProps) {
  const items: ReportSummaryItem[] = (byType ?? []).map((entry) => ({
    label: entry.fee_type.replace(/_/g, ' '),
    value: `${formatNumber(entry.total_amount)} (${entry.count})`,
  }));

  const columns: ReportColumn<FeeEntry>[] = [
    { id: 'date', header: 'Date', width: 96, render: (row) => row.date },
    {
      id: 'fee_type',
      header: 'Type',
      width: 130,
      render: (row) => <span className="hb-fees-report__type">{row.fee_type.replace(/_/g, ' ')}</span>,
    },
    {
      id: 'instrument',
      header: 'Instrument',
      render: (row) => row.instrument ?? '-',
    },
    { id: 'order_id', header: 'Order', width: 110, render: (row) => row.order_id ?? '-' },
    {
      id: 'amount',
      header: 'Amount',
      width: 110,
      align: 'right',
      render: (row) => (
        <span className="hb-fees-report__amount" title={row.currency}>
          {formatNumber(row.amount)} {row.currency}
        </span>
      ),
    },
  ];

  return (
    <div className={clsx('hb-fees-report', className)}>
      <ReportSummary items={items} />
      <ReportTable rows={rows} columns={columns} isLoading={isLoading} emptyMessage={emptyMessage} height={height} />
    </div>
  );
}

// Batch J (docs/tasks.md) — `PositionAuditTrail`, ported/modernized from bfx-report-ui's
// `src/components/PositionsAudit` (Apache-2.0). The original renders one audit view per
// selected position (a `<Dropdown>` + `PositionsAudit.NoId` empty state); honba's
// `GET /reports/audit` serves one flat trail across positions, so the selector drops out and
// the empty state becomes the table's `emptyMessage`. Every quantity/price change
// (`AuditEntry`) renders with its causing order id and reason, tone-colored P&L.
import clsx from 'clsx';

import type { UnixNanos } from '../../trading/TradesTablePanel';
import {
  ReportTable,
  formatNumber,
  renderPnl,
  type ReportColumn,
} from '../ReportTable';
import '../ReportTable.css';

export interface AuditEntry {
  id: string;
  ts_event: UnixNanos;
  date: string;
  instrument: string;
  side: 'buy' | 'sell';
  quantity_change: number;
  price: number;
  position_after: number;
  avg_price_after: number;
  realized_pnl: number;
  order_id: string;
  reason: string;
}

export interface PositionAuditTrailProps {
  rows: AuditEntry[];
  isLoading?: boolean;
  emptyMessage?: string;
  height?: number;
  className?: string;
}

export function PositionAuditTrail({
  rows,
  isLoading = false,
  emptyMessage = 'No audit entries',
  height = 360,
  className,
}: PositionAuditTrailProps) {
  const columns: ReportColumn<AuditEntry>[] = [
    { id: 'date', header: 'Date', width: 96, render: (row) => row.date },
    {
      id: 'instrument',
      header: 'Instrument',
      render: (row) => <span title={row.reason}>{row.instrument}</span>,
    },
    {
      id: 'side',
      header: 'Side',
      width: 60,
      render: (row) => (
        <span className={clsx('hb-position-audit__side', `hb-position-audit__side--${row.side}`)}>
          {row.side.toUpperCase()}
        </span>
      ),
    },
    {
      id: 'quantity_change',
      header: 'Qty Δ',
      width: 90,
      align: 'right',
      render: (row) => (
        <span className={clsx('hb-position-audit__qty', row.quantity_change < 0 && 'hb-position-audit__qty--reduce')}>
          {row.quantity_change > 0 ? '+' : ''}
          {formatNumber(row.quantity_change)}
        </span>
      ),
    },
    { id: 'price', header: 'Price', width: 96, align: 'right', render: (row) => formatNumber(row.price) },
    {
      id: 'position_after',
      header: 'Position',
      width: 90,
      align: 'right',
      render: (row) => formatNumber(row.position_after),
    },
    {
      id: 'avg_price_after',
      header: 'Avg after',
      width: 96,
      align: 'right',
      render: (row) => formatNumber(row.avg_price_after),
    },
    {
      id: 'realized_pnl',
      header: 'Realized',
      width: 100,
      align: 'right',
      render: (row) => renderPnl(row.realized_pnl),
    },
    {
      id: 'order_id',
      header: 'Order',
      width: 110,
      render: (row) => <span className="hb-position-audit__order">{row.order_id}</span>,
    },
  ];

  return (
    <div className={clsx('hb-position-audit', className)}>
      <ReportTable rows={rows} columns={columns} isLoading={isLoading} emptyMessage={emptyMessage} height={height} />
    </div>
  );
}

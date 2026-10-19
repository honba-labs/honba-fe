// Batch J (docs/tasks.md) — `WeightedAverageCost`, ported/modernized from bfx-report-ui's
// `src/components/WeightedAverages` (Apache-2.0): per-instrument weighted average entry cost
// against the current mark, with total cost basis and proceeds. The original computes the
// averages client-side from the fill ledger; honba's `GET /reports/wac` does that server-side
// (`WACEntry[]`), so this view is the table alone (per-position `symbol`/`exchange`).
import clsx from 'clsx';

import {
  ReportTable,
  formatNumber,
  renderPnl,
  type ReportColumn,
} from '../ReportTable';
import '../ReportTable.css';

export interface WACEntry {
  instrument: string;
  symbol: string;
  exchange: string;
  quantity: number;
  weighted_avg_cost: number;
  mark: number;
  market_value: number;
  unrealized_pnl: number;
  realized_pnl: number;
  total_cost_basis: number;
  total_proceeds: number;
}

export interface WeightedAverageCostProps {
  rows: WACEntry[];
  isLoading?: boolean;
  emptyMessage?: string;
  height?: number;
  className?: string;
}

export function WeightedAverageCost({
  rows,
  isLoading = false,
  emptyMessage = 'No positions',
  height = 360,
  className,
}: WeightedAverageCostProps) {
  const columns: ReportColumn<WACEntry>[] = [
    {
      id: 'instrument',
      header: 'Instrument',
      render: (row) => `${row.symbol} · ${row.exchange}`,
    },
    {
      id: 'quantity',
      header: 'Qty',
      width: 90,
      align: 'right',
      render: (row) => formatNumber(row.quantity),
    },
    {
      id: 'wac',
      header: 'WAC',
      width: 96,
      align: 'right',
      render: (row) => formatNumber(row.weighted_avg_cost),
    },
    { id: 'mark', header: 'Mark', width: 96, align: 'right', render: (row) => formatNumber(row.mark) },
    {
      id: 'market_value',
      header: 'Value',
      width: 110,
      align: 'right',
      render: (row) => formatNumber(row.market_value),
    },
    {
      id: 'unrealized',
      header: 'Unreal.',
      width: 100,
      align: 'right',
      render: (row) => renderPnl(row.unrealized_pnl),
    },
    {
      id: 'realized',
      header: 'Real.',
      width: 100,
      align: 'right',
      render: (row) => renderPnl(row.realized_pnl),
    },
    {
      id: 'cost_basis',
      header: 'Cost basis',
      width: 110,
      align: 'right',
      render: (row) => formatNumber(row.total_cost_basis),
    },
    {
      id: 'proceeds',
      header: 'Proceeds',
      width: 110,
      align: 'right',
      render: (row) => formatNumber(row.total_proceeds),
    },
  ];

  return (
    <div className={clsx('hb-weighted-average-cost', className)}>
      <ReportTable rows={rows} columns={columns} isLoading={isLoading} emptyMessage={emptyMessage} height={height} />
    </div>
  );
}

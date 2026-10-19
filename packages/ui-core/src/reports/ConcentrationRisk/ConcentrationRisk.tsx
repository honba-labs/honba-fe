// Batch J (docs/tasks.md) — `ConcentrationRisk`, ported/modernized from bfx-report-ui's
// `src/components/ConcentrationRisk` (Apache-2.0, with its `ConcentrationRisk.helpers` doing
// the same share-of-portfolio math honba's `GET /reports/concentration` now computes
// server-side). Kept: the ranked weights with % bars, and the HHI / top-5 / top-10 summary
// read. Dropped: the original's client-side recomputation (the wire carries the values) and
// its account/filter chrome.
import clsx from 'clsx';

import {
  ReportTable,
  ReportSummary,
  formatNumber,
  renderPnl,
  renderShareBar,
  type ReportColumn,
  type ReportSummaryItem,
} from '../ReportTable';
import '../ReportTable.css';

/** One concentration row of `GET /reports/concentration` (`honba-ya-api/src/responses.rs`'s
 * `ConcentrationEntry`; `sector` optional because the server fills it when it has it). */
export interface ConcentrationEntry {
  instrument: string;
  symbol: string;
  exchange: string;
  market_value: number;
  pct_of_portfolio: number;
  quantity: number;
  avg_price: number;
  mark: number;
  unrealized_pnl: number;
  realized_pnl: number;
  sector?: string | null;
}

/** The response's concentration read: herfindahl index and top-N shares, as fractions. */
export interface ConcentrationRiskSummary {
  total_portfolio_value: number;
  hhi: number;
  top5_concentration: number;
  top10_concentration: number;
}

export interface ConcentrationRiskProps {
  rows: ConcentrationEntry[];
  summary?: ConcentrationRiskSummary;
  isLoading?: boolean;
  emptyMessage?: string;
  height?: number;
  className?: string;
}

export function ConcentrationRisk({
  rows,
  summary,
  isLoading = false,
  emptyMessage = 'No open positions',
  height = 360,
  className,
}: ConcentrationRiskProps) {
  const items: ReportSummaryItem[] = summary
    ? [
        { label: 'Portfolio', value: formatNumber(summary.total_portfolio_value) },
        { label: 'HHI', value: formatNumber(summary.hhi, 0) },
        { label: 'Top 5', value: `${formatNumber(summary.top5_concentration)}%` },
        { label: 'Top 10', value: `${formatNumber(summary.top10_concentration)}%` },
      ]
    : [];

  const columns: ReportColumn<ConcentrationEntry>[] = [
    {
      id: 'instrument',
      header: 'Instrument',
      render: (row) => (
        <span title={row.sector ?? row.instrument}>
          {row.symbol} · {row.exchange}
        </span>
      ),
    },
    {
      id: 'sector',
      header: 'Sector',
      width: 110,
      render: (row) => row.sector ?? '-',
    },
    {
      id: 'quantity',
      header: 'Qty',
      width: 84,
      align: 'right',
      render: (row) => formatNumber(row.quantity),
    },
    { id: 'avg_price', header: 'Avg', width: 92, align: 'right', render: (row) => formatNumber(row.avg_price) },
    { id: 'mark', header: 'Mark', width: 92, align: 'right', render: (row) => formatNumber(row.mark) },
    {
      id: 'market_value',
      header: 'Value',
      width: 110,
      align: 'right',
      render: (row) => formatNumber(row.market_value),
    },
    {
      id: 'pct',
      header: 'Share',
      width: 150,
      render: (row) => renderShareBar(row.pct_of_portfolio),
    },
    {
      id: 'unrealized',
      header: 'Unreal. P&L',
      width: 100,
      align: 'right',
      render: (row) => renderPnl(row.unrealized_pnl),
    },
  ];

  return (
    <div className={clsx('hb-concentration-risk', className)}>
      <ReportSummary items={items} />
      <ReportTable rows={rows} columns={columns} isLoading={isLoading} emptyMessage={emptyMessage} height={height} />
    </div>
  );
}

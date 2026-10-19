// Batch J (docs/tasks.md) — `TaxReport`, ported/modernized from bfx-report-ui's
// `src/components/TaxReport` (Apache-2.0): realized round trips classified into STCG/LTCG with
// the India-charge breakdown (STT, stamp duty, exchange/SEBI/GST) — the view the bfx repo has
// no crypto-native equivalent of. The original's loader/note modals and export dialog are
// dropped (the report is a plain table over `GET /reports/tax`; exports live app-side). The
// summary strip renders the wire's `TaxReportSummary` totals.
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
import './TaxReport.css';

export interface TaxTransaction {
  id: string;
  ts_event: UnixNanos;
  date: string;
  instrument: string;
  symbol: string;
  exchange: string;
  side: 'buy' | 'sell';
  quantity: number;
  buy_price: number;
  sell_price: number;
  buy_date: string;
  sell_date: string;
  holding_period_days: number;
  gain_loss: number;
  gain_loss_usd?: number | null;
  stcg: number;
  ltcg: number;
  stt: number;
  stamp_duty: number;
  exchange_charges: number;
  sebi_fees: number;
  gst: number;
  total_charges: number;
  net_gain_loss: number;
  tax_liability: number;
  category: 'STCG' | 'LTCG' | 'Exempt';
}

export interface TaxReportSummary {
  total_stcg: number;
  total_ltcg: number;
  total_stt: number;
  total_stamp_duty: number;
  total_exchange_charges: number;
  total_sebi_fees: number;
  total_gst: number;
  total_net_gain_loss: number;
  total_tax_liability: number;
}

export interface TaxReportProps {
  rows: TaxTransaction[];
  /** The wire response's summary block; omitted → no summary strip. */
  summary?: TaxReportSummary;
  isLoading?: boolean;
  emptyMessage?: string;
  height?: number;
  className?: string;
}

export function TaxReport({
  rows,
  summary,
  isLoading = false,
  emptyMessage = 'No tax transactions',
  height = 360,
  className,
}: TaxReportProps) {
  const items: ReportSummaryItem[] = summary
    ? [
        { label: 'STCG', value: formatNumber(summary.total_stcg) },
        { label: 'LTCG', value: formatNumber(summary.total_ltcg) },
        {
          label: 'Net P/L',
          value: formatNumber(summary.total_net_gain_loss),
          tone: summary.total_net_gain_loss < 0 ? 'bearish' : 'bullish',
        },
        {
          label: 'Charges',
          value: formatNumber(
            summary.total_stt +
              summary.total_stamp_duty +
              summary.total_exchange_charges +
              summary.total_sebi_fees +
              summary.total_gst,
          ),
        },
        { label: 'Tax liability', value: formatNumber(summary.total_tax_liability) },
      ]
    : [];

  const columns: ReportColumn<TaxTransaction>[] = [
    { id: 'date', header: 'Sell date', width: 96, render: (row) => row.date },
    {
      id: 'instrument',
      header: 'Instrument',
      render: (row) => `${row.symbol} · ${row.exchange}`,
    },
    {
      id: 'side',
      header: 'Side',
      width: 60,
      render: (row) => (
        <span className={clsx('hb-tax-report__side', `hb-tax-report__side--${row.side}`)}>
          {row.side.toUpperCase()}
        </span>
      ),
    },
    {
      id: 'quantity',
      header: 'Qty',
      width: 70,
      align: 'right',
      render: (row) => formatNumber(row.quantity, 0),
    },
    { id: 'buy', header: 'Buy', width: 92, align: 'right', render: (row) => formatNumber(row.buy_price) },
    { id: 'sell', header: 'Sell', width: 92, align: 'right', render: (row) => formatNumber(row.sell_price) },
    {
      id: 'holding',
      header: 'Held (d)',
      width: 72,
      align: 'right',
      render: (row) => formatNumber(row.holding_period_days, 0),
    },
    {
      id: 'category',
      header: 'Category',
      width: 76,
      render: (row) => (
        <span className={clsx('hb-tax-report__badge', `hb-tax-report__badge--${row.category}`)}>
          {row.category}
        </span>
      ),
    },
    {
      id: 'charges',
      header: 'Charges',
      width: 92,
      align: 'right',
      render: (row) => formatNumber(row.total_charges),
    },
    {
      id: 'gain',
      header: 'Gain/Loss',
      width: 100,
      align: 'right',
      render: (row) => renderPnl(row.gain_loss),
    },
    {
      id: 'net',
      header: 'Net',
      width: 100,
      align: 'right',
      render: (row) => renderPnl(row.net_gain_loss),
    },
  ];

  return (
    <div className={clsx('hb-tax-report', className)}>
      <ReportSummary items={items} />
      <ReportTable rows={rows} columns={columns} isLoading={isLoading} emptyMessage={emptyMessage} height={height} />
    </div>
  );
}

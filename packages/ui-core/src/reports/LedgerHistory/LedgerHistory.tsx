// Batch J (docs/tasks.md) — `LedgerHistory`, ported/modernized from bfx-report-ui's
// `src/components/Ledgers` (Apache-2.0). The original is a Redux container over a shared
// `VirtualTable` with a custom themes/modal layer; this port renders the same view (a full
// transaction journal — trades, fees, transfers, adjustments) as a plain presentational
// component over `GET /reports/ledger` rows (`honba-ya-api/src/responses.rs`'s `LedgerEntry[]`
// — see the plain-float amounts note in ReportTable.tsx). The original's CSV/export tooling is
// dropped (exports live app-side); the "convert to USD" behavior becomes a `showUsd` flag over
// the wire's optional `*_usd` twins.
import type { ReactNode } from 'react';
import clsx from 'clsx';

import type { UnixNanos } from '../../trading/TradesTablePanel';
import {
  ReportTable,
  ReportSummary,
  formatNumber,
  formatSigned,
  renderPnl,
  type ReportColumn,
  type ReportSummaryItem,
} from '../ReportTable';
import '../ReportTable.css';
import './LedgerHistory.css';

export interface LedgerEntry {
  id: string;
  ts_event: UnixNanos;
  date: string;
  category: string;
  description: string;
  currency: string;
  amount: number;
  amount_usd?: number | null;
  balance: number;
  balance_usd?: number | null;
  wallet?: string | null;
  instrument?: string | null;
  side?: 'buy' | 'sell' | null;
  fees?: number | null;
}

export interface LedgerHistoryProps {
  rows: LedgerEntry[];
  /** When set, the amount/balance columns render the wire's optional USD twins instead. */
  showUsd?: boolean;
  isLoading?: boolean;
  emptyMessage?: string;
  height?: number;
  className?: string;
}

function summary(rows: LedgerEntry[], showUsd: boolean): ReportSummaryItem[] {
  if (rows.length === 0) return [];
  const last = rows[0];
  const credited = rows.filter((row) => row.amount >= 0).reduce((sum, row) => sum + row.amount, 0);
  const debited = rows.filter((row) => row.amount < 0).reduce((sum, row) => sum + row.amount, 0);
  return [
    {
      label: showUsd ? 'Balance (USD)' : `Balance (${last.currency})`,
      value: formatNumber(showUsd && (last.balance_usd ?? null) != null ? (last.balance_usd as number) : last.balance),
    },
    { label: 'Credited', value: formatNumber(credited), tone: 'bullish' },
    { label: 'Debited', value: formatNumber(debited), tone: 'bearish' },
  ];
}

export function LedgerHistory({
  rows,
  showUsd = false,
  isLoading = false,
  emptyMessage = 'No ledger entries',
  height = 360,
  className,
}: LedgerHistoryProps) {
  const columns: ReportColumn<LedgerEntry>[] = [
    { id: 'date', header: 'Date', width: 96, render: (row) => row.date },
    {
      id: 'category',
      header: 'Category',
      width: 96,
      render: (row) => <span className="hb-ledger-history__badge">{row.category}</span>,
    },
    {
      id: 'description',
      header: 'Description',
      render: (row) => (
        <span title={row.instrument ? `${row.description} · ${row.instrument}` : row.description}>
          {row.description}
          {row.instrument ? ` · ${row.instrument}` : ''}
        </span>
      ),
    },
    { id: 'wallet', header: 'Wallet', width: 110, render: (row) => row.wallet ?? '-' },
    {
      id: 'amount',
      header: 'Amount',
      width: 120,
      align: 'right',
      render: (row): ReactNode =>
        showUsd && row.amount_usd != null ? (
          renderPnl(row.amount_usd)
        ) : (
          <span className={clsx('hb-ledger-history__amount', row.amount < 0 && 'hb-ledger-history__amount--negative')}>
            {formatSigned(row.amount)}
          </span>
        ),
    },
    {
      id: 'balance',
      header: 'Balance',
      width: 120,
      align: 'right',
      render: (row) => formatNumber(showUsd && row.balance_usd != null ? row.balance_usd : row.balance),
    },
  ];

  return (
    <div className={clsx('hb-ledger-history', className)}>
      <ReportSummary items={summary(rows, showUsd)} />
      <ReportTable
        rows={rows}
        columns={columns}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        height={height}
      />
    </div>
  );
}

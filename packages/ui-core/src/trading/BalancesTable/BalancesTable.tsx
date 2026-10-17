// Ported/modernized from bfx-hf-ui-core's `BalancesTable`/`BalancesTable.columns` (Apache-2.0).
//
// Schema note: bfx-hf-ui-core's balances are one flat row per currency (`context`/`symbol`/
// `balance`/`available`) because a crypto exchange wallet really is that simple. honba has no
// such flat shape -- `GET /portfolio/accounts` returns `PortfolioAccount[]`: an account-level
// cash/equity/margin/leverage view, each carrying a separate `holdings: PortfolioHolding[]` list
// (delivery holdings carried past the trading day, from `GET /portfolio/holdings`). So this
// table renders one row per *account*, not per currency, with each account's holdings explored
// via an expand toggle rather than a second top-level table -- see docs/tasks.md Batch D's own
// note that "balances in a crypto exchange =~ holdings/cash in an equities broker, don't assume
// they're the same shape."
//
// Dropped from the original: Redux (`tableState` persistence), `@ufx-ui/core`'s
// `PrettyValue`/`VirtualTable` (this package uses `@tanstack/react-table` +
// `@tanstack/react-virtual` instead, per docs/tasks.md Batch D), the `hideZeroBalances` dust
// filter (no "dust" concept for account-level cash/equity), i18n. What's kept: the core
// total/available-style readout (here: cash vs. equity), now joined with leverage/broker/mode and
// an expandable per-account holdings list. This package does no fetching/Redux/WS (see Shared
// conventions).
import { useMemo, useRef, useState } from 'react';
import { useTable, tableFeatures, flexRender, type ColumnDef, type Row } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import clsx from 'clsx';
import { ChevronDown, ChevronRight } from 'lucide-react';

// See OrdersTable.tsx's header comment: @tanstack/react-table 9.x needs an explicit (possibly
// empty) `features` registry even when no optional feature is used here.
const tableFeatureSet = tableFeatures({});
type BalancesTableFeatures = typeof tableFeatureSet;

import type { InstrumentId } from '../OrderForm';
import { PLNumber } from '../../ui/PLNumber';
import { formatMoney } from '../PositionsTable';
import type { Money } from '../PositionsTable';
import './BalancesTable.css';

/** honba's `PortfolioMode` (ADR-0032 §4): real vs. simulated money. */
export type PortfolioMode = 'live' | 'sandbox';

/** honba's net aggregate option Greeks for an account, when options are present. */
export interface PortfolioGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

/** honba's `PortfolioHolding`: a delivery holding (a carried position, no intraday side). */
export interface PortfolioHolding {
  instrument_id: InstrumentId;
  quantity: number;
  avg_price: number;
  mark: number;
  market_value: Money;
  realized_pnl: Money;
  unrealized_pnl: Money;
  group_name?: string | null;
  tags?: string[];
}

/**
 * Row shape for this table: honba's `PortfolioAccount` (`GET /portfolio/accounts`). Trimmed from
 * the real schema: `positions` (open/intraday positions) is `PositionsTable`'s job, not this
 * widget's, and `margin_used`/`margin_available`/`market_value`/`source` aren't surfaced as
 * columns here (kept out rather than guessed at) -- add them if/when this panel needs a margin
 * view.
 */
export interface PortfolioAccount {
  id: string;
  name: string;
  broker?: string | null;
  mode: PortfolioMode;
  currency: string;
  cash: Money;
  equity: Money;
  leverage: number;
  realized_pnl: Money;
  unrealized_pnl: Money;
  holdings: PortfolioHolding[];
  greeks?: PortfolioGreeks | null;
}

export interface BalancesTableProps {
  rows: PortfolioAccount[];
  emptyMessage?: string;
  /** Scroll-container height in px, passed to the virtualizer. */
  height?: number;
  className?: string;
}

const COLUMN_WIDTHS: Record<string, number> = {
  expand: 36,
  account: 160,
  broker: 100,
  mode: 80,
  cash: 120,
  equity: 120,
  leverage: 70,
  realized_pnl: 120,
  unrealized_pnl: 120,
  holdings_count: 80,
};

const ACCOUNT_ROW_HEIGHT = 36;
const HOLDINGS_HEADER_HEIGHT = 28;
const HOLDINGS_ROW_HEIGHT = 26;
const HOLDINGS_MAX_VISIBLE = 6;

// Deterministic (not DOM-measured) height for an expanded account's holdings block, so the
// virtualizer's `estimateSize` can mix two row "kinds" (account rows, holdings blocks) without
// needing `measureElement`. Accounts with more than HOLDINGS_MAX_VISIBLE holdings get an
// internal scroll area instead of growing without bound.
function holdingsBlockHeight(holdings: PortfolioHolding[]): number {
  const visible = Math.min(holdings.length, HOLDINGS_MAX_VISIBLE);
  return HOLDINGS_HEADER_HEIGHT + visible * HOLDINGS_ROW_HEIGHT + 8;
}

type DisplayRow =
  | { kind: 'account'; account: PortfolioAccount }
  | { kind: 'holdings'; account: PortfolioAccount };

export function BalancesTable({
  rows,
  emptyMessage = 'No accounts',
  height = 320,
  className,
}: BalancesTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpanded = (accountId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  const columns = useMemo<ColumnDef<BalancesTableFeatures, PortfolioAccount>[]>(() => {
    return [
      {
        id: 'expand',
        header: '',
        cell: ({ row }) => {
          const account = row.original;
          const hasHoldings = account.holdings.length > 0;
          const isOpen = expanded.has(account.id);
          return (
            <button
              type="button"
              className="hb-balances-table__expand"
              disabled={!hasHoldings}
              aria-label={
                isOpen ? `Collapse holdings for ${account.name}` : `Expand holdings for ${account.name}`
              }
              onClick={() => toggleExpanded(account.id)}
            >
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          );
        },
      },
      {
        id: 'account',
        header: 'Account',
        accessorFn: (row) => row.name,
      },
      {
        id: 'broker',
        header: 'Broker',
        accessorFn: (row) => row.broker ?? '-',
      },
      {
        id: 'mode',
        header: 'Mode',
        cell: ({ row }) => (
          <span className={clsx('hb-balances-table__mode', `hb-balances-table__mode--${row.original.mode}`)}>
            {row.original.mode.toUpperCase()}
          </span>
        ),
      },
      {
        id: 'cash',
        header: 'Cash',
        accessorFn: (row) => formatMoney(row.cash),
      },
      {
        id: 'equity',
        header: 'Equity',
        accessorFn: (row) => formatMoney(row.equity),
      },
      {
        id: 'leverage',
        header: 'Leverage',
        accessorFn: (row) => `${row.leverage}x`,
      },
      {
        id: 'realized_pnl',
        header: 'Realized P&L',
        cell: ({ row }) => (
          <PLNumber value={row.original.realized_pnl.amount / 100} ccy={row.original.realized_pnl.currency} />
        ),
      },
      {
        id: 'unrealized_pnl',
        header: 'Unrealized P&L',
        cell: ({ row }) => (
          <PLNumber
            value={row.original.unrealized_pnl.amount / 100}
            ccy={row.original.unrealized_pnl.currency}
          />
        ),
      },
      {
        id: 'holdings_count',
        header: 'Holdings',
        accessorFn: (row) => String(row.holdings.length),
      },
    ];
  }, [expanded]);

  const table = useTable({
    features: tableFeatureSet,
    data: rows,
    columns,
  });

  const tableRows = table.getRowModel().rows;
  const rowById = useMemo(() => {
    const map = new Map<string, Row<BalancesTableFeatures, PortfolioAccount>>();
    for (const row of tableRows) map.set(row.original.id, row);
    return map;
  }, [tableRows]);

  const displayRows = useMemo<DisplayRow[]>(() => {
    const out: DisplayRow[] = [];
    for (const row of tableRows) {
      out.push({ kind: 'account', account: row.original });
      if (expanded.has(row.original.id) && row.original.holdings.length > 0) {
        out.push({ kind: 'holdings', account: row.original });
      }
    }
    return out;
  }, [tableRows, expanded]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: displayRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      const displayRow = displayRows[index];
      if (!displayRow) return ACCOUNT_ROW_HEIGHT;
      return displayRow.kind === 'account'
        ? ACCOUNT_ROW_HEIGHT
        : holdingsBlockHeight(displayRow.account.holdings);
    },
    overscan: 8,
  });

  if (rows.length === 0) {
    return (
      <div className={clsx('hb-balances-table', className)}>
        <p className="hb-balances-table__empty">{emptyMessage}</p>
      </div>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className={clsx('hb-balances-table', className)}>
      <div ref={scrollRef} className="hb-balances-table__scroll" style={{ height }}>
        <table className="hb-balances-table__table" style={{ display: 'grid' }}>
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
            {virtualItems.map((virtualItem) => {
              const displayRow = displayRows[virtualItem.index];
              if (!displayRow) return null;
              const row = rowById.get(displayRow.account.id);
              if (!row) return null;

              if (displayRow.kind === 'account') {
                return (
                  <tr
                    key={`account-${displayRow.account.id}`}
                    style={{
                      display: 'flex',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: ACCOUNT_ROW_HEIGHT,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    {row.getAllCells().map((cell) => (
                      <td key={cell.id} style={{ width: COLUMN_WIDTHS[cell.column.id] }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              }

              const holdings = displayRow.account.holdings;
              return (
                <tr
                  key={`holdings-${displayRow.account.id}`}
                  style={{
                    display: 'flex',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: holdingsBlockHeight(holdings),
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <td className="hb-balances-table__holdings-cell">
                    <div className="hb-balances-table__holdings">
                      <div className="hb-balances-table__holdings-header">
                        <span>Instrument</span>
                        <span>Qty</span>
                        <span>Avg Price</span>
                        <span>Mark</span>
                        <span>Mkt Value</span>
                        <span>Unrealized P&L</span>
                      </div>
                      <div className="hb-balances-table__holdings-rows">
                        {holdings.map((holding) => (
                          <div
                            key={`${holding.instrument_id.exchange}:${holding.instrument_id.symbol}`}
                            className="hb-balances-table__holdings-row"
                          >
                            <span>
                              <span className="hb-balances-table__holdings-symbol">
                                {holding.instrument_id.symbol}
                              </span>{' · '}
                              {holding.instrument_id.exchange}
                            </span>
                            <span>{holding.quantity}</span>
                            <span>{holding.avg_price}</span>
                            <span>{holding.mark}</span>
                            <span>{formatMoney(holding.market_value)}</span>
                            <span>
                              <PLNumber
                                value={holding.unrealized_pnl.amount / 100}
                                ccy={holding.unrealized_pnl.currency}
                              />
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

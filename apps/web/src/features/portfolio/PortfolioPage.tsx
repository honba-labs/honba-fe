// Batch I slice 1 (docs/tasks.md §Batch I): the Portfolio route — honba-frontend's
// `portfolio-app.tsx` (accounts/holdings/positions/orders/trades tabs over a KPI header) is the
// parity target; this page reassembles it from the Batch A–H inventory instead of hand-rolled
// markup: KPI strip from `GET /portfolio`, BalancesTablePanel (Batch D) for accounts/holdings,
// PositionsTablePanel + Batch G's ClosePositionModal for open positions, TradesTablePanel for
// the fill ledger, all fed by Batch H's TanStack hooks (`core/api/query.ts`).
//
// Endpoint honesty: `POST /positions/close` takes no body and closes *every* non-zero ledger
// position (honba-ya-api-rest/src/orders.rs) — there is no per-instrument variant yet, so a
// row's Close button opens the modal for the clicked position and the confirm fires the
// close-all POST; the notification and the orders refresh reflect that reality. A real
// per-instrument close is a honba API gap, not a FE decision — revisit server-side.
import { useState } from 'react';

import {
  BalancesTablePanel,
  ClosePositionModal,
  PositionsTablePanel,
  Tabs,
  TradesTablePanel,
} from '@honba/ui-core';
import type { TabItem } from '@honba/ui-core';
import {
  LedgerHistory,
  TaxReport,
  PortfolioSnapshots,
  PositionAuditTrail,
  ConcentrationRisk,
  WeightedAverageCost,
  FeesReport,
  PortfolioValueChart,
} from '@honba/ui-core';

import {
  useAccounts,
  useClosePositions,
  usePositions,
  usePortfolio,
  useTrades,
  useLedgerHistory,
  useTaxReport,
  usePortfolioSnapshots,
  usePositionAudit,
  useConcentrationRisk,
  useWeightedAverageCost,
  useFeesReport,
  useEquityCurve,
} from '../../core/api/query';
import { useNotifications } from '../../core/store/notifications';
import type { Money, PortfolioPosition } from '../../core/types/messages';
import './PortfolioPage.css';

type PortfolioTab =
  | 'accounts'
  | 'positions'
  | 'trades'
  | 'ledger'
  | 'tax'
  | 'snapshots'
  | 'audit'
  | 'concentration'
  | 'wac'
  | 'fees'
  | 'equity-curve';

const TABS: TabItem<PortfolioTab>[] = [
  { label: 'Accounts', value: 'accounts' },
  { label: 'Positions', value: 'positions' },
  { label: 'Trade History', value: 'trades' },
  { label: 'Ledger', value: 'ledger' },
  { label: 'Tax Report', value: 'tax' },
  { label: 'Snapshots', value: 'snapshots' },
  { label: 'Position Audit', value: 'audit' },
  { label: 'Concentration', value: 'concentration' },
  { label: 'Avg Cost', value: 'wac' },
  { label: 'Fees', value: 'fees' },
  { label: 'Equity Curve', value: 'equity-curve' },
];

/** KPI-strip money formatting (`formatMoney` in ui-core renders `3150.00 INR`; the header
 * wants a currency glyph in the terminal style used across honba-frontend). */
const CCY_GLYPHS: Partial<Record<string, string>> = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };

function formatKpi(money: Money): string {
  const glyph = CCY_GLYPHS[money.currency] ?? `${money.currency} `;
  return `${glyph}${(money.amount / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function PortfolioPage() {
  const portfolio = usePortfolio();
  const accounts = useAccounts();
  const positions = usePositions();
  const trades = useTrades();
  const closeAll = useClosePositions();
  const push = useNotifications((state) => state.push);

  // Report hooks
  const ledger = useLedgerHistory();
  const taxReport = useTaxReport();
  const snapshots = usePortfolioSnapshots();
  const audit = usePositionAudit();
  const concentration = useConcentrationRisk();
  const wac = useWeightedAverageCost();
  const fees = useFeesReport();
  const equityCurve = useEquityCurve();

  const [tab, setTab] = useState<PortfolioTab>('accounts');
  const [closing, setClosing] = useState<PortfolioPosition | null>(null);
  const [closeError, setCloseError] = useState<string | null>(null);

  function requestClose(position: PortfolioPosition) {
    setCloseError(null);
    setClosing(position);
  }

  function confirmClose() {
    if (!closing) return;
    closeAll.mutate(undefined, {
      onSuccess: () => {
        // The endpoint closes all non-zero positions; say so instead of implying one row.
        push({
          severity: 'info',
          title: 'Close requested',
          message: `Market-close orders submitted for every open position (started with ${closing.instrument_id.exchange}:${closing.instrument_id.symbol}).`,
        });
        setClosing(null);
      },
      onError: (error) => {
        setCloseError((error as Error).message);
        push({ severity: 'error', title: 'Close failed', message: (error as Error).message });
      },
    });
  }

  const closePending = closeAll.isPending;
  const totals = portfolio.data?.totals;

  return (
    <div className="portfolio">
      <header className="portfolio__header">
        <h2>Portfolio</h2>
        {totals && (
          <dl className="portfolio__kpis">
            <div className="portfolio__kpi">
              <dt>Total Equity</dt>
              <dd>{formatKpi(totals.equity)}</dd>
            </div>
            <div className="portfolio__kpi">
              <dt>Available Cash</dt>
              <dd>{formatKpi(totals.cash)}</dd>
            </div>
            <div className="portfolio__kpi">
              <dt>Market Value</dt>
              <dd>{formatKpi(totals.market_value)}</dd>
            </div>
            <div className="portfolio__kpi portfolio__kpi--pnl">
              <dt>Total P&L</dt>
              <dd data-tone={totals.total_pnl.amount >= 0 ? 'bullish' : 'bearish'}>
                {formatKpi(totals.total_pnl)}
              </dd>
            </div>
          </dl>
        )}
        {portfolio.data && (
          <p className="portfolio__meta">
            Owner: {portfolio.data.owner} · revision {portfolio.data.revision} · as of{' '}
            <time>{portfolio.data.as_of.iso}</time>
          </p>
        )}
        {portfolio.error && (
          <p className="portfolio__error">Portfolio snapshot failed: {(portfolio.error as Error).message}</p>
        )}
      </header>

      <Tabs<PortfolioTab>
        className="portfolio__tabs"
        tabs={TABS}
        activeTab={tab}
        onTabClick={setTab}
      />

      <div className="portfolio__content">
        {tab === 'accounts' && (
          <>
            {accounts.error && (
              <p className="portfolio__error">Accounts failed: {(accounts.error as Error).message}</p>
            )}
            <BalancesTablePanel rows={accounts.data?.accounts ?? []} />
          </>
        )}

        {tab === 'positions' && (
          <>
            {positions.error && (
              <p className="portfolio__error">Positions failed: {(positions.error as Error).message}</p>
            )}
            {closeError && <p className="portfolio__error">Close failed: {closeError}</p>}
            <PositionsTablePanel
              rows={(positions.data?.positions ?? [])
                .filter(
                  // Wire `no_position_side` rows are bookkeeping-only (no intraday side to
                  // close); the table's flat semantics are `quantity === 0`, so they are
                  // filtered out here at the feature layer rather than mislabeled.
                  (position) => position.side !== 'no_position_side',
                )
                // The filter above proves `side` is a live position side; ui-core's row type
                // doesn't carry the `no_position_side` arm, so say it once here.
                .map((position) => ({ ...position, side: position.side as 'long' | 'short' }))}
              onClose={(instrumentId) => {
                const row = positions.data?.positions.find(
                  (position) =>
                    position.instrument_id.symbol === instrumentId.symbol &&
                    position.instrument_id.exchange === instrumentId.exchange,
                );
                if (row) requestClose(row);
              }}
            />
          </>
        )}

        {tab === 'trades' && (
          <>
            {trades.error && (
              <p className="portfolio__error">Trades failed: {(trades.error as Error).message}</p>
            )}
            <TradesTablePanel rows={trades.data?.trades ?? []} />
          </>
        )}

        {tab === 'ledger' && (
          <>
            {ledger.error && (
              <p className="portfolio__error">Ledger failed: {(ledger.error as Error).message}</p>
            )}
            <LedgerHistory />
          </>
        )}

        {tab === 'tax' && (
          <>
            {taxReport.error && (
              <p className="portfolio__error">Tax report failed: {(taxReport.error as Error).message}</p>
            )}
            <TaxReport />
          </>
        )}

        {tab === 'snapshots' && (
          <>
            {snapshots.error && (
              <p className="portfolio__error">Snapshots failed: {(snapshots.error as Error).message}</p>
            )}
            <PortfolioSnapshots />
          </>
        )}

        {tab === 'audit' && (
          <>
            {audit.error && (
              <p className="portfolio__error">Audit failed: {(audit.error as Error).message}</p>
            )}
            <PositionAuditTrail />
          </>
        )}

        {tab === 'concentration' && (
          <>
            {concentration.error && (
              <p className="portfolio__error">Concentration failed: {(concentration.error as Error).message}</p>
            )}
            <ConcentrationRisk />
          </>
        )}

        {tab === 'wac' && (
          <>
            {wac.error && (
              <p className="portfolio__error">WAC failed: {(wac.error as Error).message}</p>
            )}
            <WeightedAverageCost />
          </>
        )}

        {tab === 'fees' && (
          <>
            {fees.error && (
              <p className="portfolio__error">Fees failed: {(fees.error as Error).message}</p>
            )}
            <FeesReport />
          </>
        )}

        {tab === 'equity-curve' && (
          <>
            {equityCurve.error && (
              <p className="portfolio__error">Equity curve failed: {(equityCurve.error as Error).message}</p>
            )}
            <PortfolioValueChart />
          </>
        )}
      </div>

      <ClosePositionModal
        isOpen={closing !== null}
        onClose={() => setClosing(null)}
        position={closing}
        onConfirm={confirmClose}
      />
      {closePending && (
        <p className="portfolio__pending" role="status">
          Submitting close orders…
        </p>
      )}
    </div>
  );
}

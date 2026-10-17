// Ported/modernized from bfx-hf-ui-core's src/components/OrderBook (Apache-2.0). The original
// (`OrderBook.js` + `OrderBook.helpers.js`) renders Bitfinex's own `@ufx-ui/core` `Book`
// component with a row-mapping/viz-type config derived from a `sumAmounts`/`stackedView` pair of
// props; `Book` itself is not ported (separate Bitfinex package, not a drop-in dependency — see
// docs/tasks.md Batch C). This is a from-scratch, props-in/no-fetching re-implementation of the
// same "two-sided price/size/total ladder with a depth bar" concept, typed against the
// `PriceLevel`/`OrderBookData` shapes in `OrderBook.types.ts`.
import clsx from 'clsx';

import type { PriceLevel, OrderBookData } from './OrderBook.types';
import './OrderBook.css';

type Side = 'bid' | 'ask';

interface Row extends PriceLevel {
  total: number;
}

export interface OrderBookProps extends OrderBookData {
  /** Rows shown per side. bfx-hf-ui-core caps this at 12 to fit its design mockups; same default here. */
  maxRows?: number;
  priceDecimals?: number;
  sizeDecimals?: number;
  onLevelClick?: (level: PriceLevel, side: Side) => void;
  className?: string;
}

function withTotals(levels: PriceLevel[], maxRows: number): Row[] {
  let running = 0;
  return levels.slice(0, maxRows).map((level) => {
    running += level.size;
    return { ...level, total: level.total ?? running };
  });
}

function formatNumber(value: number, decimals: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function OrderBook({
  bids,
  asks,
  maxRows = 12,
  priceDecimals = 2,
  sizeDecimals = 0,
  onLevelClick,
  className,
}: OrderBookProps) {
  const bidRows = withTotals(bids, maxRows);
  const askRows = withTotals(asks, maxRows);
  const maxTotal = Math.max(
    bidRows[bidRows.length - 1]?.total ?? 0,
    askRows[askRows.length - 1]?.total ?? 0,
    1,
  );

  const renderSide = (rows: Row[], side: Side) => (
    <div className={clsx('hb-orderbook__side', side)}>
      <div className="hb-orderbook__header-row">
        <span>Price</span>
        <span>Size</span>
        <span>Total</span>
      </div>
      <ul className="hb-orderbook__rows" role="list">
        {rows.length === 0 && <li className="hb-orderbook__empty">No orders</li>}
        {rows.map((row) => (
          <li
            key={`${side}-${row.price}`}
            className="hb-orderbook__row"
            onClick={onLevelClick ? () => onLevelClick(row, side) : undefined}
          >
            <span
              className="hb-orderbook__depth-bar"
              style={{ width: `${Math.min(100, (row.total / maxTotal) * 100)}%` }}
            />
            <span className="hb-orderbook__price">{formatNumber(row.price, priceDecimals)}</span>
            <span className="hb-orderbook__size">{formatNumber(row.size, sizeDecimals)}</span>
            <span className="hb-orderbook__total">{formatNumber(row.total, sizeDecimals)}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className={clsx('hb-orderbook', className)}>
      {renderSide(bidRows, 'bid')}
      {renderSide(askRows, 'ask')}
    </div>
  );
}

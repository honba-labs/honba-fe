// Ported/modernized from bfx-hf-ui-core's src/components/OrderBook (Apache-2.0). The original
// is a thin wrapper around Bitfinex's own `@ufx-ui/core` `Book` component (not ported — see
// docs/tasks.md Batch C and Shared conventions), so this is a from-scratch, dependency-free
// re-implementation of the same "price/size/total ladder, two sides" concept.
//
// This file documents the normalized shape the caller (an `apps/web` feature) is responsible
// for producing from honba's `/depth/{id}` REST response or a `/ws` depth-channel message —
// `packages/ui-core` itself does no fetching (see Shared conventions in docs/tasks.md).

/** One price level on either side of an order book. */
export interface PriceLevel {
  /** Price for this level. */
  price: number;
  /** Size resting at this level (shares/contracts/lots — whatever unit the caller uses). */
  size: number;
  /**
   * Cumulative size from the best price through this level, same side. Optional — `OrderBook`
   * derives it from `size` when omitted, so callers that already compute cumulative depth
   * server-side can pass it straight through instead of recomputing it.
   */
  total?: number;
}

/**
 * Normalized order book snapshot `OrderBook` renders. `bids` must be sorted best-first
 * (descending price) and `asks` best-first (ascending price) — `OrderBook` does not re-sort,
 * it only takes the first `maxRows` of each array as given.
 */
export interface OrderBookData {
  bids: PriceLevel[];
  asks: PriceLevel[];
}

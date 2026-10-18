// Batch H (docs/tasks.md): the client's order-book state. honba has one order lifecycle
// surface (`GET /orders` + `POST /orders` + `DELETE /orders/{id}`; no WebSocket order channel
// yet — see plan.md §3.4's inspection result), so today the store is reconciled from REST
// snapshots (replaceRows) with per-row upserts for order-lifecycle events (fills, cancels)
// once they stream. Rows are keyed by `order_id`; row order is the server's (oldest first).
//
// The Batch F handoff note (fold the existing notifications store rather than recreate) applies
// here too: this is the family `apps/web/src/core/store`, one Zustand store per domain.
import { create } from 'zustand';

import type { Order } from '../types/messages';

interface OrdersState {
  /** Rows by order_id (insertion-ordered by first sight; see orderIds). */
  rows: Record<string, Order>;
  /** Insertion-ordered ids (the server's oldest-first snapshot order). */
  orderIds: string[];
  /** Reconcile from a `GET /orders` snapshot: seeds everything, drops rows no longer reported. */
  replaceRows: (orders: Order[]) => void;
  /** Insert-or-update one row (an order-lifecycle event: fill, cancel ack, rejection). */
  upsert: (order: Order) => void;
  remove: (orderId: string) => void;
  reset: () => void;
}

function orderMap(orders: Order[]): { rows: Record<string, Order>; orderIds: string[] } {
  const rows: Record<string, Order> = {};
  const orderIds: string[] = [];
  for (const order of orders) {
    if (!(order.order_id in rows)) {
      orderIds.push(order.order_id);
    }
    rows[order.order_id] = order;
  }
  return { rows, orderIds };
}

export const useOrdersStore = create<OrdersState>((set) => ({
  rows: {},
  orderIds: [],
  replaceRows: (orders) => set(orderMap(orders)),
  upsert: (order) =>
    set((state) => {
      const isNew = !(order.order_id in state.rows);
      return {
        rows: { ...state.rows, [order.order_id]: order },
        orderIds: isNew ? [...state.orderIds, order.order_id] : state.orderIds,
      };
    }),
  remove: (orderId) =>
    set((state) => {
      if (!(orderId in state.rows)) return state;
      const rows = { ...state.rows };
      delete rows[orderId];
      return { rows, orderIds: state.orderIds.filter((id) => id !== orderId) };
    }),
  reset: () => set({ rows: {}, orderIds: [] }),
}));

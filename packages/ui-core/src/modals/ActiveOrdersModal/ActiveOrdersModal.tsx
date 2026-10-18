// Batch G (docs/tasks.md): ported from bfx-hf-ui-core's `ActiveAlgoOrdersModal`
// (src/modals/ActiveAlgoOrdersModal/{...,columns,table}*, Apache-2.0) → renamed
// `ActiveOrdersModal`: honba has no algo-order (AO) subsystem, so the resume-after-reconnect
// flow runs over plain working `Order`s (Batch D). The ufx-ui `Checkbox` in the reference is
// re-implemented as a native checkbox styled with tokens; the reference's main/paper split
// collapses to one list (an account's mode is a Batch G/H concern), and its escape/dismiss =
// cancel-all semantics are replaced by explicit footer actions (closing the modal must never
// be an order-routing shortcut in honba).
//
// Behavior parity: green AttentionBar when shown after a reconnect (the reference's
// `isAfterLogin`), per-row select + select-all, Cancel-all and Resume buttons gated on
// selection. Intents route through callbacks; nothing global.
import { useEffect, useState } from 'react';

import { AttentionBar } from '../../ui/AttentionBar';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import type { Order, OrderRowSide } from '../../trading/OrdersTable';
import './ActiveOrdersModal.css';

const ORDER_TYPE_LABELS: Record<string, string> = {
  market: 'Market',
  limit: 'Limit',
  stop_market: 'Stop',
  stop_limit: 'Stop Limit',
  trailing_stop: 'Trailing Stop',
};

export interface ActiveOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Working orders that survived a reconnect (Batch D `Order` rows). */
  rows: Order[];
  /** True right after a WS reconnect — renders the restored-connection notice. */
  restoredAfterReconnect?: boolean;
  /** Per-row selection state stays local; these fire with the selected ids only. */
  onCancel: (orderIds: string[]) => void;
  onResume: (orderIds: string[]) => void;
  className?: string;
}

function orderLabel(order: Order): string {
  const instrument = `${order.instrument_id.exchange}:${order.instrument_id.symbol}`;
  return `${order.side.toUpperCase()} ${order.quantity} ${ORDER_TYPE_LABELS[order.order_type]} ${instrument}`;
}

export function ActiveOrdersModal({
  isOpen,
  onClose,
  rows,
  restoredAfterReconnect = false,
  onCancel,
  onResume,
  className,
}: ActiveOrdersModalProps) {
  const [selected, setSelected] = useState<string[]>([]);

  // Fresh list of ids whenever the modal opens (the reference's selection was local-to-open
  // state too, minus its redux journeys).
  useEffect(() => {
    if (isOpen) setSelected([]);
  }, [isOpen]);

  // Keep only ids still present (rows may shrink while the modal is open).
  const activeIds = rows.map((row) => row.order_id);
  const selectedActive = selected.filter((id) => activeIds.includes(id));

  const toggleOne = (orderId: string) => {
    setSelected((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId],
    );
  };

  const allSelected = rows.length > 0 && selectedActive.length === rows.length;
  const toggleAll = () => {
    setSelected(allSelected ? [] : activeIds);
  };

  const hasSelection = selectedActive.length > 0;

  return (
    <Modal
      label="Active orders"
      isOpen={isOpen}
      onClose={onClose}
      width={900}
      className={`hb-active-orders-modal ${className ?? ''}`}
    >
      {restoredAfterReconnect ? (
        <AttentionBar tone="green">
          Connection restored — your working orders were kept. Resend them, or cancel what you no
          longer want below.
        </AttentionBar>
      ) : null}
      {rows.length === 0 ? (
        <p className="hb-active-orders-modal__empty">No working orders</p>
      ) : (
        <>
          <ul className="hb-active-orders-modal__list">
            {rows.map((row) => (
              <li key={row.order_id} className="hb-active-orders-modal__row">
                <label className="hb-active-orders-modal__check">
                  <input
                    type="checkbox"
                    checked={selectedActive.includes(row.order_id)}
                    onChange={() => toggleOne(row.order_id)}
                  />
                  <span className="hb-active-orders-modal__order">{orderLabel(row)}</span>
                  <span className="hb-active-orders-modal__id">{row.order_id}</span>
                </label>
              </li>
            ))}
          </ul>
          <label className="hb-active-orders-modal__check hb-active-orders-modal__check--all">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            Select all ({rows.length})
          </label>
        </>
      )}
      <div className="hb-modal-footer">
        <Button
          label="Cancel all"
          variant="red"
          disabled={!hasSelection}
          onClick={() => onCancel(selectedActive)}
        />
        <Button
          label="Resend"
          variant="green"
          disabled={!hasSelection}
          onClick={() => onResume(selectedActive)}
        />
      </div>
    </Modal>
  );
}

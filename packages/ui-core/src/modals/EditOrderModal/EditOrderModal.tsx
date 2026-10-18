// Batch G (docs/tasks.md): honba-fied port of bfx-hf-ui-core's `EditOrderModal`
// (src/modals/EditOrderModal/{EditOrderModal,EditOrderModal.utils}*, Apache-2.0). The
// reference edits either an atomic order (via its `renderLayout` field-rendering framework)
// or a bfx algo-order definition (bfx-hf-algo AO trees, `bfx-hf-algo` + redux + the
// algo-order subsystem honba doesn't have — no AOs, no recurring orders, no
// relaunch-after-reconnect flow). honba's equivalent: a simple controlled amend of the two
// fields brokers actually amend — quantity and price — against Batch D's `Order`. A full
// type/TIF rewrite is a cancel-and-replace, which belongs to the feature layer (Batch H's
// order actions), not to an amend dialog.
//
// Flow parity kept from the reference: state resets when the target order changes, fields
// validate client-side before submit, caller-side validation errors (the broker's 400 body
// → `error` prop) render as an AttentionBar, and every intent is a callback — nothing global.
import { useEffect, useState } from 'react';

import { AttentionBar } from '../../ui/AttentionBar';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import type { Order } from '../../trading/OrdersTable';
import type { OrderType } from '../../trading/OrderForm';
import './EditOrderModal.css';

export interface OrderPatch {
  order_id: string;
  quantity: number;
  /** Amended limit/stop price; only sent by the caller for non-market orders. */
  price?: number;
}

export interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The working order being amended. */
  order: Order | null;
  /** Called with the patch when Update order passes client-side validation. */
  onSubmit: (patch: OrderPatch) => void;
  /** Caller/API validation or rejection message rendered above the form. */
  error?: string | null;
  className?: string;
}

const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  market: 'Market',
  limit: 'Limit',
  stop_market: 'Stop market',
  stop_limit: 'Stop limit',
  trailing_stop: 'Trailing stop',
};
/** Orders whose amendable price field is 'price' (trigger_price/trail edits are stop-flow
 * specific and aren't part of the amend dialog). */
const PRICE_EDITABLE: OrderType[] = ['limit', 'stop_limit'];

export function EditOrderModal({
  isOpen,
  onClose,
  order,
  onSubmit,
  error = null,
  className,
}: EditOrderModalProps) {
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');

  // Reset per target order (the reference did the same via its order effect). Runs when the
  // modal (re)opens for a new order id.
  useEffect(() => {
    if (order) {
      setQuantity(order.filled_qty !== undefined ? String(order.quantity) : String(order.quantity));
      setPrice(order.price !== null && order.price !== undefined ? String(order.price) : '');
    }
  }, [order?.order_id, isOpen]);

  if (!order) return null;

  const quantityValue = Number(quantity);
  const priceValue = Number(price);
  const quantityInvalid = quantity === '' ||
    Number.isNaN(quantityValue) ||
    !Number.isFinite(quantityValue) ||
    quantityValue <= 0;
  const priceRequired = PRICE_EDITABLE.includes(order.order_type);
  const priceInvalid =
    (priceRequired && (price === '' || Number.isNaN(priceValue) || priceValue <= 0)) ||
    (!priceRequired && price !== '' && (Number.isNaN(priceValue) || priceValue <= 0));
  const tainted =
    quantityValue !== order.quantity ||
    Math.abs((order.price ?? NaN) - priceValue) > Number.EPSILON;

  const sides = `${order.side.toUpperCase()} ${order.quantity}`;
  const instrument = `${order.instrument_id.exchange}:${order.instrument_id.symbol}`;

  const submit = () => {
    if (quantityInvalid || priceInvalid) return;
    onSubmit({
      order_id: order.order_id,
      quantity: quantityValue,
      ...(priceRequired || price !== '' ? { price: priceValue } : {}),
    });
  };

  return (
    <Modal
      label={`Edit order ${order.order_id}`}
      isOpen={isOpen}
      onClose={onClose}
      width={520}
      className={`hb-edit-order-modal ${className ?? ''}`}
    >
      <div className="hb-edit-order-modal__context">
        {sides} {ORDER_TYPE_LABEL[order.order_type]} · {instrument} · {order.time_in_force?.toUpperCase() ?? 'DAY'}
      </div>
      {error ? <AttentionBar tone="red">{error}</AttentionBar> : null}
      <div className="hb-edit-order-modal__fields">
        <Input
          label="Quantity"
          type="number"
          value={quantity}
          onChange={setQuantity}
        />
        {quantityInvalid ? (
          <AttentionBar tone="yellow">Quantity must be a positive number</AttentionBar>
        ) : null}
        <Input
          label={priceRequired ? 'Price' : 'Price (optional — blank keeps the order price-less)'}
          type="number"
          value={price}
          onChange={setPrice}
        />
        {priceInvalid ? (
          <AttentionBar tone="yellow">Price must be a positive number</AttentionBar>
        ) : null}
        {order.filled_qty && order.filled_qty > 0 ? (
          <AttentionBar tone="yellow">
            {order.filled_qty} of {order.quantity} already filled — amending may not apply to the
            filled part (broker-specific).
          </AttentionBar>
        ) : null}
        <p className="hb-edit-order-modal__hint">
          Type and time-in-force are amended via cancel-and-replace, not here.
        </p>
      </div>
      <div className="hb-modal-footer">
        <Button label="Cancel" onClick={onClose} />
        <Button label="Update order" variant="blue" disabled={quantityInvalid || priceInvalid || !tainted} onClick={submit} />
      </div>
    </Modal>
  );
}

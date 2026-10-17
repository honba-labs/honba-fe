// Ported/modernized from bfx-hf-ui-core's src/components/OrderForm (Apache-2.0). The original
// is a stateful class component that mixes the order ticket with: Redux (`submitOrder`/
// `submitAlgoOrder`/`aoParams`), Electron-only API-key modals (`ConnectingModal`/
// `SubmitAPIKeysModal`), a data-driven "layout" system (`OrderForm.helpers`'s
// `renderLayout`/`COMPONENTS_FOR_ID`) that renders Bitfinex's large catalog of atomic + algo
// order types (OCO, Iceberg, TWAP, Recurring, ...) from JSON field defs, and an `OrderFormMenu`
// picker for that catalog. None of that has a honba equivalent: honba's order model (see
// docs/tasks.md Batch D) is the fixed five-`OrderType` set below, not an open-ended algo
// catalog, and this package does no fetching/Redux/WS (see Shared conventions). So this is a
// from-scratch ticket built on ui-core's own `Dropdown`/`Input`/`RadioButton`/`Button` rather
// than a line-for-line port of the layout-driven renderer: side (buy/sell) + order type + qty +
// the type-specific fields from the validation table below + time in force, client-side
// validated, handed to `onSubmit(orderDraft)` same as the original's contract. Wiring
// `onSubmit` to `POST /orders` is Batch H/I's job, not this one.
//
// Known gap: honba's wire `OrdersRequest` today only has `client_order_id / instrument_id /
// order_type / price / qty / side / tif` (no `trigger_price` or `trail_*`), so stop/trailing-stop
// drafts from this form are ahead of what the wire format accepts — the submitting code maps
// this fuller draft down once the API catches up.
import { useState, type FormEvent } from 'react';
import clsx from 'clsx';

import { Dropdown } from '../../ui/Dropdown';
import type { DropdownOption } from '../../ui/Dropdown';
import { Input } from '../../ui/Input';
import { RadioButton } from '../../ui/RadioButton';
import { Button } from '../../ui/Button';
import './OrderForm.css';

export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop_market' | 'stop_limit' | 'trailing_stop';
export type TimeInForce = 'day' | 'gtc' | 'ioc' | 'fok';

export interface InstrumentId {
  exchange: string;
  symbol: string;
}

/**
 * The shape handed to `onSubmit`. Deliberately fuller than today's wire `OrdersRequest` (see
 * the header comment above) — it matches honba's `OrderIntent::validate` model for a *draft*,
 * not the current wire DTO.
 */
export interface OrderDraft {
  instrument_id: InstrumentId;
  side: OrderSide;
  order_type: OrderType;
  qty: number;
  tif: TimeInForce;
  price?: number;
  trigger_price?: number;
  trail_amount?: number;
  trail_percent?: number;
  client_order_id?: string;
}

export type OrderFormFieldErrors = Partial<Record<'qty' | 'price' | 'triggerPrice' | 'trail', string>>;

interface RawOrderFields {
  orderType: OrderType;
  qty: string;
  price: string;
  triggerPrice: string;
  trailAmount: string;
  trailPercent: string;
}

const PRICE_ORDER_TYPES: OrderType[] = ['limit', 'stop_limit'];
const TRIGGER_ORDER_TYPES: OrderType[] = ['stop_market', 'stop_limit'];

function needsPrice(orderType: OrderType): boolean {
  return PRICE_ORDER_TYPES.includes(orderType);
}

function needsTrigger(orderType: OrderType): boolean {
  return TRIGGER_ORDER_TYPES.includes(orderType);
}

function needsTrail(orderType: OrderType): boolean {
  return orderType === 'trailing_stop';
}

function toFiniteNumber(raw: string): number | undefined {
  if (raw.trim() === '') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Client-side validation per honba's `OrderIntent::validate` table (see the component header
 * comment / docs/tasks.md Batch D): qty is always required; price/trigger_price/trail_* are
 * required or forbidden depending on `orderType`. Exported standalone so it can be unit tested
 * (and reused) without mounting the form.
 */
export function validateOrderFields(fields: RawOrderFields): OrderFormFieldErrors {
  const errors: OrderFormFieldErrors = {};

  const qty = toFiniteNumber(fields.qty);
  if (qty === undefined || qty <= 0) {
    errors.qty = 'Quantity must be a number greater than 0';
  }

  if (needsPrice(fields.orderType)) {
    const price = toFiniteNumber(fields.price);
    if (price === undefined || price <= 0) {
      errors.price = 'Price is required for this order type';
    }
  }

  if (needsTrigger(fields.orderType)) {
    const triggerPrice = toFiniteNumber(fields.triggerPrice);
    if (triggerPrice === undefined || triggerPrice <= 0) {
      errors.triggerPrice = 'Trigger price is required for this order type';
    }
  }

  if (needsTrail(fields.orderType)) {
    const trailAmount = toFiniteNumber(fields.trailAmount);
    const trailPercent = toFiniteNumber(fields.trailPercent);
    const hasAmount = trailAmount !== undefined && trailAmount > 0;
    const hasPercent = trailPercent !== undefined && trailPercent > 0;

    if (hasAmount && hasPercent) {
      errors.trail = 'Provide either a trail amount or a trail percent, not both';
    } else if (!hasAmount && !hasPercent) {
      errors.trail = 'Trail amount or trail percent is required';
    }
  }

  return errors;
}

function buildDraft(opts: {
  instrumentId: InstrumentId;
  side: OrderSide;
  orderType: OrderType;
  tif: TimeInForce;
  clientOrderId?: string;
  qty: string;
  price: string;
  triggerPrice: string;
  trailAmount: string;
  trailPercent: string;
}): OrderDraft {
  const draft: OrderDraft = {
    instrument_id: opts.instrumentId,
    side: opts.side,
    order_type: opts.orderType,
    qty: Number(opts.qty),
    tif: opts.tif,
  };

  if (needsPrice(opts.orderType)) {
    draft.price = Number(opts.price);
  }

  if (needsTrigger(opts.orderType)) {
    draft.trigger_price = Number(opts.triggerPrice);
  }

  if (needsTrail(opts.orderType)) {
    const trailAmount = toFiniteNumber(opts.trailAmount);
    if (trailAmount !== undefined && trailAmount > 0) {
      draft.trail_amount = trailAmount;
    } else {
      draft.trail_percent = Number(opts.trailPercent);
    }
  }

  if (opts.clientOrderId) {
    draft.client_order_id = opts.clientOrderId;
  }

  return draft;
}

const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  market: 'Market',
  limit: 'Limit',
  stop_market: 'Stop',
  stop_limit: 'Stop Limit',
  trailing_stop: 'Trailing Stop',
};

const TIF_LABELS: Record<TimeInForce, string> = {
  day: 'Day',
  gtc: 'GTC',
  ioc: 'IOC',
  fok: 'FOK',
};

const ALL_ORDER_TYPES: OrderType[] = ['market', 'limit', 'stop_market', 'stop_limit', 'trailing_stop'];
const ALL_TIFS: TimeInForce[] = ['day', 'gtc', 'ioc', 'fok'];

export interface OrderFormProps {
  /** The instrument this ticket trades; instrument selection itself is out of scope here. */
  instrumentId: InstrumentId;
  onSubmit: (draft: OrderDraft) => void;
  side?: OrderSide;
  orderType?: OrderType;
  availableOrderTypes?: OrderType[];
  tif?: TimeInForce;
  availableTifs?: TimeInForce[];
  clientOrderId?: string;
  isSubmitting?: boolean;
  submitError?: string | null;
  className?: string;
}

export function OrderForm({
  instrumentId,
  onSubmit,
  side: initialSide = 'buy',
  orderType: initialOrderType = 'market',
  availableOrderTypes = ALL_ORDER_TYPES,
  tif: initialTif = 'day',
  availableTifs = ALL_TIFS,
  clientOrderId,
  isSubmitting = false,
  submitError = null,
  className = '',
}: OrderFormProps) {
  const [side, setSide] = useState<OrderSide>(initialSide);
  const [orderType, setOrderType] = useState<OrderType>(initialOrderType);
  const [tif, setTif] = useState<TimeInForce>(initialTif);
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [triggerPrice, setTriggerPrice] = useState('');
  const [trailAmount, setTrailAmount] = useState('');
  const [trailPercent, setTrailPercent] = useState('');
  const [errors, setErrors] = useState<OrderFormFieldErrors>({});

  const orderTypeOptions: DropdownOption<OrderType>[] = availableOrderTypes.map((value) => ({
    value,
    label: ORDER_TYPE_LABELS[value],
  }));
  const tifOptions: DropdownOption<TimeInForce>[] = availableTifs.map((value) => ({
    value,
    label: TIF_LABELS[value],
  }));

  const showPrice = needsPrice(orderType);
  const showTrigger = needsTrigger(orderType);
  const showTrail = needsTrail(orderType);

  function handleOrderTypeChange(nextType: OrderType) {
    setOrderType(nextType);
    setErrors({});
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const fieldErrors = validateOrderFields({ orderType, qty, price, triggerPrice, trailAmount, trailPercent });
    setErrors(fieldErrors);

    if (Object.keys(fieldErrors).length > 0) {
      return;
    }

    onSubmit(
      buildDraft({
        instrumentId,
        side,
        orderType,
        tif,
        clientOrderId,
        qty,
        price,
        triggerPrice,
        trailAmount,
        trailPercent,
      }),
    );
  }

  return (
    <form className={clsx('hb-order-form', className)} onSubmit={handleSubmit}>
      <div className="hb-order-form__side">
        <RadioButton
          id="hb-order-form-side-buy"
          label="Buy"
          checked={side === 'buy'}
          onChange={() => setSide('buy')}
          uppercase
        />
        <RadioButton
          id="hb-order-form-side-sell"
          label="Sell"
          checked={side === 'sell'}
          onChange={() => setSide('sell')}
          uppercase
        />
      </div>

      <Dropdown
        label="Order Type"
        value={orderType}
        onChange={handleOrderTypeChange}
        options={orderTypeOptions}
      />

      <Input label="Qty" placeholder="Qty" value={qty} onChange={setQty} />
      {errors.qty && <p className="hb-order-form__error">{errors.qty}</p>}

      {showPrice && (
        <>
          <Input label="Price" placeholder="Price" value={price} onChange={setPrice} />
          {errors.price && <p className="hb-order-form__error">{errors.price}</p>}
        </>
      )}

      {showTrigger && (
        <>
          <Input
            label="Trigger Price"
            placeholder="Trigger Price"
            value={triggerPrice}
            onChange={setTriggerPrice}
          />
          {errors.triggerPrice && <p className="hb-order-form__error">{errors.triggerPrice}</p>}
        </>
      )}

      {showTrail && (
        <>
          <Input
            label="Trail Amount"
            placeholder="Trail Amount"
            value={trailAmount}
            onChange={setTrailAmount}
          />
          <Input
            label="Trail Percent"
            placeholder="Trail Percent"
            value={trailPercent}
            onChange={setTrailPercent}
          />
          {errors.trail && <p className="hb-order-form__error">{errors.trail}</p>}
        </>
      )}

      <Dropdown label="Time in Force" value={tif} onChange={setTif} options={tifOptions} />

      <Button
        label={side === 'buy' ? 'Buy' : 'Sell'}
        isSubmit
        variant={side === 'buy' ? 'green' : 'red'}
        disabled={isSubmitting}
        className="hb-order-form__submit"
      />

      {submitError && <p className="hb-order-form__submit-error">{submitError}</p>}
    </form>
  );
}

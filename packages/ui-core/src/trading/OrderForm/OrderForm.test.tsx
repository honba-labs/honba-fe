import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { OrderForm, validateOrderFields } from './OrderForm';

const instrumentId = { exchange: 'NSE', symbol: 'RELIANCE' };

function fillQty(value: string) {
  fireEvent.change(screen.getByPlaceholderText('Qty'), { target: { value } });
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: /buy|sell/i }));
}

describe('OrderForm', () => {
  it('renders side, order type and qty controls', () => {
    render(<OrderForm instrumentId={instrumentId} onSubmit={() => {}} />);
    expect(screen.getByLabelText('Buy')).toBeInTheDocument();
    expect(screen.getByLabelText('Sell')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Qty')).toBeInTheDocument();
  });

  it('defaults to a market order with no price/trigger fields shown', () => {
    render(<OrderForm instrumentId={instrumentId} onSubmit={() => {}} />);
    expect(screen.queryByPlaceholderText('Price')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Trigger Price')).not.toBeInTheDocument();
  });

  it('submits a market order draft with the right shape', () => {
    const onSubmit = vi.fn();
    render(<OrderForm instrumentId={instrumentId} onSubmit={onSubmit} />);

    fillQty('10');
    submit();

    expect(onSubmit).toHaveBeenCalledWith({
      instrument_id: instrumentId,
      side: 'buy',
      order_type: 'market',
      qty: 10,
      tif: 'day',
    });
  });

  it('switches side to sell and reflects it in the submitted draft', () => {
    const onSubmit = vi.fn();
    render(<OrderForm instrumentId={instrumentId} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByLabelText('Sell'));
    fillQty('5');
    submit();

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ side: 'sell', qty: 5 }),
    );
  });

  it('blocks submit and shows an error when qty is missing', () => {
    const onSubmit = vi.fn();
    render(<OrderForm instrumentId={instrumentId} onSubmit={onSubmit} />);

    submit();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/quantity/i)).toBeInTheDocument();
  });

  it('blocks submit and shows an error when qty is zero or negative', () => {
    const onSubmit = vi.fn();
    render(<OrderForm instrumentId={instrumentId} onSubmit={onSubmit} />);

    fillQty('-3');
    submit();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/quantity/i)).toBeInTheDocument();
  });

  it('requires a price for a limit order and submits it once provided', () => {
    const onSubmit = vi.fn();
    render(
      <OrderForm instrumentId={instrumentId} onSubmit={onSubmit} orderType="limit" />,
    );

    fillQty('10');
    submit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/price is required/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Price'), { target: { value: '150.5' } });
    submit();

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ order_type: 'limit', price: 150.5, qty: 10 }),
    );
    expect(screen.queryByPlaceholderText('Trigger Price')).not.toBeInTheDocument();
  });

  it('does not require a price for a market order', () => {
    const onSubmit = vi.fn();
    render(
      <OrderForm instrumentId={instrumentId} onSubmit={onSubmit} orderType="market" />,
    );

    fillQty('10');
    submit();

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ order_type: 'market', qty: 10 }),
    );
  });

  it('requires only a trigger price for a stop_market order', () => {
    const onSubmit = vi.fn();
    render(
      <OrderForm instrumentId={instrumentId} onSubmit={onSubmit} orderType="stop_market" />,
    );

    expect(screen.queryByPlaceholderText('Price')).not.toBeInTheDocument();

    fillQty('10');
    submit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/trigger price is required/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Trigger Price'), { target: { value: '140' } });
    submit();

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ order_type: 'stop_market', trigger_price: 140, qty: 10 }),
    );
  });

  it('requires both price and trigger price for a stop_limit order', () => {
    const onSubmit = vi.fn();
    render(
      <OrderForm instrumentId={instrumentId} onSubmit={onSubmit} orderType="stop_limit" />,
    );

    fillQty('10');
    submit();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText('Price'), { target: { value: '149' } });
    fireEvent.change(screen.getByPlaceholderText('Trigger Price'), { target: { value: '150' } });
    submit();

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        order_type: 'stop_limit',
        price: 149,
        trigger_price: 150,
        qty: 10,
      }),
    );
  });

  it('requires exactly one of trail amount / trail percent for a trailing_stop order', () => {
    const onSubmit = vi.fn();
    render(
      <OrderForm instrumentId={instrumentId} onSubmit={onSubmit} orderType="trailing_stop" />,
    );

    fillQty('10');
    submit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/trail amount or trail percent is required/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Trail Amount'), { target: { value: '2.5' } });
    fireEvent.change(screen.getByPlaceholderText('Trail Percent'), { target: { value: '1' } });
    submit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/not both/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Trail Percent'), { target: { value: '' } });
    submit();

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ order_type: 'trailing_stop', trail_amount: 2.5, qty: 10 }),
    );
  });

  it('submits trail_percent when only percent is provided', () => {
    const onSubmit = vi.fn();
    render(
      <OrderForm instrumentId={instrumentId} onSubmit={onSubmit} orderType="trailing_stop" />,
    );

    fillQty('10');
    fireEvent.change(screen.getByPlaceholderText('Trail Percent'), { target: { value: '2' } });
    submit();

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ order_type: 'trailing_stop', trail_percent: 2, qty: 10 }),
    );
  });

  it('lets a consumer pick the time in force', () => {
    const onSubmit = vi.fn();
    render(<OrderForm instrumentId={instrumentId} onSubmit={onSubmit} tif="ioc" />);

    fillQty('1');
    submit();

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ tif: 'ioc' }));
  });

  it('disables the submit button while isSubmitting', () => {
    render(<OrderForm instrumentId={instrumentId} onSubmit={() => {}} isSubmitting />);
    expect(screen.getByRole('button', { name: /buy/i })).toBeDisabled();
  });

  it('shows a submitError when provided', () => {
    render(
      <OrderForm instrumentId={instrumentId} onSubmit={() => {}} submitError="Order rejected" />,
    );
    expect(screen.getByText('Order rejected')).toBeInTheDocument();
  });
});

describe('validateOrderFields', () => {
  it('requires a positive finite qty regardless of order type', () => {
    expect(
      validateOrderFields({
        orderType: 'market',
        qty: '0',
        price: '',
        triggerPrice: '',
        trailAmount: '',
        trailPercent: '',
      }).qty,
    ).toBeDefined();
  });

  it('has no price/trigger/trail requirements for market orders', () => {
    const errors = validateOrderFields({
      orderType: 'market',
      qty: '1',
      price: '',
      triggerPrice: '',
      trailAmount: '',
      trailPercent: '',
    });
    expect(errors).toEqual({});
  });
});

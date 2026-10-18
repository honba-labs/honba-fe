// Batch G (docs/tasks.md): ported from bfx-hf-ui-core's `AlgoOrderDetailsModal`
// (src/modals/AlgoOrderDetailsModal/{...,Header,utils}*, Apache-2.0) → renamed
// `OrderDetailsModal`: shows one order's full detail (header facts + its execution history)
// and offers an export of the fills. The reference derived rows from redux
// (algo-orders + atomic orders + history), rendered through ufx-ui's `OrderHistory` table
// and saved via its own `saveAsJSON` util. honba's port: the caller passes the `Order` and
// its `Trade[]` fills (Batch D types, straight from `GET /orders/{id}` + `GET
// /portfolio/trades?orderId=…` shapes the feature layer composes); the export button appears
// only when the host provides `onExport` (saveAsJSON stays app-owned so filenames/toasts
// match Batch H conventions).
//
// Presentational: no fetching, no global reads.
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { Scrollbars } from '../../ui/Scrollbars';
import type { Order, OrderStatus } from '../../trading/OrdersTable';
import type { Trade } from '../../trading/TradesTablePanel';
import { formatMoney } from '../../trading/PositionsTable';
import './OrderDetailsModal.css';

export interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  /** Executions against this order (`Trade.order_id === order.order_id`). */
  fills: Trade[];
  /** Called with the fills to export; when omitted no export button is rendered. */
  onExport?: (fills: Trade[]) => void;
  className?: string;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  initialized: 'Initialized',
  submitted: 'Submitted',
  accepted: 'Accepted',
  partially_filled: 'Partially Filled',
  filled: 'Filled',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
  expired: 'Expired',
};

function detailFacts(order: Order): Array<{ label: string; value: string }> {
  const instrument = `${order.instrument_id.exchange}:${order.instrument_id.symbol}`;
  const filledQty = order.filled_qty ?? 0;
  const fillRatio = order.quantity > 0 ? Math.round((filledQty / order.quantity) * 100) : 0;
  const formatPrice = (value: number | null | undefined) =>
    value != null ? value.toLocaleString('en-US', { maximumFractionDigits: 6 }) : '—';
  const priceLabel =
    order.order_type === 'trailing_stop'
      ? 'Trail / trigger'
      : order.order_type === 'limit' || order.order_type === 'stop_limit'
        ? 'Price'
        : 'Trigger';
  return [
    { label: '#', value: order.order_id },
    { label: 'Instrument', value: instrument },
    { label: 'Side', value: order.side.toUpperCase() },
    { label: 'Type', value: order.order_type },
    { label: 'Status', value: STATUS_LABELS[order.status] },
    { label: 'Quantity', value: `${filledQty}/${order.quantity} filled (${fillRatio}%)` },
    { label: priceLabel, value: formatPrice(order.price ?? order.trigger_price) },
    { label: 'Avg fill', value: formatPrice(order.avg_fill_price) },
    { label: 'TIF', value: order.time_in_force?.toUpperCase() ?? 'DAY' },
  ];
}

export function OrderDetailsModal({
  isOpen,
  onClose,
  order,
  fills,
  onExport,
  className,
}: OrderDetailsModalProps) {
  const facts = detailFacts(order);
  return (
    <Modal
      label={`Order ${order.order_id}`}
      isOpen={isOpen}
      onClose={onClose}
      scrollable
      width={760}
      className={`hb-order-details-modal ${className ?? ''}`}
    >
      <div className="hb-order-details-modal__facts">
        {facts.map((fact) => (
          <div key={fact.label} className="hb-order-details-modal__fact">
            <span>{fact.label}</span>
            <strong>{fact.value}</strong>
          </div>
        ))}
      </div>

      <p className="hb-order-details-modal__fills-label">Fills ({fills.length})</p>
      <div className="hb-order-details-modal__fills">
        {fills.length === 0 ? (
          <p className="hb-order-details-modal__empty">No fills yet</p>
        ) : (
          <Scrollbars>
            <table className="hb-order-details-modal__fills-table">
              <thead>
                <tr>
                  <th>Side</th><th>Quantity</th><th>Price</th><th>Costs</th><th>Time</th>
                </tr>
              </thead>
              <tbody>
                {fills.map((fill) => (
                  <tr key={`${fill.order_id}-${fill.ts_event.iso}`}>
                    <td>{fill.side.toUpperCase()}</td>
                    <td>{fill.quantity}</td>
                    <td>{fill.price.toLocaleString('en-US', { maximumFractionDigits: 6 })}</td>
                    <td>{formatMoney(fill.costs)}</td>
                    <td>{fill.ts_event.iso?.replace('T', ' ').slice(0, 19) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Scrollbars>
        )}
      </div>

      <div className="hb-modal-footer">
        {onExport ? (
          <Button
            label="Export fills (JSON)"
            onClick={() => onExport(fills)}
            variant="default"
          />
        ) : null}
        <Button label="Close" onClick={onClose} />
      </div>
    </Modal>
  );
}

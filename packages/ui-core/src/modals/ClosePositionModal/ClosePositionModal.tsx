// Batch G (docs/tasks.md): ported/modernized from bfx-hf-ui-core's
// `ClosePositionModal` (src/modals/ClosePositionModal/*, Apache-2.0) — the confirm-close
// warning dialog for a portfolio position. Dropped: Redux/`authToken` plumbing (honba maps
// `onConfirm` onto `POST /portfolio/close` in the feature layer), the `getMarketPair` prop
// (Batch D's `InstrumentId` is already display-shaped) and the reference's close-animation
// `setTimeout` pair-flicker hack (state resets naturally when `position` is nulled by the
// host while the modal is closed).
//
// Presentational: `isOpen`/`onClose`/domain props in, confirm intent out — nothing global.
import { TriangleAlert } from 'lucide-react';

import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import './ClosePositionModal.css';

export interface ClosePositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The position the user asked to close; rendered as a one-line summary. */
  position: {
    instrument_id: { exchange: string; symbol: string };
    side: 'long' | 'short' | 'no_position_side' | string;
    quantity: number;
    avg_price: number;
  } | null;
  /** Called with no arguments when the user confirms — the feature layer owns the API call
   * (and clears local state / shows toasts from its result). */
  onConfirm: () => void;
  className?: string;
}

export function ClosePositionModal({
  isOpen,
  onClose,
  position,
  onConfirm,
  className,
}: ClosePositionModalProps) {
  if (!position) return null;

  const pair = `${position.instrument_id.exchange}:${position.instrument_id.symbol}`;

  return (
    <Modal
      label="Close position"
      isOpen={isOpen}
      onClose={onClose}
      className={`hb-close-position-modal ${className ?? ''}`}
      width={480}
    >
      <div className="hb-close-position-modal__body">
        <TriangleAlert size={28} className="hb-close-position-modal__icon" aria-hidden="true" />
        <p>
          Are you sure you want to close your <strong>{position.quantity}</strong>&nbsp;
          {position.side} position in <strong>{pair}</strong> (avg&nbsp;
          {position.avg_price.toLocaleString('en-US', { maximumFractionDigits: 6 })})? This
          submits a market-close order across exchanges.
        </p>
      </div>
      <div className="hb-modal-footer">
        <Button label="Cancel" onClick={onClose} />
        <Button label="OK" variant="blue" onClick={onConfirm} />
      </div>
    </Modal>
  );
}

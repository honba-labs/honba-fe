import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { ClosePositionModal } from './ClosePositionModal';

const position = {
  instrument_id: { exchange: 'NSE', symbol: 'RELIANCE' },
  side: 'long',
  quantity: 350,
  avg_price: 2961.2,
};

describe('ClosePositionModal', () => {
  it('renders nothing without a position (host keeps state while closing)', () => {
    const { container } = render(
      <ClosePositionModal isOpen onClose={() => {}} position={null} onConfirm={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('summarizes the position (pair, side, quantity, avg price) with a warning', () => {
    render(<ClosePositionModal isOpen onClose={() => {}} position={position} onConfirm={() => {}} />);
    expect(screen.getByRole('dialog', { name: 'Close position' })).toBeInTheDocument();
    expect(screen.getByText(/NSE:RELIANCE/)).toBeInTheDocument();
    expect(screen.getByText(/350/)).toBeInTheDocument();
    expect(screen.getByText(/2,961.2/)).toBeInTheDocument();
    // The reference's react-fa warning icon survives as a themed svg.
    expect(document.querySelector('.hb-close-position-modal__icon')).not.toBeNull();
  });

  it('confirm routes to onConfirm; cancel/backdrop routes to onClose', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ClosePositionModal isOpen onClose={onClose} position={position} onConfirm={onConfirm} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled(); // the reference also let the caller close the modal

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

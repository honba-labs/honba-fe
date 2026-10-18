import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { Modal } from './Modal';

describe('Modal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={() => {}} label="Close position">
        <p>Body</p>
      </Modal>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the label and children when open', () => {
    render(
      <Modal isOpen onClose={() => {}} label="Close position">
        <p>Are you sure?</p>
      </Modal>,
    );
    expect(screen.getByText('Close position')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} label="Close position">
        <p>Body</p>
      </Modal>,
    );
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the overlay is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal isOpen onClose={onClose} label="Close position">
        <p>Body</p>
      </Modal>,
    );
    fireEvent.mouseDown(container.querySelector('.hb-modal__overlay') as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('wires the title as the dialog accessible name (Batch G — G modals query it)', () => {
    render(
      <Modal isOpen onClose={() => {}} label="Close position">
        <p>Body</p>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Close position' });
    expect(dialog.className).toContain('hb-modal');
  });

  it('applies the width prop as an inline width, clamped by CSS max-width', () => {
    const { container } = render(
      <Modal isOpen onClose={() => {}} label="Settings" width={640}>
        <p>Body</p>
      </Modal>,
    );
    const dialog = container.querySelector('.hb-modal') as HTMLElement;
    expect(dialog.style.width).toBe('min(640px, 90vw)');
  });
});

import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { InstrumentInfoModal } from './InstrumentInfoModal';

const article = {
  title: 'RELIANCE — RELIANCE Industries Ltd.',
  body: '<p>Reliance Industries is an Indian conglomerate.</p><a href="https://example.com/ril">Company page</a>',
};

describe('InstrumentInfoModal', () => {
  it('renders the article title as the dialog name and the body HTML', () => {
    render(<InstrumentInfoModal isOpen onClose={() => {}} article={article} />);
    expect(screen.getByRole('dialog', { name: 'RELIANCE — RELIANCE Industries Ltd.' })).toBeInTheDocument();
    expect(screen.getByText(/Reliance Industries is an Indian conglomerate./)).toBeInTheDocument();
  });

  it('hardens injected anchors with target/rel (reference behavior)', () => {
    const { container } = render(
      <InstrumentInfoModal isOpen onClose={() => {}} article={article} />,
    );
    const link = container.querySelector('.hb-instrument-info-modal__article a')!;
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('falls back to the loading state while the article body is missing', () => {
    render(<InstrumentInfoModal isOpen onClose={() => {}} article={{ body: null }} />);
    expect(screen.getByRole('dialog', { name: 'Instrument info' })).toBeInTheDocument();
    expect(screen.getByText('Loading article…')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

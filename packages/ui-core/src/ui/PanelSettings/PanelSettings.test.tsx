import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { PanelSettings } from './PanelSettings';

describe('PanelSettings', () => {
  it('renders a default header, the content and a close button', () => {
    render(<PanelSettings content={<p>Theme options</p>} />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Theme options')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('renders a custom title when provided', () => {
    render(<PanelSettings title="Chart settings" content={<p>x</p>} />);
    expect(screen.getByText('Chart settings')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<PanelSettings content={<p>x</p>} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

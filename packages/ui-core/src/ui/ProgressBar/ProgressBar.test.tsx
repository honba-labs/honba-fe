import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('sets the progressbar aria value from percent', () => {
    render(<ProgressBar percent={42} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42');
  });

  it('renders the percent label when showPercent is set', () => {
    render(<ProgressBar percent={75} showPercent />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('clamps out-of-range percent values', () => {
    render(<ProgressBar percent={150} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });
});

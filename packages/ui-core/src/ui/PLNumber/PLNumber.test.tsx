import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PLNumber } from './PLNumber';

describe('PLNumber', () => {
  it('renders a positive value in green with the currency suffix', () => {
    render(<PLNumber value={120.5} ccy="USD" />);
    const node = screen.getByText('120.5 USD');
    expect(node.closest('.hb-pl-number')).toHaveClass('positive');
  });

  it('renders a negative value in red', () => {
    render(<PLNumber value={-42} ccy="USD" />);
    const node = screen.getByText('-42 USD');
    expect(node.closest('.hb-pl-number')).toHaveClass('negative');
  });

  it('uses prepareFunc to format the displayed value', () => {
    render(<PLNumber value={1200} prepareFunc={(v) => `$${(v / 100).toFixed(2)}`} />);
    expect(screen.getByText('$12.00')).toBeInTheDocument();
  });
});

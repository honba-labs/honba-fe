import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { MarketSelect } from './MarketSelect';
import type { MarketOption } from './MarketSelect';

const markets: MarketOption[] = [
  { symbol: 'RELIANCE', exchange: 'NSE' },
  { symbol: 'TCS', exchange: 'NSE', label: 'Tata Consultancy (TCS)' },
];

describe('MarketSelect', () => {
  it('shows the placeholder when nothing is selected', () => {
    render(<MarketSelect markets={markets} onChange={() => {}} />);
    expect(screen.getByText('Select a market')).toBeInTheDocument();
  });

  it('derives an exchange:symbol label when none is supplied', () => {
    render(<MarketSelect markets={markets} onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('NSE:RELIANCE')).toBeInTheDocument();
  });

  it('uses a supplied label instead of deriving one', () => {
    render(<MarketSelect markets={markets} onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Tata Consultancy (TCS)')).toBeInTheDocument();
  });

  it('calls onChange with the symbol of the picked market', () => {
    const onChange = vi.fn();
    render(<MarketSelect markets={markets} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('NSE:RELIANCE'));
    expect(onChange).toHaveBeenCalledWith('RELIANCE');
  });
});

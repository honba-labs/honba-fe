import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { TimeFrameDropdown } from './TimeFrameDropdown';

describe('TimeFrameDropdown', () => {
  it('shows the current timeframe in upper case', () => {
    render(<TimeFrameDropdown value="1d" onChange={() => {}} />);
    expect(screen.getByText('1D')).toBeInTheDocument();
  });

  it('lists the default timeframes once opened', () => {
    render(<TimeFrameDropdown value="1d" onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('1M')).toBeInTheDocument();
    expect(screen.getByText('1H')).toBeInTheDocument();
    expect(screen.getByText('1W')).toBeInTheDocument();
  });

  it('calls onChange with the raw (lower-case) timeframe code', () => {
    const onChange = vi.fn();
    render(<TimeFrameDropdown value="1d" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('1H'));
    expect(onChange).toHaveBeenCalledWith('1h');
  });

  it('accepts a custom timeframe list', () => {
    render(<TimeFrameDropdown value="3m" onChange={() => {}} timeframes={['3m', '9m']} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('9M')).toBeInTheDocument();
  });
});

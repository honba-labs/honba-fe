import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { Dropdown } from './Dropdown';

const options = [
  { label: 'NSE', value: 'nse' },
  { label: 'BSE', value: 'bse' },
];

describe('Dropdown', () => {
  it('shows the placeholder when nothing is selected', () => {
    render(<Dropdown options={options} onChange={() => {}} />);
    expect(screen.getByText('Select...')).toBeInTheDocument();
  });

  it('shows its options once opened', () => {
    render(<Dropdown options={options} onChange={() => {}} />);
    expect(screen.queryByText('BSE')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('NSE')).toBeInTheDocument();
    expect(screen.getByText('BSE')).toBeInTheDocument();
  });

  it('calls onChange and closes when an option is picked', () => {
    const onChange = vi.fn();
    render(<Dropdown options={options} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('BSE'));

    expect(onChange).toHaveBeenCalledWith('bse');
    expect(screen.queryByText('NSE')).not.toBeInTheDocument();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { Input } from './Input';

describe('Input', () => {
  it('renders a label and value', () => {
    render(<Input label="Quantity" value="10" onChange={() => {}} />);
    expect(screen.getByText('Quantity')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('10');
  });

  it('calls onChange with the new value', () => {
    const onChange = vi.fn();
    render(<Input value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'abc' } });
    expect(onChange).toHaveBeenCalledWith('abc');
  });

  it('clamps percentage input to the 0-max range with at most 2 decimals', () => {
    const onChange = vi.fn();
    render(<Input percentage max={100} value="0" onChange={onChange} />);
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: '50' } });
    expect(onChange).toHaveBeenCalledWith('50');

    onChange.mockClear();
    fireEvent.change(input, { target: { value: '150' } });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: '1.234' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('toggles password visibility', () => {
    render(<Input type="password" value="secret" onChange={() => {}} />);
    const input = document.querySelector('input') as HTMLInputElement;
    expect(input).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button'));
    expect(input).toHaveAttribute('type', 'text');
  });
});

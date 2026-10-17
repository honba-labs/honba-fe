import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { DatePicker } from './DatePicker';

describe('DatePicker', () => {
  it('renders the label', () => {
    render(<DatePicker label="Start date" onChange={() => {}} />);
    expect(screen.getByText('Start date')).toBeInTheDocument();
  });

  it('calls onChange with a Date when a value is entered', () => {
    const onChange = vi.fn();
    render(<DatePicker label="Start date" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Start date'), {
      target: { value: '2026-01-15T09:30' },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    const result = onChange.mock.calls[0][0] as Date;
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(15);
  });

  it('calls onChange with null when cleared', () => {
    const onChange = vi.fn();
    render(<DatePicker label="Start date" value={new Date('2026-01-15T09:30')} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('shows a validation error message', () => {
    render(<DatePicker label="Start date" onChange={() => {}} validationError="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });
});

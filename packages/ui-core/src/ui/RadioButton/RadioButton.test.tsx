import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { RadioButton } from './RadioButton';

describe('RadioButton', () => {
  it('renders the label and reflects the checked state', () => {
    render(<RadioButton id="buy" label="Buy" checked />);
    expect(screen.getByLabelText('Buy')).toBeChecked();
  });

  it('calls onChange when clicked', () => {
    const onChange = vi.fn();
    render(<RadioButton id="sell" label="Sell" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Sell'));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled is set', () => {
    render(<RadioButton id="buy" label="Buy" disabled />);
    expect(screen.getByLabelText('Buy')).toBeDisabled();
  });
});

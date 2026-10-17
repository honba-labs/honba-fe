import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { Button } from './Button';

describe('Button', () => {
  it('renders its label', () => {
    render(<Button label="Place order" />);
    expect(screen.getByRole('button', { name: 'Place order' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button label="Submit" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn();
    render(<Button label="Submit" onClick={onClick} disabled />);
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders as type submit when isSubmit is set', () => {
    render(<Button label="Save" isSubmit />);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'submit');
  });
});

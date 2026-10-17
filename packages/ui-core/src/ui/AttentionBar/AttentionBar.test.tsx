import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { AttentionBar } from './AttentionBar';

describe('AttentionBar', () => {
  it('renders its children', () => {
    render(<AttentionBar>Order rejected</AttentionBar>);
    expect(screen.getByText('Order rejected')).toBeInTheDocument();
  });

  it('defaults to the red tone', () => {
    render(<AttentionBar>Error</AttentionBar>);
    expect(screen.getByText('Error')).toHaveClass('red');
  });

  it('applies the requested tone', () => {
    render(<AttentionBar tone="yellow">Warning</AttentionBar>);
    expect(screen.getByText('Warning')).toHaveClass('yellow');
  });
});

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Indicator } from './Indicator';

describe('Indicator', () => {
  it('defaults to grey', () => {
    render(<Indicator />);
    expect(screen.getByRole('status')).toHaveClass('grey');
  });

  it('renders the requested color', () => {
    render(<Indicator color="green" />);
    expect(screen.getByRole('status')).toHaveClass('green');
  });

  it('applies the blinking class when blinking', () => {
    render(<Indicator color="red" blinking />);
    expect(screen.getByRole('status')).toHaveClass('blinking');
  });
});

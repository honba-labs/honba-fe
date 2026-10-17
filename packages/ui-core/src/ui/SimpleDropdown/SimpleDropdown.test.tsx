import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { SimpleDropdown } from './SimpleDropdown';

describe('SimpleDropdown', () => {
  it('renders the label and the hover-revealed options', () => {
    render(
      <SimpleDropdown
        label="Account"
        options={[<span key="a">Deposit</span>, <span key="b">Withdraw</span>]}
      />,
    );

    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByText('Deposit')).toBeInTheDocument();
    expect(screen.getByText('Withdraw')).toBeInTheDocument();
  });

  it('applies an extra className', () => {
    const { container } = render(<SimpleDropdown label="Account" options={[]} className="wide" />);
    expect(container.querySelector('.hb-simpledropdown.wide')).not.toBeNull();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { Tabs } from './Tabs';

const tabs = [
  { label: 'Orders', value: 'orders' },
  { label: 'Positions', value: 'positions' },
];

describe('Tabs', () => {
  it('renders every tab', () => {
    render(<Tabs tabs={tabs} activeTab="orders" onTabClick={() => {}} />);
    expect(screen.getByText('Orders')).toBeInTheDocument();
    expect(screen.getByText('Positions')).toBeInTheDocument();
  });

  it('marks the active tab as selected', () => {
    render(<Tabs tabs={tabs} activeTab="positions" onTabClick={() => {}} />);
    expect(screen.getByRole('tab', { name: 'Positions' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Orders' })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onTabClick with the clicked value', () => {
    const onTabClick = vi.fn();
    render(<Tabs tabs={tabs} activeTab="orders" onTabClick={onTabClick} />);
    fireEvent.click(screen.getByText('Positions'));
    expect(onTabClick).toHaveBeenCalledWith('positions');
  });
});

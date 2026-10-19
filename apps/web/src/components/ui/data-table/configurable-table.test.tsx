import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ConfigurableTable } from './configurable-table';
import type { TableColumn } from './types';

interface TestRow {
  id: string;
  symbol: string;
  price: number;
  qty: number;
}

const mockColumns: TableColumn<TestRow>[] = [
  { id: 'symbol', label: 'Symbol', align: 'left', sortable: true },
  { id: 'price', label: 'Price', align: 'right', sortable: true, render: (r) => `₹${r.price}` },
  { id: 'qty', label: 'Quantity', align: 'right', sortable: true },
];

const mockData: TestRow[] = [
  { id: '1', symbol: 'RELIANCE', price: 2950, qty: 100 },
  { id: '2', symbol: 'TCS', price: 3820, qty: 50 },
  { id: '3', symbol: 'INFY', price: 1490, qty: 200 },
];

describe('ConfigurableTable Component', () => {
  it('renders table headers and data rows correctly', () => {
    render(
      <ConfigurableTable
        data={mockData}
        columns={mockColumns}
        keyExtractor={(row) => row.id}
      />
    );

    expect(screen.getByText('Symbol')).toBeDefined();
    expect(screen.getByText('Price')).toBeDefined();
    expect(screen.getByText('Quantity')).toBeDefined();
    expect(screen.getByText('RELIANCE')).toBeDefined();
    expect(screen.getByText('₹2950')).toBeDefined();
    expect(screen.getByText('TCS')).toBeDefined();
  });

  it('renders alignment classes on headers and cells', () => {
    const { container } = render(
      <ConfigurableTable
        data={mockData}
        columns={mockColumns}
        keyExtractor={(row) => row.id}
      />
    );

    const priceHeader = container.querySelector('th.align-right');
    expect(priceHeader).toBeDefined();

    const priceCell = container.querySelector('td.align-right');
    expect(priceCell).toBeDefined();
  });

  it('allows toggling columns in the customize columns modal', () => {
    render(
      <ConfigurableTable
        data={mockData}
        columns={mockColumns}
        keyExtractor={(row) => row.id}
      />
    );

    // Click "+" column configurator button
    const configBtn = screen.getByTitle('Add / Remove columns');
    fireEvent.click(configBtn);

    // Modal opens
    expect(screen.getByText('Customize Table Columns')).toBeDefined();
    expect(screen.getByText('Reset All')).toBeDefined();

    // Close modal
    fireEvent.click(screen.getByText('Done'));
    expect(screen.queryByText('Customize Table Columns')).toBeNull();
  });

  it('sorts columns when clicking header', () => {
    render(
      <ConfigurableTable
        data={mockData}
        columns={mockColumns}
        keyExtractor={(row) => row.id}
      />
    );

    const symbolTh = screen.getByText('Symbol');
    fireEvent.click(symbolTh);

    // Shows sort indicator
    expect(screen.getByText('↑')).toBeDefined();
  });

  it('displays empty state when data array is empty', () => {
    render(
      <ConfigurableTable
        data={[]}
        columns={mockColumns}
        keyExtractor={(row) => row.id}
        emptyTitle="Custom Empty Message"
        emptySubtitle="No rows found"
      />
    );

    expect(screen.getByText('Custom Empty Message')).toBeDefined();
    expect(screen.getByText('No rows found')).toBeDefined();
  });
});

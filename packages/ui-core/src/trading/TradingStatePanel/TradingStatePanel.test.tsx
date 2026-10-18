import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { TradingStatePanel } from './TradingStatePanel';

describe('TradingStatePanel', () => {
  it('renders a default label and the current state', () => {
    render(<TradingStatePanel currentState="active" onChange={() => {}} />);
    expect(screen.getByText('Trading State')).toBeInTheDocument();
    expect(screen.getByText('Current state')).toBeInTheDocument();
    // Two "Active" texts render (the badge and the current-state button) -- assert there are
    // exactly two rather than picking one with a query that would otherwise throw as ambiguous.
    expect(screen.getAllByText('Active')).toHaveLength(2);
  });

  it('accepts a custom label', () => {
    render(<TradingStatePanel currentState="active" onChange={() => {}} label="Engine State" />);
    expect(screen.getByText('Engine State')).toBeInTheDocument();
  });

  it.each([
    ['active', 'reducing'],
    ['active', 'halted'],
    ['reducing', 'active'],
    ['reducing', 'halted'],
    ['halted', 'active'],
    ['halted', 'reducing'],
  ] as const)('requests a transition from %s to %s', (current, next) => {
    const onChange = vi.fn();
    render(<TradingStatePanel currentState={current} onChange={onChange} />);

    const labels = { active: 'Active', reducing: 'Reducing', halted: 'Halted' };
    fireEvent.click(screen.getByRole('button', { name: labels[next] }));

    expect(onChange).toHaveBeenCalledWith(next, undefined);
  });

  it.each(['active', 'reducing', 'halted'] as const)(
    'allows requesting the current state again as a no-op (%s -> %s)',
    (state) => {
      const onChange = vi.fn();
      render(<TradingStatePanel currentState={state} onChange={onChange} />);

      const labels = { active: 'Active', reducing: 'Reducing', halted: 'Halted' };
      fireEvent.click(screen.getByRole('button', { name: labels[state] }));

      expect(onChange).toHaveBeenCalledWith(state, undefined);
    },
  );

  it('passes the reason field through to onChange when provided', () => {
    const onChange = vi.fn();
    render(<TradingStatePanel currentState="active" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText(/reason/i), { target: { value: 'market volatility' } });
    fireEvent.click(screen.getByRole('button', { name: 'Halted' }));

    expect(onChange).toHaveBeenCalledWith('halted', 'market volatility');
  });

  it('omits the reason when left blank or only whitespace', () => {
    const onChange = vi.fn();
    render(<TradingStatePanel currentState="active" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText(/reason/i), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reducing' }));

    expect(onChange).toHaveBeenCalledWith('reducing', undefined);
  });

  it('disables the state controls and reason field while a change is pending', () => {
    render(<TradingStatePanel currentState="active" onChange={() => {}} pending />);

    expect(screen.getByRole('button', { name: 'Active' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reducing' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Halted' })).toBeDisabled();
    expect(screen.getByLabelText(/reason/i)).toBeDisabled();
  });

  it('shows a pending indicator while a change is in flight', () => {
    render(<TradingStatePanel currentState="active" onChange={() => {}} pending />);
    expect(screen.getByText(/applying/i)).toBeInTheDocument();
  });

  it('does not show a pending indicator when not pending', () => {
    render(<TradingStatePanel currentState="active" onChange={() => {}} />);
    expect(screen.queryByText(/applying/i)).not.toBeInTheDocument();
  });

  it('calls onRemove when removeable and the remove icon is clicked', () => {
    const onRemove = vi.fn();
    render(<TradingStatePanel currentState="active" onChange={() => {}} removeable onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText('Remove panel'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});

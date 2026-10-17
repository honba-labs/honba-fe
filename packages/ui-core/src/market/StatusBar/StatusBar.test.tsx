import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { StatusBar } from './StatusBar';

describe('StatusBar', () => {
  it('shows a connected state', () => {
    render(<StatusBar connected />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveClass('green');
  });

  it('shows a disconnected state', () => {
    render(<StatusBar connected={false} />);
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveClass('red');
  });

  it('renders latency when supplied', () => {
    render(<StatusBar connected latencyMs={42.4} />);
    expect(screen.getByText('42 ms')).toBeInTheDocument();
  });

  it('omits latency when not supplied', () => {
    render(<StatusBar connected />);
    expect(screen.queryByText('Latency')).not.toBeInTheDocument();
  });

  it('renders the server clock when supplied', () => {
    render(<StatusBar connected serverTime={new Date('2026-10-17T12:30:00Z')} />);
    expect(screen.getByText(/\d{2}:\d{2}:\d{2}/)).toBeInTheDocument();
  });
});

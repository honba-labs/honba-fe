import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { CrashHandler } from './CrashHandler';

// React logs errors it rethrows after we assert on them; keep the output clean.
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
afterEach(() => {
  consoleErrorSpy.mockClear();
});

// Test-only bomb: throws on first render, renders nothing after `armed` flips.
function Bomb({ armed }: { armed: boolean }) {
  if (armed) throw new Error('kaboom: bounds invalid');
  return <button type="button">bomb disarmed</button>;
}

describe('CrashHandler (React error boundary)', () => {
  it('renders children untouched while nothing throws', () => {
    render(
      <CrashHandler>
        <p>working app</p>
      </CrashHandler>,
    );
    expect(screen.getByText('working app')).toBeInTheDocument();
  });

  it('shows the crash screen with the error and resets on retry', () => {
    const { rerender } = render(
      <CrashHandler>
        <Bomb armed />
      </CrashHandler>,
    );

    expect(screen.getByText(':(')).toBeInTheDocument();
    expect(document.querySelector('.hb-crash-screen__crashstack')?.textContent).toBe(
      'Error: kaboom: bounds invalid',
    );
    // React's component stack is captured from componentDidCatch and shown under the error.
    const componentStack = document.querySelector('.hb-crash-screen__componentstack');
    expect(componentStack?.textContent).toContain('at Bomb');

    // "Retry" clears the boundary state so a recoverable crash doesn't require a reload.
    rerender(
      <CrashHandler>
        <Bomb armed={false} />
      </CrashHandler>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(screen.getByText('bomb disarmed')).toBeInTheDocument();
    expect(screen.queryByText(':(')).not.toBeInTheDocument();
  });

  it('passes the error + info to onCrash and renders the report link', () => {
    const onCrash = vi.fn();
    render(
      <CrashHandler reportUrl="https://example.invalid/issues" onCrash={onCrash}>
        <Bomb armed />
      </CrashHandler>,
    );

    expect(onCrash).toHaveBeenCalledTimes(1);
    const [error, info] = onCrash.mock.calls[0];
    expect((error as Error).message).toBe('kaboom: bounds invalid');
    expect(info).toHaveProperty('componentStack');
    expect(screen.getByRole('link', { name: 'https://example.invalid/issues' })).toHaveAttribute(
      'href',
      'https://example.invalid/issues',
    );
  });
});

// Batch F shell acceptance: real top nav (app switcher + symbol-search slot + account/
// connection status), bottom status bar, and a working notification center driven by the
// app-owned Zustand store — all within a CrashHandler boundary. Renders via MemoryRouter
// because the switcher navigates.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AppShell } from './shell';
import { useNotifications } from '../core/store/notifications';

// jsdom has no crypto.randomUUID in every environment; the store falls back internally —
// no stub needed, but the store must start isolated for each test.
beforeEach(() => {
  useNotifications.setState({ rows: [], visible: false });
});

function renderShell() {
  return render(
    <MemoryRouter>
      <AppShell />
    </MemoryRouter>,
  );
}

describe('AppShell (Batch F)', () => {
  it('renders the app switcher with every app route', () => {
    renderShell();
    const switcher = document.querySelector('.app-shell__app-switcher')!;
    expect(switcher).not.toBeNull();
    // Hover-dropdown: options exist in the DOM, revealed by the user agent via :hover CSS.
    // (Nine routes since the nav restructure: Portfolio landing/workbench/screener/etc.)
    const items = switcher.querySelectorAll('.app-shell__app-switcher-item');
    expect(items.length).toBe(9);
    expect(Array.from(items).map((item) => item.textContent)).toContain('Workbench');
    expect(Array.from(items).map((item) => item.textContent)).toContain(
      'Components (ui-core dashboard)',
    );
  });

  it('renders the symbol-search slot and the connection status', () => {
    renderShell();
    // Input has no aria-label passthrough (Batch A port of the reference's contract), so the
    // slot is queried by its placeholder text.
    expect(screen.getByPlaceholderText('Search symbol (e.g. NSE:RELIANCE)…')).toBeInTheDocument();
    expect(screen.getByText('Not connected')).toBeInTheDocument();
    // Bottom status bar mirrors the same (still-unwired) connection state until Batch H.
    expect(screen.getAllByText('Disconnected').length).toBeGreaterThanOrEqual(1);
  });

  it('toggles the notification center via the bell', () => {
    renderShell();
    const bell = screen.getByRole('button', { name: 'Notifications' });
    expect(bell).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(bell);
    expect(bell).toHaveAttribute('aria-expanded', 'true');
    const sidebar = screen.getByRole('complementary', { name: 'Notifications' });
    expect(sidebar.className).toMatch(/visible/);
    expect(screen.getByText('No notifications')).toBeInTheDocument();
    fireEvent.click(bell);
    expect(sidebar.className).toMatch(/hidden/);
  });

  it('pushed notifications render in the sidebar; dismiss and clear-all work', () => {
    useNotifications.getState().push({
      severity: 'success',
      title: 'Order filled',
      message: 'BUY 50 RELIANCE @ 2,971.15',
    });
    renderShell();
    // Sidebar starts hidden but mounted (slide-out transition); rows render regardless.
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(screen.getByText('Order filled')).toBeInTheDocument();
    expect(useNotifications.getState().rows.length).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss Order filled' }));
    expect(useNotifications.getState().rows).toEqual([]); // store stays the source of truth
  });

  it('clear-all empties the store from the sidebar', () => {
    useNotifications.getState().push({ severity: 'info', message: 'hello' });
    useNotifications.getState().setVisible(true);
    renderShell();

    const clearAll = screen.getByRole('button', { name: 'Clear all' });
    expect(clearAll).toBeEnabled();
    fireEvent.click(clearAll);
    expect(useNotifications.getState().rows).toEqual([]);
    expect(screen.getByText('No notifications')).toBeInTheDocument();
  });
});

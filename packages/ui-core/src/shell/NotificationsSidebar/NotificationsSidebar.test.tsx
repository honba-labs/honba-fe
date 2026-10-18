import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import {
  NotificationList,
  NotificationToasts,
  NotificationsSidebar,
  formatNotificationTime,
} from './NotificationsSidebar';
import type { NotificationRow } from './NotificationsSidebar';

const base = Date.now();
const rows: NotificationRow[] = [
  {
    cid: 'n1',
    ts: base - 12_000,
    severity: 'info',
    title: 'Order filled',
    message: 'BUY 50 RELIANCE @ 2,971.15',
  },
  {
    cid: 'n2',
    ts: base - 3_600_000,
    severity: 'error',
    title: 'Connection lost',
    message: 'The /ws stream dropped (code 1006); reconnecting.',
  },
];

describe('NotificationList', () => {
  it('renders severity cards with title, relative time and message', () => {
    render(<NotificationList rows={rows} variant="sidebar" onClose={() => {}} />);
    expect(screen.getByText('Order filled')).toBeInTheDocument();
    expect(screen.getByText('BUY 50 RELIANCE @ 2,971.15')).toBeInTheDocument();
    expect(screen.getByText('just now')).toBeInTheDocument(); // 12s < 60s
    expect(screen.getByText('1h ago')).toBeInTheDocument();
    expect(screen.getByText('Connection lost').closest('li')?.className).toMatch(/--error/);
    expect(screen.getByText('Order filled').closest('li')?.className).toMatch(/--info/);
  });

  it('dismisses a single row by its cid', () => {
    const onClose = vi.fn();
    render(<NotificationList rows={rows} variant="sidebar" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss Connection lost' }));
    expect(onClose).toHaveBeenCalledWith('n2');
  });
});

describe('formatNotificationTime', () => {
  it('buckets into relative labels then an ISO date', () => {
    expect(formatNotificationTime(base - 30_000, base)).toBe('just now');
    expect(formatNotificationTime(base - 90_000, base)).toBe('1m ago');
    expect(formatNotificationTime(base - 7_200_000, base)).toBe('2h ago');
    expect(formatNotificationTime(base - 5 * 86_400_000, base)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('NotificationsSidebar', () => {
  it('renders rows behind a visible backdrop; backdrop click closes the panel', () => {
    const onClosePanel = vi.fn();
    const { container } = render(
      <NotificationsSidebar
        rows={rows}
        visible
        onClosePanel={onClosePanel}
        onCloseRow={() => {}}
        onClearAll={() => {}}
      />,
    );
    expect(screen.getByRole('complementary', { name: 'Notifications' }).className).toMatch(/visible/);
    const backdrop = container.querySelector('.hb-notifications-sidebar__background')!;
    expect(backdrop.className).not.toMatch(/hidden/);
    fireEvent.click(backdrop);
    expect(onClosePanel).toHaveBeenCalledTimes(1);
  });

  it('shows the empty message and disables clear-all when there are no rows', () => {
    const onClearAll = vi.fn();
    render(
      <NotificationsSidebar
        rows={[]}
        visible
        onClosePanel={() => {}}
        onCloseRow={() => {}}
        onClearAll={onClearAll}
      />,
    );
    expect(screen.getByText('No notifications')).toBeInTheDocument();
    expect(screen.queryByText('Order filled')).not.toBeInTheDocument();
    const clearAll = screen.getByRole('button', { name: 'Clear all' });
    expect(clearAll).toBeDisabled();
    fireEvent.click(clearAll);
    expect(onClearAll).not.toHaveBeenCalled();
  });

  it('clear-all and row-dismiss route to their callbacks', () => {
    const onClearAll = vi.fn();
    const onCloseRow = vi.fn();
    render(
      <NotificationsSidebar
        rows={[rows[0]]}
        visible
        onClosePanel={() => {}}
        onCloseRow={onCloseRow}
        onClearAll={onClearAll}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(onClearAll).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss Order filled' }));
    expect(onCloseRow).toHaveBeenCalledWith('n1');
  });
});

describe('NotificationToasts', () => {
  it('renders the toast cluster for given rows and dismisses them', () => {
    const onClose = vi.fn();
    render(<NotificationToasts rows={[rows[0]]} onClose={onClose} />);
    expect(screen.getByText('Order filled')).toBeInTheDocument();
    // Toasts come from the same list body, so dismissal works identically.
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss Order filled' }));
    expect(onClose).toHaveBeenCalledWith('n1');
  });

  it('renders nothing (not even its container) with no rows', () => {
    render(<NotificationToasts rows={[]} onClose={() => {}} />);
    expect(document.querySelector('.hb-notifications-toasts')).toBeNull();
  });
});

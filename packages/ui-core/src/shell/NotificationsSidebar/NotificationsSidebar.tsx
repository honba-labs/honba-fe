// Batch F (docs/tasks.md): presentational port of bfx-hf-ui-core's `NotificationsSidebar`
// (src/components/NotificationsSidebar/{NotificationsSidebar,SidebarContent}.js, Apache-2.0).
// The reference's list/queue rendering came from `@ufx-ui/core`'s `Notifications` component,
// which cannot be ported (banned dep, unported package), so the row rendering below is
// re-implemented from its visual contract: severity-colored cards (info/success/warning/error),
// title + message lines, per-item close button, dismiss/clear-all.
//
// Dropped from the reference: the whole Redux panel-visibility store (`notificationsVisible`
// dispatching), the 700ms delayed-hide `setTimeout` choreography (CSS transitions handle the
// slide without a second "is animating out" render), the `useInterval` "notifications newer
// than N seconds are toasts" split — hosts decide what goes in the toast cluster via props —
// and i18n. The store version of this state lives in apps/web/src/core/store (Batch F brief:
// app state, not a ui-core primitive).
//
// Three presentational pieces, all controlled:
//  - `NotificationList`: severity cards; the shared body used by both placements.
//  - `NotificationsSidebar`: the click-to-close backdrop + right slide-in Panel wrapper.
//  - `NotificationToasts`: the bottom-right pop cluster for freshly-arrived rows.
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';

import { Button } from '../../ui/Button';
import { Panel } from '../../ui/Panel';
import { Scrollbars } from '../../ui/Scrollbars';
import './NotificationsSidebar.css';

/** Severity levels carried from the reference's notification semantics, flattened (the
 * reference encoded these via ufx-ui's level + color plumbing). */
export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

export interface NotificationRow {
  /** The reference's `cid` (client id) — used for dismissal; created by the caller. */
  cid: string;
  /** Epoch ms the notification arrived (the reference's `mts`). Displayed as a relative
   * suffix by the list. */
  ts: number;
  severity: NotificationSeverity;
  title?: string;
  message: ReactNode;
}

export interface NotificationListProps {
  rows: NotificationRow[];
  variant: 'sidebar' | 'toast';
  /** Called with the closed row's `cid`. */
  onClose: (cid: string) => void;
  className?: string;
}

/** Formats an epoch ms timestamp next to the card title (the reference showed relative
 * timestamps inside the ufx-ui list). Caller-supplied `now` keeps it deterministic. */
export function formatNotificationTime(ts: number, now: number): string {
  const deltaMs = Math.max(0, now - ts);
  if (deltaMs < 60_000) return 'just now';
  if (deltaMs < 3_600_000) return `${Math.floor(deltaMs / 60_000)}m ago`;
  if (deltaMs < 86_400_000) return `${Math.floor(deltaMs / 3_600_000)}h ago`;
  return new Date(ts).toISOString().slice(0, 10);
}

export function NotificationList({ rows, variant, onClose, className }: NotificationListProps) {
  const now = useMemo(() => Date.now(), []);
  return (
    <ul className={clsx('hb-notifications__list', `hb-notifications__list--${variant}`, className)}>
      {rows.map((row) => (
        <li key={row.cid} className={`hb-notifications__item hb-notifications__item--${row.severity}`}>
          <div className="hb-notifications__head">
            {row.title ? <p className="hb-notifications__title">{row.title}</p> : null}
            <span className="hb-notifications__time">{formatNotificationTime(row.ts, now)}</span>
            <button
              type="button"
              aria-label={`Dismiss ${row.title ?? 'notification'}`}
              className="hb-notifications__close"
              onClick={() => onClose(row.cid)}
            >
              <X size={14} />
            </button>
          </div>
          <div className="hb-notifications__message">{row.message}</div>
        </li>
      ))}
    </ul>
  );
}

export interface NotificationsSidebarProps {
  rows: NotificationRow[];
  visible: boolean;
  onClosePanel: () => void;
  /** Called with a single dismissed row's `cid` (the reference grouped group-cids in; honba
   * notifications are flat). */
  onCloseRow: (cid: string) => void;
  onClearAll: () => void;
  /** Slide-in panel width in px; defaults to the reference's 30%-of-min-800px ≈ 380px. */
  width?: number;
  className?: string;
}

const EMPTY_ROWS: NotificationRow[] = [];

export function NotificationsSidebar({
  rows = EMPTY_ROWS,
  visible,
  onClosePanel,
  onCloseRow,
  onClearAll,
  width = 380,
  className,
}: NotificationsSidebarProps) {
  return (
    <>
      <div
        className={clsx('hb-notifications-sidebar__background', { visible, hidden: !visible })}
        onClick={onClosePanel}
        aria-hidden="true"
      />
      <div
        className={clsx('hb-notifications-sidebar__wrapper', { visible, hidden: !visible }, className)}
        style={{ width }}
        role="complementary"
        aria-label="Notifications"
      >
        <Panel
          label="Notifications"
          closePanel={onClosePanel}
          headerComponents={
            <Button
              label="Clear all"
              variant="default"
              disabled={rows.length === 0}
              onClick={onClearAll}
              className="hb-notifications-sidebar__clear"
            />
          }
        >
          {rows.length === 0 ? (
            <p className="hb-notifications-sidebar__empty">No notifications</p>
          ) : (
            <Scrollbars>
              <NotificationList rows={rows} variant="sidebar" onClose={onCloseRow} />
            </Scrollbars>
          )}
        </Panel>
      </div>
    </>
  );
}

export interface NotificationToastsProps {
  /** Usually a recent-time-windowed slice of the app's rows (the reference cut toasts off at
   * 5s; the window belongs to the host since it needs a clock). */
  rows: NotificationRow[];
  onClose: (cid: string) => void;
  className?: string;
}

export function NotificationToasts({ rows, onClose, className }: NotificationToastsProps) {
  if (rows.length === 0) return null;
  return (
    <div className={clsx('hb-notifications-toasts', className)} aria-live="polite">
      <div className="hb-notifications-toasts__stack">
        <NotificationList rows={rows} variant="toast" onClose={onClose} />
      </div>
    </div>
  );
}

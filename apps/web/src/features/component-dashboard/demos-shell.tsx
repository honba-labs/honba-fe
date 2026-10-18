// Live demos for `ui-core/src/shell/*` (Batch F, docs/tasks.md — Layout frame, CrashHandler,
// NotificationsSidebar/NotificationToasts, LayoutControlToolbar). Everything is driven by
// tile-local state; the real composed shell lives in apps/web/src/app-shell (top nav, bottom
// status bar, the app-owned notifications store — see its shell.test.tsx). Demo tiles render
// raw content — the dashboard's DemoTile frames them.
import { useState } from 'react';
import type { NotificationRow } from '@honba/ui-core';
import {
  CrashHandler,
  Layout,
  LayoutControlToolbar,
  LayoutFooter,
  LayoutHeader,
  LayoutMain,
  NotificationList,
  NotificationToasts,
  NotificationsSidebar,
} from '@honba/ui-core';
import type { LayoutSummary } from '@honba/ui-core';

const NOW = Date.now();

const notificationsFixture: NotificationRow[] = [
  {
    cid: 'demo-n1',
    ts: NOW - 30_000,
    severity: 'success',
    title: 'Order filled',
    message: 'BUY 50 RELIANCE @ 2,971.15 (ORD-STRT-171)',
  },
  {
    cid: 'demo-n2',
    ts: NOW - 8 * 60_000,
    severity: 'error',
    title: 'Connection lost',
    message: 'The /ws stream dropped (code 1006); reconnecting.',
  },
  {
    cid: 'demo-n3',
    ts: NOW - 2 * 60_000,
    severity: 'warning',
    title: 'Backtest finished with warnings',
    message: 'Run 19 completed; 3 fills were rejected at the limit price.',
  },
];

function LayoutDemo() {
  return (
    <div style={{ height: 240, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
      <Layout>
        <LayoutHeader>
          <p style={{ margin: '4px 16px', padding: '6px 0', fontSize: 12, borderBottom: '1px solid var(--border-subtle)' }}>
            header slot — apps/web composes the top nav here
          </p>
        </LayoutHeader>
        <LayoutMain>
          <p className="demo-label" style={{ margin: '4px 16px' }}>
            main slot — uses padding/top rules from the reference's Layout (Electron min-width dropped)
          </p>
        </LayoutMain>
        <LayoutFooter>
          <p style={{ margin: '4px 16px', fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }}>
            footer slot — apps/web mounts StatusBar here
          </p>
        </LayoutFooter>
      </Layout>
    </div>
  );
}

function NotificationListDemo() {
  const [rows, setRows] = useState(notificationsFixture);
  return (
    <div className="demo-stack">
      <div className="demo-row" style={{ marginBottom: 10 }}>
        <button
          type="button"
          className="demo-tag"
          aria-pressed={false}
          onClick={() => setRows(notificationsFixture)}
        >
          reset rows
        </button>
        <span className="demo-label">{rows.length} of 3 fixture rows</span>
      </div>
      <NotificationList
        rows={rows}
        variant="sidebar"
        onClose={(cid) => setRows((prev) => prev.filter((row) => row.cid !== cid))}
      />
    </div>
  );
}

// Mirrors the host-side recency windowing the reference did with useInterval (rows newer than
// 5s became toasts): the demo simulates it with a push that stamps `ts` now — in the real app
// the store + a clock decide what's recent (Batch H).
function NotificationToastsDemo() {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const pushToast = () => {
    const severity = rows.length % 2 === 0 ? 'info' : 'warning';
    setRows((prev) => [
      ...prev,
      {
        cid: `toast-${prev.length + 1}`,
        ts: Date.now(),
        severity,
        title: severity === 'info' ? 'Quote stream connected' : 'Slow feed',
        message: `Toast ${prev.length + 1} pushed at ${new Date().toLocaleTimeString()}`,
      },
    ]);
  };
  return (
    <div className="demo-stack">
      <div className="demo-row" style={{ marginBottom: 10 }}>
        <button type="button" className="demo-tag" aria-pressed={false} onClick={pushToast}>
          push toast
        </button>
        <button type="button" className="demo-tag" aria-pressed={false} onClick={() => setRows([])}>
          clear toasts
        </button>
        <span className="demo-label">{rows.length} live toast(s)</span>
      </div>
      <NotificationToasts
        rows={rows}
        onClose={(cid) => setRows((prev) => prev.filter((row) => row.cid !== cid))}
      />
    </div>
  );
}

function NotificationsSidebarDemo() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(notificationsFixture);
  return (
    <div className="demo-stack">
      <div className="demo-row" style={{ marginBottom: 10 }}>
        <button type="button" className="demo-tag" aria-pressed={open} onClick={() => setOpen(true)}>
          open sidebar
        </button>
        <button
          type="button"
          className="demo-tag"
          aria-pressed={false}
          onClick={() => setRows(notificationsFixture)}
        >
          reset rows
        </button>
        <span className="demo-label">
          Real fixed-position overlay; backdrop/panel clicks close it.
        </span>
      </div>
      <NotificationsSidebar
        rows={rows}
        visible={open}
        onClosePanel={() => setOpen(false)}
        onCloseRow={(cid) => setRows((prev) => prev.filter((row) => row.cid !== cid))}
        onClearAll={() => setRows([])}
      />
    </div>
  );
}

const layoutsFixture: LayoutSummary[] = [
  { id: 'default', label: 'Default market data' },
  { id: 'preset-1', label: 'ORB scalping', canDelete: true },
  { id: 'server-42', label: 'Server default (read-only)' },
];

function LayoutControlToolbarDemo() {
  const [layouts, setLayouts] = useState(layoutsFixture);
  const [activeId, setActiveId] = useState('preset-1');
  const [dirty, setDirty] = useState(false);

  return (
    <div>
      <p className="demo-label" style={{ margin: '0 0 10px' }}>
        Save unlocks when dirty; Delete only for user-owned (canDelete) layouts; layout rows are
        server-backed in the real app (`/profile/layouts`, Batch H/I via useLayoutStore).
      </p>
      <LayoutControlToolbar
        layouts={layouts}
        activeLayoutId={activeId}
        layoutDirty={dirty}
        onChangeLayout={(id) => {
          setActiveId(id);
          setDirty(true);
        }}
        onAddLayout={() => {
          const id = `preset-${layouts.length + 1}`;
          setLayouts((prev) => [...prev, { id, label: `New layout ${layouts.length + 1}`, canDelete: true }]);
          setActiveId(id);
          setDirty(false);
        }}
        onSaveLayout={() => console.info('save layout', activeId)}
        onDeleteLayout={() => {
          setLayouts((prev) => prev.filter((layout) => layout.id !== activeId));
          setActiveId('default');
          setDirty(true);
        }}
      />
    </div>
  );
}

// Test-only style bomb: throws on render while armed, renders nothing otherwise. The
// CrashHandler boundary around it covers the whole viewport (it's an app-level fallback), so
// the tile's Retry button brings the dashboard back.
function ShellBomb({ armed }: { armed: boolean }) {
  if (armed) throw new Error('demo crash — a child beneath CrashHandler threw');
  return null;
}

function CrashHandlerDemo() {
  const [armed, setArmed] = useState(false);
  return (
    <div className="demo-stack">
      <p className="demo-label" style={{ margin: '0 0 10px' }}>
        Real full-viewport React 19 error boundary. "Retry" clears it without a reload.
      </p>
      <div className="demo-row" style={{ marginBottom: 10 }}>
        <button type="button" className="demo-tag" aria-pressed={armed} onClick={() => setArmed(true)}>
          crash this tile
        </button>
      </div>
      <CrashHandler
        reportUrl="https://github.com/example/honba-fe/issues"
        title="Demo crash"
      >
        <ShellBomb armed={armed} />
      </CrashHandler>
    </div>
  );
}

// Same tile shape as demos-*.tsx: the dashboard renders each `node` inside a DemoTile and
// derives section counts from these arrays.
export const shellTiles = [
  {
    id: 'layout',
    name: 'Layout',
    source: 'shell/Layout',
    description: 'Header / Main / Footer frame slots; the chrome composition is app-level.',
    wide: true,
    node: <LayoutDemo />,
  },
  {
    id: 'notifications-list',
    name: 'NotificationList',
    source: 'shell/NotificationsSidebar',
    description: 'Severity-coded cards (the @ufx-ui Notifications port — implemented in-package).',
    node: <NotificationListDemo />,
  },
  {
    id: 'notifications-toasts',
    name: 'NotificationToasts',
    source: 'shell/NotificationsSidebar',
    description: "Bottom-right cluster; the host picks the recency window (reference cut at 5s).",
    node: <NotificationToastsDemo />,
  },
  {
    id: 'notifications-sidebar',
    name: 'NotificationsSidebar',
    source: 'shell/NotificationsSidebar',
    description: 'Backdrop + right slide-in panel with clear-all; visibility is controlled state.',
    node: <NotificationsSidebarDemo />,
  },
  {
    id: 'layout-control-toolbar',
    name: 'LayoutControlToolbar',
    source: 'shell/LayoutControlToolbar',
    description: "Layout switcher row (Add/Save/Delete with the reference's disabled-state logic).",
    node: <LayoutControlToolbarDemo />,
  },
  {
    id: 'crash-handler',
    name: 'CrashHandler',
    source: 'shell/CrashHandler',
    description: 'React 19 error boundary rewritten from scratch (not a line-for-line port).',
    node: <CrashHandlerDemo />,
  },
];

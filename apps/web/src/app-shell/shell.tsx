// Batch F (docs/tasks.md): the real composed shell. Task brief: a top nav (app switcher +
// symbol search slot + account/connection status), a bottom status bar and a notification
// center — with notifications owned by an app-local Zustand store (src/core/store/notifications.ts,
// not ui-core). Structural pieces (Layout frame, NotificationsSidebar, NotificationToasts,
// StatusBar, CrashHandler, SimpleDropdown, Indicator, Input) are all ui-core units — Batch F's
// ui-core exports — composed here exactly as the reference's Layout+Navbar+StatusBar did.
//
// Deliberately-not-yet (Batches G/H/I): credential/account badge (needs the broker-credential
// shape, Batch I ← honba-adapters), search results (this slot renders an inert input), and
// dockview-powered app workspaces (decision recorded in docs/plan.md §3.3; workspaces land with
// each app). Since Batch H the connection status is live: the LiveSocket gateway
// (core/liveSocket.ts) drives useConnectionStore, which both the topbar pill and StatusBar read.
import { Outlet, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';

import {
  CrashHandler,
  Indicator,
  Input,
  Layout,
  LayoutFooter,
  LayoutHeader,
  LayoutMain,
  NotificationsSidebar,
  SimpleDropdown,
  StatusBar,
} from '@honba/ui-core';
import { useNotifications } from '../core/store/notifications';
import { useConnectionStore } from '../core/store/connection';
import '../styles/base.css';

// The app switcher's "apps" mirror the router in main.tsx (routes already exist as
// placeholders). Same order as the reference Navbar's Routes + honba's app set.
const APPS = [
  { path: '/', label: 'Screener' },
  { path: '/workbench', label: 'Workbench' },
  { path: '/algodesigner', label: 'AlgoDesigner' },
  { path: '/simulator', label: 'Simulator' },
  { path: '/researcher', label: 'Researcher' },
  { path: '/portfolio', label: 'Portfolio' },
  { path: '/settings', label: 'Settings' },
  { path: '/components', label: 'Components (ui-core dashboard)' },
];

export function AppShell() {
  const navigate = useNavigate();
  const { rows, visible, setVisible, remove, clearAll } = useNotifications();
  // Batch H: global connection status from the LiveSocket gateway. The shell subscribes via the
  // store so it re-renders only when the status actually changes.
  const connectionStatus = useConnectionStore((state) => state.status);

  return (
    <CrashHandler className="app-shell-crash">
      <Layout className="app-shell">
        <LayoutHeader className="app-shell__topbar">
          <span className="app-shell__brand">Honba</span>
          <SimpleDropdown
            className="app-shell__app-switcher"
            label={
              <span className="app-shell__app-switcher-label">
                Apps
                <span aria-hidden="true" className="app-shell__app-switcher-chevron">
                  ▾
                </span>
              </span>
            }
            options={APPS.map((app) => (
              <button
                key={app.path}
                type="button"
                className="app-shell__app-switcher-item"
                onClick={() => navigate(app.path)}
              >
                {app.label}
              </button>
            ))}
          />
          <div className="app-shell__search-slot">
            {/* Inert symbol-search slot; Batch H wires the instrument search endpoint. */}
            <Input
              placeholder="Search symbol (e.g. NSE:RELIANCE)…"
              value=""
              onChange={() => {}}
            />
          </div>
          <div className="app-shell__status">
            {/* Batch H: the LiveSocket gateway (core/liveSocket.ts) feeds this live. */}
            <Indicator color={connectionStatus === 'live' ? 'green' : 'red'} />
            <span>{connectionStatus === 'live' ? 'Connected' : 'Not connected'}</span>
          </div>
          <button
            type="button"
            className="app-shell__bell"
            aria-label="Notifications"
            aria-expanded={visible}
            onClick={() => setVisible(!visible)}
          >
            <Bell size={16} />
          </button>
        </LayoutHeader>
        <LayoutMain className="app-shell__content">
          <Outlet />
        </LayoutMain>
        <LayoutFooter className="app-shell__status-bar">
          <StatusBar connected={connectionStatus === 'live'} />
        </LayoutFooter>
        <NotificationsSidebar
          rows={rows}
          visible={visible}
          onClosePanel={() => setVisible(false)}
          onCloseRow={remove}
          onClearAll={clearAll}
        />
      </Layout>
    </CrashHandler>
  );
}

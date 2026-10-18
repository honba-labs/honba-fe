import { Link, Outlet } from 'react-router-dom';
import { Button, Panel } from '@honba/ui-core';

// Phase 0 placeholder: top nav / app-switcher / status bar land here in Phase 1 (docs/plan.md §3.2).
// Wires in Batch A's Button and Panel from @honba/ui-core (docs/tasks.md Batch A) to prove the
// package is actually consumable end to end, not just exported.
// `/components` — first real route: the ui-core component dashboard, useful from day one to
// eyeball everything the package exports.
export function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-shell__topbar">
        <span className="app-shell__brand">Honba</span>
        <div className="app-shell__topbar-links">
          <Link to="/components">Components</Link>
          <Button label="New order" variant="blue" onClick={() => {}} />
        </div>
      </header>
      <main className="app-shell__content">
        <Panel label="Workspace" hasShadow>
          <Outlet />
        </Panel>
      </main>
    </div>
  );
}

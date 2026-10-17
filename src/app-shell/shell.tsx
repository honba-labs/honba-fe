import { Outlet } from 'react-router-dom';

// Phase 0 placeholder: top nav / app-switcher / status bar land here in Phase 1 (docs/plan.md §3.2).
export function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-shell__topbar">Honba</header>
      <main className="app-shell__content">
        <Outlet />
      </main>
    </div>
  );
}

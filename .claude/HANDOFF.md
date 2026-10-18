# honba-fe handoff (2026-10-19, early) — resume: Batch G (modals)

## State: Batches A–F done and committed. The component dashboard (/components) shows batches A–F. Nothing below is pushed.

Last committed state on top of `8199609` ("Update handoff note: Batch E complete, resume at Batch F"):

```
0c7cdb3 Add Batch F shell tiles to the ui-core component dashboard
6b71541 Compose the real app shell (apps/web): top nav w/ app switcher + search slot + connection status, bottom status bar, notifications via app-local Zustand store, CrashHandler boundary
b00f7fb Add shell/layout chrome primitives to ui-core (Layout, CrashHandler, NotificationsSidebar + NotificationList/NotificationToasts, LayoutControlToolbar) — based on src/components/{Layout,CrashHandler,NotificationsSidebar,LayoutControlToolbar}
d3c8b4e Record docking-engine decision: dockview-react (spike: react-resizable-panels v4 vs dockview-react v8 under React 19), keep dockview-react dep
```

## What Batch F decided and shipped (this session)

1. **Docking-engine fork RESOLVED — `dockview-react` v8.6.0 (MIT, zero deps, `react` peer
   `^16.8 || ^17 || ^18 || ^19`)**: both engines were spike-tested hands-on (a throwaway
   jsdom test that is NOT in the repo): RRP v4.14 works but is split-only (no tab groups,
   drag-to-dock, floating, popouts, serialization — Design.md's dockable tabbed panels would
   have to be rebuilt by hand); dockview-react renders real docked tab groups under React 19
   and round-trips `api.toJSON()/fromJSON()` straight onto `/profile/layouts`. Note: dockview
   v8 split into a free MIT core + `dockview-enterprise` (commercial "superset"); everything
   needed (tabs/groups/DnD/floating/serialization) stays free. Decision recorded in
   `docs/plan.md` §3.3; `dockview-react` is now a dependency of `apps/web`.
2. **ui-core `src/shell/*` (4 units, 20 new tests)**: `Layout`/`LayoutHeader`/`LayoutMain`/
   `LayoutFooter` (frame slots; Electron min-width + hard Navbar/StatusBar imports dropped),
   `CrashHandler` (clean React 19 class error boundary w/ Retry + `onCrash` telemetry hook;
   reportUrl prop replaces the Bitfinex issue link), `NotificationList`/`NotificationsSidebar`
   /`NotificationToasts` (the @ufx-ui `Notifications` list re-implemented in-package — severity
   cards, per-row dismiss, clear-all, backdrop + slide-in panel, toast cluster; the 5s recency
   window is the host's job), `LayoutControlToolbar` (layout dropdown + Add/Save/Delete with
   the reference's disabled-state logic; Add Component button dropped — dockview's UI covers it).
3. **apps/web real shell** (`app-shell/shell.tsx` + `core/store/notifications.ts`): topbar =
   brand + `SimpleDropdown` app switcher (all 8 routes, incl. /components), inert symbol-search
   Input slot, `Indicator` "Not connected" status, notifications bell toggling the
   `NotificationsSidebar`; footer = `StatusBar` (static disconnected until Batch H's `/ws`
   store); everything wrapped in `CrashHandler`. Notifications live in a small Zustand store
   (`useNotifications`: push/remove/clearAll/visible) per the Batch F brief — Batch H should
   fold it into `core/store` rather than recreate a `useNotificationsStore` from scratch.
4. **Dashboard**: `demos-shell.tsx` (6 tiles — Layout frame, NotificationList, NotificationToasts
   with a push/clear simulator, the real fixed-position NotificationsSidebar overlay, a fully
   interactive LayoutControlToolbar, and a live "crash this tile" CrashHandler demo), section
   `Batch F — Shell chrome`, nav regex widened to `^Batch [A-F] — `.

Verified this session: `tsc --noEmit` and `eslint src` green in **both** workspaces;
`vitest run` **223/223** in `packages/ui-core` and **13/13** in `apps/web`; `npm run build`
green in all workspaces (after fixing invalid `//` CSS comments in component-dashboard.css
— lightningcss rejects them; keep CSS comments `/* */`).

Also landed this session (concurrently with Batch E's last step): the 6 Batch-E test fixes
from the previous handoff were applied, and the dashboard got its Batch E section; commits
`4b51514` + `fc586f8` + `8199609`.

## Interpretation notes for Batch G (docs/tasks.md §Batch G)

- Port ONLY the 6 listed modals to `packages/ui-core/src/modals/*`, built on Batch A's
  `Modal` primitive (isOpen/onClose/domain props in; no global reads). Skips listed in the
  brief are Bitfinex-lifecycle-specific and stay skipped.
- `RefillBalanceModal`: confirm a paper-trading balance reset flow exists in honba before
  porting; otherwise skip with a note.
- `APIKeysConfigurateForm` is NOT a port — it becomes the broker-connection Settings form
  (Batch I), reusing Batch A primitives; its real field shape needs `honba-adapters` input
  (the one genuinely open item in G — check with the owner before blocking; plan.md
  §broker-credential note).
- ui-core's `Modal` still has **no accessible name** on its `role="dialog"` (title is a plain
  `<p>`; the dashboard's Modal test works around it via `.hb-modal__close`). Fix the title's
  headline to an `<h1>…aria-labelledby` id while porting G's modals — every G modal will
  want it.
- Done for G, the dashboard gains a `Batch G — Modals` section (`^Batch [A-G] — `) with one
  demo tile per modal (open/close via local state), same as E/F.

## Still-valid operating notes (don't re-litigate)

- Batch mode: decisions on record are in `docs/plan.md` §0/§3.3; keep moving without
  re-asking. Only genuinely open items left: broker-credential shape (G, needs
  `honba-adapters`).
- **TypeScript pinned to exact `6.0.3`** in both workspaces — `@typescript-eslint/parser`
  hard-crashes on TS 7.x. Don't bump until upstream ships TS7 support.
- ui-core stays strictly presentational/backend-agnostic (no fetch/WS/Zustand stores; those
  are apps/web's). Every unit: own folder with `.tsx` + `.css` + `.test.tsx` + `index.ts`,
  exported from `src/index.ts` append-only. Banned imports: `@ufx-ui/*`, `bfx-*`, `redux`,
  `redux-saga`, `prop-types`, `.scss`. CSS comments must be `/* */` (lightningcss).
- Tables need jsdom stubs wherever demos are tested: `ResizeObserver` stub +
  `clientHeight`/`offsetHeight` = 600 on `HTMLElement.prototype` (see the dashboard test's
  `beforeEach`); dockview works out-of-the-box under jsdom (spiked), only assumes sized
  containers for actual geometry math.
- Env rules: never build in /tmp; run pytest with `--basetemp=$HOME/.cache/pytest-honba` in
  the honba repo only (not relevant here); commit by explicit path, no Co-Authored-By/any
  trailer; one sonnet/haiku subagent at a time (never opus); TDD red-first; nothing pushed.
- The working tree had a second agent applying changes concurrently during Batch E/F finish
  (annotate: the same session applied fixes that had to be re-based into clean slices) —
  if another agent is still alive, coordinate before Batch G; commit per-slice with explicit
  paths and verify `git log` after.

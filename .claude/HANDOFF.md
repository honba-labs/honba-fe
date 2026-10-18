# honba-fe handoff (2026-10-18, late evening) — resume: Batch F (app shell & layout chrome)

## State: Batches A–E done and committed. The component dashboard (/components) shows batches A–E. Nothing below is pushed.

Last committed state on top of `0f32c10` ("Batch D complete, resume at Batch E"):

```
4b51514 Add Batch E strategy/backtest widgets to ui-core (PerformanceMetrics, StrategyTradesTable, StrategiesListTable, BacktestOptionsPanel, BacktestProgressBar) — based on src/components/{StrategyPerfomanceMetrics,StrategyTradesTable,StrategiesListTable,BacktestOptionsPanel,BacktestProgressBar}
fc586f8 Add ui-core component dashboard at /components (apps/web)
```

How Batch E finished (this session, from the previous handoff's "evening" note):

1. **Batch E acceptance — the 6 failing tests were assertion bugs, all fixed as prescribed:**
   - `StrategyTradesTable.test.tsx`: positive `formatPnl` output is `'+7,200'` (not `'7,200'`),
     fixed in the row-render and sign-color tests; the expand test now uses
     `getAllByRole('button', { name: 'Expand trade' })[0]` (two rows → two buttons).
   - `component-dashboard.test.tsx`: added the missing `clientHeight`/`offsetHeight` stubs
     (`@tanstack/react-virtual` rendered zero rows otherwise); the Modal close now queries
     `document.querySelector('.hb-modal__close')` because the PanelSettings demo tile's "Close"
     Button collides with role-queries and ui-core's Modal dialog has no accessible name.
2. **Dashboard Batch E section added**: `demos-strategy.tsx` (5 tiles via 4 demo components —
   the options panel embeds a bare `BacktestProgressBar` too; simulated run is pure local
   timers), fixtures appended to `fixtures.ts` (`strategyMetricsFixture`, `strategyTradesFixture`,
   `strategiesListFixture`, `backtestConfigFixture`), section wired in `component-dashboard.tsx`
   (nav regex widened to `^Batch [A-E] — `), tests extended (section heading, nav label, live
   Batch E widget assertions `+₹18,40,842` / `+7,200` / `Active (2)`).

Verified this session: `tsc --noEmit` and `eslint src` green in **both** workspaces; `vitest run`
**203/203** in `packages/ui-core` and **7/7** in `apps/web`.

## Not ported from Batch E (per docs/tasks.md brief, still true)

`StrategyEditor` (AlgoDesigner gets honba-frontend's graph + Monaco — Batch I), `StrategyLiveChart`
(reuse Batch C's `ChartPanel` with a trade-marker overlay when a feature needs it),
`StrategyOptionsPanel`. ui-core's `Modal` still has no accessible title — worth fixing when a
feature (G/I) needs to query it accessibly.

## Next: Batch F — app shell & layout chrome (docs/tasks.md §Batch F)

1. **The docking-engine decision is still open: `react-resizable-panels` vs `dockview`.** Spike
   both against the placeholder shell (`apps/web/src/app-shell/shell.tsx` — extend, don't
   replace); reference is bfx-hf-ui-core's `GridLayout`/`LayoutControlToolbar` (UX only,
   `.reference/bfx-hf-ui-core` pinned at `7df411b1a60917f0b2e74edecca8012224c6c5a4`). Record the
   choice in `docs/plan.md` §3.3 once made. (Per owner: spike it, don't default. This is the one
   genuinely open fork — ask there, not mid-batch.)
2. Port layout primitives → `packages/ui-core/src/shell/*`; composed shell (top nav with app
   switcher + symbol search slot + account status, bottom status bar) → `apps/web/src/app-shell/*`.
3. Electron-only pieces are skipped by the brief (`SwitchMode`, `FullscreenModeBar`,
   `AppUpdateBar`, `HFUI`, `HFUIWrapper`). `CrashHandler` → a clean React 19 error boundary,
   not a line-for-line port.
4. `NotificationsSidebar` UX → toast list with severity colors + dismiss/clear-all; its queue
   lives in `apps/web/src/core/store` (small Zustand store, NOT ui-core).
5. The dashboard route is the natural smoke surface: new shell components should get tiles there
   (extend `demos-*.tsx`; the Batch F section goes under `shell/` at `^Batch [A-F] — `).

## Still-valid operating notes (don't re-litigate)

- Batch mode: decisions on record are in `docs/plan.md` §0; keep moving without re-asking.
  Remaining genuinely open items: docking-engine pick (F, above); broker-credential shape (G,
  needs `honba-adapters`).
- **TypeScript pinned to exact `6.0.3`** in both workspaces — `@typescript-eslint/parser`
  hard-crashes on TS 7.x. Don't bump until upstream ships TS7 support.
- ui-core stays strictly presentational/backend-agnostic (no fetch/WS/Zustand stores; those are
  apps-web/Batch H). Every unit: own folder with `.tsx` + `.css` + `.test.tsx` + `index.ts`,
  exported from `src/index.ts` append-only. Banned imports: `@ufx-ui/*`, `bfx-*`, `redux`,
  `redux-saga`, `prop-types`, `.scss`.
- Routes/layout: `/components` is wired in `apps/web/src/main.tsx` with a "Components" topbar
  link in `app-shell/shell.tsx` + `styles/base.css`.
- Tables need jsdom stubs wherever demos are tested: `ResizeObserver` stub +
  `clientHeight`/`offsetHeight` = 600 on `HTMLElement.prototype` (see the dashboard test's
  `beforeEach`); Expansion/testing tolerances mirror `OrdersTable.test.tsx`.
- Env rules: never build in /tmp; run pytest with `--basetemp=$HOME/.cache/pytest-honba` in the
  honba repo only (not relevant here); commit by explicit path, no Co-Authored-By/any trailer;
  one sonnet/haiku subagent at a time (never opus); TDD red-first; nothing pushed.

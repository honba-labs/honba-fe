# honba-fe handoff (2026-10-18)

## State: Batches A, B, C of the ui-core port are done and committed. Stop here until resumed.

```
f2f1e94 Add Batch C market/trading display widgets to ui-core
7aa1afd Port Batch B hooks from bfx-hf-ui-core into ui-core
9e77e64 Port ui-core atomic primitives from bfx-hf-ui-core (Batch A)
1f90571 Add vitest/jsdom/testing-library to ui-core; persist bfx-hf-ui-core reference locally
54b3230 Restructure as npm workspaces: packages/ui-core + apps/web
655cbcb Add package-lock.json
aa203c0 Bootstrap honba-fe: Phase 0 scaffold + implementation plan
```

All on `main`, nothing pushed, working tree clean. `npm run typecheck && npm run lint && npm run
test && npm run build` all green at the repo root as of this commit.

## What this repo is

Read `docs/plan.md` first (full rationale), then `docs/tasks.md` (the per-batch task briefs).
Short version: honba-fe replaces `honba-frontend` as Honba's web frontend. It's an npm-workspaces
monorepo — `packages/ui-core` (a from-scratch-but-faithful port of
[bfx-hf-ui-core](https://github.com/bitfinexcom/bfx-hf-ui-core), Apache-2.0, modernized to React
19/TS/Zustand/CSS-vars) + `apps/web` (the shell SPA that will consume it and own all backend
wiring). The reference source is checked out locally at `.reference/bfx-hf-ui-core` (gitignored,
pinned commit `7df411b1a60917f0b2e74edecca8012224c6c5a4` — read-only, never vendored).

## Done so far (packages/ui-core/src/)

- **Batch A** (`ui/`): Button, Input, Dropdown, SimpleDropdown, Modal, Panel, PanelSettings,
  Tabs, RadioButton, DatePicker, ProgressBar, Indicator, PLNumber, Scrollbars, AttentionBar.
- **Batch B** (`hooks/`): useToggle, useSize, useHover, useCountdown, useModalFocus.
- **Batch C** (`market/`): OrderBook, OrderBookPanel, ChartPanel (wraps `openalgo-charts`, not
  bfx-hf-ui-core's own chart — see commit `f2f1e94` for the integration pattern, modeled on
  `honba-frontend/src/components/features/workbench/openalgo-chart.tsx`), MarketSelect,
  TimeFrameDropdown, InstrumentInfoBar (renamed from ExchangeInfoBar), StatusBar.

All exported from `packages/ui-core/src/index.ts` (append-only so far — don't rewrite it, add to
it). Every component/hook: own folder, `.tsx`/`.ts` + `.css` (if visual) + `.test.tsx`/`.test.ts`
+ `index.ts`. Zero `@ufx-ui/*`, `bfx-*`, `redux`, `redux-saga`, `prop-types`, `.scss` anywhere —
keep it that way. Nothing in `packages/ui-core` fetches, uses WS, or imports from `apps/web` —
it's strictly presentational; backend wiring is `apps/web`'s job (Batch H/I, not started).

## Next: Batch D (`docs/tasks.md` — order entry & position/balance widgets)

OrderForm, OrderHistory, AtomicOrdersTable(+Panel), AlgoOrdersTable(+Panel)+HistoryButton,
PositionsTable(+Panel), BalancesTable(+Panel), TradesTablePanel, TradingStatePanel →
`packages/ui-core/src/trading/*`. Uses `@tanstack/react-table` + `@tanstack/react-virtual` (not
yet a dependency of `packages/ui-core` — add them, current versions were `9.3.1` / `3.14.21` as
of 2026-10-17, re-check with `npm view` rather than trusting that). Read the task brief for the
honba-endpoint mapping notes (`/orders`, `/portfolio/positions`, `/positions/close`, etc.) — those
are for later batches to wire up, Batch D itself stays props-in like A/B/C.

Then E (strategy/backtest widgets) → F (shell/layout, **docking-engine choice still undecided —
react-resizable-panels vs dockview, resolve in F**) → G (modals) → H (real state layer: Zustand +
`/ws` + TanStack Query, reading `honba`'s `honba-api-rest/src/streams.rs` for the actual WS
contract first) → I (assemble into apps/web routes, parity-check against `honba-frontend`).

## Operating notes for whoever resumes this

- **Batch mode, don't re-ask**: the big fork-in-the-road decisions (ground-up rewrite, ui-core
  literally ported from bfx-hf-ui-core not just "inspired by", stack versions, npm workspaces)
  are already made — see `docs/plan.md` §0. Keep moving through the batch queue one at a time
  without pausing for confirmation. Still stop and ask about things flagged as genuinely open in
  the task briefs (the docking-engine pick in F; broker-credential shape in D/G needs
  `honba-adapters` input).
- **One subagent at a time**, sonnet/haiku, each batch is one subagent call with a self-contained
  prompt (see this conversation's history for the Batch A/B/C prompts as templates — same
  structure works for D onward: point at `docs/tasks.md`'s section, the local `.reference/`
  checkout, the established per-unit file layout, the acceptance bar, the git-commit rules).
- **TypeScript is pinned to exact `6.0.3`, not latest (`7.0.2`)**, deliberately, even though an
  earlier instruction said "keep at latest". Verified firsthand: `@typescript-eslint/parser`
  throws `typescript-eslint does not support TS 7.0` as a hard runtime crash, not a soft peer
  warning (upstream tracking: the error message links a GitHub issue for TS ≥7.1 support). Don't
  re-bump to 7.x until that's resolved upstream — check `npm view @typescript-eslint/parser` /
  that issue before trying again.
- Verify every batch's claims yourself before trusting them (I caught the TS version point by
  reproducing the crash directly, not just taking the subagent's word for it) — but don't
  re-review line-by-line; spot-check the risky/surprising claim, trust the mechanical ones
  (typecheck/lint/test/build passing is easy to just re-run).

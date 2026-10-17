# honba-fe — Implementation Plan

## 0. Decisions on record

These were confirmed with the product owner before this plan was written and should not be
re-litigated without a new discussion:

1. **honba-fe replaces `honba-frontend` entirely.** It is the new canonical web frontend for
   Honba. `honba-frontend` is retired once honba-fe reaches parity (see §8).
2. **Ground-up rewrite of the app itself; `packages/ui-core` is a direct, modernized port of
   `bfx-hf-ui-core`.** Revised 2026-10-17: the trading-widget library (`packages/ui-core`, see
   §3.5) is explicitly based on `bfx-hf-ui-core`'s actual components — ported and modernized
   (React 16/Redux/SCSS → React 19/TypeScript/Zustand/CSS variables), not merely
   "inspired by" — per-component mapping and exclusions are in `docs/tasks.md`. `bfx-hf-ui`'s
   Electron shell and Bitfinex-backend wiring (`bfx-hf-server`, `bfx-hf-algo`, Grenache) are still
   not ported; the app shell, routing, and backend integration in `apps/web` remain a from-scratch
   build against honba's own REST/WS API. Apache-2.0 permits this; attribution lives in
   `packages/ui-core/LICENSE` and `packages/ui-core/NOTICE.md`.
3. **Existing honba-frontend features are in scope to reimplement**, not to skip. Screener,
   Workbench (chart + depth + order ticket), Portfolio, AlgoDesigner, Simulator, Researcher all
   have working implementations today; honba-fe must reach at least feature parity with them
   before `honba-frontend` is decommissioned.

## 1. Why not just use bfx-hf-ui / bfx-hf-ui-core directly

Checked against the live repos before writing this plan (2026-10-17):

| Concern | Finding |
|---|---|
| Maintenance | `bfx-hf-ui` was **archived by Bitfinex on 2025-03-28**; README states it has been unmaintained since 2025-03-25. `bfx-hf-ui-core` shows no archive banner but also no visible recent-activity signal. |
| Stack | React **16.9**, Redux + redux-saga + redux-batched-subscribe + connected-react-router, React Router v5, CRA (`react-scripts` 4) build tooling, SCSS. Two major React versions behind what Honba has already standardized on (React 19). |
| Backend coupling | The app spawns and talks to Bitfinex-specific services: `bfx-hf-server`, `bfx-hf-data-server`, `bfx-hf-algo`, `bfx-hf-strategy`, over Bitfinex's own protocol (Grenache-based microservices talking to the Bitfinex exchange). None of this exists in, or applies to, honba's Rust/Python stack. |
| Domain | Algo order types are crypto-flavored (Accum/Dist, Ping/Pong, Iceberg, TWAP, OCOCO) for a single exchange (Bitfinex). Honba targets NSE/BSE equities, indices, F&O, mutual funds, ETFs across (potentially) multiple broker adapters. |
| Reusable widgets | The actual trading-widget primitives (order book, depth, ticker) live in Bitfinex's separate `@ufx-ui/core` / `@ufx-ui/bfx-containers` npm packages (pinned to `0.16.0`, built for React 16), not in app code. They are not a drop-in for a React 19 app and are not meaningfully maintained outside Bitfinex's own needs.
| License | Apache-2.0 on both repos — reuse would be legally fine, but none of the above makes it practically worthwhile. |

Net: there isn't an "it just needs wiring up" shortcut here — the app as a whole (shell, backend
wiring, build tooling) is rebuilt from scratch. But per the 2026-10-17 revision above, the actual
component-level UI (order book, order form, position/balance tables, panels, modals) *is* ported
directly from `bfx-hf-ui-core`'s `src/`, scoped down to what applies to honba's domain and
rewritten onto React 19/TS/Zustand — see `docs/tasks.md` for the exact per-component breakdown,
what's excluded (Bitfinex-branding, Electron-only chrome, account-lifecycle modals with no honba
equivalent), and how each maps onto honba's own REST/WS API.

## 2. Baseline: what `honba-frontend` already has

So nothing gets lost in the rewrite. Current repo: `honba-labs/honba-frontend` (React 19 + Vite +
TypeScript + Zustand, multi-page via separate Vite entrypoints, codegen-linked to honba's Rust
core).

| App | Entry | Covers |
|---|---|---|
| Screener | `index.html` → `screener-app.tsx` | Multi-market scanner, TradingView-style filter modal, column customizer, heatmap, symbol detail drawer, ~500 ported indicators (`src/indicators/{MIT,GPL-3.0}`) |
| Workbench | `workbench.html` → `workbench-app.tsx` | Multi-chart grid (`openalgo-charts`), **order ticket, order modal, market depth, trading drawer** — i.e. live order entry and order-book UI already exist |
| Portfolio | `portfolio.html` → `portfolio-app.tsx` | Accounts, holdings table, positions table, trades table, analytics view |
| AlgoDesigner | `algodesigner.html` → `algodesigner-app.tsx` | Visual node-graph strategy builder (`@xyflow/react`), Monaco Python editor, code↔graph round-trip, AI chat column, param/sweep panels, save-to-library |
| Simulator | `simulator.html` → `simulator-app.tsx` | Replay engine, equity curve, monthly heatmap, trade journal, drawing canvas, multi-chart view |
| Researcher | `researcher.html` → `researcher-app.tsx` | Placeholder/early stage |
| Instrument | `instrument.html` → `instrument-app.tsx` | Single-symbol detail page |

Backend integration already proven in `honba-frontend`:
- `make schema` (run from `honba/`) regenerates `src/core/types/generated/domain.ts` and a typed
  client in `src/core/api/generated/client.ts` directly from the Rust domain model
  (`honba-codegen`). `FRONTEND_TS_DIR` / `FRONTEND_CLIENT_DIR` in `honba/Makefile` currently point
  at `../honba-frontend/...`.
- Dev loop: `honba serve --addr 127.0.0.1:8000` (Rust REST API) + `vite` dev server proxying
  `/api` → the Rust server and `/ws` → its WebSocket endpoint (`honba-api-rest/src/streams.rs`
  confirms a live streaming route exists server-side).
- REST surface (from `honba/schema/openapi/openapi.json`, 30 paths) includes everything a trading
  terminal needs: `/instruments`, `/quotes`, `/depth/{id}`, `/orders` (GET/POST), `/orders/{id}`
  (DELETE), `/positions/close`, `/portfolio`, `/portfolio/{accounts,holdings,positions,trades}`,
  `/screener/scan`, `/strategies` (+ `/strategies/verify`), `/backtests`, `/sweeps`,
  `/profile` (+ `/profile/layouts`, `/profile/modules` — a server-side layout/module persistence
  API, directly relevant to §6's dockable-layout work), `/trading-state`, `/capabilities`.

honba-fe must not regress on any of this; it's the parity bar for §8.

## 3. Target architecture

### 3.1 Stack

Match `honba-frontend`'s already-proven architectural choices rather than bfx-hf-ui's legacy one,
but on each library's actual current release — re-evaluated and version-pinned against the npm
registry on 2026-10-17 (not from memory; `npm view <pkg> version` is the source of truth, not a
web search — search results on current package versions were unreliable/conflicting when checked):

- **React 19.3.1 + TypeScript 7.0.2**, built with **Vite 8.3.4**. TypeScript 7 is the newly-stable
  native (Go-ported) compiler line; kept at latest per explicit instruction even though
  `@typescript-eslint/parser` (8.x, even prerelease) still declares a peer ceiling of
  `typescript <6.1.0` — installed with `--legacy-peer-deps` to force it. Watch for
  typescript-eslint compatibility issues as a live risk (§9), not a resolved one.
- **Zustand 5.0.15** for client state (per-domain stores, fine-grained selectors — avoids the
  whole-tree-rerender problem bfx-hf-ui-core's Redux+saga setup has on every tick).
- **TanStack Query 5.104.3** for server-state caching/invalidation around the REST API (new —
  honba-frontend rolls its own fetch/store hooks per feature; standardizing this avoids N bespoke
  polling loops).
- **TanStack Table 9.3.1 + TanStack Virtual 3.14.21** for the screener grid and any large
  order/trade tables.
- **openalgo-charts** for price charts (already proven in honba-frontend's Workbench; zero-dep,
  NSE/BSE market-hours aware) — wrapped by a `ChartPanel` in `packages/ui-core`, see
  `docs/tasks.md` Batch C.
- **@xyflow/react 12.12.0** for the AlgoDesigner node graph; **Monaco** (already proven in
  honba-frontend) for the code pane — not bfx-hf-ui-core's CodeMirror, see `docs/tasks.md` Batch E.
- **react-router-dom 7.18.4** for the shell's client-side routing (§3.2).
- Panel-docking engine: **not yet decided** — `react-resizable-panels` vs `dockview`; resolve in
  `docs/tasks.md` Batch F and record the decision here once made.
- **lucide-react 1.59.0** for icons, **clsx 2.1.1** for conditional classes.
- Styling: CSS variables / design tokens (`packages/ui-core/src/styles/tokens.css`), not
  Tailwind, not SCSS — keep a single themeable source of truth per `honba-frontend/Design.md`'s
  requirement that the app be "themeable, with customizable typography and color palette, layout
  presets."
- **Monorepo tooling**: plain **npm workspaces** (`apps/web` + `packages/ui-core`), no
  Turborepo/Nx — appropriate at 2 packages; revisit only if the package count grows well past
  that (see §9).

### 3.2 Application shape: single shell SPA, not multi-page

This is a deliberate departure from `honba-frontend`'s per-app `.html` entrypoints, and the
biggest structural idea taken from bfx-hf-ui: **one persistent app shell** with a top-left
app-switcher (bfx-hf-ui's "drop-down apps button") and client-side routing between
Screener / Workbench / AlgoDesigner / Simulator / Researcher / Portfolio, instead of separate
page loads. This matches `honba-frontend/Design.md`'s own stated intent ("Multi-page Web-app...
Top left drop-down apps button Honba... All apps share data with common data layer") better than
the current multi-entry-point implementation does, and avoids a full page reload (and
WebSocket reconnect) every time the user switches apps.

- **Router**: React Router v6 (or TanStack Router) for `/screener`, `/workbench`, `/algodesigner`,
  `/simulator`, `/researcher`, `/portfolio`, `/instrument/:symbol`, `/settings`.
- **Shell**: top nav (app switcher, symbol search, market/country selector, account/connection
  status, notifications bell), bottom status bar (market clock, latency, connection state) — both
  lifted conceptually from bfx-hf-ui-core's persistent chrome.
- **Shared data layer**: one Zustand store tree + one WebSocket connection + one TanStack Query
  client for the whole shell, so switching apps doesn't re-fetch or re-subscribe from scratch.

### 3.3 Dockable panel layout

bfx-hf-ui-core doesn't actually implement docking (it's a fixed flexbox layout); the dockable,
per-window-selectable layout requirement comes from `honba-frontend/Design.md` and was already
flagged as unimplemented in `honba-frontend/MODERNIZATION_PLAN.md`. honba-fe should finally build
it, backed by the **already-existing** `/profile/layouts` and `/profile/modules` REST endpoints
(server-side persistence per user, not just `localStorage`):

- Evaluate `react-resizable-panels` (simpler, split-only) vs `dockview` (full tabbed/floating
  docking, closer to a real trading terminal) in Phase 1; pick one and standardize across every
  app shell.
- `useLayoutStore` (Zustand) holds the live layout; persists to `/profile/layouts/{name}` on
  save, loads on app mount; `localStorage` only as an offline/last-known-good cache.
- Each app defines a default layout preset (Screener: table + detail drawer; Workbench: chart +
  depth + order ticket + positions; AlgoDesigner: palette + canvas + inspector + code pane).

### 3.4 Backend integration

- Keep the existing codegen contract: `honba/Makefile`'s `schema` / `client` targets write
  TypeScript types and a typed client straight from the Rust domain model. Point
  `FRONTEND_TS_DIR` / `FRONTEND_CLIENT_DIR` at `../honba-fe/src/core/types/generated` and
  `../honba-fe/src/core/api/generated` (cutover step, see §8 — this is an edit to `honba`'s own
  `Makefile` and CI workflow, done once honba-fe is ready to take over, not on day one).
- Dev loop identical to today's: `honba serve --addr 127.0.0.1:8000`, Vite proxy `/api` → REST,
  `/ws` → the WebSocket stream (`honba-api-rest/src/streams.rs`). Replicate `honba-frontend`'s
  `Makefile` (`make api`, `make web`, `make dev`) verbatim in honba-fe.
- Live data (quotes, depth, order/position updates) over the `/ws` stream, not polling — this is
  the one place bfx-hf-ui-core's architecture (it streams book/trade/wallet updates over a
  persistent socket into Redux) is directly the right model; reimplement the pattern (socket →
  normalized Zustand slice → fine-grained selectors) rather than Redux+saga's action-per-tick
  dispatch.
- REST for everything request/response-shaped: order placement/cancellation, portfolio snapshots,
  backtests/sweeps, strategy CRUD, screener scans.

### 3.5 Directory layout (npm workspaces monorepo, set up 2026-10-17)

```
honba-fe/
├── docs/
│   ├── plan.md
│   └── tasks.md                    # per-component task breakdown for implementation agents
├── package.json                    # workspace root: ["apps/*", "packages/*"]
├── tsconfig.base.json              # shared compilerOptions, extended by each package
├── Makefile                        # api / web / dev, mirrors honba-frontend's
├── packages/
│   └── ui-core/                    # @honba/ui-core — ported from bfx-hf-ui-core (§0, §1)
│       ├── LICENSE                 # Apache-2.0, carried from bfx-hf-ui-core
│       ├── NOTICE.md               # attribution + what's ported vs. original
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts            # public exports
│           ├── styles/tokens.css   # design tokens, themeable per Design.md
│           ├── ui/                 # Batch A: Button, Input, Modal, Panel, Tabs, ...
│           ├── hooks/              # Batch B: useToggle, useHover, ...
│           ├── market/             # Batch C: OrderBook, ChartPanel, MarketSelect, StatusBar
│           ├── trading/            # Batch D: OrderForm, PositionsTable, BalancesTable, ...
│           ├── strategy/           # Batch E: PerformanceMetrics, BacktestOptionsPanel, ...
│           ├── shell/              # Batch F: layout primitives (nav, docking shell pieces)
│           └── modals/             # Batch G: ClosePositionModal, EditOrderModal, ...
└── apps/
    └── web/                        # the shell SPA — composes @honba/ui-core, owns backend wiring
        ├── index.html
        ├── vite.config.ts           # proxies /api, /ws to `honba serve`; preserveSymlinks: true
        ├── tsconfig.json
        ├── package.json             # depends on "@honba/ui-core": "*"
        └── src/
            ├── main.tsx             # mounts router + <AppShell>
            ├── app-shell/           # Batch F: shell.tsx, app-switcher, notifications
            ├── core/
            │   ├── api/
            │   │   ├── generated/   # codegen output from honba (domain types + client) — DO NOT EDIT
            │   │   └── query-keys.ts
            │   ├── ws/              # Batch H: socket.ts, channels.ts
            │   └── store/           # Batch H: Zustand stores (market, orders, positions, layout)
            └── features/            # Batch I: screener, workbench, algodesigner, simulator,
                                      # researcher, portfolio, settings
```

See `docs/tasks.md` for exactly which bfx-hf-ui-core source paths feed each `packages/ui-core/src/*`
directory, what's explicitly excluded, and how each maps onto honba's REST/WS API.

## 4. Feature map: bfx-hf-ui concept → honba-fe implementation

| bfx-hf-ui-core concept (reference only) | honba-fe equivalent |
|---|---|
| Main trading view: chart + order book + ticket + open orders/positions | **Workbench** app — already has order-ticket/order-modal/market-depth in `honba-frontend`; reimplement against `/depth/{id}`, `/orders`, `/ws` quote/depth channels |
| Algo order builder (Iceberg/TWAP/Accum-Dist/Ping-Pong/OCOCO) with live param preview | **AlgoDesigner** — honba already has a node-graph builder; borrow bfx-hf-ui's *param-form-with-live-preview* UX for individual algo-order node types, not its Bitfinex algo defs |
| Strategy code editor (CodeMirror) + backtest results | **AlgoDesigner** code pane (Monaco, already chosen) + **Simulator** results panel (equity curve, journal — already exist) |
| Wallet/balances, open orders, order history | **Portfolio** app (already has accounts/holdings/positions/trades tables) |
| Exchange/API-key connection management | **Settings** app (new) — broker adapter connections live in `honba-adapters`; honba-fe needs a UI to manage credentials/connections per adapter, something bfx-hf-ui-core has (API key permissions screen) and honba-frontend does not yet |
| Notification/toast system for fills, errors, algo state changes | **app-shell/notifications** — new shared component, modeled on bfx-hf-ui-core's toast patterns |
| i18n (`i18next`) | Out of scope for v1 (honba is India-first, single locale); revisit if multi-locale becomes a requirement |

## 5. Design system

- Keep `honba-frontend`'s token-driven theming approach (`data-theme`, `data-typography`,
  `data-layout` attributes on `<html>`, CSS variables for color/spacing) — it already satisfies
  `Design.md`'s themeability requirement and doesn't need bfx-hf-ui's SCSS approach.
  `honba-frontend`'s existing component names are also worth carrying forward as a naming
  convention: look at `src/components/ui/hb-*.tsx` (hb-button, hb-modal, hb-dropdown, hb-gauge,
  hb-pill, hb-sparkline, hb-range-bar, hb-bubble) before inventing new primitives.
- Reference bfx-hf-ui-core's density and layout choices (compact row heights, sticky
  headers, color-coded bid/ask, muted chrome around high-contrast data) as inspiration for a
  "dense terminal" mode, but implement with Honba's own palette — never copy Bitfinex's SCSS or
  class names directly (Apache-2.0 would permit it, but it drags in Bitfinex's visual identity and
  undocumented coupling to their markup).

## 6. Phased roadmap

`docs/tasks.md` breaks Phases 1–7 below into granular, per-component task briefs (Batches A–I)
sized for an implementation agent to pick up one at a time, each pinned to the exact
bfx-hf-ui-core source paths it ports from and what's explicitly excluded. Start with Batch A.

| Phase | Scope | Exit criteria |
|---|---|---|
| **0 — Bootstrap** | Repo scaffold (this commit): package.json, Vite/TS config, Makefile, single shell entry, empty `app-shell`, codegen wiring pointed at a *local* copy of generated types (not yet switching `honba`'s Makefile defaults). | `make dev` boots an empty shell against `honba serve`. |
| **1 — Shell & data layer** | Router, app-switcher, top nav/status bar, shared Zustand stores, WS client with reconnect, TanStack Query client, panel-docking engine selected and wired. | Can navigate between 5 empty app routes; WS connects and a test channel updates a store. |
| **2 — Screener** | Port filter bar, column customizer, virtualized table, symbol detail drawer, heatmap, indicator library import (respect existing MIT/GPL-3.0 attribution files). | Feature parity with `honba-frontend` Screener. |
| **3 — Workbench (live trading)** | Chart (openalgo-charts), market depth, order ticket/modal, open orders + positions panel, live quote/depth over `/ws`. This is the phase that most directly draws on bfx-hf-ui-core's trading-view layout. | Can view a symbol, see live(-ish) depth, place/cancel a paper order end-to-end against `honba serve`. |
| **4 — Portfolio** | Accounts, holdings, positions, trades, analytics view. | Parity with `honba-frontend` Portfolio. |
| **5 — AlgoDesigner** | Node graph, code pane, param/sweep panels, save-to-library, AI chat column. | Parity with `honba-frontend` AlgoDesigner (largest single port — budget accordingly). |
| **6 — Simulator & Researcher** | Replay engine, equity curve, journal, multi-chart, drawing tools; Researcher at whatever fidelity `honba-frontend` currently has. | Parity. |
| **7 — Settings** | Broker/adapter connection management, profile, layout-preset management via `/profile/layouts` + `/profile/modules`. | New capability, not a port — define scope with adapter team (`honba-adapters`) before building. |
| **8 — Cutover** | See §8. | `honba-frontend` archived. |

Phases 2–6 can run partly in parallel once Phase 1's shell/data layer is stable, since each is a
self-contained feature area; Phase 3 (Workbench) is the one with the most bfx-hf-ui-specific
design work and should be prioritized early to validate the WS/live-data architecture before it's
copy-pasted into Portfolio/Settings.

## 7. Parity checklist (must pass before §8 cutover)

- [ ] Screener: filters, columns, heatmap, symbol detail drawer, all currently-ported indicators
- [ ] Workbench: multi-chart grid, order ticket, order modal, market depth, trading drawer
- [ ] Portfolio: accounts, holdings, positions, trades, analytics
- [ ] AlgoDesigner: node graph, code↔graph sync, param/sweep panels, AI chat, save-to-library
- [ ] Simulator: replay, equity curve, monthly heatmap, journal, multi-chart, drawing canvas
- [ ] Researcher: at least current `honba-frontend` fidelity
- [ ] Codegen drift checks pass against `honba`'s schema (`make check-schema-ts check-client`
      run with `FRONTEND_TS_DIR`/`FRONTEND_CLIENT_DIR` pointed at honba-fe)
- [ ] CI green on honba-fe (lint, typecheck, unit tests, e2e smoke per app)

## 8. Cutover & decommissioning `honba-frontend`

Only after §7 passes:

1. Update `honba/Makefile`: `FRONTEND_TS_DIR ?= ../honba-fe/src/core/types/generated`,
   `FRONTEND_CLIENT_DIR` likewise. This is an edit to a sibling repo (`honba`) — per the workspace
   cross-repo rule, confirm explicitly with the repo owner before making it, and do it as its own
   reviewed change, not bundled into a honba-fe commit.
2. Update `honba/.github/workflows/ci.yml`'s `codegen-drift-frontend` job to check out `honba-fe`
   instead of `honba-frontend`.
3. Archive `honba-frontend` (GitHub "archive" — read-only, not deleted) once honba-fe is deployed
   and the team has cut over day-to-day usage. Keep its git history; don't delete the repo.
4. Update `honba-labs/CLAUDE.md`'s workspace table to list `honba-fe` as the frontend and drop
   (or mark archived) the `honba-frontend` row.

## 9. Risks & open questions

- **TypeScript 7 vs. the lint toolchain — resolved 2026-10-17 (Batch A)**: TS 7.0.2 made
  `@typescript-eslint/parser@8.71.2` hard-fail at runtime (`typescript-eslint does not support
  TS 7.0`), not just warn via its peer-dependency ceiling (`typescript <6.1.0`), so `npm run lint`
  could not run at all. Applied the fallback this section already called out: both workspaces'
  `typescript` devDependency is pinned to the exact `6.0.3` release (within the parser's supported
  range) instead of `^7.0.2`. `npm install` no longer needs `--legacy-peer-deps`. Revisit the pin
  once `@typescript-eslint` ships TS7 support (tracked at
  https://github.com/typescript-eslint/typescript-eslint/issues/10940).

- **Scope size**: this is a full terminal rewrite (6 app areas + a new shell + a new docking
  engine + a new WS data layer), not a small UI refresh. The "bfx-hf-ui needs little effort"
  premise does not hold once bfx-hf-ui's actual architecture and honba-frontend's actual feature
  depth are accounted for — size the roadmap accordingly (this is a multi-month effort, not days).
- **Docking engine choice** (`react-resizable-panels` vs `dockview`) materially affects how close
  honba-fe gets to a "real trading terminal" feel; resolve in Phase 1 with a short spike, not by
  default.
- **Settings/connection management** (Phase 7) touches `honba-adapters` — needs a contract review
  with whoever owns that repo before UI work starts there.
- **License attribution**: `honba-frontend`'s `src/indicators/{MIT,GPL-3.0}` directories carry
  required `LICENSE`/`NOTICE` files from the ported indicator library; carry these forward
  unchanged if/when the indicator set is reused in honba-fe.
- **WS protocol shape**: `honba-api-rest/src/streams.rs` exists but this plan hasn't inspected its
  message schema yet — first task in Phase 1 is reading that file and `honba`'s streaming
  OpenAPI/schema docs (if any) to design `core/ws/channels.ts` against the real contract, not an
  assumed one.

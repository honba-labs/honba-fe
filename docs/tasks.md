# honba-fe — Task breakdown for implementation agents

Each section below is a **self-contained brief**. An agent with no other context should be able
to read `docs/plan.md` once for background, then read *one* section here and start coding without
needing anything else from this conversation. Do not read other sections unless your task
references them.

## Shared conventions (read this before any task below)

**Reference material.** All "port from" paths below refer to `bfx-hf-ui-core` pinned at commit
`7df411b1a60917f0b2e74edecca8012224c6c5a4` (the last commit before Bitfinex archived the repo),
checked out locally at `honba-fe/.reference/bfx-hf-ui-core`. This directory is `.gitignore`d
(never committed, never shipped as a dependency) but persists on disk across sessions — read it
directly rather than re-cloning. If it's ever missing, recreate it with:

```
git clone https://github.com/bitfinexcom/bfx-hf-ui-core.git .reference/bfx-hf-ui-core
cd .reference/bfx-hf-ui-core && git checkout 7df411b1a60917f0b2e74edecca8012224c6c5a4
```

Treat it as read-only reference material, never as a dependency and never copied verbatim into
the package source. It's Apache-2.0 licensed, so porting/adapting it is legally fine, but every
port is a **rewrite**, not a copy-paste:

| From (bfx-hf-ui-core, React 16 + Redux + SCSS) | To (honba-fe, React 19 + TS + Zustand + CSS vars) |
|---|---|
| Class components / `React.memo(FunctionComponent)` with `PropTypes` | Function components with TypeScript prop types (no PropTypes, no `defaultProps` — use default parameter values) |
| `connect()` / `useSelector` + `useDispatch` against Redux | Either local component state, a Zustand store (`packages/ui-core` exposes no stores itself — see Batch H), or props passed in by the consuming app |
| `redux-saga` side effects | TanStack Query (REST) or the `core/ws` channel subscriptions (see Batch H) in `apps/web`, never inside `packages/ui-core` components themselves — ui-core components must be presentational and backend-agnostic |
| `.scss` module + `ClassNames('hfui-x', ...)` | Plain `.css` using the CSS variables in `packages/ui-core/src/styles/tokens.css` (`--bg-primary`, `--fg-primary`, `--border-subtle`, `--accent`, `--bullish`, `--bearish`, extend this file with new tokens as needed — don't hardcode colors) |
| Bitfinex branding (logo, "Honey" naming, `@ufx-ui/*` imports, `bfx-*` npm deps) | Drop entirely. No `@ufx-ui/*` or `bfx-*` package may appear in `honba-fe`'s `package.json` at any point. |
| i18next strings | Plain English strings inline for now (i18n is out of scope per `docs/plan.md` §4) |

**Where things live:**
- Presentational, backend-agnostic, reusable components → `packages/ui-core/src/<Area>/<Component>.tsx`, exported from `packages/ui-core/src/index.ts`.
- Anything that needs to call honba's REST API, subscribe to `/ws`, or hold cross-app state → lives in `apps/web/src/features/<app>/` or `apps/web/src/core/`, and *composes* the presentational components from `@honba/ui-core`.
- If a bfx-hf-ui-core component mixes both (most of them do — it's a 2019-era app with no such separation), **split it**: the visual shell goes to `ui-core`, the data-fetching/state goes to the `apps/web` feature.

**Acceptance bar for every task:**
1. `npm run typecheck` and `npm run lint` pass at the repo root (runs both workspaces).
2. Every new component has at least one `vitest` render test (no snapshot tests — assert on real behavior/output).
3. No `@ufx-ui/*`, `bfx-*`, `redux`, `redux-saga`, `prop-types`, or `.scss` file introduced anywhere in the repo.
4. New CSS tokens, if any, are added to `packages/ui-core/src/styles/tokens.css`, not hardcoded in component files.
5. Commit message states which bfx-hf-ui-core path(s) the work is based on (for attribution traceability — see `packages/ui-core/NOTICE.md`).

**Do not start Batch H or Batch I tasks until at least one of Batch A/C/D is done** — they need
real components to wire up against, not placeholders.

---

## Batch A — `ui-core` atomic primitives (foundation, do this first)

**Port from** `src/ui/*` in the reference clone → **to** `packages/ui-core/src/ui/*`.

Components (17): `Button`, `Input`, `Dropdown`, `SimpleDropdown`, `Modal`, `Panel`, `PanelSettings`,
`Tabs`, `RadioButton`, `DatePicker`, `ProgressBar`, `Indicator`, `PLNumber` (a colored +/- P&L
number — keep this, it's genuinely reusable for a trading UI), `Scrollbars`, `AttentionBar`.

**Skip / replace, don't port:** `BitfinexIcon`, `HFIcon`, `CCYIcon`, `Icons`, `Markdown`,
`HistoryButton` — these are Bitfinex-branding or narrowly Bitfinex-specific (currency icon set
keyed to Bitfinex's symbol list). Use `lucide-react` for all iconography in honba-fe instead; if a
currency/instrument icon is needed later, that's a new honba-specific component, not a port.

No backend calls belong here — e.g. `Dropdown`/`DatePicker` take `options`/`value`/`onChange` as
props, same shape as the original, just typed and hook-based.

**Exit:** all 15 components exported from `packages/ui-core/src/index.ts`, each with a render
test. `apps/web`'s placeholder shell (`app-shell/shell.tsx`) can import and use at least `Button`
and `Panel` to prove the wiring works end to end (`npm run dev` renders them).

---

## Batch B — hooks

**Port from** `src/hooks/*` → **to** `packages/ui-core/src/hooks/*`.

Port as-is (generic, no Bitfinex coupling): `useToggle`, `useSize`, `useHover`, `useCountdown`,
`useModalFocus`.

**Do not port** `useAuthToken`, `useInjectBfxData`, `useWidgetMarket` — these are wired to
Bitfinex's own auth/data-injection mechanism. honba-fe's equivalents (auth token from honba's own
session, market data from `/ws`) belong in `apps/web/src/core/`, not in `ui-core`, and are covered
by Batch H.

**Exit:** 5 hooks ported with unit tests, exported from `packages/ui-core/src/index.ts`.

---

## Batch C — market/trading display widgets

**Port from** `src/components/{OrderBook,OrderBookPanel,Chart,ChartPanel,MarketSelect,
TimeFrameDropdown,ExchangeInfoBar,StatusBar}` → **to**
`packages/ui-core/src/market/*`.

This is the single most important batch — it's the direct "order book + chart" trading-view
payoff the whole honba-fe effort is for. Each component should end up **props-in, no
fetching**:
- `OrderBook` takes a normalized `{ bids: PriceLevel[], asks: PriceLevel[] }` prop (shape it
  however makes sense for rendering; document it in a `.ts` types file alongside the component) —
  the caller (an `apps/web` feature) is responsible for turning honba's `/depth/{id}` REST
  response or a `/ws` depth-channel message into that shape.
- `Chart`/`ChartPanel`: honba already has a proven, zero-dep, NSE/BSE-aware charting engine
  (`openalgo-charts`, used today in `honba-frontend/src/components/features/workbench/
  openalgo-chart.tsx`) — do **not** port bfx-hf-ui-core's own chart implementation. Instead build
  a thin `ChartPanel` wrapper in `ui-core` around `openalgo-charts`, using bfx-hf-ui-core's
  `ChartPanel` only for layout/toolbar UX reference (timeframe switcher, fullscreen toggle,
  symbol label placement).
- `MarketSelect`/`TimeFrameDropdown`: generic dropdowns, port directly using Batch A's `Dropdown`.
- `ExchangeInfoBar` → rename conceptually to `InstrumentInfoBar` (last price, change %, day
  high/low, volume) — same idea, not exchange-specific.
- `StatusBar` → connection/latency/clock status, same idea as bfx-hf-ui-core's, feed it props
  (`connected: boolean`, `latencyMs: number`, `serverTime: Date`) rather than reading Bitfinex's
  own connection singleton.

**Exit:** `OrderBook`, `ChartPanel`, `MarketSelect`, `TimeFrameDropdown`, `InstrumentInfoBar`,
`StatusBar` exported from `ui-core`, each with a render test using fixture data (no live backend
needed to test this batch).

---

## Batch D — order entry & position/balance widgets

**Port from** `src/components/{OrderForm,OrderHistory,AtomicOrdersTable,
AtomicOrdersTablePanel,AlgoOrdersTable,AlgoOrdersTablePanel,AlgoOrdersHistoryButton,
PositionsTable,PositionsTablePanel,BalancesTable,BalancesTablePanel,TradesTablePanel,
TradingStatePanel}` → **to** `packages/ui-core/src/trading/*`.

Map Bitfinex's order/position vocabulary to honba's (check `honba/schema/openapi/openapi.json`
for the real field names — this mapping is indicative, not authoritative):
- `OrderForm` → **order ticket**. honba's order placement is `POST /orders`; the form component
  itself just needs `onSubmit(orderDraft)` and validation, same as the original.
- `OrderHistory` + `AtomicOrdersTable` → **open/closed orders table**, backed by `GET /orders`.
- `AlgoOrdersTable`/`AlgoOrdersTablePanel`/`AlgoOrdersHistoryButton` → honba's algo/strategy
  orders if and when they exist as a distinct concept from plain orders (check with whoever owns
  `honba`'s order model before assuming a 1:1 mapping — may fold into the same table as atomic
  orders with a type badge instead of a separate component).
- `PositionsTable`/`PositionsTablePanel` → `GET /portfolio/positions`, close action →
  `POST /positions/close`.
- `BalancesTable`/`BalancesTablePanel` → `GET /portfolio/accounts` / `GET /portfolio/holdings`
  (balances in a crypto exchange ≈ holdings/cash in an equities broker — don't assume they're the
  same shape, check the schema).
- `TradesTablePanel` → `GET /portfolio/trades`.
- `TradingStatePanel` → `GET`/`PUT /trading-state` (this endpoint already exists in honba's API;
  read what it returns before designing the component).

Every table component here takes `rows: T[]` as a prop and renders with
`@tanstack/react-table` + `@tanstack/react-virtual` for large row counts — don't reimplement
bfx-hf-ui-core's manual table rendering.

**Exit:** components exported from `ui-core`, fixture-data tests passing. Wiring these to real
honba endpoints is Batch H/I's job, not this one.

---

## Batch E — strategy/algo-builder & backtest widgets

**Port from** `src/components/{StrategyEditor,StrategyLiveChart,StrategyOptionsPanel,
StrategyPerfomanceMetrics,StrategyTradesTable,StrategiesListTable,BacktestOptionsPanel,
BacktestProgressBar}` → **to** `packages/ui-core/src/strategy/*`.

honba already has a working, more advanced strategy builder in `honba-frontend`
(`algodesigner/*`: a node-graph editor with `@xyflow/react`, Monaco, AI chat — see
`docs/plan.md` §2 and §4). **Don't port `StrategyEditor` as a code editor** — honba-fe's
AlgoDesigner (Batch I) is getting Monaco + graph editing ported from `honba-frontend` directly,
which is a strict upgrade over bfx-hf-ui-core's CodeMirror-based editor.

What *is* worth porting from this batch: `StrategyPerfomanceMetrics` (metrics tile layout),
`StrategyTradesTable`/`StrategiesListTable` (table layouts), `BacktestOptionsPanel`/
`BacktestProgressBar` (run-config form + progress UX) — these map onto honba's
`POST /backtests`, `GET /backtests/{id}`, `GET /backtests/{id}/events`, `GET /sweeps` family.
`StrategyLiveChart` → same `ChartPanel` from Batch C with a trade-marker overlay, not a separate
component.

**Exit:** `PerformanceMetrics`, `StrategyTradesTable`, `BacktestOptionsPanel`,
`BacktestProgressBar` exported from `ui-core`.

---

## Batch F — app shell & layout chrome

**Port from** `src/components/{Navbar,Layout,GridLayout,LayoutControlToolbar,
NotificationsSidebar}` → **to** `packages/ui-core/src/shell/*` (layout primitives) and
`apps/web/src/app-shell/*` (the actual composed shell, which already has a placeholder at
`apps/web/src/app-shell/shell.tsx` — extend it, don't replace it).

**Skip entirely — these are Electron-specific, honba-fe is a browser web app:**
`SwitchMode`, `FullscreenModeBar`, `AppUpdateBar`, `HFUI`, `HFUIWrapper`. `CrashHandler` is worth
a from-scratch equivalent (a React error boundary) but don't port bfx-hf-ui-core's version
line-for-line — it's small enough to just write cleanly against React 19's error boundary APIs.

`GridLayout`/`LayoutControlToolbar` → this is the real docking-layout engine referenced in
`docs/plan.md` §3.3. Use bfx-hf-ui-core's `GridLayout` (it wraps `react-grid-layout`) purely for
UX reference on preset/reset-layout behavior; the plan's recommendation is to evaluate
`react-resizable-panels` vs `dockview` fresh rather than adopt `react-grid-layout` — resolve that
choice here if it hasn't been resolved yet, and note the decision in `docs/plan.md` §3.3 once made.

`NotificationsSidebar` → port the UX (toast list, severity colors, dismiss/clear-all), replace
its Redux-backed notification queue with a small Zustand store owned by `apps/web/src/core/store`
(not `ui-core` — notifications are app state, not a presentational primitive).

**Exit:** `apps/web`'s shell has a real top nav (app switcher + symbol search slot + account
status), bottom status bar, and a notification center; layout engine decision recorded in
`docs/plan.md`.

---

## Batch G — modals

**Port from** `src/modals/*`. Of the 18 modals in the reference, only these map to honba
concepts — **port only these, to `packages/ui-core/src/modals/*`:**
`ClosePositionModal`, `EditOrderModal`, `AppSettingsModal`, `CcyInfoModal` (rename
`InstrumentInfoModal`), `ActiveAlgoOrdersModal` (rename `ActiveOrdersModal`),
`AlgoOrderDetailsModal` (rename `OrderDetailsModal`), `RefillBalanceModal` (useful if/when honba
has a paper-trading balance reset flow — confirm this exists before porting, otherwise skip).

**Skip — these are Bitfinex account-lifecycle specific, no honba equivalent:**
`DMSRemovalDisclaimerModal`, `OldFormatModal`, `LongTermClosedSessionModal`, `CloseSessionModal`,
`NoConnectionActionModal`, `ResetAPIKeysModal`, `ResetDataConfirmModal`, `AOPauseModal`,
`DiscardAOEdit` (the latter two may resurface as AlgoDesigner-specific confirm dialogs later —
that's a `apps/web/src/features/algodesigner` concern, not a `ui-core` port, if/when needed).
`APIKeysConfigurateForm` → becomes the broker-connection form in Settings (Batch I / `docs/plan.md`
§4 Settings row), reusing Batch A's `Input`/`Button`, not ported as-is (Bitfinex's form fields
don't match any broker adapter's actual credential shape — check `honba-adapters` first).

Build all ported modals on Batch A's `Modal` primitive, not a new one.

**Exit:** modals exported from `ui-core`, each takes `isOpen`/`onClose`/domain-specific props,
no modal reads global state directly.

---

## Batch H — state layer (the actual architecture work, not a port)

This is **not** a port of `src/redux/*` — it's a from-scratch design informed by reading it.
Read `src/redux/{actions,constants,reducers,sagas,selectors}/*` in the reference clone to see what
state Bitfinex's app tracks (connection status, order book per symbol, open orders, positions,
balances, algo-order state, UI/modal state, notification queue), then design the honba-fe
equivalent in `apps/web/src/core/`:

- `core/ws/socket.ts` — one shared WebSocket connection to `/ws` (proxied to honba's
  `honba-api-rest::streams` route — **read that Rust file first**, this task doc hasn't inspected
  its message schema; design `channels.ts` against the real contract it exposes, not an assumed
  one).
- `core/store/` — Zustand stores: `useMarketStore` (quotes/depth per symbol), `useOrdersStore`,
  `usePositionsStore`, `useNotificationsStore`, `useLayoutStore` (persists to honba's
  `/profile/layouts`, per `docs/plan.md` §3.3).
- `core/api/` — TanStack Query hooks per REST resource (`useOrders`, `usePositions`,
  `usePortfolio`, `useInstruments`, `useQuote(symbol)`, etc.), using the codegen'd client once
  `honba/Makefile`'s `schema`/`client` targets are pointed at honba-fe (see `docs/plan.md` §3.4 —
  until that cutover edit happens, hand-write a thin typed client against
  `honba/schema/openapi/openapi.json` instead of blocking on it).

**Exit:** one end-to-end slice works — e.g. Workbench's `OrderBook` (Batch C) renders live data
from `/depth/{id}` or the `/ws` depth channel via a real `useMarketStore` subscription, against a
running `honba serve`.

---

## Batch I — pages / app routes

**Port from** `src/pages/{Trading,MarketData,Strategies,Authentication}` → **to**
`apps/web/src/features/{workbench,screener-or-market,algodesigner,settings}/` respectively, per
the feature map in `docs/plan.md` §4.

This batch is really "assemble the Batch A–H components into the actual honba-fe app routes," and
should be sequenced per `docs/plan.md` §6's phase table (Screener → Workbench → Portfolio →
AlgoDesigner → Simulator/Researcher → Settings), reimplementing each against `honba-frontend`'s
existing feature as the parity target (`docs/plan.md` §2), not against bfx-hf-ui-core's page
structure, which only really maps cleanly onto Workbench (`Trading`/`MarketData` pages) and
Settings (`Authentication` page → broker connection flow). `Strategies` page UX can inform
AlgoDesigner's results/list views but AlgoDesigner's actual editing surface comes from
`honba-frontend`, not bfx-hf-ui-core (see Batch E note).

**Exit:** matches the parity checklist in `docs/plan.md` §7, one app at a time.

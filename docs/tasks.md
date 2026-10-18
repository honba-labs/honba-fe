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

Batch J (below) draws on a second pinned clone, `bfx-report-ui`, pinned at commit
`a55d525f19e79adfd5b09b8e34c9461d65537556`, checked out locally at
`honba-fe/.reference/bfx-report-ui`. Same `.gitignore`d, read-only, Apache-2.0-licensed treatment
as above (it has a `LICENSE.md`, not a `LICENSE` file, but it's the same Apache License 2.0 text).
It additionally depends on Redux-saga, `react-i18next`, and `@blueprintjs/core` (a UI kit, not just
SCSS) — same porting rules apply, plus: drop `@blueprintjs/core` imports too, rebuild on Batch A's
primitives instead. If it's ever missing, recreate it with:

```
git clone https://github.com/bitfinexcom/bfx-report-ui.git .reference/bfx-report-ui
cd .reference/bfx-report-ui && git checkout a55d525f19e79adfd5b09b8e34c9461d65537556
```

Batch K (below) draws on a third pinned clone, `tbt-paper-terminal` (an independent, unaffiliated
open-source project — "TBT Exchange UI Kit" — not a Bitfinex repo), pinned at commit
`a82fab28f59d889837bf96e359a23b92ffca1e3d`, checked out locally at
`honba-fe/.reference/tbt-paper-terminal`. Same `.gitignore`d, read-only treatment as above. License
is Apache-2.0 (confirmed via both its `LICENSE` file and `package.json`'s `"license"` field), so the
same porting/rewrite rules apply. Stack differs from the other two clones: React **18.3** + TS +
Zustand + **CSS Modules** (`.module.css`, not `.scss` — already compatible with honba-fe's "no
`.scss`" rule) + `decimal.js` + `react-resizable-panels` + `lightweight-charts`, no Redux at all —
closer to honba-fe's own stack than the Bitfinex clones are. If it's ever missing, recreate it with:

```
git clone --depth 1 https://github.com/TheNewMikeMusic/tbt-paper-terminal.git .reference/tbt-paper-terminal
```

(it was cloned shallow/depth-1, so there is no older commit to `checkout` — depth-1 HEAD is the pin).

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

---

## Batch J — reporting & history widgets

**Port from** `src/components/{Ledgers,Movements,TaxReport,Snapshots,PositionsAudit,
ConcentrationRisk,WeightedAverages,FeesReport,AccountBalance,OrderTrades}` (in the
`bfx-report-ui` clone, see Shared conventions above) → **to** `packages/ui-core/src/reports/*`.

These are account-history views honba-fe has no equivalent of yet — Batch D's tables are all
*live/current-state* (open orders, current positions, current balances); this batch is
*historical/derived* reporting, which is genuinely new capability:
- `Ledgers` → **LedgerHistory**, the full transaction journal (trades, fees, transfers,
  adjustments) — maps to a `GET /ledgers`-shaped honba endpoint once one exists.
- `Movements` → **MovementsHistory**, deposit/withdrawal lifecycle with status.
- `TaxReport` → **TaxReport**, realized gains/losses — directly useful for India STCG/LTCG
  reporting, which bfx-hf-ui-core has no equivalent of at all.
- `Snapshots` → **PortfolioSnapshots**, point-in-time portfolio valuation history.
- `PositionsAudit` → **PositionAuditTrail**, historical position-change log (distinct from Batch
  D's live `PositionsTable`).
- `ConcentrationRisk` → **ConcentrationRisk**, exposure-by-instrument risk report.
- `WeightedAverages` → **WeightedAverageCost**, average cost basis per instrument.
- `FeesReport` → **FeesReport**, fees-paid-over-time report.
- `AccountBalance` → **PortfolioValueChart**, a historical net-worth/equity-curve chart — reuse
  Batch C's `ChartPanel`/`openalgo-charts` for rendering, port only the data-shaping/filter UX.
- `OrderTrades` → **OrderFills**, the fills belonging to a single order (complements Batch D's
  `OrderHistory`, which is order-level, not fill-level).

**Skip entirely:** `FundingCreditHistory`, `FundingLoanHistory`, `FundingOfferHistory`,
`FundingPayment`, `LoanReport`, `StakingPayments`, `PublicFunding`, `Derivatives` — crypto
margin-funding/staking/perps concepts with no equities equivalent. `Candles`, `Tickers`,
`PublicTrades`, `Wallets` — duplicate Batch C's market-data components or Batch D's
`BalancesTable`. `AccountSummary`, `TradedVolume`, `AverageWinLoss` — dashboard-tile variants of
`FeesReport`/`PortfolioValueChart`, low priority, skip for now. `AffiliatesEarnings`,
`AppDownload`, `AppUpdateToast`, `Auth`, `ChangeLogs`, `ElectronMenu`, `ErrorDialog`,
`ExportDialog`/`ExportFailDialog`/`ExportSuccessDialog`, `ExtraInfoDialog`, `GoToRangeDialog`,
`MaintenanceDialog`, `PaginationDialog`, `Preferences`, `SubAccounts`, `TaxPrecisionDialog`,
`Header`, `Main`, `Status`, `Logins` — Bitfinex account-lifecycle/app-chrome specific, no honba
equivalent.

All ten components here also drop `redux-saga`/`react-i18next`/`@blueprintjs/core` per the
porting table above; tables use `@tanstack/react-table` like Batch D's.

**Exit:** `LedgerHistory`, `MovementsHistory`, `TaxReport`, `PortfolioSnapshots`,
`PositionAuditTrail`, `ConcentrationRisk`, `WeightedAverageCost`, `FeesReport`,
`PortfolioValueChart`, `OrderFills` exported from `ui-core`, each with a render test using
fixture data. Wiring to real honba endpoints is a Batch H/I-style follow-up, not this task.

---

## Batch K — paper-trading engine & risk/diagnostics widgets

**Port from** `src/{store/tradingStore.ts, store/automationStore.ts, components/{RiskRibbon,
AccountRibbon, DataConfidenceBar, ObservabilityPanel, AutomationPanel}}` (in the
`tbt-paper-terminal` clone, see Shared conventions above) → **to** `packages/ui-core/src/{market,
trading}/*` for the presentational pieces, `apps/web/src/core/paper-trading/` for the
matching-engine logic (per the shared porting table's "split mixed components" rule — this repo's
store files mix business logic and persistence, same as bfx-hf-ui-core's Redux files did).

- `tradingStore.ts`'s client-side order-matching engine — stop-limit, take-profit-limit, OCO, and
  trailing-stop conditional orders, all checked against a live order book with simulated fill
  delay/fee and a `resetAccount()` action — is genuinely new capability: a **live-quote
  paper-trading matching engine**, distinct from the historical-replay engine already planned for
  the Simulator app (`docs/plan.md` §6 Phase 6). This directly answers the open question Batch G
  flagged for `RefillBalanceModal` ("useful if/when honba has a paper-trading balance reset flow —
  confirm this exists before porting, otherwise skip"): `resetAccount()` here is exactly that flow.
  Treat this as design-reference only for now — rewrite the order-state machine against honba's
  own order/fill/position shapes (`honba/schema/openapi/openapi.json`), and confirm with whoever
  owns honba's order model whether a distinct "paper mode" is wanted before building
  `core/paper-trading/` for real.
- `automationStore.ts` + `AutomationPanel`/`TriggerForm`/`TriggerList`/`ExecutionLogList` →
  **PriceTriggerPanel**, a price-cross-condition → auto-order/alert trigger system, simpler than a
  full strategy graph — complements rather than duplicates AlgoDesigner (Batch E/I). Port the
  tabbed layout (active/create/logs) and execution-log UX; rewrite trigger matching against
  honba's own quote stream.
- `RiskRibbon`/`AccountRibbon` → **RiskSummaryRibbon**, a compact top-of-view strip (position size
  as % of portfolio, unrealized P&L %, a volatility/risk score) — no honba-fe equivalent yet,
  reusable across Workbench and Portfolio.
- `DataConfidenceBar` + its `DiagnosticsDrawer` → **DataConfidenceBar**, a connection-health strip
  with a drill-down diagnostics panel (staleness, confidence score, network-event log) — a
  companion to Batch C's `StatusBar`, not a replacement for it.
- `ObservabilityPanel` → **DebugLogPanel**, a leveled (debug/info/warn/error) structured log viewer
  for market-data/system events — dev-facing and low priority, but cheap to port and useful during
  Batch H's WS integration work.

**Skip entirely:** `Wallet/{DepositDrawer,WithdrawDrawer,LinkedMethodsPanel,OnboardingGuide,
StatusCard,AccountOverviewCard,AssetBalancesPanel,LedgerTable}` and `AvatarUpload` — crypto-exchange
account-funding/KYC UI (hardcoded list of 30+ crypto assets, deposit/withdraw chain selection), no
honba equivalent; equities broker funding, if ever needed, belongs in `honba-adapters`, not here.
`LanguageToggle` and the `i18n/locales` files — i18n is out of scope per `docs/plan.md` §4, same
exclusion as Batch J. All of `src/pages/mobile/*`, `src/components/mobile/*`, `BottomNav`,
`BottomTabs` — honba-fe's shell is desktop-first per `docs/plan.md` §3.2 with no mobile nav pattern
defined; revisit only if a mobile phase is scoped later. `worker/{marketDataWorker,orderbook}.ts`
(WebWorker-offloaded order-book delta merge/throttled dispatch) is an architecture pattern, not a
component — worth reading as a performance-reference note for Batch C/H's order-book update path if
`OrderBook` ever shows jank under high-frequency ticks, but not a port target for this batch.
`ThemeToggle`/`SoundToggle`/`ShortcutsHelp` are trivial one-off toggles, not worth a dedicated port.

**Exit:** `RiskSummaryRibbon`, `DataConfidenceBar` (+ `DiagnosticsDrawer`), `DebugLogPanel`
exported from `ui-core`, each with a render test using fixture data. The paper-trading
matching-engine design (`apps/web/src/core/paper-trading/`) and `PriceTriggerPanel` are flagged as
`apps/web`-level follow-ups pending sign-off from whoever owns honba's order/paper-trading
semantics — not blocking for this batch's `ui-core` exports.

# honba-fe handoff (2026-10-19) — resume: Batch I remaining slices (AlgoDesigner → Simulator/Researcher, plus the broker-credential Settings form); slices 1–5 of Batch I are done. Batch H complete.

## State: Batches A–H done and committed; Batch I slices 1–5 (Portfolio, Workbench order entry, Workbench dockview workspace, Screener, Settings) are committed. AlgoDesigner, Simulator and Researcher routes are still placeholders. Nothing below is pushed.

Commit ladder (Batch I on top; earlier Batch H/G/F/E entries via `git log`):

```
a4d32fb Batch I slice 5: Settings route — profile-layout-preset management (GET /profile/layouts + DELETE /profile/layouts/{name}) and the Batch G AppSettingsModal persisted into the profile via PUT /profile compare-and-swap; client getScreenerScan/putProfile + hooks useProfile/useLayouts/usePutProfile/useDeleteLayout; Screener+Settings routes wired in main.tsx
72ee112 Batch I slice 4: Screener route — server-evaluated scans through GET /screener/scan (JSON-array universe, JSON-encoded AND-combined filter group, results table with one column per metric key), explicit-run only
555b939 Batch I slice 3: Workbench becomes a dockview workspace — default layout is a serialized preset (grid.root group view-states + panels map), the live document round-trips /profile/layouts via useLayoutStore + LayoutControlToolbar save; ticket/working-orders slices moved onto a shared workspace selection store (useWorkbenchSelection)
b03bd94 Batch I slice 2: Workbench order entry — OrderForm ticket posts through POST /orders, Working Orders reconciled into useOrdersStore, DELETE cancel, route page split (WorkbenchPage is a thin wrapper over WorkbenchWorkspace)
0a8b9ea Batch I slice 1: Portfolio route — PortfolioPage (Account/Positions tab with ClosePositionModal → POST /positions/close, Trade History from /portfolio/trades), portfolio wire types + typed client + query hooks
```

Batch H landed before those (ac7ab…40671c5: wire mirrors/client → LiveSocket polling gateway → Zustand stores → query hooks → exit slice; see `git log`). Batch K survey diff in `docs/plan.md`/`docs/tasks.md` is **deliberately uncommitted** — never bundle it into Batch I commits.

## What Batch I decided and shipped (this session)

1. **Sequencing followed plan.md §6** (Screener → Workbench → Portfolio → Settings), TDD red-first, one commit per slice by explicit path, all green (apps/web vitest **79/79**, `tsc --noEmit`, eslint, `vite build`; ui-core untouched this session).
2. **`POST /positions/close` is bodyless and closes ALL positions** (honba-ya-api-rest/src/orders.rs). PortfolioPage's ClosePositionModal confirm therefore fires close-all and its notification says exactly that — do not "fix" it into a per-position call.
3. **Order draft → wire mapping** (`OrdersRequest`): `trigger_price` / `trail_*` are dropped (the wire type has them not); `client_order_id` auto-generated as `hb-${crypto.randomUUID()}` per submit; wire `Order` → table row maps `filled_at` → ISO string and drops `gtd` (the column isn't rendered).
4. **dockview v8.6.0 serialization format — probe-verified fact**: the saved document is the verbatim `SerializedDockview` shape — `grid: {orientation:'HORIZONTAL', height, width, root:{type:'branch', data:[leaf groups carrying group view-states {id, views:[panelId], activeView}]}}`, plus a `panels` map keyed by panel id `{id, contentComponent, title}`, plus `activeGroup`. The earlier imagined "grid branch of leaf nodes with {component, tab}" shape silently no-ops (`root must be of type branch`, then silence).
5. **Boot workspaces from a serialized preset, never imperative `addPanel`**: under jsdom `addPanel` folds all panels into ONE group, and inactive tabs inside a group do not render their content DOM at all — a serialized document is the only deterministic path that mounts every preset for tests and "default layout" alike. The default layout and a saved layout share one code path by construction.
6. **jsdom stubs for dockview (+ virtualized tables)**: `ResizeObserver` stub plus `clientHeight/clientWidth/offsetHeight/offsetWidth` = 600–700 on `HTMLElement.prototype`. Batch H tests needed the same stubs once the Workbench became a dockview host.
7. **Test-pollution gotchas worth remembering**: module-level Zustand stores leak between tests — `useWorkbenchSelection.getState().setSelected(null)` must be reset in `WorkbenchPage.test`'s `beforeEach`; and the ticket's order upsert lives on the `placeOrder.mutate(..., { onSuccess })` callback (losing it made the "row appears" assertion hang). dockview tab accessible names are the panel *title* when booted from a document with `title`s.
8. **Screener contract facts** (verified against honba-ya + honba-me/honba-kokoro sources): `universe` is a REQUIRED JSON-array *string* at runtime (`missing_universe` 422) even though the OpenAPI schema marks it optional; `filters` is a JSON-encoded `{operator:'AND'|'OR', items:[{key,op,value}]}`; `op` vocabulary is snake_caseFilterOp (`eq neq gt gte lt lte between in not_in like has crosses_above crosses_below` — page exposes 9); metric keys the evaluator supports today: `open high low close volume price_52_week_low price_52_week_high rsi` and `sma<N>`. A scan answers `ScreenerResponse {rows:[{instrument_id, metrics}]}` where `metrics` carries exactly the keys the filter group reads. Page runs scans **explicitly only** (`staleTime: Infinity`, enabled-gated) — reading bars server-side is expensive.
9. **Settings via `PUT /profile` CAS**: the profile is one document with a monotonic `revision`; writes are read-modify-write with the read revision (stale → 409 `revision_conflict`, surfaced inline; retry by reopening). SettingsPage manages named layout presets (list + delete; *saving* stays in the Workbench toolbar) and runs the Batch G `AppSettingsModal`, merging its patch into `preferences` on the whole-document PUT. `PUT /profile` answers the stored profile (bumped revision).
10. **Open owner item unchanged**: broker/adapter credential management (Settings form) waits for the `honba-adapters` contract; SettingsPage carries an explicit deferred note.

## Remaining Batch I scope (resume here)

- **AlgoDesigner** (route is a placeholder): the largest single port — node graph (`@xyflow/react` 12.12.0, already installed), Monaco Python editor with code↔graph round-trip, AI chat column, param/sweep panels, save-to-library (plan.md §6 row 5; budget accordingly).
- **Simulator**: replay engine, equity curve, monthly heatmap, trade journal, multi-chart, drawing canvas (§6 row 6). Note Batch K's tbt-paper-terminal survey flags a possible "live paper mode" that needs an order-model owner sign-off first — don't absorb it silently.
- **Researcher**: at whatever fidelity `honba-frontend` currently has (early stage).
- **Settings**: the broker-credential form (blocked on honba-adapters).

## Interpretation notes for the next steps (docs/tasks.md §Batch I tail + §Batch J)

- Parity target per route is `honba-frontend`'s app (`docs/plan.md` §4/§7), not bfx-hf-ui-core's page structure; bfx informs only Workbench-like layouts and the Settings Authentication flow.
- Workbench with the real dataset: `GET /depth/{id}` answers `404 market_data_unavailable` (retryable) — no order-book source exists server-side today; the page follows designed failure paths (reconnecting → failed). Quotes work. When a depth source lands, the FE lights up unchanged.
- Small LiveSocket follow-up (Batch H note): non-retryable `HonbaApiError`s currently count toward the read-failure threshold; a fast-path `failed` on `retryable === false` would be slightly nicer.
- Batch J (reporting widgets) maps `bfx-report-ui` sources to historical/derivative views and needs new honba endpoints for some — read its brief before touching report UI.

## Still-valid operating notes (don't re-litigate)

- Batch mode: decisions on record live in `docs/plan.md` §0/§3.3/§3.4; keep moving without re-asking.
- **TypeScript pinned to exact `6.0.3`** in both workspaces — `@typescript-eslint/parser` hard-crashes on TS 7.x. Don't bump until upstream ships TS7 support.
- ui-core stays strictly presentational/backend-agnostic (no fetch/WS/Zustand; those are apps/web's job). Every ui-core unit: own folder with `.tsx` + `.css` + `.test.tsx` + `index.ts`, exported append-only from `src/index.ts`. Banned imports: `@ufx-ui/*`, `bfx-*`, `redux`, `redux-saga`, `prop-types`, `.scss`. CSS comments must be `/* */` (lightningcss).
- jsdom stubs: tables need `ResizeObserver` + sized element props; dockview facts are in items 5–7 above.
- Wire-mirror rule: `core/types/messages.ts` is hand-written, pinned to API_VERSION `1.0.0` / SCHEMA_VERSION `4`; verify against `honba/schema/openapi/openapi.json` (now at `honba-ya/schema/openapi/openapi.json`) and the honba-ya-api-rest sources; swap for codegen at the `honba/Makefile` cutover by deleting the file.
- Env rules: never build in /tmp; commit by explicit path, no Co-Authored-By/any trailer; TDD red-first; nothing pushed; verify `git log`/`git status` before and after committing (a past concurrent agent logged two catches).
- A live `honba serve` may be running on 127.0.0.1:8000 — do NOT kill it; it was used to verify wire shapes.

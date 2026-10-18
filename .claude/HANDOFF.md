# honba-fe handoff (2026-10-19) — resume: Batch I (pages / app routes); Batch H is complete

## State: Batches A–H done and committed. The component dashboard (/components) shows batches A–G; /workbench is a real, live page as of Batch H. Nothing below is pushed.

Last committed state on top of `211920b` ("Update handoff note: Batch G complete, resume at Batch H"):

```
40671c5 Batch H slice 5: end-to-end exit — Workbench feeds the OrderBookPanel live from /depth via the LiveSocket singleton + useMarketStore; shell + StatusBar wired to real connection status
04462da Batch H slice 4: TanStack Query hooks per REST resource with envelope-aware retry policy (core/api/query)
dc03ccf Batch H slice 3: Zustand domain stores (market quotes/depth, orders, positions, connection status, layouts persisted to /profile/layouts) — apps/web core/store
b5ac36f Batch H slice 2: core/ws LiveSocket gateway — transport-agnostic, ref-counted channel subscriptions, polling transport default (no server-side /ws exists; see plan.md §3.4 inspection)
ac7efa2 Batch H slice 1: hand-written wire mirrors + typed REST client for the ResponseEnvelope contract (apps/web core/{api,types})
ab7af32 Record Batch H streaming inspection: /ws is SSE backtest-replay only; polling-transport LiveSocket design
```

## What Batch H decided and shipped (this session)

1. **The `/ws` assumption was wrong and is now recorded**: `honba-ya-api-rest/src/streams.rs` is
   SSE for *backtest replay* only (`GET /backtests/{id}/events`), `honba-ya-ws` is an internal
   broadcast bus with no HTTP surface, and `honba serve` (honba-ya's real binary) exposes **no
   WebSocket route at all**. plan.md §3.4 has the full inspection note; do not re-litigate.
2. **State layer lives in `apps/web/src/core/`**: hand-written wire mirrors
   (`core/types/messages.ts`, pinned to API_VERSION `1.0.0` / SCHEMA_VERSION `4` — swap for
   codegen at the `honba/Makefile` cutover by deleting the file), typed REST client
   (`core/api/client.ts`, one envelope-validation concern, `HonbaApiError` carries
   `ErrorDetail.retryable`), TanStack Query hooks (`core/api/query.ts`, retry only when the
   envelope says retryable), LiveSocket gateway (`core/ws/socket.ts` — ref-counted channels,
   polling transport default, status machine idle→connecting→live→reconnecting→failed),
   stores (`market`, `orders`, `positions`, `connection`, `layout`), and `core/liveSocket.ts`
   singleton wiring gateway status → `useConnectionStore`.
3. **Exit slice shipped**: `/workbench` is a real page (replaced the placeholder) —
   MarketSelect → socket subscribe → `useMarketStore` → `OrderBookPanel`, and the shell
   topbar/StatusBar reflect real connection status. Verified green: apps/web 65/65 vitest +
   `tsc --noEmit` + eslint + `npm run build`; ui-core untouched.
4. **Verified against a running `honba serve`**: envelope + instruments + quotes wire shapes
   match messages.ts exactly (curl'd a live server on 127.0.0.1:8000 — it was already up in this
   workspace; don't kill it). **The local dataset holds bars only, no order book**: `GET
   /depth/{id}` answers `404 market_data_unavailable` (retryable), so on real data today the
   Workbench follows the designed failure path (reconnecting → failed). Quotes work. When a
   depth source lands server-side, the page lights up with zero FE changes.
   Known follow-up (small): LiveSocket treats non-retryable `HonbaApiError`s like any other
   failure (counts to the read-failure threshold) — a fast-path `failed` on `retryable === false`
   would be slightly nicer.
5. `useNotifications` was left exactly where Batch F put it (`core/store/notifications.ts`),
   per the handoff's fold-not-recreate rule; Batch H's stores join the same family.

## What Batch G decided and shipped (this session)

1. **`RefillBalanceModal` skipped per the brief's confirmation requirement**: the reference
   itself is a stub (both callbacks are commented out — `// todo`), and no paper-balance
   reset/refill flow exists anywhere in `honba-core` (Rust src: decision/error/lib/market/
   order/types only) or `honba-adapters`. Revisit if honba grows one; noted in the ui-core
   index.ts export block.
2. **The 6 modals, all in `packages/ui-core/src/modals/<Name>/` (own folder discipline,
   23 new tests)**, all built on Batch A's `Modal` (isOpen/onClose/domain props in, intents
   out, zero global reads):
   - `ClosePositionModal` — confirm-close warning (icon + position summary + OK/Cancel);
     `onConfirm()` hands the close intent to the caller (Redux/`authToken` dropped).
   - `EditOrderModal` — honba-fied: amends quantity/price of a working Batch D `Order`
     (the reference's `bfx-hf-algo` AO-edit machinery + OrderForm field-rendering framework
     don't exist in honba; a full type/TIF rewrite stays cancel-and-replace at the feature
     layer). Client validation + caller `error` prop (broker 400) as red AttentionBar;
     update gated until a real change is made; emits `OrderPatch`.
   - `AppSettingsModal` — theme (dark/light) + status-bar clock (24h/12h) only; caller-owned
     state via `settings` + `onChange(patch)` (persistence = `PUT /profile/settings`, Batch
     H). Reference's ApiKeys/About/Beta/OverrideTimer tabs dropped: ApiKeys becomes the
     broker-connection Settings form (Batch I, needs `honba-adapters` credential shape —
     still the one open owner item), the rest are Bitfinex/Electron.
   - `InstrumentInfoModal` (rename of `CcyInfoModal`) — trusted server article HTML via
     `dangerouslySetInnerHTML` + the reference's anchor hardening (target/rel post-pass);
     article arrives as props (fetch wiring = Batch H), coingecko widget theming dropped.
   - `ActiveOrdersModal` (rename of `ActiveAlgoOrdersModal`) — reconnect resume/cancel over
     plain working Orders (no AO subsystem): per-row checkboxes + select-all, Cancel
     selected / Resend selected gated on selection, green AttentionBar when
     `restoredAfterReconnect`. Deliberate change: closing the modal is a no-op (the
     reference wired Escape/outside-click to cancel-all — that must never be an implicit
     order-routing shortcut in honba); main/paper split collapsed to one list.
   - `OrderDetailsModal` (rename of `AlgoOrderDetailsModal`) — order fact grid + fills
     table (Batch D `Trade[]`); export button only renders with `onExport` (saveAsJSON
     stays app-owned so filenames/toasts match Batch H conventions).
3. **ui-core `Modal` accessible-name fixed** (the one carry-over from the F handoff): title
   is now an `<h1>` wired via `useId` as `aria-labelledby`, so dialogs are addressable —
   `getByRole('dialog', { name })` — and the old dashboard `.hb-modal__close` workaround
   test still passes untouched. Also added the reference Dialog's `width` prop
   (inline `min(<n>px, 90vw)`; used by the G modals at 480–980px). New tests in
   `Modal.test.tsx` cover both (6 total).
4. **Shared `.hb-modal-footer`** CSS lives in ClosePositionModal's stylesheet (right-aligned
   buttons, top border) — reused by the other modals; ui-core's Modal primitive stays
   footer-free deliberately.
5. **Dashboard**: `demos-modals.tsx` (6 tiles — one per modal, each with local open state
   and its intents rendered inline as JSON via a small `IntentBox`), section
   `Batch G — Modals`, nav regex widened to `^Batch [A-G] — `, test updated to 7 sections +
   a new interaction test (open close-position → OK → intent recorded; settings dialog
   resolved by its now-named role).

Verified this session: `tsc --noEmit` and `eslint src` green in **both** workspaces;
`vitest run` **248/248** in `packages/ui-core` and **14/14** in `apps/web`; `npm run build`
green in all workspaces.

## Interpretation notes for Batch H (docs/tasks.md §Batch H)

- **Read `honba-api-rest::streams` (the `/ws` Rust route) FIRST** — §H explicitly says its
  message schema hasn't been inspected; design `core/ws/channels.ts` against the real
  contract, not an assumed one.
- Fold the existing app-local notifications store (`apps/web/src/core/store/notifications.ts`,
  Batch F) into the `core/store/` family rather than recreating a
  `useNotificationsStore` from scratch.
- API client: today post-cutover hand-write a thin typed client against
  `honba/schema/openapi/openapi.json` if the `honba/Makefile` codegen targets aren't pointed
  at honba-fe yet (plan.md §3.4) — don't block on the Makefile edit.
- `dockview-react` (installed since Batch F, spike-approved) still has zero usages — its
  first real consumer is the Workbench layout work in H/I; remember `useLayoutStore`
  round-trips `api.toJSON()/fromJSON()` onto honba's `/profile/layouts`.
- Exit criterion is an end-to-end slice: Workbench OrderBook rendering live `/depth` or
  `/ws` depth-channel data through a real `useMarketStore` subscription.

## Still-valid operating notes (don't re-litigate)

- Batch mode: decisions on record are in `docs/plan.md` §0/§3.3; keep moving without
  re-asking. Only genuinely open item left: broker-credential shape (Batch I's Settings
  form, needs `honba-adapters`).
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
- A second agent applied changes concurrently during Batch E/F (two catches logged there);
  Batch G ran clean — verify `git log`/`git status` before and after committing anyway.

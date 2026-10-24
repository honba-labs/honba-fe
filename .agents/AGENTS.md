# `honba-fe` Agent Guidelines & Architecture Invariants

**Subsystem**: Frontend (Web Desktop Trading Application)
**Language**: TypeScript / React (Next.js / Vite)
**Primary Responsibility**: Professional multi-window trading terminal, Dockview workspaces, real-time depth, screener, and portfolio management.

---

## 1. Role & Architectural Hints
* `honba-fe` is the flagship browser trading terminal:
  1. **Dockview Serialization**: Workspaces boot from a serialized preset (never imperative `addPanel`). Serialized preset guarantees layout determinism under tests and browser.
  2. **LiveSocket Polling & WebSocket Gateway**: Subscribes to real-time order updates, position changes, and market quotes from `honba-ya-api-rest`.
  3. **Emergency Route Contract**: `POST /positions/close` closes ALL positions server-side; confirm modals must reflect this contract.
  4. **Strict TypeScript Pinning**: TypeScript is pinned to `6.0.3` (due to `@typescript-eslint/parser` compatibility).
  5. **UI-Core Presentational Purity**: `packages/ui-core` stays strictly presentational/backend-agnostic (no fetch/WS/Zustand; those are `apps/web`'s responsibility).
* **Idea Inheritance**:
  - **Bitfinex UI / OpenAlgo**: Professional desktop-style multi-dock financial layout and widget system.

---

## 2. Coding Guidelines (TDD & State Isolation)
* **TDD & Parallel Tests**: Unit tests live parallel to component modules (`*.test.tsx`).
* **Test Pollution Guard**: Zustand stores leak between tests; store state must be reset in `beforeEach`.
* **jsdom Stubs**: Dockview and virtualized tables require `ResizeObserver` and mock element dimensions in test setup.
* **Check .agents/HANDOFF.md**: Always read `.agents/HANDOFF.md` before starting any slice.

---

## 3. Development & CI Workflow
* **Linting & Typechecking**:
  ```bash
  npx tsc --noEmit
  npm run lint
  ```
* **Testing**:
  ```bash
  npm test
  ```
* **Build**:
  ```bash
  npm run build
  ```

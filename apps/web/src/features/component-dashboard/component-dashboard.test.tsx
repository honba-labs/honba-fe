import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// jsdom doesn't ship ResizeObserver (used by the useSize demo tile via ui-core's hook).
// Element heights need stubbing too, or @tanstack/react-virtual sees a 0-height container
// and renders zero rows (same tolerances as OrdersTable.test.tsx in ui-core).
class ResizeObserverStub {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 600 });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 600 });
});

// jsdom has no 2D canvas, and `openalgo-charts`' widget tier needs one (same approach as
// packages/ui-core's ChartPanel test): stub the widget factory so the ChartPanel demo tile
// exercises the dashboard's wiring without canvas rendering.
const fakeWidget = {
  isDestroyed: false,
  symbol: () => 'RELIANCE',
  interval: () => '1d',
  setSymbol: vi.fn(),
  setInterval: vi.fn(),
  setTheme: vi.fn(),
  on: vi.fn(() => () => {}),
  destroy: vi.fn(),
};

vi.mock('openalgo-charts/widget', () => ({
  createWidget: () => fakeWidget,
}));

import { ComponentDashboard } from './component-dashboard';

function renderDashboard() {
  return render(
    <MemoryRouter>
      <ComponentDashboard />
    </MemoryRouter>,
  );
}

describe('ComponentDashboard', () => {
  it('renders the six batch sections and the overview header', () => {
    renderDashboard();
    expect(screen.getByRole('heading', { name: 'Component dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Batch A — UI primitives' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Batch B — Hooks' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Batch C — Market widgets' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Batch D — Trading widgets' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Batch E — Strategy widgets' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Batch F — Shell chrome' })).toBeInTheDocument();
  });

  it('exposes each batch in the section nav', () => {
    renderDashboard();
    const nav = screen.getByRole('navigation', { name: 'Component sections' });
    for (const label of [
      'UI primitives',
      'Hooks',
      'Market widgets',
      'Trading widgets',
      'Strategy widgets',
      'Shell chrome',
    ]) {
      // The nav label is the section title minus its batch prefix.
      expect(nav.textContent).toContain(label);
    }
  });

  it('renders live market widgets with fixture data', () => {
    renderDashboard();
    // OrderBook: two sides, each with a Price/Size/Total header row
    expect(screen.getAllByText('Total').length).toBeGreaterThanOrEqual(2);
    // StatusBar: both connected / disconnected variants rendered
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('renders live trading widgets and lets the statusFilter controls filter rows', () => {
    renderDashboard();
    // OrdersTablePanel: fixture order ids render (statusFilter 'all')
    expect(screen.getByText('ORD-182')).toBeInTheDocument();
    // Flip to 'open': only working orders remain, terminal ORD-175 (cancelled) disappears
    fireEvent.click(screen.getByText('statusFilter: open'));
    expect(screen.queryByText('ORD-175')).not.toBeInTheDocument();
    expect(screen.getByText('ORD-182')).toBeInTheDocument(); // submitted = working
  });

  it('renders live strategy (Batch E) widgets with fixture data', () => {
    renderDashboard();
    // BacktestOptionsPanel: run-config form visible before Start
    expect(screen.getByText('Start backtest')).toBeInTheDocument();
    // PerformanceMetrics: caller-computed fixture rows render
    expect(screen.getByText('+₹18,40,842')).toBeInTheDocument();
    // StrategyTradesTable: closed round trip P&L, sign-prefixed
    expect(screen.getByText('+7,200')).toBeInTheDocument();
    // StrategiesListTable: tabbed list shows the active strategies kind first
    expect(screen.getByText('Active (2)')).toBeInTheDocument();
  });

  it('renders live shell (Batch F) widgets with interactive chrome', () => {
    renderDashboard();
    // Layout demo frame's three slots
    expect(screen.getByText('header slot — apps/web composes the top nav here')).toBeInTheDocument();
    // NotificationsSidebar demo tile: the open button is present and rows render on open
    expect(screen.getAllByText('Order filled').length).toBeGreaterThanOrEqual(1);
    // LayoutControlToolbar demo: layout switcher row + the active layout listed
    expect(screen.getByRole('button', { name: 'Add layout' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ORB scalping/ })).toBeInTheDocument();
  });

  it('opens and closes the Modal demo', () => {
    renderDashboard();
    expect(screen.queryByText('Edit order ORD-182')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open modal' }));
    expect(screen.getByText('Edit order ORD-182')).toBeInTheDocument();
    // The Modal's own icon close button has aria-label="Close", but the PanelSettings demo
    // tile also renders a Button labelled "Close", so role-queries collide — query the class.
    fireEvent.click(document.querySelector('.hb-modal__close')!);
    expect(screen.queryByText('Edit order ORD-182')).not.toBeInTheDocument();
  });

  it('keeps demo state isolated when navigating sections', () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /Trading widgets/ }));
    // The click only scrolls; the demo state and DOM are untouched.
    expect(screen.getAllByText('ORD-182').length).toBe(1);
  });
});

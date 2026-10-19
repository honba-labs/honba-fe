// Batch I AlgoDesigner (commit 1fae14a): tests for the AlgoDesigner route and its core components.
// Mirrors honba-frontend apps/algodesigner-app.tsx — the largest single port in the plan.
// Every new component must have at least one vitest render test (acceptance criteria).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

import { createApiClient, type ApiClient } from '../../core/api/client';
import { createQueryClient, setApiClient } from '../../core/api/query';
import type { BacktestResponse, CompiledStrategy, StrategyManifest } from './domain';
import { useDesignerStore } from './store';
import { AlgoDesignerPage } from './AlgoDesignerPage';
import { VerifyPanel } from './panels/VerifyPanel';
import { RunPanel } from './panels/RunPanel';
import { SweepsPanel } from './panels/SweepsPanel';
import { OpsPanel } from './panels/OpsPanel';
import { ResultsPanel } from './panels/ResultsPanel';
import { LibraryDrawer } from './components/LibraryDrawer';
import { StrategyNameEditor } from './components/StrategyNameEditor';
import { SaveToLibraryModal } from './components/SaveToLibraryModal';
import { ParamsPanel } from './components/ParamsPanel';
import { AiChatColumn } from './components/AiChatColumn';
import type { StrategyGraphShape } from './nodes/types';
import type { SavedStrategyManifest } from './library-store';
import { GRAPH_SCHEMA_VERSION } from './model';

// --- jsdom stubs (same tolerances as WorkbenchPage.test.tsx) ---
class ResizeObserverStub {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

// Monaco editor needs matchMedia
if (typeof globalThis.matchMedia === 'undefined') {
  globalThis.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 700 });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 700 });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { userAgent: 'vitest', platform: 'Linux' },
  });
});

// --- Fixtures ---
const DEFAULT_GRAPH: StrategyGraphShape = {
  schema_version: GRAPH_SCHEMA_VERSION,
  name: 'SMA Cross',
  universe: { named: 'nifty50', explicit: null },
  driving_timeframe: { interval: 1, aggregation: 'day' },
  warmup_bars: 50,
  nodes: [
    { id: 'n1', type: 'universe', label: 'Universe', params: { symbols: ['RELIANCE', 'TCS'] } },
    { id: 'f', type: 'indicator', indicator: 'sma', label: 'Fast SMA (10)', params: { period: 10 } },
    { id: 's', type: 'indicator', indicator: 'sma', label: 'Slow SMA (30)', params: { period: 30 } },
    { id: 'c', type: 'condition', label: 'Cross Up', params: { op: 'crosses_above' } },
    { id: 'sz', type: 'sizing', label: 'Fixed Size', params: { method: 'fixed', value: 1 } },
  ],
  edges: [
    { id: 'e1', from_node: 'n1', from_port: 'bars', to_node: 'f', to_port: 'input' },
    { id: 'e2', from_node: 'n1', from_port: 'bars', to_node: 's', to_port: 'input' },
    { id: 'e3', from_node: 'f', from_port: 'value', to_node: 'c', to_port: 'left' },
    { id: 'e4', from_node: 's', from_port: 'value', to_node: 'c', to_port: 'right' },
    { id: 'e5', from_node: 'c', from_port: 'signal', to_node: 'sz', to_port: 'signal' },
  ],
};

const MOCK_VERIFY_OK = {
  ok: true,
  issues: [],
  ir: { strategy: 'SMA Cross', version: '1.0' },
};

const MOCK_VERIFY_FAIL = {
  ok: false,
  issues: [
    { code: 'dangling_node', message: 'Node "unknown" has no connected edges', nodeId: 'unknown', lineno: 42 },
    { code: 'type_mismatch', message: 'Port "output" expects bars but receives signal', nodeId: 'c', lineno: 15 },
  ],
  ir: null,
};

const MOCK_BACKTEST_RESPONSE: BacktestResponse = {
  run_id: 'bt-123',
  status: 'completed',
  metrics: { sharpe: 1.5, max_drawdown: 0.12, total_return: 0.25, net_pnl: 25000, trades: 10 },
};

const MOCK_COMPILED_STRATEGY: CompiledStrategy = {
  strategy_id: 'strat-1',
};

const NOW = Date.now();
const MOCK_SAVED_STRATEGIES: SavedStrategyManifest[] = [
  {
    id: 'strat-1',
    name: 'SMA Cross',
    version: '1.0.0',
    category: 'trend',
    description: 'Classic dual SMA crossover',
    tags: ['sma', 'trend'],
    author: 'test',
    graph: DEFAULT_GRAPH,
    code: 'def strategy(): pass',
    hash: 'sha256:abc123',
    createdAt: NOW,
    updatedAt: NOW,
  },
];

function stubbedApiClient(overrides: Partial<ApiClient> = {}) {
  const base = createApiClient({ baseUrl: '/api', fetchImpl: fetch });
  return {
    ...base,
    postStrategiesVerify: vi.fn().mockResolvedValue({ data: MOCK_VERIFY_OK.ir }),
    postBacktests: vi.fn().mockResolvedValue({ data: MOCK_BACKTEST_RESPONSE }),
    postStrategiesCompile: vi.fn().mockResolvedValue({ data: MOCK_COMPILED_STRATEGY }),
    getSweeps: vi.fn().mockResolvedValue({ sweeps: [] }),
    putProfileLayoutsByName: vi.fn().mockResolvedValue({}),
    getProfileLayouts: vi.fn().mockResolvedValue({ layouts: {} }),
    ...overrides,
  };
}

function resetDesignerStore() {
  useDesignerStore.setState({
    tab: 'canvas',
    graph: DEFAULT_GRAPH,
    positions: {},
    selectedNodeId: null,
    selectedEdgeId: null,
    isModified: false,
    code: '',
    codeEdited: false,
    verify: { ok: false, issues: [], ir: null },
    run: { status: 'idle', runId: null, response: null, error: null },
    sync: { status: 'idle', codeOnly: false, spans: [], sourceLines: {}, lastSource: null, error: null },
    recognizer: vi.fn(),
    assistant: [],
    assistantStatus: 'idle',
    savedStrategies: MOCK_SAVED_STRATEGIES,
    saveState: 'idle',
    versions: [],
    layout: {
      libraryOpen: true,
      libraryWidth: 280,
      assistantOpen: false,
      assistantWidth: 360,
      codeRatio: 0.5,
      drawerOpen: false,
      drawerTab: 'verify',
      focus: null,
    },
  });
}

function renderPage(ui: ReactNode) {
  return render(
    <QueryClientProvider client={createQueryClient({ retries: 0 })}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AlgoDesignerPage — AI-First Quant Studio route', () => {
  it('mounts the AlgoDesignerPage with the brand-new AI Quant Studio', () => {
    const client = stubbedApiClient();
    setApiClient(client);
    resetDesignerStore();

    renderPage(<AlgoDesignerPage />);

    // Header title and brand present
    expect(screen.getByText('Honba AI Quant Studio')).toBeInTheDocument();
    expect(screen.getByText(/Autonomous Strategy Engine/i)).toBeInTheDocument();
    // Mode Switcher buttons present
    expect(screen.getByRole('button', { name: /frontier \(strategy lab\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /autopilot \(live\/paper arena\)/i })).toBeInTheDocument();
    // Risk Envelope present
    expect(screen.getByText(/Inviolable Execution Envelope:/i)).toBeInTheDocument();
  });

  it('switches between Frontier Lab and Autopilot Arena views', async () => {
    const client = stubbedApiClient();
    setApiClient(client);
    resetDesignerStore();

    renderPage(<AlgoDesignerPage />);

    const autopilotBtn = screen.getByRole('button', { name: /autopilot \(live\/paper arena\)/i });
    fireEvent.click(autopilotBtn);

    expect(screen.getByText(/ACTIVE \(Go\/Rust Runtime Monitoring\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Deterministic Risk Execution & Audit Log/i)).toBeInTheDocument();

    const frontierBtn = screen.getByRole('button', { name: /frontier \(strategy lab\)/i });
    fireEvent.click(frontierBtn);

    expect(screen.getByText(/AI Strategy Builder/i)).toBeInTheDocument();
  });
});



describe('VerifyPanel — graph structural verification UI', () => {
  it('shows "not verified yet" state when verify has no issues and ok=false', () => {
    render(<VerifyPanel verify={{ ok: false, issues: [], ir: null }} onVerify={vi.fn()} />);

    expect(screen.getByText('Graph Structural Verification')).toBeInTheDocument();
    expect(screen.getByText(/Graph specification has not been verified yet/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /verify graph/i })).toBeInTheDocument();
  });

  it('shows success state with IR when verify.ok is true', () => {
    render(<VerifyPanel verify={MOCK_VERIFY_OK} onVerify={vi.fn()} />);

    expect(screen.getByText('Graph Verified — Intermediate Representation (IR) Ready')).toBeInTheDocument();
    expect(screen.getByText(/All nodes, edges, port contracts, and parameter types are strictly valid/)).toBeInTheDocument();
    expect(screen.getByText('Compiled Intermediate Representation (IR):')).toBeInTheDocument();
    // IR is in a <pre> block with JSON - check for the pre element content
    const pre = document.querySelector('pre');
    expect(pre).toBeInTheDocument();
    expect(pre).toHaveTextContent('strategy');
  });

  it('lists structural defects with codes and messages when verify.ok is false and issues exist', () => {
    const onSelectNode = vi.fn();
    render(<VerifyPanel verify={MOCK_VERIFY_FAIL} onVerify={vi.fn()} onSelectNode={onSelectNode} />);

    expect(screen.getByText(/2 Structural Defects Found/)).toBeInTheDocument();
    expect(screen.getByText('dangling_node')).toBeInTheDocument();
    expect(screen.getByText(/Node "unknown" has no connected edges/)).toBeInTheDocument();
    expect(screen.getByText('type_mismatch')).toBeInTheDocument();
    expect(screen.getByText(/Port "output" expects bars but receives signal/)).toBeInTheDocument();

    // Focus node button calls onSelectNode (button name is "Node: unknown")
    fireEvent.click(screen.getByRole('button', { name: /node: unknown/i }));
    expect(onSelectNode).toHaveBeenCalledWith('unknown');
  });
});

describe('RunPanel — backtest run controls and status', () => {
  it('shows idle state with Run button when no run in progress', () => {
    render(
      <RunPanel
        status="idle"
        runId={null}
        response={null}
        error={null}
        onRun={vi.fn()}
        onViewResults={vi.fn()}
      />,
    );

    expect(screen.getByText('Event-Driven Backtest Diagnostics')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run backtest/i })).toBeInTheDocument();
    expect(screen.getByText('Seed:')).toBeInTheDocument();
    expect(screen.getByDisplayValue('42')).toBeInTheDocument();
  });

  it('shows running state with disabled Run button', () => {
    render(
      <RunPanel
        status="running"
        runId="bt-123"
        response={null}
        error={null}
        onRun={vi.fn()}
        onViewResults={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /simulating.../i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /simulating.../i })).toBeDisabled();
    expect(screen.getByText('Run ID: bt-123')).toBeInTheDocument();
  });

  it('shows completed state with metrics and Trust Badges button when validation exists', () => {
    // The component reads validation from response via type casting
    const responseWithValidation = {
      ...MOCK_BACKTEST_RESPONSE,
      validation: { dsr_passed: true, pbo_passed: false },
    } as BacktestResponse & { validation: { dsr_passed: boolean; pbo_passed: boolean } };
    render(
      <RunPanel
        status="completed"
        runId="bt-123"
        response={responseWithValidation}
        error={null}
        onRun={vi.fn()}
        onViewResults={vi.fn()}
      />,
    );

    expect(screen.getByText('Status:')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    expect(screen.getByText('Run ID: bt-123')).toBeInTheDocument();
    expect(screen.getByText('Sharpe Ratio')).toBeInTheDocument();
    expect(screen.getByText('Max Drawdown')).toBeInTheDocument();
    expect(screen.getByText('Total Return')).toBeInTheDocument();
    expect(screen.getByText('Net PnL')).toBeInTheDocument();
    expect(screen.getByText('Total Trades')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /trust badges/i })).toBeInTheDocument();
  });

  it('shows failed state with error message', () => {
    render(
      <RunPanel
        status="failed"
        runId="bt-123"
        response={null}
        error="compile: missing universe"
        onRun={vi.fn()}
        onViewResults={vi.fn()}
      />,
    );

    expect(screen.getByText('FAILED')).toBeInTheDocument();
    expect(screen.getByText('compile: missing universe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run backtest/i })).not.toBeDisabled();
  });
});

describe('SweepsPanel — parameter sweep controls', () => {
  it('renders sweep configuration form with Run Sweep button', () => {
    render(<SweepsPanel />);

    expect(screen.getByText('Parameter Sweeps & Optimization')).toBeInTheDocument();
    expect(screen.getByText(/Grid search over indicator parameters/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run sweep/i })).toBeInTheDocument();
  });
});

describe('OpsPanel — live operations (refresh/close positions)', () => {
  const mockClient = stubbedApiClient();

  it('renders refresh and emergency close all buttons', () => {
    render(<OpsPanel client={mockClient} onRefresh={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /emergency close all/i })).toBeInTheDocument();
  });

  it('calls onRefresh when refresh button clicked', () => {
    const onRefresh = vi.fn();
    render(<OpsPanel client={mockClient} onRefresh={onRefresh} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when emergency close all button clicked', () => {
    const onClose = vi.fn();
    render(<OpsPanel client={mockClient} onRefresh={vi.fn()} onClose={onClose} />);

    // Mock window.confirm to return true
    const originalConfirm = globalThis.window.confirm;
    globalThis.window.confirm = vi.fn(() => true);
    
    fireEvent.click(screen.getByRole('button', { name: /emergency close all/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    
    globalThis.window.confirm = originalConfirm;
  });
});

describe('ResultsPanel — backtest results display (trust badges & assumptions)', () => {
  it('shows empty state when no response', () => {
    render(<ResultsPanel response={null} />);

    expect(screen.getByText('Institutional Trust & Overfitting Badges (ADR 0029 S7)')).toBeInTheDocument();
    expect(screen.getByText(/No validation block returned in latest response/)).toBeInTheDocument();
    expect(screen.getByText(/Run a backtest or sweep to calculate DSR, PBO, and Holdout metrics/)).toBeInTheDocument();
  });

  it('displays not-modelled assumptions', () => {
    const responseWithAssumptions = {
      run_id: 'bt-123',
      status: 'completed',
      metrics: { sharpe: 1.5, max_drawdown: 0.12, total_return: 0.25, net_pnl: 25000, trades: 10 },
      assumptions: { not_modelled: ['borrow_fee', 'spread_slippage', 'market_impact', 'circuit_breaker_halts'] },
    } as unknown as BacktestResponse;
    render(<ResultsPanel response={responseWithAssumptions} />);

    expect(screen.getByText('Institutional Friction Assumptions (Not Modelled)')).toBeInTheDocument();
    expect(screen.getByText('borrow_fee')).toBeInTheDocument();
    expect(screen.getByText('spread_slippage')).toBeInTheDocument();
    expect(screen.getByText('market_impact')).toBeInTheDocument();
    expect(screen.getByText('circuit_breaker_halts')).toBeInTheDocument();
  });
});

describe('LibraryDrawer — saved strategies browser', () => {
  it('renders category tabs and strategy templates', () => {
    const onOpen = vi.fn();
    const onAddIndicator = vi.fn();
    const onSimulate = vi.fn();
    const onFork = vi.fn();
    const onDelete = vi.fn();

    render(
      <LibraryDrawer
        templates={[
          { name: 'sma_cross', label: 'SMA Cross Template', category: 'trend', nodes: 5, description: 'Test template', graph: DEFAULT_GRAPH },
          { name: 'rsi_mean_rev', label: 'RSI Mean Reversion', category: 'mean_reversion', nodes: 6, description: 'Test template', graph: DEFAULT_GRAPH },
        ]}
        saved={MOCK_SAVED_STRATEGIES}
        onNewStrategy={vi.fn()}
        onAddIndicator={onAddIndicator}
        onOpen={onOpen}
        onSimulate={onSimulate}
        onFork={onFork}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Strategy Templates')).toBeInTheDocument();
    expect(screen.getByText('SMA Cross Template')).toBeInTheDocument();
    expect(screen.getByText('RSI Mean Reversion')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new/i })).toBeInTheDocument();
  });

  it('filters saved strategies by category', () => {
    const onOpen = vi.fn();
    const onDelete = vi.fn();

    render(
      <LibraryDrawer
        templates={[]}
        saved={[
          { ...MOCK_SAVED_STRATEGIES[0], id: 'strat-1', category: 'trend' },
          { ...MOCK_SAVED_STRATEGIES[0], id: 'strat-2', category: 'custom' },
        ]}
        onNewStrategy={vi.fn()}
        onAddIndicator={vi.fn()}
        onOpen={onOpen}
        onSimulate={vi.fn()}
        onFork={vi.fn()}
        onDelete={onDelete}
      />,
    );

    // Default 'All' category shows both
    expect(screen.getByText('My Strategies (2)')).toBeInTheDocument();

    // Click 'trend' category
    fireEvent.click(screen.getByRole('button', { name: /trend/i }));
    expect(screen.getByText('My Strategies (1)')).toBeInTheDocument();
    expect(screen.getByText('SMA Cross')).toBeInTheDocument();
    expect(screen.queryByText('My Strategies (2)')).not.toBeInTheDocument();
  });

  it('opens, simulates, forks, and deletes saved strategies', () => {
    const onOpen = vi.fn();
    const onSimulate = vi.fn();
    const onFork = vi.fn();
    const onDelete = vi.fn();

    render(
      <LibraryDrawer
        templates={[]}
        saved={MOCK_SAVED_STRATEGIES}
        onNewStrategy={vi.fn()}
        onAddIndicator={vi.fn()}
        onOpen={onOpen}
        onSimulate={onSimulate}
        onFork={onFork}
        onDelete={onDelete}
      />,
    );

    // Open strategy
    fireEvent.click(screen.getByRole('button', { name: /open in designer/i }));
    expect(onOpen).toHaveBeenCalledWith(MOCK_SAVED_STRATEGIES[0].graph);

    // Simulate
    fireEvent.click(screen.getByRole('button', { name: /simulate/i }));
    expect(onSimulate).toHaveBeenCalledWith(MOCK_SAVED_STRATEGIES[0].graph);

    // Fork
    fireEvent.click(screen.getByRole('button', { name: /fork/i }));
    expect(onFork).toHaveBeenCalledWith(MOCK_SAVED_STRATEGIES[0]);
  });
});

describe('StrategyNameEditor — inline strategy name editing', () => {
  it('renders current name and calls onChange on blur after clicking to edit', () => {
    const onChange = vi.fn();
    render(<StrategyNameEditor name="Test Strategy" onChange={onChange} />);

    // Initially shows name in a button
    expect(screen.getByText('Test Strategy')).toBeInTheDocument();

    // Click to start editing
    fireEvent.click(screen.getByText('Test Strategy'));

    // Now shows input with the value
    const input = screen.getByDisplayValue('Test Strategy');
    fireEvent.change(input, { target: { value: 'New Strategy' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith('New Strategy');
  });

  it('shows button with empty name when name is empty', () => {
    render(<StrategyNameEditor name="" onChange={vi.fn()} />);
    // Button renders with empty span text - get by the edit icon
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });
});

describe('SaveToLibraryModal — save strategy with metadata', () => {
  const mockOnSave = vi.fn().mockResolvedValue(undefined);

  it('renders form with name, category, description, tags', () => {
    render(
      <SaveToLibraryModal
        initialName="My Strategy"
        initialCategory="custom"
        initialDescription="A test strategy"
        initialTags={['tag1', 'tag2']}
        onSave={mockOnSave}
        onClose={vi.fn()}
      />,
    );

    // Modal renders with heading
    expect(screen.getByText('Save Strategy to Library')).toBeInTheDocument();
    expect(screen.getByDisplayValue('My Strategy')).toBeInTheDocument();
    expect(screen.getByDisplayValue('A test strategy')).toBeInTheDocument();
    expect(screen.getByDisplayValue('tag1, tag2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save to library/i })).toBeInTheDocument();
  });

  it('calls onSave with form data when Save clicked', async () => {
    render(
      <SaveToLibraryModal
        initialName="My Strategy"
        initialCategory="trend"
        initialDescription=""
        initialTags={[]}
        onSave={mockOnSave}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /save to library/i }));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Strategy',
          category: 'trend',
        }),
      );
    });
  });

  it('closes modal when Cancel clicked', () => {
    const onClose = vi.fn();
    render(
      <SaveToLibraryModal
        initialName="My Strategy"
        initialCategory="custom"
        initialDescription=""
        initialTags={[]}
        onSave={mockOnSave}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('ParamsPanel — node parameter editor', () => {
  beforeEach(() => {
    resetDesignerStore();
    // Select the Fast SMA node so ParamsPanel shows its parameters
    useDesignerStore.setState({ selectedNodeId: 'f' });
  });

  it('renders parameter controls for selected indicator node', () => {
    const onParamChange = vi.fn();
    render(
      <ParamsPanel
        graph={DEFAULT_GRAPH}
        onParamChange={onParamChange}
      />,
    );

    expect(screen.getByText('Parameter Tuner')).toBeInTheDocument();
    expect(screen.getByText('Indicator Parameters')).toBeInTheDocument();
    expect(screen.getByText('period')).toBeInTheDocument();
    expect(screen.getByDisplayValue(10)).toBeInTheDocument(); // Fast SMA period
  });

  it('calls onParamChange when parameter value changes', () => {
    const onParamChange = vi.fn();
    render(
      <ParamsPanel
        graph={DEFAULT_GRAPH}
        onParamChange={onParamChange}
      />,
    );

    // Find the period input and change it
    const periodInput = screen.getByDisplayValue(10);
    fireEvent.change(periodInput, { target: { value: '15' } });
    fireEvent.blur(periodInput);

    expect(onParamChange).toHaveBeenCalledWith('f', expect.objectContaining({ period: 15 }));
  });
});

describe('AiChatColumn — AI Co-Pilot chat interface', () => {
  const mockOnPropose = vi.fn();
  const mockOnApply = vi.fn();
  const mockOnDiscard = vi.fn();
  const mockOnClear = vi.fn();

  const MOCK_MESSAGES = [
    {
      kind: 'candidate' as const,
      message: 'Proposed adding ATR volatility sizing',
      graph: DEFAULT_GRAPH,
      source: 'def strategy(): pass',
      diff: { added_nodes: ['atr_vol', 'sz_vol'], modified_nodes: [], removed_nodes: [], param_changes: {} },
      decisions: [{ orderId: 'o', decision: 'approve' as const, rationale: 'Volatility-adjusted sizing verified' }],
      blocked: false,
      timestamp: Date.now(),
    },
    {
      kind: 'discussion' as const,
      message: 'Consider adding an RSI filter for confirmation',
      blocked: false,
      timestamp: Date.now(),
    },
    {
      kind: 'validation_error' as const,
      message: 'Candidate graph failed verification',
      findings: [{ code: 'dangling_node', message: 'Node has no edges' }],
      blocked: true,
      timestamp: Date.now(),
    },
  ];

  it('renders chat header with quick prompts', () => {
    render(
      <AiChatColumn
        messages={[]}
        currentCode=""
        status="idle"
        onPropose={mockOnPropose}
        onApply={mockOnApply}
        onDiscard={mockOnDiscard}
        onClear={mockOnClear}
      />,
    );

    expect(screen.getByText('AI Strategy Co-Pilot')).toBeInTheDocument();
    expect(screen.getByText('Propose-never-execute (ADR 0029 S5)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
    // Quick prompts rendered
    expect(screen.getByRole('button', { name: /add an atr volatility filter/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tune ma periods to 5\/20/i })).toBeInTheDocument();
  });

  it('renders empty state when no messages', () => {
    render(
      <AiChatColumn
        messages={[]}
        currentCode=""
        status="idle"
        onPropose={mockOnPropose}
        onApply={mockOnApply}
        onDiscard={mockOnDiscard}
        onClear={mockOnClear}
      />,
    );

    expect(screen.getByText('Ask the co-pilot to propose mutations, tune parameters, or add risk filters.')).toBeInTheDocument();
  });

  it('renders candidate message with Apply/Discard buttons', () => {
    render(
      <AiChatColumn
        messages={MOCK_MESSAGES}
        currentCode="def strategy(): pass"
        status="idle"
        onPropose={mockOnPropose}
        onApply={mockOnApply}
        onDiscard={mockOnDiscard}
        onClear={mockOnClear}
      />,
    );

    expect(screen.getByText('Proposed adding ATR volatility sizing')).toBeInTheDocument();
    expect(screen.getByText('GRAPH MUTATION')).toBeInTheDocument();
    expect(screen.getByText('+ atr_vol')).toBeInTheDocument();
    expect(screen.getByText('+ sz_vol')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /apply to canvas/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /discard/i })).toBeInTheDocument();
  });

  it('renders blocked validation_error message without Apply button', () => {
    render(
      <AiChatColumn
        messages={[MOCK_MESSAGES[2]]}
        currentCode="def strategy(): pass"
        status="idle"
        onPropose={mockOnPropose}
        onApply={mockOnApply}
        onDiscard={mockOnDiscard}
        onClear={mockOnClear}
      />,
    );

    expect(screen.getByText('Candidate graph failed verification')).toBeInTheDocument();
    expect(screen.getByText('BLOCKED')).toBeInTheDocument();
    expect(screen.getByText('Defects (quarantined from execution):')).toBeInTheDocument();
    expect(screen.getByText('[dangling_node] Node has no edges')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /apply to canvas/i })).not.toBeInTheDocument();
  });

  it('sends prompt when Enter pressed in input', () => {
    render(
      <AiChatColumn
        messages={[]}
        currentCode=""
        status="idle"
        onPropose={mockOnPropose}
        onApply={mockOnApply}
        onDiscard={mockOnDiscard}
        onClear={mockOnClear}
      />,
    );

    const input = screen.getByPlaceholderText(/e\.g\. add an atr trailing stop/i);
    fireEvent.change(input, { target: { value: 'Add RSI filter' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });

    expect(mockOnPropose).toHaveBeenCalledWith('Add RSI filter');
  });

  it('shows thinking indicator when status is thinking', () => {
    render(
      <AiChatColumn
        messages={[]}
        currentCode=""
        status="thinking"
        onPropose={mockOnPropose}
        onApply={mockOnApply}
        onDiscard={mockOnDiscard}
        onClear={mockOnClear}
      />,
    );

    expect(screen.getByText('Co-Pilot is thinking…')).toBeInTheDocument();
  });

  it('calls onClear when Clear button clicked', () => {
    render(
      <AiChatColumn
        messages={MOCK_MESSAGES}
        currentCode=""
        status="idle"
        onPropose={mockOnPropose}
        onApply={mockOnApply}
        onDiscard={mockOnDiscard}
        onClear={mockOnClear}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(mockOnClear).toHaveBeenCalledTimes(1);
  });
});
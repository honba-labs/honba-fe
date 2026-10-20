import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AiQuantStudio } from './AiQuantStudio';

// jsdom mocks for Monaco and matchMedia
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

// Mock Monaco Editor component
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div data-testid="monaco-editor-mock">
      <textarea
        data-testid="monaco-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  ),
}));

describe('AiQuantStudio (Honba Autonomous Strategy Engine - Phase 2 & 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the AI Quant Studio with mode switcher and risk badges', () => {
    render(<AiQuantStudio />);

    expect(screen.getByText(/Frontier \(Strategy Lab\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Autopilot \(Live\/Paper Arena\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Runtime Risk: Clamped/i)).toBeInTheDocument();
    expect(screen.getByText(/Killswitch: -8.0% DD/i)).toBeInTheDocument();
  });

  it('allows selecting quant strategy presets to populate prompt', () => {
    render(<AiQuantStudio />);

    const bankNiftyPreset = screen.getByText(/BANKNIFTY Volatility Squeeze/i);
    fireEvent.click(bankNiftyPreset);

    const promptTextarea = screen.getByLabelText(/Trading Thesis & Signal Rationale/i) as HTMLTextAreaElement;
    expect(promptTextarea.value).toContain('volatility expansion breakout strategy on BANKNIFTY');
  });

  it('renders the Inviolable Execution Envelope footer', () => {
    render(<AiQuantStudio />);

    expect(screen.getByText(/Inviolable Execution Envelope:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/1.0% Equity/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/-8.0% Auto-Close/i)).toBeInTheDocument();
    expect(screen.getByText(/Mandatory Bracket \(Locked\)/i)).toBeInTheDocument();
    expect(screen.getByText(/PROTECTED/i)).toBeInTheDocument();
  });

  it('runs the Autonomous Optimization Loop and switches between Phase 2 scientific validation tabs', async () => {
    render(<AiQuantStudio />);

    const buildBtn = screen.getByRole('button', { name: /Synthesize & Optimize Strategy/i });
    fireEvent.click(buildBtn);

    // Shows progress
    expect(screen.getByText(/Optimizing Strategy…/i)).toBeInTheDocument();

    // Await completion of optimization iterations
    await waitFor(
      () => {
        expect(screen.getByText(/Iter #1/i)).toBeInTheDocument();
        expect(screen.getByText(/Rule Significance & Edge Testing/i)).toBeInTheDocument();
      },
      { timeout: 8000 }
    );

    expect(screen.getByText(/Statistical p-value:/i)).toBeInTheDocument();

    // Test Phase 2: Monte Carlo Tab with Distribution Histogram
    const mcTab = screen.getByRole('button', { name: 'Monte Carlo' });
    fireEvent.click(mcTab);

    expect(screen.getByText(/Monte Carlo Stress-Test \(1,000x Shuffles\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Simulated Drawdown Density Distribution/i)).toBeInTheDocument();
    expect(screen.getByText(/Ruin Probability/i)).toBeInTheDocument();

    // Test Phase 2: Walk-Forward Validation Tab
    const wfTab = screen.getByRole('button', { name: 'Walk-Forward' });
    fireEvent.click(wfTab);

    expect(screen.getByText(/Walk-Forward Out-of-Sample Validation/i)).toBeInTheDocument();
    expect(screen.getByText(/In-Sample \(Train\) Sharpe/i)).toBeInTheDocument();
    expect(screen.getByText(/Out-of-Sample \(Test\) Sharpe/i)).toBeInTheDocument();
    expect(screen.getByText(/Walk-Forward Efficiency Ratio \(WFE\):/i)).toBeInTheDocument();

    // Test Phase 2: Drawdown Diagnostics Tab
    const diagTab = screen.getByRole('button', { name: 'Diagnostics' });
    fireEvent.click(diagTab);

    expect(screen.getByText(/Drawdown Cluster Diagnostics/i)).toBeInTheDocument();
    expect(screen.getByText(/Worst Drawdown Window:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Apply AI Drawdown Fix & Auto-Refine/i })).toBeInTheDocument();
  }, 12000);

  it('Phase 3: opens the Runtime Risk Governance Envelope modal and adjusts parameters', () => {
    render(<AiQuantStudio />);

    const configBtn = screen.getByRole('button', { name: /Adjust Risk Envelope/i });
    fireEvent.click(configBtn);

    expect(screen.getByText(/Deterministic Risk Governance Envelope/i)).toBeInTheDocument();
    expect(screen.getByText(/Max Capital Risk per Trade \(% Equity\):/i)).toBeInTheDocument();

    const applyRiskBtn = screen.getByRole('button', { name: /Apply & Lock Envelope/i });
    fireEvent.click(applyRiskBtn);

    expect(screen.queryByText(/Deterministic Risk Governance Envelope/i)).not.toBeInTheDocument();
  });

  it('Phase 3: switches to Autopilot mode and simulates trade proposal with runtime risk interception', () => {
    render(<AiQuantStudio />);

    const autopilotBtn = screen.getByRole('button', { name: /Autopilot \(Live\/Paper Arena\)/i });
    fireEvent.click(autopilotBtn);

    expect(screen.getByText(/ACTIVE \(Go\/Rust Runtime Monitoring\)/i)).toBeInTheDocument();
    expect(screen.getByText(/AI Reasoning Stream/i)).toBeInTheDocument();
    expect(screen.getByText(/Deterministic Risk Execution & Audit Log/i)).toBeInTheDocument();

    // Simulate model proposal and check runtime interceptor disposition
    const simulateBtn = screen.getByRole('button', { name: /Simulate Trade Proposal/i });
    fireEvent.click(simulateBtn);

    expect(screen.getAllByText(/Runtime Interceptor/i).length).toBeGreaterThanOrEqual(1);

    // Test Emergency Killswitch
    const killswitchBtn = screen.getByRole('button', { name: /Emergency Flatten & Halt/i });
    fireEvent.click(killswitchBtn);

    expect(screen.getByText(/No active open exposure. Risk capital fully protected./i)).toBeInTheDocument();
  });
});

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

describe('AiQuantStudio (Honba Autonomous Strategy Engine)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the AI Quant Studio with autonomous strategy engine badges', () => {
    render(<AiQuantStudio />);

    expect(screen.getByText(/Honba AI Quant Studio/i)).toBeInTheDocument();
    expect(screen.getByText(/Autonomous Strategy Engine/i)).toBeInTheDocument();
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

  it('runs the Autonomous Optimization Loop and renders Monte Carlo & Rule Significance metrics', async () => {
    render(<AiQuantStudio />);

    const buildBtn = screen.getByRole('button', { name: /Synthesize & Optimize Strategy/i });
    fireEvent.click(buildBtn);

    // Shows progress
    expect(screen.getByText(/Optimizing Strategy…/i)).toBeInTheDocument();

    // Await completion of optimization iterations
    await waitFor(
      () => {
        expect(screen.getByText(/Iter #1/i)).toBeInTheDocument();
        expect(screen.getByText(/Monte Carlo Stress-Test \(1,000x Shuffles\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Rule Significance & Edge Testing/i)).toBeInTheDocument();
      },
      { timeout: 8000 }
    );

    expect(screen.getByText(/Ruin Probability/i)).toBeInTheDocument();
    expect(screen.getByText(/Statistical p-value:/i)).toBeInTheDocument();
  }, 10000);

  it('switches between Frontier and Autopilot modes', () => {
    render(<AiQuantStudio />);

    const autopilotBtn = screen.getByRole('button', { name: /Autopilot \(Live\/Paper Arena\)/i });
    fireEvent.click(autopilotBtn);

    expect(screen.getByText(/ACTIVE \(Go\/Rust Runtime Monitoring\)/i)).toBeInTheDocument();
    expect(screen.getByText(/AI Reasoning Stream/i)).toBeInTheDocument();
    expect(screen.getByText(/Deterministic Risk Execution & Audit Log/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Emergency Flatten & Halt/i })).toBeInTheDocument();

    // Switch back to Frontier
    const frontierBtn = screen.getByRole('button', { name: /Frontier \(Strategy Lab\)/i });
    fireEvent.click(frontierBtn);

    expect(screen.getByText(/AI Strategy Builder/i)).toBeInTheDocument();
  });
});


import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AiStrategyOptimizerModal } from './AiStrategyOptimizerModal';
import { DEFAULT_OPTIMIZATION_GOAL } from '../ai-loop/ai-optimizer-engine';

describe('AiStrategyOptimizerModal', () => {
  it('renders modal when open with goal fields and action buttons', () => {
    const handleClose = vi.fn();
    const handleApply = vi.fn();

    render(
      <AiStrategyOptimizerModal
        isOpen={true}
        onClose={handleClose}
        onApplyStrategy={handleApply}
        currentGraphName="sma_cross"
      />
    );

    expect(screen.getByText(/AI Autonomous Strategy Optimizer/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start autonomous loop/i })).toBeInTheDocument();
    expect(screen.getByText(/Min Sharpe Ratio/i)).toBeInTheDocument();
    expect(screen.getByText(/Max Drawdown/i)).toBeInTheDocument();
  });

  it('runs the autonomous optimization loop when user clicks start', async () => {
    const handleClose = vi.fn();
    const handleApply = vi.fn();

    render(
      <AiStrategyOptimizerModal
        isOpen={true}
        onClose={handleClose}
        onApplyStrategy={handleApply}
        currentGraphName="sma_cross"
      />
    );

    const startBtn = screen.getByRole('button', { name: /start autonomous loop/i });
    fireEvent.click(startBtn);

    // Should indicate running loop or stepper
    expect(screen.getByText(/Loop Pipeline:/i)).toBeInTheDocument();

    // Wait for at least iteration 1 to complete
    await waitFor(
      () => {
        expect(screen.getByText(/Iter #1/i)).toBeInTheDocument();
      },
      { timeout: 8000 }
    );
  }, 15000);
});

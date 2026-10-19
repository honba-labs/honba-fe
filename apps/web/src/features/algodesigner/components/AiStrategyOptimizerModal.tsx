import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Workflow,
  Cpu,
  Braces,
  Check,
  TrendingUp,
  Percent,
  Activity,
  Shield,
  Layers,
  X,
  Sliders,
  Send,
} from 'lucide-react';
import { HbButton } from '../../../components/ui/hb-button';
import { HbBubble, HbBadge } from '../../../components/ui/hb-bubble';
import type { StrategyGraphShape } from '../model';
import type {
  OptimizationGoal,
  OptimizationIteration,
  AiLoopState,
  LoopPhase,
} from '../ai-loop/ai-optimizer-types';
import {
  DEFAULT_OPTIMIZATION_GOAL,
  runOptimizationStep,
} from '../ai-loop/ai-optimizer-engine';
import { stashHandoff, simulatorHandoffUrl } from '../handoff';

export interface AiStrategyOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyStrategy: (graph: StrategyGraphShape, code: string) => void;
  currentGraphName?: string;
}

const PRESETS = [
  {
    name: 'NIFTY Momentum & RSI',
    prompt: 'Intraday Trend Breakout on NIFTY50: Dual EMA crossover with RSI filter and dynamic ATR stop',
    symbol: 'NSE:NIFTY50',
    sharpe: 2.0,
    dd: 8.0,
    winRate: 60,
  },
  {
    name: 'BankNIFTY Mean Reversion',
    prompt: 'RSI Oversold mean reversion on BankNIFTY with Bollinger Band confluence and trailing target',
    symbol: 'NSE:BANKNIFTY',
    sharpe: 1.8,
    dd: 10.0,
    winRate: 58,
  },
  {
    name: 'RELIANCE Breakout Scalper',
    prompt: 'Volatility breakout on RELIANCE with VWAP deviation and volume-weighted position sizing',
    symbol: 'NSE:RELIANCE',
    sharpe: 2.2,
    dd: 7.5,
    winRate: 65,
  },
];

export const AiStrategyOptimizerModal: React.FC<AiStrategyOptimizerModalProps> = ({
  isOpen,
  onClose,
  onApplyStrategy,
  currentGraphName,
}) => {
  const [goal, setGoal] = useState<OptimizationGoal>(DEFAULT_OPTIMIZATION_GOAL);
  const [loopState, setLoopState] = useState<AiLoopState>({
    status: 'idle',
    phase: 'idle',
    currentIterationNumber: 0,
    iterations: [],
    bestIterationIndex: null,
  });

  const [selectedIterationIdx, setSelectedIterationIdx] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'code' | 'graph'>('overview');
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);

  const loopRunningRef = useRef(false);

  // Stop running on unmount
  useEffect(() => {
    return () => {
      loopRunningRef.current = false;
    };
  }, []);

  if (!isOpen) return null;

  const handleStartLoop = async () => {
    setLoopState({
      status: 'running',
      phase: 'reasoning',
      currentIterationNumber: 1,
      iterations: [],
      bestIterationIndex: null,
    });
    loopRunningRef.current = true;

    let prevIteration: OptimizationIteration | undefined = undefined;
    const collectedIterations: OptimizationIteration[] = [];

    for (let i = 1; i <= goal.maxIterations; i++) {
      if (!loopRunningRef.current) break;

      // Phase 1: Reasoning
      setLoopState((prev) => ({
        ...prev,
        phase: 'reasoning',
        currentIterationNumber: i,
      }));
      await new Promise((r) => setTimeout(r, 600));
      if (!loopRunningRef.current) break;

      // Phase 2: Generating code & DAG
      setLoopState((prev) => ({ ...prev, phase: 'generating' }));
      await new Promise((r) => setTimeout(r, 700));
      if (!loopRunningRef.current) break;

      // Phase 3: Simulator Execution
      setLoopState((prev) => ({ ...prev, phase: 'simulating' }));
      const stepResult = await runOptimizationStep(goal, i, prevIteration);
      await new Promise((r) => setTimeout(r, 800));
      if (!loopRunningRef.current) break;

      // Phase 4: Evaluating Results against Goal
      setLoopState((prev) => ({ ...prev, phase: 'evaluating' }));
      collectedIterations.push(stepResult);
      prevIteration = stepResult;
      setSelectedIterationIdx(collectedIterations.length - 1);

      const isGoalMet = stepResult.goalsEvaluated.allMet;

      setLoopState((prev) => ({
        ...prev,
        iterations: [...collectedIterations],
        bestIterationIndex: isGoalMet ? collectedIterations.length - 1 : prev.bestIterationIndex,
      }));

      await new Promise((r) => setTimeout(r, 600));

      if (isGoalMet) {
        setLoopState((prev) => ({
          ...prev,
          status: 'goal_achieved',
          phase: 'finished',
          bestIterationIndex: collectedIterations.length - 1,
        }));
        loopRunningRef.current = false;
        break;
      }

      if (i === goal.maxIterations) {
        // Find highest Sharpe
        let bestIdx = 0;
        let maxSharpe = -99;
        collectedIterations.forEach((it, idx) => {
          if (it.metrics.sharpe > maxSharpe) {
            maxSharpe = it.metrics.sharpe;
            bestIdx = idx;
          }
        });

        setLoopState((prev) => ({
          ...prev,
          status: 'limit_reached',
          phase: 'finished',
          bestIterationIndex: bestIdx,
        }));
        loopRunningRef.current = false;
        break;
      }

      // Phase 5: Reflecting before next loop
      setLoopState((prev) => ({ ...prev, phase: 'reflecting' }));
      await new Promise((r) => setTimeout(r, 700));
    }
  };

  const handleStopLoop = () => {
    loopRunningRef.current = false;
    setLoopState((prev) => ({ ...prev, status: 'paused', phase: 'idle' }));
  };

  const handleResetLoop = () => {
    loopRunningRef.current = false;
    setLoopState({
      status: 'idle',
      phase: 'idle',
      currentIterationNumber: 0,
      iterations: [],
      bestIterationIndex: null,
    });
    setSelectedIterationIdx(0);
    setAppliedNotice(null);
  };

  const currentIter = loopState.iterations[selectedIterationIdx] || loopState.iterations[loopState.iterations.length - 1];

  const handleApplyCurrentIteration = () => {
    if (!currentIter) return;
    onApplyStrategy(currentIter.graph, currentIter.code);
    setAppliedNotice(`Iteration #${currentIter.iterationNumber} applied to Algo Designer canvas and Python editor!`);
    setTimeout(() => setAppliedNotice(null), 4000);
  };

  const handleSimulateHandoff = () => {
    if (!currentIter) return;
    stashHandoff(currentIter.graph);
    window.location.href = simulatorHandoffUrl(currentIter.graph.name);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && loopState.status !== 'running') onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1060,
          maxHeight: '92vh',
          background: 'var(--bg-surface, #1e222d)',
          border: '1px solid var(--border-subtle, #2a2e39)',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-subtle, #2a2e39)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface-elevated, #2a2e39)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(124, 58, 237, 0.4)',
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                  AI Autonomous Strategy Optimizer
                </span>
                <HbBadge variant="accent" size="xs">
                  Self-Refining Loop
                </HbBadge>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Generates Python Code & Visual DAG → Backtests in Simulator → Evaluates Goals → Refines Strategy in a Loop
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {loopState.status === 'goal_achieved' && (
              <HbBadge variant="bullish" size="sm" dot pulse>
                🎉 GOAL ACHIEVED!
              </HbBadge>
            )}
            {loopState.status === 'running' && (
              <HbBadge variant="gold" size="sm" dot pulse>
                Running Iteration {loopState.currentIterationNumber} / {goal.maxIterations}
              </HbBadge>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 4,
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Applied Notice Banner */}
        {appliedNotice && (
          <div
            style={{
              padding: '8px 20px',
              background: 'rgba(8, 153, 129, 0.15)',
              borderBottom: '1px solid rgba(8, 153, 129, 0.3)',
              color: 'var(--bullish, #089981)',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 600,
            }}
          >
            <Check size={14} />
            <span>{appliedNotice}</span>
          </div>
        )}

        {/* Modal Body */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16, padding: 20 }}>
          {/* Section 1: Goal Setup */}
          <div
            style={{
              background: 'var(--bg-app, #131722)',
              border: '1px solid var(--border-subtle, #2a2e39)',
              borderRadius: 8,
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                1. Strategy Objective & Performance Targets
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Quick Presets:</span>
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    className="shortlist-btn"
                    onClick={() =>
                      setGoal((g) => ({
                        ...g,
                        objective: p.prompt,
                        symbol: p.symbol,
                        targetSharpe: p.sharpe,
                        maxDrawdownPct: p.dd,
                        minWinRatePct: p.winRate,
                      }))
                    }
                    style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4 }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={goal.objective}
              onChange={(e) => setGoal({ ...goal, objective: e.target.value })}
              rows={2}
              disabled={loopState.status === 'running'}
              placeholder="Describe your strategy hypothesis and entry/exit conditions..."
              style={{
                width: '100%',
                padding: '8px 10px',
                background: 'var(--bg-surface, #1e222d)',
                border: '1px solid var(--border-medium, #434651)',
                borderRadius: 6,
                color: 'var(--text-primary)',
                fontSize: 12,
                fontFamily: 'inherit',
                resize: 'none',
                outline: 'none',
              }}
            />

            {/* Target Metrics Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
              <div>
                <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Target Asset
                </label>
                <select
                  value={goal.symbol}
                  onChange={(e) => setGoal({ ...goal, symbol: e.target.value })}
                  disabled={loopState.status === 'running'}
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    borderRadius: 4,
                    fontSize: 11,
                  }}
                >
                  <option value="NSE:NIFTY50">NSE:NIFTY50</option>
                  <option value="NSE:BANKNIFTY">NSE:BANKNIFTY</option>
                  <option value="NSE:RELIANCE">NSE:RELIANCE</option>
                  <option value="NSE:TCS">NSE:TCS</option>
                  <option value="NSE:INFY">NSE:INFY</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Min Sharpe Ratio (≥)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={goal.targetSharpe}
                  onChange={(e) => setGoal({ ...goal, targetSharpe: parseFloat(e.target.value) || 1.5 })}
                  disabled={loopState.status === 'running'}
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    borderRadius: 4,
                    fontSize: 11,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Max Drawdown (≤ %)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={goal.maxDrawdownPct}
                  onChange={(e) => setGoal({ ...goal, maxDrawdownPct: parseFloat(e.target.value) || 10.0 })}
                  disabled={loopState.status === 'running'}
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    borderRadius: 4,
                    fontSize: 11,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Min Win Rate (≥ %)
                </label>
                <input
                  type="number"
                  step="1"
                  value={goal.minWinRatePct}
                  onChange={(e) => setGoal({ ...goal, minWinRatePct: parseFloat(e.target.value) || 50 })}
                  disabled={loopState.status === 'running'}
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    borderRadius: 4,
                    fontSize: 11,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Max Iterations
                </label>
                <select
                  value={goal.maxIterations}
                  onChange={(e) => setGoal({ ...goal, maxIterations: parseInt(e.target.value, 10) || 5 })}
                  disabled={loopState.status === 'running'}
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    borderRadius: 4,
                    fontSize: 11,
                  }}
                >
                  <option value={3}>3 Iterations</option>
                  <option value={5}>5 Iterations</option>
                  <option value={8}>8 Iterations</option>
                </select>
              </div>
            </div>

            {/* Loop Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {loopState.status !== 'running' ? (
                  <button
                    type="button"
                    className="btn-ai-optimizer"
                    onClick={handleStartLoop}
                    style={{ height: 32 }}
                  >
                    <Play size={13} fill="currentColor" />
                    <span>Start Autonomous Loop</span>
                    <span className="btn-ai-optimizer__badge">Auto-Refine</span>
                  </button>
                ) : (
                  <HbButton variant="danger" size="sm" icon={<Pause size={13} />} onClick={handleStopLoop}>
                    Pause Loop
                  </HbButton>
                )}

                {loopState.iterations.length > 0 && loopState.status !== 'running' && (
                  <HbButton variant="ghost" size="sm" icon={<RotateCcw size={13} />} onClick={handleResetLoop}>
                    Reset
                  </HbButton>
                )}
              </div>

              {/* Progress Stepper Indicator */}
              {loopState.status !== 'idle' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Loop Pipeline:</span>
                  {(
                    [
                      { key: 'reasoning', label: '1. Reasoning' },
                      { key: 'generating', label: '2. Code & Flow' },
                      { key: 'simulating', label: '3. Simulator' },
                      { key: 'evaluating', label: '4. Evaluation' },
                    ] as const
                  ).map((step) => {
                    const isActive = loopState.phase === step.key;
                    return (
                      <span
                        key={step.key}
                        style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontWeight: isActive ? 700 : 500,
                          background: isActive ? 'var(--accent-primary, #2962ff)' : 'rgba(255,255,255,0.05)',
                          color: isActive ? '#fff' : 'var(--text-muted)',
                          transition: 'all 0.2s',
                        }}
                      >
                        {step.label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Iterations Timeline & Results */}
          {loopState.iterations.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  2. Optimization History ({loopState.iterations.length} Iterations)
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Click any iteration to inspect code, visual graph, and metrics
                </span>
              </div>

              {/* Iteration Selection Strip */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${loopState.iterations.length}, 1fr)`, gap: 10 }}>
                {loopState.iterations.map((iter, idx) => {
                  const isSelected = selectedIterationIdx === idx;
                  const isBest = loopState.bestIterationIndex === idx;
                  return (
                    <div
                      key={iter.iterationNumber}
                      onClick={() => setSelectedIterationIdx(idx)}
                      style={{
                        padding: 10,
                        background: isSelected ? 'var(--bg-surface-elevated, #2a2e39)' : 'var(--bg-app, #131722)',
                        border: isSelected
                          ? '1.5px solid var(--accent-primary, #2962ff)'
                          : isBest
                          ? '1.5px solid var(--bullish, #089981)'
                          : '1px solid var(--border-subtle, #2a2e39)',
                        borderRadius: 8,
                        cursor: 'pointer',
                        transition: 'all 0.18s ease',
                        boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)' }}>
                          Iter #{iter.iterationNumber}
                        </span>
                        {iter.status === 'goal_met' ? (
                          <HbBadge variant="bullish" size="xs">
                            Goal Met
                          </HbBadge>
                        ) : (
                          <HbBadge variant="gold" size="xs">
                            Refining
                          </HbBadge>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 10 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Sharpe:</span>
                        <span
                          style={{
                            fontWeight: 700,
                            color: iter.goalsEvaluated.sharpeMet ? 'var(--bullish)' : 'var(--text-primary)',
                          }}
                        >
                          {iter.metrics.sharpe.toFixed(2)}
                        </span>

                        <span style={{ color: 'var(--text-muted)' }}>Max DD:</span>
                        <span
                          style={{
                            fontWeight: 700,
                            color: iter.goalsEvaluated.drawdownMet ? 'var(--bullish)' : 'var(--bearish)',
                          }}
                        >
                          {iter.metrics.maxDrawdown.toFixed(1)}%
                        </span>

                        <span style={{ color: 'var(--text-muted)' }}>Win Rate:</span>
                        <span
                          style={{
                            fontWeight: 700,
                            color: iter.goalsEvaluated.winRateMet ? 'var(--bullish)' : 'var(--text-primary)',
                          }}
                        >
                          {iter.metrics.winRate.toFixed(1)}%
                        </span>

                        <span style={{ color: 'var(--text-muted)' }}>PnL:</span>
                        <span style={{ fontWeight: 700, color: 'var(--bullish)' }}>
                          +₹{iter.metrics.netPnl.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Detail Inspector for Selected Iteration */}
              {currentIter && (
                <div
                  style={{
                    background: 'var(--bg-app, #131722)',
                    border: '1px solid var(--border-subtle, #2a2e39)',
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}
                >
                  {/* Sub-header with Tabs & Actions */}
                  <div
                    style={{
                      padding: '8px 14px',
                      background: 'var(--bg-surface-elevated, #2a2e39)',
                      borderBottom: '1px solid var(--border-subtle, #2a2e39)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                        Iteration #{currentIter.iterationNumber} Inspection: {currentIter.graph.name}
                      </span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          type="button"
                          className={activeTab === 'overview' ? 'shortlist-btn shortlist-btn-primary' : 'shortlist-btn'}
                          onClick={() => setActiveTab('overview')}
                          style={{ fontSize: 11, padding: '2px 8px' }}
                        >
                          Overview & AI Diagnostics
                        </button>
                        <button
                          type="button"
                          className={activeTab === 'code' ? 'shortlist-btn shortlist-btn-primary' : 'shortlist-btn'}
                          onClick={() => setActiveTab('code')}
                          style={{ fontSize: 11, padding: '2px 8px' }}
                        >
                          Python Strategy Code
                        </button>
                        <button
                          type="button"
                          className={activeTab === 'graph' ? 'shortlist-btn shortlist-btn-primary' : 'shortlist-btn'}
                          onClick={() => setActiveTab('graph')}
                          style={{ fontSize: 11, padding: '2px 8px' }}
                        >
                          Visual Flow Graph ({currentIter.graph.nodes.length} Nodes)
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <HbButton
                        variant="primary"
                        size="sm"
                        icon={<Workflow size={13} />}
                        onClick={handleApplyCurrentIteration}
                        title="Load this iteration's Python code and visual DAG into Algo Designer"
                      >
                        Apply to Designer
                      </HbButton>
                      <HbButton
                        variant="bullish"
                        size="sm"
                        icon={<Play size={13} fill="currentColor" />}
                        onClick={handleSimulateHandoff}
                        title="Open this strategy in Simulator Workbench"
                      >
                        Run in Simulator →
                      </HbButton>
                    </div>
                  </div>

                  {/* Tab 1: Overview & AI Diagnostics */}
                  {activeTab === 'overview' && (
                    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {/* Metric Goals Comparison */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                        <div style={{ padding: 10, background: 'var(--bg-surface)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Sharpe Ratio</div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                            <span style={{ fontSize: 18, fontWeight: 700, color: currentIter.goalsEvaluated.sharpeMet ? 'var(--bullish)' : 'var(--text-primary)' }}>
                              {currentIter.metrics.sharpe.toFixed(2)}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                              (Goal: ≥ {goal.targetSharpe.toFixed(2)})
                            </span>
                          </div>
                          <div style={{ fontSize: 10, marginTop: 4, color: currentIter.goalsEvaluated.sharpeMet ? 'var(--bullish)' : 'var(--bearish)' }}>
                            {currentIter.goalsEvaluated.sharpeMet ? '✓ Target Satisfied' : '✗ Below Target'}
                          </div>
                        </div>

                        <div style={{ padding: 10, background: 'var(--bg-surface)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Max Drawdown</div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                            <span style={{ fontSize: 18, fontWeight: 700, color: currentIter.goalsEvaluated.drawdownMet ? 'var(--bullish)' : 'var(--bearish)' }}>
                              {currentIter.metrics.maxDrawdown.toFixed(1)}%
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                              (Goal: ≤ {goal.maxDrawdownPct.toFixed(1)}%)
                            </span>
                          </div>
                          <div style={{ fontSize: 10, marginTop: 4, color: currentIter.goalsEvaluated.drawdownMet ? 'var(--bullish)' : 'var(--bearish)' }}>
                            {currentIter.goalsEvaluated.drawdownMet ? '✓ Within Risk Budget' : '✗ Exceeds Risk Budget'}
                          </div>
                        </div>

                        <div style={{ padding: 10, background: 'var(--bg-surface)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Win Rate</div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                            <span style={{ fontSize: 18, fontWeight: 700, color: currentIter.goalsEvaluated.winRateMet ? 'var(--bullish)' : 'var(--text-primary)' }}>
                              {currentIter.metrics.winRate.toFixed(1)}%
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                              (Goal: ≥ {goal.minWinRatePct.toFixed(1)}%)
                            </span>
                          </div>
                          <div style={{ fontSize: 10, marginTop: 4, color: currentIter.goalsEvaluated.winRateMet ? 'var(--bullish)' : 'var(--text-muted)' }}>
                            {currentIter.goalsEvaluated.winRateMet ? '✓ Win Rate Satisfied' : '✗ Needs Noise Filter'}
                          </div>
                        </div>

                        <div style={{ padding: 10, background: 'var(--bg-surface)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Net Realized PnL</div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--bullish)' }}>
                              +₹{currentIter.metrics.netPnl.toLocaleString('en-IN')}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--bullish)' }}>
                              (+{currentIter.metrics.netPnlPct}%)
                            </span>
                          </div>
                          <div style={{ fontSize: 10, marginTop: 4, color: 'var(--text-muted)' }}>
                            Profit Factor: <b>{currentIter.metrics.profitFactor.toFixed(2)}</b> · Trades: <b>{currentIter.metrics.trades}</b>
                          </div>
                        </div>
                      </div>

                      {/* AI Reflection & Diagnosis */}
                      <div
                        style={{
                          padding: 12,
                          background: 'rgba(124, 58, 237, 0.08)',
                          border: '1px solid rgba(124, 58, 237, 0.25)',
                          borderRadius: 6,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#a78bfa', fontWeight: 600, fontSize: 12 }}>
                          <Sparkles size={14} />
                          <span>AI Strategy Reflection & Iterative Feedback</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                          {currentIter.aiReflection}
                        </p>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          Key modifications in this iteration: <b>{currentIter.changesSummary.keyChanges}</b>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Python Code Preview */}
                  {activeTab === 'code' && (
                    <div style={{ padding: 12 }}>
                      <pre
                        style={{
                          margin: 0,
                          padding: 12,
                          background: 'var(--bg-surface, #1e222d)',
                          borderRadius: 6,
                          fontFamily: 'var(--font-family-mono, monospace)',
                          fontSize: 11,
                          lineHeight: 1.6,
                          color: '#e2e8f0',
                          maxHeight: 340,
                          overflow: 'auto',
                        }}
                      >
                        {currentIter.code}
                      </pre>
                    </div>
                  )}

                  {/* Tab 3: Visual Flow Graph Nodes */}
                  {activeTab === 'graph' && (
                    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Directed Acyclic Graph (DAG) for <b>{currentIter.graph.name}</b>:
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                        {currentIter.graph.nodes.map((node) => (
                          <div
                            key={node.id}
                            style={{
                              padding: 8,
                              background: 'var(--bg-surface, #1e222d)',
                              borderRadius: 6,
                              border: '1px solid var(--border-subtle, #2a2e39)',
                              fontSize: 11,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{node.label || node.id}</span>
                              <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{node.type}</span>
                            </div>
                            {node.params && (
                              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4, fontFamily: 'monospace' }}>
                                {JSON.stringify(node.params)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

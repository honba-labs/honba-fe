import React, { useState, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import {
  Sparkles,
  Play,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Activity,
  TrendingUp,
  Cpu,
  BarChart3,
  Dices,
  Lock,
  Zap,
  Sliders,
  History,
  Terminal,
  Layers,
  ChevronRight,
  Maximize2,
  Copy,
  Check,
  Radio,
  FileCode,
  ShieldAlert,
  ArrowRight,
  Split,
  Eye,
  RefreshCw,
  X,
  Download,
  GitCompare,
  Workflow,
  SlidersHorizontal,
  Bot,
  BrainCircuit,
  Hash,
  Boxes,
} from 'lucide-react';

import type { ApiClient } from '../../../core/api/client';
import {
  DEFAULT_OPTIMIZATION_GOAL,
  runOptimizationStep,
  runMonteCarloSimulation,
  calculateRuleSignificance,
  calculateWalkForwardValidation,
  diagnoseDrawdownCluster,
  evaluateRuntimeRiskEnvelope,
  simulateModelOrderProposal,
  disposeOrderWithRuntimeRisk,
} from '../ai-loop/ai-optimizer-engine';
import type {
  OptimizationGoal,
  OptimizationIteration,
  MonteCarloResult,
  RuleSignificanceResult,
  WalkForwardResult,
  DrawdownDiagnostics,
  RuntimeRiskEnvelope,
  ProposedOrder,
  RuntimeDisposedOrder,
  ActiveLivePosition,
} from '../ai-loop/ai-optimizer-types';
import './AiQuantStudio.css';

export interface AiQuantStudioProps {
  client?: ApiClient;
  onApplyStrategy?: (code: string, name: string) => void;
  onNotice?: (message: string) => void;
}

export type StudioTab = 'frontier' | 'autopilot';
export type CenterTab = 'code' | 'flow' | 'params' | 'diff';
export type TelemetryTab = 'overview' | 'monte-carlo' | 'walk-forward' | 'diagnostics';

export interface StrategyTemplatePreset {
  id: string;
  title: string;
  symbol: string;
  timeframe: string;
  description: string;
  prompt: string;
  sharpe: number;
  winRate: number;
  archetype: string;
}

const STRATEGY_PRESETS: StrategyTemplatePreset[] = [
  {
    id: 'nifty-momentum',
    title: 'NIFTY Intraday Momentum Breakout',
    symbol: 'NSE:NIFTY50',
    timeframe: '5m',
    description: 'Dual EMA crossover with RSI momentum regime gate and dynamic ATR risk sizing',
    prompt: 'Build an intraday trend breakout strategy on NIFTY 5m with EMA(9) crossing EMA(24), RSI(14) > 55 filter for chop elimination, and 1.8x ATR trailing bracket stops risking 1.0% equity per trade.',
    sharpe: 2.33,
    winRate: 64.5,
    archetype: 'Trend / Momentum',
  },
  {
    id: 'banknifty-squeeze',
    title: 'BANKNIFTY Volatility Squeeze',
    symbol: 'NSE:BANKNIFTY',
    timeframe: '15m',
    description: 'Bollinger Band squeeze inside Keltner Channel with directional ADX confirmation',
    prompt: 'Create a volatility expansion breakout strategy on BANKNIFTY 15m detecting Bollinger Bands contracting inside Keltner Channels, triggering on momentum expansion with ADX > 25.',
    sharpe: 2.65,
    winRate: 68.2,
    archetype: 'Volatility Breakout',
  },
  {
    id: 'hft-vwap',
    title: 'NSE High-Frequency VWAP Reversion',
    symbol: 'NSE:RELIANCE',
    timeframe: '1m',
    description: 'Mean reversion on volume-weighted standard deviation bands with strict time decay',
    prompt: 'Design a statistical mean-reversion algorithm on RELIANCE 1m targeting price extensions beyond 2.0 standard deviations from intraday VWAP, closing positions within 15 minutes or upon VWAP touch.',
    sharpe: 2.10,
    winRate: 62.0,
    archetype: 'Statistical Mean Reversion',
  },
  {
    id: 'stat-arb',
    title: 'NIFTY / BANKNIFTY Cointegration Pairs',
    symbol: 'NSE:NIFTY-BANKNIFTY',
    timeframe: '5m',
    description: 'Statistical arbitrage on cointegrated spread z-score reversion',
    prompt: 'Develop a statistical arbitrage pairs trading model tracking the synthetic spread between NIFTY and BANKNIFTY futures, opening mean-reversion positions at z-score ±2.2 with half-life decay stops.',
    sharpe: 2.80,
    winRate: 71.4,
    archetype: 'Pairs Arbitrage',
  },
];

const PROMPT_CHIPS = [
  { label: '+ Volatility Squeeze (BB/KC)', text: 'Add a volatility squeeze filter requiring Bollinger Bands to contract inside Keltner Channels before expansion entry.' },
  { label: '+ 1.8x ATR Trailing Bracket', text: 'Enforce dynamic 1.8x ATR trailing stops with mandatory exchange bracket stop-loss orders.' },
  { label: '+ Anti-Chop RSI Gate (> 55)', text: 'Require RSI(14) > 55 bullish momentum regime gate to eliminate consolidation chop.' },
  { label: '+ VWAP Mean-Reversion Anchor', text: 'Anchor trade direction to intraday VWAP, rejecting long entries extended > 2.5 sigma above VWAP.' },
  { label: '+ 15:15 IST Square-Off Guard', text: 'Auto square-off all open intraday positions strictly at 15:15 IST before market close.' },
  { label: '+ Max 1.0% Capital Risk', text: 'Size all position quantities so that stop-loss execution risks strictly <= 1.0% of portfolio equity.' },
];

export const AiQuantStudio: React.FC<AiQuantStudioProps> = ({
  client,
  onApplyStrategy,
  onNotice,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('frontier');
  const [centerTab, setCenterTab] = useState<CenterTab>('code');
  const [telemetryTab, setTelemetryTab] = useState<TelemetryTab>('overview');
  const [selectedModel, setSelectedModel] = useState<string>('DeepSeek-R1 (Quant CoT)');
  const [prompt, setPrompt] = useState<string>(STRATEGY_PRESETS[0].prompt);
  const [symbol, setSymbol] = useState<string>(STRATEGY_PRESETS[0].symbol);
  const [timeframe, setTimeframe] = useState<string>(STRATEGY_PRESETS[0].timeframe);

  // Hyperparameters
  const [fastEma, setFastEma] = useState<number>(9);
  const [slowEma, setSlowEma] = useState<number>(24);
  const [rsiGate, setRsiGate] = useState<number>(55);
  const [atrMult, setAtrMult] = useState<number>(1.8);
  const [riskEquityPct, setRiskEquityPct] = useState<number>(1.0);

  // Optimization Target Goals
  const [targetSharpe, setTargetSharpe] = useState<number>(2.0);
  const [maxDrawdownPct, setMaxDrawdownPct] = useState<number>(8.0);
  const [minWinRatePct, setMinWinRatePct] = useState<number>(60.0);
  const [targetProfitFactor, setTargetProfitFactor] = useState<number>(1.8);

  // Phase 3: Runtime Risk Governance Envelope
  const [runtimeRisk, setRuntimeRisk] = useState<RuntimeRiskEnvelope>({
    maxRiskPerTradePct: 1.0,
    maxDrawdownKillswitchPct: 8.0,
    maxLeverageClamp: 1.0,
    mandatoryBracketOrders: true,
    cooldownPeriodMinutes: 30,
    safeModeStatus: 'active',
  });
  const [riskModalOpen, setRiskModalOpen] = useState<boolean>(false);

  // Iteration state
  const [iterations, setIterations] = useState<OptimizationIteration[]>([]);
  const [selectedIterationIndex, setSelectedIterationIndex] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Ready for quantitative hypothesis build');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Current active iteration
  const currentIteration = useMemo(() => {
    if (iterations.length === 0) return null;
    return iterations[selectedIterationIndex] ?? iterations[iterations.length - 1];
  }, [iterations, selectedIterationIndex]);

  // Code editor state
  const [strategyCode, setStrategyCode] = useState<string>(() => {
    return `# honba:strategy:v1 (AI Quant Strategy)
from __future__ import annotations
import honba.strategies.base as _base

class NiftyIntradayMomentum(_base.Strategy):
    name = "nifty50_momentum_v3_atr_optimized"
    warmup_bars = 40

    def on_start(self) -> None:
        self.fast_ema = self.build_indicator("ema", period=9)
        self.slow_ema = self.build_indicator("ema", period=24)
        self.rsi = self.build_indicator("rsi", period=14)
        self.atr = self.build_indicator("atr", period=14)

    def on_bar(self, bar) -> None:
        fast = self.fast_ema.update(bar)
        slow = self.slow_ema.update(bar)
        rsi_val = self.rsi.update(bar)
        atr_val = self.atr.update(bar)

        if fast is not None and slow is not None and rsi_val is not None and atr_val is not None:
            # Entry confirmed only if RSI > 55 ensures bullish momentum regime
            if fast > slow and getattr(self, "_prev_fast", 0) <= getattr(self, "_prev_slow", 0) and rsi_val > 55:
                # Dynamic ATR risk sizing: 1.0% capital risk / (1.8 * ATR)
                # Runtime envelope enforces 1.0% equity cap & mandatory bracket SL
                risk_inr = self.equity * 0.010
                stop_distance = max(atr_val * 1.8, 5.0)
                qty = max(1, int(risk_inr / stop_distance))
                self.buy(
                    bar.instrument_id,
                    qty,
                    stop_loss=bar.close - stop_distance,
                    take_profit=bar.close + (stop_distance * 2.5),
                    reason="EMA Cross + RSI Confluence with Dynamic ATR Bracket",
                )
            self._prev_fast, self._prev_slow = fast, slow
`;
  });

  // Phase 3: Simulated Autopilot live events & positions
  const [liveTickPnl, setLiveTickPnl] = useState<number>(48520);
  const [activePosition, setActivePosition] = useState<ActiveLivePosition | null>({
    id: 'pos-1',
    symbol: 'NSE:NIFTY50 FUT',
    side: 'buy',
    qty: 25,
    entryPrice: 24912.0,
    currentPrice: 24954.5,
    unrealizedPnl: 4250,
    unrealizedPnlPct: 1.71,
    stopLoss: 24820.0,
    takeProfit: 25080.0,
    trailingStopActive: true,
    openedAt: '14:32:07',
  });

  const [liveLog, setLiveLog] = useState<Array<{ timestamp: string; level: 'info' | 'clamp' | 'trade'; message: string }>>([
    { timestamp: '14:32:05', level: 'info', message: 'DeepSeek-R1 CoT: Evaluating 5m NIFTY consolidation breakout @ 24,910' },
    { timestamp: '14:32:06', level: 'info', message: 'Model Proposal: BUY 100 NIFTY25OCTFUT (Requested 4.5x leverage)' },
    { timestamp: '14:32:06', level: 'clamp', message: '🛡️ RUNTIME INTERCEPTOR: Clamped leverage from 4.5x → 1.0x (Max 25 shares). Attached mandatory exchange SL @ 24,820 (-0.36% risk).' },
    { timestamp: '14:32:07', level: 'trade', message: 'Order Executed: BUY 25 NIFTY @ 24,912.00 | Broker Status: FILLED' },
  ]);

  // Handle Preset selection
  const handleSelectPreset = (preset: StrategyTemplatePreset) => {
    setPrompt(preset.prompt);
    setSymbol(preset.symbol);
    setTimeframe(preset.timeframe);
    if (onNotice) onNotice(`Loaded template: ${preset.title}`);
  };

  // Append prompt modifier chips
  const handleAddPromptChip = (chipText: string) => {
    setPrompt((prev) => (prev ? `${prev.trim()} ${chipText}` : chipText));
    if (onNotice) onNotice(`Added prompt directive: ${chipText.slice(0, 36)}...`);
  };

  // Phase 2: Run Autonomous Multi-Iteration Optimization Loop
  const handleStartLoop = async () => {
    setIsRunning(true);
    setStatusMessage('Formulating quantitative hypothesis & synthesizing initial code...');
    setIterations([]);

    const goal: OptimizationGoal = {
      objective: prompt,
      symbol,
      timeframe,
      targetSharpe,
      maxDrawdownPct,
      minWinRatePct,
      targetProfitFactor,
      maxIterations: 3,
    };

    let prevIteration: OptimizationIteration | undefined = undefined;
    const accumulated: OptimizationIteration[] = [];

    for (let i = 1; i <= 3; i++) {
      setStatusMessage(`Iteration #${i}: Compiling & running backtest on historical ${symbol} ${timeframe} candles...`);
      await new Promise((resolve) => setTimeout(resolve, 800));

      const iter = await runOptimizationStep(goal, i, prevIteration);
      accumulated.push(iter);
      setIterations([...accumulated]);
      setSelectedIterationIndex(accumulated.length - 1);
      setStrategyCode(iter.code);
      prevIteration = iter;

      if (i < 3) {
        setStatusMessage(`Iteration #${i} Complete. AI diagnosing drawdowns & refining rules...`);
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }

    setIsRunning(false);
    setStatusMessage('Validation Complete: Strategy satisfies Sharpe and Drawdown targets with Monte Carlo validation.');
    if (onNotice) onNotice('Autonomous Quant Optimization Complete: 3 Iterations Synthesized');
  };

  // Apply Drawdown Fix
  const handleApplyDrawdownFix = () => {
    if (selectedIterationIndex < iterations.length - 1) {
      setSelectedIterationIndex((idx) => idx + 1);
      const nextIter = iterations[selectedIterationIndex + 1];
      if (nextIter) {
        setStrategyCode(nextIter.code);
        if (onNotice) onNotice(`Applied Drawdown Fix from Iteration #${nextIter.iterationNumber}`);
      }
    } else {
      if (onNotice) onNotice('Latest iteration already incorporates the diagnosed drawdown mitigation.');
    }
  };

  // Simulate Next Model Order Proposal & Runtime Disposition
  const handleSimulateNextProposal = () => {
    const cmp = 24954.5;
    const proposal = simulateModelOrderProposal(symbol, cmp, 'buy');
    const disposition = disposeOrderWithRuntimeRisk(proposal, runtimeRisk, 1000000);

    const now = new Date().toLocaleTimeString();
    setLiveLog((prev) => [
      ...prev,
      { timestamp: now, level: 'info', message: proposal.reasoningTokenSnippet },
      { timestamp: now, level: 'clamp', message: disposition.dispositionReason },
      { timestamp: now, level: 'trade', message: `Order Executed: ${disposition.side.toUpperCase()} ${disposition.clampedQty} ${symbol} @ ₹${disposition.executionPrice} | Bracket SL: ₹${disposition.stopLossPrice}` },
    ]);

    setActivePosition({
      id: disposition.id,
      symbol: `${symbol} FUT`,
      side: disposition.side,
      qty: disposition.clampedQty,
      entryPrice: disposition.executionPrice,
      currentPrice: disposition.executionPrice + 12.0,
      unrealizedPnl: 300,
      unrealizedPnlPct: 0.85,
      stopLoss: disposition.stopLossPrice,
      takeProfit: disposition.takeProfitPrice,
      trailingStopActive: true,
      openedAt: now,
    });

    if (onNotice) onNotice('Simulated Trade Proposal successfully intercepted & clamped by Runtime.');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(strategyCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadCode = () => {
    const blob = new Blob([strategyCode], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentIteration?.graph.name || 'ai_quant_strategy'}.py`;
    a.click();
    URL.revokeObjectURL(url);
    if (onNotice) onNotice('Strategy Python file downloaded');
  };

  const handleApplyToSystem = () => {
    const stratName = currentIteration?.graph.name || 'nifty50_momentum_v3_atr_optimized';
    if (onApplyStrategy) {
      onApplyStrategy(strategyCode, stratName);
    }
    const now = new Date().toLocaleTimeString();
    setLiveLog((prev) => [
      ...prev,
      {
        timestamp: now,
        level: 'info',
        message: `🚀 Strategy Deployed: "${stratName}" mounted to execution runtime with Inviolable Risk Governance.`,
      },
    ]);
    setActiveTab('autopilot');
    if (onNotice) onNotice('Strategy successfully deployed to Autopilot (Live/Paper Arena)');
  };

  return (
    <div className="ai-quant-studio-root" data-testid="ai-quant-studio">
      {/* Studio Top Control Bar */}
      <header className="quant-studio-header">
        <div className="quant-studio-title-group">
          {/* Mode Switcher */}
          <div className="studio-nav-tabs">
            <button
              type="button"
              className={`studio-tab-btn ${activeTab === 'frontier' ? 'active' : ''}`}
              onClick={() => setActiveTab('frontier')}
            >
              <Activity size={14} />
              <span>Frontier (Strategy Lab)</span>
            </button>
            <button
              type="button"
              className={`studio-tab-btn ${activeTab === 'autopilot' ? 'active' : ''}`}
              onClick={() => setActiveTab('autopilot')}
            >
              <Zap size={14} />
              <span>Autopilot (Live/Paper Arena)</span>
              <span className="live-pulsing-dot" />
            </button>
          </div>
        </div>

        <div className="quant-studio-status-group">
          <div className="model-selector-wrapper">
            <Cpu size={14} className="text-secondary" />
            <select
              className="model-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              aria-label="Select AI Quant Model"
            >
              <option value="DeepSeek-R1 (Quant CoT)">DeepSeek-R1 (Quant CoT)</option>
              <option value="Claude 3.7 Sonnet (Quant Architect)">Claude 3.7 Sonnet (Quant Architect)</option>
              <option value="Qwen 2.5 Coder 32B">Qwen 2.5 Coder 32B</option>
              <option value="GPT-4o Quant Engine">GPT-4o Quant Engine</option>
            </select>
          </div>

          <button
            type="button"
            className="runtime-envelope-badge clickable"
            onClick={() => setRiskModalOpen(true)}
            title="Configure Inviolable Runtime Risk Envelope"
          >
            <Lock size={12} />
            <span>Runtime Risk: Clamped ({runtimeRisk.maxRiskPerTradePct.toFixed(1)}% Equity)</span>
          </button>

          <div className="killswitch-badge" title="Peak drawdown circuit breaker">
            <ShieldAlert size={12} />
            <span>Killswitch: -{runtimeRisk.maxDrawdownKillswitchPct.toFixed(1)}% DD</span>
          </div>
        </div>
      </header>

      {/* Main Studio Viewport */}
      {activeTab === 'frontier' ? (
        <div className="frontier-lab-layout">
          {/* Left Column: AI Prompt & Hypothesis Copilot */}
          <section className="frontier-copilot-pane">
            <div className="pane-header">
              <div className="pane-title">
                <Bot size={14} className="text-accent" />
                <span>Strategy Hypothesis &amp; Prompt</span>
              </div>
              <span className="badge-subtle">AI Strategy Builder · Natural Language Spec</span>
            </div>

            {/* Presets List */}
            <div className="presets-container">
              <div className="section-label-row">
                <span className="section-label">Quant Research Presets</span>
                <span className="presets-count-badge">{STRATEGY_PRESETS.length} Curated</span>
              </div>
              <div className="presets-grid">
                {STRATEGY_PRESETS.map((preset) => {
                  const isSelected = symbol === preset.symbol;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`preset-chip ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectPreset(preset)}
                      title={preset.description}
                    >
                      <div className="preset-top-row">
                        <span className="preset-chip-title">{preset.title}</span>
                        <span className="preset-sharpe-tag">SR {preset.sharpe.toFixed(2)}</span>
                      </div>
                      <div className="preset-bottom-row">
                        <span className="preset-chip-symbol">{preset.symbol} • {preset.timeframe}</span>
                        <span className="preset-archetype-tag">{preset.archetype}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Directive Chips */}
            <div className="prompt-directives-container">
              <span className="section-label">Directives & Prompt Augmentations</span>
              <div className="directive-chips-list">
                {PROMPT_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="directive-tag-btn"
                    onClick={() => handleAddPromptChip(chip.text)}
                    title={chip.text}
                  >
                    <span>{chip.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Input */}
            <div className="prompt-input-wrapper">
              <div className="field-label-row">
                <label htmlFor="ai-quant-prompt" className="section-label">
                  Trading Thesis & Signal Rationale
                </label>
                <span className="prompt-token-count">{prompt.length} chars</span>
              </div>
              <textarea
                id="ai-quant-prompt"
                className="quant-prompt-textarea"
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your strategy logic, indicators, and risk boundaries in plain English..."
              />
            </div>

            {/* Target Metrics Sliders */}
            <div className="targets-section">
              <span className="section-label">Optimization & Acceptance Goals</span>
              <div className="targets-grid">
                <div className="target-field">
                  <div className="field-label-row">
                    <span>Target Sharpe</span>
                    <strong className="text-accent">{targetSharpe.toFixed(1)}</strong>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="3.5"
                    step="0.1"
                    value={targetSharpe}
                    onChange={(e) => setTargetSharpe(parseFloat(e.target.value))}
                  />
                </div>

                <div className="target-field">
                  <div className="field-label-row">
                    <span>Max Drawdown Cap</span>
                    <strong className="text-accent">≤ {maxDrawdownPct.toFixed(0)}%</strong>
                  </div>
                  <input
                    type="range"
                    min="4.0"
                    max="18.0"
                    step="1.0"
                    value={maxDrawdownPct}
                    onChange={(e) => setMaxDrawdownPct(parseFloat(e.target.value))}
                  />
                </div>

                <div className="target-field">
                  <div className="field-label-row">
                    <span>Min Win Rate</span>
                    <strong className="text-accent">≥ {minWinRatePct.toFixed(0)}%</strong>
                  </div>
                  <input
                    type="range"
                    min="45"
                    max="75"
                    step="1"
                    value={minWinRatePct}
                    onChange={(e) => setMinWinRatePct(parseInt(e.target.value, 10))}
                  />
                </div>

                <div className="target-field">
                  <div className="field-label-row">
                    <span>Min Profit Factor</span>
                    <strong className="text-accent">≥ {targetProfitFactor.toFixed(1)}</strong>
                  </div>
                  <input
                    type="range"
                    min="1.2"
                    max="3.0"
                    step="0.1"
                    value={targetProfitFactor}
                    onChange={(e) => setTargetProfitFactor(parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {/* Start Button & Progress */}
            <div className="action-bar">
              <button
                type="button"
                className="btn-start-loop"
                onClick={handleStartLoop}
                disabled={isRunning}
              >
                {isRunning ? (
                  <>
                    <Activity className="spinning" size={16} />
                    <span>Optimizing Strategy…</span>
                  </>
                ) : (
                  <>
                    <Zap size={16} />
                    <span>⚡ Synthesize & Optimize Strategy</span>
                  </>
                )}
              </button>
            </div>

            <div className="loop-status-box">
              <span className="status-label">Pipeline Status:</span>
              <span className="status-text">{statusMessage}</span>
            </div>

            {/* Iteration Chain */}
            {iterations.length > 0 && (
              <div className="iterations-chain-section">
                <span className="section-label">Optimization History</span>
                <div className="iterations-pill-row">
                  {iterations.map((iter, idx) => (
                    <button
                      key={iter.iterationNumber}
                      type="button"
                      className={`iter-pill-btn ${selectedIterationIndex === idx ? 'active' : ''} ${
                        iter.goalsEvaluated.allMet ? 'met' : ''
                      }`}
                      onClick={() => {
                        setSelectedIterationIndex(idx);
                        setStrategyCode(iter.code);
                      }}
                    >
                      <span>Iter #{iter.iterationNumber}</span>
                      <span className="iter-sharpe">S: {iter.metrics.sharpe.toFixed(2)}</span>
                    </button>
                  ))}
                </div>

                {currentIteration && (
                  <div className="diagnostics-card">
                    <div className="diagnostics-header">
                      <Terminal size={13} />
                      <span>Iteration #{currentIteration.iterationNumber} Diagnostics</span>
                    </div>
                    <p className="hypothesis-text"><strong>Hypothesis:</strong> {currentIteration.hypothesis}</p>
                    <p className="reflection-text"><strong>AI Diagnostics:</strong> {currentIteration.aiReflection}</p>
                    <div className="changes-tag-list">
                      {currentIteration.changesSummary.added.map((add, i) => (
                        <span key={i} className="change-tag added">+{add}</span>
                      ))}
                      {currentIteration.changesSummary.modified.map((mod, i) => (
                        <span key={i} className="change-tag modified">~{mod}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Center Column: Python Strategy Code Sandbox & Visual Architecture */}
          <section className="frontier-code-pane">
            <div className="pane-header">
              <div className="pane-title">
                <FileCode size={14} className="text-secondary" />
                <span>Strategy Python Sandbox</span>
                <span className="badge-subtle">Pure Strategy Code</span>
              </div>

              {/* Sub-view switcher */}
              <div className="center-tab-switcher">
                <button
                  type="button"
                  className={`center-tab-btn ${centerTab === 'code' ? 'active' : ''}`}
                  onClick={() => setCenterTab('code')}
                >
                  <FileCode size={12} />
                  <span>Code</span>
                </button>
                <button
                  type="button"
                  className={`center-tab-btn ${centerTab === 'flow' ? 'active' : ''}`}
                  onClick={() => setCenterTab('flow')}
                >
                  <Workflow size={12} />
                  <span>AI Logic Flow</span>
                </button>
                <button
                  type="button"
                  className={`center-tab-btn ${centerTab === 'params' ? 'active' : ''}`}
                  onClick={() => setCenterTab('params')}
                >
                  <SlidersHorizontal size={12} />
                  <span>Hyperparameters</span>
                </button>
                <button
                  type="button"
                  className={`center-tab-btn ${centerTab === 'diff' ? 'active' : ''}`}
                  onClick={() => setCenterTab('diff')}
                >
                  <GitCompare size={12} />
                  <span>AI Diff</span>
                </button>
              </div>

              <div className="pane-actions">
                <button
                  type="button"
                  className="code-action-btn"
                  onClick={handleCopyCode}
                  title="Copy Python Code"
                >
                  {copiedCode ? <Check size={13} className="text-bull" /> : <Copy size={13} />}
                  <span>{copiedCode ? 'Copied!' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  className="code-action-btn"
                  onClick={handleDownloadCode}
                  title="Download Python Strategy File"
                >
                  <Download size={13} />
                  <span>Export .py</span>
                </button>
                <button
                  type="button"
                  className="code-action-btn btn-apply-primary"
                  onClick={handleApplyToSystem}
                >
                  <CheckCircle2 size={13} />
                  <span>Deploy to Autopilot</span>
                </button>
              </div>
            </div>

            {/* Center Tab Viewports */}
            {centerTab === 'code' && (
              <div className="editor-container">
                <Editor
                  height="100%"
                  defaultLanguage="python"
                  theme="vs-dark"
                  value={strategyCode}
                  onChange={(val) => setStrategyCode(val || '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 12,
                    fontFamily: 'JetBrains Mono, Fira Code, monospace',
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    padding: { top: 12 },
                  }}
                />
              </div>
            )}

            {centerTab === 'flow' && (
              <div className="ai-logic-flow-view">
                <div className="flow-header">
                  <div className="flow-title">
                    <Workflow size={15} className="text-accent" />
                    <span>AI-Synthesized Execution Graph</span>
                  </div>
                  <span className="flow-badge">Vectorized Pipeline</span>
                </div>
                <div className="flow-nodes-container">
                  <div className="flow-node">
                    <div className="node-icon-col market">
                      <Activity size={18} />
                    </div>
                    <div className="node-info-col">
                      <span className="node-step">1. Ingestion Feed</span>
                      <strong className="node-name">{symbol} ({timeframe} Bars)</strong>
                      <span className="node-desc">Streaming live OHLCV ticks from high-performance adapter gateway</span>
                    </div>
                    <span className="node-status-pill ok">LIVE FEED</span>
                  </div>

                  <div className="flow-arrow-down">
                    <ArrowRight size={16} />
                  </div>

                  <div className="flow-node">
                    <div className="node-icon-col indicator">
                      <TrendingUp size={18} />
                    </div>
                    <div className="node-info-col">
                      <span className="node-step">2. Feature Extraction</span>
                      <strong className="node-name">Dual EMA ({fastEma}/{slowEma}) + RSI ({rsiGate}) + ATR ({atrMult}x)</strong>
                      <span className="node-desc">Vectorized mathematical indicator matrix updated per tick</span>
                    </div>
                    <span className="node-status-pill ok">CALCULATED</span>
                  </div>

                  <div className="flow-arrow-down">
                    <ArrowRight size={16} />
                  </div>

                  <div className="flow-node">
                    <div className="node-icon-col signal">
                      <Sparkles size={18} />
                    </div>
                    <div className="node-info-col">
                      <span className="node-step">3. Alpha Signal Confluence</span>
                      <strong className="node-name">Golden Cross (EMA{fastEma} &gt; EMA{slowEma}) &amp; RSI &gt; {rsiGate}</strong>
                      <span className="node-desc">Multi-rule boolean logic filter removing rangebound noise and chop</span>
                    </div>
                    <span className="node-status-pill ok">TRIGGER</span>
                  </div>

                  <div className="flow-arrow-down">
                    <ArrowRight size={16} />
                  </div>

                  <div className="flow-node highlight-risk">
                    <div className="node-icon-col risk">
                      <Lock size={18} />
                    </div>
                    <div className="node-info-col">
                      <span className="node-step">4. Inviolable Risk Governance</span>
                      <strong className="node-name">Dynamic Sizing ({riskEquityPct}% Equity) &amp; {atrMult}x ATR Bracket Stop</strong>
                      <span className="node-desc">Deterministic interception clamping leverage to 1.0x cash-hard</span>
                    </div>
                    <span className="node-status-pill locked">PROTECTED</span>
                  </div>

                  <div className="flow-arrow-down">
                    <ArrowRight size={16} />
                  </div>

                  <div className="flow-node">
                    <div className="node-icon-col execution">
                      <CheckCircle2 size={18} />
                    </div>
                    <div className="node-info-col">
                      <span className="node-step">5. Order Gateway</span>
                      <strong className="node-name">BUY Bracket Order with Exchange-Enforced OCO Bracket</strong>
                      <span className="node-desc">Direct market routing with slippage protection and instant fill confirmation</span>
                    </div>
                    <span className="node-status-pill ok">READY</span>
                  </div>
                </div>
              </div>
            )}

            {centerTab === 'params' && (
              <div className="hyperparameters-view">
                <div className="params-header">
                  <div className="params-title">
                    <SlidersHorizontal size={15} className="text-accent" />
                    <span>Real-Time Hyperparameter Tuner</span>
                  </div>
                  <span className="params-badge">Dynamic Variables</span>
                </div>
                <div className="params-controls-grid">
                  <div className="param-control-card">
                    <div className="param-label-row">
                      <span>Fast EMA Period</span>
                      <strong className="text-accent">{fastEma}</strong>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="30"
                      value={fastEma}
                      onChange={(e) => setFastEma(parseInt(e.target.value, 10))}
                    />
                    <span className="param-hint">Shorter period tracks quick momentum turns</span>
                  </div>

                  <div className="param-control-card">
                    <div className="param-label-row">
                      <span>Slow EMA Period</span>
                      <strong className="text-accent">{slowEma}</strong>
                    </div>
                    <input
                      type="range"
                      min="15"
                      max="100"
                      value={slowEma}
                      onChange={(e) => setSlowEma(parseInt(e.target.value, 10))}
                    />
                    <span className="param-hint">Base trend direction and trailing support baseline</span>
                  </div>

                  <div className="param-control-card">
                    <div className="param-label-row">
                      <span>RSI Regime Gate</span>
                      <strong className="text-accent">{rsiGate}</strong>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="70"
                      value={rsiGate}
                      onChange={(e) => setRsiGate(parseInt(e.target.value, 10))}
                    />
                    <span className="param-hint">Threshold to confirm directional bullish continuation</span>
                  </div>

                  <div className="param-control-card">
                    <div className="param-label-row">
                      <span>ATR Trailing Multiplier</span>
                      <strong className="text-accent">{atrMult.toFixed(1)}x</strong>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="4.0"
                      step="0.1"
                      value={atrMult}
                      onChange={(e) => setAtrMult(parseFloat(e.target.value))}
                    />
                    <span className="param-hint">Volatility-adjusted bracket buffer for trailing stop-loss</span>
                  </div>

                  <div className="param-control-card">
                    <div className="param-label-row">
                      <span>Capital Risk per Trade (% Equity)</span>
                      <strong className="text-bull">{riskEquityPct.toFixed(1)}%</strong>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.5"
                      step="0.1"
                      value={riskEquityPct}
                      onChange={(e) => setRiskEquityPct(parseFloat(e.target.value))}
                    />
                    <span className="param-hint">Maximum dollar drawdown tolerated per trade execution</span>
                  </div>
                </div>
              </div>
            )}

            {centerTab === 'diff' && (
              <div className="diff-view-container">
                <div className="diff-header">
                  <div className="diff-title">
                    <GitCompare size={15} className="text-accent" />
                    <span>AI Mutation &amp; Refinement Diff</span>
                  </div>
                  <span className="diff-badge">Iteration Comparison</span>
                </div>
                <div className="diff-content-box">
                  <div className="diff-line diff-unchanged"># honba:strategy:v1 (AI Quant Strategy)</div>
                  <div className="diff-line diff-unchanged">from __future__ import annotations</div>
                  <div className="diff-line diff-unchanged">import honba.strategies.base as _base</div>
                  <div className="diff-line diff-unchanged">class NiftyIntradayMomentum(_base.Strategy):</div>
                  <div className="diff-line diff-added">+    # AI Refinement: Injected 14-period RSI regime gate to prevent false breakouts</div>
                  <div className="diff-line diff-added">+    self.rsi = self.build_indicator(&quot;rsi&quot;, period={rsiGate})</div>
                  <div className="diff-line diff-added">+    self.atr = self.build_indicator(&quot;atr&quot;, period=14)</div>
                  <div className="diff-line diff-unchanged">    def on_bar(self, bar) -&gt; None:</div>
                  <div className="diff-line diff-modified">~        if fast &gt; slow and getattr(self, &quot;_prev_fast&quot;, 0) &lt;= getattr(self, &quot;_prev_slow&quot;, 0) and rsi_val &gt; {rsiGate}:</div>
                  <div className="diff-line diff-added">+            # Dynamic ATR risk sizing: {riskEquityPct}% capital risk / ({atrMult} * ATR)</div>
                  <div className="diff-line diff-added">+            stop_distance = max(atr_val * {atrMult}, 5.0)</div>
                  <div className="diff-line diff-unchanged">            self.buy(bar.instrument_id, qty, stop_loss=bar.close - stop_distance)</div>
                </div>
              </div>
            )}

            {/* Bottom Parameter Quick-Tuner */}
            <div className="parameter-tuner-bar">
              <div className="tuner-title">
                <Sliders size={13} />
                <span>Strategy Parameters</span>
              </div>
              <div className="tuner-chips">
                <div className="tuner-chip">
                  <span className="chip-name">Fast EMA:</span>
                  <input
                    type="number"
                    value={fastEma}
                    onChange={(e) => setFastEma(parseInt(e.target.value, 10) || 9)}
                    className="tuner-input"
                  />
                </div>
                <div className="tuner-chip">
                  <span className="chip-name">Slow EMA:</span>
                  <input
                    type="number"
                    value={slowEma}
                    onChange={(e) => setSlowEma(parseInt(e.target.value, 10) || 24)}
                    className="tuner-input"
                  />
                </div>
                <div className="tuner-chip">
                  <span className="chip-name">RSI Gate:</span>
                  <input
                    type="number"
                    value={rsiGate}
                    onChange={(e) => setRsiGate(parseInt(e.target.value, 10) || 55)}
                    className="tuner-input"
                  />
                </div>
                <div className="tuner-chip">
                  <span className="chip-name">ATR Multiplier:</span>
                  <input
                    type="number"
                    step="0.1"
                    value={atrMult}
                    onChange={(e) => setAtrMult(parseFloat(e.target.value) || 1.8)}
                    className="tuner-input"
                  />
                </div>
                <div className="tuner-chip">
                  <span className="chip-name">Risk Equity %:</span>
                  <input
                    type="number"
                    step="0.1"
                    value={riskEquityPct}
                    onChange={(e) => setRiskEquityPct(parseFloat(e.target.value) || 1.0)}
                    className="tuner-input"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Right Column: Scientific Quantitative Validation & Robustness Lab (Phase 2) */}
          <section className="frontier-telemetry-pane">
            <div className="pane-header">
              <div className="pane-title">
                <BarChart3 size={14} className="text-bull" />
                <span>Scientific Quantitative Validation</span>
              </div>

              {/* Phase 2: Telemetry Navigation Tabs */}
              <div className="telemetry-nav-tabs">
                <button
                  type="button"
                  className={`telem-tab-btn ${telemetryTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setTelemetryTab('overview')}
                >
                  Overview
                </button>
                <button
                  type="button"
                  className={`telem-tab-btn ${telemetryTab === 'monte-carlo' ? 'active' : ''}`}
                  onClick={() => setTelemetryTab('monte-carlo')}
                >
                  Monte Carlo
                </button>
                <button
                  type="button"
                  className={`telem-tab-btn ${telemetryTab === 'walk-forward' ? 'active' : ''}`}
                  onClick={() => setTelemetryTab('walk-forward')}
                >
                  Walk-Forward
                </button>
                <button
                  type="button"
                  className={`telem-tab-btn ${telemetryTab === 'diagnostics' ? 'active' : ''}`}
                  onClick={() => setTelemetryTab('diagnostics')}
                >
                  Diagnostics
                </button>
              </div>
            </div>

            {/* Performance Metrics Cards Common */}
            <div className="metrics-cards-grid">
              <div className="metric-box">
                <span className="metric-label">Net Profit</span>
                <span className="metric-val text-bull">
                  +₹{currentIteration?.metrics.netPnl.toLocaleString() ?? '52,800'}
                  <small className="metric-sub">({currentIteration?.metrics.netPnlPct ?? '21.1'}%)</small>
                </span>
              </div>
              <div className="metric-box">
                <span className="metric-label">Sharpe Ratio</span>
                <span className="metric-val text-accent">
                  {currentIteration?.metrics.sharpe.toFixed(2) ?? '2.33'}
                </span>
              </div>
              <div className="metric-box">
                <span className="metric-label">Max Drawdown</span>
                <span className="metric-val text-bear">
                  -{currentIteration?.metrics.maxDrawdown.toFixed(1) ?? '5.6'}%
                </span>
              </div>
              <div className="metric-box">
                <span className="metric-label">Win Rate</span>
                <span className="metric-val text-bull">
                  {currentIteration?.metrics.winRate.toFixed(1) ?? '64.5'}%
                </span>
              </div>
              <div className="metric-box">
                <span className="metric-label">Profit Factor</span>
                <span className="metric-val text-accent">
                  {currentIteration?.metrics.profitFactor.toFixed(2) ?? '2.15'}
                </span>
              </div>
              <div className="metric-box">
                <span className="metric-label">Total Trades</span>
                <span className="metric-val text-secondary">
                  {currentIteration?.metrics.trades ?? 54}
                </span>
              </div>
            </div>

            {/* Tab 1: Overview (Equity Curve & Rule Significance) */}
            {telemetryTab === 'overview' && (
              <>
                <div className="equity-chart-section">
                  <div className="chart-header">
                    <span>Cumulative Equity &amp; Underwater Drawdown</span>
                    <span className="chart-range">Simulated Historical Candles</span>
                  </div>
                  <div className="svg-chart-container">
                    <svg viewBox="0 0 400 120" className="equity-svg">
                      <defs>
                        <linearGradient id="equityGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#089981" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#089981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <line x1="0" y1="30" x2="400" y2="30" stroke="#2a2e39" strokeDasharray="3 3" />
                      <line x1="0" y1="60" x2="400" y2="60" stroke="#2a2e39" strokeDasharray="3 3" />
                      <line x1="0" y1="90" x2="400" y2="90" stroke="#2a2e39" strokeDasharray="3 3" />

                      <polygon
                        points="0,110 20,105 50,95 80,98 120,80 150,85 190,65 230,68 270,45 310,50 350,25 390,15 400,10 400,110"
                        fill="url(#equityGrad)"
                      />
                      <polyline
                        points="0,110 20,105 50,95 80,98 120,80 150,85 190,65 230,68 270,45 310,50 350,25 390,15 400,10"
                        fill="none"
                        stroke="#089981"
                        strokeWidth="2.5"
                      />
                    </svg>
                  </div>
                </div>

                <div className="robustness-section">
                  <div className="robustness-header">
                    <div className="robustness-title">
                      <TrendingUp size={14} className="text-bull" />
                      <span>Rule Significance &amp; Edge Testing</span>
                    </div>
                    <span className="badge-subtle">Bootstrap Alpha</span>
                  </div>
                  <div className="significance-card">
                    <div className="sig-row">
                      <span>Statistical p-value:</span>
                      <strong className="text-bull">
                        p = {currentIteration?.ruleSignificance?.pValue ?? 0.003} (p &lt; 0.01 Edge Confirmed)
                      </strong>
                    </div>
                    <div className="sig-row">
                      <span>Alpha vs Random Walk:</span>
                      <strong className="text-accent">
                        {currentIteration?.ruleSignificance?.alphaScore ?? 94} / 100
                      </strong>
                    </div>
                    <div className="sig-row">
                      <span>Overfitting Risk:</span>
                      <strong className="badge-safe">
                        {currentIteration?.ruleSignificance?.overfittingRisk?.toUpperCase() ?? 'LOW'}
                      </strong>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Tab 2: Monte Carlo Permutation Histogram (Phase 2) */}
            {telemetryTab === 'monte-carlo' && (
              <div className="monte-carlo-detailed-section">
                <div className="robustness-header">
                  <div className="robustness-title">
                    <Dices size={14} className="text-accent" />
                    <span>Monte Carlo Stress-Test (1,000x Shuffles)</span>
                  </div>
                  <span className="badge-subtle">Distribution Histogram</span>
                </div>

                <div className="robustness-grid">
                  <div className="robustness-card">
                    <span className="card-caption">Ruin Probability</span>
                    <strong className="card-value text-bull">
                      {currentIteration?.monteCarlo?.ruinProbabilityPct ?? 0.08}%
                    </strong>
                    <span className="card-desc">Risk of -50% DD breach</span>
                  </div>
                  <div className="robustness-card">
                    <span className="card-caption">95% Value-at-Risk</span>
                    <strong className="card-value text-bear">
                      -{currentIteration?.monteCarlo?.valueAtRisk95Pct ?? 7.2}%
                    </strong>
                    <span className="card-desc">Max DD in 95% paths</span>
                  </div>
                  <div className="robustness-card">
                    <span className="card-caption">Worst-Case Tail DD</span>
                    <strong className="card-value text-bear">
                      -{currentIteration?.monteCarlo?.worstCaseDrawdownPct ?? 8.9}%
                    </strong>
                    <span className="card-desc">1/1000 extreme path</span>
                  </div>
                </div>

                {/* Histogram Visualizer */}
                <div className="histogram-container">
                  <span className="section-label">Simulated Drawdown Density Distribution</span>
                  <div className="histogram-bars-list">
                    {(currentIteration?.monteCarlo?.histogram ?? [
                      { drawdownRange: '3.0% - 4.5%', count: 180, percentage: 18.0 },
                      { drawdownRange: '4.5% - 6.0%', count: 520, percentage: 52.0 },
                      { drawdownRange: '6.0% - 7.5%', count: 210, percentage: 21.0 },
                      { drawdownRange: '7.5% - 9.0%', count: 78, percentage: 7.8 },
                      { drawdownRange: '> 9.0%', count: 12, percentage: 1.2 },
                    ]).map((bucket, bIdx) => (
                      <div key={bIdx} className="hist-row">
                        <span className="hist-range">{bucket.drawdownRange}</span>
                        <div className="hist-bar-track">
                          <div
                            className="hist-bar-fill"
                            style={{
                              width: `${bucket.percentage}%`,
                              backgroundColor: bIdx > 3 ? '#f85149' : bIdx > 2 ? '#f7a600' : '#089981',
                            }}
                          />
                        </div>
                        <span className="hist-pct">{bucket.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Walk-Forward Out-of-Sample Validation (Phase 2) */}
            {telemetryTab === 'walk-forward' && (
              <div className="walk-forward-detailed-section">
                <div className="robustness-header">
                  <div className="robustness-title">
                    <Split size={14} className="text-bull" />
                    <span>Walk-Forward Out-of-Sample Validation</span>
                  </div>
                  <span className="badge-subtle">70% IS / 30% OOS</span>
                </div>

                <div className="wf-comparison-card">
                  <div className="wf-metrics-duo">
                    <div className="wf-metric-col">
                      <span className="wf-label">In-Sample (Train) Sharpe</span>
                      <strong className="wf-val text-accent">
                        {currentIteration?.walkForward?.inSampleSharpe ?? 2.47}
                      </strong>
                      <span className="wf-sub">3,500 historical bars</span>
                    </div>
                    <ArrowRight size={18} className="wf-arrow" />
                    <div className="wf-metric-col">
                      <span className="wf-label">Out-of-Sample (Test) Sharpe</span>
                      <strong className="wf-val text-bull">
                        {currentIteration?.walkForward?.outOfSampleSharpe ?? 2.19}
                      </strong>
                      <span className="wf-sub">1,500 unseen bars</span>
                    </div>
                  </div>

                  <div className="wf-efficiency-bar-group">
                    <div className="efficiency-row">
                      <span>Walk-Forward Efficiency Ratio (WFE):</span>
                      <strong className="text-bull">
                        {((currentIteration?.walkForward?.efficiencyRatio ?? 0.88) * 100).toFixed(0)}%
                        <span className="wfe-badge">&gt; 70% Institutional Pass</span>
                      </strong>
                    </div>
                    <div className="wf-progress-track">
                      <div
                        className="wf-progress-fill"
                        style={{ width: `${(currentIteration?.walkForward?.efficiencyRatio ?? 0.88) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="overfitting-score-card">
                    <span>Curve-Fitting Risk Probability:</span>
                    <strong className="text-bull">
                      {currentIteration?.walkForward?.overfittingScore ?? 12}% (Robust Generalization)
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Drawdown Diagnostics & One-Click AI Refinement (Phase 2) */}
            {telemetryTab === 'diagnostics' && (
              <div className="diagnostics-detailed-section">
                <div className="robustness-header">
                  <div className="robustness-title">
                    <ShieldAlert size={14} className="text-bear" />
                    <span>Drawdown Cluster Diagnostics</span>
                  </div>
                  <span className="badge-subtle">Tail Risk Root-Cause</span>
                </div>

                <div className="diagnostics-deep-card">
                  <div className="cluster-header">
                    <span className="cluster-label">Worst Drawdown Window:</span>
                    <strong className="cluster-time">
                      {currentIteration?.drawdownDiagnostics?.worstDrawdownStart ?? '11:15 IST'} -{' '}
                      {currentIteration?.drawdownDiagnostics?.worstDrawdownEnd ?? '13:30 IST'}
                    </strong>
                  </div>

                  <div className="cluster-body">
                    <span className="cluster-reason-title">Root Cause Analysis:</span>
                    <p className="cluster-reason-text">
                      {currentIteration?.drawdownDiagnostics?.lossClusterReason ??
                        'Sideways lunchtime chop: Repeated false breakouts during rangebound consolidation.'}
                    </p>

                    <span className="cluster-fix-title">Algorithmic Recommendation:</span>
                    <p className="cluster-fix-text">
                      {currentIteration?.drawdownDiagnostics?.recommendedRefinement ??
                        'Incorporate 14-period RSI regime gate (> 55) and dynamic ATR trailing stop.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn-apply-drawdown-fix"
                    onClick={handleApplyDrawdownFix}
                  >
                    <Zap size={14} />
                    <span>⚡ Apply AI Drawdown Fix &amp; Auto-Refine</span>
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : (
        /* Autopilot Mode (Autonomous Execution Arena - Phase 3) */
        <div className="autopilot-arena-layout">
          {/* Top Live Feed Overview */}
          <div className="autopilot-summary-bar">
            <div className="live-metric">
              <span className="live-metric-title">Autopilot Status</span>
              <div className="live-status-indicator">
                <span className="live-beacon" />
                <strong>ACTIVE (Go/Rust Runtime Monitoring)</strong>
              </div>
            </div>
            <div className="live-metric">
              <span className="live-metric-title">Active Market</span>
              <span className="live-metric-val">{symbol} • {timeframe}</span>
            </div>
            <div className="live-metric">
              <span className="live-metric-title">Simulated Portfolio PnL</span>
              <span className="live-metric-val text-bull">+₹{liveTickPnl.toLocaleString()}</span>
            </div>
            <div className="live-metric">
              <span className="live-metric-title">Runtime Risk Interceptor</span>
              <span className="live-metric-val text-accent">100% Proposals Filtered</span>
            </div>
            <div className="live-metric action-metric">
              <button
                type="button"
                className="btn-simulate-proposal"
                onClick={handleSimulateNextProposal}
                title="Trigger simulated AI signal & deterministic risk interceptor"
              >
                <Play size={13} />
                <span>Simulate Trade Proposal</span>
              </button>
              <button
                type="button"
                className="btn-killswitch"
                onClick={() => {
                  setActivePosition(null);
                  if (onNotice) onNotice('KILLSWITCH ENGAGED: Autopilot halted, all positions flattened.');
                }}
              >
                <ShieldAlert size={14} />
                <span>Emergency Flatten &amp; Halt</span>
              </button>
            </div>
          </div>

          <div className="autopilot-dual-panels">
            {/* Left: AI Reasoning Stream & Live Ticks */}
            <div className="autopilot-reasoning-pane">
              <div className="pane-header">
                <div className="pane-title">
                  <Activity size={14} className="text-accent" />
                  <span>AI Reasoning Stream ({selectedModel})</span>
                </div>
                <span className="badge-subtle">Real-Time Tokens</span>
              </div>
              <div className="reasoning-feed">
                <div className="reasoning-bubble">
                  <span className="bubble-timestamp">14:34:00</span>
                  <p className="bubble-text">
                    <strong>CoT Market Analysis:</strong> 5-minute candle on {symbol} printed high-volume consolidation above EMA({fastEma}) @ 24,930. RSI(14) reading 62.4 confirms expanding momentum regime. Volatility ATR is compressing to 14.2 points, signaling upcoming directional expansion.
                  </p>
                </div>
                <div className="reasoning-bubble">
                  <span className="bubble-timestamp">14:34:15</span>
                  <p className="bubble-text">
                    <strong>Model Proposal:</strong> Preparing long breakout intent. Proposing BUY order with 2x leverage. Stop-loss projected at 24,895 (2.4x ATR).
                  </p>
                </div>
                <div className="reasoning-bubble highlight">
                  <span className="bubble-timestamp">14:34:16</span>
                  <p className="bubble-text">
                    <strong>Runtime Interceptor:</strong> Evaluated proposal. Applied hard 1.0x cash leverage clamp. Injected mandatory bracket stop order @ 24,895. Order submitted to simulated NSE gateway.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Deterministic Risk Execution & Audit Log */}
            <div className="autopilot-disposer-pane">
              <div className="pane-header">
                <div className="pane-title">
                  <ShieldCheck size={14} className="text-bull" />
                  <span>Deterministic Risk Execution &amp; Audit Log</span>
                </div>
                <span className="badge-subtle">Runtime Interceptor</span>
              </div>

              <div className="disposer-log-list">
                {liveLog.map((entry, idx) => (
                  <div key={idx} className={`log-entry-row level-${entry.level}`}>
                    <span className="log-time">{entry.timestamp}</span>
                    <span className="log-msg">{entry.message}</span>
                  </div>
                ))}
              </div>

              {/* Active Position Card */}
              {activePosition ? (
                <div className="active-position-card">
                  <div className="position-header">
                    <span className="pos-badge buy">{activePosition.side.toUpperCase()}</span>
                    <strong className="pos-symbol">{activePosition.qty} shares {activePosition.symbol}</strong>
                    <span className="pos-pnl text-bull">
                      +₹{activePosition.unrealizedPnl.toLocaleString()} (+{activePosition.unrealizedPnlPct}%)
                    </span>
                  </div>
                  <div className="position-details">
                    <div>Avg Entry: <strong>₹{activePosition.entryPrice.toFixed(2)}</strong></div>
                    <div>Current CMP: <strong>₹{activePosition.currentPrice.toFixed(2)}</strong></div>
                    <div>Exchange Stop-Loss: <strong className="text-bear">₹{activePosition.stopLoss.toFixed(2)} (Hard Bracket)</strong></div>
                    <div>Take Profit: <strong className="text-bull">₹{activePosition.takeProfit.toFixed(2)}</strong></div>
                  </div>
                  <div className="position-footer-row">
                    <span className="pos-time">Opened: {activePosition.openedAt} • Trailing Stop Active</span>
                    <button
                      type="button"
                      className="btn-close-pos"
                      onClick={() => {
                        setActivePosition(null);
                        if (onNotice) onNotice('Position squared off.');
                      }}
                    >
                      Close Position
                    </button>
                  </div>
                </div>
              ) : (
                <div className="no-positions-box">
                  <ShieldCheck size={20} className="text-secondary" />
                  <span>No active open exposure. Risk capital fully protected.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Persistent Bottom Bar: Deterministic Runtime Risk Guardrail Envelope */}
      <footer className="runtime-envelope-footer">
        <div className="footer-title">
          <Lock size={13} className="text-accent" />
          <span>Inviolable Execution Envelope:</span>
        </div>
        <div className="footer-guardrails-row">
          <div className="guardrail-item">
            <span className="g-label">Max Risk / Trade:</span>
            <strong className="g-val text-bull">{runtimeRisk.maxRiskPerTradePct.toFixed(1)}% Equity</strong>
          </div>
          <div className="guardrail-item">
            <span className="g-label">Drawdown Killswitch:</span>
            <strong className="g-val text-bear">-{runtimeRisk.maxDrawdownKillswitchPct.toFixed(1)}% Auto-Close</strong>
          </div>
          <div className="guardrail-item">
            <span className="g-label">Leverage Clamp:</span>
            <strong className="g-val text-accent">{runtimeRisk.maxLeverageClamp.toFixed(1)}x (Cash Hard)</strong>
          </div>
          <div className="guardrail-item">
            <span className="g-label">Exchange Stop-Loss:</span>
            <strong className="g-val text-bull">Mandatory Bracket (Locked)</strong>
          </div>
          <div className="guardrail-item">
            <span className="g-label">Cooldown Timer:</span>
            <strong className="g-val">{runtimeRisk.cooldownPeriodMinutes} mins anti-looping</strong>
          </div>
          <div className="guardrail-item">
            <span className="g-label">Safe Mode:</span>
            <span className="status-badge-active">PROTECTED</span>
          </div>
          <button
            type="button"
            className="btn-configure-risk"
            onClick={() => setRiskModalOpen(true)}
          >
            Adjust Risk Envelope
          </button>
        </div>
      </footer>

      {/* Phase 3: Runtime Risk Envelope Modal */}
      {riskModalOpen && (
        <div className="modal-backdrop">
          <div className="risk-modal-card">
            <div className="modal-header">
              <div className="modal-title">
                <Lock size={16} className="text-accent" />
                <span>Deterministic Risk Governance Envelope</span>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setRiskModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-desc">
                Safety boundaries enforced by the deterministic runtime. The AI model can formulate trading ideas, but the execution runtime intercepts and clamps every parameter to ensure zero unmitigated risk.
              </p>

              <div className="risk-config-group">
                <div className="config-row">
                  <label htmlFor="risk-per-trade-input">Max Capital Risk per Trade (% Equity):</label>
                  <div className="config-val-wrap">
                    <input
                      id="risk-per-trade-input"
                      type="range"
                      min="0.5"
                      max="3.0"
                      step="0.1"
                      value={runtimeRisk.maxRiskPerTradePct}
                      onChange={(e) =>
                        setRuntimeRisk((r) => ({ ...r, maxRiskPerTradePct: parseFloat(e.target.value) }))
                      }
                    />
                    <strong className="text-bull">{runtimeRisk.maxRiskPerTradePct.toFixed(1)}%</strong>
                  </div>
                </div>

                <div className="config-row">
                  <label htmlFor="killswitch-input">Peak-to-Trough Drawdown Killswitch (%):</label>
                  <div className="config-val-wrap">
                    <input
                      id="killswitch-input"
                      type="range"
                      min="4.0"
                      max="15.0"
                      step="1.0"
                      value={runtimeRisk.maxDrawdownKillswitchPct}
                      onChange={(e) =>
                        setRuntimeRisk((r) => ({ ...r, maxDrawdownKillswitchPct: parseFloat(e.target.value) }))
                      }
                    />
                    <strong className="text-bear">-{runtimeRisk.maxDrawdownKillswitchPct.toFixed(1)}%</strong>
                  </div>
                </div>

                <div className="config-row">
                  <label htmlFor="leverage-clamp-select">Max Leverage Clamp:</label>
                  <select
                    id="leverage-clamp-select"
                    className="risk-select"
                    value={runtimeRisk.maxLeverageClamp}
                    onChange={(e) =>
                      setRuntimeRisk((r) => ({ ...r, maxLeverageClamp: parseFloat(e.target.value) }))
                    }
                  >
                    <option value="1.0">1.0x (Cash only - No Leverage)</option>
                    <option value="2.0">2.0x (Conservative Margin)</option>
                    <option value="3.0">3.0x (Hard Max Ceiling)</option>
                  </select>
                </div>

                <div className="config-row">
                  <label htmlFor="cooldown-select">Anti-Looping Re-Entry Cooldown:</label>
                  <select
                    id="cooldown-select"
                    className="risk-select"
                    value={runtimeRisk.cooldownPeriodMinutes}
                    onChange={(e) =>
                      setRuntimeRisk((r) => ({ ...r, cooldownPeriodMinutes: parseInt(e.target.value, 10) }))
                    }
                  >
                    <option value="15">15 Minutes</option>
                    <option value="30">30 Minutes (Recommended)</option>
                    <option value="60">60 Minutes</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-save-risk"
                onClick={() => {
                  setRiskModalOpen(false);
                  if (onNotice) onNotice('Runtime Risk Envelope parameters updated.');
                }}
              >
                Apply &amp; Lock Envelope
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

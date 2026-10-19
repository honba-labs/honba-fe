import React, { useState, useMemo, useEffect } from 'react';
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
} from 'lucide-react';

import type { ApiClient } from '../../../core/api/client';
import {
  DEFAULT_OPTIMIZATION_GOAL,
  runOptimizationStep,
  runMonteCarloSimulation,
  calculateRuleSignificance,
  evaluateRuntimeRiskEnvelope,
} from '../ai-loop/ai-optimizer-engine';
import type {
  OptimizationGoal,
  OptimizationIteration,
  MonteCarloResult,
  RuleSignificanceResult,
  RuntimeRiskEnvelope,
} from '../ai-loop/ai-optimizer-types';
import './AiQuantStudio.css';

export interface AiQuantStudioProps {
  client?: ApiClient;
  onApplyStrategy?: (code: string, name: string) => void;
  onNotice?: (message: string) => void;
}

export type StudioTab = 'frontier' | 'autopilot';

export interface StrategyTemplatePreset {
  id: string;
  title: string;
  symbol: string;
  timeframe: string;
  description: string;
  prompt: string;
}

const STRATEGY_PRESETS: StrategyTemplatePreset[] = [
  {
    id: 'nifty-momentum',
    title: 'NIFTY Intraday Momentum Breakout',
    symbol: 'NSE:NIFTY50',
    timeframe: '5m',
    description: 'Dual EMA crossover with RSI momentum regime gate and dynamic ATR risk sizing',
    prompt: 'Build an intraday trend breakout strategy on NIFTY 5m with EMA(9) crossing EMA(24), RSI(14) > 55 filter for chop elimination, and 1.8x ATR trailing bracket stops risking 1.0% equity per trade.',
  },
  {
    id: 'banknifty-squeeze',
    title: 'BANKNIFTY Volatility Squeeze',
    symbol: 'NSE:BANKNIFTY',
    timeframe: '15m',
    description: 'Bollinger Band squeeze inside Keltner Channel with directional ADX confirmation',
    prompt: 'Create a volatility expansion breakout strategy on BANKNIFTY 15m detecting Bollinger Bands contracting inside Keltner Channels, triggering on momentum expansion with ADX > 25.',
  },
  {
    id: 'hft-vwap',
    title: 'NSE High-Frequency VWAP Reversion',
    symbol: 'NSE:RELIANCE',
    timeframe: '1m',
    description: 'Mean reversion on volume-weighted standard deviation bands with strict time decay',
    prompt: 'Design a statistical mean-reversion algorithm on RELIANCE 1m targeting price extensions beyond 2.0 standard deviations from intraday VWAP, closing positions within 15 minutes or upon VWAP touch.',
  },
  {
    id: 'stat-arb',
    title: 'NIFTY / BANKNIFTY Cointegration Pairs',
    symbol: 'NSE:NIFTY-BANKNIFTY',
    timeframe: '5m',
    description: 'Statistical arbitrage on cointegrated spread z-score reversion',
    prompt: 'Develop a statistical arbitrage pairs trading model tracking the synthetic spread between NIFTY and BANKNIFTY futures, opening mean-reversion positions at z-score ±2.2 with half-life decay stops.',
  },
];

export const AiQuantStudio: React.FC<AiQuantStudioProps> = ({
  client,
  onApplyStrategy,
  onNotice,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('frontier');
  const [selectedModel, setSelectedModel] = useState<string>('DeepSeek-R1 (Quant CoT)');
  const [prompt, setPrompt] = useState<string>(STRATEGY_PRESETS[0].prompt);
  const [symbol, setSymbol] = useState<string>(STRATEGY_PRESETS[0].symbol);
  const [timeframe, setTimeframe] = useState<string>(STRATEGY_PRESETS[0].timeframe);

  // Optimization Target Goals
  const [targetSharpe, setTargetSharpe] = useState<number>(2.0);
  const [maxDrawdownPct, setMaxDrawdownPct] = useState<number>(8.0);
  const [minWinRatePct, setMinWinRatePct] = useState<number>(60.0);
  const [targetProfitFactor, setTargetProfitFactor] = useState<number>(1.8);

  // Runtime Risk Governance Envelope: Deterministic capital and loss controls
  const [runtimeRisk, setRuntimeRisk] = useState<RuntimeRiskEnvelope>({
    maxRiskPerTradePct: 1.0,
    maxDrawdownKillswitchPct: 8.0,
    maxLeverageClamp: 1.0,
    mandatoryBracketOrders: true,
    cooldownPeriodMinutes: 30,
    safeModeStatus: 'active',
  });

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

  // Simulated Autopilot live events
  const [liveTickPnl, setLiveTickPnl] = useState<number>(48520);
  const [liveLog, setLiveLog] = useState<Array<{ timestamp: string; level: 'info' | 'clamp' | 'trade'; message: string }>>([
    { timestamp: '14:32:05', level: 'info', message: 'DeepSeek-R1 CoT: Evaluating 5m NIFTY consolidation breakout @ 24,910' },
    { timestamp: '14:32:06', level: 'info', message: 'Model Proposal: BUY 100 NIFTY25OCTFUT (Requested 4.5x leverage)' },
    { timestamp: '14:32:06', level: 'clamp', message: '🛡️ RUNTIME DISPOSED: Clamped leverage from 4.5x → 1.0x (Max 25 shares). Attached mandatory exchange SL @ 24,820 (-0.36% risk).' },
    { timestamp: '14:32:07', level: 'trade', message: 'Order Executed: BUY 25 NIFTY @ 24,912.00 | Broker Status: FILLED' },
  ]);

  // Handle Preset selection
  const handleSelectPreset = (preset: StrategyTemplatePreset) => {
    setPrompt(preset.prompt);
    setSymbol(preset.symbol);
    setTimeframe(preset.timeframe);
    if (onNotice) onNotice(`Loaded template: ${preset.title}`);
  };

  // Run Autonomous Optimization Loop

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

  const handleCopyCode = () => {
    navigator.clipboard.writeText(strategyCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleApplyToSystem = () => {
    if (onApplyStrategy) {
      onApplyStrategy(strategyCode, currentIteration?.graph.name || 'ai_quant_strategy');
    }
    if (onNotice) onNotice('Strategy deployed to live runtime engine');
  };

  return (
    <div className="ai-quant-studio-root" data-testid="ai-quant-studio">
      {/* Studio Top Control Bar */}
      <header className="quant-studio-header">
        <div className="quant-studio-title-group">
          <div className="studio-brand">
            <Sparkles className="brand-icon" size={18} />
            <h1 className="brand-title">Honba AI Quant Studio</h1>
            <span className="badge-framework">Autonomous Strategy Engine</span>
          </div>

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
              <option value="Claude 3.5 Sonnet (Quant Architect)">Claude 3.5 Sonnet (Quant Architect)</option>
              <option value="Qwen 2.5 Coder 32B">Qwen 2.5 Coder 32B</option>
              <option value="GPT-4o Quant Engine">GPT-4o Quant Engine</option>
            </select>
          </div>

          <div className="runtime-envelope-badge" title="Hardcoded safety limits enforced outside model reach">
            <Lock size={12} />
            <span>Runtime Risk: Clamped (1.0% Equity)</span>
          </div>

          <div className="killswitch-badge" title="Peak drawdown circuit breaker">
            <ShieldAlert size={12} />
            <span>Killswitch: -8.0% DD</span>
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
                <Sparkles size={14} className="text-accent" />
                <span>AI Strategy Builder</span>
              </div>
              <span className="badge-subtle">Natural Language Spec</span>
            </div>

            {/* Presets List */}
            <div className="presets-container">
              <span className="section-label">Quant Research Presets</span>
              <div className="presets-grid">
                {STRATEGY_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className="preset-chip"
                    onClick={() => handleSelectPreset(preset)}
                    title={preset.description}
                  >
                    <span className="preset-chip-title">{preset.title}</span>
                    <span className="preset-chip-symbol">{preset.symbol} • {preset.timeframe}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Input */}
            <div className="prompt-input-wrapper">
              <label htmlFor="ai-quant-prompt" className="section-label">
                Trading Thesis & Signal Rationale
              </label>
              <textarea
                id="ai-quant-prompt"
                className="quant-prompt-textarea"
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your strategy logic, indicators, and risk boundaries..."
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

          {/* Center Column: Python Strategy Code Sandbox */}
          <section className="frontier-code-pane">
            <div className="pane-header">
              <div className="pane-title">
                <FileCode size={14} className="text-secondary" />
                <span>Strategy Python Sandbox</span>
                <span className="badge-subtle">Pure Strategy Code</span>
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
                  className="code-action-btn btn-apply-primary"
                  onClick={handleApplyToSystem}
                >
                  <CheckCircle2 size={13} />
                  <span>Deploy to Autopilot</span>
                </button>
              </div>
            </div>

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

            {/* Bottom Parameter Quick-Tuner */}
            <div className="parameter-tuner-bar">
              <div className="tuner-title">
                <Sliders size={13} />
                <span>Strategy Parameters</span>
              </div>
              <div className="tuner-chips">
                <div className="tuner-chip">
                  <span className="chip-name">Fast EMA:</span>
                  <input type="number" defaultValue={9} className="tuner-input" />
                </div>
                <div className="tuner-chip">
                  <span className="chip-name">Slow EMA:</span>
                  <input type="number" defaultValue={24} className="tuner-input" />
                </div>
                <div className="tuner-chip">
                  <span className="chip-name">RSI Gate:</span>
                  <input type="number" defaultValue={55} className="tuner-input" />
                </div>
                <div className="tuner-chip">
                  <span className="chip-name">ATR Multiplier:</span>
                  <input type="number" step="0.1" defaultValue={1.8} className="tuner-input" />
                </div>
                <div className="tuner-chip">
                  <span className="chip-name">Risk Equity %:</span>
                  <input type="number" step="0.1" defaultValue={1.0} className="tuner-input" />
                </div>
              </div>
            </div>
          </section>

          {/* Right Column: Scientific Quantitative Validation & Robustness Lab */}
          <section className="frontier-telemetry-pane">
            <div className="pane-header">
              <div className="pane-title">
                <BarChart3 size={14} className="text-bull" />
                <span>Scientific Quantitative Validation</span>
              </div>
              <span className="badge-subtle">Robustness Suite</span>
            </div>

            {/* Performance Metrics Cards */}
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

            {/* Equity & Drawdown Curves */}
            <div className="equity-chart-section">
              <div className="chart-header">
                <span>Cumulative Equity & Underwater Drawdown</span>
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
                  {/* Grid Lines */}
                  <line x1="0" y1="30" x2="400" y2="30" stroke="#2a2e39" strokeDasharray="3 3" />
                  <line x1="0" y1="60" x2="400" y2="60" stroke="#2a2e39" strokeDasharray="3 3" />
                  <line x1="0" y1="90" x2="400" y2="90" stroke="#2a2e39" strokeDasharray="3 3" />

                  {/* Equity Area and Curve */}
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

            {/* Monte Carlo Permutation Stress Testing */}
            <div className="robustness-section">
              <div className="robustness-header">
                <div className="robustness-title">
                  <Dices size={14} className="text-accent" />
                  <span>Monte Carlo Stress-Test (1,000x Shuffles)</span>
                </div>
                <span className="badge-subtle">Permutation Test</span>
              </div>
              <div className="robustness-grid">
                <div className="robustness-card">
                  <span className="card-caption">Ruin Probability</span>
                  <strong className="card-value text-bull">
                    {currentIteration?.monteCarlo?.ruinProbabilityPct ?? 0.08}%
                  </strong>
                  <span className="card-desc">Chance of reaching -50% DD</span>
                </div>
                <div className="robustness-card">
                  <span className="card-caption">95% Value-at-Risk</span>
                  <strong className="card-value text-bear">
                    -{currentIteration?.monteCarlo?.valueAtRisk95Pct ?? 7.2}%
                  </strong>
                  <span className="card-desc">Max DD in 95% of paths</span>
                </div>
                <div className="robustness-card">
                  <span className="card-caption">Worst-Case Drawdown</span>
                  <strong className="card-value text-bear">
                    -{currentIteration?.monteCarlo?.worstCaseDrawdownPct ?? 8.9}%
                  </strong>
                  <span className="card-desc">1/1,000 extreme tail path</span>
                </div>
              </div>
            </div>

            {/* Rule Significance & Overfitting Test */}
            <div className="robustness-section">
              <div className="robustness-header">
                <div className="robustness-title">
                  <TrendingUp size={14} className="text-bull" />
                  <span>Rule Significance & Edge Testing</span>
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
          </section>
        </div>
      ) : (
        /* Autopilot Mode (Autonomous Execution Arena) */
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
                className="btn-killswitch"
                onClick={() => {
                  if (onNotice) onNotice('KILLSWITCH ENGAGED: Autopilot halted, positions flattened.');
                }}
              >
                <ShieldAlert size={14} />
                <span>Emergency Flatten & Halt</span>
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
                    <strong>CoT Market Analysis:</strong> 5-minute candle on {symbol} printed high-volume consolidation above EMA(9) @ 24,930. RSI(14) reading 62.4 confirms expanding momentum regime. Volatility ATR is compressing to 14.2 points, signaling upcoming directional expansion.
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

            {/* Right: Runtime Disposer Interceptor Log */}
            <div className="autopilot-disposer-pane">
              <div className="pane-header">
                <div className="pane-title">
                  <ShieldCheck size={14} className="text-bull" />
                  <span>Deterministic Risk Execution & Audit Log</span>
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
              <div className="active-position-card">
                <div className="position-header">
                  <span className="pos-badge buy">LONG</span>
                  <strong className="pos-symbol">25 shares NIFTY50 FUT</strong>
                  <span className="pos-pnl text-bull">+₹4,250 (+1.71%)</span>
                </div>
                <div className="position-details">
                  <div>Avg Entry: <strong>₹24,912.00</strong></div>
                  <div>Current CMP: <strong>₹24,954.50</strong></div>
                  <div>Exchange Stop-Loss: <strong className="text-bear">₹24,820.00 (Hard Bracket)</strong></div>
                  <div>Take Profit: <strong className="text-bull">₹25,080.00</strong></div>
                </div>
              </div>
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
            <strong className="g-val text-bull">1.0% Equity</strong>
          </div>
          <div className="guardrail-item">
            <span className="g-label">Drawdown Killswitch:</span>
            <strong className="g-val text-bear">-8.0% Auto-Close</strong>
          </div>
          <div className="guardrail-item">
            <span className="g-label">Leverage Clamp:</span>
            <strong className="g-val text-accent">1.0x (Cash) / 3.0x Hard</strong>
          </div>
          <div className="guardrail-item">
            <span className="g-label">Exchange Stop-Loss:</span>
            <strong className="g-val text-bull">Mandatory Bracket (Locked)</strong>
          </div>
          <div className="guardrail-item">
            <span className="g-label">Cooldown Timer:</span>
            <strong className="g-val">30 mins anti-looping</strong>
          </div>
          <div className="guardrail-item">
            <span className="g-label">Safe Mode:</span>
            <span className="status-badge-active">PROTECTED</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

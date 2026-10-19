import type { StrategyGraphShape } from '../model';

export interface OptimizationGoal {
  objective: string;
  symbol: string;
  timeframe: string;
  targetSharpe: number;
  maxDrawdownPct: number;
  minWinRatePct: number;
  targetProfitFactor: number;
  maxIterations: number;
}

export interface IterationMetrics {
  netPnl: number;
  netPnlPct: number;
  sharpe: number;
  maxDrawdown: number;
  winRate: number;
  trades: number;
  profitFactor: number;
}

export interface GoalCheck {
  sharpeMet: boolean;
  drawdownMet: boolean;
  winRateMet: boolean;
  profitFactorMet: boolean;
  allMet: boolean;
}

export interface MonteCarloHistogramBucket {
  drawdownRange: string;
  count: number;
  percentage: number;
}

export interface MonteCarloResult {
  simulationsCount: number;
  ruinProbabilityPct: number;
  worstCaseDrawdownPct: number;
  medianDrawdownPct: number;
  valueAtRisk95Pct: number;
  confidenceInterval: { p5: number; p50: number; p95: number };
  histogram: MonteCarloHistogramBucket[];
}

export interface RuleSignificanceResult {
  pValue: number;
  alphaScore: number;
  isSignificant: boolean;
  overfittingRisk: 'low' | 'moderate' | 'high';
  randomBaselineSharpe: number;
}

export interface WalkForwardResult {
  inSampleSharpe: number;
  outOfSampleSharpe: number;
  efficiencyRatio: number; // e.g. 0.84 (84%)
  trainBarsCount: number;
  testBarsCount: number;
  splitRatio: string; // e.g. "70% IS / 30% OOS"
  overfittingScore: number; // 0-100%
  isRobust: boolean;
}

export interface DrawdownDiagnostics {
  worstDrawdownStart: string;
  worstDrawdownEnd: string;
  maxDrawdownPct: number;
  lossClusterReason: string;
  recommendedRefinement: string;
}

export interface RuntimeRiskEnvelope {
  maxRiskPerTradePct: number;
  maxDrawdownKillswitchPct: number;
  maxLeverageClamp: number;
  mandatoryBracketOrders: boolean;
  cooldownPeriodMinutes: number;
  safeModeStatus: 'active' | 'tripped' | 'idle';
}

export interface ProposedOrder {
  id: string;
  timestamp: string;
  symbol: string;
  side: 'buy' | 'sell';
  requestedQty: number;
  requestedLeverage: number;
  proposedPrice: number;
  reasoningTokenSnippet: string;
}

export interface RuntimeDisposedOrder {
  id: string;
  originalProposalId: string;
  timestamp: string;
  symbol: string;
  side: 'buy' | 'sell';
  clampedQty: number;
  clampedLeverage: number;
  executionPrice: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  riskCapitalPct: number;
  status: 'filled' | 'rejected_risk_breach' | 'throttled_cooldown';
  dispositionReason: string;
}

export interface ActiveLivePosition {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  qty: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  stopLoss: number;
  takeProfit: number;
  trailingStopActive: boolean;
  openedAt: string;
}


export interface OptimizationIteration {
  iterationNumber: number;
  timestamp: number;
  status: 'goal_met' | 'refining' | 'failed';
  hypothesis: string;
  code: string;
  graph: StrategyGraphShape;
  metrics: IterationMetrics;
  goalsEvaluated: GoalCheck;
  aiReflection: string;
  changesSummary: {
    added: string[];
    modified: string[];
    removed: string[];
    keyChanges: string;
  };
  monteCarlo?: MonteCarloResult;
  ruleSignificance?: RuleSignificanceResult;
  walkForward?: WalkForwardResult;
  drawdownDiagnostics?: DrawdownDiagnostics;
  runtimeEnvelope?: RuntimeRiskEnvelope;
}

export type LoopPhase =
  | 'idle'
  | 'reasoning'
  | 'generating'
  | 'simulating'
  | 'evaluating'
  | 'reflecting'
  | 'finished';

export interface AiLoopState {
  status: 'idle' | 'running' | 'paused' | 'goal_achieved' | 'limit_reached';
  phase: LoopPhase;
  currentIterationNumber: number;
  iterations: OptimizationIteration[];
  bestIterationIndex: number | null;
  error?: string | null;
}

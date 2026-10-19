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

export interface MonteCarloResult {
  simulationsCount: number;
  ruinProbabilityPct: number;
  worstCaseDrawdownPct: number;
  medianDrawdownPct: number;
  valueAtRisk95Pct: number;
  confidenceInterval: { p5: number; p50: number; p95: number };
}

export interface RuleSignificanceResult {
  pValue: number;
  alphaScore: number;
  isSignificant: boolean;
  overfittingRisk: 'low' | 'moderate' | 'high';
  randomBaselineSharpe: number;
}

export interface RuntimeRiskEnvelope {
  maxRiskPerTradePct: number;
  maxDrawdownKillswitchPct: number;
  maxLeverageClamp: number;
  mandatoryBracketOrders: boolean;
  cooldownPeriodMinutes: number;
  safeModeStatus: 'active' | 'tripped' | 'idle';
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

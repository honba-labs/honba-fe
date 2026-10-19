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

// Generated domain types - mirrors honba-frontend core/types/generated/domain.ts
// These types are derived from the honba API schema

export interface BacktestMetrics {
  sharpe: number;
  max_drawdown: number;
  total_return: number;
  net_pnl: number;
  trades: number;
}

export interface BacktestResponse {
  run_id?: string;
  status: string;
  metrics?: BacktestMetrics;
  error?: { code: string; message: string };
  validation?: Record<string, unknown>;
  assumptions?: { not_modelled?: string[] };
}

export interface CompiledStrategy {
  strategy_id: string;
}

export interface SweepResponse {
  runs: Array<{
    params: Record<string, unknown>;
    metrics: BacktestMetrics;
  }>;
}

export interface TimeframeSpec {
  interval: number;
  aggregation: string;
}

export interface BarAggregation {
  interval: number;
  aggregation: string;
}

export interface StrategyManifest {
  schema_version: number;
  name: string;
  universe: {
    named?: string | null;
    explicit?: Array<{ symbol: string; exchange: string }> | null;
  };
  driving_timeframe: TimeframeSpec;
  warmup_bars: number;
  subscriptions?: { quotes?: boolean; trades?: boolean };
  nodes: Array<{
    id: string;
    type: string;
    label?: string;
    params?: Record<string, unknown>;
    indicator?: string;
  }>;
  edges: Array<{
    id: string;
    from_node: string;
    from_port: string;
    to_node: string;
    to_port: string;
  }>;
}
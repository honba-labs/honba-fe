// Assistant types for AI Co-Pilot
// Mirrors honba-frontend core/designer/assistant-types.ts

import type { StrategyGraphShape } from './nodes/types';

export type AssistantKind = 'discussion' | 'candidate' | 'validation_error';

export interface AssistantMessage {
  kind: AssistantKind;
  message: string;
  graph?: StrategyGraphShape;
  source?: string; // generated Python source for the candidate
  diff?: GraphDiffSummary;
  decisions?: Array<{
    orderId: string;
    decision: 'approve' | 'size_down' | 'reject';
    rationale: string;
  }>;
  findings?: Array<{ code: string; message: string }>;
  blocked: boolean;
  timestamp: number;
}

export interface GraphDiffSummary {
  added_nodes: string[];
  modified_nodes: string[];
  removed_nodes: string[];
  param_changes: Record<string, unknown>;
}

export interface AssistantRunSummary {
  runId: string | null;
  status: string;
  metrics?: {
    sharpe: number;
    max_drawdown: number;
    total_return: number;
    net_pnl: number;
    trades: number;
  };
}
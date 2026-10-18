// AI Assistant / Co-Pilot logic
// Mirrors honba-frontend core/designer/assistant.ts

import type { ApiClient } from '../../core/api/client';
import type { AssistantMessage, AssistantKind, AssistantRunSummary, GraphDiffSummary } from './assistant-types';
import type { StrategyGraphShape } from './nodes/types';
import { generateCode } from './nodes/codegen';
import { buildCode } from './store';

export { AssistantRunSummary };
export type { StrategyGraphShape } from './nodes/types';

export const ASSISTANT_PROMPTS = [
  'Add an ATR volatility filter',
  'Tune MA periods to 5/20',
  'Add an RSI momentum condition',
  'Add a position sizing node',
  'Add a risk gate (max drawdown)',
  'Convert to mean reversion',
];

export function hasAssistantPropose(client: ApiClient | undefined): boolean {
  return client !== undefined && typeof (client as any).postAssistantPropose === 'function';
}

export function runSummary(response: unknown): AssistantRunSummary | null {
  if (!response || typeof response !== 'object') return null;
  const r = response as Record<string, unknown>;
  return {
    runId: (r.run_id as string) ?? null,
    status: (r.status as string) ?? 'unknown',
    metrics: r.metrics as AssistantRunSummary['metrics'],
  };
}

export function assistantContext(params: {
  graph: StrategyGraphShape;
  source: string;
  run: AssistantRunSummary | null;
  messages: AssistantMessage[];
}): string {
  const { graph, source, run, messages } = params;
  const lines: string[] = [
    `Strategy: ${graph.name}`,
    `Nodes: ${graph.nodes.length}`,
    `Edges: ${graph.edges?.length ?? 0}`,
    '',
    '=== Graph Structure ===',
    ...graph.nodes.map((n) => `  ${n.id}: ${n.type}${n.indicator ? ` (${n.indicator})` : ''}${n.label ? ` "${n.label}"` : ''}`),
    ...(graph.edges ?? []).map((e) => `  ${e.from_node}.${e.from_port} -> ${e.to_node}.${e.to_port}`),
    '',
    '=== Generated Code (truncated) ===',
    source.split('\n').slice(0, 80).join('\n'),
    '',
    '=== Last Run ===',
    run ? `Run ID: ${run.runId}, Status: ${run.status}` : 'No run yet',
    '',
    '=== Conversation ===',
    ...messages.slice(-6).map((m) => `[${m.kind}] ${m.message.slice(0, 200)}`),
  ];
  return lines.join('\n');
}

export function toAssistantMessage(data: unknown): AssistantMessage {
  // Backend assistant response shape
  const d = data as Record<string, unknown>;
  return {
    kind: (d.kind as AssistantKind) ?? 'discussion',
    message: (d.message as string) ?? '',
    graph: d.graph as StrategyGraphShape | undefined,
    source: d.source as string | undefined,
    diff: d.diff as GraphDiffSummary | undefined,
    decisions: (d.decisions as AssistantMessage['decisions']) ?? undefined,
    findings: (d.findings as AssistantMessage['findings']) ?? undefined,
    blocked: Boolean(d.blocked),
    timestamp: Date.now(),
  };
}

/** Heuristic: can this message be applied to the canvas? */
export function canApply(msg: AssistantMessage): boolean {
  return msg.kind === 'candidate' && !!msg.graph && !msg.blocked;
}
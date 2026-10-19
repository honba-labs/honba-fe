// Strategy compilation - registers graph with backend
// Mirrors honba-frontend core/designer/compile.ts

import type { ApiClient } from '../../core/api/client';
import type { StrategyGraphShape } from './nodes/types';
import { toManifest } from './manifest';

export interface CompileResult {
  strategyId: string;
  compiled?: boolean;
  error?: string;
}

export async function compileStrategy(
  client: Partial<ApiClient> | null | undefined,
  graph: StrategyGraphShape,
  options?: { signal?: AbortSignal },
): Promise<CompileResult> {
  const post = typeof (client as any)?.postStrategies === 'function'
    ? (client as any).postStrategies.bind(client)
    : typeof client?.postStrategiesVerify === 'function'
    ? client.postStrategiesVerify.bind(client)
    : undefined;

  if (!post) {
    return { strategyId: graph.name, compiled: false, error: undefined };
  }

  try {
    const manifest = toManifest(graph);
    // If postStrategies, pass { manifest }, if postStrategiesVerify pass manifest
    const body = typeof (client as any)?.postStrategies === 'function' ? { manifest } : manifest;
    const envelope = await post(body, options?.signal);
    const data = (envelope?.data ?? {}) as Record<string, unknown>;
    const strategyId = (data.id as string) ?? (data.strategy_id as string) ?? graph.name;
    return { strategyId, compiled: true, error: undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { strategyId: graph.name, compiled: false, error: message };
  }
}
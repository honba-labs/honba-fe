// Strategy compilation - registers graph with backend
// Mirrors honba-frontend core/designer/compile.ts

import type { ApiClient } from '../../core/api/client';
import type { StrategyGraphShape } from './nodes/types';
import { toManifest } from './manifest';

export interface CompileResult {
  strategyId: string;
  error?: string;
}

export async function compileStrategy(
  client: ApiClient,
  graph: StrategyGraphShape,
  options?: { signal?: AbortSignal },
): Promise<CompileResult> {
  try {
    const manifest = toManifest(graph);
    const envelope = await client.postStrategiesVerify(manifest);
    // The verify endpoint returns the compiled strategy ID in the IR
    const data = (envelope.data ?? {}) as Record<string, unknown>;
    return { strategyId: (data.strategy_id as string) ?? graph.name, error: undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { strategyId: graph.name, error: message };
  }
}
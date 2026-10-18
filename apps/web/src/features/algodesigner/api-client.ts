// AlgoDesigner API Client - extends core ApiClient with AlgoDesigner-specific methods
// This avoids modifying the core client while providing the methods AlgoDesigner needs

import { createApiClient, type ApiClient } from '../../core/api/client';
import type { StrategyManifest } from './manifest';

export interface AlgoDesignerApiClient extends ApiClient {
  /** `POST /strategies/verify` — verify a strategy manifest and return compiled IR */
  postStrategiesVerify(manifest: StrategyManifest): Promise<{ data?: unknown; error?: unknown }>;
  
  /** `POST /backtests` — run a backtest with the given strategy */
  postBacktests(params: {
    strategy: string;
    universe: string;
    seed: number;
  }): Promise<{ data?: { run_id?: string; status?: string; metrics?: unknown; error?: unknown }; error?: unknown }>;
  
  /** `PUT /profile/layouts/{name}` — save a layout preset (used for strategy library) */
  putProfileLayoutsByName(name: string, manifest: unknown): Promise<unknown>;
  
  /** `POST /assistant/propose` — AI co-pilot proposal (optional backend feature) */
  postAssistantPropose?(params: {
    graph: unknown;
    source: string;
    prompt: string;
    context: string;
  }): Promise<{ data?: unknown; error?: unknown }>;
}

/** Create an AlgoDesigner API client with extended methods */
export function createAlgoDesignerClient(): AlgoDesignerApiClient {
  const base = createApiClient();
  
  return {
    ...base,
    async postStrategiesVerify(manifest: StrategyManifest) {
      return base.postStrategiesVerify?.(manifest) ?? { error: { code: 'not_implemented', message: 'POST /strategies/verify not implemented' } };
    },
    async postBacktests(params: { strategy: string; universe: string; seed: number }) {
      return base.postBacktests?.(params) ?? { error: { code: 'not_implemented', message: 'POST /backtests not implemented' } };
    },
    async putProfileLayoutsByName(name: string, manifest: unknown) {
      return base.putProfileLayoutsByName?.(name, manifest) ?? { error: { code: 'not_implemented', message: 'PUT /profile/layouts/{name} not implemented' } };
    },
  };
}

/** Get the singleton AlgoDesigner API client */
let algoDesignerClient: AlgoDesignerApiClient | undefined;

export function getAlgoDesignerClient(): AlgoDesignerApiClient {
  if (!algoDesignerClient) {
    algoDesignerClient = createAlgoDesignerClient();
  }
  return algoDesignerClient;
}
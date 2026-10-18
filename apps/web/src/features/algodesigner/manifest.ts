// Manifest conversion - graph to backend strategy manifest
// Mirrors honba-frontend core/designer/manifest.ts

import type { StrategyGraphShape } from './nodes/types';

export interface StrategyManifest {
  schema_version: number;
  name: string;
  universe: StrategyGraphShape['universe'];
  driving_timeframe: StrategyGraphShape['driving_timeframe'];
  warmup_bars: number;
  subscriptions?: StrategyGraphShape['subscriptions'];
  nodes: StrategyGraphShape['nodes'];
  edges: StrategyGraphShape['edges'];
}

export function toManifest(graph: StrategyGraphShape): StrategyManifest {
  return {
    schema_version: graph.schema_version,
    name: graph.name,
    universe: graph.universe,
    driving_timeframe: graph.driving_timeframe,
    warmup_bars: graph.warmup_bars,
    subscriptions: graph.subscriptions,
    nodes: graph.nodes,
    edges: graph.edges ?? [],
  };
}
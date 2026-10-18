// Core graph types for the AlgoDesigner node graph
// These mirror the honba-frontend core/graph/model.ts

export type NodeType =
  | 'universe'
  | 'indicator'
  | 'transform'
  | 'condition'
  | 'logic'
  | 'sizing'
  | 'risk'
  | 'order'
  | 'schedule'
  | 'benchmark';

export const NODE_TYPES: readonly NodeType[] = [
  'universe',
  'indicator',
  'transform',
  'condition',
  'logic',
  'sizing',
  'risk',
  'order',
  'schedule',
  'benchmark',
] as const;

export interface GraphNode {
  id: string;
  type: NodeType;
  label?: string;
  params?: Record<string, unknown>;
  indicator?: string;
}

export interface GraphEdge {
  id: string;
  from_node: string;
  from_port: string;
  to_node: string;
  to_port: string;
}

export interface UniverseShape {
  named?: string | null;
  explicit?: Array<{ symbol: string; exchange: string }> | null;
}

export interface TimeframeShape {
  interval: number;
  aggregation: string;
}

export interface StrategyGraphShape {
  schema_version: number;
  name: string;
  universe: UniverseShape;
  driving_timeframe: TimeframeShape;
  warmup_bars: number;
  subscriptions?: { quotes?: boolean; trades?: boolean };
  nodes: GraphNode[];
  edges: GraphEdge[];
  strategy_api_version?: string;
  parameters?: Record<string, unknown>;
}

export class GraphError extends Error {
  readonly code: string;
  readonly nodeId: string | null;

  constructor(code: string, message: string, nodeId: string | null = null) {
    super(message);
    this.name = 'GraphError';
    this.code = code;
    this.nodeId = nodeId;
  }
}

export type PortKind = 'series' | 'bool' | 'size' | 'order';

export interface PortSpec {
  id: string;
  name: string;
  kind: PortKind;
  description?: string;
}

export const NODE_PORT_MAP: Record<NodeType, { inputs: Record<string, PortKind>; outputs: Record<string, PortKind> }> = {
  universe: { inputs: {}, outputs: { bars: 'series' } },
  indicator: { inputs: { input: 'series' }, outputs: { value: 'series' } },
  transform: { inputs: { input: 'series' }, outputs: { value: 'series' } },
  condition: { inputs: { left: 'series', right: 'series' }, outputs: { signal: 'bool' } },
  logic: { inputs: { a: 'bool', b: 'bool' }, outputs: { signal: 'bool' } },
  sizing: { inputs: { signal: 'bool' }, outputs: { size: 'size' } },
  risk: { inputs: { signal: 'bool' }, outputs: { signal: 'bool' } },
  order: { inputs: { signal: 'bool', size: 'size' }, outputs: { orders: 'order' } },
  schedule: { inputs: {}, outputs: { signal: 'bool' } },
  benchmark: { inputs: { input: 'series' }, outputs: { value: 'series' } },
};

export function nodePorts(type: NodeType) {
  return NODE_PORT_MAP[type] ?? { inputs: {}, outputs: {} };
}
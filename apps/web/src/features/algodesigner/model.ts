// AlgoDesigner Graph Model - shared types and utilities
// Re-exports from nodes/types and adds model-level utilities

import type { NodeType, GraphNode, GraphEdge, UniverseShape, TimeframeShape, StrategyGraphShape, PortSpec, PortKind } from './nodes/types';
import { NODE_PORT_MAP, nodePorts as nodePortsFn } from './nodes/types';

// Re-export all types
export type { NodeType, GraphNode, GraphEdge, UniverseShape, TimeframeShape, StrategyGraphShape, PortSpec, PortKind };
export { NODE_PORT_MAP, nodePortsFn as nodePorts };

// Graph schema version (must match backend)
export const GRAPH_SCHEMA_VERSION = 1 as const;

// Canonical JSON for graph hashing/comparison
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === 'object') {
    const dict = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(dict).sort()) out[key] = canonical(dict[key]);
    return out;
  }
  return value;
}

export function canonicalJson(graph: StrategyGraphShape): string {
  return JSON.stringify(canonical(graph), null, undefined);
}

// Graph hash (sync version for markers)
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(text: string): Promise<string> {
  const subtle = (globalThis as unknown as { crypto?: { subtle?: SubtleCrypto } }).crypto?.subtle;
  if (subtle) {
    const bytes = await subtle.digest('SHA-256', new TextEncoder().encode(text));
    return toHex(new Uint8Array(bytes));
  }
  // Fallback FNV-1a
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0').repeat(8).slice(0, 64);
}

export async function graphHash(graph: StrategyGraphShape): Promise<string> {
  const digest = await sha256Hex(canonicalJson(graph));
  return `sha256:${digest}`;
}

export function graphHashSync(graph: StrategyGraphShape): string {
  const text = canonicalJson(graph);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `sha256:${(h >>> 0).toString(16).padStart(8, '0').repeat(8).slice(0, 64)}`;
}

// Default graph (SMA cross)
export function defaultGraph(): StrategyGraphShape {
  return {
    schema_version: GRAPH_SCHEMA_VERSION,
    name: 'sma_cross',
    universe: { explicit: [{ symbol: 'TCS', exchange: 'NSE' }] },
    driving_timeframe: { interval: 1, aggregation: 'minute' },
    warmup_bars: 2,
    subscriptions: { quotes: false, trades: false },
    nodes: [
      { id: 'n1', type: 'universe', label: 'Universe' },
      { id: 'f', type: 'indicator', indicator: 'sma', label: 'Fast SMA', params: { period: 2 } },
      { id: 's', type: 'indicator', indicator: 'sma', label: 'Slow SMA', params: { period: 4 } },
      { id: 'c', type: 'condition', label: 'Cross', params: { op: 'crosses_above' } },
      { id: 'o', type: 'order', label: 'Entry Long', params: { side: 'buy', quantity: 1 } },
    ],
    edges: [
      { id: 'e1', from_node: 'n1', from_port: 'bars', to_node: 'f', to_port: 'input' },
      { id: 'e2', from_node: 'n1', from_port: 'bars', to_node: 's', to_port: 'input' },
      { id: 'e3', from_node: 'f', from_port: 'value', to_node: 'c', to_port: 'left' },
      { id: 'e4', from_node: 's', from_port: 'value', to_node: 'c', to_port: 'right' },
      { id: 'e5', from_node: 'c', from_port: 'signal', to_node: 'o', to_port: 'signal' },
    ],
  };
}

// Default node positions for the canvas
export const DEFAULT_NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  n1: { x: 40, y: 160 },
  f: { x: 300, y: 70 },
  s: { x: 300, y: 250 },
  c: { x: 570, y: 160 },
  o: { x: 820, y: 160 },
};
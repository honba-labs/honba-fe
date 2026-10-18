// Graph validation - structural checks for the strategy graph
// Mirrors honba-frontend core/graph/validation.ts

import type { StrategyGraphShape, GraphNode, GraphEdge, NodeType } from './types';
import { nodePorts } from '../model';

export { nodePorts };

export interface ValidationIssue {
  code: string;
  message: string;
  nodeId: string | null;
}

/** Validate a graph structurally (no backend call). */
export function validateGraph(graph: StrategyGraphShape): void {
  if (graph.schema_version !== 1) {
    throw new Error(`Unsupported schema_version: ${graph.schema_version}`);
  }
  if (!graph.name || graph.name.trim() === '') {
    throw new Error('Graph must have a name');
  }
  if (!graph.universe || (!graph.universe.named && (!graph.universe.explicit || graph.universe.explicit.length === 0))) {
    throw new Error('Graph must have a universe (named or explicit)');
  }
  if (!graph.driving_timeframe || graph.driving_timeframe.interval <= 0) {
    throw new Error('Graph must have a valid driving_timeframe');
  }
  if (graph.warmup_bars < 0) {
    throw new Error('warmup_bars must be >= 0');
  }

  const nodeIds = new Set<string>();
  for (const node of graph.nodes) {
    if (!node.id || nodeIds.has(node.id)) {
      throw new Error(`Duplicate or empty node id: ${node.id}`);
    }
    nodeIds.add(node.id);
    if (!NODE_TYPES.includes(node.type)) {
      throw new Error(`Unknown node type: ${node.type}`);
    }
    if (node.type === 'indicator' && !node.indicator) {
      throw new Error(`Indicator node ${node.id} missing indicator kind`);
    }
  }

  for (const edge of graph.edges ?? []) {
    if (!edge.id) throw new Error('Edge missing id');
    if (!nodeIds.has(edge.from_node)) throw new Error(`Edge ${edge.id}: unknown from_node ${edge.from_node}`);
    if (!nodeIds.has(edge.to_node)) throw new Error(`Edge ${edge.id}: unknown to_node ${edge.to_node}`);

    const fromNode = graph.nodes.find((n) => n.id === edge.from_node)!;
    const toNode = graph.nodes.find((n) => n.id === edge.to_node)!;
    const fromPortKind = nodePorts(fromNode.type).outputs[edge.from_port];
    const toPortKind = nodePorts(toNode.type).inputs[edge.to_port];
    if (!fromPortKind || !toPortKind || fromPortKind !== toPortKind) {
      throw new Error(`Edge ${edge.id}: port kind mismatch ${edge.from_port} (${fromPortKind}) -> ${edge.to_port} (${toPortKind})`);
    }
  }

  // Check for cycles (simple DFS)
  const adjacency = new Map<string, string[]>();
  for (const edge of graph.edges ?? []) {
    if (!adjacency.has(edge.from_node)) adjacency.set(edge.from_node, []);
    adjacency.get(edge.from_node)!.push(edge.to_node);
  }
  const visited = new Set<string>();
  const recStack = new Set<string>();
  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recStack.add(nodeId);
    for (const neighbor of adjacency.get(nodeId) ?? []) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        return true;
      }
    }
    recStack.delete(nodeId);
    return false;
  }
  for (const node of graph.nodes) {
    if (!visited.has(node.id) && dfs(node.id)) {
      throw new Error('Graph contains a cycle');
    }
  }
}

/** Collect structural issues without throwing. Returns empty array if clean. */
export function graphIssues(graph: StrategyGraphShape): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (graph.schema_version !== 1) {
    issues.push({ code: 'invalid_schema_version', message: `Unsupported schema_version: ${graph.schema_version}`, nodeId: null });
  }
  if (!graph.name || graph.name.trim() === '') {
    issues.push({ code: 'missing_name', message: 'Graph must have a name', nodeId: null });
  }
  if (!graph.universe || (!graph.universe.named && (!graph.universe.explicit || graph.universe.explicit.length === 0))) {
    issues.push({ code: 'missing_universe', message: 'Graph must have a universe', nodeId: null });
  }
  if (!graph.driving_timeframe || graph.driving_timeframe.interval <= 0) {
    issues.push({ code: 'invalid_timeframe', message: 'Graph must have a valid driving_timeframe', nodeId: null });
  }
  if (graph.warmup_bars < 0) {
    issues.push({ code: 'invalid_warmup', message: 'warmup_bars must be >= 0', nodeId: null });
  }

  const nodeIds = new Set<string>();
  for (const node of graph.nodes) {
    if (!node.id || nodeIds.has(node.id)) {
      issues.push({ code: 'duplicate_node_id', message: `Duplicate or empty node id: ${node.id}`, nodeId: node.id });
    }
    nodeIds.add(node.id);
    if (!NODE_TYPES.includes(node.type)) {
      issues.push({ code: 'unknown_node_type', message: `Unknown node type: ${node.type}`, nodeId: node.id });
    }
    if (node.type === 'indicator' && !node.indicator) {
      issues.push({ code: 'missing_indicator', message: `Indicator node missing indicator kind`, nodeId: node.id });
    }
  }

  for (const edge of graph.edges ?? []) {
    if (!edge.id) {
      issues.push({ code: 'missing_edge_id', message: 'Edge missing id', nodeId: null });
      continue;
    }
    if (!nodeIds.has(edge.from_node)) {
      issues.push({ code: 'unknown_from_node', message: `Edge ${edge.id}: unknown from_node ${edge.from_node}`, nodeId: edge.from_node });
      continue;
    }
    if (!nodeIds.has(edge.to_node)) {
      issues.push({ code: 'unknown_to_node', message: `Edge ${edge.id}: unknown to_node ${edge.to_node}`, nodeId: edge.to_node });
      continue;
    }

    const fromNode = graph.nodes.find((n) => n.id === edge.from_node)!;
    const toNode = graph.nodes.find((n) => n.id === edge.to_node)!;
    const fromPortKind = nodePorts(fromNode.type).outputs[edge.from_port];
    const toPortKind = nodePorts(toNode.type).inputs[edge.to_port];
    if (!fromPortKind || !toPortKind || fromPortKind !== toPortKind) {
      issues.push({
        code: 'port_mismatch',
        message: `Edge ${edge.id}: port kind mismatch ${edge.from_port} (${fromPortKind}) -> ${edge.to_port} (${toPortKind})`,
        nodeId: edge.from_node,
      });
    }
  }

  // Cycle detection
  const adjacency = new Map<string, string[]>();
  for (const edge of graph.edges ?? []) {
    if (!adjacency.has(edge.from_node)) adjacency.set(edge.from_node, []);
    adjacency.get(edge.from_node)!.push(edge.to_node);
  }
  const visited = new Set<string>();
  const recStack = new Set<string>();
  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recStack.add(nodeId);
    for (const neighbor of adjacency.get(nodeId) ?? []) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        return true;
      }
    }
    recStack.delete(nodeId);
    return false;
  }
  for (const node of graph.nodes) {
    if (!visited.has(node.id) && dfs(node.id)) {
      issues.push({ code: 'cycle_detected', message: 'Graph contains a cycle', nodeId: node.id });
      break;
    }
  }

  return issues;
}

/** Get line number in generated code for a node (for editor markers). */
export function nodeLine(code: string, nodeId: string): number | null {
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`_${nodeId}`) || lines[i].includes(nodeId)) {
      return i + 1;
    }
  }
  return null;
}

const NODE_TYPES: readonly NodeType[] = [
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
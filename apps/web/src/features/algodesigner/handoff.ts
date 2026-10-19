// Designer <-> Simulator handoff
// Mirrors honba-frontend core/designer/handoff.ts

import type { StrategyGraphShape } from './nodes/types';

export interface DesignerHandoff {
  graph: StrategyGraphShape;
  drawer: 'verify' | 'run' | 'sweeps' | 'ops' | 'results' | null;
}

export interface SimulatorHandoff {
  name?: string;
  graph: StrategyGraphShape;
  strategy?: StrategyGraphShape;
  source: 'designer' | 'library' | 'url';
  timestamp?: number;
}

export const DESIGNER_HANDOFF_KEY = 'honba.designer.handoff';
export const SIMULATOR_HANDOFF_KEY = 'honba.simulator.handoff';

export function stashHandoff(graph: StrategyGraphShape): void {
  try {
    sessionStorage.setItem(DESIGNER_HANDOFF_KEY, JSON.stringify({ graph, drawer: 'sweeps' }));
    const simHandoff: SimulatorHandoff = {
      name: graph.name,
      graph,
      strategy: graph,
      source: 'designer',
      timestamp: Date.now(),
    };
    sessionStorage.setItem(SIMULATOR_HANDOFF_KEY, JSON.stringify(simHandoff));
  } catch {
    // ignore
  }
}

export function takeHandoff(): SimulatorHandoff | null {
  try {
    const raw = sessionStorage.getItem(SIMULATOR_HANDOFF_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const graph = parsed.graph || parsed.strategy;
      if (graph && Array.isArray(graph.nodes)) {
        return {
          name: parsed.name || graph.name,
          graph,
          strategy: graph,
          source: parsed.source ?? 'designer',
          timestamp: parsed.timestamp ?? Date.now(),
        };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export function takeDesignerHandoff(): DesignerHandoff | null {
  try {
    const raw = sessionStorage.getItem(DESIGNER_HANDOFF_KEY);
    if (raw) {
      sessionStorage.removeItem(DESIGNER_HANDOFF_KEY);
      return JSON.parse(raw) as DesignerHandoff;
    }
  } catch {
    // ignore
  }
  return null;
}

export function clearDesignerHandoff(): void {
  try {
    sessionStorage.removeItem(DESIGNER_HANDOFF_KEY);
  } catch {
    // ignore
  }
}

export function stashDesignerHandoff(graph: StrategyGraphShape): void {
  stashHandoff(graph);
}

export function simulatorHandoffUrl(strategyName: string): string {
  return `/simulator?strategy=${encodeURIComponent(strategyName)}&source=designer`;
}
// Designer <-> Simulator handoff
// Mirrors honba-frontend core/designer/handoff.ts

import type { StrategyGraphShape } from './nodes/types';

export interface DesignerHandoff {
  graph: StrategyGraphShape;
  drawer: 'verify' | 'run' | 'sweeps' | 'ops' | 'results' | null;
}

export interface SimulatorHandoff {
  strategy: StrategyGraphShape;
  source: 'designer' | 'library' | 'url';
}

const DESIGNER_HANDOFF_KEY = 'honba.designer.handoff';
const SIMULATOR_HANDOFF_KEY = 'honba.simulator.handoff';

export function stashHandoff(graph: StrategyGraphShape): void {
  try {
    sessionStorage.setItem(DESIGNER_HANDOFF_KEY, JSON.stringify({ graph, drawer: 'sweeps' }));
  } catch {
    // ignore
  }
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
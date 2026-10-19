import { slugify, type SavedStrategyManifest } from '../../features/algodesigner/library-store';
import type { SimulatorHandoff } from '../../features/algodesigner/handoff';
import { STRATEGY_TEMPLATES } from '../../features/algodesigner/strategy-templates';
import type { StrategyGraphShape } from '../../features/algodesigner/model';
import { graphIssues } from '../../features/algodesigner/nodes/validation';

import { DEFAULT_CONTROLS, type SimulatorControls } from './controls';

/**
 * Simulator strategy selection (Phase 6).
 *
 * Precedence: the Designer hand-off stashed in `sessionStorage`, then a Library
 * strategy named by the `?strategy=` slug, then the first saved strategy, then a
 * built-in template. The graph is validated before it is adopted, so a corrupt
 * hand-off degrades to the Library instead of half-loading.
 */

export type SelectionOrigin = 'designer' | 'library' | 'template';

export interface StrategySelection {
  graph: StrategyGraphShape;
  name: string;
  origin: SelectionOrigin;
}

/** A graph is runnable when it is structurally valid (no verifier issues). */
export function graphIsRunnable(graph: StrategyGraphShape | null | undefined): graph is StrategyGraphShape {
  if (!graph || !Array.isArray(graph.nodes) || graph.nodes.length === 0) return false;
  return graphIssues(graph).length === 0;
}

export function toParams(query?: URLSearchParams | string): URLSearchParams {
  if (!query) return new URLSearchParams();
  if (typeof query === 'string') return new URLSearchParams(query.startsWith('?') ? query.slice(1) : query);
  return query;
}

export interface SelectionInput {
  query?: URLSearchParams | string;
  handoff?: SimulatorHandoff | null;
  saved?: ReadonlyArray<SavedStrategyManifest>;
  templates?: ReadonlyArray<{ name: string; graph: StrategyGraphShape }>;
}

export function resolveSelection(input: SelectionInput = {}): StrategySelection {
  const params = toParams(input.query);
  const slug = params.get('strategy');
  const handoff = input.handoff ?? null;
  const saved = input.saved ?? [];
  const templates = input.templates ?? STRATEGY_TEMPLATES;

  // 1. Designer hand-off: the graph travelled in sessionStorage, the URL only
  //    carries its slug. Adopt it when there is no slug, or the slug matches.
  const handoffGraph = handoff ? (handoff.graph || handoff.strategy) : null;
  const handoffName = handoff ? (handoff.name || handoffGraph?.name || '') : '';
  if (handoffGraph && (!slug || handoffName === slug || slugify(handoffName) === slug) && graphIsRunnable(handoffGraph)) {
    return { graph: handoffGraph, name: handoffName || handoffGraph.name, origin: 'designer' };
  }

  // 2. Library strategy named by the slug (custom saves first, then id/name).
  if (slug) {
    const match = saved.find((manifest) => manifest.id === slug || slugify(manifest.name) === slug);
    if (match && graphIsRunnable(match.graph)) {
      return { graph: match.graph, name: match.name, origin: 'library' };
    }
  }

  // 3. Any runnable saved strategy.
  const firstSaved = saved.find((manifest) => graphIsRunnable(manifest.graph));
  if (firstSaved) return { graph: firstSaved.graph, name: firstSaved.name, origin: 'library' };

  // 4. Built-in template (always present).
  const template = templates.find((entry: any) => graphIsRunnable(entry.graph)) ?? templates[0];
  return { graph: template.graph, name: template.name, origin: 'template' };
}

const AGGREGATION_UNIT: Record<string, string> = {
  second: 's',
  minute: 'm',
  hour: 'h',
  day: 'd',
  week: 'w',
  month: 'mo',
};

/** Pre-fill the controls from the selected strategy's universe and timeframe. */
export function controlsForGraph(
  graph: StrategyGraphShape,
  base: SimulatorControls = DEFAULT_CONTROLS,
): SimulatorControls {
  const first = graph.universe.explicit?.[0];
  const symbol = first?.symbol ?? graph.universe.named ?? base.symbol;
  const exchange = first?.exchange ?? base.exchange;
  const { interval, aggregation } = graph.driving_timeframe;
  const unit = AGGREGATION_UNIT[aggregation] ?? 'd';
  return { ...base, symbol, exchange, timeframe: `${interval}${unit}` };
}

/**
 * The universe string for the run: a named universe wins, otherwise the
 * graph's explicit subscriptions, otherwise the control panel's symbol.
 */
export function universeString(graph: StrategyGraphShape, controls: SimulatorControls): string {
  const symbol = controls.symbol ? controls.symbol.trim().toUpperCase() : '';
  const exchange = controls.exchange ? controls.exchange.trim().toUpperCase() : 'NSE';
  if (symbol) return `${symbol}.${exchange}`;
  if (graph.universe.named) return graph.universe.named;
  const explicit = graph.universe.explicit ?? [];
  if (explicit.length > 0) return explicit.map((entry: { symbol: string; exchange: string }) => `${entry.symbol}.${entry.exchange}`).join(',');
  return '';
}

// @honba/ui-core component dashboard — a single dashboard route (/components) that renders
// every component exported from `packages/ui-core/src` live, with fixture data, as a
// scrolling showcase organized by the Batches in docs/tasks.md (A: ui, B: hooks, C: market,
// D: trading, E: strategy). It's a developer-facing acceptance surface: each time a batch lands,
// its components appear here and can be eyeballed without wiring a backend.
//
// Everything compositional lives in this file; the demos themselves live in demos-*.tsx and
// own their own local state. Fixture data lives in fixtures.ts. No component is wrapped or
// re-implemented here — the dashboard renders them exactly as features will.
import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { UI_CORE_VERSION } from '@honba/ui-core';
import { hookTiles, uiTiles } from './demos-ui';
import { marketTiles } from './demos-market';
import { tradingTiles } from './demos-trading';
import { strategyTiles } from './demos-strategy';
import { DemoTile } from './demo-tile';
import './component-dashboard.css';

// Section grouping mirrors docs/tasks.md batches so the dashboard doubles as "what has
// landed so far" (sections are added per batch rather than hardcoded ahead of time).
interface Section {
  id: string;
  title: string;
  tiles: Array<{
    id: string;
    name: string;
    source: string;
    description?: string;
    wide?: boolean;
    pad?: boolean;
    node: ReactNode;
  }>;
}

const sections: Section[] = [
  { id: 'overview', title: '', tiles: [] },
  { id: 'ui', title: 'Batch A — UI primitives', tiles: uiTiles },
  { id: 'hooks', title: 'Batch B — Hooks', tiles: hookTiles },
  { id: 'market', title: 'Batch C — Market widgets', tiles: marketTiles },
  { id: 'trading', title: 'Batch D — Trading widgets', tiles: tradingTiles },
  { id: 'strategy', title: 'Batch E — Strategy widgets', tiles: strategyTiles },
];

export function ComponentDashboard() {
  const [activeSection, setActiveSection] = useState('overview');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const scrollTo = (id: string) => {
    setActiveSection(id);
    // Element#scrollIntoView is missing under jsdom; guard so tests/viewers don't throw.
    sectionRefs.current[id]?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  const totalTiles = useMemo(
    () => sections.reduce((sum, section) => sum + section.tiles.length, 0),
    [],
  );

  return (
    <div className="component-dashboard">
      <aside className="component-dashboard__sidebar">
        <h2>@honba/ui-core {UI_CORE_VERSION}</h2>
        <nav className="component-dashboard__nav" aria-label="Component sections">
          {sections
            .filter((section) => section.tiles.length > 0)
            .map((section) => (
              <button
                key={section.id}
                type="button"
                className={
                  activeSection === section.id
                    ? 'component-dashboard__nav-button component-dashboard__nav-button--active'
                    : 'component-dashboard__nav-button'
                }
                onClick={() => scrollTo(section.id)}
              >
                {section.title.replace(/^Batch [A-E] — /, '')}
                <span className="component-dashboard__nav-count">{section.tiles.length}</span>
              </button>
            ))}
        </nav>
        <p className="component-dashboard__meta">
          {totalTiles} live demos of {totalTiles} exported component groups, pinned to the batches
          in <code>docs/tasks.md</code>. Everything is fixture-driven; nothing here calls the
          backend. New batch components should add tiles to the matching <code>demos-*.tsx</code>.
        </p>
      </aside>

      <div className="component-dashboard__content">
        <section
          ref={(node) => {
            sectionRefs.current['overview'] = node;
          }}
          className="component-dashboard__section-header"
        >
          <h1>Component dashboard</h1>
          <p>
            Every component in <code>@honba/ui-core</code> rendered live with fixture data,
            grouped by its porting batch (docs/tasks.md). Interact with anything — these are the
            real components, not screenshots.
          </p>
        </section>

        {sections
          .filter((section) => section.tiles.length > 0)
          .map((section) => (
            <section
              key={section.id}
              ref={(node) => {
                sectionRefs.current[section.id] = node;
              }}
              className="component-dashboard__section"
            >
              <h3>{section.title}</h3>
              <div className="component-dashboard__grid">
                {section.tiles.map((tile) => (
                  <DemoTile
                    key={tile.id}
                    name={tile.name}
                    source={tile.source}
                    description={tile.description}
                    wide={tile.wide}
                    pad={tile.pad ?? true}
                  >
                    {tile.node}
                  </DemoTile>
                ))}
              </div>
            </section>
          ))}
      </div>
    </div>
  );
}

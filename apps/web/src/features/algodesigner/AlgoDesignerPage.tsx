// AlgoDesigner Page - main route component
// Mirrors honba-frontend apps/algodesigner-app.tsx

import React, { useEffect, useMemo, useState } from 'react';
import { Workflow, Cpu, Sparkles } from 'lucide-react';

import { themeEngine } from '../../core/theme-engine';
import { createApiClient, type ApiClient } from '../../core/api/client';
import { clearDesignerHandoff, takeDesignerHandoff } from './handoff';
import { defaultGraph, useDesignerStore, type DrawerTab } from './store';
import { WorkspaceLayout } from './WorkspaceLayout';
import { AlgoBotsLabView, INITIAL_STRATEGIES } from './components/AlgoBotsLabView';
import './components/AlgoBotsLabView.css';

const DRAWER_TABS: readonly DrawerTab[] = ['verify', 'run', 'sweeps', 'ops', 'results'];

export const AlgoDesignerPage: React.FC = () => {
  const store = useDesignerStore();
  const [notice, setNotice] = useState<string | null>(null);
  const client = useMemo((): ApiClient => createApiClient(), []);
  const [studioMode, setStudioMode] = useState<'designer' | 'bots'>(() => {
    if (typeof location !== 'undefined') {
      const params = new URLSearchParams(location.search);
      if (params.get('mode') === 'bots' || params.get('tab') === 'bots') return 'bots';
    }
    return 'designer';
  });

  useEffect(() => {
    themeEngine.applyToDOM();

    const handoff = takeDesignerHandoff();
    const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
    const requested = (params.get('drawer') ?? handoff?.drawer ?? null) as DrawerTab | null;

    if (handoff) {
      clearDesignerHandoff();
      void store.setGraph(handoff.graph);
    } else if (!store.code && !store.codeEdited) {
      void store.setGraph(store.graph ?? defaultGraph());
    }

    if (requested && DRAWER_TABS.includes(requested)) {
      store.setDrawer(true, requested);
    }
  }, []);

  return (
    <div className="algodesigner-view-root" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {notice ? (
        <div
          role="status"
          style={{
            padding: '6px 16px',
            fontSize: 12,
            color: 'var(--text-secondary)',
            borderBottom: '1px solid var(--border-subtle, #2a2e39)',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <span>{notice}</span>
          <button
            type="button"
            className="shortlist-btn"
            onClick={() => setNotice(null)}
            style={{ fontSize: 11, padding: '2px 8px' }}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Strategy Studio Subheader Mode Switcher */}
      <div className="studio-mode-header">
        <div className="studio-mode-nav">
          <button
            type="button"
            className={`studio-mode-btn ${studioMode === 'designer' ? 'active' : ''}`}
            onClick={() => setStudioMode('designer')}
          >
            <Workflow size={15} />
            <span>Visual Flow & Code Designer</span>
          </button>
          <button
            type="button"
            className={`studio-mode-btn ${studioMode === 'bots' ? 'active' : ''}`}
            onClick={() => setStudioMode('bots')}
          >
            <Cpu size={15} />
            <span>Algo Bots & Strategy Lab</span>
            <span className="badge-count">{INITIAL_STRATEGIES.length}</span>
          </button>
        </div>

        <div className="studio-tagline">
          {studioMode === 'designer' ? (
            <>
              <Sparkles size={13} className="text-accent" />
              <span>Visual DAG Builder • Python Transpiler • Risk Diagnostics</span>
            </>
          ) : (
            <>
              <Sparkles size={13} className="text-accent" />
              <span>Simulated Execution Engines • NSE/BSE High-Frequency Pipelines</span>
            </>
          )}
        </div>
      </div>

      <section
        style={{
          flex: 1,
          minHeight: 0,
          display: studioMode === 'designer' ? 'flex' : 'none',
          flexDirection: 'column',
        }}
      >
        <WorkspaceLayout client={client} onNotice={setNotice} />
      </section>

      <section
        style={{
          flex: 1,
          minHeight: 0,
          display: studioMode === 'bots' ? 'flex' : 'none',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
        <AlgoBotsLabView />
      </section>
    </div>
  );
};
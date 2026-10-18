// AlgoDesigner Page - main route component
// Mirrors honba-frontend apps/algodesigner-app.tsx

import React, { useEffect, useMemo, useState } from 'react';

import { themeEngine } from '../../core/theme-engine';
import { createApiClient, type ApiClient } from '../../core/api/client';
import { clearDesignerHandoff, takeDesignerHandoff } from './handoff';
import { defaultGraph, useDesignerStore, type DrawerTab } from './store';
import { WorkspaceLayout } from './WorkspaceLayout';

const DRAWER_TABS: readonly DrawerTab[] = ['verify', 'run', 'sweeps', 'ops', 'results'];

export const AlgoDesignerPage: React.FC = () => {
  const store = useDesignerStore();
  const [notice, setNotice] = useState<string | null>(null);
  const client = useMemo((): ApiClient => createApiClient(), []);

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
    <>
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
      <section style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <WorkspaceLayout client={client} onNotice={setNotice} />
      </section>
    </>
  );
};
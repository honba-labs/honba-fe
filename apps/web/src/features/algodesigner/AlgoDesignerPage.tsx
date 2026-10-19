// AlgoDesigner Page - AI-First Quant Strategy Studio
// Re-designed for autonomous quantitative strategy engineering

import React, { useEffect, useMemo, useState } from 'react';
import { themeEngine } from '../../core/theme-engine';
import { createApiClient, type ApiClient } from '../../core/api/client';
import { AiQuantStudio } from './components/AiQuantStudio';

export const AlgoDesignerPage: React.FC = () => {
  const [notice, setNotice] = useState<string | null>(null);
  const client = useMemo((): ApiClient => createApiClient(), []);

  useEffect(() => {
    themeEngine.applyToDOM();
  }, []);

  return (
    <div
      className="algodesigner-view-root"
      style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
      data-testid="algo-designer-page"
    >
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

      <section
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <AiQuantStudio client={client} onNotice={setNotice} />
      </section>
    </div>
  );
};
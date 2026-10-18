// Verify Panel - graph structural verification
// Mirrors honba-frontend apps/algodesigner/panels.tsx (VerifyPanel)

import React from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';

import type { VerifyState } from '../store';

export interface VerifyPanelProps {
  verify: VerifyState;
  onVerify: () => void;
  onSelectNode?: (nodeId: string) => void;
}

export const VerifyPanel: React.FC<VerifyPanelProps> = ({ verify, onVerify, onSelectNode }) => {
  return (
    <div style={{ padding: 20, maxWidth: 960, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Graph Structural Verification
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Validates port type constraints, loop topologies, and ADR 0029 intermediate representation compatibility.
          </p>
        </div>
        <button
          type="button"
          className="shortlist-btn shortlist-btn-primary"
          onClick={onVerify}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px' }}
        >
          <CheckCircle2 size={14} />
          <span>Verify Graph</span>
        </button>
      </div>

      {verify.ok ? (
        <div
          style={{
            padding: 16,
            borderRadius: 'var(--radius-md, 6px)',
            background: 'rgba(8, 153, 129, 0.1)',
            border: '1px solid var(--bullish, #089981)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <CheckCircle2 size={20} style={{ color: 'var(--bullish, #089981)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--bullish, #089981)' }}>
              Graph Verified — Intermediate Representation (IR) Ready
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              All nodes, edges, port contracts, and parameter types are strictly valid. The strategy can be compiled to native Rust / Python IR and safely executed.
            </div>
          </div>
        </div>
      ) : verify.issues.length === 0 ? (
        <div
          style={{
            padding: 24,
            borderRadius: 'var(--radius-md, 6px)',
            background: 'var(--bg-surface, #1e222d)',
            border: '1px dashed var(--border-subtle, #2a2e39)',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 13,
          }}
        >
          Graph specification has not been verified yet. Click <strong>Verify Graph</strong> above to inspect for defects.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{
              padding: 14,
              borderRadius: 'var(--radius-md, 6px)',
              background: 'rgba(242, 54, 69, 0.1)',
              border: '1px solid var(--bearish, #f23645)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <AlertTriangle size={18} style={{ color: 'var(--bearish, #f23645)', flexShrink: 0 }} />
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--bearish, #f23645)' }}>
              {verify.issues.length} Structural Defect{verify.issues.length === 1 ? '' : 's'} Found
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {verify.issues.map((issue, index) => (
              <div
                key={index}
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md, 6px)',
                  background: 'var(--bg-surface, #1e222d)',
                  border: '1px solid var(--border-subtle, #2a2e39)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-family-mono)',
                      fontSize: 11,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'rgba(242, 54, 69, 0.15)',
                      color: 'var(--bearish, #f23645)',
                      fontWeight: 600,
                    }}
                  >
                    {issue.code}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{issue.message}</span>
                  {issue.lineno ? (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      line {issue.lineno}
                    </span>
                  ) : null}
                </div>

                {issue.nodeId && onSelectNode ? (
                  <button
                    type="button"
                    className="shortlist-btn"
                    onClick={() => onSelectNode(issue.nodeId!)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 8px',
                      fontSize: 11,
                      color: 'var(--accent-primary, #2962ff)',
                      borderColor: 'var(--border-subtle, #2a2e39)',
                      flexShrink: 0,
                    }}
                    title={`Focus Node ${issue.nodeId} in Canvas`}
                  >
                    <span>Node: {issue.nodeId}</span>
                    <ExternalLink size={11} />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {verify.ir ? (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Compiled Intermediate Representation (IR):
          </div>
          <pre
            style={{
              padding: 12,
              borderRadius: 'var(--radius-sm, 4px)',
              background: 'var(--bg-surface, #1e222d)',
              border: '1px solid var(--border-subtle, #2a2e39)',
              fontSize: 11,
              fontFamily: 'var(--font-family-mono)',
              color: 'var(--text-secondary)',
              maxHeight: 200,
              overflowY: 'auto',
            }}
          >
            {JSON.stringify(verify.ir, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
};
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Workflow, Plus, Sparkles, SlidersHorizontal, Play } from 'lucide-react';
import { AlgoBotsLabView } from '../algodesigner/components/AlgoBotsLabView';
import { HbButton } from '../../components/ui/hb-button';
import '../algodesigner/components/AlgoBotsLabView.css';

export const StrategiesPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="strategy-studio-root" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Top Banner with Direct Visual Designer Handoff */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          background: 'var(--bg-surface, #1e222d)',
          borderBottom: '1px solid var(--border-subtle, #2a2e39)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
            <span>Algo Bots & Strategy Lab</span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Manage active execution engines, backtest sweeps, and quant portfolios
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <HbButton
            variant="primary"
            size="sm"
            icon={<Workflow size={14} />}
            onClick={() => navigate('/algodesigner')}
            title="Open Visual Flow & Python Code Designer"
          >
            Launch Visual Algo Designer
          </HbButton>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <AlgoBotsLabView />
      </div>
    </div>
  );
};

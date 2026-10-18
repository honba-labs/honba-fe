// Params Panel - parameter tuner for selected indicator nodes
// Mirrors honba-frontend apps/algodesigner/params-panel.tsx

import React, { useMemo } from 'react';
import { Sliders, X } from 'lucide-react';

import { useDesignerStore } from '../store';
import { catalogue, cataloguelookup } from '../nodes/catalogue';
import type { GraphNode } from '../model';

const INDICATOR_PARAM_TYPES: Record<string, 'number' | 'boolean' | 'text'> = {
  int: 'number',
  float: 'number',
  str: 'text',
};

function ParamInput({
  label,
  value,
  onChange,
  type = 'text',
  min,
  max,
  step,
}: {
  label: string;
  value: unknown;
  onChange: (val: unknown) => void;
  type?: 'text' | 'number' | 'checkbox' | 'string' | 'boolean';
  min?: number | null;
  max?: number | null;
  step?: number | null;
}) {
  if (type === 'checkbox' || typeof value === 'boolean') {
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-secondary)' }}>
        <span style={{ flex: 1 }}>{label}</span>
        <input
          type="checkbox"
          checked={value as boolean}
          onChange={(e) => onChange(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: 'var(--accent-primary, #2962ff)' }}
        />
      </label>
    );
  }

  if (type === 'number' || typeof value === 'number') {
    const numValue = typeof value === 'number' ? value : Number(value);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11 }}>
        <label style={{ color: 'var(--text-secondary)' }}>{label}</label>
        <input
          type="number"
          value={numValue}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min ?? undefined}
          max={max ?? undefined}
          step={step ?? undefined}
          style={{
            width: '100%',
            padding: '4px 8px',
            background: 'var(--bg-secondary, #131722)',
            border: '1px solid var(--border-subtle, #2a2e39)',
            borderRadius: 'var(--radius-sm, 4px)',
            color: 'var(--text-primary)',
            fontSize: 11,
            fontFamily: 'var(--font-family-mono)',
            outline: 'none',
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11 }}>
      <label style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <input
        type="text"
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '4px 8px',
          background: 'var(--bg-secondary, #131722)',
          border: '1px solid var(--border-subtle, #2a2e39)',
          borderRadius: 'var(--radius-sm, 4px)',
          color: 'var(--text-primary)',
          fontSize: 11,
          outline: 'none',
        }}
      />
    </div>
  );
}

export interface ParamsPanelProps {
  graph: any;
  onParamChange: (nodeId: string, params: Record<string, unknown>) => void;
}

export const ParamsPanel: React.FC<ParamsPanelProps> = ({ graph, onParamChange }) => {
  const store = useDesignerStore();
  const selectedNodeId = store.selectedNodeId;

  const node = useMemo(() => graph.nodes.find((n: GraphNode) => n.id === selectedNodeId), [graph.nodes, selectedNodeId]);

  if (!node || (!node.params && node.type !== 'indicator')) {
    return (
      <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 11, textAlign: 'center' }}>
        Select an indicator node to tune parameters.
      </div>
    );
  }

  const isIndicator = node.type === 'indicator';
  const entry = isIndicator && node.indicator ? cataloguelookup(node.indicator) : null;

  const handleParamChange = (paramName: string, value: unknown) => {
    onParamChange(node.id, { [paramName]: value });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sliders size={14} style={{ color: 'var(--accent-primary, #2962ff)' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Parameter Tuner</span>
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-family-mono)' }}>
          {node.id}
        </span>
      </div>

      {isIndicator && (
        <div style={{ borderTop: '1px solid var(--border-subtle, #2a2e39)', paddingTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Indicator Parameters
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entry
              ? entry.params.map((param) => (
                  <ParamInput
                    key={param.name}
                    label={param.name}
                    value={node.params?.[param.name] ?? param.defaultValue}
                    onChange={(val) => handleParamChange(param.name, val)}
                    type={INDICATOR_PARAM_TYPES[param.typeName]}
                    min={param.min}
                    max={param.max}
                    step={param.step}
                  />
                ))
              : Object.entries(node.params ?? {}).map(([key, value]) => (
                  <ParamInput
                    key={key}
                    label={key}
                    value={value}
                    onChange={(val) => handleParamChange(key, val)}
                    type={typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'checkbox' : 'text'}
                  />
                ))}
          </div>
        </div>
      )}

      {!isIndicator && node.params && Object.keys(node.params).length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-subtle, #2a2e39)', paddingTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Node Parameters
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(node.params).map(([key, value]) => (
              <ParamInput
                key={key}
                label={key}
                value={value}
                onChange={(val) => handleParamChange(key, val)}
                type={typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'checkbox' : 'text'}
              />
            ))}
          </div>
        </div>
      )}

      {(!node.params || Object.keys(node.params).length === 0) && !isIndicator && (
        <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 11, textAlign: 'center' }}>
          No parameters for this node type.
        </div>
      )}
    </div>
  );
};
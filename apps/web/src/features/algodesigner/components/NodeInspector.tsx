// Node Inspector - property editor for selected node
// Mirrors honba-frontend apps/algodesigner/inspector.tsx

import React, { useMemo } from 'react';
import { X, Sliders, RotateCcw, Trash2 } from 'lucide-react';

import { useDesignerStore } from '../store';
import { catalogue, cataloguelookup } from '../nodes/catalogue';
import type { GraphNode, NodeType } from '../model';

interface InspectorProps {
  // No props needed - reads from store
}

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

export const NodeInspector: React.FC<InspectorProps> = () => {
  const store = useDesignerStore();
  const { selectedNodeId, graph, updateNodeParams, updateNodeLabel, updateNodeIndicator, deleteNode } = store;

  const node = useMemo(() => graph.nodes.find((n) => n.id === selectedNodeId), [graph.nodes, selectedNodeId]);

  if (!node) return null;

  const isIndicator = node.type === 'indicator';
  const entry = isIndicator && node.indicator ? cataloguelookup(node.indicator) : null;

  const handleParamChange = (paramName: string, value: unknown) => {
    updateNodeParams(node.id, { [paramName]: value });
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNodeLabel(node.id, e.target.value);
  };

  const handleIndicatorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateNodeIndicator(node.id, e.target.value);
  };

  const handleDelete = () => {
    deleteNode(node.id);
  };

  const handleResetParams = () => {
    if (entry) {
      const defaults: Record<string, unknown> = {};
      entry.params.forEach((p) => {
        defaults[p.name] = p.defaultValue;
      });
      updateNodeParams(node.id, defaults);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-surface, #1e222d)' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-subtle, #2a2e39)',
          background: 'var(--bg-surface-elevated, #2a2e39)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sliders size={16} style={{ color: 'var(--accent-primary, #2962ff)' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Property Editor</span>
        </div>
        <button
          type="button"
          onClick={() => store.selectNode(null)}
          style={{ padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', borderRadius: 3 }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Node Identity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Node ID</span>
            <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 11, color: 'var(--text-primary)', background: 'var(--bg-secondary, #131722)', padding: '2px 6px', borderRadius: 3 }}>
              {node.id}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Label</label>
            <input
              type="text"
              value={node.label || ''}
              onChange={handleLabelChange}
              style={{
                width: '100%',
                padding: '6px 8px',
                background: 'var(--bg-secondary, #131722)',
                border: '1px solid var(--border-subtle, #2a2e39)',
                borderRadius: 'var(--radius-sm, 4px)',
                color: 'var(--text-primary)',
                fontSize: 11,
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Indicator Selector */}
        {isIndicator && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Indicator</label>
            <select
              value={node.indicator || ''}
              onChange={handleIndicatorChange}
              style={{
                width: '100%',
                padding: '6px 8px',
                background: 'var(--bg-secondary, #131722)',
                border: '1px solid var(--border-subtle, #2a2e39)',
                borderRadius: 'var(--radius-sm, 4px)',
                color: 'var(--text-primary)',
                fontSize: 11,
                outline: 'none',
              }}
            >
              {catalogue().indicators.map((ind) => (
                <option key={ind.kind} value={ind.kind}>
                  {ind.kind.toUpperCase()} ({ind.family})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Parameters */}
        {(node.params && Object.keys(node.params).length > 0) || isIndicator ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Parameters
              </span>
              {(node.params && Object.keys(node.params).length > 0) && (
                <button
                  type="button"
                  onClick={handleResetParams}
                  style={{ fontSize: 10, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent-primary, #2962ff)', background: 'transparent', border: '1px solid var(--accent-primary, #2962ff)', borderRadius: 3, cursor: 'pointer' }}
                  title="Reset to defaults"
                >
                  <RotateCcw size={10} />
                  <span>Reset</span>
                </button>
              )}
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
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'center', padding: 16 }}>
            No parameters for this node type.
          </div>
        )}

        {/* Actions */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: 12,
            borderTop: '1px solid var(--border-subtle, #2a2e39)',
            display: 'flex',
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={handleDelete}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '6px 12px',
              background: 'var(--bearish-subtle, rgba(242, 54, 69, 0.14))',
              border: '1px solid var(--bearish, #f23645)',
              borderRadius: 'var(--radius-sm, 4px)',
              color: 'var(--bearish, #f23645)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Trash2 size={12} />
            <span>Delete Node</span>
          </button>
        </div>
      </div>
    </div>
  );
};
// Base Honba Node component for @xyflow/react
// Mirrors honba-frontend apps/algodesigner/nodes/BaseHonbaNode.tsx

import React from 'react';
import { Handle, type NodeProps, Position } from '@xyflow/react';
import { AlertTriangle, CheckCircle2, MoreHorizontal, X } from 'lucide-react';

import type { PortSpec } from '../model';

export interface BaseHonbaNodeProps {
  id: string;
  selected: boolean;
  category: 'data' | 'indicator' | 'logic' | 'risk' | 'execution';
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  inputs?: PortSpec[];
  outputs?: PortSpec[];
  issues?: Array<{ code: string; message: string }>;
  accentColor?: string;
  children?: React.ReactNode;
  onMore?: () => void;
  onDelete?: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  data: 'var(--accent-primary, #2962ff)',
  indicator: 'var(--bullish, #089981)',
  logic: 'var(--accent-gold, #f7a600)',
  risk: 'var(--bearish, #f23645)',
  execution: 'var(--accent-purple, #a855f7)',
};

export const BaseHonbaNode: React.FC<BaseHonbaNodeProps> = ({
  id,
  selected,
  category,
  title,
  subtitle,
  icon,
  inputs = [],
  outputs = [],
  issues,
  accentColor,
  children,
  onMore,
  onDelete,
}) => {
  const categoryColor = accentColor ?? CATEGORY_COLORS[category] ?? 'var(--accent-primary, #2962ff)';
  const hasIssues = issues && issues.length > 0;

  const handleStyle = (position: Position) => ({
    position,
    style: {
      background: categoryColor,
      border: '2px solid rgba(255, 255, 255, 0.85)',
      borderRadius: '50%',
      width: 10,
      height: 10,
      zIndex: 10,
      boxShadow: `0 0 6px ${categoryColor}`,
    },
    isConnectable: true,
  });

  return (
    <div
      className="nodrag nopan"
      style={{
        minWidth: 200,
        maxWidth: 300,
        background: selected ? 'var(--bg-surface-hover, #2a2e39)' : 'rgba(26, 30, 42, 0.95)',
        backdropFilter: 'blur(10px)',
        border: hasIssues
          ? '1.5px solid var(--bearish, #f23645)'
          : selected
          ? `1.5px solid ${categoryColor}`
          : '1px solid var(--border-medium, #434651)',
        borderTop: `3px solid ${categoryColor}`,
        borderRadius: '8px',
        boxShadow: selected
          ? `0 0 0 2px ${categoryColor}44, 0 12px 32px rgba(0,0,0,0.5)`
          : '0 6px 20px rgba(0,0,0,0.35)',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        transition: 'all 0.15s ease-out',
      }}
    >
      {/* Header: icon, title, actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: 6,
              background: `${categoryColor}25`,
              color: categoryColor,
              boxShadow: `0 2px 6px ${categoryColor}25`,
            }}
          >
            {icon}
          </span>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 10,
                color: 'var(--text-muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontFamily: 'var(--font-family-mono)',
              }}
            >
              {subtitle}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {hasIssues ? (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                padding: '1px 5px',
                borderRadius: 3,
                background: 'rgba(242, 54, 69, 0.15)',
                color: 'var(--bearish, #f23645)',
                fontSize: 9,
                fontWeight: 600,
              }}
              title={issues!.map((i) => i.message).join('; ')}
            >
              <AlertTriangle size={9} />
              <span>{issues!.length}</span>
            </span>
          ) : (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                padding: '1px 5px',
                borderRadius: 3,
                background: 'rgba(8, 153, 129, 0.15)',
                color: 'var(--bullish, #089981)',
                fontSize: 9,
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={9} />
              <span>OK</span>
            </span>
          )}
          {(onMore || onDelete) && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onMore?.(); }}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onDelete?.(); }}
              style={{
                padding: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                borderRadius: 3,
              }}
              title={onDelete ? 'Right-click to delete' : undefined}
            >
              <MoreHorizontal size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Input Handles */}
      {inputs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {inputs.map((port) => (
            <div key={port.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Handle
                id={port.id}
                type="target"
                position={Position.Left}
                style={handleStyle(Position.Left).style}
              />
              <div style={{ flex: 1, fontSize: 10, color: 'var(--text-secondary)' }}>
                <div style={{ fontWeight: 600 }}>{port.name}</div>
                <div style={{ fontSize: 9, opacity: 0.7 }}>{port.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Node Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        {children}
      </div>

      {/* Output Handles */}
      {outputs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
          {outputs.map((port) => (
            <div key={port.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, textAlign: 'right', fontSize: 10, color: 'var(--text-secondary)' }}>
                <div style={{ fontWeight: 600 }}>{port.name}</div>
                <div style={{ fontSize: 9, opacity: 0.7 }}>{port.description}</div>
              </div>
              <Handle
                id={port.id}
                type="source"
                position={Position.Right}
                style={handleStyle(Position.Right).style}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
// Split Pane Components for resizable layout
// Mirrors honba-frontend apps/algodesigner/split-pane.tsx

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { GripVertical, GripHorizontal, Maximize2 } from 'lucide-react';

import type { DesignerPane } from '../layout';

export interface SplitterProps {
  ariaLabel: string;
  onDelta: (delta: number) => void;
  orientation?: 'horizontal' | 'vertical';
}

export const Splitter: React.FC<SplitterProps> = ({ ariaLabel, onDelta, orientation = 'vertical' }) => {
  const [dragging, setDragging] = useState(false);
  const startRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(true);
      startRef.current = { x: e.clientX, y: e.clientY };
    },
    [],
  );

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = orientation === 'vertical' ? e.clientX - startRef.current.x : e.clientY - startRef.current.y;
      if (Math.abs(delta) > 1) {
        onDelta(delta);
        startRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUp = () => {
      setDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, onDelta, orientation]);

  return (
    <div
      role="separator"
      aria-label={ariaLabel}
      aria-orientation={orientation}
      tabIndex={0}
      onMouseDown={handleMouseDown}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          const step = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -10 : 10;
          onDelta(step);
        }
      }}
      style={{
        width: orientation === 'vertical' ? 8 : '100%',
        height: orientation === 'horizontal' ? 8 : '100%',
        cursor: orientation === 'vertical' ? 'col-resize' : 'row-resize',
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 10,
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: orientation === 'vertical' ? 2 : 24,
          height: orientation === 'horizontal' ? 2 : 24,
          background: dragging ? 'var(--accent-primary, #2962ff)' : 'var(--border-subtle, #2a2e39)',
          borderRadius: 2,
          transition: 'background var(--transition-fast, 120ms)',
        }}
      />
    </div>
  );
};

export interface PaneProps {
  id: DesignerPane;
  title: string;
  icon: React.ReactNode;
  focused: boolean;
  onToggleFocus: (pane: DesignerPane) => void;
  onClose?: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const Pane: React.FC<PaneProps> = ({ id, title, icon, focused, onToggleFocus, onClose, actions, children }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg-app, #131722)',
        borderRadius: focused ? '0' : 'var(--radius-md, 6px)',
        overflow: 'hidden',
        boxShadow: focused ? 'none' : 'var(--shadow-sm)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          background: focused ? 'var(--accent-primary, #2962ff)' : 'var(--bg-surface-elevated, #2a2e39)',
          borderBottom: '1px solid var(--border-subtle, #2a2e39)',
          color: focused ? '#fff' : 'var(--text-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: focused ? '#fff' : 'var(--accent-primary, #2962ff)' }}>{icon}</span>
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</span>
          {focused && (
            <span
              style={{
                fontSize: 9,
                padding: '1px 5px',
                borderRadius: 3,
                background: 'rgba(255,255,255,0.2)',
                fontWeight: 600,
              }}
            >
              FOCUS
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {actions}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{ padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: focused ? '#fff' : 'var(--text-muted)', cursor: 'pointer', borderRadius: 3 }}
            >
              <span style={{ fontSize: 14 }}>✕</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onToggleFocus(id)}
            style={{
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              color: focused ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer',
              borderRadius: 3,
            }}
            title={focused ? 'Exit focus mode' : 'Enter focus mode'}
          >
            <Maximize2 size={12} />
          </button>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        {children}
      </div>
    </div>
  );
};
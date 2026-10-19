import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  PanelRight,
} from 'lucide-react';
import { useWorkbenchStore } from '../../core/workbench/store';
import type { HonbaClient } from '../../core/api/generated/client';
import { OPENALGO_LAYOUTS, LayoutIcon, layoutById } from '../../lib/chart/layouts';

interface WorkbenchToolbarProps {
  client?: HonbaClient;
}

export const WorkbenchToolbar: React.FC<WorkbenchToolbarProps> = ({ client }) => {
  const {
    layout,
    setLayout,
    isOrderTicketOpen,
    toggleOrderTicket,
    statusMessage,
    error,
    dismissStatus,
  } = useWorkbenchStore();

  const activeLayoutId =
    layout === '1x1'
      ? 'single'
      : layout === '1x2'
      ? 'cols2'
      : layout === '2x1'
      ? 'rows2'
      : layout === '2x2'
      ? 'grid4'
      : layout;

  const activePreset = layoutById(activeLayoutId);
  const [gridMenuOpen, setGridMenuOpen] = useState(false);
  const gridMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gridMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!gridMenuRef.current?.contains(e.target as Node)) setGridMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [gridMenuOpen]);


  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 14px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
            Workspace Grid
          </span>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.7 }}>{activePreset.label}</span>
        </div>
        <div ref={gridMenuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setGridMenuOpen((o) => !o)}
            title={activePreset.label}
            aria-haspopup="menu"
            aria-expanded={gridMenuOpen}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              border: '1px solid var(--border-subtle)',
              borderRadius: 4,
              cursor: 'pointer',
              background: 'var(--bg-app)',
              color: 'var(--text-primary)',
            }}
          >
            <LayoutIcon preset={activePreset} />
            <ChevronDown size={12} />
          </button>
          {gridMenuOpen && (
            <div
              role="menu"
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                zIndex: 50,
                display: 'flex',
                gap: 2,
                padding: 3,
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 6,
              }}
            >
              {OPENALGO_LAYOUTS.map((preset) => {
                const isSelected = activeLayoutId === preset.id;
                return (
                  <button
                    key={preset.id}
                    role="menuitem"
                    onClick={() => {
                      setLayout(preset.id as any);
                      setGridMenuOpen(false);
                    }}
                    title={preset.label}
                    aria-label={preset.label}
                    style={{
                      display: 'inline-flex',
                      padding: 6,
                      border: isSelected ? '1px solid var(--accent-subtle)' : '1px solid transparent',
                      borderRadius: 4,
                      cursor: 'pointer',
                      background: isSelected ? 'var(--bg-app)' : 'transparent',
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    <LayoutIcon preset={preset} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {statusMessage && (
          <div
            onClick={dismissStatus}
            style={{
              fontSize: 11,
              color: 'var(--bullish)',
              background: 'var(--bullish-subtle)',
              padding: '3px 8px',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            {statusMessage}
          </div>
        )}
        {error && (
          <div
            onClick={dismissStatus}
            style={{
              fontSize: 11,
              color: 'var(--bearish)',
              background: 'var(--bearish-subtle)',
              padding: '3px 8px',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={toggleOrderTicket}
            title={isOrderTicketOpen ? 'Collapse Order Ticket' : 'Expand Order Ticket'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 9px',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 4,
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              background: isOrderTicketOpen ? 'var(--bg-surface-elevated)' : 'var(--bg-app)',
              color: isOrderTicketOpen ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            <PanelRight size={12} />
            <span>Ticket</span>
          </button>
        </div>
      </div>
    </div>
  );
};

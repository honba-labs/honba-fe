// Library Drawer - saved strategies browser
// Mirrors honba-frontend apps/algodesigner/library-drawer.tsx

import React, { useMemo } from 'react';
import { Plus, FolderOpen, Copy, Trash2, ExternalLink, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';

import { useDesignerStore } from '../store';
import type { SavedStrategyManifest } from '../library-store';
import { STRATEGY_TEMPLATES } from '../strategy-templates';

interface LibraryDrawerProps {
  templates: typeof STRATEGY_TEMPLATES;
  saved: SavedStrategyManifest[];
  onNewStrategy: () => void;
  onAddIndicator: (kind: string) => void;
  onOpen: (graph: any) => void;
  onSimulate: (graph: any) => void;
  onFork: (manifest: SavedStrategyManifest) => void;
  onDelete: (id: string) => void;
}

const CATEGORIES = ['All', 'trend', 'mean_reversion', 'breakout', 'volatility', 'custom'] as const;

export const LibraryDrawer: React.FC<LibraryDrawerProps> = ({
  templates,
  saved,
  onNewStrategy,
  onAddIndicator,
  onOpen,
  onSimulate,
  onFork,
  onDelete,
}) => {
  const [activeCategory, setActiveCategory] = React.useState('All');
  const [expandedTemplates, setExpandedTemplates] = React.useState<Record<string, boolean>>({});

  const filteredSaved = useMemo(() => {
    if (activeCategory === 'All') return saved;
    return saved.filter((s) => s.category === activeCategory);
  }, [saved, activeCategory]);

  const templateGroups = useMemo(() => {
    const groups: Record<string, typeof templates> = {};
    templates.forEach((t) => {
      if (!groups[t.category]) groups[t.category] = [];
      groups[t.category].push(t);
    });
    return groups;
  }, [templates]);

  const handleToggleTemplateCategory = (category: string) => {
    setExpandedTemplates((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const handleOpenSaved = (manifest: SavedStrategyManifest) => {
    onOpen(manifest.graph);
  };

  const handleSimulateSaved = (manifest: SavedStrategyManifest) => {
    onSimulate(manifest.graph);
  };

  const handleForkSaved = (manifest: SavedStrategyManifest) => {
    onFork(manifest);
  };

  const handleDeleteSaved = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this saved strategy?')) {
      onDelete(id);
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
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Library</span>
          <span
            style={{
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 3,
              background: 'var(--accent-primary, #2962ff)22',
              color: 'var(--accent-primary, #2962ff)',
              fontWeight: 600,
            }}
          >
            {saved.length} saved
          </span>
        </div>
        <button
          type="button"
          onClick={onNewStrategy}
          className="shortlist-btn"
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 11 }}
        >
          <Plus size={12} />
          <span>New</span>
        </button>
      </div>

      {/* Category Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-subtle, #2a2e39)',
          overflowX: 'auto',
        }}
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat as typeof activeCategory)}
            className={activeCategory === cat ? 'shortlist-btn shortlist-btn-primary' : 'shortlist-btn'}
            style={{ padding: '3px 10px', fontSize: 11, whiteSpace: 'nowrap' }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Strategy Templates */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Strategy Templates
          </div>
          {Object.entries(templateGroups).map(([category, tmpls]) => {
            const isExpanded = expandedTemplates[category] ?? true;
            return (
              <div key={category} style={{ marginBottom: 8 }}>
                <button
                  type="button"
                  onClick={() => handleToggleTemplateCategory(category)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '6px 8px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: 11,
                    fontWeight: 600,
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-sm, 4px)',
                  }}
                >
                  <span>{category}</span>
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
                {isExpanded && (
                  <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {tmpls.map((tmpl) => (
                      <button
                        key={tmpl.name}
                        type="button"
                        onClick={() => {
                          onOpen(tmpl.graph);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '6px 8px',
                          background: 'var(--bg-secondary, #131722)',
                          border: '1px solid var(--border-subtle, #2a2e39)',
                          borderRadius: 'var(--radius-sm, 4px)',
                          color: 'var(--text-primary)',
                          fontSize: 11,
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all var(--transition-fast, 120ms)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--bg-surface-elevated, #2a2e39)';
                          e.currentTarget.style.borderColor = 'var(--accent-primary, #2962ff)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'var(--bg-secondary, #131722)';
                          e.currentTarget.style.borderColor = 'var(--border-subtle, #2a2e39)';
                        }}
                      >
                        <FolderOpen size={12} style={{ color: 'var(--accent-primary, #2962ff)' }} />
                        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {tmpl.label}
                        </span>
                        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{tmpl.graph.nodes.length} nodes</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Saved Strategies */}
        {saved.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              My Strategies ({filteredSaved.length})
            </div>
            {filteredSaved.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
                No strategies in this category.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filteredSaved.map((manifest) => (
                  <div
                    key={manifest.id}
                    style={{
                      padding: '10px 12px',
                      background: 'var(--bg-secondary, #131722)',
                      border: '1px solid var(--border-subtle, #2a2e39)',
                      borderRadius: 'var(--radius-sm, 4px)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>{manifest.name}</span>
                          <span
                            style={{
                              fontSize: 9,
                              padding: '1px 5px',
                              borderRadius: 3,
                              background: 'var(--accent-primary, #2962ff)22',
                              color: 'var(--accent-primary, #2962ff)',
                              fontWeight: 600,
                            }}
                          >
                            {manifest.category}
                          </span>
                          {manifest.tags.length > 0 && (
                            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                              {manifest.tags.map((t) => `#${t}`).join(' ')}
                            </span>
                          )}
                        </div>
                        {manifest.description && (
                          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4 }}>
                            {manifest.description}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 10, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'var(--font-family-mono)' }}>{manifest.graph.nodes.length} nodes</span>
                          <span style={{ fontFamily: 'var(--font-family-mono)' }}>{manifest.graph.edges?.length ?? 0} edges</span>
                          <span>v{manifest.version}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => handleOpenSaved(manifest)}
                          className="shortlist-btn"
                          style={{ padding: '4px 8px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 3 }}
                          title="Open in Designer"
                        >
                          <FolderOpen size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleSimulateSaved(manifest)}
                          className="shortlist-btn"
                          style={{ padding: '4px 8px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 3, color: 'var(--bullish, #089981)' }}
                          title="Simulate"
                        >
                          <ExternalLink size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleForkSaved(manifest)}
                          className="shortlist-btn"
                          style={{ padding: '4px 8px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 3 }}
                          title="Fork (copy)"
                        >
                          <Copy size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSaved(manifest.id, e)}
                          className="shortlist-btn"
                          style={{ padding: '4px 8px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 3, color: 'var(--bearish, #f23645)' }}
                          title="Delete"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
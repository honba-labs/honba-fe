import React, { useMemo, useState } from 'react';
import {
  Plus,
  FolderOpen,
  Copy,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Search,
  Globe,
  User,
  Layers,
  Play,
} from 'lucide-react';

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
  const [libraryMode, setLibraryMode] = useState<'all' | 'global' | 'user'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedTemplates, setExpandedTemplates] = useState<Record<string, boolean>>({});

  const filteredSaved = useMemo(() => {
    return saved.filter((s) => {
      const matchesCategory = activeCategory === 'All' || s.category === activeCategory;
      const matchesSearch =
        !searchQuery ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [saved, activeCategory, searchQuery]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesCategory = activeCategory === 'All' || t.category === activeCategory;
      const matchesSearch =
        !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [templates, activeCategory, searchQuery]);

  const templateGroups = useMemo(() => {
    const groups: Record<string, typeof templates> = {};
    filteredTemplates.forEach((t) => {
      if (!groups[t.category]) groups[t.category] = [];
      groups[t.category].push(t);
    });
    return groups;
  }, [filteredTemplates]);

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
            {templates.length} Global • {saved.length} User
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

      {/* Global Library vs User Library Segmented Control */}
      <div
        style={{
          display: 'flex',
          padding: '6px 10px',
          gap: 4,
          background: 'var(--bg-card, #141722)',
          borderBottom: '1px solid var(--border-subtle, #2a2e39)',
        }}
      >
        <button
          type="button"
          onClick={() => setLibraryMode('all')}
          style={{
            flex: 1,
            padding: '4px 6px',
            fontSize: 10.5,
            fontWeight: 600,
            borderRadius: 4,
            border: 'none',
            background: libraryMode === 'all' ? 'var(--accent-primary, #2962ff)' : 'transparent',
            color: libraryMode === 'all' ? '#ffffff' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setLibraryMode('global')}
          style={{
            flex: 1.5,
            padding: '4px 6px',
            fontSize: 10.5,
            fontWeight: 600,
            borderRadius: 4,
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            background: libraryMode === 'global' ? 'var(--accent-primary, #2962ff)' : 'transparent',
            color: libraryMode === 'global' ? '#ffffff' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Global Library: Pre-built institutional & OpenAlgo strategies"
        >
          <Globe size={11} />
          <span>Global ({templates.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setLibraryMode('user')}
          style={{
            flex: 1.5,
            padding: '4px 6px',
            fontSize: 10.5,
            fontWeight: 600,
            borderRadius: 4,
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            background: libraryMode === 'user' ? 'var(--accent-primary, #2962ff)' : 'transparent',
            color: libraryMode === 'user' ? '#ffffff' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="User Library: My custom created and saved strategies"
        >
          <User size={11} />
          <span>User ({saved.length})</span>
        </button>
      </div>

      {/* Search Input */}
      <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-subtle, #2a2e39)' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={12} style={{ position: 'absolute', left: 8, color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search strategies & indicators…"
            style={{
              width: '100%',
              padding: '4px 8px 4px 26px',
              fontSize: 11,
              background: 'var(--bg-input, #0e121b)',
              border: '1px solid var(--border-subtle, #2a2e39)',
              borderRadius: 4,
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: '6px 10px',
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
            style={{ padding: '3px 8px', fontSize: 10.5, whiteSpace: 'nowrap' }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Strategy Templates (Global Library) */}
        {libraryMode !== 'user' && (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-secondary)',
                marginBottom: 8,
                letterSpacing: '0.5px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Globe size={11} color="var(--accent-primary)" />
                <span>Strategy Templates</span>
              </div>
              <span style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>
                GLOBAL LIBRARY ({filteredTemplates.length})
              </span>
            </div>

            {filteredTemplates.length === 0 ? (
              <div style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
                No templates match filter.
              </div>
            ) : (
              Object.entries(templateGroups).map(([category, tmpls]) => {
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
                        padding: '4px 8px',
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
                      <span style={{ textTransform: 'capitalize' }}>{category.replace('_', ' ')}</span>
                      {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>
                    {isExpanded && (
                      <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {tmpls.map((tmpl) => (
                          <div
                            key={tmpl.name}
                            style={{
                              padding: '8px 10px',
                              background: 'var(--bg-secondary, #131722)',
                              border: '1px solid var(--border-subtle, #2a2e39)',
                              borderRadius: 'var(--radius-sm, 4px)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                              <span style={{ fontWeight: 600, fontSize: 11.5, color: 'var(--text-primary)' }}>
                                {tmpl.label}
                              </span>
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
                                {tmpl.graph.universe.explicit?.[0]?.symbol ?? 'NSE'}
                              </span>
                            </div>

                            {tmpl.description && (
                              <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                                {tmpl.description}
                              </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 2 }}>
                              <span style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>
                                {tmpl.graph.nodes.length} nodes • {tmpl.graph.driving_timeframe.interval}
                                {tmpl.graph.driving_timeframe.aggregation[0]}
                              </span>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button
                                  type="button"
                                  onClick={() => onOpen(tmpl.graph)}
                                  className="shortlist-btn"
                                  style={{ padding: '2px 6px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 3 }}
                                  title="Load into Visual Flow & Code Editor"
                                >
                                  <FolderOpen size={10} />
                                  <span>Open</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onSimulate(tmpl.graph)}
                                  className="shortlist-btn"
                                  style={{
                                    padding: '2px 6px',
                                    fontSize: 10,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 3,
                                    color: 'var(--bullish, #089981)',
                                  }}
                                  title="Simulate this template"
                                >
                                  <Play size={10} fill="currentColor" />
                                  <span>Simulate</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Saved Strategies (User Library) */}
        {libraryMode !== 'global' && (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-secondary)',
                marginBottom: 8,
                letterSpacing: '0.5px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <User size={11} color="var(--bullish, #089981)" />
                <span>My Strategies ({filteredSaved.length})</span>
              </div>
              <span style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>
                USER LIBRARY
              </span>
            </div>

            {filteredSaved.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
                {saved.length === 0
                  ? 'No custom strategies saved yet. Save your current strategy to see it here.'
                  : 'No strategies in this category.'}
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
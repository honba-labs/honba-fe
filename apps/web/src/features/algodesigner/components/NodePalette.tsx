// Node Palette for drag-and-drop
// Mirrors honba-frontend apps/algodesigner/palette.tsx

import React, { useMemo } from 'react';
import { Search, X, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import { useDesignerStore } from '../store';
import { catalogue } from '../nodes/catalogue';
import type { GraphNode } from '../model';

export interface NodeTemplate {
  type: string;
  label: string;
  category: string;
  icon: React.ReactNode;
  defaultNode: () => Omit<GraphNode, 'id'>;
  onDragStart?: (event: React.DragEvent, template: NodeTemplate) => void;
}

const STATIC_TEMPLATES: NodeTemplate[] = [
  {
    type: 'universe',
    label: 'Universe',
    category: 'Data',
    icon: (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx={12} cy={12} r={10} />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    defaultNode: () => ({
      type: 'universe',
      label: 'Universe',
    }),
  },
  {
    type: 'condition',
    label: 'Condition',
    category: 'Logic',
    icon: (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
    defaultNode: () => ({
      type: 'condition',
      label: 'Condition',
      params: { op: 'crosses_above' },
    }),
  },
  {
    type: 'logic',
    label: 'AND Gate',
    category: 'Logic',
    icon: (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
    defaultNode: () => ({
      type: 'logic',
      label: 'AND Gate',
      params: { op: 'and' },
    }),
  },
  {
    type: 'logic',
    label: 'OR Gate',
    category: 'Logic',
    icon: (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
    defaultNode: () => ({
      type: 'logic',
      label: 'OR Gate',
      params: { op: 'or' },
    }),
  },
  {
    type: 'order',
    label: 'Buy Order',
    category: 'Execution',
    icon: (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M21 12V7H5" />
        <path d="M16 16l4 4 4-4" />
        <path d="M12 12v12" />
      </svg>
    ),
    defaultNode: () => ({
      type: 'order',
      label: 'Buy Order',
      params: { side: 'buy', quantity: 1 },
    }),
  },
  {
    type: 'order',
    label: 'Sell Order',
    category: 'Execution',
    icon: (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M21 12V7H5" />
        <path d="M16 16l4 4 4-4" />
        <path d="M12 12v12" />
      </svg>
    ),
    defaultNode: () => ({
      type: 'order',
      label: 'Sell Order',
      params: { side: 'sell', quantity: 1 },
    }),
  },
  {
    type: 'sizing',
    label: 'Position Sizing',
    category: 'Risk',
    icon: (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx={12} cy={12} r={10} />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),
    defaultNode: () => ({
      type: 'sizing',
      label: 'Fixed Sizing',
      params: { mode: 'fixed_quantity', value: 1 },
    }),
  },
  {
    type: 'risk',
    label: 'Risk Gate',
    category: 'Risk',
    icon: (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1={12} y1={9} x2={12} y2={13} />
        <line x1={12} y1={17} x2={12.01} y2={17} />
      </svg>
    ),
    defaultNode: () => ({
      type: 'risk',
      label: 'Risk Gate',
      params: { max_drawdown: 0.05 },
    }),
  },
];

function categoryIcon(category: string): React.ReactNode {
  switch (category) {
    case 'Data':
      return (
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <ellipse cx={12} cy={5} rx={9} ry={3} />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      );
    case 'Indicators':
      return (
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      );
    case 'Logic':
      return (
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'Risk':
      return (
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1={12} y1={9} x2={12} y2={13} />
          <line x1={12} y1={17} x2={12.01} y2={17} />
        </svg>
      );
    case 'Execution':
      return (
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M21 12V7H5" />
          <path d="M16 16l4 4 4-4" />
          <path d="M12 12v12" />
        </svg>
      );
    default:
      return <span>{category[0]}</span>;
  }
}

interface PaletteCategory {
  name: string;
  icon: React.ReactNode;
  templates: NodeTemplate[];
}

export interface NodePaletteProps {
  onDragStart: (event: React.DragEvent, template: NodeTemplate) => void;
  onAdd: (template: NodeTemplate) => void;
  onClose: () => void;
}

export const NodePalette: React.FC<NodePaletteProps> = ({ onDragStart, onAdd, onClose }) => {
  const store = useDesignerStore();
  const [filter, setFilter] = React.useState('');
  const [expandedCategories, setExpandedCategories] = React.useState<Record<string, boolean>>({});

  const allTemplates = useMemo(() => {
    const cat = catalogue();
    const indicatorTemplates: NodeTemplate[] = cat.indicators.map((ind) => ({
      type: 'indicator',
      label: ind.kind.toUpperCase(),
      category: 'Indicators',
      icon: (
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
      defaultNode: () => ({
        type: 'indicator',
        indicator: ind.kind,
        label: ind.kind.toUpperCase(),
        params: Object.fromEntries(ind.params.map((p) => [p.name, p.defaultValue])),
      }),
    }));

    const categories: PaletteCategory[] = [
      { name: 'Data', icon: categoryIcon('Data'), templates: STATIC_TEMPLATES.filter((t) => t.category === 'Data') },
      { name: 'Indicators', icon: categoryIcon('Indicators'), templates: indicatorTemplates },
      { name: 'Logic', icon: categoryIcon('Logic'), templates: STATIC_TEMPLATES.filter((t) => t.category === 'Logic') },
      { name: 'Risk', icon: categoryIcon('Risk'), templates: STATIC_TEMPLATES.filter((t) => t.category === 'Risk') },
      { name: 'Execution', icon: categoryIcon('Execution'), templates: STATIC_TEMPLATES.filter((t) => t.category === 'Execution') },
    ];

    return categories;
  }, []);

  const filteredCategories = React.useMemo(() => {
    if (!filter.trim()) return allTemplates;
    const lower = filter.toLowerCase();
    return allTemplates.map((cat) => ({
      ...cat,
      templates: cat.templates.filter(
        (t) => t.label.toLowerCase().includes(lower) || t.category.toLowerCase().includes(lower),
      ),
    })).filter((cat) => cat.templates.length > 0);
  }, [allTemplates, filter]);

  const handleDragStart = (e: React.DragEvent, template: NodeTemplate) => {
    e.dataTransfer.setData('application/honba-node', JSON.stringify(template));
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart(e, template);
  };

  const handleAdd = (template: NodeTemplate) => {
    onAdd(template);
    onClose();
  };

  const toggleCategory = (name: string) => {
    setExpandedCategories((prev) => ({ ...prev, [name]: !prev[name] }));
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
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Node Palette</span>
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
            {store.graph.nodes.length} nodes
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{ padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', borderRadius: 3 }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle, #2a2e39)' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 8,
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search nodes..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px 6px 28px',
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

      {/* Categories */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {filteredCategories.map((cat) => {
          const isExpanded = expandedCategories[cat.name] ?? true;
          return (
            <div key={cat.name} style={{ marginBottom: 8 }}>
              <button
                type="button"
                onClick={() => toggleCategory(cat.name)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
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
                <span style={{ display: 'flex', alignItems: 'center' }}>{cat.icon}</span>
                <span>{cat.name}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 9 }}>{cat.templates.length}</span>
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
              {isExpanded && (
                <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {cat.templates.map((template) => (
                    <button
                      key={template.type + '-' + template.label}
                      type="button"
                      onClick={() => handleAdd(template)}
                      onDragStart={(e) => handleDragStart(e, template)}
                      draggable
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
                        cursor: 'grab',
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
                      <span style={{ display: 'flex', alignItems: 'center', color: 'var(--accent-primary, #2962ff)' }}>
                        {template.icon}
                      </span>
                      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {template.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filteredCategories.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            No nodes match "{filter}"
          </div>
        )}
      </div>
    </div>
  );
};
// Strategy Name Editor - inline editable name in toolbar
// Mirrors honba-frontend apps/algodesigner/strategy-name-editor.tsx

import React, { useState, useEffect, useRef } from 'react';
import { Edit2, Check, X } from 'lucide-react';

export interface StrategyNameEditorProps {
  name: string;
  onChange: (name: string) => void;
}

export const StrategyNameEditor: React.FC<StrategyNameEditorProps> = ({ name, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleBlur = () => {
    if (draft.trim() && draft !== name) {
      onChange(draft.trim());
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setDraft(name);
      setEditing(false);
    }
  };

  const startEditing = () => {
    setEditing(true);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={{
          padding: '2px 8px',
          background: 'var(--input-bg, var(--bg-surface-elevated))',
          border: '1px solid var(--accent-primary, #2962ff)',
          borderRadius: 'var(--radius-sm, 4px)',
          color: 'var(--input-text, var(--text-primary))',
          fontSize: 12,
          fontWeight: 600,
          minWidth: 120,
          maxWidth: 200,
          outline: 'none',
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        background: 'transparent',
        border: '1px solid transparent',
        borderRadius: 'var(--radius-sm, 4px)',
        color: 'var(--text-primary)',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'border-color var(--transition-fast, 120ms)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle, #2a2e39)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'transparent')}
    >
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{name}</span>
      <Edit2 size={11} style={{ color: 'var(--text-muted)' }} />
    </button>
  );
};
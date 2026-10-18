// Save to Library Modal
// Mirrors honba-frontend apps/algodesigner/save-to-library-modal.tsx

import React, { useState, useEffect } from 'react';
import { X, FolderOpen, Tag, Hash, User } from 'lucide-react';

import type { SavedStrategyManifest } from '../library-store';

export interface SaveToLibraryModalProps {
  initialName: string;
  initialCategory: string;
  initialDescription: string;
  initialTags: string[];
  onSave: (details: {
    name: string;
    category: string;
    description: string;
    tags: string[];
  }) => Promise<void>;
  onClose: () => void;
}

const CATEGORIES = ['trend', 'mean_reversion', 'breakout', 'volatility', 'custom'] as const;

export const SaveToLibraryModal: React.FC<SaveToLibraryModalProps> = ({
  initialName,
  initialCategory,
  initialDescription,
  initialTags,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState(initialCategory);
  const [description, setDescription] = useState(initialDescription);
  const [tagsInput, setTagsInput] = useState(initialTags.join(', '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Strategy name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ name: name.trim(), category, description: description.trim(), tags });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save strategy');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'var(--bg-surface, #1e222d)',
          border: '1px solid var(--border-subtle, #2a2e39)',
          borderRadius: 'var(--radius-lg, 8px)',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FolderOpen size={18} style={{ color: 'var(--accent-primary, #2962ff)' }} />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              Save Strategy to Library
            </h3>
          </div>
          <button
            type="button"
            className="shortlist-btn"
            onClick={onClose}
            style={{ padding: 4 }}
            disabled={saving}
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Strategy Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My SMA Trend Strategy"
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg-secondary, #131722)',
                border: '1px solid var(--border-subtle, #2a2e39)',
                borderRadius: 'var(--radius-sm, 4px)',
                color: 'var(--text-primary)',
                fontSize: 12,
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg-secondary, #131722)',
                border: '1px solid var(--border-subtle, #2a2e39)',
                borderRadius: 'var(--radius-sm, 4px)',
                color: 'var(--text-primary)',
                fontSize: 12,
                outline: 'none',
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the strategy..."
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg-secondary, #131722)',
                border: '1px solid var(--border-subtle, #2a2e39)',
                borderRadius: 'var(--radius-sm, 4px)',
                color: 'var(--text-primary)',
                fontSize: 11,
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Tag size={12} />
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. sma, trend, intraday"
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg-secondary, #131722)',
                border: '1px solid var(--border-subtle, #2a2e39)',
                borderRadius: 'var(--radius-sm, 4px)',
                color: 'var(--text-primary)',
                fontSize: 12,
                outline: 'none',
              }}
            />
            {tags.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 3,
                      background: 'var(--accent-primary, #2962ff)22',
                      color: 'var(--accent-primary, #2962ff)',
                      fontWeight: 500,
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm, 4px)',
                background: 'rgba(242, 54, 69, 0.1)',
                border: '1px solid var(--bearish, #f23645)',
                color: 'var(--bearish, #f23645)',
                fontSize: 11,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 14 }}>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
            <button
              type="button"
              className="shortlist-btn"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="shortlist-btn shortlist-btn-primary"
              disabled={saving || !name.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px' }}
            >
              {saving ? (
                <>
                  <span style={{ width: 14, height: 14, border: '2px solid currentColor', borderRightColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FolderOpen size={14} />
                  <span>Save to Library</span>
                </>
              )}
            </button>
          </div>
        </form>

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};
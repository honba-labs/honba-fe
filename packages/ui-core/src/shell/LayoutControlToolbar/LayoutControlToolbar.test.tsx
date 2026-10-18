import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { LayoutControlToolbar } from './LayoutControlToolbar';

const layouts = [
  { id: 'default', label: 'Default market data' },
  { id: 'preset-1', label: 'ORB scalping', canDelete: true },
  { id: 'server-42', label: 'Server default (read-only)' },
];

function renderToolbar(overrides: { layoutDirty?: boolean; activeLayoutId?: string } = {}) {
  const onChangeLayout = vi.fn();
  const onAddLayout = vi.fn();
  const onSaveLayout = vi.fn();
  const onDeleteLayout = vi.fn();
  render(
    <LayoutControlToolbar
      layouts={layouts}
      activeLayoutId={'activeLayoutId' in overrides ? overrides.activeLayoutId : 'preset-1'}
      layoutDirty={overrides.layoutDirty ?? false}
      onChangeLayout={onChangeLayout}
      onAddLayout={onAddLayout}
      onSaveLayout={onSaveLayout}
      onDeleteLayout={onDeleteLayout}
    />,
  );
  return { onChangeLayout, onAddLayout, onSaveLayout, onDeleteLayout };
}

describe('LayoutControlToolbar', () => {
  it('lists layouts in the dropdown with the active one selected', () => {
    renderToolbar();
    expect(screen.getByRole('button', { name: /ORB scalping/ })).toBeInTheDocument();
    // The full option list only renders when the dropdown opens.
    fireEvent.click(screen.getByRole('button', { name: /ORB scalping/ }));
    for (const option of layouts) {
      expect(screen.getByRole('option', { name: option.label })).toBeInTheDocument();
      if (option.id === 'preset-1') {
        expect(screen.getByRole('option', { name: option.label })).toHaveAttribute(
          'aria-selected',
          'true',
        );
      }
    }
  });

  it('changes layout through the dropdown after opening it', () => {
    const { onChangeLayout } = renderToolbar();
    expect(onChangeLayout).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /ORB scalping/ }));
    fireEvent.click(screen.getByRole('option', { name: layouts[2].label }));
    expect(onChangeLayout).toHaveBeenCalledWith('server-42');
  });

  it('save follows the layoutDirty flag (disabled + inert when clean)', () => {
    const clean = renderToolbar({ layoutDirty: false });
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();
    fireEvent.click(save);
    expect(clean.onSaveLayout).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Add layout' }));
    expect(clean.onAddLayout).toHaveBeenCalledTimes(1);
  });

  it('save unlocks and turns green once the layout is dirty', () => {
    const dirty = renderToolbar({ layoutDirty: true });
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeEnabled();
    expect(save.className).toMatch(/green/);
    fireEvent.click(save);
    expect(dirty.onSaveLayout).toHaveBeenCalledTimes(1);
  });

  it('delete unlocks only when the active layout canDelete', () => {
    const owned = renderToolbar({ activeLayoutId: 'preset-1' });
    const del = screen.getByRole('button', { name: 'Delete' });
    expect(del).toBeEnabled();
    fireEvent.click(del);
    expect(owned.onDeleteLayout).toHaveBeenCalledTimes(1);
  });

  it('delete is disabled for server-owned or missing layouts', () => {
    renderToolbar({ activeLayoutId: 'server-42' });
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
  });

  it('delete is disabled when no layout is active', () => {
    renderToolbar({ activeLayoutId: undefined });
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
  });
});

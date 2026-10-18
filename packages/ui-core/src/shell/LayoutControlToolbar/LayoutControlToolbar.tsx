// Batch F (docs/tasks.md): presentational port of bfx-hf-ui-core's `LayoutControlToolbar`
// (src/components/LayoutControlToolbar/*, Apache-2.0) — the chrome row that switches between
// named layouts and saves/deletes them. Everything app-specific in the reference was Redux
// lifting (`layouts` keyed by uuid with type-filtering by tradingEnabled; a `Default Market
// Data` string constant) and a bitfinex-trading `Add Component` button that dockview replaces
// (dockview exposes its own add-panel DV UI in Batch H/I). This port keeps the row itself:
// a layout dropdown (Batch A's), then Add / Save / Delete buttons with the reference's
// disabled-state logic (Save only when the layout is dirty, Delete only when the active
// layout allows deletion).
//
// Presentational: `layouts`/`activeLayoutId` in, edit-intent callbacks out. Honba's
// `/profile/layouts` REST persistence is wired by the feature layer (Batch H/I via the
// `useLayoutStore` plan'd in docs/plan.md §3.3).
import clsx from 'clsx';

import { Button } from '../../ui/Button';
import { Dropdown } from '../../ui/Dropdown';
import type { DropdownOption } from '../../ui/Dropdown';
import './LayoutControlToolbar.css';

export interface LayoutSummary {
  id: string;
  label: string;
  /** Only layouts the user owns list a delete affordance (the reference's `canDelete`,
   * which server-persisted default layouts don't have). */
  canDelete?: boolean;
}

export interface LayoutControlToolbarProps {
  layouts: LayoutSummary[];
  /** Which layout is currently active; omit when none exists yet (the reference fell back
   * to its `Default Market Data` placeholder, which became the Dropdown placeholder). */
  activeLayoutId?: string;
  /** True when the active layout has unsaved changes; unlocks Save (the reference's
   * `layoutDirty`). */
  layoutDirty?: boolean;
  onChangeLayout: (layoutId: string) => void;
  onAddLayout?: () => void;
  onSaveLayout?: () => void;
  onDeleteLayout?: () => void;
  className?: string;
}

export function LayoutControlToolbar({
  layouts,
  activeLayoutId,
  layoutDirty = false,
  onChangeLayout,
  onAddLayout,
  onSaveLayout,
  onDeleteLayout,
  className,
}: LayoutControlToolbarProps) {
  const options: DropdownOption[] = layouts.map((layout) => ({
    label: layout.label,
    value: layout.id,
  }));
  const activeLayout = layouts.find((layout) => layout.id === activeLayoutId);

  return (
    <div className={clsx('hb-layout-control-toolbar', className)}>
      <Dropdown
        placeholder="Select layout..."
        value={activeLayoutId ?? ''}
        options={options}
        onChange={onChangeLayout}
        className="hb-layout-control-toolbar__select"
      />
      {onAddLayout ? <Button label="Add layout" onClick={onAddLayout} /> : null}
      {onSaveLayout ? (
        <Button
          label="Save"
          variant={layoutDirty ? 'green' : 'default'}
          disabled={!layoutDirty}
          onClick={onSaveLayout}
          className="hb-layout-control-toolbar__save"
        />
      ) : null}
      {onDeleteLayout ? (
        <Button
          label="Delete"
          disabled={!activeLayout?.canDelete}
          onClick={onDeleteLayout}
          className="hb-layout-control-toolbar__delete"
        />
      ) : null}
    </div>
  );
}

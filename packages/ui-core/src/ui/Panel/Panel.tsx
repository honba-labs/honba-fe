// Ported/modernized from bfx-hf-ui-core's src/ui/Panel (Apache-2.0).
// The original mixes in fullscreen handling, a sidebar-tab system and an internal header-tab
// system backed by `react-fa` icons. honba-fe's Tabs (src/ui/Tabs) already covers the tab-strip
// case as its own primitive, so this port keeps Panel to its presentational core — header
// (label, extra header content, remove/settings/extra icon buttons), scrollable content and an
// optional footer — and drops the Electron-era fullscreen API and bespoke sidebar-tab system.
import type { ReactNode } from 'react';
import { Settings, X } from 'lucide-react';
import clsx from 'clsx';

import { Scrollbars } from '../Scrollbars';
import './Panel.css';

export interface PanelProps {
  label?: ReactNode;
  className?: string;
  children?: ReactNode;
  headerComponents?: ReactNode;
  extraIcons?: ReactNode;
  footer?: ReactNode;
  removeable?: boolean;
  onRemove?: () => void;
  settingsOpen?: boolean;
  onToggleSettings?: () => void;
  darkHeader?: boolean;
  dark?: boolean;
  hasShadow?: boolean;
  closePanel?: () => void;
}

export function Panel({
  label = '',
  className = '',
  children,
  headerComponents,
  extraIcons,
  footer,
  removeable = false,
  onRemove,
  settingsOpen = false,
  onToggleSettings,
  darkHeader = false,
  dark = false,
  hasShadow = false,
  closePanel,
}: PanelProps) {
  return (
    <div className={clsx('hb-panel', className, { 'dark-header': darkHeader, dark, shadow: hasShadow })}>
      <div className={clsx('hb-panel__header')}>
        <div className="hb-panel__left">
          {label && <p className="hb-panel__label">{label}</p>}
          {headerComponents && <div className="hb-panel__header-components">{headerComponents}</div>}
        </div>
        <div className="hb-panel__icons">
          {extraIcons}
          {onToggleSettings && (
            <button
              type="button"
              className={clsx('hb-panel__icon-button', { active: settingsOpen })}
              onClick={onToggleSettings}
              aria-label="Toggle settings"
            >
              <Settings size={16} />
            </button>
          )}
          {removeable && (
            <button
              type="button"
              className="hb-panel__icon-button"
              onClick={onRemove}
              aria-label="Remove panel"
            >
              <X size={16} />
            </button>
          )}
          {closePanel && (
            <button
              type="button"
              className="hb-panel__icon-button"
              onClick={closePanel}
              aria-label="Close panel"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      <Scrollbars className="hb-panel__content">{children}</Scrollbars>
      {footer && <div className="hb-panel__footer">{footer}</div>}
    </div>
  );
}

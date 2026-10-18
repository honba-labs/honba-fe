// Batch G (docs/tasks.md): ported from bfx-hf-ui-core's `AppSettingsModal`
// (src/modals/AppSettingsModal/*, Apache-2.0) — the app's settings dialog, built on
// Batch A's Modal. The reference was a redux-backed, five-tab panel (General / ApiKeys /
// About / Beta / an Electron-only OverrideTimer) whose sections dispatched into a
// server-side settings API. dropped per the brief: ApiKeys (becomes the broker-connection
// Settings form in Batch I, with a real broker-adapter credential shape from
// `honba-adapters`), About/Beta (Bitfinex marketing), OverrideTimer + the
// hide-to-tray/fullscreen checkboxes (Electron-only). What honba has settings for today:
// theme (dark/light, tokens.css is themeable per Design.md) and the status-bar clock format.
// State is caller-owned: `settings` + `onChange(patch)` — persistence (honba's
// `PUT /profile/settings`, Batch H) is the feature layer's job, mirroring `saveSetting`.
//
// The reference's five-tab layout collapses here to a single pane; the tab strip from the
// reference is kept (General) so more honba settings can slot in as batches land.
import { useState } from 'react';

import { Dropdown } from '../../ui/Dropdown';
import { RadioButton } from '../../ui/RadioButton';
import { Modal } from '../../ui/Modal';
import './AppSettingsModal.css';

export type ThemeSetting = 'dark' | 'light';

export interface AppSettings {
  theme: ThemeSetting;
  /** 24h clock (the reference's timestamp-format setting, reduced to honba's two real
   * options — the reference was an editable date-fns format string). */
  clock24h: boolean;
}

export interface AppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  /** Called with the patched subset; the caller owns persistence. */
  onChange: (patch: Partial<AppSettings>) => void;
  className?: string;
}

const THEME_OPTIONS = [
  { label: 'Dark', value: 'dark' },
  { label: 'Light', value: 'light' },
];

export function AppSettingsModal({
  isOpen,
  onClose,
  settings,
  onChange,
  className,
}: AppSettingsModalProps) {
  // Local mirror of the dropdown value so the reference's "change applies on selection"
  // behavior works even while the parent keeps its state until `onChange` lands.
  const [theme, setTheme] = useState<ThemeSetting>(settings.theme);
  // Reset local mirror each open (the reference reset its tab + local theme state on close).
  const [lastOpen, setLastOpen] = useState(false);
  if (isOpen && !lastOpen) {
    setTheme(settings.theme);
    setLastOpen(true);
  } else if (!isOpen && lastOpen) {
    setLastOpen(false);
  }

  return (
    <Modal
      label="App settings"
      isOpen={isOpen}
      onClose={onClose}
      width={640}
      className={`hb-app-settings-modal ${className ?? ''}`}
    >
      <div className="hb-app-settings-modal__setting">
        <p className="hb-app-settings-modal__setting-label">Theme</p>
        <Dropdown
          value={theme}
          options={THEME_OPTIONS}
          onChange={(value) => {
            setTheme(value as ThemeSetting);
            onChange({ theme: value as ThemeSetting });
          }}
          className="hb-app-settings-modal__dropdown"
        />
      </div>
      <div className="hb-app-settings-modal__setting">
        <p className="hb-app-settings-modal__setting-label">Status-bar clock</p>
        <div className="hb-app-settings-modal__radio-row">
          <RadioButton
            id="appsettings-24h"
            label="24-hour"
            checked={settings.clock24h}
            onChange={() => onChange({ clock24h: true })}
          />
          <RadioButton
            id="appsettings-12h"
            label="12-hour"
            checked={!settings.clock24h}
            onChange={() => onChange({ clock24h: false })}
          />
        </div>
      </div>
    </Modal>
  );
}

// Ported/modernized from bfx-hf-ui-core's src/ui/PanelSettings (Apache-2.0).
// i18next strings replaced with plain English (i18n is out of scope for v1, docs/plan.md §4).
import type { ReactNode } from 'react';

import { Button } from '../Button';
import './PanelSettings.css';

export interface PanelSettingsProps {
  title?: ReactNode;
  content: ReactNode;
  onClose?: () => void;
}

export function PanelSettings({ title, content, onClose = () => {} }: PanelSettingsProps) {
  return (
    <div className="hb-panelsettings">
      <p className="hb-panelsettings__header">{title ?? 'Settings'}</p>
      {content && <div className="hb-panelsettings__inner">{content}</div>}
      <div className="hb-panelsettings__footer">
        <Button label="Close" onClick={onClose} />
      </div>
    </div>
  );
}

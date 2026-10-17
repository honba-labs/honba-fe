// Ported/modernized from bfx-hf-ui-core's src/ui/SimpleDropdown (Apache-2.0).
import type { ReactNode } from 'react';
import clsx from 'clsx';

import './SimpleDropdown.css';

export interface SimpleDropdownProps {
  label: ReactNode;
  options: ReactNode[];
  className?: string;
}

export function SimpleDropdown({ label, options, className = '' }: SimpleDropdownProps) {
  return (
    <div className={clsx('hb-simpledropdown', className)}>
      <div className="hb-simpledropdown__label">{label}</div>
      <div className="hb-simpledropdown__separator" />
      <div className="hb-simpledropdown__content">{options}</div>
    </div>
  );
}

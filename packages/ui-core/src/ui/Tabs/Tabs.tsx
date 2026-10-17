// Ported/modernized from bfx-hf-ui-core's src/ui/Tabs (Apache-2.0).
// The original rendered each tab as Bitfinex's own `@ufx-ui/core` Button; replaced with a plain
// button styled with the shared design tokens.
import type { ReactNode } from 'react';
import clsx from 'clsx';

import './Tabs.css';

export interface TabItem<T extends string = string> {
  label: string;
  value: T;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface TabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onTabClick: (value: T) => void;
  className?: string;
}

export function Tabs<T extends string = string>({
  tabs,
  activeTab,
  onTabClick,
  className = '',
}: TabsProps<T>) {
  return (
    <ul className={clsx('hb-tabs', className)} role="tablist">
      {tabs.map(({ label, value, icon, disabled = false }) => (
        <li key={value} role="presentation">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === value}
            disabled={disabled}
            className={clsx('hb-tabs__button', { active: activeTab === value })}
            onClick={() => onTabClick(value)}
          >
            {icon && <span className="hb-tabs__icon">{icon}</span>}
            <span>{label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// Ported/modernized from bfx-hf-ui-core's src/ui/Indicator (Apache-2.0).
import clsx from 'clsx';

import './Indicator.css';

export type IndicatorColor = 'green' | 'red' | 'white' | 'grey';

export interface IndicatorProps {
  color?: IndicatorColor;
  blinking?: boolean;
  className?: string;
}

export function Indicator({ color = 'grey', blinking = false, className }: IndicatorProps) {
  return (
    <span
      className={clsx('hb-indicator', color, className, { blinking })}
      role="status"
      aria-label={`${color} indicator`}
    />
  );
}

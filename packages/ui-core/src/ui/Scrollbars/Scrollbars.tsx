// Ported/modernized from bfx-hf-ui-core's src/ui/Scrollbars (Apache-2.0).
// The original wrapped `react-perfect-scrollbar`; this is a dependency-free replacement that
// relies on native overflow scrolling styled with the shared design tokens (see Scrollbars.css).
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

import './Scrollbars.css';

export interface ScrollbarsProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}

export function Scrollbars({ children, style, className = '', ...rest }: ScrollbarsProps) {
  return (
    <div className={clsx('hb-scrollbars', className)} style={style} {...rest}>
      {children}
    </div>
  );
}

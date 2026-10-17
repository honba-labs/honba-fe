// Ported/modernized from bfx-hf-ui-core's src/ui/AttentionBar (Apache-2.0).
import type { ReactNode } from 'react';
import clsx from 'clsx';

import './AttentionBar.css';

export type AttentionBarTone = 'red' | 'green' | 'yellow';

export interface AttentionBarProps {
  children: ReactNode;
  tone?: AttentionBarTone;
  className?: string;
}

export function AttentionBar({ children, tone = 'red', className = '' }: AttentionBarProps) {
  return <div className={clsx('hb-attention-bar', tone, className)}>{children}</div>;
}

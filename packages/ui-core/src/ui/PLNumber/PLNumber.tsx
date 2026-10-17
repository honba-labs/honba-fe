// Ported/modernized from bfx-hf-ui-core's src/ui/PLNumber (Apache-2.0).
// The original colored the number from an `isGreen` prop and compared `value` against the
// previous render's value (via `@ufx-ui/core`'s `usePrevious`, a package not ported) to pick the
// arrow direction. This version derives both the color and the arrow straight from the sign of
// `value`, which is the natural "P&L number" semantics for a trading UI (positive = bullish/green
// with an up arrow, negative = bearish/red with a down arrow) and needs no extra dependency.
import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import clsx from 'clsx';

import './PLNumber.css';

export interface PLNumberProps {
  value: number;
  ccy?: string;
  prepareFunc?: (value: number) => ReactNode;
}

export function PLNumber({ value, ccy = '', prepareFunc }: PLNumberProps) {
  const isNegative = value < 0;
  const text = prepareFunc ? prepareFunc(value) : value;

  return (
    <span className={clsx('hb-pl-number', isNegative ? 'negative' : 'positive')}>
      {isNegative ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
      <span className="hb-pl-number__text">
        {text}
        {ccy ? ` ${ccy}` : ''}
      </span>
    </span>
  );
}

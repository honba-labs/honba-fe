// Ported/modernized from bfx-hf-ui-core's src/components/OrderBookPanel (Apache-2.0). The
// original wires `OrderBook` + `ui/Panel` + `ui/PanelSettings` + `MarketSelect` to Redux
// (`useSelector`/`useCommonBfxData`/`useWidgetMarket`) for live WS book data, per-widget saved
// settings (`sumAmounts`/`stackedView`), and channel (re)subscription on market change — none of
// which belongs in `ui-core` (see docs/tasks.md Batch C and Shared conventions: presentational,
// props-in, no backend calls, no Redux). This keeps only the presentational shell: `Panel` +
// `OrderBook`, with market selection and settings left as slots the consuming `apps/web` feature
// fills in (`headerComponents`, `extraIcons`) rather than components baked in here.
import type { ReactNode } from 'react';

import { Panel } from '../../ui/Panel';
import { OrderBook } from '../OrderBook';
import type { OrderBookProps } from '../OrderBook';

export interface OrderBookPanelProps extends OrderBookProps {
  label?: ReactNode;
  /** Slot for a market/instrument selector in the panel header (e.g. `MarketSelect`). */
  headerComponents?: ReactNode;
  /** Slot for extra header icon buttons (e.g. a settings toggle). */
  extraIcons?: ReactNode;
  removeable?: boolean;
  onRemove?: () => void;
  panelClassName?: string;
}

export function OrderBookPanel({
  label = 'Order Book',
  headerComponents,
  extraIcons,
  removeable = false,
  onRemove,
  panelClassName,
  ...orderBookProps
}: OrderBookPanelProps) {
  return (
    <Panel
      label={label}
      headerComponents={headerComponents}
      extraIcons={extraIcons}
      removeable={removeable}
      onRemove={onRemove}
      className={panelClassName}
    >
      <OrderBook {...orderBookProps} />
    </Panel>
  );
}

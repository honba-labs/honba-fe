// Ported/modernized from bfx-hf-ui-core's `AtomicOrdersTablePanel` and `OrderHistory`'s own
// `Panel` wrapper (Apache-2.0); also covers the intent of `AlgoOrdersTablePanel` (see
// `../OrdersTable/OrdersTable.tsx`'s header comment for why there is no separate "algo" table).
// The originals wire a Redux-backed `savedState`/`updateState` table-state pair and i18n
// straight into `Panel` + their table component. This keeps only the presentational shell —
// `Panel` + `OrdersTable` — with market/filter selection left as a header slot
// (`headerComponents`/`extraIcons`, same convention as `market/OrderBookPanel`) rather than
// baked in here. This package does no fetching/Redux/WS (see Shared conventions).
import type { ReactNode } from 'react';

import { Panel } from '../../ui/Panel';
import { OrdersTable } from '../OrdersTable';
import type { OrdersTableProps } from '../OrdersTable';

export interface OrdersTablePanelProps extends OrdersTableProps {
  label?: ReactNode;
  /** Slot for header controls (e.g. an open/history toggle, a market filter). */
  headerComponents?: ReactNode;
  /** Slot for extra header icon buttons. */
  extraIcons?: ReactNode;
  removeable?: boolean;
  onRemove?: () => void;
  panelClassName?: string;
}

export function OrdersTablePanel({
  label = 'Orders',
  headerComponents,
  extraIcons,
  removeable = false,
  onRemove,
  panelClassName,
  ...ordersTableProps
}: OrdersTablePanelProps) {
  return (
    <Panel
      label={label}
      headerComponents={headerComponents}
      extraIcons={extraIcons}
      removeable={removeable}
      onRemove={onRemove}
      className={panelClassName}
    >
      <OrdersTable {...ordersTableProps} />
    </Panel>
  );
}

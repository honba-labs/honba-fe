// Ported/modernized from bfx-hf-ui-core's `BalancesTablePanel` (Apache-2.0). The original wires
// a `hideZeroBalances` checkbox and i18n straight into `Panel` + `BalancesTable`. This keeps only
// the presentational shell -- `Panel` + `BalancesTable` -- with any such filter left as a header
// slot (`headerComponents`/`extraIcons`, same convention as `OrdersTablePanel`/
// `PositionsTablePanel`) rather than baked in here. This package does no fetching/Redux/WS (see
// Shared conventions).
import type { ReactNode } from 'react';

import { Panel } from '../../ui/Panel';
import { BalancesTable } from '../BalancesTable';
import type { BalancesTableProps } from '../BalancesTable';

export interface BalancesTablePanelProps extends BalancesTableProps {
  label?: ReactNode;
  /** Slot for header controls. */
  headerComponents?: ReactNode;
  /** Slot for extra header icon buttons. */
  extraIcons?: ReactNode;
  removeable?: boolean;
  onRemove?: () => void;
  panelClassName?: string;
}

export function BalancesTablePanel({
  label = 'Balances',
  headerComponents,
  extraIcons,
  removeable = false,
  onRemove,
  panelClassName,
  ...balancesTableProps
}: BalancesTablePanelProps) {
  return (
    <Panel
      label={label}
      headerComponents={headerComponents}
      extraIcons={extraIcons}
      removeable={removeable}
      onRemove={onRemove}
      className={panelClassName}
    >
      <BalancesTable {...balancesTableProps} />
    </Panel>
  );
}

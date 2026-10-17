// Ported/modernized from bfx-hf-ui-core's `PositionsTablePanel` (Apache-2.0). The original wires
// a Redux-backed `setClosePositionModal` dispatch and i18n straight into `Panel` +
// `PositionsTable`. This keeps only the presentational shell -- `Panel` + `PositionsTable` --
// with market/filter selection left as a header slot (`headerComponents`/`extraIcons`, same
// convention as `OrdersTablePanel`) rather than baked in here. This package does no
// fetching/Redux/WS (see Shared conventions).
import type { ReactNode } from 'react';

import { Panel } from '../../ui/Panel';
import { PositionsTable } from '../PositionsTable';
import type { PositionsTableProps } from '../PositionsTable';

export interface PositionsTablePanelProps extends PositionsTableProps {
  label?: ReactNode;
  /** Slot for header controls (e.g. a market filter). */
  headerComponents?: ReactNode;
  /** Slot for extra header icon buttons. */
  extraIcons?: ReactNode;
  removeable?: boolean;
  onRemove?: () => void;
  panelClassName?: string;
}

export function PositionsTablePanel({
  label = 'Positions',
  headerComponents,
  extraIcons,
  removeable = false,
  onRemove,
  panelClassName,
  ...positionsTableProps
}: PositionsTablePanelProps) {
  return (
    <Panel
      label={label}
      headerComponents={headerComponents}
      extraIcons={extraIcons}
      removeable={removeable}
      onRemove={onRemove}
      className={panelClassName}
    >
      <PositionsTable {...positionsTableProps} />
    </Panel>
  );
}

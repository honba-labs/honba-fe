import type { ReactNode } from 'react';
import { Panel } from '@honba/ui-core';
import './demo-tile.css';

/**
 * Frame for one component's live demo on the dashboard: a `ui-core` `Panel` carrying the
 * component's name and the `ui-core` source path it is exported from, with the live component
 * inside. `wide` tiles span the full dashboard row (charts, tables).
 */
export function DemoTile({
  name,
  source,
  description,
  wide = false,
  pad = true,
  children,
}: {
  name: string;
  source: string;
  description?: ReactNode;
  wide?: boolean;
  pad?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={wide ? 'demo-tile demo-tile--wide' : 'demo-tile'}>
      <Panel
        label={<span className="demo-tile__name">{name}</span>}
        headerComponents={
          <code className="demo-tile__source" title={`@honba/ui-core — ${source}`}>
            {source}
          </code>
        }
        footer={description ? <span className="demo-tile__description">{description}</span> : null}
      >
        <div className={pad ? 'demo-tile__body' : 'demo-tile__body demo-tile__body--flush'}>
          {children}
        </div>
      </Panel>
    </div>
  );
}

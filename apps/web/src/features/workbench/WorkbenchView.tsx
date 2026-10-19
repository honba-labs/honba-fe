import React, { useEffect, useMemo } from 'react';
import { themeEngine } from '../../core/theme-engine';
import { HonbaClient } from '../../core/api/generated/client';
import { useWorkbenchStore } from '../../core/workbench/store';
import { WorkbenchToolbar } from './workbench-toolbar';
import { MultiChartGrid } from './multi-chart-grid';
import { OrderTicket } from './order-ticket';
import { OrderModal } from './order-modal';
import { TradingDrawer } from './trading-drawer';
import './WorkbenchView.css';

export function WorkbenchView() {
  const client = useMemo(() => new HonbaClient({}), []);
  const { fetchState, isOrderTicketOpen } = useWorkbenchStore();

  useEffect(() => {
    themeEngine.applyToDOM();
    void fetchState(client);
  }, [client, fetchState]);

  return (
    <div className="workbench-view-root">
      <div className="workbench-terminal-area">
        <WorkbenchToolbar client={client} />

        <div className="workbench-charts-container">
          <MultiChartGrid />
          {isOrderTicketOpen && <OrderTicket client={client} />}
        </div>

        <TradingDrawer client={client} />
        <OrderModal client={client} />
      </div>
    </div>
  );
}

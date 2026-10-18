// The Workbench route (Batch I slices 2–3): the page is now a thin route wrapper — the panels
// live in WorkbenchWorkspace's dockview host, the header still reports the shared gateway's
// connection status so the Batch H e2e proof text keeps its home.
import { useConnectionStore } from '../../core/store/connection';
import { WorkbenchWorkspace } from './WorkbenchWorkspace';
import './WorkbenchPage.css';

const CONN_LABELS: Record<string, string> = {
  idle: 'Idle',
  connecting: 'Connecting…',
  live: 'Live',
  reconnecting: 'Reconnecting…',
  failed: 'Data feed failed',
};

export function WorkbenchPage() {
  const status = useConnectionStore((state) => state.status);

  return (
    <div className="workbench">
      <header className="workbench__header">
        <h2>Workbench</h2>
        <p className="workbench__conn" data-status={status}>
          {CONN_LABELS[status]} — depth streamed from <code>/depth/&#123;id&#125;</code> via the
          LiveSocket gateway
        </p>
      </header>
      <WorkbenchWorkspace />
    </div>
  );
}

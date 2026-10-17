// Ported/modernized from bfx-hf-ui-core's src/components/StatusBar (Apache-2.0). The original
// reads Bitfinex-specific connection state directly from Redux/config (`wsConnected`,
// `apiClientConnected`/`apiClientConnecting`/`apiClientDisconnected`, `currentModeApiKeyState`,
// `isElectronApp`, an app-update banner) and dispatches actions to open settings — none of which
// applies to a honba-fe browser app with its own `/ws` connection (see docs/tasks.md Batch C and
// Shared conventions: props-in, no global connection singleton, no Electron chrome). This keeps
// the same "status dot + connection text" idea, fed by `connected`/`latencyMs`/`serverTime`
// props instead, and adds a live clock readout (`serverTime`) in place of the Electron-only
// app-version/update row.
import clsx from 'clsx';

import { Indicator } from '../../ui/Indicator';
import './StatusBar.css';

export interface StatusBarProps {
  connected: boolean;
  /** Round-trip latency to the server, in milliseconds. */
  latencyMs?: number;
  /** Server-synced clock to display; omit to hide the clock readout. */
  serverTime?: Date;
  className?: string;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour12: false });
}

export function StatusBar({ connected, latencyMs, serverTime, className }: StatusBarProps) {
  return (
    <div className={clsx('hb-status-bar', className)}>
      <div className="hb-status-bar__item">
        <Indicator color={connected ? 'green' : 'red'} />
        <span>{connected ? 'Connected' : 'Disconnected'}</span>
      </div>
      {latencyMs !== undefined && (
        <div className="hb-status-bar__item">
          <span className="hb-status-bar__label">Latency</span>
          <span>{Math.round(latencyMs)} ms</span>
        </div>
      )}
      {serverTime !== undefined && (
        <div className="hb-status-bar__item hb-status-bar__clock">
          <span>{formatTime(serverTime)}</span>
        </div>
      )}
    </div>
  );
}

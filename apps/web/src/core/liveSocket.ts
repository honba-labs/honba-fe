// Batch H (docs/tasks.md): the app-wide LiveSocket singleton. One shared gateway for the whole
// app (the bfx-hf-ui-core "one auth'd WS" model, adapted to honba's inspected contract —
// polling transport today, see plan.md §3.4). Status transitions feed `useConnectionStore`
// here so the shell topbar + status bar always agree with whatever the workbench subscribes.
import { LiveSocket } from './ws/socket';
import { getApiClient, setApiClient } from './api/query';
import { useConnectionStore } from './store/connection';

let instance: LiveSocket | undefined;

/** The app's gateway. Created lazily (no pollers until the first subscription). */
export function getLiveSocket(): LiveSocket {
  if (!instance) {
    instance = new LiveSocket({ client: getApiClient() });
    instance.onStatus((status) => useConnectionStore.getState().setStatus(status));
  }
  return instance;
}

/** Test/injection seam — also closes any previous instance's pollers. */
export function setLiveSocket(socket: LiveSocket | undefined): void {
  instance?.close();
  instance = socket;
  if (socket) {
    socket.onStatus((status) => useConnectionStore.getState().setStatus(status));
  }
}

/** Test isolation helper. */
export function resetLiveSocket(): void {
  setLiveSocket(undefined);
  setApiClient(undefined);
  useConnectionStore.getState().reset();
}

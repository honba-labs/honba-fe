// Batch H (docs/tasks.md): the shared live-data gateway. The brief's `core/ws/socket.ts` +
// `channels.ts` become one folder: `channels.ts` (this file's channel contract) is merged into
// `socket.ts` because the channel *keys* and the transport's fetch behavior are the same unit of
// design — the inspected server contract (see plan.md §3.4's inspection result) has NO
// WebSocket route: the only stream is SSE backtest replay, and honba-frontend (the parity
// target) confirms it by polling `/api/v1/instruments` every 18s as its fallback.
//
// So this gateway is transport-agnostic *by construction*: `LiveSocket` owns one shared
// connection-equivalent (ref-counted channel subscriptions → one poller per channel key), and
// the default transport polls the REST endpoints the running `honba serve` actually serves
// (`GET /quotes`, `GET /depth/{id}` via the typed `core/api/client`). When honba grows a real
// `/ws` (honba-frontend's `/ws/market` tick shape is the precedent), the fetch calls here are
// the only place that changes — the channel contract, ref-counting, status machine, and
// downstream store wiring do not move.
//
// Status machine mirrors honba-frontend's policy: connecting → live on first success,
// reconnecting on any failure while subscribed, and `failed` (stop polling) after
// `failureThreshold` consecutive failures so a REST-only-but-broken backend isn't hammered.
import type { ApiClient } from '../api/client';
import type { DepthResponse, InstrumentId, QuoteTick } from '../types/messages';

/** A live channel: what to watch. Depth streams the book; quotes streams top-of-book. */
export type LiveChannel =
  | { kind: 'quotes'; instrument: InstrumentId }
  | { kind: 'depth'; instrument: InstrumentId };

/** Canonical channel key (`kind:exchange:symbol`) — one poller per key. */
export function channelKey(channel: LiveChannel): string {
  return `${channel.kind}:${channel.instrument.exchange}:${channel.instrument.symbol}`;
}

/** The payload each channel kind delivers. */
export type LiveChannelUpdate<K extends LiveChannel['kind'] = LiveChannel['kind']> = {
  quotes: { kind: 'quotes'; payload: QuoteTick };
  depth: { kind: 'depth'; payload: DepthResponse };
}[K];

export type LiveChannelHandler<K extends LiveChannel['kind']> = (
  update: LiveChannelUpdate<K>,
) => void;

export type LiveStatus = 'idle' | 'connecting' | 'live' | 'reconnecting' | 'failed';

export interface LiveSocketOptions {
  /** The REST transport (polling today; a WebSocket adapter would satisfy the same shape). */
  client: ApiClient;
  /** Poll cadence for quotes channels (ms). */
  quoteIntervalMs?: number;
  /** Poll cadence for depth channels (ms) — books move faster than tops. */
  depthIntervalMs?: number;
  /** Consecutive failures before giving up (`failed`; 0 = never give up). */
  failureThreshold?: number;
}

interface Subscription {
  handler: (kind: string, payload: unknown) => void;
}

interface Poller {
  timer: ReturnType<typeof setInterval> | undefined;
  failures: number;
  everSucceeded: boolean;
}

export class LiveSocket {
  private readonly client: ApiClient;
  private readonly quoteIntervalMs: number;
  private readonly depthIntervalMs: number;
  private readonly failureThreshold: number;
  private readonly subscriptions = new Map<string, Set<Subscription>>();
  private readonly pollers = new Map<string, Poller>();
  private readonly statusListeners = new Set<(status: LiveStatus) => void>();
  private status: LiveStatus = 'idle';
  private closed = false;

  constructor(options: LiveSocketOptions) {
    this.client = options.client;
    this.quoteIntervalMs = options.quoteIntervalMs ?? 1000;
    this.depthIntervalMs = options.depthIntervalMs ?? 500;
    this.failureThreshold = options.failureThreshold ?? 5;
  }

  /** Current connection status (also delivered via onStatus). */
  getStatus(): LiveStatus {
    return this.status;
  }

  /**
   * Subscribes to status transitions (delivering subsequent changes only — read `getStatus`
   * for the current value). Returns an unsubscribe function.
   */
  onStatus(listener: (status: LiveStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  /**
   * Subscribes a handler to a channel. Ref-counted: many handlers may share one poller. The
   * first fetch happens immediately (fresh data before the first interval tick). Returns the
   * unsubscribe function; when the last handler on a key unsubscribes, its poller stops.
   */
  subscribe<K extends LiveChannel['kind']>(
    channel: LiveChannel & { kind: K },
    handler: LiveChannelHandler<K>,
  ): () => void {
    const key = channelKey(channel);
    let handlers = this.subscriptions.get(key);
    if (!handlers) {
      handlers = new Set();
      this.subscriptions.set(key, handlers);
    }
    const subscription: Subscription = {
      handler: (kind, payload) => {
        (handler as (update: LiveChannelUpdate) => void)({ kind, payload } as LiveChannelUpdate);
      },
    };
    handlers.add(subscription);

    if (!this.pollers.has(key)) {
      this.pollers.set(key, { timer: undefined, failures: 0, everSucceeded: false });
      this.startPoller(key, channel);
    }

    return () => {
      const current = this.subscriptions.get(key);
      if (!current) return;
      current.delete(subscription);
      if (current.size === 0) {
        this.stopPoller(key);
        this.subscriptions.delete(key);
      }
    };
  }

  /** Stops every poller and drops all subscriptions (the "connection closed"). */
  close(): void {
    this.closed = true;
    for (const key of [...this.pollers.keys()]) {
      this.stopPoller(key);
    }
    this.pollers.clear();
    this.subscriptions.clear();
    // Emit idle while listeners can still see it, then drop them.
    this.setStatus('idle');
    this.statusListeners.clear();
  }

  private setStatus(next: LiveStatus): void {
    if (this.status === next) return;
    this.status = next;
    for (const listener of [...this.statusListeners]) {
      listener(next);
    }
  }

  private startPoller(key: string, channel: LiveChannel): void {
    const poller = this.pollers.get(key)!;
    if (this.status === 'idle' && !this.closed) {
      this.setStatus('connecting');
    }
    const intervalMs = channel.kind === 'quotes' ? this.quoteIntervalMs : this.depthIntervalMs;
    const tick = () => {
      void this.pollOnce(key, channel);
    };
    tick();
    poller.timer = setInterval(tick, intervalMs);
  }

  private stopPoller(key: string): void {
    const poller = this.pollers.get(key);
    if (poller?.timer !== undefined) {
      clearInterval(poller.timer);
    }
  }

  private async pollOnce(key: string, channel: LiveChannel): Promise<void> {
    const poller = this.pollers.get(key);
    if (!poller || this.closed) return;

    try {
      const raw = channel.kind === 'quotes'
        ? (await this.client.getQuotes({ symbols: channel.instrument.symbol })).quotes[0]
        : await this.client.getDepth(channel.instrument);

      if (this.closed) return;
      poller.failures = 0;
      poller.everSucceeded = true;
      this.setStatus('live');
      // An empty quotes answer (e.g. market closed, no tick yet) is a success with nothing
      // to deliver — not a failure.
      if (raw !== undefined) {
        this.deliver(key, channel.kind, raw);
      }
    } catch {
      if (this.closed) return;
      poller.failures += 1;
      this.setStatus('reconnecting');
      if (this.failureThreshold > 0 && poller.failures >= this.failureThreshold) {
        this.setStatus('failed');
        this.stopPoller(key);
      }
    }
  }

  private deliver(key: string, kind: string, payload: unknown): void {
    const handlers = this.subscriptions.get(key);
    if (!handlers) return;
    for (const subscription of [...handlers]) {
      subscription.handler(kind, payload);
    }
  }
}

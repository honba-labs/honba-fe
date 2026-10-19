import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { channelKey, LiveSocket } from './socket';
import type { LiveChannel, LiveStatus } from './socket';
import type { DepthResponse, QuoteTick } from '../types/messages';

const RELIANCE = { exchange: 'NSE', symbol: 'RELIANCE' };

const tick: QuoteTick = {
  instrument_id: RELIANCE,
  bid_price: 2980,
  bid_size: 50,
  ask_price: 2980.5,
  ask_size: 75,
  ts_event: { iso: '2026-10-18T09:15:00Z', unix_nanos: '1' },
  ts_init: { iso: '2026-10-18T09:15:00Z', unix_nanos: '1' },
};

const depth: DepthResponse = {
  bids: [{ price: 2980, qty: 50 }],
  asks: [{ price: 2980.5, qty: 75 }],
};

function fakeClient(overrides: Partial<Record<'getQuotes' | 'getDepth', ReturnType<typeof vi.fn>>> = {}) {
  return {
    getQuotes: overrides.getQuotes ?? vi.fn().mockResolvedValue({ quotes: [tick] }),
    getDepth: overrides.getDepth ?? vi.fn().mockResolvedValue(depth),
  } as unknown as { getQuotes: ReturnType<typeof vi.fn>; getDepth: ReturnType<typeof vi.fn> } & Record<string, unknown>;
}

describe('channelKey', () => {
  it('names channels kind:exchange:symbol so one map holds every subscription', () => {
    const quotes: LiveChannel = { kind: 'quotes', instrument: RELIANCE };
    const depthChannel: LiveChannel = { kind: 'depth', instrument: RELIANCE };
    expect(channelKey(quotes)).toBe('quotes:NSE:RELIANCE');
    expect(channelKey(depthChannel)).toBe('depth:NSE:RELIANCE');
  });
});

describe('LiveSocket (polling transport)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetches a subscribed channel immediately, then on its interval', async () => {
    const client = fakeClient();
    const socket = new LiveSocket({ client: client as never, quoteIntervalMs: 1000 });
    const handler = vi.fn();
    socket.subscribe({ kind: 'quotes', instrument: RELIANCE }, (update) => {
      // Handlers receive the payload the transport fetched.
      expect(update.kind).toBe('quotes');
      handler(update.payload);
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(tick);
    expect(client.getQuotes).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(handler).toHaveBeenCalledTimes(2);
    expect(client.getQuotes).toHaveBeenCalledTimes(2);
    socket.close();
  });

  it('ref-counts handlers on the same channel key — one poller, many listeners', async () => {
    const client = fakeClient();
    const socket = new LiveSocket({ client: client as never, depthIntervalMs: 500 });
    const a = vi.fn();
    const b = vi.fn();
    const unsubA = socket.subscribe({ kind: 'depth', instrument: RELIANCE }, (u) => a(u.payload));
    const unsubB = socket.subscribe({ kind: 'depth', instrument: RELIANCE }, (u) => b(u.payload));

    await vi.advanceTimersByTimeAsync(0);
    expect(client.getDepth).toHaveBeenCalledTimes(1);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);

    unsubA();
    await vi.advanceTimersByTimeAsync(500);
    // Still polling (b remains), and b still receives updates.
    expect(b).toHaveBeenCalledTimes(2);

    unsubB();
    const pollCount = (client.getDepth as ReturnType<typeof vi.fn>).mock.calls.length;
    await vi.advanceTimersByTimeAsync(2000);
    // The poller stopped once the last listener left: no further calls.
    expect((client.getDepth as ReturnType<typeof vi.fn>).mock.calls.length).toBe(pollCount);
    socket.close();
  });

  it('reports connecting → live on first success', async () => {
    const client = fakeClient();
    const socket = new LiveSocket({ client: client as never });
    const statuses: LiveStatus[] = [];
    socket.onStatus((status) => statuses.push(status));

    socket.subscribe({ kind: 'quotes', instrument: RELIANCE }, () => {});
    await vi.advanceTimersByTimeAsync(0);
    expect(statuses).toEqual(['connecting', 'live']);
    socket.close();
  });

  it('moves to reconnecting on failure, failed after the threshold, and stops hammering', async () => {
    const client = fakeClient({
      getQuotes: vi.fn().mockRejectedValue(new Error('boom')),
    });
    const socket = new LiveSocket({
      client: client as never,
      quoteIntervalMs: 1000,
      failureThreshold: 3,
    });
    const statuses: LiveStatus[] = [];
    socket.onStatus((status) => statuses.push(status));
    socket.subscribe({ kind: 'quotes', instrument: RELIANCE }, () => {});

    await vi.advanceTimersByTimeAsync(5000);
    expect(statuses[0]).toBe('connecting');
    expect(statuses[1]).toBe('reconnecting');
    expect(statuses.at(-1)).toBe('failed');
    const calls = (client.getQuotes as ReturnType<typeof vi.fn>).mock.calls.length;
    await vi.advanceTimersByTimeAsync(10_000);
    expect((client.getQuotes as ReturnType<typeof vi.fn>).mock.calls.length).toBe(calls);
    socket.close();
  });

  it('resumes polling after a transient failure (success resets the failure counter)', async () => {
    let fail = true;
    const client = fakeClient({
      getQuotes: vi.fn().mockImplementation(async () => {
        if (fail) throw new Error('still down');
        return { quotes: [tick] };
      }),
    });
    const socket = new LiveSocket({ client: client as never, quoteIntervalMs: 1000, failureThreshold: 5 });
    const handler = vi.fn();
    socket.subscribe({ kind: 'quotes', instrument: RELIANCE }, () => handler());

    await vi.advanceTimersByTimeAsync(0);
    fail = false;
    await vi.advanceTimersByTimeAsync(1000);
    expect(handler).toHaveBeenCalledTimes(1);
    socket.close();
  });

  it('close() unsubscribes everything and reports idle', async () => {
    const client = fakeClient();
    const socket = new LiveSocket({ client: client as never });
    const statuses: LiveStatus[] = [];
    socket.onStatus((s) => statuses.push(s));
    socket.subscribe({ kind: 'quotes', instrument: RELIANCE }, () => {});
    await vi.advanceTimersByTimeAsync(0);
    socket.close();
    expect(statuses.at(-1)).toBe('idle');
  });
});

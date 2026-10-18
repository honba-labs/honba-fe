import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApiClient, HonbaApiError } from './client';

// Envelope contract (honba-kokoro-messages/src/api.rs):
// { api_version: "1.0.0", schema_version: 4, data: <payload> | absent, error: ... | absent }
function envelope(data: unknown) {
  return { api_version: '1.0.0', schema_version: 4, data, error: null };
}

const SAMPLE_QUOTE = {
  instrument_id: { exchange: 'NSE', symbol: 'RELIANCE' },
  bid_price: 2980.0,
  bid_size: 50,
  ask_price: 2980.5,
  ask_size: 75,
  ts_event: { iso: '2026-10-18T09:15:00Z', unix_nanos: '1' },
  ts_init: { iso: '2026-10-18T09:15:00Z', unix_nanos: '1' },
};

const SAMPLE_INSTRUMENT = {
  id: { exchange: 'NSE', symbol: 'RELIANCE' },
  kind: 'equity',
  currency: 'INR',
  lot_size: 1,
  tick_size: 0.05,
};

const SAMPLE_ORDER = {
  order_id: 'ORD-1',
  instrument_id: { exchange: 'NSE', symbol: 'RELIANCE' },
  side: 'buy',
  order_type: 'limit',
  status: 'submitted',
  quantity: 10,
  time_in_force: 'day',
  ts_event: { iso: '2026-10-18T09:15:00Z', unix_nanos: '1' },
  ts_init: { iso: '2026-10-18T09:15:00Z', unix_nanos: '1' },
  cancel_requested: false,
  price: 2980,
};

const SAMPLE_POSITION = {
  instrument_id: { exchange: 'NSE', symbol: 'RELIANCE' },
  side: 'long',
  quantity: 350,
  avg_price: 2961.2,
  mark: 2985.55,
  market_value: { amount: 104494250, currency: 'INR' },
  realized_pnl: { amount: 1245000, currency: 'INR' },
  unrealized_pnl: { amount: 8522500, currency: 'INR' },
  product: 'intraday',
};

const SAMPLE_TRADE = {
  order_id: 'ORD-1',
  instrument_id: { exchange: 'NSE', symbol: 'RELIANCE' },
  side: 'buy',
  quantity: 10,
  price: 2980,
  costs: { amount: 20, currency: 'INR' },
  ts_event: { iso: '2026-10-18T09:15:01Z', unix_nanos: '2' },
  ts_init: { iso: '2026-10-18T09:15:01Z', unix_nanos: '2' },
};

const SAMPLE_LAYOUT = { version: 1, grid: {} };

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// Unit tests: fetch is stubbed wholesale so no server round-trip is needed; URL/query building
// is asserted from the recorded (url, init) args.
let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchSpy = vi.fn();
});

function freshClient() {
  return createApiClient({ baseUrl: '/api', fetchImpl: fetchSpy as unknown as typeof fetch });
}

interface RecordedRequest {
  url: string;
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

function requestAt(index: number): RecordedRequest {
  const [url, init] = fetchSpy.mock.calls[index];
  return {
    url: String(url),
    method: init?.method as string | undefined,
    body: init?.body === undefined ? undefined : JSON.parse(init.body as string),
    headers: init?.headers as Record<string, string> | undefined,
  };
}

describe('createApiClient', () => {
  describe('envelope handling', () => {
    it('unwraps an enveloped success payload', async () => {
      fetchSpy.mockResolvedValue(jsonResponse(200, envelope({ quotes: [SAMPLE_QUOTE] })));
      const quotes = await freshClient().getQuotes({ symbols: 'RELIANCE' });
      expect(quotes.quotes).toEqual([SAMPLE_QUOTE]);
      expect(requestAt(0).method).toBe('GET');
      expect(requestAt(0).url).toContain('/api/quotes');
    });

    it('throws HonbaApiError carrying ErrorDetail when the error envelope returns', async () => {
      const detail = {
        code: 'market_data_unavailable',
        message: 'no depth source for NSE:RELIANCE',
        retryable: true,
      };
      fetchSpy.mockResolvedValue(jsonResponse(404, {
        api_version: '1.0.0',
        schema_version: 4,
        error: detail,
      }));
      const client = freshClient();
      await expect(client.getDepth({ exchange: 'NSE', symbol: 'RELIANCE' })).rejects.toMatchObject({
        name: 'HonbaApiError',
        code: 'market_data_unavailable',
        message: 'no depth source for NSE:RELIANCE',
        retryable: true,
        expectedStatus: 404,
      });
      await expect(
        client.getDepth({ exchange: 'NSE', symbol: 'RELIANCE' }),
      ).rejects.toBeInstanceOf(HonbaApiError);
    });

    it('rejects an envelope written by an unknown api major version', async () => {
      fetchSpy.mockResolvedValue(jsonResponse(200, { api_version: '2.0.0', schema_version: 4, data: [] }));
      await expect(freshClient().getQuotes({ symbols: 'X' })).rejects.toMatchObject({
        name: 'HonbaApiError',
        code: 'unsupported',
        message: expect.stringContaining('api_version'),
        expectedStatus: 200,
      });
    });
    it('rejects non-JSON (envelope-less) gateway responses instead of passing them through', async () => {
      fetchSpy.mockResolvedValue(new Response('<html>proxy error</html>', {
        status: 502,
        headers: { 'content-type': 'text/html' },
      }));
      await expect(freshClient().getQuotes({ symbols: 'X' })).rejects.toMatchObject({
        name: 'HonbaApiError',
        code: 'internal_error',
        message: expect.stringContaining('non-JSON'),
        expectedStatus: 502,
      });
    });

    it('maps a network failure to a retryable transport_error', async () => {
      fetchSpy.mockRejectedValue(new TypeError('network down'));
      await expect(freshClient().getQuotes({ symbols: 'X' })).rejects.toMatchObject({
        name: 'HonbaApiError',
        code: 'transport_error',
        retryable: true,
        expectedStatus: undefined,
      });
    });

    it('rejects a data+error envelope outright', async () => {
      fetchSpy.mockResolvedValue(jsonResponse(200, {
        api_version: '1.0.0',
        schema_version: 4,
        data: [SAMPLE_QUOTE],
        error: { code: 'internal_error', message: 'both?!', retryable: false },
      }));
      await expect(freshClient().getQuotes({ symbols: 'X' })).rejects.toMatchObject({
        name: 'HonbaApiError',
        code: 'internal_error',
        message: expect.stringContaining('both data and error'),
      });
    });
  });

  describe('resources', () => {
    it('getInstruments unwraps the instruments array and honors the filters', async () => {
      fetchSpy.mockResolvedValue(jsonResponse(200, envelope({ instruments: [SAMPLE_INSTRUMENT] })));
      expect((await freshClient().getInstruments()).instruments).toEqual([SAMPLE_INSTRUMENT]);
      expect(new URL(requestAt(0).url).pathname).toBe('/api/instruments');

      fetchSpy.mockResolvedValue(jsonResponse(200, envelope([])));
      await freshClient().getInstruments({ exchange: 'NSE', symbol: 'TCS' });
      const url = new URL(requestAt(1).url);
      expect(url.pathname).toBe('/api/instruments');
      expect(url.searchParams.get('exchange')).toBe('NSE');
      expect(url.searchParams.get('symbol')).toBe('TCS');
    });

    it('getQuotes encodes symbols comma-separated', async () => {
      fetchSpy.mockResolvedValue(jsonResponse(200, envelope([SAMPLE_QUOTE])));
      await freshClient().getQuotes({ symbols: 'RELIANCE,TCS' });
      const url = new URL(requestAt(0).url);
      expect(url.pathname).toBe('/api/quotes');
      expect(url.searchParams.get('symbols')).toBe('RELIANCE,TCS');
    });

    it('getDepth uses the SYMBOL.EXCHANGE path id and the depth query param', async () => {
      fetchSpy.mockResolvedValue(jsonResponse(200, envelope({
        bids: [], asks: [],
      })));
      await freshClient().getDepth({ exchange: 'NSE', symbol: 'RELIANCE' }, { depth: 5 });
      const url = new URL(requestAt(0).url);
      expect(url.pathname).toBe('/api/depth/RELIANCE.NSE');
      expect(url.searchParams.get('depth')).toBe('5');
    });

    it('getOrders passes the optional symbol/exchange filters', async () => {
      fetchSpy.mockResolvedValue(jsonResponse(200, envelope({ orders: [SAMPLE_ORDER] })));
      const result = await freshClient().getOrders({ symbol: 'RELIANCE', exchange: 'NSE' });
      expect(result).toEqual({ orders: [SAMPLE_ORDER] });
      const url = new URL(requestAt(0).url);
      expect(url.pathname).toBe('/api/orders');
      expect(url.searchParams.get('exchange')).toBe('NSE');
      expect(url.searchParams.get('symbol')).toBe('RELIANCE');
    });

    it('postOrder posts an enveloped OrdersRequest and returns an Order row', async () => {
      fetchSpy.mockResolvedValue(jsonResponse(201, envelope(SAMPLE_ORDER)));
      const body = {
        instrument_id: { exchange: 'NSE', symbol: 'RELIANCE' },
        side: 'buy' as const,
        order_type: 'limit' as const,
        qty: 10,
        price: 2980,
        tif: 'day' as const,
        client_order_id: 'C-1',
      };
      const result = await freshClient().postOrder(body);
      expect(result).toEqual(SAMPLE_ORDER);
      expect(requestAt(0).method).toBe('POST');
      expect(requestAt(0).url).toBe('http://local.invalid/api/orders');
      expect(requestAt(0).body).toEqual(body);
      expect(requestAt(0).headers?.['content-type']).toBe('application/json');
    });

    it('deleteOrder issues DELETE and returns the {status} payload', async () => {
      fetchSpy.mockResolvedValue(jsonResponse(200, envelope({ status: 'cancelled' })));
      const result = await freshClient().deleteOrder('ORD-1');
      expect(result).toEqual({ status: 'cancelled' });
      expect(requestAt(0).method).toBe('DELETE');
      expect(requestAt(0).url).toBe('http://local.invalid/api/orders/ORD-1');
    });

    it('getPositions / getAccounts / getTrades unwrap their list payloads', async () => {
      fetchSpy.mockResolvedValue(jsonResponse(200, envelope({ positions: [SAMPLE_POSITION] })));
      const positions = await freshClient().getPositions();
      expect(positions).toEqual({ positions: [SAMPLE_POSITION] });

      fetchSpy.mockResolvedValue(jsonResponse(200, envelope([])));
      await freshClient().getAccounts();
      expect(requestAt(1).url).toBe('http://local.invalid/api/portfolio/accounts');

      fetchSpy.mockResolvedValue(jsonResponse(200, envelope({ trades: [SAMPLE_TRADE] })));
      const trades = await freshClient().getTrades();
      expect(trades).toEqual({ trades: [SAMPLE_TRADE] });
    });

    it('trading-state round-trips the {state}/{previous} response shapes', async () => {
      fetchSpy.mockResolvedValue(jsonResponse(200, envelope({ state: 'active' })));
      expect(await freshClient().getTradingState()).toBe('active');

      fetchSpy.mockResolvedValue(jsonResponse(200, envelope({ state: 'halted', previous: 'active' })));
      expect(await freshClient().putTradingState('halted', 'risk-off')).toBe('halted');
      expect(requestAt(1).method).toBe('PUT');
      expect(requestAt(1).body).toEqual({ state: 'halted', reason: 'risk-off' });
    });

    it('layouts round-trips save/delete and get', async () => {
      fetchSpy.mockResolvedValue(jsonResponse(200, envelope({ layouts: { default: SAMPLE_LAYOUT } })));
      expect(await freshClient().getLayouts()).toEqual({ layouts: { default: SAMPLE_LAYOUT } });

      fetchSpy.mockResolvedValue(jsonResponse(200, envelope({ detail: 'saved' })));
      expect(await freshClient().putLayout('default', SAMPLE_LAYOUT)).toEqual({ detail: 'saved' });
      expect(requestAt(1).method).toBe('PUT');
      expect(requestAt(1).body).toEqual(SAMPLE_LAYOUT);
      expect(requestAt(1).url).toBe('http://local.invalid/api/profile/layouts/default');

      fetchSpy.mockResolvedValue(jsonResponse(200, envelope({ detail: 'deleted' })));
      expect(await freshClient().deleteLayout('default')).toEqual({ detail: 'deleted' });
      expect(requestAt(2).method).toBe('DELETE');
    });
  });
});

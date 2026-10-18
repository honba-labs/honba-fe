// Batch H (docs/tasks.md): thin typed REST client written by hand against
// `honba/schema/openapi/openapi.json` (plan.md §3.4 says not to block on the honba/Makefile
// codegen cutover). One concern only: transport + the versioned `ResponseEnvelope`
// (honba-kokoro-messages/src/api.rs) — unwrap `data`, surface `error` as `HonbaApiError`,
// reject envelopes the FE wasn't built for, and pass everything else through as typed
// payloads. No state, no caching (TanStack Query owns that in ./query.ts), no retries
// (the WS/polling layer owns retry policy).
//
// Routes mirror honba-ya's `api_router` mounting (paths are root-relative in Rust; the Vite
// dev proxy strips the browser's `/api` prefix, so the client speaks `/api/…`).
//
// Instrument ids in `{id}` path slots are `SYMBOL.EXCHANGE` (parse_instrument_id rsplit '.').
import { API_VERSION, SCHEMA_VERSION, instrumentIdPath } from '../types/messages';
import type {
  DepthResponse,
  Instrument,
  InstrumentId,
  LayoutDocument,
  Order,
  OrdersRequest,
  PortfolioAccount,
  PortfolioPosition,
  PortfolioPositionsResponse,
  PortfolioSnapshot,
  Profile,
  QuoteTick,
  ScreenerResponse,
  TradingState,
  Trade,
  ErrorDetail,
  Bar,
  BarsResponse,
  BacktestResponse,
  RunStatus,
  StreamFrame,
  TradesResponse,
  LedgerHistoryResponse,
  TaxReportResponse,
  PortfolioSnapshotsResponse,
  PositionAuditTrailResponse,
  ConcentrationRiskResponse,
  WeightedAverageCostResponse,
  FeesReportResponse,
  PortfolioValueChartResponse,
  OrderFillsResponse,
} from '../types/messages';

/** An honba failure, normalized to `ErrorDetail` wherever the failure came from (error
 * envelope, non-JSON gateway response, network failure, envelope-shape bug). */
export class HonbaApiError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly context?: unknown;
  /** HTTP status when one existed; undefined for network failures. */
  readonly expectedStatus: number | undefined;

  constructor(detail: {
    code: string;
    message: string;
    retryable: boolean;
    context?: unknown;
    expectedStatus?: number;
  }) {
    super(detail.message);
    this.name = 'HonbaApiError';
    this.code = detail.code;
    this.retryable = detail.retryable;
    this.context = detail.context;
    this.expectedStatus = detail.expectedStatus;
  }

  /** Stable codes the engine speaks (`honba-kokoro-messages/src/errors.rs`). */
  static readonly known = new Set([
    'validation_invalid_request', 'not_found', 'unauthorized', 'forbidden', 'rate_limited',
    'risk_max_notional_exceeded', 'risk_max_position_exceeded', 'risk_max_drawdown_exceeded',
    'risk_trading_halted', 'risk_order_rate_exceeded', 'risk_quantity_below_min',
    'risk_quantity_over_freeze', 'risk_lot_multiple_violation', 'risk_tick_size_violation',
    'risk_price_band_exceeded', 'risk_reduce_only_violation', 'risk_instrument_unknown',
    'risk_max_participation_exceeded', 'risk_feed_stale', 'risk_price_collar',
    'order_rejected', 'order_execution_unavailable', 'order_not_found', 'instrument_not_found',
    'market_data_unavailable', 'timeout', 'transport_error', 'internal_error',
    'unsupported', 'not_implemented',
  ]);
}

interface Envelope<T = unknown> {
  api_version: string;
  schema_version: number;
  data?: T;
  error?: ErrorDetail | null;
}

export interface ApiClientOptions {
  /** Base URL the Vite proxy maps to `honba serve` (default `/api`). */
  baseUrl?: string;
  /** Injectable for tests (default globalThis.fetch). */
  fetchImpl?: typeof fetch;
}

export interface InstrumentsQuery {
  exchange?: string;
  symbol?: string;
}

export interface DepthOptions {
  /** Number of levels per side. */
  depth?: number;
}

export interface ReportsQuery {
  page?: number;
  page_size?: number;
  from?: string | number;
  to?: string | number;
  search?: string;
  instrument?: string;
}

function buildUrl(baseUrl: string, path: string, params?: Record<string, string | number | undefined>): URL {
  const url = new URL(`${baseUrl}${path}`, 'http://local.invalid');
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url;
}

async function readJson(response: Response): Promise<Envelope> {
  try {
    return (await response.json()) as Envelope;
  } catch {
    throw new HonbaApiError({
      code: 'internal_error',
      message: `non-JSON response body from the server (status ${response.status})`,
      retryable: false,
      expectedStatus: response.status,
    });
  }
}

/** Validates the two envelope version axes the wire contract says callers must compare. */
function checkVersions(envelope: Envelope, status: number): void {
  const [gotMajor] = envelope.api_version.split('.');
  const [wantMajor] = API_VERSION.split('.');
  if (gotMajor !== wantMajor) {
    throw new HonbaApiError({
      code: 'unsupported',
      message: `envelope api_version ${envelope.api_version} outside the supported major ${wantMajor}`,
      retryable: false,
      context: { api_version: envelope.api_version, schema_version: envelope.schema_version },
      expectedStatus: status,
    });
  }
  if (envelope.schema_version < SCHEMA_VERSION) {
    throw new HonbaApiError({
      code: 'unsupported',
      message: `envelope schema_version ${envelope.schema_version} older than the built-for ${SCHEMA_VERSION}`,
      retryable: false,
      context: { api_version: envelope.api_version, schema_version: envelope.schema_version },
      expectedStatus: status,
    });
  }
}

export interface ApiClient {
  getInstruments(query?: InstrumentsQuery): Promise<{ instruments: Instrument[] }>;
  getQuotes(params: { symbols: string; venue?: string }): Promise<{ quotes: QuoteTick[] }>;
  getDepth(id: InstrumentId, options?: DepthOptions): Promise<DepthResponse>;
  getOrders(params?: { exchange?: string; symbol?: string }): Promise<{ orders: Order[] }>;
  postOrder(request: OrdersRequest): Promise<Order>;
  deleteOrder(orderId: string): Promise<{ status: string }>;
  getPositions(): Promise<PortfolioPositionsResponse>;
  getAccounts(): Promise<{ accounts: PortfolioAccount[] }>;
  getTrades(): Promise<{ trades: Trade[] }>;
  getMoney(): Promise<unknown>;
  /** `GET /portfolio` — the full valued snapshot (totals + accounts). */
  getPortfolio(): Promise<PortfolioSnapshot>;
  /**
   * `POST /positions/close` — the endpoint takes **no body** and closes *every* instrument
   * with a non-zero ledger position (one opposite-side market order each — see
   * honba-ya-api-rest/src/orders.rs). There is intentionally no per-instrument variant today;
   * the wire answer is `{"status": "closing"}` (the schema's `PositionsResponse` shape is the
   * documented intent, the served body is the status object — verify at runtime).
   */
  postPositionsClose(): Promise<{ status: string }>;
  getTradingState(): Promise<TradingState>;
  putTradingState(state: TradingState, reason?: string): Promise<TradingState>;
  getProfile(): Promise<Profile>;
  /**
   * `PUT /profile` — the **whole** profile compare-and-swapped on the body's `revision`
   * (honba-ya-api-rest/src/profile.rs): a stale revision is a 409 `revision_conflict`, and the
   * answer is the stored profile with the revision the store now holds. Read-modify-write
   * therefore goes through this one route — including preference patches.
   */
  putProfile(profile: Profile): Promise<Profile>;
  /**
   * `GET /screener/scan` — `universe` is a **JSON array string** of instrument ids
   * (`["TCS.NSE",…]`, required; missing is a 422 `invalid_universe` per honba-ya-api's
   * `parse_universe`), `filters` a JSON-encoded `ScreenerFilterGroup`, `tf` the timeframe
   * (default `1d` on the server). The server reads bars, so this is a heavier call than the
   * quote-family resources.
   */
  getScreenerScan(params: {
    universe: string;
    filters?: string;
    tf?: string;
    asOf?: string;
  }): Promise<ScreenerResponse>;
  getLayouts(): Promise<{ layouts: Record<string, LayoutDocument> }>;
  putLayout(name: string, document: LayoutDocument): Promise<unknown>;
  deleteLayout(name: string): Promise<unknown>;

  // Reports endpoints (Batch J)
  /** `GET /reports/ledger` — Full transaction journal */
  getLedgerHistory(params?: ReportsQuery): Promise<LedgerHistoryResponse>;
  /** `GET /reports/tax` — Realized gains/losses for India STCG/LTCG */
  getTaxReport(params?: ReportsQuery): Promise<TaxReportResponse>;
  /** `GET /reports/snapshots` — Point-in-time portfolio valuation history */
  getPortfolioSnapshots(params?: ReportsQuery): Promise<PortfolioSnapshotsResponse>;
  /** `GET /reports/audit` — Historical position-change log */
  getPositionAudit(params?: ReportsQuery): Promise<PositionAuditTrailResponse>;
  /** `GET /reports/concentration` — Exposure-by-instrument risk report */
  getConcentrationRisk(): Promise<ConcentrationRiskResponse>;
  /** `GET /reports/wac` — Weighted average cost basis per instrument */
  getWeightedAverageCost(): Promise<WeightedAverageCostResponse>;
  /** `GET /reports/fees` — Fees-paid-over-time report */
  getFeesReport(params?: ReportsQuery): Promise<FeesReportResponse>;
  /** `GET /reports/equity-curve` — Historical net-worth/equity-curve chart data */
  getEquityCurve(params?: ReportsQuery): Promise<PortfolioValueChartResponse>;
  /** `GET /reports/fills/:order_id` — Fills belonging to a single order */
  getOrderFills(orderId: string, params?: ReportsQuery): Promise<OrderFillsResponse>;

  // Strategy/AlgoDesigner endpoints
  /** `POST /strategies/verify` — verify a strategy manifest and return compiled IR */
  postStrategiesVerify(manifest: unknown): Promise<{ data?: unknown; error?: unknown }>;
  /** `POST /strategies/compile` — compile a strategy graph to a strategy_id */
  postStrategiesCompile(graph: unknown): Promise<{ data?: { strategy_id: string }; error?: unknown }>;
  /** `POST /backtests` — run a backtest */
  postBacktests(params: {
    strategy: string;
    universe: string;
    seed: number;
    start?: string;
    end?: string;
    bar_spec?: string;
    fill_model?: string;
    initial_capital?: number;
    commission_per_fill?: number;
    slippage_bps?: number;
  }): Promise<{ data?: BacktestResponse; error?: unknown }>;
  /** `GET /backtests/{id}` — poll backtest status */
  getBacktestsById(id: string): Promise<{ data?: BacktestResponse }>;
  /** `GET /backtests/{id}/journal` — get fills/trades for a completed run */
  getBacktestsByIdJournal(id: string): Promise<{ data?: TradesResponse }>;
  /** `GET /backtests/{id}/events` — SSE stream for run events */
  streamBacktestEvents(id: string, query?: { resume_from_seq?: number }): AsyncGenerator<StreamFrame, void, unknown>;
  /** `PUT /profile/layouts/{name}` — save a layout preset (used for strategy library) */
  putProfileLayoutsByName(name: string, manifest: unknown): Promise<unknown>;

  // Bars endpoint (for Simulator chart)
  /** `GET /bars/{id}` — get historical bars for an instrument */
  getBarsById(id: string, query?: { from?: string; tf?: string; to?: string }): Promise<{ data?: BarsResponse }>;
}

/**
 * Builds the client. `fetchImpl` is injectable so tests assert request shapes without a server.
 */
export function createApiClient(options: ApiClientOptions = {}): ApiClient {
  const baseUrl = options.baseUrl ?? '/api';
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);

  async function request<TResponse>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    params?: Record<string, string | number | undefined>,
    body?: unknown,
  ): Promise<TResponse> {
    const url = buildUrl(baseUrl, path, params);
    let response: Response;
    try {
      response = await fetchImpl(url.toString(), {
        method,
        headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (error) {
      throw new HonbaApiError({
        code: 'transport_error',
        message: `request to ${path} failed: ${(error as Error).message}`,
        retryable: true,
      });
    }

    const envelope = await readJson(response);
    checkVersions(envelope, response.status);

    const hasData = envelope.data !== undefined && envelope.data !== null;
    const hasError = envelope.error !== undefined && envelope.error !== null;
    if (hasError) {
      throw new HonbaApiError({
        code: hasData ? 'internal_error' : envelope.error!.code,
        message: hasData
          ? 'envelope carried both data and error'
          : envelope.error!.message,
        retryable: hasData ? false : envelope.error!.retryable,
        context: hasData ? undefined : envelope.error!.context,
        expectedStatus: response.status,
      });
    }
    if (hasData) {
      return envelope.data as TResponse;
    }
    throw new HonbaApiError({
      code: 'internal_error',
      message: 'envelope carried neither data nor error',
      retryable: false,
      expectedStatus: response.status,
    });
  }

  return {
    getInstruments(query) {
      return request('GET', '/instruments', query as Record<string, string>);
    },
    getQuotes(params) {
      // QuotesResponse { quotes } (honba-ya-api/src/responses.rs).
      return request<{ quotes: QuoteTick[] }>('GET', '/quotes', params as Record<string, string>);
    },
    getDepth(id, optionsArg = {}) {
      return request('GET', `/depth/${encodeURIComponent(instrumentIdPath(id))}`, {
        depth: optionsArg.depth,
      });
    },
    getOrders(params) {
      return request('GET', '/orders', params as Record<string, string>);
    },
    postOrder(orderRequest) {
      return request<Order>('POST', '/orders', undefined, orderRequest);
    },
    deleteOrder(orderId) {
      return request('DELETE', `/orders/${encodeURIComponent(orderId)}`);
    },
    getPositions() {
      return request('GET', '/portfolio/positions');
    },
    getAccounts() {
      return request('GET', '/portfolio/accounts');
    },
    getTrades() {
      return request('GET', '/portfolio/trades');
    },
    getMoney() {
      return request('GET', '/portfolio');
    },
    getPortfolio() {
      return request('GET', '/portfolio');
    },
    postPositionsClose() {
      return request('POST', '/positions/close');
    },
    getTradingState() {
      // TradingStateResponse { state } (honba-ya-api/src/responses.rs).
      return request<{ state: TradingState }>('GET', '/trading-state').then((r) => r.state);
    },
    putTradingState(state, reason) {
      // TradingStateRequest { state, reason }; PUT answers TradingStateChange { state, previous }.
      return request<{ state: TradingState }>('PUT', '/trading-state', undefined, {
        state,
        reason,
      }).then((r) => r.state);
    },
    getProfile() {
      return request<Profile>('GET', '/profile');
    },
    putProfile(profile) {
      return request<Profile>('PUT', '/profile', undefined, profile);
    },
    getScreenerScan(params) {
      return request('GET', '/screener/scan', {
        universe: params.universe,
        filters: params.filters,
        tf: params.tf,
        // The wire parameter is snake_case.
        as_of: params.asOf,
      });
    },
    getLayouts() {
      return request('GET', '/profile/layouts');
    },
    putLayout(name, layoutDocument) {
      return request('PUT', `/profile/layouts/${encodeURIComponent(name)}`, undefined, layoutDocument);
    },
    deleteLayout(name) {
      return request('DELETE', `/profile/layouts/${encodeURIComponent(name)}`);
    },
    getLedgerHistory(params) {
      return request<LedgerHistoryResponse>('GET', '/reports/ledger', params as Record<string, string | number | undefined>);
    },
    getTaxReport(params) {
      return request<TaxReportResponse>('GET', '/reports/tax', params as Record<string, string | number | undefined>);
    },
    getPortfolioSnapshots(params) {
      return request<PortfolioSnapshotsResponse>('GET', '/reports/snapshots', params as Record<string, string | number | undefined>);
    },
    getPositionAudit(params) {
      return request<PositionAuditTrailResponse>('GET', '/reports/audit', params as Record<string, string | number | undefined>);
    },
    getConcentrationRisk() {
      return request<ConcentrationRiskResponse>('GET', '/reports/concentration');
    },
    getWeightedAverageCost() {
      return request<WeightedAverageCostResponse>('GET', '/reports/wac');
    },
    getFeesReport(params) {
      return request<FeesReportResponse>('GET', '/reports/fees', params as Record<string, string | number | undefined>);
    },
    getEquityCurve(params) {
      return request<PortfolioValueChartResponse>('GET', '/reports/equity-curve', params as Record<string, string | number | undefined>);
    },
    getOrderFills(orderId, params) {
      return request<OrderFillsResponse>('GET', `/reports/fills/${encodeURIComponent(orderId)}`, params as Record<string, string | number | undefined>);
    },
    postStrategiesVerify(manifest) {
      return request('POST', '/strategies/verify', undefined, manifest);
    },
    postStrategiesCompile(graph) {
      return request('POST', '/strategies/compile', undefined, graph);
    },
    putProfileLayoutsByName(name, manifest) {
      return request('PUT', `/profile/layouts/${encodeURIComponent(name)}`, undefined, manifest);
    },
    postBacktests(params) {
      return request('POST', '/backtests', undefined, params);
    },
    getBacktestsById(id) {
      return request('GET', `/backtests/${encodeURIComponent(id)}`);
    },
    getBacktestsByIdJournal(id) {
      return request('GET', `/backtests/${encodeURIComponent(id)}/journal`);
    },
    async *streamBacktestEvents(id, query) {
      const url = buildUrl(baseUrl, `/backtests/${encodeURIComponent(id)}/events`, query as Record<string, string | number>);
      const response = await fetchImpl(url.toString(), {
        headers: { accept: 'text/event-stream' },
      });
      if (!response.ok) {
        throw new HonbaApiError({
          code: 'transport_error',
          message: `SSE connection failed: ${response.status}`,
          retryable: true,
        });
      }
      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const frame = JSON.parse(line.slice(6)) as StreamFrame;
              yield frame;
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    },
    getBarsById(id, query) {
      return request('GET', `/bars/${encodeURIComponent(id)}`, query as Record<string, string>);
    },
  };
}

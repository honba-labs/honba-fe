// Batch H (docs/tasks.md): TanStack Query hooks per REST resource — server-state caching,
// invalidation, and polling around the typed client. This is the request/response half of the
// state layer; the always-on live slices (quotes/depth ticking between fetches) stay in the
// Zustand core/store/*, fed by the core/ws LiveSocket. Retry policy is contract-aware: the
// envelope's `retryable` flag decides (network/timeout/transport errors retry; risk refusals
// and validation failures do not) — HonbaApiError carries exactly that flag from the wire.
import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createApiClient, HonbaApiError } from './client';
import type { ApiClient } from './client';
import type { DepthOptions, InstrumentsQuery } from './client';
import type { InstrumentId, OrdersRequest, Profile, TradingState } from '../types/messages';

export type { ApiClient } from './client';

/** The singleton REST client (polling transport + mutations use it). */
let sharedClient: ApiClient | undefined;

export function getApiClient(): ApiClient {
  if (!sharedClient) {
    sharedClient = createApiClient();
  }
  return sharedClient;
}

/** Test/lazy-injection seam — replaces the shared client (undefined = recreate). */
export function setApiClient(client: ApiClient | undefined): void {
  sharedClient = client;
}

/** Stable, hierarchical query keys for the whole REST surface. */
export const queryKeys = {
  instruments: (query?: InstrumentsQuery) => ['instruments', query ?? {}] as const,
  quotes: (symbols: string) => ['quotes', symbols] as const,
  depth: (instrument: InstrumentId | null) =>
    instrument
      ? (['depth', instrument.exchange, instrument.symbol] as const)
      : (['depth', 'none'] as const),
  orders: (params?: { exchange?: string; symbol?: string }) =>
    ['orders', params ?? {}] as const,
  positions: () => ['positions'] as const,
  accounts: () => ['accounts'] as const,
  portfolio: () => ['portfolio'] as const,
  trades: () => ['trades'] as const,
  tradingState: () => ['trading-state'] as const,
  layouts: () => ['layouts'] as const,
  profile: () => ['profile'] as const,
};

/**
 * Builds the app QueryClient. `HonbaApiError.retryable` (from the envelope's `ErrorDetail`)
 * drives retry behavior: network-shaped failures retry, 4xx refusals don't.
 */
export function createQueryClient(options: { retries?: number } = { retries: 2 }): QueryClient {
  const retries = options.retries ?? 2;
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof HonbaApiError) {
            return error.retryable && failureCount < retries;
          }
          return failureCount < retries;
        },
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

/** `GET /instruments` — the tradable universe (slow-moving; long stale time). */
export function useInstruments(query?: InstrumentsQuery) {
  return useQuery({
    queryKey: queryKeys.instruments(query),
    queryFn: () => getApiClient().getInstruments(query),
    staleTime: 60_000,
    enabled: query !== undefined ? true : true,
  });
}

/** `GET /quotes?symbols=…` — snapshot top-of-book for one or more symbols (live ticks go
 * through the LiveSocket → useMarketStore instead; this hook is for one-shot reads). */
export function useQuotes(symbols: string, venue?: string) {
  return useQuery({
    queryKey: queryKeys.quotes(symbols),
    queryFn: () => getApiClient().getQuotes({ symbols, venue }),
    enabled: symbols.trim().length > 0,
  });
}

/**
 * `GET /depth/{id}` — the book for the selected instrument. Polls at `refetchIntervalMs`
 * (default 1s, mirroring the LiveSocket depth cadence); disabled while nothing is selected.
 */
export function useDepth(
  instrument: InstrumentId | null,
  options?: DepthOptions & { refetchIntervalMs?: number },
) {
  const { refetchIntervalMs = 1_000, ...depthOptions } = options ?? {};
  return useQuery({
    queryKey: queryKeys.depth(instrument),
    queryFn: () => {
      if (!instrument) throw new Error('depth disabled');
      return getApiClient().getDepth(instrument, depthOptions);
    },
    enabled: instrument !== null,
    refetchInterval: instrument ? refetchIntervalMs : false,
  });
}

/** `GET /orders` — the working/history ledger snapshot (poll-refreshed; replaces the
 * useOrdersStore rows once per poll via the feature layer). */
export function useOrders(params?: { exchange?: string; symbol?: string }) {
  return useQuery({
    queryKey: queryKeys.orders(params),
    queryFn: () => getApiClient().getOrders(params),
  });
}

/** `GET /portfolio/positions` — valued open positions. */
export function usePositions() {
  return useQuery({
    queryKey: queryKeys.positions(),
    queryFn: () => getApiClient().getPositions(),
  });
}

/** `GET /portfolio/accounts` — accounts with their holdings (BalancesTable's row source). */
export function useAccounts() {
  return useQuery({
    queryKey: queryKeys.accounts(),
    queryFn: () => getApiClient().getAccounts(),
  });
}

/** `GET /portfolio` — the full valued snapshot (KPI header source; accounts also included). */
export function usePortfolio() {
  return useQuery({
    queryKey: queryKeys.portfolio(),
    queryFn: () => getApiClient().getPortfolio(),
  });
}

/** `GET /portfolio/trades` — the fill ledger for the Trade History tab. */
export function useTrades() {
  return useQuery({
    queryKey: queryKeys.trades(),
    queryFn: () => getApiClient().getTrades(),
  });
}

/** `GET /screener/scan` — explicit-gated: nothing scans until the page asks (bars are read
 * server-side per instrument, so accidental auto-scans are wasteful). */
export function useScreenerScan(
  params: { universe: string; filters?: string; tf?: string; asOf?: string },
  options: { enabled: boolean } = { enabled: true },
) {
  return useQuery({
    queryKey: ['screener', params],
    queryFn: () => getApiClient().getScreenerScan(params),
    enabled: options.enabled && params.universe.trim().length > 0,
    // A scan is a fresh evaluation, not a live subscription: keep results for the session
    // only, refetch exclusively on Run.
    staleTime: Infinity,
  });
}

/**
 * `POST /positions/close` — bodyless and **close-all** (every non-zero ledger position gets an
 * opposite-side market order). Invalidates every portfolio/trading slice plus orders (each
 * close is itself a POST /orders path order).
 */
export function useClosePositions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => getApiClient().postPositionsClose(),
    onSuccess: () => {
      for (const key of [['orders'], ['positions'], ['accounts'], ['portfolio'], ['trades']]) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

/** `GET /trading-state` — active/reducing/halted. */
export function useTradingState() {
  return useQuery({
    queryKey: queryKeys.tradingState(),
    queryFn: () => getApiClient().getTradingState(),
  });
}

/** `POST /orders` — invalidates orders + positions (a fill changes both). */
export function usePlaceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: OrdersRequest) => getApiClient().postOrder(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
  });
}

/** `DELETE /orders/{id}` — invalidates the orders list. */
export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => getApiClient().deleteOrder(orderId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

/** `PUT /trading-state` — invalidates the state query. */
export function useSetTradingState() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { state: TradingState; reason?: string }) =>
      getApiClient().putTradingState(input.state, input.reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tradingState() });
    },
  });
}

/** `GET /profile` — the caller's whole profile (layouts, modules, watchlists, preferences,
 * revision; the Settings page's app preferences persist into this document). */
export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile(),
    queryFn: () => getApiClient().getProfile(),
  });
}

/** `GET /profile/layouts` — named workbench layouts by name (both keys for the Workbench store
 * and any layout preset management UI). */
export function useLayouts() {
  return useQuery({
    queryKey: queryKeys.layouts(),
    queryFn: () => getApiClient().getLayouts(),
  });
}

/** `PUT /profile` — read-modify-write CAS: callers merge their patch into the profile they
 * read and send the body with its read `revision`. Invalidates profile + layouts (layouts is
 * a sub-document of the profile answer). */
export function usePutProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profile: Profile) => getApiClient().putProfile(profile),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.layouts() });
    },
  });
}

/** `DELETE /profile/layouts/{name}` — removes a named workbench layout preset. */
export function useDeleteLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => getApiClient().deleteLayout(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.layouts() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile() });
    },
  });
}

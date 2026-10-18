// Batch I slice 4 (docs/tasks.md §Batch I): the Screener route's first slice. The parity
// target (honba-frontend's screener-app: TradingView-style filter modal, heatmap, ~500
// indicators) is far beyond this slice; the honba backend contract, though, is already
// complete and usable: `GET /screener/scan` with a JSON-array `universe` (required,
// honba-ya-api `parse_universe`), a JSON-encoded `ScreenerFilterGroup` (`{operator,
// items:[{key,op,value}]}`; ops snake_case per honba-kokoro-entities `FilterOp`), `tf`
// (default `1d`), answering `ScreenerResponse { rows: ScreenerResultRow[] }` where each row's
// `metrics` carries exactly the keys the filter group reads (honba-ya-api screener.rs). This
// page exposes that contract directly: universe field, AND-combined predicate rows, a
// results table with one column per metric key. Explicit-run only (no auto-refetch): a scan
// reads every universe instrument's bars server-side.
import { useMemo, useState } from 'react';

import { useScreenerScan } from '../../core/api/query';
import type { ScreenerFilterPredicate } from '../../core/types/messages';
import './ScreenerPage.css';

/** The `FilterOp` vocabulary the evaluator supports (snake_case on the wire). */
const OPS: { value: string; label: string }[] = [
  { value: 'eq', label: '=' },
  { value: 'neq', label: '≠' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '≥' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '≤' },
  { value: 'between', label: 'between' },
  { value: 'crosses_above', label: 'crosses above' },
  { value: 'crosses_below', label: 'crosses below' },
];

interface PredicateRow {
  key: string;
  op: string;
  value: string;
}

const EMPTY_ROW: PredicateRow = { key: '', op: 'gt', value: '' };

interface StoredRequest {
  universe: string;
  filters?: string;
}

/** Builds the wire param values from the UI state; `null` when the filter rows are all empty
 * (no filters at all — the server matches every universe instrument). */
function buildRequest(universe: string, rows: PredicateRow[]): StoredRequest {
  const filled = rows.filter((row) => row.key.trim() !== '');
  if (filled.length === 0) return { universe };
  const items: ScreenerFilterPredicate[] = filled.map((row) => ({
    key: row.key.trim(),
    op: row.op,
    value: Number.isNaN(Number(row.value)) ? row.value : Number(row.value),
  }));
  return { universe, filters: JSON.stringify({ operator: 'AND', items }) };
}

export function ScreenerPage() {
  const [universe, setUniverse] = useState('');
  const [rows, setRows] = useState<PredicateRow[]>([{ ...EMPTY_ROW }]);
  const [request, setRequest] = useState<StoredRequest | null>(null);

  const scan = useScreenerScan(
    { universe: request?.universe ?? '', filters: request?.filters },
    { enabled: request !== null },
  );

  const metricKeys = useMemo(() => {
    const keys: string[] = [];
    for (const row of scan.data?.rows ?? []) {
      for (const key of Object.keys(row.metrics)) {
        if (!keys.includes(key)) keys.push(key);
      }
    }
    return keys;
  }, [scan.data]);

  function run() {
    setRequest(buildRequest(universe, rows));
  }

  return (
    <div className="screener">
      <header className="screener__header">
        <h2>Screener</h2>
        <p className="screener__hint">
          Scans run server-side: <code>GET /screener/scan</code> reads each universe
          instrument's bars and evaluates the filter group.
        </p>
      </header>

      <form
        className="screener__controls"
        onSubmit={(event) => {
          event.preventDefault();
          run();
        }}
      >
        <label className="screener__field screener__field--universe">
          <span>Universe (JSON array of instrument ids)</span>
          <input
            className="screener__universe"
            placeholder={'[ "TCS.NSE", "RELIANCE.NSE" ]'}
            value={universe}
            onChange={(event) => setUniverse(event.target.value)}
          />
        </label>

        <div className="screener__predicates">
          {rows.map((row, index) => (
            <div className="screener__predicate" key={index}>
              {index === 0 && <span className="screener__and">Where</span>}
              {index > 0 && <span className="screener__and">AND</span>}
              <input
                className="screener__key"
                placeholder="metric key (close, rsi, sma50…)"
                aria-label={`Metric key ${index + 1}`}
                value={row.key}
                onChange={(event) =>
                  setRows(rows.map((r, i) => (i === index ? { ...r, key: event.target.value } : r)))
                }
              />
              <select
                aria-label={`Operator ${index + 1}`}
                className="screener__op"
                value={row.op}
                onChange={(event) =>
                  setRows(rows.map((r, i) => (i === index ? { ...r, op: event.target.value } : r)))
                }
              >
                {OPS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
              <input
                className="screener__value"
                placeholder="value"
                aria-label={`Value ${index + 1}`}
                value={row.value}
                onChange={(event) =>
                  setRows(rows.map((r, i) => (i === index ? { ...r, value: event.target.value } : r)))
                }
              />
              {rows.length > 1 && (
                <button
                  type="button"
                  className="screener__remove"
                  aria-label={`Remove predicate ${index + 1}`}
                  onClick={() => setRows(rows.filter((_, i) => i !== index))}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="screener__add"
            onClick={() => setRows([...rows, { ...EMPTY_ROW }])}
          >
            Add predicate
          </button>
        </div>

        <button type="submit" className="screener__run">
          Run scan
        </button>
      </form>

      <div className="screener__results">
        {scan.error && (
          <p className="screener__error">Scan failed: {(scan.error as Error).message}</p>
        )}
        {scan.isFetching && <p className="screener__pending">Scanning…</p>}
        {scan.data && (
          <table className="screener__table">
            <thead>
              <tr>
                <th>Instrument</th>
                {metricKeys.map((key) => (
                  <th key={key}>{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scan.data.rows.map((row) => (
                <tr key={`${row.instrument_id.exchange}:${row.instrument_id.symbol}`}>
                  <td>
                    {row.instrument_id.symbol} · {row.instrument_id.exchange}
                  </td>
                  {metricKeys.map((key) => (
                    <td key={key}>
                      {row.metrics[key] == null ? '—' : row.metrics[key].toString()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {scan.data && scan.data.rows.length === 0 && (
          <p className="screener__hint">No instruments passed the filter.</p>
        )}
        {!scan.data && !scan.error && !scan.isFetching && (
          <p className="screener__empty">
            Type a universe and run a scan. Metric keys honour the evaluator&apos;s vocabulary
            (open/high/low/close/volume, rsi, sma&lt;N&gt;, price_52_week_low/high).
          </p>
        )}
      </div>
    </div>
  );
}

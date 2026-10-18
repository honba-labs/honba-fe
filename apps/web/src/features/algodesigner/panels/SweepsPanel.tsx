// Sweeps Panel - Parameter Optimization
// Mirrors honba-frontend apps/algodesigner/sweeps-panel.tsx

import React, { useMemo, useState } from 'react';
import { Play, Download, Table, BarChart2, AlertTriangle, CheckCircle2 } from 'lucide-react';

import { useDesignerStore } from '../store';
import { pythonParams } from '../nodes/codegen';
import { useOpsStore } from '../ops-store';

interface SweepParam {
  name: string;
  defaultValue: unknown;
  min?: number;
  max?: number;
  step?: number;
  values?: unknown[];
}

interface SweepConfig {
  paramName: string;
  mode: 'range' | 'values';
  min: number;
  max: number;
  step: number;
  values: unknown[];
}

export const SweepsPanel: React.FC = () => {
  const store = useDesignerStore();
  const ops = useOpsStore();
  const { graph, applySweepParams } = store;

  const [configs, setConfigs] = useState<Record<string, SweepConfig>>({});
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Array<{ params: Record<string, unknown>; metrics: { sharpe: number; return: number; dd: number; trades: number } }>>([]);

  // Initialize configs from indicator parameters
  const params = useMemo(() => pythonParams(graph), [graph]);

  React.useEffect(() => {
    const initial: Record<string, SweepConfig> = {};
    params.forEach((p) => {
      if (typeof p.defaultValue === 'number') {
        initial[p.name] = {
          paramName: p.name,
          mode: 'range',
          min: p.defaultValue * 0.5,
          max: p.defaultValue * 2,
          step: Math.max(1, p.defaultValue * 0.1),
          values: [],
        };
      }
    });
    setConfigs(initial);
  }, [params]);

  const handleConfigChange = (paramName: string, patch: Partial<SweepConfig>) => {
    setConfigs((prev) => ({ ...prev, [paramName]: { ...prev[paramName], ...patch } }));
  };

  const handleRunSweep = async () => {
    const activeConfigs = Object.values(configs).filter((c) => c.mode === 'range' && c.max > c.min);
    if (activeConfigs.length === 0) return;

    setRunning(true);
    setResults([]);

    try {
      // Generate parameter combinations (simple grid search for now)
      const combinations = generateCombinations(activeConfigs);
      const maxRuns = Math.min(combinations.length, 50); // Cap at 50 runs

      for (let i = 0; i < maxRuns; i++) {
        const combo = combinations[i];
        await applySweepParams(combo);

        // In real implementation, this would call the backend sweep endpoint
        // For now, simulate results
        const simulatedMetrics = {
          sharpe: 0.5 + Math.random() * 2,
          return: -0.1 + Math.random() * 0.4,
          dd: 0.02 + Math.random() * 0.15,
          trades: Math.floor(10 + Math.random() * 50),
        };

        setResults((prev) => [...prev, { params: combo, metrics: simulatedMetrics }]);

        // Small delay to show progress
        await new Promise((r) => setTimeout(r, 100));
      }
    } finally {
      setRunning(false);
    }
  };

  const handleExport = () => {
    const csv = [
      ['Parameter', 'Value', 'Sharpe', 'Return %', 'Max DD %', 'Trades'].join(','),
      ...results.map((r) =>
        [
          Object.entries(r.params).map(([k, v]) => `${k}=${v}`).join(';'),
          '',
          r.metrics.sharpe.toFixed(2),
          (r.metrics.return * 100).toFixed(2),
          (r.metrics.dd * 100).toFixed(2),
          r.metrics.trades,
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sweep-${graph.name}-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleApplyBest = () => {
    if (results.length === 0) return;
    const best = results.reduce((a, b) => (a.metrics.sharpe > b.metrics.sharpe ? a : b));
    applySweepParams(best.params);
    store.setNotice(`Applied best parameters (Sharpe: ${best.metrics.sharpe.toFixed(2)})`);
  };

  const sortedResults = useMemo(
    () => [...results].sort((a, b) => b.metrics.sharpe - a.metrics.sharpe),
    [results],
  );

  return (
    <div style={{ padding: 20, maxWidth: 960, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Parameter Sweeps & Optimization
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Grid search over indicator parameters. Results ranked by Sharpe ratio.
          </p>
        </div>
      </div>

      {/* Parameter Configuration */}
      <div
        style={{
          borderRadius: 'var(--radius-md, 6px)',
          background: 'var(--bg-surface, #1e222d)',
          border: '1px solid var(--border-subtle, #2a2e39)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-subtle, #2a2e39)',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          Sweep Parameters ({Object.keys(configs).length} tunable)
        </div>

        {params.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            No tunable indicator parameters in current graph.
          </div>
        ) : (
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {params.map((p) => {
              const cfg = configs[p.name];
              if (!cfg) return null;
              return (
                <div key={p.name} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle, #2a2e39)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', minWidth: 140 }}>
                      {p.name}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-family-mono)' }}>
                      Default: {String(p.defaultValue)}
                    </span>
                    <select
                      value={cfg.mode}
                      onChange={(e) => handleConfigChange(p.name, { mode: e.target.value as 'range' | 'values' })}
                      style={{
                        padding: '4px 8px',
                        background: 'var(--bg-secondary, #131722)',
                        border: '1px solid var(--border-subtle, #2a2e39)',
                        borderRadius: 'var(--radius-sm, 4px)',
                        color: 'var(--text-primary)',
                        fontSize: 11,
                      }}
                    >
                      <option value="range">Range (min/max/step)</option>
                      <option value="values">Discrete Values</option>
                    </select>
                  </div>

                  {cfg.mode === 'range' && typeof p.defaultValue === 'number' && (
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Min</span>
                        <input
                          type="number"
                          value={cfg.min}
                          onChange={(e) => handleConfigChange(p.name, { min: Number(e.target.value) })}
                          step={cfg.step}
                          style={{ width: 80, padding: '4px 8px', background: 'var(--bg-secondary, #131722)', border: '1px solid var(--border-subtle, #2a2e39)', borderRadius: 'var(--radius-sm, 4px)', color: 'var(--text-primary)', fontSize: 11, fontFamily: 'var(--font-family-mono)' }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Max</span>
                        <input
                          type="number"
                          value={cfg.max}
                          onChange={(e) => handleConfigChange(p.name, { max: Number(e.target.value) })}
                          step={cfg.step}
                          style={{ width: 80, padding: '4px 8px', background: 'var(--bg-secondary, #131722)', border: '1px solid var(--border-subtle, #2a2e39)', borderRadius: 'var(--radius-sm, 4px)', color: 'var(--text-primary)', fontSize: 11, fontFamily: 'var(--font-family-mono)' }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Step</span>
                        <input
                          type="number"
                          value={cfg.step}
                          onChange={(e) => handleConfigChange(p.name, { step: Number(e.target.value) })}
                          style={{ width: 80, padding: '4px 8px', background: 'var(--bg-secondary, #131722)', border: '1px solid var(--border-subtle, #2a2e39)', borderRadius: 'var(--radius-sm, 4px)', color: 'var(--text-primary)', fontSize: 11, fontFamily: 'var(--font-family-mono)' }}
                        />
                      </div>
                    </div>
                  )}

                  {cfg.mode === 'values' && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>Values (comma-separated):</span>
                      <input
                        type="text"
                        value={cfg.values.join(', ')}
                        onChange={(e) => handleConfigChange(p.name, { values: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) })}
                        style={{ flex: 1, minWidth: 200, padding: '4px 8px', background: 'var(--bg-secondary, #131722)', border: '1px solid var(--border-subtle, #2a2e39)', borderRadius: 'var(--radius-sm, 4px)', color: 'var(--text-primary)', fontSize: 11 }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Run Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="shortlist-btn shortlist-btn-primary"
          onClick={handleRunSweep}
          disabled={running || Object.keys(configs).length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px' }}
        >
          <Play size={14} />
          <span>{running ? `Running... (${results.length})` : 'Run Sweep'}</span>
        </button>

        {results.length > 0 && (
          <>
            <button
              type="button"
              className="shortlist-btn"
              onClick={handleApplyBest}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px' }}
            >
              <CheckCircle2 size={13} style={{ color: 'var(--bullish, #089981)' }} />
              <span>Apply Best</span>
            </button>
            <button
              type="button"
              className="shortlist-btn"
              onClick={handleExport}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px' }}
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          </>
        )}
      </div>

      {/* Results Table */}
      {results.length > 0 && (
        <div
          style={{
            borderRadius: 'var(--radius-md, 6px)',
            background: 'var(--bg-surface, #1e222d)',
            border: '1px solid var(--border-subtle, #2a2e39)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--border-subtle, #2a2e39)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            Results ({results.length} runs) — Sorted by Sharpe
          </div>

          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface-elevated, #2a2e39)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px' }}>Rank</th>
                  <th style={{ padding: '8px 12px' }}>Parameters</th>
                  <th style={{ padding: '8px 12px' }}>Sharpe</th>
                  <th style={{ padding: '8px 12px' }}>Return %</th>
                  <th style={{ padding: '8px 12px' }}>Max DD %</th>
                  <th style={{ padding: '8px 12px' }}>Trades</th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((r, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle, #2a2e39)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: idx === 0 ? 'var(--accent-gold, #f7a600)' : 'var(--text-primary)' }}>#{idx + 1}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--font-family-mono)', fontSize: 10, color: 'var(--text-secondary)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {Object.entries(r.params).map(([k, v]) => `${k}=${v}`).join(', ')}
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: r.metrics.sharpe >= 1 ? 'var(--bullish, #089981)' : r.metrics.sharpe < 0 ? 'var(--bearish, #f23645)' : 'var(--text-primary)' }}>
                      {r.metrics.sharpe.toFixed(2)}
                    </td>
                    <td style={{ padding: '8px 12px', color: r.metrics.return >= 0 ? 'var(--bullish, #089981)' : 'var(--bearish, #f23645)' }}>
                      {(r.metrics.return * 100).toFixed(2)}%
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--bearish, #f23645)' }}>
                      {(r.metrics.dd * 100).toFixed(2)}%
                    </td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--font-family-mono)' }}>{r.metrics.trades}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

function generateCombinations(configs: SweepConfig[]): Record<string, unknown>[] {
  if (configs.length === 0) return [{}];

  const [first, ...rest] = configs;
  const restCombos = generateCombinations(rest);
  const values = first.mode === 'values'
    ? first.values
    : generateRange(first.min, first.max, first.step);

  return values.flatMap((v) =>
    restCombos.map((combo) => ({ ...combo, [first.paramName]: v })),
  );
}

function generateRange(min: number, max: number, step: number): number[] {
  const vals: number[] = [];
  for (let v = min; v <= max + 1e-9; v += step) {
    vals.push(Math.round(v * 10000) / 10000);
  }
  return vals;
}
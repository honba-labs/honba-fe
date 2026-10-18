// Batch I slice 4+ (docs/tasks.md §Batch I): Enhanced Screener route.
// Parity target: honba-frontend's screener-app with universe presets, metric catalog,
// nested filter groups, timeframe selection, sortable/exportable results, saved presets.
import { useCallback, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Filter,
  X,
  Plus,
  Minus,
  Save,
  FolderOpen,
  Trash2,
  Download,
  Settings,
  ArrowUpDown,
  Search,
  HelpCircle,
  ChevronsUpDown,
  Columns,
  Eye,
  EyeOff,
  ChevronUp,
} from 'lucide-react';

import { useScreenerScan, getApiClient } from '../../core/api/query';
import type {
  ScreenerFilterItem,
  ScreenerFilterGroup,
  ScreenerResponse,
  Timeframe,
  TimeframeValue,
} from '../../core/types/messages';
import { MetricCatalog, UNIVERSE_PRESETS, DEFAULT_TIMEFRAMES } from './catalog';
import './ScreenerPage.css';

/** Supported filter operators with UI labels. */
const OPS: { value: string; label: string; acceptsMetricRef: boolean; group?: string }[] = [
  { value: 'eq', label: '=', acceptsMetricRef: false, group: 'Equality' },
  { value: 'neq', label: '≠', acceptsMetricRef: false, group: 'Equality' },
  { value: 'gt', label: '>', acceptsMetricRef: true, group: 'Ordering' },
  { value: 'gte', label: '≥', acceptsMetricRef: true, group: 'Ordering' },
  { value: 'lt', label: '<', acceptsMetricRef: true, group: 'Ordering' },
  { value: 'lte', label: '≤', acceptsMetricRef: true, group: 'Ordering' },
  { value: 'between', label: 'between', acceptsMetricRef: false, group: 'Range' },
  { value: 'in', label: 'in', acceptsMetricRef: false, group: 'Set' },
  { value: 'not_in', label: 'not in', acceptsMetricRef: false, group: 'Set' },
  { value: 'like', label: 'like', acceptsMetricRef: false, group: 'Pattern' },
  { value: 'has', label: 'has', acceptsMetricRef: false, group: 'Pattern' },
  { value: 'crosses_above', label: 'crosses above', acceptsMetricRef: true, group: 'Crossing' },
  { value: 'crosses_below', label: 'crosses below', acceptsMetricRef: true, group: 'Crossing' },
];

/** UI representation of a predicate row. */
interface PredicateRow {
  id: string;
  key: string;
  op: string;
  value: string;
  parentId: string;
}

/** Default empty predicate row. */
const EMPTY_PREDICATE: PredicateRow = {
  id: crypto.randomUUID(),
  key: '',
  op: 'gt',
  value: '',
  parentId: '',
};

/** Default empty group (AND by default). */
const EMPTY_GROUP: GroupRow = {
  id: crypto.randomUUID(),
  operator: 'AND',
  children: [{ ...EMPTY_PREDICATE, parentId: '' }],
  parentId: '',
};

/** UI representation of a group (AND/OR). */
interface GroupRow {
  id: string;
  operator: 'AND' | 'OR';
  children: (PredicateRow | GroupRow)[];
  parentId: string;
}

/** Node in the filter tree (discriminated union). */
type FilterNode = PredicateRow | GroupRow;

/** Stored request sent to the server. */
interface StoredRequest {
  universe: string;
  filters?: string;
  tf?: string;
  asOf?: string;
}

/** Saved filter preset. */
interface SavedPreset {
  name: string;
  universe: string;
  filters: ScreenerFilterGroup;
  tf: string;
  createdAt: number;
}

/** Column visibility state. */
interface ColumnVisibility {
  [key: string]: boolean;
}

/** Sort state for results table. */
interface SortState {
  key: string;
  direction: 'asc' | 'desc';
}

export function ScreenerPage() {
  // --- Universe state ---
  const [universe, setUniverse] = useState('');
  const [universePreset, setUniversePreset] = useState<string>('');

  // --- Filter tree state ---
  const [filterTree, setFilterTree] = useState<GroupRow>(EMPTY_GROUP);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set([EMPTY_GROUP.id]));

  // --- Timeframe & as-of ---
  const [timeframe, setTimeframe] = useState<TimeframeValue>('1d');
  const [asOf, setAsOf] = useState('');

  // --- Results state ---
  const [sortState, setSortState] = useState<SortState | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({});
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize] = useState(50);

  // --- Presets ---
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('honba.screener.presets') || '[]');
    } catch {
      return [];
    }
  });
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetName, setPresetName] = useState('');

  // --- UI state ---
  const [showMetricCatalog, setShowMetricCatalog] = useState(false);
  const [metricSearch, setMetricSearch] = useState('');

  // --- Scan hook ---
  const [scanKey, setScanKey] = useState<StoredRequest | null>(null);

  const scan = useScreenerScan(
    { universe: scanKey?.universe ?? '', filters: scanKey?.filters, tf: scanKey?.tf ?? '1d' },
    { enabled: scanKey !== null, staleTime: Infinity },
  );

  // Metric keys from current scan for results table
  const metricKeys = useMemo(() => {
    const keys: string[] = [];
    for (const row of scan.data?.rows ?? []) {
      for (const key of Object.keys(row.metrics)) {
        if (!keys.includes(key)) keys.push(key);
      }
    }
    return keys;
  }, [scan.data]);

  // Initialize column visibility
  useMemo(() => {
    if (Object.keys(columnVisibility).length === 0 && metricKeys.length > 0) {
      setColumnVisibility(Object.fromEntries(metricKeys.map(k => [k, true])));
    }
  }, [metricKeys, columnVisibility]);

  // --- Helpers ---

  /** Build the wire-format filter group from the filter tree. */
  const buildFilterGroup = useCallback((node: FilterNode): ScreenerFilterGroup => {
    if (isPredicate(node)) {
      // PredicateRow
      return {
        operator: 'AND',
        items: [{
          key: node.key.trim(),
          op: node.op as any,
          value: isNaN(Number(node.value)) ? node.value : Number(node.value),
        }],
      };
    } else {
      // GroupRow
      const mapChild = (child: FilterNode): ScreenerFilterItem | ScreenerFilterGroup => {
        if (isPredicate(child)) {
          return {
            key: child.key.trim(),
            op: child.op as any,
            value: isNaN(Number(child.value)) ? child.value : Number(child.value),
          };
        } else {
          return buildFilterGroup(child);
        }
      };
      return {
        operator: node.operator,
        items: node.children.map(mapChild) as (ScreenerFilterItem | ScreenerFilterGroup)[],
      };
    }
  }, []);

  /** Build the request object for the server. */
  const buildRequest = useCallback((tree: GroupRow): StoredRequest => {
    const filled = flattenPredicates(tree).filter(p => p.key.trim() !== '');
    if (filled.length === 0) return { universe };

    const filterGroup = buildFilterGroup(tree);
    return {
      universe,
      filters: JSON.stringify(filterGroup),
      tf: timeframe,
      asOf: asOf || undefined,
    };
  }, [universe, timeframe, asOf, buildFilterGroup]);

  /** Type guard for PredicateRow. */
  /** Type guard for PredicateRow. */
const isPredicate = (node: FilterNode): node is PredicateRow => 'key' in node;

/** Type guard for GroupRow. */
const isGroup = (node: FilterNode): node is GroupRow => !isPredicate(node);

  /** Flatten all predicates in the tree (for validation/counting). */
  const flattenPredicates = useCallback((node: FilterNode): PredicateRow[] => {
    if (isPredicate(node)) return [node];
    return node.children.flatMap(flattenPredicates);
  }, []);

  /** Run the scan. */
  const runScan = useCallback(() => {
    const request = buildRequest(filterTree);
    setScanKey(request);
    setPageIndex(0);
  }, [filterTree, buildRequest]);

  /** Add a predicate to a group. */
  const addPredicate = useCallback((parentId: string) => {
    setFilterTree(tree => updateTree(tree, parentId, (group: GroupRow) => ({
      ...group,
      children: [...group.children, { ...EMPTY_PREDICATE, parentId: group.id }],
    })));
  }, []);

  /** Add a nested group to a group. */
  const addGroup = useCallback((parentId: string) => {
    setFilterTree(tree => updateTree(tree, parentId, (group: GroupRow) => ({
      ...group,
      children: [...group.children, {
        ...EMPTY_GROUP,
        id: crypto.randomUUID(),
        parentId: group.id,
        children: [{ ...EMPTY_PREDICATE, parentId: crypto.randomUUID() }],
      }],
    })));
  }, []);

  /** Remove a node (predicate or group). */
  const removeNode = useCallback((nodeId: string) => {
    setFilterTree(tree => removeFromTree(tree, nodeId));
  }, []);

  /** Toggle group operator between AND/OR. */
  const toggleOperator = useCallback((groupId: string) => {
    setFilterTree(tree => updateTree(tree, groupId, (group: GroupRow) => ({
      ...group,
      operator: group.operator === 'AND' ? 'OR' : 'AND',
    })));
  }, []);

  /** Update a predicate field. */
  const updatePredicate = useCallback((predicateId: string, field: keyof PredicateRow, value: string) => {
    setFilterTree(tree => updateTree(tree, predicateId, (pred: PredicateRow) => ({
      ...pred,
      [field]: value,
    })));
  }, []);

  /** Toggle group expanded state. */
  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  /** Save current filter as preset. */
  const savePreset = useCallback(() => {
    if (!presetName.trim()) return;
    const preset: SavedPreset = {
      name: presetName.trim(),
      universe,
      filters: buildFilterGroup(filterTree),
      tf: timeframe,
      createdAt: Date.now(),
    };
    const next = [...savedPresets, preset];
    setSavedPresets(next);
    localStorage.setItem('honba.screener.presets', JSON.stringify(next));
    setShowPresetModal(false);
    setPresetName('');
  }, [presetName, universe, filterTree, timeframe, savedPresets, buildFilterGroup]);

  /** Load a preset. */
  const loadPreset = useCallback((preset: SavedPreset) => {
    setUniverse(preset.universe);
    setTimeframe(preset.tf as TimeframeValue);
    setFilterTree(presetToTree(preset.filters));
    setPageIndex(0);
  }, []);

  /** Delete a preset. */
  const deletePreset = useCallback((name: string) => {
    const next = savedPresets.filter(p => p.name !== name);
    setSavedPresets(next);
    localStorage.setItem('honba.screener.presets', JSON.stringify(next));
  }, [savedPresets]);

  /** Apply universe preset. */
  const applyUniversePreset = useCallback((presetId: string) => {
    const preset = UNIVERSE_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setUniverse(JSON.stringify(preset.instruments, null, 2));
      setUniversePreset(presetId);
    }
  }, []);

  // --- Render helpers ---

  const renderFilterTree = useCallback((node: FilterNode, depth = 0): React.ReactNode => {
    if ('key' in node) {
      // PredicateRow
      const isSelected = selectedNodeId === node.id;
      return (
        <div
          key={node.id}
          className={`screener__predicate ${isSelected ? 'selected' : ''}`}
          style={{ marginLeft: depth * 24 }}
          onClick={() => setSelectedNodeId(node.id)}
        >
          <span className="screener__drag-handle">⋮⋮</span>
          <input
            className="screener__key"
            placeholder="metric key"
            value={node.key}
            onChange={e => updatePredicate(node.id, 'key', e.target.value)}
            onClick={e => e.stopPropagation()}
          />
          <select
            className="screener__op"
            value={node.op}
            onChange={e => updatePredicate(node.id, 'op', e.target.value)}
            onClick={e => e.stopPropagation()}
          >
            {OPS.map(op => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
          <input
            className="screener__value"
            placeholder={node.op === 'between' ? 'low, high' : node.op.startsWith('in') ? 'a,b,c' : 'value'}
            value={node.value}
            onChange={e => updatePredicate(node.id, 'value', e.target.value)}
            onClick={e => e.stopPropagation()}
          />
          <button
            className="screener__remove"
            onClick={e => { e.stopPropagation(); removeNode(node.id); }}
            aria-label="Remove predicate"
          >
            <X size={14} />
          </button>
        </div>
      );
    } else {
      // GroupRow
      const isExpanded = expandedGroups.has(node.id);
      const isSelected = selectedNodeId === node.id;
      return (
        <div key={node.id} style={{ marginLeft: depth * 24 }}>
          <div
            className={`screener__group-header ${isSelected ? 'selected' : ''}`}
            onClick={() => setSelectedNodeId(node.id)}
          >
            <button
              className="screener__group-toggle"
              onClick={e => { e.stopPropagation(); toggleGroup(node.id); }}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            <span className="screener__group-operator">
              {node.operator}
              <button
                className="screener__operator-toggle"
                onClick={e => { e.stopPropagation(); toggleOperator(node.id); }}
                aria-label={`Change to ${node.operator === 'AND' ? 'OR' : 'AND'}`}
              >
                {node.operator === 'AND' ? '∧' : '∨'}
              </button>
            </span>
            <div className="screener__group-actions">
              <button
                className="screener__icon-btn"
                onClick={e => { e.stopPropagation(); addPredicate(node.id); }}
                aria-label="Add predicate"
              >
                <Plus size={14} />
              </button>
              <button
                className="screener__icon-btn"
                onClick={e => { e.stopPropagation(); addGroup(node.id); }}
                aria-label="Add group"
              >
                <Filter size={14} />
              </button>
              {node.parentId && (
                <button
                  className="screener__icon-btn"
                  onClick={e => { e.stopPropagation(); removeNode(node.id); }}
                  aria-label="Remove group"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
          {isExpanded && (
            <div className="screener__group-children">
              {node.children.map(child => renderFilterTree(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }
  }, [expandedGroups, selectedNodeId, addPredicate, addGroup, removeNode, toggleOperator, updatePredicate, toggleGroup]);

  // --- Event handlers ---
  const handleUniverseChange = (value: string) => {
    setUniverse(value);
    setUniversePreset('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      runScan();
    }
  };

  // --- Render ---
  return (
    <div className="screener" onKeyDown={handleKeyDown}>
      <header className="screener__header">
        <div className="screener__header-left">
          <h2>Screener</h2>
          <p className="screener__hint">
            Server-side scan via <code>GET /screener/scan</code> — reads bars for each universe
            instrument and evaluates the filter group.
          </p>
        </div>
        <div className="screener__header-right">
          <button
            className="screener__icon-btn"
            onClick={() => setShowMetricCatalog(true)}
            aria-label="Open metric catalog"
          >
            <HelpCircle size={18} />
          </button>
        </div>
      </header>

      <form
        className="screener__controls"
        onSubmit={e => { e.preventDefault(); runScan(); }}
      >
        {/* Universe Section */}
        <section className="screener__section">
          <label className="screener__field screener__field--universe">
            <span>Universe (JSON array of instrument ids)</span>
            <div className="screener__universe-wrapper">
              <textarea
                className="screener__universe"
                placeholder={JSON.stringify(UNIVERSE_PRESETS[0].instruments.slice(0, 5), null, 2) + '…'}
                value={universe}
                onChange={e => handleUniverseChange(e.target.value)}
                rows={3}
                spellCheck={false}
              />
              <div className="screener__universe-presets">
                {UNIVERSE_PRESETS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    className={`screener__preset-btn ${universePreset === p.id ? 'active' : ''}`}
                    onClick={() => applyUniversePreset(p.id)}
                  >
                    {p.label} ({p.instruments.length})
                  </button>
                ))}
              </div>
            </div>
          </label>
        </section>

        {/* Timeframe & As-of */}
        <section className="screener__section screener__section--inline">
          <label className="screener__field">
            <span>Timeframe</span>
            <select value={timeframe} onChange={e => setTimeframe(e.target.value as TimeframeValue)}>
              {DEFAULT_TIMEFRAMES.map(tf => (
                <option key={tf} value={tf}>{tf}</option>
              ))}
            </select>
          </label>
          <label className="screener__field">
            <span>As of (ISO date, optional)</span>
            <input
              type="date"
              value={asOf}
              onChange={e => setAsOf(e.target.value)}
            />
          </label>
        </section>

        {/* Filter Tree */}
        <section className="screener__section">
          <div className="screener__filter-tree">
            <div className="screener__filter-toolbar">
              <span className="screener__filter-title">Filter Builder</span>
              <div className="screener__filter-hint">
                Build nested AND/OR groups. Click a row to select. Drag handle to reorder (coming soon).
              </div>
            </div>
            {renderFilterTree(filterTree, 0)}
          </div>
        </section>

        {/* Run Button */}
        <div className="screener__actions">
          <button
            type="button"
            className="screener__save-preset"
            onClick={() => setShowPresetModal(true)}
          >
            <Save size={16} /> Save Preset
          </button>
          <button
            type="submit"
            className="screener__run"
            disabled={scan.isFetching}
          >
            {scan.isFetching ? 'Scanning…' : 'Run Scan'}
          </button>
        </div>
      </form>

      {/* Results */}
      <section className="screener__results">
        {scan.error && (
          <div className="screener__error">
            Scan failed: {(scan.error as Error).message}
          </div>
        )}
        {scan.isFetching && (
          <div className="screener__pending">Scanning {universe ? '…' : 'universe…'}</div>
        )}
        {scan.data && (
          <>
            <div className="screener__results-toolbar">
              <div className="screener__results-info">
                {scan.data.rows.length} instrument{scan.data.rows.length !== 1 ? 's' : ''} matched
              </div>
              <div className="screener__results-actions">
                <button
                  className="screener__icon-btn"
                  onClick={() => {
                    const visibleKeys = metricKeys.filter(k => columnVisibility[k] !== false);
                    const csv = [
                      ['Instrument', ...visibleKeys].join(','),
                      ...scan.data.rows.map(row =>
                        [row.instrument_id.symbol + '.' + row.instrument_id.exchange, ...visibleKeys.map(k => row.metrics[k] ?? '')].join(',')
                      ),
                    ].join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `screener-results-${new Date().toISOString().slice(0, 10)}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download size={16} />
                </button>
                <button
                  className="screener__icon-btn"
                  onClick={() => setColumnVisibility(prev => {
                    const next = { ...prev };
                    metricKeys.forEach(k => next[k] = !next[k]);
                    return next;
                  })}
                >
                  <Columns size={16} />
                </button>
              </div>
            </div>
            <div className="screener__table-wrapper">
              <table className="screener__table">
                <thead>
                  <tr>
                    <th
                      className="screener__th"
                      onClick={() => setSortState(s => ({
                        key: 'instrument',
                        direction: s?.key === 'instrument' && s.direction === 'asc' ? 'desc' : 'asc',
                      }))}
                    >
                      Instrument
                      {sortState?.key === 'instrument' && (
                        sortState.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                      )}
                    </th>
                    {metricKeys
                      .filter(k => columnVisibility[k] !== false)
                      .map(key => (
                        <th
                          key={key}
                          className="screener__th"
                          onClick={() => setSortState(s => ({
                            key,
                            direction: s?.key === key && s.direction === 'asc' ? 'desc' : 'asc',
                          }))}
                        >
                          {key}
                          {sortState?.key === key && (
                            sortState.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                          )}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {scan.data.rows
                    .slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
                    .map(row => (
                      <tr key={`${row.instrument_id.exchange}:${row.instrument_id.symbol}`}>
                        <td className="screener__instrument">
                          {row.instrument_id.symbol} · {row.instrument_id.exchange}
                        </td>
                        {metricKeys
                          .filter(k => columnVisibility[k] !== false)
                          .map(key => (
                            <td key={key} className="screener__metric">
                              {row.metrics[key] == null ? '—' : formatMetric(row.metrics[key]!, key)}
                            </td>
                          ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {scan.data.rows.length > pageSize && (
              <div className="screener__pagination">
                <button
                  onClick={() => setPageIndex(p => Math.max(0, p - 1))}
                  disabled={pageIndex === 0}
                >
                  <ChevronLeft size={16} />
                </button>
                <span>
                  Page {pageIndex + 1} of {Math.ceil(scan.data.rows.length / pageSize)}
                </span>
                <button
                  onClick={() => setPageIndex(p => Math.min(Math.ceil(scan.data.rows.length / pageSize) - 1, p + 1))}
                  disabled={(pageIndex + 1) * pageSize >= scan.data.rows.length}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
        {scan.data && scan.data.rows.length === 0 && !scan.isFetching && (
          <p className="screener__hint">No instruments passed the filter.</p>
        )}
        {!scan.data && !scan.error && !scan.isFetching && (
          <div className="screener__empty">
            <Filter size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p>Enter a universe, build a filter, and run a scan.</p>
            <p className="screener__hint">
              Supported metrics: open, high, low, close, volume, rsi, sma{'<N>'},
              price_52_week_high, price_52_week_low
            </p>
          </div>
        )}
      </section>

      {/* Metric Catalog Modal */}
      {showMetricCatalog && (
        <div className="screener__modal-overlay" onClick={() => setShowMetricCatalog(false)}>
          <div className="screener__modal" onClick={e => e.stopPropagation()}>
            <div className="screener__modal-header">
              <h3>Metric Catalog</h3>
              <button className="screener__modal-close" onClick={() => setShowMetricCatalog(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="screener__modal-body">
              <input
                type="search"
                className="screener__catalog-search"
                placeholder="Search metrics…"
                value={metricSearch}
                onChange={e => setMetricSearch(e.target.value)}
              />
              <div className="screener__catalog-list">
                {MetricCatalog
                  .filter(m => m.key.toLowerCase().includes(metricSearch.toLowerCase()) ||
                    m.label.toLowerCase().includes(metricSearch.toLowerCase()) ||
                    m.description?.toLowerCase().includes(metricSearch.toLowerCase()))
                  .map(metric => (
                    <button
                      key={metric.key}
                      className="screener__catalog-item"
                      onClick={() => {
                        // Insert metric key at selected predicate or first empty
                        const emptyPred = flattenPredicates(filterTree).find(p => !p.key.trim());
                        if (emptyPred) {
                          updatePredicate(emptyPred.id, 'key', metric.key);
                        } else {
                          addPredicate(filterTree.id);
                          setTimeout(() => {
                            const newEmpty = flattenPredicates(filterTree).find(p => !p.key.trim());
                            if (newEmpty) updatePredicate(newEmpty.id, 'key', metric.key);
                          }, 0);
                        }
                        setShowMetricCatalog(false);
                      }}
                    >
                      <div className="screener__catalog-item-main">
                        <span className="screener__catalog-key">{metric.key}</span>
                        <span className="screener__catalog-label">{metric.label}</span>
                      </div>
                      <div className="screener__catalog-meta">
                        {metric.group && <span className="screener__catalog-group">{metric.group}</span>}
                        {metric.defaultTimeframe && <span className="screener__catalog-tf">{metric.defaultTimeframe}</span>}
                      </div>
                      {metric.description && (
                        <div className="screener__catalog-desc">{metric.description}</div>
                      )}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Preset Modal */}
      {showPresetModal && (
        <div className="screener__modal-overlay" onClick={() => setShowPresetModal(false)}>
          <div className="screener__modal" onClick={e => e.stopPropagation()}>
            <div className="screener__modal-header">
              <h3>Save Filter Preset</h3>
              <button className="screener__modal-close" onClick={() => setShowPresetModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="screener__modal-body">
              <input
                type="text"
                className="screener__preset-name"
                placeholder="Preset name"
                value={presetName}
                onChange={e => setPresetName(e.target.value)}
                autoFocus
              />
              <div className="screener__preset-preview">
                <strong>Universe:</strong> {universe.split('\n')[0]}…<br />
                <strong>Predicates:</strong> {flattenPredicates(filterTree).filter(p => p.key.trim()).length}<br />
                <strong>Timeframe:</strong> {timeframe}
              </div>
            </div>
            <div className="screener__modal-footer">
              <button onClick={() => setShowPresetModal(false)}>Cancel</button>
              <button className="screener__btn-primary" onClick={savePreset} disabled={!presetName.trim()}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Presets Panel */}
      {savedPresets.length > 0 && (
        <section className="screener__section screener__section--presets">
          <div className="screener__presets-header">
            <h4><FolderOpen size={16} /> Saved Presets</h4>
          </div>
          <div className="screener__presets-list">
            {savedPresets.map(preset => (
              <div key={preset.name} className="screener__preset-row">
                <div className="screener__preset-info" onClick={() => loadPreset(preset)}>
                  <strong>{preset.name}</strong>
                  <span className="screener__preset-meta">
                    {preset.filters.items?.length || 0} predicates · {preset.tf}
                  </span>
                </div>
                <button
                  className="screener__icon-btn"
                  onClick={() => deletePreset(preset.name)}
                  aria-label={`Delete preset ${preset.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** Tree update helper. */
function updateTree<T extends FilterNode>(
  tree: GroupRow,
  targetId: string,
  updater: (node: T) => T
): GroupRow {
  if (tree.id === targetId) return updater(tree as any) as any;
  return {
    ...tree,
    children: tree.children.map(child =>
      'key' in child
        ? child.id === targetId ? updater(child as any) : child
        : updateTree(child, targetId, updater)
    ),
  };
}

/** Tree removal helper. */
function removeFromTree(tree: GroupRow, targetId: string): GroupRow {
  if (tree.id === targetId) return EMPTY_GROUP;
  return {
    ...tree,
    children: tree.children
      .filter(child => child.id !== targetId)
      .map(child => 'key' in child ? child : removeFromTree(child, targetId)),
  };
}

/** Convert wire filter group to UI tree. */
function presetToTree(group: ScreenerFilterGroup): GroupRow {
  const convert = (g: ScreenerFilterGroup, parentId = ''): GroupRow => {
    const id = crypto.randomUUID();
    return {
      id,
      operator: g.operator as 'AND' | 'OR',
      parentId,
      children: g.items.map(item => {
        if ('key' in item && 'op' in item) {
          // Predicate (ScreenerFilterItem)
          return {
            id: crypto.randomUUID(),
            key: item.key,
            op: item.op,
            value: Array.isArray(item.value) ? item.value.join(', ') : String(item.value ?? ''),
            parentId: id,
          };
        } else {
          // Nested group (ScreenerFilterGroup)
          return convert(item as ScreenerFilterGroup, id);
        }
      }),
    };
  };
  return convert(group);
}

/** Format metric value for display. */
function formatMetric(value: any, key: string): string {
  if (typeof value === 'number') {
    if (key.startsWith('sma') || key.includes('price') || key.includes('close') || key.includes('open') ||
        key.includes('high') || key.includes('low') || key.includes('ema') || key.includes('vwap')) {
      return value.toFixed(2);
    }
    if (key.includes('volume')) return value.toLocaleString();
    if (key.includes('rsi') || key.includes('pct') || key.includes('change')) return value.toFixed(2);
    return value.toFixed(4);
  }
  return String(value);
}
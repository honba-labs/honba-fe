import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Search,
  Check,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import './configurable-table.css';
import type {
  TableColumn,
  ConfigurableTableProps,
  SortState,
  SortOrder,
} from './types';

export function ConfigurableTable<T>({
  data,
  columns: initialColumns,
  keyExtractor,
  onColumnsChange,
  title,
  activeRowKey,
  onRowClick,
  onRowDoubleClick,
  sortState: controlledSortState,
  onSortChange,
  searchQuery: controlledSearchQuery,
  onSearchChange,
  searchPlaceholder = 'Search...',
  pagination = false,
  pageSize: initialPageSize = 50,
  pageSizeOptions = [25, 50, 100, 250, 0],
  currentPage: controlledCurrentPage,
  onPageChange,
  onPageSizeChange,
  totalItemsLabel = 'items',
  emptyTitle = 'No data available',
  emptySubtitle = 'No matching records found.',
  emptyAction,
  enableColumnConfig = true,
  extraHeaderActions,
  extraToolbar,
  className = '',
  style,
  compact = false,
}: ConfigurableTableProps<T>) {
  // Column visibility and order state
  const [columns, setColumns] = useState<TableColumn<T>[]>(initialColumns);
  useEffect(() => {
    setColumns(initialColumns);
  }, [initialColumns]);

  const updateColumns = (newCols: TableColumn<T>[]) => {
    setColumns(newCols);
    onColumnsChange?.(newCols);
  };

  // Internal Sorting State
  const [internalSortState, setInternalSortState] = useState<SortState>({
    columnId: '',
    order: null,
  });
  const currentSortState = controlledSortState ?? internalSortState;

  const handleSortToggle = (columnId: string) => {
    let nextOrder: SortOrder = 'asc';
    if (currentSortState.columnId === columnId) {
      if (currentSortState.order === 'asc') nextOrder = 'desc';
      else if (currentSortState.order === 'desc') nextOrder = null;
    }

    const nextState: SortState = {
      columnId: nextOrder ? columnId : '',
      order: nextOrder,
    };

    if (onSortChange) {
      onSortChange(nextState);
    } else {
      setInternalSortState(nextState);
    }
  };

  // Internal Search State
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const currentSearch = controlledSearchQuery ?? internalSearchQuery;
  const handleSearch = (q: string) => {
    if (onSearchChange) {
      onSearchChange(q);
    } else {
      setInternalSearchQuery(q);
    }
  };

  // Internal Pagination State
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(initialPageSize);
  const activePage = controlledCurrentPage ?? internalPage;
  const activePageSize = onPageSizeChange ? initialPageSize : internalPageSize;

  const setPage = (p: number) => {
    if (onPageChange) onPageChange(p);
    else setInternalPage(p);
  };

  const setPageSize = (s: number) => {
    if (onPageSizeChange) onPageSizeChange(s);
    else {
      setInternalPageSize(s);
      setInternalPage(1);
    }
  };

  // Column Configuration Modal State
  const [isColModalOpen, setIsColModalOpen] = useState(false);
  const [colSearchQuery, setColSearchQuery] = useState('');

  // Visible columns
  const visibleColumns = useMemo(
    () => columns.filter((col) => col.visible !== false),
    [columns]
  );

  // Filtered & Sorted Data (if sorting/filtering is not handled externally)
  const processedData = useMemo(() => {
    let result = [...data];

    // Local search filter if controlledSearchQuery is NOT used by parent
    if (!onSearchChange && currentSearch.trim()) {
      const q = currentSearch.toLowerCase().trim();
      result = result.filter((row) => {
        return visibleColumns.some((col) => {
          const val = col.accessor ? col.accessor(row) : (row as any)[col.id];
          return val !== undefined && val !== null && String(val).toLowerCase().includes(q);
        });
      });
    }

    // Local sort if onSortChange is NOT used by parent
    if (!onSortChange && currentSortState.columnId && currentSortState.order) {
      const col = columns.find((c) => c.id === currentSortState.columnId);
      if (col) {
        result.sort((a, b) => {
          const valA = col.accessor ? col.accessor(a) : (a as any)[col.id];
          const valB = col.accessor ? col.accessor(b) : (b as any)[col.id];

          if (valA === valB) return 0;
          if (valA === undefined || valA === null) return 1;
          if (valB === undefined || valB === null) return -1;

          let comp = 0;
          if (typeof valA === 'number' && typeof valB === 'number') {
            comp = valA - valB;
          } else {
            comp = String(valA).localeCompare(String(valB));
          }
          return currentSortState.order === 'asc' ? comp : -comp;
        });
      }
    }

    return result;
  }, [data, currentSearch, currentSortState, onSearchChange, onSortChange, columns, visibleColumns]);

  // Pagination calculation
  const totalItems = processedData.length;
  const maxPage = activePageSize === 0 ? 1 : Math.max(1, Math.ceil(totalItems / activePageSize));
  const validPage = Math.min(activePage, maxPage);

  const paginatedData = useMemo(() => {
    if (!pagination || activePageSize === 0) return processedData;
    const start = (validPage - 1) * activePageSize;
    return processedData.slice(start, start + activePageSize);
  }, [processedData, pagination, validPage, activePageSize]);

  // Modal helpers
  const handleToggleColumn = (colId: string) => {
    const next = columns.map((col) =>
      col.id === colId ? { ...col, visible: col.visible === false } : col
    );
    updateColumns(next);
  };

  const handleResetColumns = () => {
    const next = columns.map((col) => ({ ...col, visible: true }));
    updateColumns(next);
  };

  const modalFilteredColumns = useMemo(() => {
    if (!colSearchQuery.trim()) return columns;
    const q = colSearchQuery.toLowerCase().trim();
    return columns.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        (c.category && c.category.toLowerCase().includes(q))
    );
  }, [columns, colSearchQuery]);

  return (
    <div className={`hb-table-wrapper ${className}`} style={style}>
      {/* Optional Toolbar */}
      {(title || extraToolbar || extraHeaderActions) && (
        <div className="hb-table-toolbar-strip">
          <div className="hb-table-toolbar-left">
            {title && <span className="hb-table-title">{title}</span>}
            {extraToolbar}
          </div>
          <div className="hb-table-toolbar-right">
            {extraHeaderActions}
            {enableColumnConfig && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setIsColModalOpen(true)}
                title="Configure table columns"
              >
                <SlidersHorizontal size={13} />
                <span>Columns</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Table Scroll Arena */}
      <div className="hb-table-scroll-arena">
        <table className={`hb-screener-table ${compact ? 'compact' : ''}`}>
          <thead>
            <tr>
              {visibleColumns.map((col) => {
                const align = col.align ?? 'left';
                const alignClass = `align-${align}`;
                const isSorted = currentSortState.columnId === col.id;
                const isSortable = col.sortable !== false;
                const stickyClass = col.stickyLeft ? 'sticky-col' : '';

                return (
                  <th
                    key={col.id}
                    className={`${alignClass} ${stickyClass} ${isSortable ? 'sortable' : ''} ${
                      col.headerClassName ?? ''
                    }`}
                    style={{
                      width: col.width,
                      minWidth: col.minWidth,
                      maxWidth: col.maxWidth,
                    }}
                    onClick={isSortable ? () => handleSortToggle(col.id) : undefined}
                    title={col.tooltip ?? (isSortable ? `Sort by ${col.label}` : undefined)}
                  >
                    <div className={`hb-th-inner ${alignClass}`}>
                      <span>{col.label}</span>
                      {isSorted && (
                        <span style={{ fontSize: 10, color: 'var(--text-primary)', marginLeft: 3 }}>
                          {currentSortState.order === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}

              {/* Trailing Add Column (+) Header Button */}
              {enableColumnConfig && (
                <th
                  className="hb-th-add-col"
                  onClick={() => setIsColModalOpen(true)}
                  title="Add / Remove columns"
                >
                  <Plus size={14} />
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + (enableColumnConfig ? 1 : 0)}
                  style={{ padding: 0 }}
                >
                  <div className="hb-table-empty-wrap">
                    <div className="hb-table-empty-title">{emptyTitle}</div>
                    <div className="hb-table-empty-sub">{emptySubtitle}</div>
                    {emptyAction && <div style={{ marginTop: 12 }}>{emptyAction}</div>}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => {
                const rowKey = keyExtractor(row, index);
                const isSelected = activeRowKey === rowKey;
                const isClickable = Boolean(onRowClick || onRowDoubleClick);

                return (
                  <tr
                    key={rowKey}
                    className={`tv-row ${isClickable ? 'clickable' : ''} ${
                      isSelected ? 'row-selected' : ''
                    }`}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onDoubleClick={
                      onRowDoubleClick ? () => onRowDoubleClick(row) : undefined
                    }
                  >
                    {visibleColumns.map((col) => {
                      const align = col.align ?? 'left';
                      const alignClass = `align-${align}`;
                      const stickyClass = col.stickyLeft ? 'sticky-col' : '';

                      let content: React.ReactNode;
                      if (col.render) {
                        content = col.render(row, index);
                      } else if (col.accessor) {
                        content = col.accessor(row);
                      } else {
                        const val = (row as any)[col.id];
                        content = val !== undefined && val !== null ? String(val) : '—';
                      }

                      return (
                        <td
                          key={col.id}
                          className={`${alignClass} ${stickyClass} ${col.cellClassName ?? ''}`}
                          style={{
                            width: col.width,
                            minWidth: col.minWidth,
                            maxWidth: col.maxWidth,
                          }}
                        >
                          {content}
                        </td>
                      );
                    })}

                    {enableColumnConfig && <td style={{ width: 38 }} />}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination && (
        <div className="table-pagination-footer">
          <div className="pagination-info">
            Page <strong>{validPage}</strong> of <strong>{maxPage}</strong> ({totalItems.toLocaleString()} {totalItemsLabel})
          </div>

          <div className="pagination-controls">
            <button
              type="button"
              className="pagination-btn"
              disabled={validPage <= 1}
              onClick={() => setPage(validPage - 1)}
              title="Previous Page"
            >
              <ChevronLeft size={14} />
            </button>

            <span className="pagination-page-indicator">{validPage}</span>

            <button
              type="button"
              className="pagination-btn"
              disabled={validPage >= maxPage}
              onClick={() => setPage(validPage + 1)}
              title="Next Page"
            >
              <ChevronRight size={14} />
            </button>

            <div className="page-size-selector">
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Rows:</span>
              <select
                value={activePageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="page-size-select"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === 0 ? 'All' : opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Column Customization Modal */}
      {isColModalOpen && (
        <div className="hb-col-picker-overlay" onClick={() => setIsColModalOpen(false)}>
          <div className="hb-col-picker-card" onClick={(e) => e.stopPropagation()}>
            <div className="hb-col-picker-header">
              <div className="hb-col-picker-title">
                <SlidersHorizontal size={15} color="var(--accent-primary, #2962ff)" />
                <span>Customize Table Columns</span>
              </div>
              <button
                type="button"
                className="hb-col-picker-close"
                onClick={() => setIsColModalOpen(false)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="hb-col-picker-search">
              <div className="hb-col-search-box">
                <Search size={13} style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search columns..."
                  value={colSearchQuery}
                  onChange={(e) => setColSearchQuery(e.target.value)}
                  className="hb-col-search-input"
                  autoFocus
                />
                {colSearchQuery && (
                  <button
                    type="button"
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    onClick={() => setColSearchQuery('')}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            <div className="hb-col-picker-body">
              {modalFilteredColumns.map((col) => {
                const isChecked = col.visible !== false;

                return (
                  <div
                    key={col.id}
                    className={`hb-col-toggle-item ${isChecked ? 'checked' : ''}`}
                    onClick={() => handleToggleColumn(col.id)}
                  >
                    <div className="hb-col-toggle-left">
                      <div className="hb-col-chk">
                        {isChecked && <Check size={12} strokeWidth={3} />}
                      </div>
                      <span className="hb-col-toggle-lbl">{col.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hb-col-picker-footer">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleResetColumns}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                <RotateCcw size={12} />
                <span>Reset All</span>
              </button>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setIsColModalOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

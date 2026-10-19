import React from 'react';

export type ColumnAlignment = 'left' | 'right' | 'center';

export interface TableColumn<T> {
  id: string;
  label: string;
  category?: string;
  visible?: boolean;
  align?: ColumnAlignment;
  width?: number | string;
  minWidth?: number | string;
  maxWidth?: number | string;
  sortable?: boolean;
  sortKey?: string;
  tooltip?: string;
  stickyLeft?: boolean;
  headerClassName?: string;
  cellClassName?: string;
  render?: (row: T, index: number) => React.ReactNode;
  accessor?: (row: T) => any;
}

export type SortOrder = 'asc' | 'desc' | null;

export interface SortState {
  columnId: string;
  order: SortOrder;
}

export interface ConfigurableTableProps<T> {
  data: readonly T[];
  columns: TableColumn<T>[];
  keyExtractor: (row: T, index: number) => string;
  onColumnsChange?: (columns: TableColumn<T>[]) => void;
  title?: string;
  activeRowKey?: string | null;
  onRowClick?: (row: T) => void;
  onRowDoubleClick?: (row: T) => void;
  sortState?: SortState;
  onSortChange?: (sortState: SortState) => void;
  // Search
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  // Pagination
  pagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  totalItemsLabel?: string;
  // Empty state
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyAction?: React.ReactNode;
  // Actions
  enableColumnConfig?: boolean;
  extraHeaderActions?: React.ReactNode;
  extraToolbar?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  stickyHeader?: boolean;
  compact?: boolean;
}

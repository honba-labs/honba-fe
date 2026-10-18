// @honba/ui-core — ported/modernized from bfx-hf-ui-core (see ../NOTICE.md).
// Batch A (docs/tasks.md): atomic primitives ported from bfx-hf-ui-core's src/ui/*.
export { AttentionBar } from './ui/AttentionBar';
export type { AttentionBarProps, AttentionBarTone } from './ui/AttentionBar';

export { Button } from './ui/Button';
export type { ButtonProps, ButtonVariant } from './ui/Button';

export { DatePicker } from './ui/DatePicker';
export type { DatePickerProps } from './ui/DatePicker';

export { Dropdown } from './ui/Dropdown';
export type { DropdownOption, DropdownProps } from './ui/Dropdown';

export { Indicator } from './ui/Indicator';
export type { IndicatorColor, IndicatorProps } from './ui/Indicator';

export { Input } from './ui/Input';
export type { InputProps } from './ui/Input';

export { Modal } from './ui/Modal';
export type { ModalProps } from './ui/Modal';

export { Panel } from './ui/Panel';
export type { PanelProps } from './ui/Panel';

export { PanelSettings } from './ui/PanelSettings';
export type { PanelSettingsProps } from './ui/PanelSettings';

export { PLNumber } from './ui/PLNumber';
export type { PLNumberProps } from './ui/PLNumber';

export { ProgressBar } from './ui/ProgressBar';
export type { ProgressBarProps } from './ui/ProgressBar';

export { RadioButton } from './ui/RadioButton';
export type { RadioButtonProps } from './ui/RadioButton';

export { Scrollbars } from './ui/Scrollbars';
export type { ScrollbarsProps } from './ui/Scrollbars';

export { SimpleDropdown } from './ui/SimpleDropdown';
export type { SimpleDropdownProps } from './ui/SimpleDropdown';

export { Tabs } from './ui/Tabs';
export type { TabItem, TabsProps } from './ui/Tabs';

// Batch B (docs/tasks.md): hooks ported from bfx-hf-ui-core's src/hooks/*.
export { useToggle } from './hooks/useToggle';
export type { UseToggleResult } from './hooks/useToggle';

export { useSize } from './hooks/useSize';
export type { ElementSize, UseSizeResult } from './hooks/useSize';

export { useHover } from './hooks/useHover';
export type { UseHoverResult } from './hooks/useHover';

export { useCountdown } from './hooks/useCountdown';
export type { UseCountdownResult } from './hooks/useCountdown';

export { useModalFocus } from './hooks/useModalFocus';
export type { UseModalFocusOptions } from './hooks/useModalFocus';

// Batch C (docs/tasks.md): market/trading display widgets ported from bfx-hf-ui-core's
// src/components/{OrderBook,OrderBookPanel,Chart,ChartPanel,MarketSelect,TimeFrameDropdown,
// ExchangeInfoBar,StatusBar}.
export { OrderBook } from './market/OrderBook';
export type { OrderBookProps, PriceLevel, OrderBookData } from './market/OrderBook';

export { OrderBookPanel } from './market/OrderBookPanel';
export type { OrderBookPanelProps } from './market/OrderBookPanel';

export { ChartPanel } from './market/ChartPanel';
export type { ChartPanelProps } from './market/ChartPanel';

export { MarketSelect } from './market/MarketSelect';
export type { MarketSelectProps, MarketOption } from './market/MarketSelect';

export { TimeFrameDropdown, DEFAULT_TIMEFRAMES } from './market/TimeFrameDropdown';
export type { TimeFrameDropdownProps } from './market/TimeFrameDropdown';

export { InstrumentInfoBar } from './market/InstrumentInfoBar';
export type { InstrumentInfoBarProps } from './market/InstrumentInfoBar';

export { StatusBar } from './market/StatusBar';
export type { StatusBarProps } from './market/StatusBar';

// Batch D (docs/tasks.md): order entry ported from bfx-hf-ui-core's src/components/OrderForm
// (order ticket slice only — see trading/OrderForm/OrderForm.tsx header for what was dropped).
export { OrderForm, validateOrderFields } from './trading/OrderForm';
export type {
  OrderFormProps,
  OrderDraft,
  OrderSide,
  OrderType,
  TimeInForce,
  InstrumentId,
  OrderFormFieldErrors,
} from './trading/OrderForm';

// Batch D (docs/tasks.md): orders table ported/folded from bfx-hf-ui-core's src/components/
// {OrderHistory,AtomicOrdersTable,AtomicOrdersTablePanel,AlgoOrdersTable,AlgoOrdersTablePanel,
// AlgoOrdersHistoryButton} — one shared `OrdersTable` (statusFilter: 'open'|'history'|'all')
// instead of separate atomic/algo/history components; see
// `trading/OrdersTable/OrdersTable.tsx`'s header comment for why.
export { OrdersTable } from './trading/OrdersTable';
export type {
  OrdersTableProps,
  OrdersTableStatusFilter,
  Order,
  OrderStatus,
  OrderRowSide,
} from './trading/OrdersTable';

export { OrdersTablePanel } from './trading/OrdersTablePanel';
export type { OrdersTablePanelProps } from './trading/OrdersTablePanel';

// Batch D (docs/tasks.md): positions table ported from bfx-hf-ui-core's src/components/
// {PositionsTable,PositionsTable.columns} — row type covers both the bare `Position` shape
// (`POST /positions/close`'s response) and the richer valued `PortfolioPosition` shape that
// `GET /portfolio/positions` actually returns (see `trading/PositionsTable/PositionsTable.tsx`'s
// header comment for the schema nuance this uncovered vs. this task's brief).
export { PositionsTable, formatMoney } from './trading/PositionsTable';
export type {
  PositionsTableProps,
  PositionRow,
  PositionSide,
  PositionProduct,
  Money,
} from './trading/PositionsTable';

export { PositionsTablePanel } from './trading/PositionsTablePanel';
export type { PositionsTablePanelProps } from './trading/PositionsTablePanel';

// Batch D (docs/tasks.md): balances table ported from bfx-hf-ui-core's src/components/
// {BalancesTable,BalancesTable.columns} — honba has no flat per-currency balance row, so this
// renders one row per `PortfolioAccount` (`GET /portfolio/accounts`) with its `holdings`
// explorable via an expand toggle; see `trading/BalancesTable/BalancesTable.tsx`'s header comment.
export { BalancesTable } from './trading/BalancesTable';
export type {
  BalancesTableProps,
  PortfolioAccount,
  PortfolioHolding,
  PortfolioMode,
  PortfolioGreeks,
} from './trading/BalancesTable';

export { BalancesTablePanel } from './trading/BalancesTablePanel';
export type { BalancesTablePanelProps } from './trading/BalancesTablePanel';

// Batch D (docs/tasks.md): trades table ported from bfx-hf-ui-core's src/components/
// TradesTablePanel -> `GET /portfolio/trades`'s `TradesResponse { trades: Trade[] }` (schema
// confirmed as the brief described -- no correction needed). `Money`/`formatMoney` are reused
// from `./trading/PositionsTable` rather than re-exported again here -- see
// `trading/TradesTablePanel/TradesTablePanel.tsx`'s header comment.
export { TradesTablePanel } from './trading/TradesTablePanel';
export type { TradesTablePanelProps, Trade, UnixNanos } from './trading/TradesTablePanel';

// Batch D (docs/tasks.md): trading-state control panel for honba's `GET`/`PUT /trading-state`
// (active/reducing/halted operator switch). Named after bfx-hf-ui-core's `TradingStatePanel` per
// docs/tasks.md's mapping, but built from scratch against honba's endpoint -- the reference
// component of the same name is an unrelated tabbed positions/orders/balances dashboard; see
// `trading/TradingStatePanel/TradingStatePanel.tsx`'s header comment for the full explanation.
export { TradingStatePanel } from './trading/TradingStatePanel';
export type { TradingStatePanelProps, TradingState } from './trading/TradingStatePanel';

// Batch E (docs/tasks.md): strategy/algo-builder & backtest widgets ported from bfx-hf-ui-core's
// src/components/{StrategyPerfomanceMetrics,StrategyTradesTable,StrategiesListTable,
// BacktestOptionsPanel,BacktestProgressBar}. `StrategyEditor`/`StrategyLiveChart` are NOT ports
// (AlgoDesigner's editing surface comes from honba-frontend's graph editor + Monaco;
// strategy charts reuse Batch C's ChartPanel) — see strategy/*'s per-file header comments for
// what was dropped and why.
export { PerformanceMetrics } from './strategy/PerformanceMetrics';
export type {
  PerformanceMetricsProps,
  PerformanceMetric,
  PerformanceMetricTone,
} from './strategy/PerformanceMetrics';

export { StrategyTradesTable } from './strategy/StrategyTradesTable';
export type {
  StrategyTradesTableProps,
  StrategyTradeRow,
  TradeRowSide,
} from './strategy/StrategyTradesTable';

export { StrategiesListTable } from './strategy/StrategiesListTable';
export type {
  StrategiesListTableProps,
  StrategyListItem,
  StrategyListKind,
} from './strategy/StrategiesListTable';

export { BacktestProgressBar } from './strategy/BacktestProgressBar';
export type { BacktestProgressBarProps } from './strategy/BacktestProgressBar';

export { BacktestOptionsPanel } from './strategy/BacktestOptionsPanel';
export type {
  BacktestOptionsPanelProps,
  BacktestConfig,
  BacktestPositionMode,
} from './strategy/BacktestOptionsPanel';

// Batch F (docs/tasks.md): app-shell & layout-chrome primitives ported from bfx-hf-ui-core's
// src/components/{Layout,CrashHandler,NotificationsSidebar,LayoutControlToolbar}. Layout chrome
// primitives + the crash screen + the presentational notification sidebar/toasts live here;
// the composed top nav / status bar / notifications store are apps/web's (Batch F brief:
// notifications are app state — the Zustand store lives in apps/web/src/core/store, not here).
// Electron-only reference pieces (SwitchMode, FullscreenModeBar, AppUpdateBar, HFUI,
// HFUIWrapper) are skipped per the brief; dockview-react powers the dockable layouts below
// this layer (decision recorded in docs/plan.md §3.3).
export { Layout, LayoutHeader, LayoutMain, LayoutFooter } from './shell/Layout';
export type { LayoutProps, LayoutSlotProps } from './shell/Layout';

export { CrashHandler } from './shell/CrashHandler';
export type { CrashHandlerProps } from './shell/CrashHandler';

export {
  NotificationList,
  NotificationsSidebar,
  NotificationToasts,
  formatNotificationTime,
} from './shell/NotificationsSidebar';
export type {
  NotificationListProps,
  NotificationsSidebarProps,
  NotificationToastsProps,
  NotificationRow,
  NotificationSeverity,
} from './shell/NotificationsSidebar';

export { LayoutControlToolbar } from './shell/LayoutControlToolbar';
export type { LayoutControlToolbarProps, LayoutSummary } from './shell/LayoutControlToolbar';

// Batch G (docs/tasks.md): the modal subset — only the reference modals that map onto honba
// concepts are ported (built on Batch A's Modal primitive; each takes isOpen/onClose +
// domain props, none read global state). Renames per the brief:
// CcyInfoModal → InstrumentInfoModal, ActiveAlgoOrdersModal → ActiveOrdersModal,
// AlgoOrderDetailsModal → OrderDetailsModal. Skipped: the Bitfinex-lifecycle set
// (DMSRemoval/OldFormat/LongTermClosedSession/CloseSession/NoConnectionAction/ResetAPIKeys/
// ResetDataConfirm/AOPause/DiscardAOEdit — some may resurface as AlgoDesigner dialogs) and
// RefillBalanceModal (a stub in the reference — empty callbacks — and honba has no
// paper-balance reset flow to confirm; revisit when one exists). APIKeysConfigurateForm is
// not a port — it becomes the broker-connection Settings form in Batch I.
export { ClosePositionModal } from './modals/ClosePositionModal';
export type { ClosePositionModalProps } from './modals/ClosePositionModal';

export { InstrumentInfoModal } from './modals/InstrumentInfoModal';
export type { InstrumentInfoArticle, InstrumentInfoModalProps } from './modals/InstrumentInfoModal';

export { EditOrderModal } from './modals/EditOrderModal';
export type { EditOrderModalProps, OrderPatch } from './modals/EditOrderModal';

export { AppSettingsModal } from './modals/AppSettingsModal';
export type { AppSettings, AppSettingsModalProps, ThemeSetting } from './modals/AppSettingsModal';

export { ActiveOrdersModal } from './modals/ActiveOrdersModal';
export type { ActiveOrdersModalProps } from './modals/ActiveOrdersModal';

export { OrderDetailsModal } from './modals/OrderDetailsModal';
export type { OrderDetailsModalProps } from './modals/OrderDetailsModal';

export const UI_CORE_VERSION = '0.1.0';

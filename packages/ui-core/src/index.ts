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

export const UI_CORE_VERSION = '0.1.0';

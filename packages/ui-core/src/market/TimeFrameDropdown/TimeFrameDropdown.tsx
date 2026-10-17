// Ported/modernized from bfx-hf-ui-core's src/components/TimeFrameDropdown (Apache-2.0).
// The original wraps the project's own `ui/Dropdown` with a fixed `util/time_frames` list and
// i18next labels (`t('time.${time}')`); i18n is out of scope for honba-fe v1 (docs/plan.md §4),
// so this ports the same "Dropdown over a timeframe list" shape with plain-English labels and a
// caller-supplied `timeframes` list instead of a hardcoded import.
import { Dropdown } from '../../ui/Dropdown';
import type { DropdownOption } from '../../ui/Dropdown';

/** Timeframe codes shown when the caller doesn't supply its own list. */
export const DEFAULT_TIMEFRAMES = ['1m', '5m', '15m', '1h', '1d', '1w'] as const;

export interface TimeFrameDropdownProps {
  value: string;
  onChange: (timeframe: string) => void;
  timeframes?: readonly string[];
  disabled?: boolean;
  className?: string;
}

export function TimeFrameDropdown({
  value,
  onChange,
  timeframes = DEFAULT_TIMEFRAMES,
  disabled = false,
  className,
}: TimeFrameDropdownProps) {
  const options: DropdownOption[] = timeframes.map((timeframe) => ({
    label: timeframe.toUpperCase(),
    value: timeframe,
  }));

  return (
    <Dropdown
      options={options}
      value={value}
      onChange={onChange}
      placeholder="Select a time frame"
      disabled={disabled}
      className={className}
    />
  );
}

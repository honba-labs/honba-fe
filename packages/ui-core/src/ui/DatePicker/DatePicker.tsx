// Ported/modernized from bfx-hf-ui-core's src/ui/DatePicker (Apache-2.0).
// The original wrapped `react-datepicker` plus Bitfinex's own i18n/redux/Tooltip stack (locale
// from a Redux selector, a `@ufx-ui/core` Tooltip, a portal component). None of that is a
// dependency of honba-fe, so this is a from-scratch, dependency-free re-implementation on top of
// the browser's native `<input type="datetime-local">`, keeping the same
// value/onChange/minDate/maxDate/label/disabled/validationError contract.
import { useId, type ChangeEvent } from 'react';
import clsx from 'clsx';

import './DatePicker.css';

function toInputValue(date: Date | null): string {
  if (!date) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export interface DatePickerProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  validationError?: string;
}

export function DatePicker({
  value = null,
  onChange,
  label = '',
  minDate,
  maxDate,
  disabled = false,
  validationError = '',
}: DatePickerProps) {
  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    if (!raw) {
      onChange(null);
      return;
    }
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      onChange(null);
      return;
    }
    if (minDate && date.getTime() < minDate.getTime()) {
      onChange(minDate);
      return;
    }
    if (maxDate && date.getTime() > maxDate.getTime()) {
      onChange(maxDate);
      return;
    }
    onChange(date);
  };

  const inputId = useId();

  return (
    <div className={clsx('hb-datepicker', { disabled, invalid: !!validationError })}>
      {label && (
        <label className="hb-datepicker__label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        type="datetime-local"
        className="hb-datepicker__input"
        value={toInputValue(value)}
        onChange={onInputChange}
        min={minDate ? toInputValue(minDate) : undefined}
        max={maxDate ? toInputValue(maxDate) : undefined}
        disabled={disabled}
      />
      {validationError && <p className="hb-datepicker__error">{validationError}</p>}
    </div>
  );
}

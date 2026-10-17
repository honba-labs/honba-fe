// Ported/modernized from bfx-hf-ui-core's src/ui/Input (Apache-2.0).
// react-fa icon usage replaced with lucide-react; PropTypes/defaultProps replaced with TS types
// and default parameter values.
import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';

import './Input.css';

function getLengthAfterPoint(value: string | number): number {
  const parts = String(value).split('.');
  return parts.length === 2 ? parts[1].length : 0;
}

export interface InputProps {
  type?: string;
  className?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  value?: string | number;
  placeholder?: string;
  label?: string;
  autoComplete?: string;
  style?: CSSProperties;
  min?: number;
  max?: number;
  percentage?: boolean;
  shouldBeAutofocused?: boolean;
  indicator?: string;
}

export function Input({
  type = 'text',
  className = '',
  onChange = () => {},
  disabled = false,
  value = '',
  placeholder = '',
  label = '',
  autoComplete = 'off',
  style,
  min = Number.MIN_SAFE_INTEGER,
  max = Number.MAX_SAFE_INTEGER,
  percentage = false,
  shouldBeAutofocused = false,
  indicator,
}: InputProps) {
  const [isHidden, setIsHidden] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleShow = () => setIsHidden((prev) => !prev);

  const onInputChangeHandler = (e: ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value;
    if (percentage) {
      const number = Number(nextValue);
      if (
        !Number.isNaN(number) &&
        number <= max &&
        number >= 0 &&
        getLengthAfterPoint(nextValue) <= 2
      ) {
        onChange(nextValue);
      }
      return;
    }
    onChange(nextValue);
  };

  useEffect(() => {
    if (!shouldBeAutofocused || !inputRef.current) {
      return;
    }
    inputRef.current.focus();
  }, [shouldBeAutofocused]);

  if (type === 'password') {
    return (
      <div className="hb-input">
        <input
          type={isHidden ? 'password' : 'text'}
          placeholder={placeholder}
          className={className}
          onChange={onInputChangeHandler}
          value={value}
          ref={inputRef}
        />
        <button className="hb-input__field-icon" type="button" onClick={toggleShow}>
          {isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
      </div>
    );
  }

  return (
    <div className={clsx('hb-input', className)}>
      {label && <p className="hb-input__label">{label}</p>}
      <input
        type={type}
        autoComplete={autoComplete}
        onChange={onInputChangeHandler}
        placeholder={placeholder}
        disabled={disabled}
        style={style}
        value={value}
        min={min}
        max={max}
        ref={inputRef}
      />
      {indicator && <span className="hb-input__indicator">{indicator}</span>}
    </div>
  );
}

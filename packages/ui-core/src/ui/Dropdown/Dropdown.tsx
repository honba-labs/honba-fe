// Ported/modernized from bfx-hf-ui-core's src/ui/Dropdown (Apache-2.0).
// The original wrapped Bitfinex's own `@ufx-ui/core` Dropdown (a separate, unported package);
// this is a from-scratch, dependency-free re-implementation of the same props-in contract
// (label/value/options/onChange), styled with the shared design tokens.
import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';

import './Dropdown.css';

export interface DropdownOption<T extends string = string> {
  label: string;
  value: T;
}

export interface DropdownProps<T extends string = string> {
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  value?: T;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  highlight?: boolean;
  className?: string;
}

export function Dropdown<T extends string = string>({
  options,
  onChange,
  value = '' as T,
  label,
  placeholder = 'Select...',
  disabled = false,
  highlight = false,
  className = '',
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!isOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [isOpen]);

  return (
    <div className="hb-dropdown__wrapper" ref={rootRef}>
      {label && <p className="hb-dropdown__label">{label}</p>}
      <button
        type="button"
        className={clsx('hb-dropdown__field', className, { highlight, disabled })}
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="hb-dropdown__value">{selected ? selected.label : placeholder}</span>
        <ChevronDown size={14} className="hb-dropdown__arrow" />
      </button>
      {isOpen && (
        <ul className="hb-dropdown__list" role="listbox">
          {options.map((option) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              className={clsx('hb-dropdown__option', { selected: option.value === value })}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Ported/modernized from bfx-hf-ui-core's src/ui/Button (Apache-2.0).
// React 16 class-free function component + plain CSS tokens instead of SCSS variables.
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

import './Button.css';

export type ButtonVariant = 'default' | 'red' | 'green' | 'blue' | 'gray';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  label?: ReactNode;
  variant?: ButtonVariant;
  isSubmit?: boolean;
  disabled?: boolean;
  inactive?: boolean;
  dataProduct?: string;
  className?: string;
}

export function Button({
  label = '',
  onClick,
  isSubmit = false,
  variant = 'default',
  className = '',
  dataProduct = '',
  disabled = false,
  inactive = false,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={isSubmit ? 'submit' : 'button'}
      onClick={disabled ? undefined : onClick}
      data-product={dataProduct || undefined}
      disabled={disabled}
      className={clsx('hb-button', className, variant !== 'default' && variant, {
        disabled,
        inactive,
      })}
      {...rest}
    >
      {children ?? label}
    </button>
  );
}

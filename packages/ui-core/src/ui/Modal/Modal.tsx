// Ported/modernized from bfx-hf-ui-core's src/ui/Modal (Apache-2.0).
// The original wrapped Bitfinex's own `@ufx-ui/core` Dialog (a separate, unported package);
// this is a from-scratch overlay + dialog implementation with the same isOpen/onClose/label
// contract, using plain CSS tokens instead of SCSS.
import type { MouseEvent, ReactNode } from 'react';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

import { Scrollbars } from '../Scrollbars';
import './Modal.css';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  label?: ReactNode;
  className?: string;
  scrollable?: boolean;
  children: ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  label = '',
  className = '',
  scrollable = false,
  children,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const onOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const body = scrollable ? <Scrollbars className="hb-modal__scroll">{children}</Scrollbars> : children;

  return (
    <div className="hb-modal__overlay" onMouseDown={onOverlayClick}>
      <div className={clsx('hb-modal', className)} role="dialog" aria-modal="true">
        <div className="hb-modal__header">
          <p className="hb-modal__title">{label}</p>
          <button type="button" className="hb-modal__close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="hb-modal__body">{body}</div>
      </div>
    </div>
  );
}

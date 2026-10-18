// Ported/modernized from bfx-hf-ui-core's src/ui/Modal (Apache-2.0).
// The original wrapped Bitfinex's own `@ufx-ui/core` Dialog (a separate, unported package);
// this is a from-scratch overlay + dialog implementation with the same isOpen/onClose/label
// contract, using plain CSS tokens instead of SCSS.
// Batch G additions: the title is a real heading wired as the dialog's accessible name
// (`aria-labelledby` via useId — the dashboard's Modal test used to work around a nameless
// dialog), and an optional `width` (the reference's Dialog had one; G's modals set 640–980px).
import type { MouseEvent, ReactNode } from 'react';
import { useEffect, useId } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

import { Scrollbars } from '../Scrollbars';
import './Modal.css';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  label?: ReactNode;
  /** Dialog width in px; clamped by the CSS `max-width: 90vw`. */
  width?: number;
  className?: string;
  scrollable?: boolean;
  children: ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  label = '',
  width,
  className = '',
  scrollable = false,
  children,
}: ModalProps) {
  const titleId = useId();
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
      <div
        className={clsx('hb-modal', className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={width !== undefined ? { width: `min(${width}px, 90vw)` } : undefined}
      >
        <div className="hb-modal__header">
          <h1 id={titleId} className="hb-modal__title">{label}</h1>
          <button type="button" className="hb-modal__close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="hb-modal__body">{body}</div>
      </div>
    </div>
  );
}

// Ported/modernized from bfx-hf-ui-core's src/hooks/useModalFocus.js (Apache-2.0).
// Same behavior as the original (focus the first focusable element in the modal body on open,
// skipping anything inside the footer, falling back to the title), but the selectors are now
// configurable instead of hardcoded to Bitfinex's `.modal__*` class names. They default to the
// `.hb-modal__*` classes used by this package's own `Modal` component (see `../../ui/Modal`).
import { useEffect } from 'react';

export interface UseModalFocusOptions {
  /** Selector for the modal body; its first focusable descendant is focused. */
  bodySelector?: string;
  /** Selector for the modal footer; focusable elements inside it are never auto-focused. */
  footerSelector?: string;
  /** Selector for the modal title; focused as a fallback when the body has nothing focusable. */
  titleSelector?: string;
}

const FOCUSABLE_SELECTORS = ['input', 'button', '[role=button]'];

const DEFAULT_OPTIONS: Required<UseModalFocusOptions> = {
  bodySelector: '.hb-modal__body',
  footerSelector: '.hb-modal__footer',
  titleSelector: '.hb-modal__title',
};

export function useModalFocus(isOpen: boolean, options: UseModalFocusOptions = {}): void {
  const {
    bodySelector = DEFAULT_OPTIONS.bodySelector,
    footerSelector = DEFAULT_OPTIONS.footerSelector,
    titleSelector = DEFAULT_OPTIONS.titleSelector,
  } = options;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const bodyFocusableSelector = FOCUSABLE_SELECTORS.map((selector) => `${bodySelector} ${selector}`).join(',');
    const focusable = document.querySelector<HTMLElement>(bodyFocusableSelector);
    const footer = document.querySelector<HTMLElement>(footerSelector);

    if (focusable && (!footer || !footer.contains(focusable))) {
      focusable.focus();
      return;
    }

    const title = document.querySelector<HTMLElement>(titleSelector);
    title?.focus();
  }, [isOpen, bodySelector, footerSelector, titleSelector]);
}

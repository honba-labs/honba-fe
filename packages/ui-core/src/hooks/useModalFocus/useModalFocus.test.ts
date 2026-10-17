import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useModalFocus } from './useModalFocus';

describe('useModalFocus', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('focuses the first focusable element inside the body when open', () => {
    document.body.innerHTML = `
      <p class="hb-modal__title" tabindex="-1">Title</p>
      <div class="hb-modal__body"><button>OK</button></div>
    `;

    renderHook(() => useModalFocus(true));

    expect(document.activeElement).toBe(document.querySelector('button'));
  });

  it('does nothing when closed', () => {
    document.body.innerHTML = `
      <p class="hb-modal__title" tabindex="-1">Title</p>
      <div class="hb-modal__body"><button>OK</button></div>
    `;

    renderHook(() => useModalFocus(false));

    expect(document.activeElement).not.toBe(document.querySelector('button'));
  });

  it('falls back to the title when the body has nothing focusable', () => {
    document.body.innerHTML = `
      <p class="hb-modal__title" tabindex="-1">Title</p>
      <div class="hb-modal__body"></div>
      <div class="hb-modal__footer"><button>Close</button></div>
    `;

    renderHook(() => useModalFocus(true));

    expect(document.activeElement).toBe(document.querySelector('.hb-modal__title'));
  });

  it('skips a focusable element that lives inside the footer', () => {
    document.body.innerHTML = `
      <p class="hb-modal__title" tabindex="-1">Title</p>
      <div class="hb-modal__body"><div class="hb-modal__footer"><button>Close</button></div></div>
    `;

    renderHook(() => useModalFocus(true));

    expect(document.activeElement).toBe(document.querySelector('.hb-modal__title'));
  });

  it('supports custom selectors', () => {
    document.body.innerHTML = `
      <p class="custom-title" tabindex="-1">Title</p>
      <div class="custom-body"><input /></div>
    `;

    renderHook(() => useModalFocus(true, {
      bodySelector: '.custom-body',
      footerSelector: '.custom-footer',
      titleSelector: '.custom-title',
    }));

    expect(document.activeElement).toBe(document.querySelector('input'));
  });
});

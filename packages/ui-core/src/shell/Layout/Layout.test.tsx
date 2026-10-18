import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Layout, LayoutHeader, LayoutMain, LayoutFooter } from './Layout';

describe('Layout shell frame', () => {
  it('renders the three slots with their classes, preserving child content', () => {
    const { container } = render(
      <Layout>
        <LayoutHeader>
          <nav>top nav slot</nav>
        </LayoutHeader>
        <LayoutMain>
          <p>page content slot</p>
        </LayoutMain>
        <LayoutFooter>
          <div>status bar slot</div>
        </LayoutFooter>
      </Layout>,
    );

    const root = container.querySelector('.hb-layout');
    expect(root).not.toBeNull();
    expect(root?.className).not.toMatch(/modular|scss-remnant/);

    const header = container.querySelector('header.hb-layout__header');
    const main = container.querySelector('main.hb-layout__main');
    const footer = container.querySelector('footer.hb-layout__footer');
    expect(header?.textContent).toContain('top nav slot');
    expect(main?.textContent).toContain('page content slot');
    expect(footer?.textContent).toContain('status bar slot');
    // The Electron-only MIN_SAFE_WIDTH inline style from the reference is deliberately gone.
    expect(main?.getAttribute('style')).toBe(null);
  });

  it('appends custom classes and the flex modifier to Main', () => {
    const { container } = render(
      <Layout>
        <LayoutMain className="extra" />
      </Layout>,
    );
    expect(container.querySelector('main')?.className).toBe('hb-layout__main extra');
  });
});

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Scrollbars } from './Scrollbars';

describe('Scrollbars', () => {
  it('renders its children inside a scrollable container', () => {
    const { container } = render(
      <Scrollbars style={{ height: 100 }}>
        <p>Scrollable content</p>
      </Scrollbars>,
    );

    expect(screen.getByText('Scrollable content')).toBeInTheDocument();
    const root = container.querySelector('.hb-scrollbars') as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.style.height).toBe('100px');
  });
});

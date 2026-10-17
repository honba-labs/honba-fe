import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useHover } from './useHover';

function Probe() {
  const [ref, isHovered] = useHover<HTMLDivElement>();
  return <div ref={ref} data-testid="box">{isHovered ? 'hovered' : 'idle'}</div>;
}

describe('useHover', () => {
  it('starts as not hovered', () => {
    render(<Probe />);
    expect(screen.getByTestId('box')).toHaveTextContent('idle');
  });

  it('becomes hovered on mouseover', () => {
    render(<Probe />);
    fireEvent.mouseOver(screen.getByTestId('box'));
    expect(screen.getByTestId('box')).toHaveTextContent('hovered');
  });

  it('returns to idle on mouseout', () => {
    render(<Probe />);
    fireEvent.mouseOver(screen.getByTestId('box'));
    fireEvent.mouseOut(screen.getByTestId('box'));
    expect(screen.getByTestId('box')).toHaveTextContent('idle');
  });
});

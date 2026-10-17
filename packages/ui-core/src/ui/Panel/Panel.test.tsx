import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { Panel } from './Panel';

describe('Panel', () => {
  it('renders the label and children', () => {
    render(
      <Panel label="Order book">
        <p>Depth rows</p>
      </Panel>,
    );
    expect(screen.getByText('Order book')).toBeInTheDocument();
    expect(screen.getByText('Depth rows')).toBeInTheDocument();
  });

  it('calls onRemove when the remove icon is clicked', () => {
    const onRemove = vi.fn();
    render(
      <Panel label="Order book" removeable onRemove={onRemove}>
        content
      </Panel>,
    );
    fireEvent.click(screen.getByLabelText('Remove panel'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleSettings when the settings icon is clicked', () => {
    const onToggleSettings = vi.fn();
    render(
      <Panel label="Order book" onToggleSettings={onToggleSettings}>
        content
      </Panel>,
    );
    fireEvent.click(screen.getByLabelText('Toggle settings'));
    expect(onToggleSettings).toHaveBeenCalledTimes(1);
  });

  it('renders a footer when provided', () => {
    render(
      <Panel label="Order book" footer={<span>Footer text</span>}>
        content
      </Panel>,
    );
    expect(screen.getByText('Footer text')).toBeInTheDocument();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { AppSettingsModal } from './AppSettingsModal';
import type { AppSettings } from './AppSettingsModal';

const settings: AppSettings = { theme: 'dark', clock24h: true };

describe('AppSettingsModal', () => {
  it('renders the settings dialog with the theme dropdown and clock radios', () => {
    render(
      <AppSettingsModal isOpen onClose={() => {}} settings={settings} onChange={() => {}} />,
    );
    expect(screen.getByRole('dialog', { name: 'App settings' })).toBeInTheDocument();
    // Theme dropdown shows the current theme; opening it lists both.
    fireEvent.click(screen.getByRole('button', { name: /Dark/ }));
    expect(screen.getByRole('option', { name: 'Light' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Dark' })).toHaveAttribute('aria-selected', 'true');
  });

  it('theme change fires the patch; radio pair fires clock24h changes', () => {
    const onChange = vi.fn();
    render(
      <AppSettingsModal isOpen onClose={() => {}} settings={settings} onChange={onChange} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Dark/ }));
    fireEvent.click(screen.getByRole('option', { name: 'Light' }));
    expect(onChange).toHaveBeenCalledWith({ theme: 'light' });

    fireEvent.click(screen.getByRole('radio', { name: '12-hour' }));
    expect(onChange).toHaveBeenCalledWith({ clock24h: false });
  });

  it('resets the local theme mirror when reopened (reference close-reset behavior)', () => {
    const { rerender } = render(
      <AppSettingsModal isOpen onClose={() => {}} settings={settings} onChange={() => {}} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Dark/ }));
    fireEvent.click(screen.getByRole('option', { name: 'Light' }));

    rerender(
      <AppSettingsModal isOpen={false} onClose={() => {}} settings={settings} onChange={() => {}} />,
    );
    rerender(
      <AppSettingsModal isOpen onClose={() => {}} settings={settings} onChange={() => {}} />,
    );
    // Mirror reset back to the prop ('dark'), not the stale 'light'.
    expect(screen.getByRole('button', { name: /Dark/ })).toBeInTheDocument();
  });
});

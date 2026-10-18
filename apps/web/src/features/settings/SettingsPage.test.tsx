// Batch I slice 5 (docs/tasks.md §Batch I): the Settings route. The bfx-hf-ui-core parity
// target for this route is the Authentication page (broker connection flow), but broker
// credentials deliberately wait for the honba-adapters contract (docs/plan.md §7 row 7;
// recorded as the batch's owner-blocking item). What Settings can do against the live honba
// REST surface today: manage the profile's named workbench layout presets
// (`GET /profile/layouts` + `DELETE /profile/layouts/{name}` — saves happen in the
// Workbench), and run the Batch G AppSettingsModal with its app preferences persisted into
// the profile document (`PUT /profile`, compare-and-swap on the read revision — honba-ya
// profile.rs; a stale revision is a 409 the user simply retries by reopening).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';

import { createApiClient, type ApiClient } from '../../core/api/client';
import { createQueryClient, setApiClient } from '../../core/api/query';
import type { LayoutDocument, Profile } from '../../core/types/messages';
import { SettingsPage } from './SettingsPage';

const PROFILE: Profile = {
  revision: 7,
  layouts: {},
  modules: {},
  workbench: null,
  preferences: { theme: 'dark', clock24h: true },
  alerts: null,
  shortlist: [],
  watchlists: {},
};

function stubbedClient(overrides: Partial<ApiClient> = {}): ApiClient {
  const base = createApiClient({ baseUrl: '/api', fetchImpl: fetch });
  const layoutNames = new Set(['workbench-default', 'workbench-tight']);
  const client: ApiClient = {
    ...base,
    getProfile: vi.fn().mockResolvedValue(PROFILE),
    putProfile: vi.fn().mockResolvedValue({ ...PROFILE, revision: 8 }),
    getLayouts: vi.fn().mockImplementation(() =>
      Promise.resolve({
        layouts: Object.fromEntries(
          [...layoutNames].map((name) => [name, { grid: {} } as unknown as LayoutDocument]),
        ),
      }),
    ),
    deleteLayout: vi.fn().mockImplementation((name: string) => {
      layoutNames.delete(name);
      return Promise.resolve({ revision: 8 });
    }),
    ...overrides,
  };
  setApiClient(client);
  return client;
}

function renderPage() {
  return render(
    <QueryClientProvider client={createQueryClient({ retries: 0 })}>
      <SettingsPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  stubbedClient();
});

describe('SettingsPage (Batch I slice 5)', () => {
  it('lists the profile layout presets and deletes one through /profile/layouts/{name}', async () => {
    const client = stubbedClient();
    renderPage();

    // Layout presets (saving lives in the Workbench; management lives here).
    expect(await screen.findByText('workbench-default')).toBeInTheDocument();
    expect(screen.getByText('workbench-tight')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete workbench-tight' }));

    await waitFor(() =>
      expect(client.deleteLayout).toHaveBeenCalledWith('workbench-tight'),
    );
    // The layouts query is invalidated → the preset disappears from the list.
    await waitFor(() =>
      expect(screen.queryByText('workbench-tight')).not.toBeInTheDocument(),
    );
  });

  it('persists an app-settings change with PUT /profile compare-and-swap on the revision', async () => {
    const client = stubbedClient();
    renderPage();
    // Wait until the profile document is actually loaded before mutating (the CAS write
    // needs the read revision).
    await screen.findByText('workbench-default');

    fireEvent.click(screen.getByRole('button', { name: /app settings/i }));
    // Batch G modal: the theme Dropdown opens on its trigger, and "applies on selection"
    // (the caller owns persistence…).
    fireEvent.click(screen.getByRole('button', { name: 'Dark' }));
    fireEvent.click(screen.getByText('Light'));

    const put = client.putProfile as ReturnType<typeof vi.fn>;
    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    const sent = put.mock.calls[0][0] as Profile;
    // The rest of the profile goes back untouched, the patch merges into `preferences`, and
    // the read revision is what the CAS expects.
    expect(sent.revision).toBe(7);
    expect(sent.preferences).toEqual({ theme: 'light', clock24h: true });
    expect(sent.layouts).toEqual({});
  });

  it('shows the app-settings save failure instead of silently dropping it', async () => {
    const client = stubbedClient({
      putProfile: vi.fn().mockRejectedValue(new Error('409 revision_conflict')),
    });
    renderPage();
    await screen.findByText('workbench-default');

    fireEvent.click(screen.getByRole('button', { name: /app settings/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Dark' }));
    fireEvent.click(screen.getByText('Light'));

    expect(await screen.findByText(/revision_conflict/)).toBeInTheDocument();
  });
});

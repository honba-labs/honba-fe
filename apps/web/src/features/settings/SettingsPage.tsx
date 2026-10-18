// Batch I slice 5 (docs/tasks.md §Batch I): the Settings route. Scope today is what the honba
// REST surface already serves (docs/plan.md §7 row 7): manage the profile's named workbench
// layout presets (`GET /profile/layouts`, `DELETE /profile/layouts/{name}` — the Workbench
// saves them; this page prunes them) and run the Batch G `AppSettingsModal`, persisting its
// app-settings patch into the profile document via `PUT /profile` compare-and-swap on the
// read revision (honba-ya profile.rs: a stale revision is a 409 `revision_conflict`, shown
// inline — reopen/retry per the CAS contract). Broker/adapter credential management
// deliberately waits for the honba-adapters contract — that is Batch I's open owner item.
import { useState } from 'react';

import { AppSettingsModal, type AppSettings } from '@honba/ui-core';

import { useDeleteLayout, useLayouts, useProfile, usePutProfile } from '../../core/api/query';
import type { Profile } from '../../core/types/messages';
import './SettingsPage.css';

function readSettings(profile: Profile | undefined): AppSettings {
  const prefs = (profile?.preferences ?? {}) as Record<string, unknown>;
  return {
    theme: prefs.theme === 'light' ? 'light' : 'dark',
    clock24h: typeof prefs.clock24h === 'boolean' ? prefs.clock24h : true,
  };
}

export function SettingsPage() {
  const profile = useProfile();
  const layouts = useLayouts();
  const putProfile = usePutProfile();
  const deleteLayout = useDeleteLayout();

  const [settings, setSettings] = useState<AppSettings>(readSettings(undefined));
  const [seededRevision, setSeededRevision] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Seed the editable settings once per profile revision (also re-seeds after the CAS write
  // bumps it), so concurrent edits elsewhere don't get clobbered by stale local state.
  const revision = profile.data?.revision ?? null;
  if (revision !== null && revision !== seededRevision) {
    setSeededRevision(revision);
    const next = readSettings(profile.data);
    if (next.theme !== settings.theme || next.clock24h !== settings.clock24h) {
      setSettings(next);
    }
  }

  function persistSettings(patch: Partial<AppSettings>) {
    if (!profile.data) return;
    const preferences = { ...(profile.data.preferences as Record<string, unknown>), ...patch };
    putProfile.mutate({ ...profile.data, revision: profile.data.revision, preferences });
    setSettings((prev) => ({ ...prev, ...patch }));
  }

  const layoutNames = Object.keys(layouts.data?.layouts ?? {}).sort();
  const saveError = putProfile.error ? (putProfile.error as Error).message : null;
  const deleteError = deleteLayout.error ? (deleteLayout.error as Error).message : null;

  return (
    <div className="settings">
      <header className="settings__header">
        <h2>Settings</h2>
        <p className="settings__hint">
          Profile document revision <code>{profile.data?.revision ?? '…'}</code>
        </p>
      </header>

      <section className="settings__section" aria-label="App settings">
        <h3>App settings</h3>
        <p className="settings__value">
          Theme <strong>{settings.theme}</strong> · Status-bar clock{' '}
          <strong>{settings.clock24h ? '24-hour' : '12-hour'}</strong>
        </p>
        <button
          type="button"
          className="settings__open"
          onClick={() => setModalOpen(true)}
        >
          App settings…
        </button>
        {saveError && <p className="settings__error">Save failed: {saveError}</p>}
      </section>

      <section className="settings__section" aria-label="Layout presets">
        <h3>Workbench layout presets</h3>
        <p className="settings__hint">
          Saved from the Workbench&apos;s layout toolbar. Deleting removes the preset from
          <code> /profile/layouts</code>.
        </p>
        {layouts.error && <p className="settings__error">{(layouts.error as Error).message}</p>}
        {deleteError && <p className="settings__error">{deleteError}</p>}
        {layoutNames.length === 0 && !layouts.error ? (
          <p className="settings__empty">No saved layouts yet.</p>
        ) : (
          <ul className="settings__layouts">
            {layoutNames.map((name) => (
              <li key={name} className="settings__layout-row">
                <span className="settings__layout-name">{name}</span>
                <button
                  type="button"
                  aria-label={`Delete ${name}`}
                  disabled={deleteLayout.isPending}
                  onClick={() => deleteLayout.mutate(name)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="settings__section" aria-label="Broker connections">
        <h3>Broker connections</h3>
        <p className="settings__hint">
          Credential management arrives with the honba-adapters contract (owner item, Batch I);
          nothing to configure today.
        </p>
      </section>

      <AppSettingsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        settings={settings}
        onChange={persistSettings}
      />
    </div>
  );
}

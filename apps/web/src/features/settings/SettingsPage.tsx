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
import {
  LedgerHistory,
  TaxReport,
  PortfolioSnapshots,
  PositionAuditTrail,
  ConcentrationRisk,
  WeightedAverageCost,
  FeesReport,
  PortfolioValueChart,
} from '@honba/ui-core';
import {
  useLedgerHistory,
  useTaxReport,
  usePortfolioSnapshots,
  usePositionAudit,
  useConcentrationRisk,
  useWeightedAverageCost,
  useFeesReport,
  useEquityCurve,
} from '../../core/api/query';

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

  // Report hooks
  const ledger = useLedgerHistory();
  const taxReport = useTaxReport();
  const snapshots = usePortfolioSnapshots();
  const audit = usePositionAudit();
  const concentration = useConcentrationRisk();
  const wac = useWeightedAverageCost();
  const fees = useFeesReport();
  const equityCurve = useEquityCurve();

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

      <section className="settings__section" aria-label="Reports">
        <h3>Portfolio Reports</h3>
        <p className="settings__hint">
          Historical and derived reporting widgets (Batch J). Each widget fetches from its
          dedicated honba endpoint (`GET /reports/*`).
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16, marginTop: 16 }}>
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 16 }}>
            <h4 style={{ marginBottom: 8 }}>Ledger History</h4>
            {ledger.error && <p style={{ color: 'var(--bearish)', fontSize: 12 }}>Failed: {(ledger.error as Error).message}</p>}
            <LedgerHistory rows={ledger.data?.entries ?? []} isLoading={ledger.isLoading} />
          </div>
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 16 }}>
            <h4 style={{ marginBottom: 8 }}>Tax Report (STCG/LTCG)</h4>
            {taxReport.error && <p style={{ color: 'var(--bearish)', fontSize: 12 }}>Failed: {(taxReport.error as Error).message}</p>}
            <TaxReport
              rows={taxReport.data?.transactions ?? []}
              summary={taxReport.data?.summary}
              isLoading={taxReport.isLoading}
            />
          </div>
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 16 }}>
            <h4 style={{ marginBottom: 8 }}>Portfolio Snapshots</h4>
            {snapshots.error && <p style={{ color: 'var(--bearish)', fontSize: 12 }}>Failed: {(snapshots.error as Error).message}</p>}
            <PortfolioSnapshots rows={snapshots.data?.snapshots ?? []} isLoading={snapshots.isLoading} />
          </div>
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 16 }}>
            <h4 style={{ marginBottom: 8 }}>Position Audit Trail</h4>
            {audit.error && <p style={{ color: 'var(--bearish)', fontSize: 12 }}>Failed: {(audit.error as Error).message}</p>}
            <PositionAuditTrail rows={audit.data?.entries ?? []} isLoading={audit.isLoading} />
          </div>
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 16 }}>
            <h4 style={{ marginBottom: 8 }}>Concentration Risk</h4>
            {concentration.error && <p style={{ color: 'var(--bearish)', fontSize: 12 }}>Failed: {(concentration.error as Error).message}</p>}
            <ConcentrationRisk
              rows={concentration.data?.entries ?? []}
              summary={
                concentration.data && {
                  total_portfolio_value: concentration.data.total_portfolio_value,
                  hhi: concentration.data.hhi,
                  top5_concentration: concentration.data.top5_concentration,
                  top10_concentration: concentration.data.top10_concentration,
                }
              }
              isLoading={concentration.isLoading}
            />
          </div>
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 16 }}>
            <h4 style={{ marginBottom: 8 }}>Weighted Average Cost</h4>
            {wac.error && <p style={{ color: 'var(--bearish)', fontSize: 12 }}>Failed: {(wac.error as Error).message}</p>}
            <WeightedAverageCost rows={wac.data?.entries ?? []} isLoading={wac.isLoading} />
          </div>
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 16 }}>
            <h4 style={{ marginBottom: 8 }}>Fees Report</h4>
            {fees.error && <p style={{ color: 'var(--bearish)', fontSize: 12 }}>Failed: {(fees.error as Error).message}</p>}
            <FeesReport rows={fees.data?.entries ?? []} byType={fees.data?.by_type} isLoading={fees.isLoading} />
          </div>
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 16 }}>
            <h4 style={{ marginBottom: 8 }}>Equity Curve</h4>
            {equityCurve.error && <p style={{ color: 'var(--bearish)', fontSize: 12 }}>Failed: {(equityCurve.error as Error).message}</p>}
            <PortfolioValueChart
              points={equityCurve.data?.points ?? []}
              summary={equityCurve.data?.summary}
              height={340}
            />
          </div>
        </div>
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

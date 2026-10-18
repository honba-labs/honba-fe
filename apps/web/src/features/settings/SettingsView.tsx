import React, { useState } from 'react';
import { Shield, Moon, Sun, Bell, Database, Key, Check } from 'lucide-react';
import { themeEngine } from '../../core/theme-engine';
import { useNotifications } from '../../core/store/notifications';
import './SettingsView.css';

export function SettingsView() {
  const [theme, setTheme] = useState<'dark' | 'light'>(themeEngine.current);
  const [slippage, setSlippage] = useState('0.05');
  const [latency, setLatency] = useState('50');
  const [makerFee, setMakerFee] = useState('0.08');
  const [takerFee, setTakerFee] = useState('0.10');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    useNotifications.getState().push({
      severity: 'info',
      title: 'Settings Saved',
      message: 'Simulated exchange parameters updated successfully',
    });
    setTimeout(() => setSaved(false), 2500);
  };

  const toggleTheme = (newTheme: 'dark' | 'light') => {
    themeEngine.set(newTheme);
    setTheme(newTheme);
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h2 className="settings-title">Settings & Preferences</h2>
        <p className="settings-subtitle">Manage your simulated trading environment, profile, and visual theme</p>
      </div>

      <div className="settings-grid">
        {/* Appearance Card */}
        <div className="card settings-card">
          <div className="settings-card-head">
            <span className="settings-card-title">Theme & Appearance</span>
            <span className="settings-card-sub">Choose your preferred visual mode</span>
          </div>

          <div className="settings-theme-options">
            <div
              className={`settings-theme-box ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => toggleTheme('dark')}
            >
              <Moon size={22} color="var(--primary)" />
              <span className="settings-theme-name">Dark Mode</span>
              <span className="settings-theme-desc">Obsidian & slate dark theme</span>
            </div>

            <div
              className={`settings-theme-box ${theme === 'light' ? 'active' : ''}`}
              onClick={() => toggleTheme('light')}
            >
              <Sun size={22} color="var(--warning)" />
              <span className="settings-theme-name">Light Mode</span>
              <span className="settings-theme-desc">Crisp fintech light theme</span>
            </div>
          </div>
        </div>

        {/* Simulated Engine Configuration */}
        <div className="card settings-card">
          <div className="settings-card-head">
            <span className="settings-card-title">Simulated Exchange Parameters</span>
            <span className="settings-card-sub">Fine-tune simulation latency, slippage, and fee models</span>
          </div>

          <form onSubmit={handleSave} className="settings-form">
            <div className="settings-form-row">
              <label className="settings-form-label">Simulated Execution Slippage (%)</label>
              <input
                type="number"
                step="0.01"
                value={slippage}
                onChange={(e) => setSlippage(e.target.value)}
                className="input num settings-input"
              />
            </div>

            <div className="settings-form-row">
              <label className="settings-form-label">Network Latency Jitter (ms)</label>
              <input
                type="number"
                value={latency}
                onChange={(e) => setLatency(e.target.value)}
                className="input num settings-input"
              />
            </div>

            <div className="settings-form-row">
              <label className="settings-form-label">Maker Fee Rate (%)</label>
              <input
                type="number"
                step="0.01"
                value={makerFee}
                onChange={(e) => setMakerFee(e.target.value)}
                className="input num settings-input"
              />
            </div>

            <div className="settings-form-row">
              <label className="settings-form-label">Taker Fee Rate (%)</label>
              <input
                type="number"
                step="0.01"
                value={takerFee}
                onChange={(e) => setTakerFee(e.target.value)}
                className="input num settings-input"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button type="submit" className="btn btn-primary">
                {saved ? <Check size={14} /> : null} Save Parameters
              </button>
            </div>
          </form>
        </div>

        {/* API Credentials */}
        <div className="card settings-card" style={{ gridColumn: 'span 2' }}>
          <div className="settings-card-head">
            <span className="settings-card-title">API Keys & Live Socket Bridge</span>
            <span className="settings-card-sub">Simulated bridge keys for local bot connectivity</span>
          </div>

          <div className="settings-api-box">
            <div className="settings-api-key-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={16} color="var(--primary)" />
                <span style={{ fontWeight: 600 }}>Simulated Master Key</span>
              </div>
              <span className="num" style={{ color: 'var(--fg-muted)' }}>
                hba_live_sim_8921f008aa2c114e91823f
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--fg-muted)', marginTop: '8px' }}>
              Used by external Python / Rust algorithmic drivers to stream fills directly from Honba.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

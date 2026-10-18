import React, { useState } from 'react';
import { X, ArrowDownRight, CheckCircle2, Building2 } from 'lucide-react';
import { useEquityStore } from '../core/store/equityStore';

export function DepositModal() {
  const { isFundsModalOpen, setFundsModalOpen, addFunds } = useEquityStore();
  const [amount, setAmount] = useState('50000');
  const [bank, setBank] = useState('HDFC Bank ··· 4921');

  if (!isFundsModalOpen) return null;

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!isNaN(val) && val > 0) {
      addFunds(val);
      setFundsModalOpen(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
      onClick={() => setFundsModalOpen(false)}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '24px',
          background: 'var(--bg-card)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-strong)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bullish-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--bullish)',
              }}
            >
              <ArrowDownRight size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--fg-primary)' }}>Add Funds & Margin</h3>
              <p style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>Simulated deposit to trading account</p>
            </div>
          </div>
          <button
            onClick={() => setFundsModalOpen(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--fg-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleDeposit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--fg-muted)', marginBottom: '6px' }}>
              Linked Primary Bank
            </label>
            <select
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              className="input"
              style={{ cursor: 'pointer' }}
            >
              <option value="HDFC Bank ··· 4921">HDFC Bank (A/C ··· 4921) · NetBanking</option>
              <option value="ICICI Bank ··· 8812">ICICI Bank (A/C ··· 8812) · UPI / IMPS</option>
              <option value="SBI ··· 2109">State Bank of India (A/C ··· 2109)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--fg-muted)', marginBottom: '6px' }}>
              Deposit Amount (₹)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input num"
                placeholder="0.00"
                required
              />
              <button
                type="button"
                onClick={() => setAmount('100000')}
                className="btn btn-outline btn-sm"
              >
                +₹1 Lakh
              </button>
            </div>
          </div>

          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              fontSize: '12px',
            }}
          >
            <div style={{ color: 'var(--fg-muted)', marginBottom: '4px' }}>Trading Segment</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--fg-primary)', fontWeight: 500 }}>
                NSE / BSE Cash & F&O Margin Segment
              </span>
              <span className="pill pill-bullish" style={{ fontSize: '11px' }}>
                Instant Credit
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => setFundsModalOpen(false)}
              className="btn btn-outline"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Add ₹{parseFloat(amount || '0').toLocaleString()}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

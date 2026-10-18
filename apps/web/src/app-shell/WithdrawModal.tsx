import React, { useState } from 'react';
import { X, ArrowUpRight, Building2 } from 'lucide-react';
import { useEquityStore } from '../core/store/equityStore';

export function WithdrawModal() {
  const { isWithdrawModalOpen, setWithdrawModalOpen, withdrawFunds, availableMargin } = useEquityStore();
  const [amount, setAmount] = useState('25000');
  const [bankAccount, setBankAccount] = useState('HDFC Bank ··· 4921');

  if (!isWithdrawModalOpen) return null;

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!isNaN(val) && val > 0) {
      const ok = withdrawFunds(val, bankAccount);
      if (ok) setWithdrawModalOpen(false);
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
      onClick={() => setWithdrawModalOpen(false)}
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
                backgroundColor: 'var(--bearish-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--bearish)',
              }}
            >
              <ArrowUpRight size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--fg-primary)' }}>Withdraw Funds</h3>
              <p style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>Simulated transfer to verified bank account</p>
            </div>
          </div>
          <button
            onClick={() => setWithdrawModalOpen(false)}
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

        <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>Withdrawal Amount</label>
              <span style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>
                Withdrawable:{' '}
                <span className="num" style={{ color: 'var(--fg-primary)', fontWeight: 500 }}>
                  ₹{availableMargin.toLocaleString()}
                </span>
              </span>
            </div>
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
                onClick={() => setAmount(availableMargin.toString())}
                className="btn btn-outline btn-sm"
              >
                Max
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--fg-muted)', marginBottom: '6px' }}>
              Beneficiary Bank Account
            </label>
            <select
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              className="input"
              style={{ cursor: 'pointer' }}
            >
              <option value="HDFC Bank ··· 4921">HDFC Bank Ltd (Savings A/C ··· 4921)</option>
              <option value="ICICI Bank ··· 8812">ICICI Bank Ltd (Savings A/C ··· 8812)</option>
            </select>
          </div>

          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              fontSize: '12px',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ color: 'var(--fg-muted)' }}>Settlement Cycle</span>
            <span style={{ color: 'var(--fg-primary)' }}>T+1 Evening Settlement</span>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => setWithdrawModalOpen(false)}
              className="btn btn-outline"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, backgroundColor: 'var(--bearish)' }}>
              Confirm Payout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

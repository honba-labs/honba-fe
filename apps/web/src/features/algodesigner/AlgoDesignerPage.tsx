// AlgoDesigner Page - AI-First Strategy Builder

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { themeEngine } from '../../core/theme-engine';
import { createApiClient, type ApiClient } from '../../core/api/client';
import { useNotifications } from '../../core/store/notifications';
import { AiQuantStudio } from './components/AiQuantStudio';

export const AlgoDesignerPage: React.FC = () => {
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const client = useMemo((): ApiClient => createApiClient(), []);

  useEffect(() => {
    themeEngine.applyToDOM();
  }, []);

  const handleNotice = useCallback((message: string) => {
    // 1. Push to global app notifications drawer so it appears in the top bell
    useNotifications.getState().push({
      severity: 'info',
      title: 'AI Strategy Builder',
      message,
    });

    // 2. Display a sleek floating UI toast that auto-dismisses
    setToastNotice(message);
    const timer = setTimeout(() => {
      setToastNotice((curr) => (curr === message ? null : curr));
    }, 4500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="algodesigner-view-root"
      style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, position: 'relative' }}
      data-testid="algo-designer-page"
    >
      <section
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <AiQuantStudio client={client} onNotice={handleNotice} />
      </section>

      {/* Floating Modern UI Toast Notification (replaces ugly top banner strip) */}
      {toastNotice && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: '48px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 16px',
            background: 'rgba(22, 27, 34, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5), 0 0 12px rgba(56, 189, 248, 0.15)',
            borderRadius: '8px',
            color: '#f0f6fc',
            fontSize: '12px',
            fontWeight: 500,
            maxWidth: '460px',
            animation: 'toast-slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <ShieldCheck size={16} color="#38bdf8" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, lineHeight: 1.4 }}>{toastNotice}</span>
          <button
            type="button"
            onClick={() => setToastNotice(null)}
            aria-label="Close notification"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8b949e',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '2px',
              borderRadius: '4px',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#f0f6fc')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#8b949e')}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
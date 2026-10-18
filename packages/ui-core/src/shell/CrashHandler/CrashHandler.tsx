// Batch F (docs/tasks.md): from-scratch React 19 error-boundary equivalent of bfx-hf-ui-core's
// `CrashHandler` (src/components/CrashHandler/*, Apache-2.0) — the brief explicitly says don't
// port the class-component/i18n/debug-infra version line-for-line, write it cleanly against the
// error-boundary APIs. React still implements error boundaries via class components only
// (no hook equivalent as of React 19), so this is the smallest class possible: render children,
// or the crash screen once anything beneath throws.
//
// Differences vs the reference: no i18n (plain text), no `debug()` (console.error via
// `componentDidCatch` like the reference does), no Bitfinex issue-tracker link (a
// caller-supplied `reportUrl` instead), no hardcoded app name, plus a "Reset" affordance so a
// recoverable crash can be retried without a full page reload (the crash stack is dismissible).
// Presentational + backend-agnostic: `onCrash` lets hosts report to their own telemetry.
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import clsx from 'clsx';

import './CrashHandler.css';

export interface CrashHandlerProps {
  children: ReactNode;
  /** Where users should report the crash; rendered as a link on the fallback screen. */
  reportUrl?: string;
  /** Called with the thrown error (and React's component stack) for host telemetry. */
  onCrash?: (error: unknown, info: ErrorInfo) => void;
  /** Error message shown on the fallback screen. */
  title?: string;
  className?: string;
}

interface CrashHandlerState {
  error: unknown;
  // React's component-stack string, shown under the error message in the fallback.
  stack: string | null;
}

export class CrashHandler extends Component<CrashHandlerProps, CrashHandlerState> {
  state: CrashHandlerState = { error: null, stack: null };

  static getDerivedStateFromError(error: unknown): CrashHandlerState {
    return { error, stack: null };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    // React guarantees info.componentStack is present in componentDidCatch (React 19).
    this.setState({ stack: info.componentStack ?? null });
    this.props.onCrash?.(error, info);
  }

  handleReset = () => {
    this.setState({ error: null, stack: null });
  };

  render() {
    const { error, stack } = this.state;
    const { children, reportUrl, title = 'Something went wrong', className } = this.props;

    if (error === null) return children;

    return (
      <div className={clsx('hb-crash-screen__wrapper', className)}>
        <div className="hb-crash-screen">
          <h1>:(</h1>
          <h2>{title}</h2>
          <h4>
            The interface crashed while rendering. You can retry from here; unsaved local
            state may be lost.
          </h4>
          {reportUrl ? (
            <p className="hb-crash-screen__report">
              If it keeps happening, please report it:{' '}
              <a href={reportUrl} target="_blank" rel="noopener noreferrer">
                {reportUrl}
              </a>
            </p>
          ) : null}
          <button type="button" className="hb-crash-screen__reset" onClick={this.handleReset}>
            Retry
          </button>
          <h5>
            <div className="hb-crash-screen__crashstack">{String(error)}</div>
            {stack ? <pre className="hb-crash-screen__componentstack">{stack}</pre> : null}
          </h5>
        </div>
      </div>
    );
  }
}

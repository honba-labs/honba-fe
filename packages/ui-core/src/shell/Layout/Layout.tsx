// Ported/modernized from bfx-hf-ui-core's src/components/Layout (Apache-2.0) — the structural
// frame of every page (header / main / footer slots with the persistent chrome). Dropped from
// the reference: the `isElectronApp` MIN_SAFE_WIDTH inline styles (honba-fe is a browser web
// app) and the hard `<Navbar />` / `<StatusBar />` imports (the slots above and below `children`
// are the app's to compose — apps/web/src/app-shell composes them in Batch F; ui-core renders
// the frame, not the chrome). Same subcomponent API shape as the reference:
// `Layout.Header`, `Layout.Main`, `Layout.Footer`.
//
// Presentational: pure slots + classes, no state, no backend.
import type { ReactNode } from 'react';
import clsx from 'clsx';

import './Layout.css';

export interface LayoutSlotProps {
  /** Extra content rendered at the end of the slot (the reference layered its own chrome
   * here; apps/web composes TopBar / StatusBar instead). */
  children?: ReactNode;
  className?: string;
}

export interface LayoutProps {
  children?: ReactNode;
  className?: string;
}

export function Layout({ children, className }: LayoutProps) {
  return <div className={clsx('hb-layout', className)}>{children}</div>;
}

export function LayoutHeader({ children, className }: LayoutSlotProps) {
  return <header className={clsx('hb-layout__header', className)}>{children}</header>;
}

export function LayoutMain({ children, className }: LayoutSlotProps) {
  return <main className={clsx('hb-layout__main', className)}>{children}</main>;
}

export function LayoutFooter({ children, className }: LayoutSlotProps) {
  return <footer className={clsx('hb-layout__footer', className)}>{children}</footer>;
}

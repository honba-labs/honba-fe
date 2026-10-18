// Designer Layout Store - pane sizes, focus mode, drawer state
// Mirrors honba-frontend core/designer/layout.ts

export type DesignerPane = 'library' | 'code' | 'canvas' | 'assistant';
export type DrawerTab = 'verify' | 'run' | 'sweeps' | 'ops' | 'results';

export interface DesignerLayout {
  libraryOpen: boolean;
  assistantOpen: boolean;
  libraryWidth: number;
  assistantWidth: number;
  codeRatio: number; // 0-1, proportion of center for code vs canvas
  drawerOpen: boolean;
  drawerTab: DrawerTab;
  focus: DesignerPane | null;
}

const DEFAULT_LAYOUT: DesignerLayout = {
  libraryOpen: true,
  assistantOpen: false,
  libraryWidth: 280,
  assistantWidth: 360,
  codeRatio: 0.5,
  drawerOpen: false,
  drawerTab: 'verify',
  focus: null,
};

const STORAGE_KEY = 'honba.designer.layout';

function loadLayout(): DesignerLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_LAYOUT, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return DEFAULT_LAYOUT;
}

function saveLayout(layout: DesignerLayout): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // ignore
  }
}

function normalizeLayout(patch: Partial<DesignerLayout>, current: DesignerLayout): DesignerLayout {
  const next = { ...current, ...patch };
  // Clamp widths
  next.libraryWidth = Math.max(200, Math.min(600, next.libraryWidth));
  next.assistantWidth = Math.max(280, Math.min(600, next.assistantWidth));
  next.codeRatio = Math.max(0.15, Math.min(0.85, next.codeRatio));
  return next;
}

export function layoutWithPaneToggled(layout: DesignerLayout, pane: DesignerPane): DesignerLayout {
  if (pane === 'library') return normalizeLayout({ libraryOpen: !layout.libraryOpen }, layout);
  if (pane === 'assistant') return normalizeLayout({ assistantOpen: !layout.assistantOpen }, layout);
  return layout;
}

export function layoutWithFocusToggled(layout: DesignerLayout, pane: DesignerPane): DesignerLayout {
  if (layout.focus === pane) {
    return normalizeLayout({ focus: null }, layout);
  }
  return normalizeLayout({ focus: pane }, layout);
}

export { DEFAULT_LAYOUT, loadLayout, saveLayout, normalizeLayout };
// Theme Engine - simple theme management
// Mirrors honba-frontend core/theme-engine.ts

type Theme = 'dark' | 'light';

interface ThemeEngine {
  current: Theme;
  applyToDOM: () => void;
  toggle: () => void;
  set: (theme: Theme) => void;
  subscribe: (callback: () => void) => () => void;
}

function createThemeEngine(): ThemeEngine {
  const listeners: Set<() => void> = new Set();
  
  function getInitialTheme(): Theme {
    try {
      const stored = localStorage.getItem('honba.theme');
      if (stored === 'dark' || stored === 'light') return stored;
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    } catch {
      // ignore
    }
    return 'dark';
  }

  let current: Theme = getInitialTheme();

  function applyToDOM(): void {
    document.documentElement.setAttribute('data-theme', current);
    document.documentElement.setAttribute('data-typography', 'system');
    document.documentElement.setAttribute('data-layout', 'comfortable');
  }

  function notify(): void {
    listeners.forEach((cb) => cb());
  }

  function set(theme: Theme): void {
    current = theme;
    try {
      localStorage.setItem('honba.theme', theme);
    } catch {
      // ignore
    }
    applyToDOM();
    notify();
  }

  function toggle(): void {
    set(current === 'dark' ? 'light' : 'dark');
  }

  function subscribe(callback: () => void): () => void {
    listeners.add(callback);
    return () => listeners.delete(callback);
  }

  return {
    get current() {
      return current;
    },
    applyToDOM,
    toggle,
    set,
    subscribe,
  };
}

export const themeEngine = createThemeEngine();
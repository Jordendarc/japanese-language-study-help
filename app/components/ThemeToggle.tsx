'use client';

import { useSyncExternalStore } from 'react';

type Theme = 'night' | 'day';

const STORAGE_KEY = 'theme';
const META_COLORS: Record<Theme, string> = { night: '#14161c', day: '#f6f1e7' };

// The <html data-theme> attribute is the source of truth. A script in layout.tsx sets it from
// localStorage before first paint, so this component only has to watch it and change it.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'day' ? 'day' : 'night';
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => 'night' as Theme);
  const next: Theme = theme === 'night' ? 'day' : 'night';

  const toggle = () => {
    document.documentElement.dataset.theme = next;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLORS[next]);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage unavailable (private mode): the choice just won't persist
    }
  };

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg hover:bg-surface transition-colors text-fg-muted hover:text-fg"
      title={theme === 'night' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={theme === 'night' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'night' ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
      )}
    </button>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

interface UserMenuProps {
  email: string | undefined;
  onSignOut: () => void;
}

const itemClass =
  'flex w-full items-center gap-3 px-4 py-2.5 text-sm text-fg hover:bg-surface-raised transition-colors text-left';

export default function UserMenu({ email, onSignOut }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on a click elsewhere or Escape while open
  useEffect(() => {
    if (!open) return;

    const handlePointer = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-on-accent text-sm font-medium hover:opacity-90 transition-opacity"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {email?.charAt(0).toUpperCase() || 'U'}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 bg-surface border border-line rounded-xl py-1 z-50 overflow-hidden"
        >
          {email && (
            <div className="px-4 py-2.5 text-xs text-fg-muted border-b border-line truncate" title={email}>
              {email}
            </div>
          )}

          <Link href="/progress" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
            <svg className="w-4 h-4 text-fg-muted" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 20V10m6 10V4m6 16v-7m4 7H2" />
            </svg>
            View progress
          </Link>

          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className={itemClass}
          >
            <svg className="w-4 h-4 text-fg-muted" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

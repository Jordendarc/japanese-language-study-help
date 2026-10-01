'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import {
  clearSavedSession,
  loadSavedSession,
  sessionLabel,
  type SavedVocabSession,
} from '../services/sessionService';

// Offers to resume the flashcard session in progress (this device, or the signed-in account's)
export default function ContinueSessionBanner() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [saved, setSaved] = useState<SavedVocabSession | null>(null);

  useEffect(() => {
    if (loading) return;

    let cancelled = false;
    loadSavedSession(user?.id).then(session => {
      if (!cancelled) setSaved(session);
    });
    return () => {
      cancelled = true;
    };
  }, [loading, user?.id]);

  if (!saved) return null;

  const discard = async () => {
    setSaved(null);
    await clearSavedSession(user?.id);
  };

  return (
    <div className="bg-surface border border-line rounded-2xl p-4 sm:p-5 mb-6 flex items-center gap-3">
      <button
        onClick={() => router.push('/vocabulary?resume=1')}
        className="flex-1 min-w-0 text-left group"
      >
        <div className="font-medium text-fg text-lg"><span className="text-accent">▶</span> Continue previous session</div>
        <div className="text-fg-soft text-sm truncate">{sessionLabel(saved.source)}</div>
        <div className="text-fg-muted text-xs mt-0.5">
          Round {saved.round} · card {saved.currentIndex + 1}/{saved.currentIds.length}
          {saved.reviewIds.length > 0 && ` · ${saved.reviewIds.length} to review`}
        </div>
      </button>
      <button
        onClick={discard}
        className="shrink-0 px-3 py-1.5 rounded-lg text-sm text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors"
        aria-label="Discard saved session"
      >
        Discard
      </button>
    </div>
  );
}

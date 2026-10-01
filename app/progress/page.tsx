'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getProgressOverview, type ProgressOverview } from '../services/progressService';
import { computeProgress } from '../utils/progressStats';
import ProgressView from './ProgressView';

function Message({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-surface border border-line rounded-2xl p-8 max-w-md text-center">
        <h1 className="text-2xl font-medium text-fg mb-2">{title}</h1>
        <div className="text-fg-muted">{children}</div>
      </div>
    </div>
  );
}

const linkButton = 'inline-block mt-6 bg-accent text-on-accent px-6 py-3 rounded-xl font-medium hover:opacity-90 transition';

export default function ProgressPage() {
  const { user, loading: authLoading } = useAuth();
  const [result, setResult] = useState<{ userId: string; overview: ProgressOverview | null } | null>(null);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    getProgressOverview(user.id).then(overview => {
      if (!cancelled) setResult({ userId: user.id, overview });
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const overview = user && result?.userId === user.id ? result.overview : null;
  const stats = useMemo(() => (overview ? computeProgress(overview) : null), [overview]);

  if (authLoading) {
    return <Message title="Loading...">One moment.</Message>;
  }

  if (!user) {
    return (
      <Message title="Your progress">
        Sign in to see your study stats.
        <div>
          <Link href="/auth/login" className={linkButton}>Sign in</Link>
        </div>
      </Message>
    );
  }

  if (!result || result.userId !== user.id) {
    return <Message title="Loading your progress...">Adding up your reviews.</Message>;
  }

  if (!overview || !stats) {
    return (
      <Message title="Couldn't load your progress">
        Check your connection and try again.
        <div>
          <button onClick={() => window.location.reload()} className={linkButton}>Reload</button>
        </div>
      </Message>
    );
  }

  if (stats.wordsStudied === 0) {
    return (
      <Message title="No progress yet">
        Study some flashcards or take a kanji test and your stats will show up here.
        <div>
          <Link href="/vocabulary/select" className={linkButton}>Start studying</Link>
        </div>
      </Message>
    );
  }

  return <ProgressView stats={stats} />;
}

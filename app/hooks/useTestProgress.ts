'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createStudySession, recordCardReviewsBatch, updateStudySession } from '../services/progressService';
import type { StudySession } from '../types/database';

// A question left open counts as at most this much study time
const MAX_ACTIVE_MS_PER_QUESTION = 60_000;

/**
 * Saves test answers the way the flashcards do: one study session per test, each graded answer batched into
 * the database (which updates streaks and review dates). Signed-out users just aren't recorded.
 *
 *   questionShown()          call when a new question appears (starts its timer)
 *   record(cardId, correct)  call once per answered question
 *   finish()                 call when the test ends
 *   reset()                  call before starting another test on the same page
 */
export function useTestProgress(session: { textbook: string; lessons: () => string[]; label: string }) {
  const { user } = useAuth();
  const sessionRef = useRef<Promise<StudySession | null> | null>(null);
  const pendingRef = useRef<{ vocabularyId: string; wasCorrect: boolean; responseTimeMs: number }[]>([]);
  const statsRef = useRef({ studied: 0, correct: 0, incorrect: 0, activeMs: 0 });
  const shownAtRef = useRef(0);
  const chainRef = useRef<Promise<void>>(Promise.resolve());
  const flushRef = useRef<(completed?: boolean) => Promise<void>>(async () => {});

  // Sends the answers so far (and the session totals). Calls are queued so they never overlap.
  const flush = (completed = false): Promise<void> => {
    const sessionPromise = sessionRef.current;
    const batch = pendingRef.current.splice(0);
    const stats = { ...statsRef.current };

    const run = async () => {
      const saved = await sessionPromise;
      if (!user || !saved || (batch.length === 0 && !completed)) return;
      if (batch.length > 0) {
        const result = await recordCardReviewsBatch({ userId: user.id, sessionId: saved.id, reviews: batch });
        if (!result) {
          pendingRef.current.unshift(...batch); // keep them for the next attempt
          return;
        }
      }
      await updateStudySession(saved.id, {
        cards_studied: stats.studied,
        cards_correct: stats.correct,
        cards_incorrect: stats.incorrect,
        duration_seconds: Math.round(stats.activeMs / 1000),
        ...(completed ? { ended_at: new Date().toISOString() } : {}),
      });
    };

    chainRef.current = chainRef.current.then(run).catch(e => console.error(`Error saving ${session.label} progress:`, e));
    return chainRef.current;
  };

  useEffect(() => {
    flushRef.current = flush;
  });

  // Save what's been answered when the page is hidden (iOS app switch) or left mid-test
  useEffect(() => {
    const flushNow = () => {
      flushRef.current();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushNow();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flushNow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flushNow);
      flushNow();
    };
  }, []);

  return {
    questionShown() {
      shownAtRef.current = Date.now();
    },
    record(cardId: string | undefined, wasCorrect: boolean) {
      if (!user || !cardId) return;
      if (!sessionRef.current) {
        sessionRef.current = createStudySession({
          user_id: user.id,
          textbook: session.textbook,
          lessons: session.lessons(),
          session_type: 'kanji_test',
          cards_studied: 0,
          cards_correct: 0,
          cards_incorrect: 0,
          duration_seconds: 0,
          started_at: new Date().toISOString(),
          ended_at: null,
        });
      }
      const responseTimeMs = Math.min(Date.now() - shownAtRef.current, MAX_ACTIVE_MS_PER_QUESTION);
      pendingRef.current.push({ vocabularyId: cardId, wasCorrect, responseTimeMs });
      statsRef.current.activeMs += responseTimeMs;
      statsRef.current.studied += 1;
      if (wasCorrect) statsRef.current.correct += 1;
      else statsRef.current.incorrect += 1;
    },
    finish() {
      return flush(true);
    },
    reset() {
      sessionRef.current = null;
      statsRef.current = { studied: 0, correct: 0, incorrect: 0, activeMs: 0 };
      shownAtRef.current = Date.now();
    },
  };
}

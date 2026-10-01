'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Flashcard from '../components/Flashcard';
import { VocabCard } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  createStudySession,
  updateStudySession,
  recordCardReviewsBatch,
  getDueVocabularyIds,
} from '../services/progressService';
import {
  fetchCardsByIds,
  fetchCardsBySelections,
  type VocabSelection,
} from '../services/vocabularyService';
import {
  clearSavedSession,
  loadSavedSession,
  sameSource,
  saveSessionLocal,
  saveSessionRemote,
  sessionLabel,
  type SavedVocabSession,
  type SessionSource,
} from '../services/sessionService';
import type { StudySession } from '../types/database';

interface PendingReview {
  vocabularyId: string;
  wasCorrect: boolean;
  responseTimeMs: number;
}

const REMOTE_SAVE_DELAY_MS = 1500;
// A card left open counts as at most this much study time
const MAX_ACTIVE_MS_PER_CARD = 60_000;

const primaryButton = 'bg-accent text-on-accent px-6 py-3 rounded-xl font-medium hover:opacity-90 transition';
const secondaryButton = 'bg-surface-raised text-fg px-6 py-3 rounded-xl font-medium hover:bg-line transition';

function shuffleCards(cards: VocabCard[]): VocabCard[] {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function VocabularyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [currentQueue, setCurrentQueue] = useState<VocabCard[]>([]);
  const [reviewQueue, setReviewQueue] = useState<VocabCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [round, setRound] = useState(1);
  const [totalReviewed, setTotalReviewed] = useState(0);
  const [label, setLabel] = useState('');
  const [isReviewSession, setIsReviewSession] = useState(false);

  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [triggerGreen, setTriggerGreen] = useState(false);
  const [triggerRed, setTriggerRed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Progress tracking state
  const [studySession, setStudySession] = useState<StudySession | null>(null);
  const cardStartTimeRef = useRef(0);

  // Reviews are collected here and sent to the database in batches (see flushReviews)
  const pendingReviewsRef = useRef<PendingReview[]>([]);
  const sessionStatsRef = useRef({ cardsStudied: 0, cardsCorrect: 0, cardsIncorrect: 0, activeMs: 0 });
  const studySessionRef = useRef(studySession);
  const flushChainRef = useRef<Promise<void>>(Promise.resolve());

  // Saved-session bookkeeping
  const initStartedRef = useRef(false);
  const sourceRef = useRef<SessionSource | null>(null);
  const fullDeckRef = useRef<VocabCard[]>([]);
  const latestSessionRef = useRef<SavedVocabSession | null>(null);
  const remoteDirtyRef = useRef(false);
  const sessionCompleteRef = useRef(false); // once true, nothing may re-save the finished session

  // Latest versions of the flush functions, so listeners and the unmount cleanup never use stale state
  const flushReviewsRef = useRef<(completed?: boolean) => Promise<void>>(async () => {});
  const flushRemoteSessionRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    studySessionRef.current = studySession;
  }, [studySession]);

  // Load the deck: resume the saved session when appropriate, otherwise start fresh.
  // Waits for auth so a signed-in user's saved session can be looked up.
  useEffect(() => {
    if (authLoading || initStartedRef.current) return;
    initStartedRef.current = true;

    function startWith(source: SessionSource, cards: VocabCard[]) {
      sourceRef.current = source;
      fullDeckRef.current = cards;
      setLabel(sessionLabel(source));
      setIsReviewSession(source.type === 'ids');
      setCurrentQueue(cards);
    }

    async function restore(saved: SavedVocabSession): Promise<boolean> {
      const cards = saved.source.type === 'selection'
        ? await fetchCardsBySelections(saved.source.selections, saved.source.kanjiOnly)
        : await fetchCardsByIds(saved.source.ids);

      const byId = new Map(cards.map(card => [card.id, card]));
      const toCards = (ids: string[]) => ids.flatMap(id => byId.get(id) ?? []);
      const current = toCards(saved.currentIds);

      if (current.length === 0) {
        await clearSavedSession(user?.id);
        return false;
      }

      sourceRef.current = saved.source;
      fullDeckRef.current = cards;
      setLabel(sessionLabel(saved.source));
      setIsReviewSession(saved.source.type === 'ids');
      setCurrentQueue(current);
      setReviewQueue(toCards(saved.reviewIds));
      setCurrentIndex(Math.min(saved.currentIndex, current.length - 1));
      setRound(saved.round);
      setTotalReviewed(saved.totalReviewed);
      return true;
    }

    async function init() {
      const resume = searchParams.get('resume') === '1';
      const fresh = searchParams.get('fresh') === '1';
      const review = searchParams.get('review') === '1';
      const selectionsParam = searchParams.get('selections');

      let source: SessionSource | null = null;
      if (selectionsParam) {
        try {
          source = {
            type: 'selection',
            selections: JSON.parse(selectionsParam) as VocabSelection[],
            kanjiOnly: searchParams.get('kanjiOnly') === 'true',
          };
        } catch (e) {
          console.error('Error parsing selections:', e);
        }
      }

      // Resume when asked to, or when the URL points at the session already in progress
      // (e.g. a home-screen shortcut or reload) - but never when the user just pressed Start.
      const saved = fresh && !resume ? null : await loadSavedSession(user?.id);
      const matchesSaved = saved && (
        (source && sameSource(saved.source, source)) ||
        (review && saved.source.type === 'ids')
      );

      if (saved && (resume || matchesSaved)) {
        if (await restore(saved)) {
          setLoading(false);
          return;
        }
        if (resume) {
          router.replace('/vocabulary/select');
          return;
        }
      }

      if (review && user) {
        const ids = await getDueVocabularyIds(user.id);
        startWith({ type: 'ids', ids, label: 'Due for review' }, await fetchCardsByIds(ids));
      } else if (source) {
        startWith(source, await fetchCardsBySelections(source.selections, source.kanjiOnly));
      } else {
        router.replace('/vocabulary/select');
        return;
      }

      // Drop `fresh` so reloading this URL resumes instead of restarting
      if (fresh) {
        const url = new URL(window.location.href);
        url.searchParams.delete('fresh');
        window.history.replaceState(null, '', url);
      }

      setLoading(false);
    }

    init();
  }, [authLoading, user, searchParams, router]);

  // Create study session when queue is loaded (for logged-in users)
  useEffect(() => {
    if (!user || currentQueue.length === 0 || studySession) return;

    // Get unique textbook and lessons from current queue
    const textbooks = [...new Set(currentQueue.map(c => c.textbook))];
    const lessons = [...new Set(currentQueue.map(c => c.lesson))];

    // Create study session
    createStudySession({
      user_id: user.id,
      textbook: textbooks[0] || 'Unknown',
      lessons: lessons,
      session_type: sourceRef.current?.type === 'ids' ? 'review' : 'study',
      cards_studied: 0,
      cards_correct: 0,
      cards_incorrect: 0,
      duration_seconds: 0,
      started_at: new Date().toISOString(),
      ended_at: null,
    }).then(session => {
      if (session) {
        setStudySession(session);
      }
    });
  }, [user, currentQueue, studySession]);

  // Reset card timer when current card changes
  useEffect(() => {
    cardStartTimeRef.current = Date.now();
  }, [currentIndex]);

  // Save the session whenever it changes: locally right away, to the database shortly after
  useEffect(() => {
    const source = sourceRef.current;
    if (!source || loading || currentQueue.length === 0 || showCompletionModal || sessionCompleteRef.current) return;

    latestSessionRef.current = {
      source,
      currentIds: currentQueue.map(card => card.id!),
      reviewIds: reviewQueue.map(card => card.id!),
      currentIndex,
      round,
      totalReviewed,
      updatedAt: Date.now(),
    };
    saveSessionLocal(latestSessionRef.current);

    if (!user) return;
    remoteDirtyRef.current = true;
    const timer = setTimeout(() => flushRemoteSessionRef.current(), REMOTE_SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [user, loading, currentQueue, reviewQueue, currentIndex, round, totalReviewed, showCompletionModal]);

  // Send reviews + session stats to the database. Calls are queued so they never overlap.
  const flushReviews = (completed = false): Promise<void> => {
    const run = async () => {
      const session = studySessionRef.current;
      const batch = pendingReviewsRef.current.splice(0);
      if (!user || !session || (batch.length === 0 && !completed)) {
        pendingReviewsRef.current.unshift(...batch);
        return;
      }

      if (batch.length > 0) {
        const result = await recordCardReviewsBatch({
          userId: user.id,
          sessionId: session.id,
          reviews: batch,
        });
        if (!result) {
          // Keep them for the next attempt
          pendingReviewsRef.current.unshift(...batch);
        }
      }

      const stats = sessionStatsRef.current;
      await updateStudySession(session.id, {
        cards_studied: stats.cardsStudied,
        cards_correct: stats.cardsCorrect,
        cards_incorrect: stats.cardsIncorrect,
        duration_seconds: Math.round(stats.activeMs / 1000),
        ...(completed ? { ended_at: new Date().toISOString() } : {}),
      });
    };

    flushChainRef.current = flushChainRef.current.then(run).catch(e => {
      console.error('Error sending reviews:', e);
    });
    return flushChainRef.current;
  };

  const flushRemoteSession = async () => {
    const session = latestSessionRef.current;
    if (!user || !session || !remoteDirtyRef.current) return;
    remoteDirtyRef.current = false;
    await saveSessionRemote(user.id, session);
  };

  useEffect(() => {
    flushReviewsRef.current = flushReviews;
    flushRemoteSessionRef.current = flushRemoteSession;
  });

  // Push everything out when the page is hidden (iOS fires this when switching apps) or left
  useEffect(() => {
    const flushAll = () => {
      flushReviewsRef.current();
      flushRemoteSessionRef.current();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flushAll();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', flushAll);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', flushAll);
      flushAll();
    };
  }, []);

  const recordReview = (card: VocabCard, wasCorrect: boolean) => {
    if (!user || !studySession || !card.id) return;

    const responseTimeMs = Math.min(Date.now() - cardStartTimeRef.current, MAX_ACTIVE_MS_PER_CARD);
    pendingReviewsRef.current.push({ vocabularyId: card.id, wasCorrect, responseTimeMs });

    const stats = sessionStatsRef.current;
    stats.activeMs += responseTimeMs;
    stats.cardsStudied += 1;
    if (wasCorrect) {
      stats.cardsCorrect += 1;
    } else {
      stats.cardsIncorrect += 1;
    }
  };

  const handleGotIt = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setTriggerGreen(true);

    recordReview(currentQueue[currentIndex], true);

    setTimeout(() => {
      setTriggerGreen(false);
      setTotalReviewed(prev => prev + 1);

      // Check if this was the last card in the current queue
      const isLastCard = currentIndex >= currentQueue.length - 1;

      if (isLastCard) {
        // Start next round (will check if there are cards to review)
        startNextRoundWithQueue(reviewQueue);
      } else {
        // Move to next card
        setCurrentIndex(currentIndex + 1);
      }

      setIsProcessing(false);
    }, 600);
  };

  const handleNeedPractice = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setTriggerRed(true);

    const currentCard = currentQueue[currentIndex];
    recordReview(currentCard, false);

    setTimeout(() => {
      setTriggerRed(false);
      setTotalReviewed(prev => prev + 1);

      // Only add to review queue if it's not already there
      const isAlreadyInReview = reviewQueue.some(
        card => card.vocab === currentCard.vocab && card.lesson === currentCard.lesson
      );

      let updatedReviewQueue = reviewQueue;
      if (!isAlreadyInReview) {
        updatedReviewQueue = [...reviewQueue, currentCard];
        setReviewQueue(updatedReviewQueue);
      }

      // Check if this was the last card in the current queue
      const isLastCard = currentIndex >= currentQueue.length - 1;

      if (isLastCard) {
        // Start next round with updated review queue
        startNextRoundWithQueue(updatedReviewQueue);
      } else {
        // Move to next card
        setCurrentIndex(currentIndex + 1);
      }

      setIsProcessing(false);
    }, 600);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setTotalReviewed(prev => Math.max(0, prev - 1));
    }
  };

  const startNextRoundWithQueue = async (queueToUse: VocabCard[]) => {
    if (queueToUse.length > 0) {
      setCurrentQueue(shuffleCards(queueToUse));
      setReviewQueue([]);
      setCurrentIndex(0);
      setRound(round + 1);
    } else {
      // Session complete - send the remaining reviews and drop the saved session
      sessionCompleteRef.current = true;
      remoteDirtyRef.current = false;
      latestSessionRef.current = null;
      await Promise.all([flushReviews(true), clearSavedSession(user?.id)]);
      setShowCompletionModal(true);
    }
  };

  const resetAll = () => {
    sessionCompleteRef.current = false;
    setCurrentQueue(fullDeckRef.current);
    setReviewQueue([]);
    setCurrentIndex(0);
    setRound(1);
    setTotalReviewed(0);
    setShowCompletionModal(false);
  };

  const shuffle = () => {
    setCurrentQueue(shuffleCards(currentQueue));
    setCurrentIndex(0);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handleNeedPractice();
      } else if (e.key === 'ArrowRight') {
        handleGotIt();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, currentQueue, reviewQueue]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-fg-muted text-lg">Loading vocabulary...</div>
      </div>
    );
  }

  // Nothing to study (e.g. no cards are due for review)
  if (currentQueue.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-surface border border-line rounded-2xl p-8 max-w-md text-center">
          <h2 className="text-2xl font-medium text-fg mb-2">No cards to study</h2>
          <p className="text-fg-muted mb-6">
            {isReviewSession
              ? 'Nothing is due for review right now. Come back later!'
              : 'That selection has no cards.'}
          </p>
          <button onClick={() => router.push('/vocabulary/select')} className={primaryButton}>
            Change Selection
          </button>
        </div>
      </div>
    );
  }

  // Completion screen
  if (currentIndex >= currentQueue.length && reviewQueue.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-surface border border-line rounded-2xl p-8 max-w-md text-center">
          <h2 className="text-3xl font-medium text-success mb-4">Completed!</h2>
          <p className="text-lg text-fg mb-2">You reviewed all {totalReviewed} cards!</p>
          <p className="text-fg-muted mb-6">Total rounds: {round}</p>
          <div className="flex gap-3">
            <button onClick={resetAll} className={`flex-1 ${primaryButton}`}>
              Start Over
            </button>
            <button onClick={() => router.push('/vocabulary/select')} className={`flex-1 ${secondaryButton}`}>
              Change Selection
            </button>
            <button onClick={() => router.push('/')} className={`flex-1 ${secondaryButton}`}>
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / currentQueue.length) * 100;

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 text-sm text-fg-muted mb-3">
          <button
            onClick={() => router.push('/vocabulary/select')}
            className="hover:text-fg transition-colors shrink-0"
          >
            ← Change
          </button>
          <span className="truncate text-center">{label}</span>
          <span className="shrink-0 tabular-nums">{currentIndex + 1} / {currentQueue.length}</span>
        </header>

        {/* Progress */}
        <div className="h-1 rounded-full bg-surface-raised overflow-hidden mb-3">
          <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        {/* Round info + controls */}
        <div className="flex items-center justify-between gap-2 text-xs mb-4">
          <div className="flex gap-2 text-fg-muted">
            <span className="px-2.5 py-1 rounded-full bg-surface">Round {round}</span>
            <span className={`px-2.5 py-1 rounded-full bg-surface ${reviewQueue.length > 0 ? 'text-warn' : ''}`}>
              Review {reviewQueue.length}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-surface">Total {totalReviewed}</span>
          </div>
          <div className="flex gap-1">
            <button onClick={shuffle} className="px-2.5 py-1 rounded-full text-fg-muted hover:text-fg hover:bg-surface transition-colors">
              Shuffle
            </button>
            <button onClick={resetAll} className="px-2.5 py-1 rounded-full text-fg-muted hover:text-fg hover:bg-surface transition-colors">
              Reset
            </button>
          </div>
        </div>

        {/* Flashcard */}
        {currentIndex < currentQueue.length && (
          <div className="mb-5">
            <Flashcard
              key={`${currentQueue[currentIndex].vocab}-${currentIndex}`}
              card={currentQueue[currentIndex]}
              onSwipeLeft={handleNeedPractice}
              onSwipeRight={handleGotIt}
              triggerGreenAnimation={triggerGreen}
              triggerRedAnimation={triggerRed}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 w-full items-stretch">
          <button
            onClick={handleNeedPractice}
            className="flex-1 h-16 rounded-2xl bg-surface border border-line text-danger text-lg font-medium hover:bg-surface-raised active:scale-[0.98] transition flex items-center justify-center gap-2"
            aria-label="Need Practice"
          >
            <span className="text-2xl leading-none">✗</span> Again
          </button>
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="w-14 rounded-2xl bg-surface border border-line text-fg-muted text-xl hover:text-fg hover:bg-surface-raised disabled:opacity-40 disabled:hover:bg-surface disabled:hover:text-fg-muted disabled:cursor-not-allowed transition"
            aria-label="Previous Card"
          >
            ↶
          </button>
          <button
            onClick={handleGotIt}
            className="flex-1 h-16 rounded-2xl bg-accent text-on-accent text-lg font-medium hover:opacity-90 active:scale-[0.98] transition flex items-center justify-center gap-2"
            aria-label="Got It"
          >
            <span className="text-2xl leading-none">✓</span> Got it
          </button>
        </div>

        {/* Completion Modal */}
        {showCompletionModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-surface border border-line rounded-2xl p-8 max-w-md w-full text-center animate-fade-in">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-3xl font-medium text-success mb-4">Completed!</h2>
              <p className="text-lg text-fg mb-2">You reviewed all {totalReviewed} cards!</p>
              <p className="text-fg-muted mb-6">Total rounds: {round}</p>
              <div className="flex gap-3">
                <button onClick={resetAll} className={`flex-1 ${primaryButton}`}>
                  Start Over
                </button>
                <button onClick={() => router.push('/vocabulary/select')} className={`flex-1 ${secondaryButton}`}>
                  Change Selection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VocabularyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-fg-muted text-lg">Loading...</div>
      </div>
    }>
      <VocabularyPageContent />
    </Suspense>
  );
}

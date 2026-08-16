'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Flashcard from '../components/Flashcard';
import { VocabCard } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  createStudySession,
  recordCardReviewsBatch,
} from '../services/progressService';
import type { StudySession } from '../types/database';
import { createClient } from '../utils/supabase/client';

function VocabularyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [currentQueue, setCurrentQueue] = useState<VocabCard[]>([]);
  const [reviewQueue, setReviewQueue] = useState<VocabCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [round, setRound] = useState(1);
  const [totalReviewed, setTotalReviewed] = useState(0);

  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [triggerGreen, setTriggerGreen] = useState(false);
  const [triggerRed, setTriggerRed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Progress tracking state
  const [studySession, setStudySession] = useState<StudySession | null>(null);
  const [cardStartTime, setCardStartTime] = useState<number>(Date.now());

  // Batch review tracking - collect all reviews and send at the end
  const [pendingReviews, setPendingReviews] = useState<Array<{
    vocabularyId: string;
    wasCorrect: boolean;
    responseTimeMs: number;
  }>>([]);

  // Track session stats locally (will be sent at the end)
  const [localSessionStats, setLocalSessionStats] = useState({
    cardsStudied: 0,
    cardsCorrect: 0,
    cardsIncorrect: 0,
  });

  // Refs to access latest values in cleanup without re-running effect
  const pendingReviewsRef = useRef(pendingReviews);
  const localSessionStatsRef = useRef(localSessionStats);
  const studySessionRef = useRef(studySession);

  // Keep refs up to date
  useEffect(() => {
    pendingReviewsRef.current = pendingReviews;
  }, [pendingReviews]);

  useEffect(() => {
    localSessionStatsRef.current = localSessionStats;
  }, [localSessionStats]);

  useEffect(() => {
    studySessionRef.current = studySession;
  }, [studySession]);

  // Load data from Supabase
  useEffect(() => {
    const supabase = createClient();

    async function loadVocabulary() {
      // Try to restore from localStorage first
      const savedSession = localStorage.getItem('vocab-flashcard-session');
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          setCurrentQueue(session.currentQueue || []);
          setReviewQueue(session.reviewQueue || []);
          setCurrentIndex(session.currentIndex || 0);
          setRound(session.round || 1);
          setTotalReviewed(session.totalReviewed || 0);
          setLoading(false);
          return;
        } catch (e) {
          console.error('Error restoring session:', e);
        }
      }

      // If no session restored, load from Supabase based on URL selections
      const selectionsParam = searchParams.get('selections');
      if (!selectionsParam) {
        router.push('/vocabulary/select');
        return;
      }

      try {
        const selections: { textbook: string; lessons: string[] }[] = JSON.parse(selectionsParam);

        // Fetch vocabulary from Supabase based on selections
        const allCards: VocabCard[] = [];

        for (const selection of selections) {
          // Use RPC function to fetch vocabulary cards
          const { data, error } = await supabase
            .rpc('get_vocab_by_selection', {
              p_textbook: selection.textbook,
              p_lessons: selection.lessons
            });

          if (error) {
            console.error('Error fetching vocabulary:', error);
            continue;
          }

          // Transform database format to app format
          const cards = data.map((row: any) => ({
            id: row.id,  // Include vocabulary ID for progress tracking
            vocab: row.vocab,
            reading: row.reading || '',
            english: row.english,
            my_meaning: row.my_meaning || '',
            example_jp: row.example_jp || '',
            example_en: row.example_en || '',
            example: row.example || '',
            lesson: row.lesson,
            section: row.section || '',
            page: row.page || '',
            textbook: row.textbook,
          }));

          allCards.push(...cards);
        }

        setCurrentQueue(allCards);
      } catch (e) {
        console.error('Error parsing selections:', e);
        router.push('/vocabulary/select');
      }

      setLoading(false);
    }

    loadVocabulary();
  }, [searchParams, router]);

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
      session_type: 'study',
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
    setCardStartTime(Date.now());
  }, [currentIndex]);

  // Save session state whenever it changes
  useEffect(() => {
    if (currentQueue.length === 0) return;

    const session = {
      currentQueue,
      reviewQueue,
      currentIndex,
      round,
      totalReviewed,
    };

    localStorage.setItem('vocab-flashcard-session', JSON.stringify(session));
  }, [currentQueue, reviewQueue, currentIndex, round, totalReviewed]);

  // Send batched reviews when navigating away or closing tab
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Use refs to get latest values without re-running effect
      const currentSession = studySessionRef.current;
      const currentReviews = pendingReviewsRef.current;

      // Send batch synchronously before page unload
      if (user && currentSession && currentReviews.length > 0) {
        // Use sendBeacon for reliable delivery even as page unloads
        const reviewsJson = JSON.stringify({
          p_user_id: user.id,
          p_session_id: currentSession.id,
          p_reviews: currentReviews.map(r => ({
            vocabulary_id: r.vocabularyId,
            was_correct: r.wasCorrect,
            response_time_ms: r.responseTimeMs,
          })),
        });

        // Fallback to fetch with keepalive if sendBeacon not available
        navigator.sendBeacon?.(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/record_card_reviews_batch`,
          new Blob([reviewsJson], { type: 'application/json' })
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup on unmount - only runs when component unmounts, not on every state change
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      localStorage.removeItem('vocab-flashcard-session');

      // Send batch if user navigates away (use refs for latest values)
      if (pendingReviewsRef.current.length > 0) {
        sendBatchedReviews();
      }
    };
  }, [user]); // Only depend on user, not on state that changes frequently

  const handleGotIt = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setTriggerGreen(true);

    const currentCard = currentQueue[currentIndex];
    const responseTime = Date.now() - cardStartTime;

    // Add to batch for logged-in users (will be sent when session ends)
    if (user && studySession && currentCard.id) {
      setPendingReviews(prev => [...prev, {
        vocabularyId: currentCard.id!,
        wasCorrect: true,
        responseTimeMs: responseTime,
      }]);

      // Update local session stats (NO API CALL)
      setLocalSessionStats(prev => ({
        cardsStudied: prev.cardsStudied + 1,
        cardsCorrect: prev.cardsCorrect + 1,
        cardsIncorrect: prev.cardsIncorrect,
      }));
    }

    setTimeout(() => {
      setTriggerGreen(false);
      setTotalReviewed(prev => prev + 1);

      // Check if this was the last card in the current queue
      const isLastCard = currentIndex >= currentQueue.length - 1;

      if (isLastCard) {
        // Start next round (will check if there are cards to review)
        startNextRound();
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
    const responseTime = Date.now() - cardStartTime;

    // Add to batch for logged-in users (will be sent when session ends)
    if (user && studySession && currentCard.id) {
      setPendingReviews(prev => [...prev, {
        vocabularyId: currentCard.id!,
        wasCorrect: false,
        responseTimeMs: responseTime,
      }]);

      // Update local session stats (NO API CALL)
      setLocalSessionStats(prev => ({
        cardsStudied: prev.cardsStudied + 1,
        cardsCorrect: prev.cardsCorrect,
        cardsIncorrect: prev.cardsIncorrect + 1,
      }));
    }

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

  const startNextRound = () => {
    startNextRoundWithQueue(reviewQueue);
  };

  const startNextRoundWithQueue = async (queueToUse: VocabCard[]) => {
    if (queueToUse.length > 0) {
      // Shuffle the review queue before starting next round
      const shuffled = [...queueToUse];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setCurrentQueue(shuffled);
      setReviewQueue([]);
      setCurrentIndex(0);
      setRound(round + 1);
      // DO NOT send batch here - continue studying
    } else {
      // Session complete - send all batched reviews ONCE
      await sendBatchedReviews();
      setShowCompletionModal(true);
    }
  };

  // Send all pending reviews AND session stats in one final batch
  const sendBatchedReviews = async () => {
    if (!user || !studySession) return;

    console.log(`📤 Sending final batch: ${pendingReviews.length} reviews + session stats...`);

    // Send reviews batch (if any)
    if (pendingReviews.length > 0) {
      const result = await recordCardReviewsBatch({
        userId: user.id,
        sessionId: studySession.id,
        reviews: pendingReviews,
      });

      if (result) {
        console.log(`✅ Reviews batch sent: ${result.processed} processed, ${result.errors} errors`);
      }
    }

    // Update final session stats in one call
    const { updateStudySession } = await import('../services/progressService');
    await updateStudySession(studySession.id, {
      cards_studied: localSessionStats.cardsStudied,
      cards_correct: localSessionStats.cardsCorrect,
      cards_incorrect: localSessionStats.cardsIncorrect,
      duration_seconds: Math.floor((Date.now() - new Date(studySession.started_at).getTime()) / 1000),
      ended_at: new Date().toISOString(),
    });

    console.log(`✅ Session stats sent: ${localSessionStats.cardsStudied} cards studied`);

    // Clear batches
    setPendingReviews([]);
    setLocalSessionStats({ cardsStudied: 0, cardsCorrect: 0, cardsIncorrect: 0 });
  };

  const resetAll = () => {
    setCurrentQueue(currentQueue);
    setReviewQueue([]);
    setCurrentIndex(0);
    setRound(1);
    setTotalReviewed(0);
    setShowCompletionModal(false);
  };

  const shuffle = () => {
    const shuffled = [...currentQueue];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setCurrentQueue(shuffled);
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
        <div className="text-white text-2xl">Loading vocabulary...</div>
      </div>
    );
  }

  // Completion screen
  if (currentQueue.length > 0 && currentIndex >= currentQueue.length && reviewQueue.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
          <h2 className="text-4xl font-bold text-green-600 mb-4">Completed!</h2>
          <p className="text-xl text-gray-700 mb-2">You reviewed all {totalReviewed} cards!</p>
          <p className="text-lg text-gray-600 mb-6">Total rounds: {round}</p>
          <div className="flex gap-3">
            <button
              onClick={resetAll}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Start Over
            </button>
            <button
              onClick={() => router.push('/vocabulary/select')}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Change Selection
            </button>
            <button
              onClick={() => router.push('/')}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-4">
          <button
            onClick={() => router.push('/vocabulary/select')}
            className="text-white/80 hover:text-white mb-1 text-sm"
          >
            ← Change Selection
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Vocabulary Flashcards
          </h1>
        </header>

        {/* Stats */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-2 py-2 mb-4 flex flex-nowrap gap-2 sm:gap-4 items-center justify-between text-white text-xs sm:text-sm">
          <div className="text-center flex-1">
            <div className="opacity-80 text-[10px] sm:text-xs">Round</div>
            <div className="text-lg sm:text-xl font-bold">{round}</div>
          </div>
          <div className="text-center flex-1">
            <div className="opacity-80 text-[10px] sm:text-xs">Queue</div>
            <div className="text-lg sm:text-xl font-bold">{currentIndex + 1}/{currentQueue.length}</div>
          </div>
          <div className="text-center flex-1">
            <div className="opacity-80 text-[10px] sm:text-xs">Review</div>
            <div className="text-lg sm:text-xl font-bold text-yellow-300">{reviewQueue.length}</div>
          </div>
          <div className="text-center flex-1">
            <div className="opacity-80 text-[10px] sm:text-xs">Total</div>
            <div className="text-lg sm:text-xl font-bold">{totalReviewed}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-lg p-2 sm:p-3 mb-4 flex flex-wrap gap-2 items-center justify-center">
          <button
            onClick={shuffle}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg font-medium transition-colors text-sm"
          >
            Shuffle
          </button>
          <button
            onClick={resetAll}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg font-medium transition-colors text-sm"
          >
            Reset All
          </button>
        </div>

        {/* Flashcard */}
        {currentQueue.length > 0 && currentIndex < currentQueue.length && (
          <div className="mb-6">
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
        <div className="flex gap-3 w-full max-w-2xl items-center justify-center mb-4 mx-auto">
          <button
            onClick={handleNeedPractice}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-6 px-6 rounded-xl shadow-lg transition-all hover:scale-105 text-4xl"
            aria-label="Need Practice"
          >
            ✗
          </button>
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="bg-gray-400 hover:bg-gray-500 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-all hover:scale-105 text-xl"
            aria-label="Previous Card"
          >
            ↶
          </button>
          <button
            onClick={handleGotIt}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-6 px-6 rounded-xl shadow-lg transition-all hover:scale-105 text-4xl"
            aria-label="Got It"
          >
            ✓
          </button>
        </div>

        {/* Completion Modal */}
        {showCompletionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center animate-fade-in">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-4xl font-bold text-green-600 mb-4">Completed!</h2>
              <p className="text-xl text-gray-700 mb-2">You reviewed all {totalReviewed} cards!</p>
              <p className="text-lg text-gray-600 mb-6">Total rounds: {round}</p>
              <div className="flex gap-3">
                <button
                  onClick={resetAll}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Start Over
                </button>
                <button
                  onClick={() => router.push('/vocabulary/select')}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    }>
      <VocabularyPageContent />
    </Suspense>
  );
}

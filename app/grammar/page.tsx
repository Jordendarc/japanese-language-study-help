'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Papa from 'papaparse';
import GrammarCardComponent from '../components/GrammarCard';
import { GrammarCard } from '../types';

function GrammarPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentQueue, setCurrentQueue] = useState<GrammarCard[]>([]);
  const [reviewQueue, setReviewQueue] = useState<GrammarCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [round, setRound] = useState(1);
  const [totalReviewed, setTotalReviewed] = useState(0);

  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [triggerGreen, setTriggerGreen] = useState(false);
  const [triggerRed, setTriggerRed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load data
  useEffect(() => {
    fetch('/grammarfull.csv')
      .then(r => r.text())
      .then(csvText => {
        Papa.parse<GrammarCard>(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            // Try to restore from localStorage first
            const savedSession = localStorage.getItem('grammar-flashcard-session');
            if (savedSession) {
              try {
                const session = JSON.parse(savedSession);
                setCurrentQueue(session.currentQueue || []);
                setReviewQueue(session.reviewQueue || []);
                setCurrentIndex(session.currentIndex || 0);
                setRound(session.round || 1);
                setTotalReviewed(session.totalReviewed || 0);
              } catch (e) {
                console.error('Error restoring session:', e);
              }
            }

            // If no session restored, filter by URL selections
            if (!savedSession) {
              const selectionsParam = searchParams.get('selections');
              if (selectionsParam) {
                try {
                  const selections: { textbook: string; lessons: string[] }[] = JSON.parse(selectionsParam);

                  // Filter grammar points based on selections
                  const filtered = results.data.filter(card => {
                    return selections.some(sel =>
                      sel.textbook === card.textbook && sel.lessons.includes(card.lesson)
                    );
                  });

                  setCurrentQueue(filtered);
                } catch (e) {
                  console.error('Error parsing selections:', e);
                  router.push('/grammar/select');
                }
              } else {
                // No selections, redirect to select page
                router.push('/grammar/select');
              }
            }

            setLoading(false);
          },
        });
      })
      .catch(error => {
        console.error('Error loading CSV:', error);
        setLoading(false);
      });
  }, [searchParams, router]);

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

    localStorage.setItem('grammar-flashcard-session', JSON.stringify(session));
  }, [currentQueue, reviewQueue, currentIndex, round, totalReviewed]);

  // Clear localStorage when navigating away
  useEffect(() => {
    // Clear session on component unmount (navigation)
    return () => {
      localStorage.removeItem('grammar-flashcard-session');
    };
  }, []);

  const handleGotIt = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setTriggerGreen(true);
    setTimeout(() => {
      setTriggerGreen(false);
      if (currentIndex < currentQueue.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        startNextRound();
      }
      setTotalReviewed(prev => prev + 1);
      setIsProcessing(false);
    }, 600);
  };

  const handleNeedPractice = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setTriggerRed(true);
    setTimeout(() => {
      setTriggerRed(false);

      // Only add to review queue if it's not already there
      const currentCard = currentQueue[currentIndex];
      const isAlreadyInReview = reviewQueue.some(
        card => card.point === currentCard.point && card.lesson === currentCard.lesson
      );

      if (!isAlreadyInReview) {
        setReviewQueue([...reviewQueue, currentCard]);
      }

      if (currentIndex < currentQueue.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        startNextRound();
      }
      setTotalReviewed(prev => prev + 1);
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
    if (reviewQueue.length > 0) {
      // Shuffle the review queue before starting next round
      const shuffled = [...reviewQueue];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setCurrentQueue(shuffled);
      setReviewQueue([]);
      setCurrentIndex(0);
      setRound(round + 1);
    } else {
      setShowCompletionModal(true);
    }
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-fg-muted text-lg">Loading grammar...</div>
      </div>
    );
  }

  const primaryButton = 'bg-accent text-on-accent px-6 py-3 rounded-xl font-medium hover:opacity-90 transition';
  const secondaryButton = 'bg-surface-raised text-fg px-6 py-3 rounded-xl font-medium hover:bg-line transition';

  // Completion screen
  if (currentQueue.length > 0 && currentIndex >= currentQueue.length && reviewQueue.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-surface border border-line rounded-2xl p-8 max-w-md text-center">
          <h2 className="text-3xl font-medium text-success mb-4">Completed!</h2>
          <p className="text-lg text-fg mb-2">You reviewed all {totalReviewed} grammar points!</p>
          <p className="text-fg-muted mb-6">Total rounds: {round}</p>
          <div className="flex gap-3">
            <button onClick={resetAll} className={`flex-1 ${primaryButton}`}>
              Start Over
            </button>
            <button onClick={() => router.push('/grammar/select')} className={`flex-1 ${secondaryButton}`}>
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

  const progress = currentQueue.length > 0 ? ((currentIndex + 1) / currentQueue.length) * 100 : 0;

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 text-sm text-fg-muted mb-3">
          <button
            onClick={() => router.push('/grammar/select')}
            className="hover:text-fg transition-colors shrink-0"
          >
            ← Change
          </button>
          <span>Grammar</span>
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

        {/* GrammarCardComponent */}
        {currentQueue.length > 0 && currentIndex < currentQueue.length && (
          <div className="mb-5">
            <GrammarCardComponent
              key={`${currentQueue[currentIndex].point}-${currentIndex}`}
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
              <p className="text-lg text-fg mb-2">You reviewed all {totalReviewed} grammar points!</p>
              <p className="text-fg-muted mb-6">Total rounds: {round}</p>
              <div className="flex gap-3">
                <button onClick={resetAll} className={`flex-1 ${primaryButton}`}>
                  Start Over
                </button>
                <button onClick={() => router.push('/grammar/select')} className={`flex-1 ${secondaryButton}`}>
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

export default function GrammarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-fg-muted text-lg">Loading...</div>
      </div>
    }>
      <GrammarPageContent />
    </Suspense>
  );
}

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Papa from 'papaparse';
import Flashcard from '../components/Flashcard';
import { VocabCard } from '../types';

function VocabularyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

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

  // Load data
  useEffect(() => {
    fetch('/vocabfull.csv')
      .then(r => r.text())
      .then(csvText => {
        Papa.parse<VocabCard>(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
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

                  // Filter cards based on selections
                  const filtered = results.data.filter(card => {
                    return selections.some(sel =>
                      sel.textbook === card.textbook && sel.lessons.includes(card.lesson)
                    );
                  });

                  setCurrentQueue(filtered);
                } catch (e) {
                  console.error('Error parsing selections:', e);
                  router.push('/vocabulary/select');
                }
              } else {
                // No selections, redirect to select page
                router.push('/vocabulary/select');
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

    localStorage.setItem('vocab-flashcard-session', JSON.stringify(session));
  }, [currentQueue, reviewQueue, currentIndex, round, totalReviewed]);

  // Clear localStorage when navigating away
  useEffect(() => {
    // Clear session on component unmount (navigation)
    return () => {
      localStorage.removeItem('vocab-flashcard-session');
    };
  }, []);

  const handleGotIt = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setTriggerGreen(true);
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

  const handleNeedPractice = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setTriggerRed(true);
    setTimeout(() => {
      setTriggerRed(false);
      setTotalReviewed(prev => prev + 1);

      // Only add to review queue if it's not already there
      const currentCard = currentQueue[currentIndex];
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

  const startNextRoundWithQueue = (queueToUse: VocabCard[]) => {
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

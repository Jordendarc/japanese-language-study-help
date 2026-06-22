'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Papa from 'papaparse';
import Flashcard from '../components/Flashcard';
import { VocabCard } from '../types';

function VocabularyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [allVocabCards, setAllVocabCards] = useState<VocabCard[]>([]);
  const [currentQueue, setCurrentQueue] = useState<VocabCard[]>([]);
  const [reviewQueue, setReviewQueue] = useState<VocabCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [round, setRound] = useState(1);
  const [totalReviewed, setTotalReviewed] = useState(0);

  const [availableLessons, setAvailableLessons] = useState<string[]>([]);
  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);
  const [showLessonSelector, setShowLessonSelector] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [triggerGreen, setTriggerGreen] = useState(false);
  const [triggerRed, setTriggerRed] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);

  // Load data
  useEffect(() => {
    fetch('/vocab.csv')
      .then(r => r.text())
      .then(csvText => {
        Papa.parse<VocabCard>(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            setAllVocabCards(results.data);

            // Extract unique lessons
            const lessons = [...new Set(results.data.map(card => card.lesson).filter(Boolean))].sort();
            setAvailableLessons(lessons);

            // Try to restore session first
            const savedSession = sessionStorage.getItem('vocab-flashcard-session');
            if (savedSession) {
              try {
                const session = JSON.parse(savedSession);
                setCurrentQueue(session.currentQueue || []);
                setReviewQueue(session.reviewQueue || []);
                setCurrentIndex(session.currentIndex || 0);
                setRound(session.round || 1);
                setTotalReviewed(session.totalReviewed || 0);
                setSelectedLessons(session.selectedLessons || lessons);
                setSessionRestored(true);
              } catch (e) {
                console.error('Error restoring session:', e);
              }
            }

            // If no session restored, use URL or default
            if (!savedSession) {
              const urlLessons = searchParams.get('lessons');
              const lessonsToSelect = urlLessons ? urlLessons.split(',') : lessons;
              setSelectedLessons(lessonsToSelect);
            }

            setLoading(false);
          },
        });
      })
      .catch(error => {
        console.error('Error loading CSV:', error);
        setLoading(false);
      });
  }, []);

  // Filter and update queue when lessons change
  useEffect(() => {
    if (allVocabCards.length === 0) return;

    // Skip if we just restored a session
    if (sessionRestored) {
      setSessionRestored(false);
      return;
    }

    const filtered = selectedLessons.length === 0
      ? allVocabCards
      : allVocabCards.filter(card => selectedLessons.includes(card.lesson));

    setCurrentQueue(filtered);
    setReviewQueue([]);
    setCurrentIndex(0);
    setRound(1);
    setTotalReviewed(0);

    // Update URL
    if (selectedLessons.length > 0 && selectedLessons.length < availableLessons.length) {
      router.replace(`/vocabulary?lessons=${selectedLessons.join(',')}`);
    } else {
      router.replace('/vocabulary');
    }
  }, [selectedLessons, allVocabCards]);

  // Save session state whenever it changes
  useEffect(() => {
    if (currentQueue.length === 0) return;

    const session = {
      currentQueue,
      reviewQueue,
      currentIndex,
      round,
      totalReviewed,
      selectedLessons,
    };

    sessionStorage.setItem('vocab-flashcard-session', JSON.stringify(session));
  }, [currentQueue, reviewQueue, currentIndex, round, totalReviewed, selectedLessons]);

  // Clear session storage when navigating away
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Only clear if actually navigating away (not just refreshing)
      const navigation = (window.performance as any)?.getEntriesByType?.('navigation')?.[0];
      if (navigation && navigation.type === 'navigate') {
        sessionStorage.removeItem('vocab-flashcard-session');
      }
    };

    // Clear session on component unmount (navigation)
    return () => {
      sessionStorage.removeItem('vocab-flashcard-session');
    };
  }, []);

  const handleGotIt = () => {
    setTriggerGreen(true);
    setTimeout(() => {
      setTriggerGreen(false);
      if (currentIndex < currentQueue.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        startNextRound();
      }
      setTotalReviewed(prev => prev + 1);
    }, 600);
  };

  const handleNeedPractice = () => {
    setTriggerRed(true);
    setTimeout(() => {
      setTriggerRed(false);
      setReviewQueue([...reviewQueue, currentQueue[currentIndex]]);
      if (currentIndex < currentQueue.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        startNextRound();
      }
      setTotalReviewed(prev => prev + 1);
    }, 600);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      // Decrement total reviewed if going back
      setTotalReviewed(prev => Math.max(0, prev - 1));
    }
  };

  const startNextRound = () => {
    if (reviewQueue.length > 0) {
      setCurrentQueue(reviewQueue);
      setReviewQueue([]);
      setCurrentIndex(0);
      setRound(round + 1);
    } else {
      // All done! Show completion modal
      setShowCompletionModal(true);
    }
  };

  const resetAll = () => {
    const filtered = selectedLessons.length === 0
      ? allVocabCards
      : allVocabCards.filter(card => selectedLessons.includes(card.lesson));
    setCurrentQueue(filtered);
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

  const toggleLesson = (lesson: string) => {
    setSelectedLessons(prev =>
      prev.includes(lesson)
        ? prev.filter(l => l !== lesson)
        : [...prev, lesson].sort()
    );
  };

  const selectAllLessons = () => {
    setSelectedLessons(availableLessons);
  };

  const deselectAllLessons = () => {
    setSelectedLessons([]);
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

  if (currentQueue.length === 0 && selectedLessons.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">No Lessons Selected</h2>
          <p className="text-gray-600 mb-6">Please select at least one lesson to study.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (currentQueue.length === 0 || (currentIndex >= currentQueue.length && reviewQueue.length === 0)) {
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
        <header className="text-center mb-6">
          <button
            onClick={() => router.push('/')}
            className="text-white/80 hover:text-white mb-2 text-sm"
          >
            ← Back to Home
          </button>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2">
            Vocabulary Flashcards
          </h1>
        </header>

        {/* Lesson Selector */}
        <div className="bg-white rounded-xl shadow-lg mb-4">
          <button
            onClick={() => setShowLessonSelector(!showLessonSelector)}
            className="w-full p-4 flex items-center justify-between text-left font-semibold text-gray-800 hover:bg-gray-50 rounded-xl transition-colors"
          >
            <span>Select Lessons ({selectedLessons.length}/{availableLessons.length})</span>
            <span className="text-2xl">{showLessonSelector ? '▲' : '▼'}</span>
          </button>

          {showLessonSelector && (
            <div className="p-4 border-t">
              <div className="flex gap-2 mb-3">
                <button
                  onClick={selectAllLessons}
                  className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm font-medium"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllLessons}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  Deselect All
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {availableLessons.map(lesson => (
                  <button
                    key={lesson}
                    onClick={() => toggleLesson(lesson)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      selectedLessons.includes(lesson)
                        ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Lesson {lesson}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4 flex flex-wrap gap-4 items-center justify-center text-white">
          <div className="text-center">
            <div className="text-sm opacity-80">Round</div>
            <div className="text-2xl font-bold">{round}</div>
          </div>
          <div className="text-center">
            <div className="text-sm opacity-80">Current Queue</div>
            <div className="text-2xl font-bold">{currentIndex + 1} / {currentQueue.length}</div>
          </div>
          <div className="text-center">
            <div className="text-sm opacity-80">To Review</div>
            <div className="text-2xl font-bold text-yellow-300">{reviewQueue.length}</div>
          </div>
          <div className="text-center">
            <div className="text-sm opacity-80">Total Reviewed</div>
            <div className="text-2xl font-bold">{totalReviewed}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6 flex flex-wrap gap-3 items-center justify-center">
          <button
            onClick={shuffle}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Shuffle
          </button>
          <button
            onClick={resetAll}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Reset All
          </button>
        </div>

        {/* Flashcard */}
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
            ↑
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
                  onClick={() => router.push('/')}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Home
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

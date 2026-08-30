'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { VocabCard } from '../../types';
import { getTextbookColor } from '../../utils/textbookColors';
import { useAuth } from '../../contexts/AuthContext';
import { getDifficultWords } from '../../services/progressService';
import { createClient } from '../../utils/supabase/client';

export default function VocabularySelectPage() {
  const router = useRouter();
  const processingRef = useRef(false);
  const { user } = useAuth();

  const [vocabMetadata, setVocabMetadata] = useState<{ textbook: string; lessons: string[] }[]>([]);
  const [selectedLessonsByTextbook, setSelectedLessonsByTextbook] = useState<Map<string, Set<string>>>(new Map());
  const [selectedTextbooks, setSelectedTextbooks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDifficult, setLoadingDifficult] = useState(false);
  const [kanjiOnly, setKanjiOnly] = useState(false);

  // Load data from Supabase
  useEffect(() => {
    const supabase = createClient();

    async function loadVocabulary() {
      // Fetch vocabulary metadata (textbooks with their lessons) using RPC
      const { data, error } = await supabase
        .rpc('get_vocab_metadata');

      if (error) {
        console.error('Error loading vocabulary metadata:', error);
        setLoading(false);
        return;
      }

      console.log('📚 Vocab metadata loaded:', data);
      setVocabMetadata(data || []);

      // Initialize lesson selection structure - empty by default
      const initialLessonSelection = new Map<string, Set<string>>();
      data?.forEach((item: { textbook: string; lessons: string[] }) => {
        initialLessonSelection.set(item.textbook, new Set());
      });
      setSelectedLessonsByTextbook(initialLessonSelection);

      setLoading(false);
    }

    loadVocabulary();
  }, []);

  const toggleLesson = (textbook: string, lesson: string) => {
    if (processingRef.current) {
      console.log('Already processing, skipping');
      return;
    }

    processingRef.current = true;
    console.log('Toggle lesson clicked:', textbook, lesson);

    setSelectedLessonsByTextbook(prev => {
      const newMap = new Map(prev);
      const textbookLessons = new Set<string>(newMap.get(textbook) || new Set<string>());

      if (textbookLessons.has(lesson)) {
        textbookLessons.delete(lesson);
        console.log('Removed lesson:', lesson);
      } else {
        textbookLessons.add(lesson);
        console.log('Added lesson:', lesson);
      }

      newMap.set(textbook, textbookLessons);
      console.log('New map:', newMap);

      // Reset processing flag after a short delay
      setTimeout(() => {
        processingRef.current = false;
      }, 100);

      return newMap;
    });
  };

  const selectAllLessonsForTextbook = (textbook: string) => {
    setSelectedLessonsByTextbook(prev => {
      const newMap = new Map(prev);
      const metadata = vocabMetadata.find(m => m.textbook === textbook);
      if (metadata) {
        newMap.set(textbook, new Set(metadata.lessons));
      }
      return newMap;
    });
  };

  const deselectAllLessonsForTextbook = (textbook: string) => {
    setSelectedLessonsByTextbook(prev => {
      const newMap = new Map(prev);
      newMap.set(textbook, new Set());
      return newMap;
    });
  };

  const selectAllLessons = () => {
    const newMap = new Map<string, Set<string>>();
    selectedTextbooks.forEach(textbook => {
      const metadata = vocabMetadata.find(m => m.textbook === textbook);
      if (metadata) {
        newMap.set(textbook, new Set(metadata.lessons));
      }
    });
    // Keep empty sets for unselected textbooks
    vocabMetadata.forEach(metadata => {
      if (!newMap.has(metadata.textbook)) {
        newMap.set(metadata.textbook, new Set());
      }
    });
    setSelectedLessonsByTextbook(newMap);
  };

  const deselectAllLessons = () => {
    const newMap = new Map<string, Set<string>>();
    vocabMetadata.forEach(metadata => {
      newMap.set(metadata.textbook, new Set());
    });
    setSelectedLessonsByTextbook(newMap);
  };

  const toggleTextbook = (textbook: string) => {
    setSelectedTextbooks(prev =>
      prev.includes(textbook)
        ? prev.filter(t => t !== textbook)
        : [...prev, textbook].sort()
    );
  };

  const selectAllTextbooks = () => {
    setSelectedTextbooks(vocabMetadata.map(m => m.textbook));
  };

  const deselectAllTextbooks = () => {
    setSelectedTextbooks([]);
  };

  const selectDifficultWords = async () => {
    if (!user) {
      alert('Please sign in to use this feature');
      return;
    }

    setLoadingDifficult(true);

    try {
      // Get difficult words from database (difficulty score >= 50)
      const difficultVocab = await getDifficultWords(user.id, undefined, undefined, 50);

      if (difficultVocab.length === 0) {
        alert('No difficult words found. Study some flashcards first to build your progress data!');
        setLoadingDifficult(false);
        return;
      }

      // Group by textbook and lesson
      const selectionMap = new Map<string, Set<string>>();

      difficultVocab.forEach(progress => {
        if (!selectionMap.has(progress.textbook)) {
          selectionMap.set(progress.textbook, new Set());
        }
        selectionMap.get(progress.textbook)!.add(progress.lesson);
      });

      // Update selections
      setSelectedLessonsByTextbook(selectionMap);
      setSelectedTextbooks(Array.from(selectionMap.keys()));

      setLoadingDifficult(false);
    } catch (error) {
      console.error('Error loading difficult words:', error);
      alert('Error loading difficult words. Please try again.');
      setLoadingDifficult(false);
    }
  };

  const handleStart = () => {
    // Clear any previous session data from localStorage
    localStorage.removeItem('vocab-flashcard-session');

    // Build the selection data to pass via URL
    const selections: { textbook: string; lessons: string[] }[] = [];

    selectedTextbooks.forEach(textbook => {
      const lessons = selectedLessonsByTextbook.get(textbook);
      if (lessons && lessons.size > 0) {
        selections.push({
          textbook,
          lessons: Array.from(lessons).sort((a, b) => parseInt(a) - parseInt(b))
        });
      }
    });

    // Encode selections as JSON in URL
    const params = new URLSearchParams();
    params.set('selections', JSON.stringify(selections));
    if (kanjiOnly) {
      params.set('kanjiOnly', 'true');
    }
    router.push(`/vocabulary?${params.toString()}`);
  };

  const getTotalSelectedLessons = () => {
    let count = 0;
    selectedTextbooks.forEach(textbook => {
      const lessons = selectedLessonsByTextbook.get(textbook);
      if (lessons) {
        count += lessons.size;
      }
    });
    return count;
  };

  const hasSelectedLessons = Array.from(selectedLessonsByTextbook.values()).some(lessons => lessons.size > 0);
  const totalLessons = getTotalSelectedLessons();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
        <div className="text-white text-2xl">Loading vocabulary...</div>
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
            Select Vocabulary
          </h1>
        </header>

        {/* Difficult Words Button TODO: make this get specific cards from lesson */}
        {/* {user && (
          <button
            onClick={selectDifficultWords}
            disabled={loadingDifficult}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl shadow-lg mb-4 p-4 sm:p-5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl sm:text-3xl">🔥</div>
              <div className="text-left">
                <div className="font-bold text-base sm:text-lg">Difficult Words</div>
                <div className="text-white/90 text-xs sm:text-sm hidden sm:block">Practice your struggles</div>
              </div>
            </div>
            {loadingDifficult ? (
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
            ) : (
              <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            )}
          </button>
        )} */}

        {/* Textbook Selector */}
        <div className="bg-white rounded-xl shadow-lg mb-4 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Select Textbooks</h2>
            <div className="flex gap-2">
              <button
                onClick={selectAllTextbooks}
                className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm font-medium"
              >
                All
              </button>
              <button
                onClick={deselectAllTextbooks}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                None
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {vocabMetadata.map(metadata => {
              const colors = getTextbookColor(metadata.textbook);
              const textbookColor = colors.backgroundColor;
              const textbookTextColor = colors.textColor;

              return (
                <button
                  key={metadata.textbook}
                  onClick={() => toggleTextbook(metadata.textbook)}
                  className="px-4 py-3 rounded-lg font-medium transition-all text-left shadow-sm"
                  style={
                    selectedTextbooks.includes(metadata.textbook)
                      ? { backgroundColor: textbookColor, color: textbookTextColor }
                      : { backgroundColor: '#e5e7eb', color: '#374151' }
                  }
                >
                  {metadata.textbook}
                </button>
              );
            })}
          </div>
        </div>

        {/* Lesson Selector - only show for selected textbooks */}
        {selectedTextbooks.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg mb-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-gray-800">Select Lessons</h2>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={kanjiOnly}
                    onChange={(e) => setKanjiOnly(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-gray-700 font-medium">漢字 Kanji Only</span>
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={selectAllLessons}
                  className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm font-medium"
                >
                  All
                </button>
                <button
                  onClick={deselectAllLessons}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  None
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {selectedTextbooks.map(textbook => {
                // Get lessons for this textbook from metadata
                const metadata = vocabMetadata.find(m => m.textbook === textbook);
                const textbookLessons = metadata?.lessons || [];

                // Determine textbook color
                const colors = getTextbookColor(textbook);
                const textbookColor = colors.backgroundColor;
                const textbookTextColor = colors.textColor;

                // Get selected lessons for this textbook
                const selectedLessonsForTextbook = selectedLessonsByTextbook.get(textbook) || new Set();

                return (
                  <div key={textbook}>
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className="text-sm font-semibold px-3 py-1 rounded"
                        style={{ backgroundColor: textbookColor, color: textbookTextColor }}
                      >
                        {textbook}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => selectAllLessonsForTextbook(textbook)}
                          className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-xs hover:bg-indigo-100"
                        >
                          All
                        </button>
                        <button
                          onClick={() => deselectAllLessonsForTextbook(textbook)}
                          className="px-2 py-1 bg-gray-50 text-gray-600 rounded text-xs hover:bg-gray-100"
                        >
                          None
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {textbookLessons.map(lesson => (
                        <button
                          key={`${textbook}-${lesson}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleLesson(textbook, lesson);
                          }}
                          className="px-4 py-2 rounded-lg font-medium transition-all shadow-sm cursor-pointer"
                          style={
                            selectedLessonsForTextbook.has(lesson)
                              ? { backgroundColor: textbookColor, color: textbookTextColor }
                              : { backgroundColor: '#e5e7eb', color: '#374151' }
                          }
                        >
                          L{lesson}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary and Start Button */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Ready to Start?</h3>
            <p className="text-gray-600 mb-4">
              {selectedTextbooks.length === 0 ? (
                'Select at least one textbook to continue'
              ) : !hasSelectedLessons ? (
                `Selected ${selectedTextbooks.length} textbook(s). Now select some lessons!`
              ) : (
                <>
                  <span className="font-bold text-indigo-600">{totalLessons}</span> lesson{totalLessons !== 1 ? 's' : ''} selected from{' '}
                  <span className="font-bold">{selectedTextbooks.length}</span> textbook{selectedTextbooks.length !== 1 ? 's' : ''}
                </>
              )}
            </p>
            <button
              onClick={handleStart}
              disabled={selectedTextbooks.length === 0 || !hasSelectedLessons}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-bold text-lg transition-all shadow-lg hover:shadow-xl disabled:hover:shadow-lg"
            >
              Start Studying
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

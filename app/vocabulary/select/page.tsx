'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getTextbookColor } from '../../utils/textbookColors';
import { useAuth } from '../../contexts/AuthContext';
import { getDueVocabularyCount } from '../../services/progressService';
import { createClient } from '../../utils/supabase/client';
import ContinueSessionBanner from '../../components/ContinueSessionBanner';

export default function VocabularySelectPage() {
  const router = useRouter();
  // The kanji test reuses this picker (see app/kanji-test/select/page.tsx)
  const isKanjiTest = usePathname().startsWith('/kanji-test');
  const processingRef = useRef(false);
  const { user } = useAuth();

  const [vocabMetadata, setVocabMetadata] = useState<{ textbook: string; lessons: string[] }[]>([]);
  const [selectedLessonsByTextbook, setSelectedLessonsByTextbook] = useState<Map<string, Set<string>>>(new Map());
  const [selectedTextbooks, setSelectedTextbooks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [kanjiOnly, setKanjiOnly] = useState(false);
  const [testSize, setTestSize] = useState<'ten' | 'all'>('ten');
  const [fetchedDueCount, setFetchedDueCount] = useState<number | null>(null);
  const dueCount = user ? fetchedDueCount : null;

  // How many cards are due for spaced-repetition review (signed-in users only)
  useEffect(() => {
    if (!user) return;
    getDueVocabularyCount(user.id).then(setFetchedDueCount);
  }, [user]);

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
    if (processingRef.current) return;

    processingRef.current = true;

    setSelectedLessonsByTextbook(prev => {
      const newMap = new Map(prev);
      const textbookLessons = new Set<string>(newMap.get(textbook) || new Set<string>());

      if (textbookLessons.has(lesson)) {
        textbookLessons.delete(lesson);
      } else {
        textbookLessons.add(lesson);
      }

      newMap.set(textbook, textbookLessons);

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

  const handleStart = () => {
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
    if (isKanjiTest) {
      if (testSize === 'all') params.set('count', 'all');
    } else {
      params.set('fresh', '1'); // pressing Start always begins a new session
    }
    if (kanjiOnly) {
      params.set('kanjiOnly', 'true');
    }
    router.push(`${isKanjiTest ? '/kanji-test' : '/vocabulary'}?${params.toString()}`);
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
      <div className="min-h-screen bg-app flex items-center justify-center">
        <div className="text-fg text-2xl">Loading vocabulary...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-6">
          <button
            onClick={() => router.push('/')}
            className="text-fg-soft hover:text-fg mb-2 text-sm"
          >
            ← Back to Home
          </button>
          <h1 className="text-4xl sm:text-5xl font-medium text-fg mb-2">
            {isKanjiTest ? 'Kanji Test' : 'Select Vocabulary'}
          </h1>
        </header>

        {isKanjiTest ? (
          <p className="text-fg-soft text-center mb-6">
            Pick the chapters to draw from. Then type the hiragana reading of each kanji word, one at a time.
          </p>
        ) : (
          <ContinueSessionBanner />
        )}

        {/* Spaced-repetition review: cards whose next_review_date has arrived */}
        {!isKanjiTest && user && dueCount !== null && (
          <button
            onClick={() => router.push('/vocabulary?review=1&fresh=1')}
            disabled={dueCount === 0}
            className="w-full bg-accent hover:opacity-90 disabled:bg-surface-raised disabled:text-fg-muted disabled:cursor-not-allowed text-on-accent rounded-xl mb-4 p-4 sm:p-5 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl sm:text-3xl">🔥</div>
              <div className="text-left">
                <div className="font-medium text-base sm:text-lg">Review due cards</div>
                <div className="text-on-accent/80 text-xs sm:text-sm">
                  {dueCount === 0 ? 'Nothing due right now' : `${dueCount} due for review${dueCount > 100 ? ' (100 per session)' : ''}`}
                </div>
              </div>
            </div>
            {dueCount > 0 && (
              <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            )}
          </button>
        )}

        {/* Textbook Selector */}
        <div className="bg-surface rounded-xl mb-4 p-6 border border-line">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-medium text-fg">Select Textbooks</h2>
            <div className="flex gap-2">
              <button
                onClick={selectAllTextbooks}
                className="px-3 py-1 bg-accent/15 text-accent rounded-lg hover:bg-accent/25 transition-colors text-sm font-medium"
              >
                All
              </button>
              <button
                onClick={deselectAllTextbooks}
                className="px-3 py-1 bg-surface-raised text-fg rounded-lg hover:bg-line transition-colors text-sm font-medium"
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
                  className="px-4 py-3 rounded-lg font-medium transition-all text-left"
                  style={
                    selectedTextbooks.includes(metadata.textbook)
                      ? { backgroundColor: textbookColor, color: textbookTextColor }
                      : { backgroundColor: 'var(--surface-raised)', color: 'var(--fg-soft)' }
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
          <div className="bg-surface rounded-xl mb-4 p-6 border border-line">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-medium text-fg">Select Lessons</h2>
                {!isKanjiTest && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={kanjiOnly}
                    onChange={(e) => setKanjiOnly(e.target.checked)}
                    className="w-4 h-4 text-accent rounded focus:ring-accent"
                  />
                  <span className="text-fg font-medium">漢字 Kanji Only</span>
                </label>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={selectAllLessons}
                  className="px-3 py-1 bg-accent/15 text-accent rounded-lg hover:bg-accent/25 transition-colors text-sm font-medium"
                >
                  All
                </button>
                <button
                  onClick={deselectAllLessons}
                  className="px-3 py-1 bg-surface-raised text-fg rounded-lg hover:bg-line transition-colors text-sm font-medium"
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
                        className="text-sm font-medium px-3 py-1 rounded"
                        style={{ backgroundColor: textbookColor, color: textbookTextColor }}
                      >
                        {textbook}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => selectAllLessonsForTextbook(textbook)}
                          className="px-2 py-1 bg-accent/15 text-accent rounded text-xs hover:bg-accent/25"
                        >
                          All
                        </button>
                        <button
                          onClick={() => deselectAllLessonsForTextbook(textbook)}
                          className="px-2 py-1 bg-surface-raised text-fg-soft rounded text-xs hover:bg-line"
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
                          className="px-4 py-2 rounded-lg font-medium transition-all cursor-pointer"
                          style={
                            selectedLessonsForTextbook.has(lesson)
                              ? { backgroundColor: textbookColor, color: textbookTextColor }
                              : { backgroundColor: 'var(--surface-raised)', color: 'var(--fg-soft)' }
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
        <div className="bg-surface rounded-xl p-6 border border-line">
          <div className="text-center">
            <h3 className="text-lg font-medium text-fg mb-2">Ready to Start?</h3>
            <p className="text-fg-soft mb-4">
              {selectedTextbooks.length === 0 ? (
                'Select at least one textbook to continue'
              ) : !hasSelectedLessons ? (
                `Selected ${selectedTextbooks.length} textbook(s). Now select some lessons!`
              ) : (
                <>
                  <span className="font-medium text-accent">{totalLessons}</span> lesson{totalLessons !== 1 ? 's' : ''} selected from{' '}
                  <span className="font-medium">{selectedTextbooks.length}</span> textbook{selectedTextbooks.length !== 1 ? 's' : ''}
                </>
              )}
            </p>
            {isKanjiTest && (
              <div className="flex w-fit mx-auto rounded-xl bg-surface-raised p-1 mb-4" role="group" aria-label="Test size">
                {([['ten', '10 random words'], ['all', 'All words']] as const).map(([value, text]) => (
                  <button
                    key={value}
                    onClick={() => setTestSize(value)}
                    aria-pressed={testSize === value}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      testSize === value ? 'bg-accent text-on-accent' : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    {text}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={handleStart}
              disabled={selectedTextbooks.length === 0 || !hasSelectedLessons}
              className="bg-accent hover:opacity-90 disabled:bg-surface-raised disabled:cursor-not-allowed text-on-accent px-8 py-3 rounded-lg font-medium text-lg transition-all"
            >
              {isKanjiTest ? 'Start Test' : 'Start Studying'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

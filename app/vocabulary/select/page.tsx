'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { VocabCard } from '../../types';

export default function VocabularySelectPage() {
  const router = useRouter();
  const processingRef = useRef(false);

  const [allVocabCards, setAllVocabCards] = useState<VocabCard[]>([]);
  const [availableLessons, setAvailableLessons] = useState<string[]>([]);
  const [selectedLessonsByTextbook, setSelectedLessonsByTextbook] = useState<Map<string, Set<string>>>(new Map());
  const [availableTextbooks, setAvailableTextbooks] = useState<string[]>([]);
  const [selectedTextbooks, setSelectedTextbooks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data
  useEffect(() => {
    fetch('/vocabfull.csv')
      .then(r => r.text())
      .then(csvText => {
        Papa.parse<VocabCard>(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            setAllVocabCards(results.data);

            // Extract unique lessons and textbooks
            const lessons = [...new Set(results.data.map(card => card.lesson).filter(Boolean))].sort((a, b) => {
              return parseInt(a) - parseInt(b);
            });
            setAvailableLessons(lessons);

            const textbooks = [...new Set(results.data.map(card => card.textbook).filter(Boolean))].sort();
            setAvailableTextbooks(textbooks);

            // Initialize lesson selection structure - empty by default
            const initialLessonSelection = new Map<string, Set<string>>();
            textbooks.forEach(tb => {
              initialLessonSelection.set(tb, new Set());
            });
            setSelectedLessonsByTextbook(initialLessonSelection);

            setLoading(false);
          },
        });
      })
      .catch(error => {
        console.error('Error loading CSV:', error);
        setLoading(false);
      });
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
      const textbookLessons = new Set(newMap.get(textbook) || new Set());

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
      const textbookLessons = allVocabCards
        .filter(card => card.textbook === textbook)
        .map(card => card.lesson);
      newMap.set(textbook, new Set(textbookLessons));
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
      const textbookLessons = allVocabCards
        .filter(card => card.textbook === textbook)
        .map(card => card.lesson);
      newMap.set(textbook, new Set(textbookLessons));
    });
    // Keep empty sets for unselected textbooks
    availableTextbooks.forEach(textbook => {
      if (!newMap.has(textbook)) {
        newMap.set(textbook, new Set());
      }
    });
    setSelectedLessonsByTextbook(newMap);
  };

  const deselectAllLessons = () => {
    const newMap = new Map<string, Set<string>>();
    availableTextbooks.forEach(textbook => {
      newMap.set(textbook, new Set());
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
    setSelectedTextbooks(availableTextbooks);
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
    router.push(`/vocabulary?${params.toString()}`);
  };

  const getTotalSelectedCards = () => {
    let count = 0;
    selectedTextbooks.forEach(textbook => {
      const lessons = selectedLessonsByTextbook.get(textbook);
      if (lessons) {
        lessons.forEach(lesson => {
          count += allVocabCards.filter(
            card => card.textbook === textbook && card.lesson === lesson
          ).length;
        });
      }
    });
    return count;
  };

  const hasSelectedLessons = Array.from(selectedLessonsByTextbook.values()).some(lessons => lessons.size > 0);
  const totalCards = getTotalSelectedCards();

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
          <p className="text-white/80 text-lg">Choose textbooks and lessons to study</p>
        </header>

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
            {availableTextbooks.map(textbook => {
              // Check for 初中級 first (more specific), then 中級
              const isShochukyu = textbook.includes('初中級');
              const textbookColor = isShochukyu ? '#F9DD00' : '#01AAC9';
              const textbookTextColor = isShochukyu ? '#000000' : '#ffffff';

              return (
                <button
                  key={textbook}
                  onClick={() => toggleTextbook(textbook)}
                  className="px-4 py-3 rounded-lg font-medium transition-all text-left shadow-sm"
                  style={
                    selectedTextbooks.includes(textbook)
                      ? { backgroundColor: textbookColor, color: textbookTextColor }
                      : { backgroundColor: '#e5e7eb', color: '#374151' }
                  }
                >
                  {textbook}
                </button>
              );
            })}
          </div>
        </div>

        {/* Lesson Selector - only show for selected textbooks */}
        {selectedTextbooks.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg mb-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Select Lessons</h2>
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
                // Get lessons for this textbook
                const textbookLessons = availableLessons.filter(lesson =>
                  allVocabCards.some(card => card.textbook === textbook && card.lesson === lesson)
                );

                // Determine textbook color - check for 初中級 first (more specific)
                const isShochukyu = textbook.includes('初中級');
                const textbookColor = isShochukyu ? '#F9DD00' : '#01AAC9';
                const textbookTextColor = isShochukyu ? '#000000' : '#ffffff';

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
                  <span className="font-bold text-indigo-600">{totalCards}</span> cards selected from{' '}
                  <span className="font-bold">{selectedTextbooks.length}</span> textbook(s)
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

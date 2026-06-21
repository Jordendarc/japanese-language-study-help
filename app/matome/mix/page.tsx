'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MatomeTest } from '../../types';

interface LessonOption {
  lesson: number;
  totalQuestions: number;
}

export default function MatomeMixPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<LessonOption[]>([]);
  const [selectedLessons, setSelectedLessons] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch('/matome/glmjsonwithhiragana.json')
      .then(r => r.json())
      .then(data => {
        const tests = data.tests as MatomeTest[];

        const lessonOptions: LessonOption[] = tests.map(test => {
          let totalQuestions = 0;
          test.problems.forEach(problem => {
            if (problem.type === 'word_bank' || problem.type === 'multiple_choice' || problem.type === 'word_order') {
              totalQuestions += problem.sentences?.length || 0;
            } else if (problem.type === 'reading') {
              totalQuestions += problem.statements?.length || 0;
            }
          });

          return {
            lesson: test.lesson,
            totalQuestions,
          };
        });

        lessonOptions.sort((a, b) => a.lesson - b.lesson);
        setLessons(lessonOptions);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading matome tests:', error);
        setLoading(false);
      });
  }, []);

  const toggleLesson = (lesson: number) => {
    const newSelected = new Set(selectedLessons);
    if (newSelected.has(lesson)) {
      newSelected.delete(lesson);
    } else {
      newSelected.add(lesson);
    }
    setSelectedLessons(newSelected);
  };

  const selectAll = () => {
    setSelectedLessons(new Set(lessons.map(l => l.lesson)));
  };

  const clearAll = () => {
    setSelectedLessons(new Set());
  };

  const startMixedTest = () => {
    if (selectedLessons.size === 0) return;
    const lessonParam = Array.from(selectedLessons).sort((a, b) => a - b).join(',');
    router.push(`/matome/test?lessons=${lessonParam}`);
  };

  const totalQuestions = lessons
    .filter(l => selectedLessons.has(l.lesson))
    .reduce((sum, l) => sum + l.totalQuestions, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-600 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <button
            onClick={() => router.push('/matome')}
            className="mb-6 text-white/80 hover:text-white transition-colors flex items-center gap-2 mx-auto"
          >
            <span>←</span>
            <span>Back to Tests</span>
          </button>
          <div className="text-6xl mb-4">🎲</div>
          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4">
            Mix Lessons
          </h1>
          <p className="text-white/80 text-xl">
            Select lessons to create a mixed test
          </p>
        </header>

        {/* Selection Summary */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3 sm:gap-4">
            <div>
              <div className="text-xl sm:text-2xl font-bold text-purple-600">
                {selectedLessons.size} {selectedLessons.size === 1 ? 'Lesson' : 'Lessons'}
              </div>
              <div className="text-sm sm:text-base text-gray-600">
                {totalQuestions} questions
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="px-3 sm:px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-semibold text-sm sm:text-base"
              >
                Select All
              </button>
              <button
                onClick={clearAll}
                className="px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold text-sm sm:text-base"
              >
                Clear
              </button>
            </div>
          </div>

          {selectedLessons.size > 0 && (
            <button
              onClick={startMixedTest}
              className="w-full py-3 sm:py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg sm:rounded-xl font-bold text-base sm:text-xl hover:from-purple-600 hover:to-pink-600 transition-all hover:scale-[1.02] shadow-lg"
            >
              Start Mixed Test ({totalQuestions})
            </button>
          )}
        </div>

        {/* Lesson Selection */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Select Lessons</h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {lessons.map(lesson => {
              const isSelected = selectedLessons.has(lesson.lesson);
              return (
                <button
                  key={lesson.lesson}
                  onClick={() => toggleLesson(lesson.lesson)}
                  className={`p-4 sm:p-6 rounded-lg sm:rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-200'
                      : 'bg-gray-50 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-lg sm:text-2xl font-bold text-purple-600">
                      L{lesson.lesson}
                    </div>
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded border-2 flex items-center justify-center ${
                      isSelected
                        ? 'bg-purple-500 border-purple-500'
                        : 'bg-white border-gray-300'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="text-xs sm:text-base text-gray-600">
                    {lesson.totalQuestions} qs
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-white">
          <h3 className="text-xl font-bold mb-3">How it works</h3>
          <ul className="space-y-2 text-white/90">
            <li className="flex items-start gap-2">
              <span>1️⃣</span>
              <span>Select one or more lessons you want to practice</span>
            </li>
            <li className="flex items-start gap-2">
              <span>2️⃣</span>
              <span>All questions from selected lessons will be combined</span>
            </li>
            <li className="flex items-start gap-2">
              <span>3️⃣</span>
              <span>Questions will be randomly shuffled for variety</span>
            </li>
            <li className="flex items-start gap-2">
              <span>4️⃣</span>
              <span>Take the test and see your score at the end!</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

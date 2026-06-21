'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MatomeTest } from '../types';

interface LessonSummary {
  lesson: number;
  totalQuestions: number;
  sections: {
    wordBank: number;
    multipleChoice: number;
    wordOrder: number;
    reading: number;
  };
}

export default function MatomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);

  useEffect(() => {
    fetch('/matome/glmjson.json')
      .then(r => r.json())
      .then(data => {
        const tests = data.tests as MatomeTest[];

        // Create summaries
        const summaries: LessonSummary[] = tests.map(test => {
          let totalQuestions = 0;
          const sections = {
            wordBank: 0,
            multipleChoice: 0,
            wordOrder: 0,
            reading: 0,
          };

          test.problems.forEach(problem => {
            if (problem.type === 'word_bank') {
              const count = problem.sentences?.length || 0;
              sections.wordBank += count;
              totalQuestions += count;
            } else if (problem.type === 'multiple_choice') {
              const count = problem.sentences?.length || 0;
              sections.multipleChoice += count;
              totalQuestions += count;
            } else if (problem.type === 'word_order') {
              const count = problem.sentences?.length || 0;
              sections.wordOrder += count;
              totalQuestions += count;
            } else if (problem.type === 'reading') {
              const count = problem.statements?.length || 0;
              sections.reading += count;
              totalQuestions += count;
            }
          });

          return {
            lesson: test.lesson,
            totalQuestions,
            sections,
          };
        });

        summaries.sort((a, b) => a.lesson - b.lesson);
        setLessons(summaries);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading matome tests:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
        <div className="text-white text-2xl">Loading tests...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-teal-600 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12">
          <button
            onClick={() => router.push('/')}
            className="mb-6 text-white/80 hover:text-white transition-colors flex items-center gap-2 mx-auto"
          >
            <span>←</span>
            <span>Back to Home</span>
          </button>
          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4">
            Matome Tests
          </h1>
          <p className="text-white/80 text-xl">
            Select a lesson to test your knowledge
          </p>
        </header>

        {/* Mix Lessons Button */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/matome/mix')}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl sm:rounded-2xl shadow-2xl p-6 sm:p-8 hover:shadow-3xl transition-all hover:scale-[1.02] group"
          >
            <div className="flex items-center justify-center gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div className="text-4xl sm:text-5xl">🎲</div>
              <h2 className="text-2xl sm:text-4xl font-bold">Mix Lessons</h2>
            </div>
            <p className="text-white/90 text-sm sm:text-lg mb-2">
              Select multiple lessons and get a shuffled mixed test
            </p>
            <div className="text-white font-semibold group-hover:translate-x-2 transition-transform inline-block text-sm sm:text-base">
              Start mixing →
            </div>
          </button>
        </div>

        {/* Lesson Cards */}
        <div className="grid gap-4 sm:gap-6">
          {lessons.map(lesson => (
            <button
              key={lesson.lesson}
              onClick={() => router.push(`/matome/${lesson.lesson}`)}
              className="bg-white rounded-xl sm:rounded-2xl shadow-2xl p-6 sm:p-8 hover:shadow-3xl transition-all hover:scale-[1.02] text-left group"
            >
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-3xl sm:text-4xl font-bold text-emerald-600">
                  Lesson {lesson.lesson}
                </h2>
                <div className="text-4xl sm:text-5xl">✅</div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-emerald-50 rounded-lg p-3 sm:p-4">
                  <div className="text-xs sm:text-sm text-gray-600 mb-1">Word Bank</div>
                  <div className="text-lg sm:text-2xl font-bold text-emerald-600">
                    {lesson.sections.wordBank}
                  </div>
                </div>

                <div className="bg-emerald-50 rounded-lg p-3 sm:p-4">
                  <div className="text-xs sm:text-sm text-gray-600 mb-1">Multiple Choice</div>
                  <div className="text-lg sm:text-2xl font-bold text-emerald-600">
                    {lesson.sections.multipleChoice}
                  </div>
                </div>

                <div className="bg-emerald-50 rounded-lg p-3 sm:p-4">
                  <div className="text-xs sm:text-sm text-gray-600 mb-1">Word Order</div>
                  <div className="text-lg sm:text-2xl font-bold text-emerald-600">
                    {lesson.sections.wordOrder}
                  </div>
                </div>

                <div className="bg-emerald-50 rounded-lg p-3 sm:p-4">
                  <div className="text-xs sm:text-sm text-gray-600 mb-1">Reading</div>
                  <div className="text-lg sm:text-2xl font-bold text-emerald-600">
                    {lesson.sections.reading}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm sm:text-base">
                <div className="text-gray-600">
                  Total: <span className="font-bold text-gray-800">{lesson.totalQuestions}</span>
                </div>
                <div className="text-emerald-600 font-semibold group-hover:translate-x-2 transition-transform">
                  Start test →
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Instructions */}
        <div className="mt-12 bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-white">
          <h3 className="text-2xl font-bold mb-6 text-center">Test Format</h3>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <span>📝</span>
                <span>Word Bank Questions</span>
              </h4>
              <p className="text-sm text-white/80">
                Choose the correct word from a list to complete each sentence
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <span>✏️</span>
                <span>Multiple Choice</span>
              </h4>
              <p className="text-sm text-white/80">
                Select the best answer from multiple options
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <span>📖</span>
                <span>Reading Comprehension</span>
              </h4>
              <p className="text-sm text-white/80">
                Read passages and determine if statements are true or false
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <span>🎯</span>
                <span>Instant Grading</span>
              </h4>
              <p className="text-sm text-white/80">
                See your results immediately after submitting
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

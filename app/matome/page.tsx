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
  textbook: string;
}

type Textbook = 'dekiru' | 'manabou';

export default function MatomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [selectedTextbook, setSelectedTextbook] = useState<Textbook>('dekiru');

  useEffect(() => {
    const jsonFile = selectedTextbook === 'dekiru'
      ? '/matome/glmjsonwithhiragana.json'
      : '/manaboumatome.json';

    setLoading(true);
    fetch(jsonFile)
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
            textbook: selectedTextbook,
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
  }, [selectedTextbook]);

  if (loading) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center">
        <div className="text-fg text-2xl">Loading tests...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12">
          <button
            onClick={() => router.push('/')}
            className="mb-6 text-fg-soft hover:text-fg transition-colors flex items-center gap-2 mx-auto"
          >
            <span>←</span>
            <span>Back to Home</span>
          </button>
          <h1 className="text-5xl sm:text-6xl font-medium text-fg mb-4">
            Matome Tests
          </h1>
          <p className="text-fg-soft text-xl mb-6">
            Select a lesson to test your knowledge
          </p>

          {/* Textbook Selector */}
          <div className="flex justify-center gap-4 mt-8">
            <button
              onClick={() => setSelectedTextbook('dekiru')}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                selectedTextbook === 'dekiru'
                  ? 'bg-surface text-accent scale-105 border border-line'
                  : 'bg-surface-raised text-fg hover:bg-surface-raised'
              }`}
            >
              できる日本語 中級
            </button>
            <button
              onClick={() => setSelectedTextbook('manabou')}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                selectedTextbook === 'manabou'
                  ? 'bg-surface text-accent scale-105 border border-line'
                  : 'bg-surface-raised text-fg hover:bg-surface-raised'
              }`}
            >
              まなぼう！中上級
            </button>
          </div>
        </header>

        {/* Mix Lessons Button */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/matome/mix?textbook=${selectedTextbook}`)}
            className="w-full bg-accent text-on-accent rounded-xl sm:rounded-2xl p-6 sm:p-8 transition-all hover:scale-[1.02] group"
          >
            <div className="flex items-center justify-center gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div className="text-4xl sm:text-5xl">🎲</div>
              <h2 className="text-2xl sm:text-4xl font-medium">Mix Lessons</h2>
            </div>
            <p className="text-on-accent/80 text-sm sm:text-lg mb-2">
              Select multiple lessons and get a shuffled mixed test
            </p>
            <div className="text-on-accent font-medium group-hover:translate-x-2 transition-transform inline-block text-sm sm:text-base">
              Start mixing →
            </div>
          </button>
        </div>

        {/* Lesson Cards */}
        <div className="grid gap-4 sm:gap-6">
          {lessons.map(lesson => (
            <button
              key={lesson.lesson}
              onClick={() => router.push(`/matome/${lesson.lesson}?textbook=${selectedTextbook}`)}
              className="bg-surface rounded-xl sm:rounded-2xl p-6 sm:p-8 transition-all hover:scale-[1.02] text-left group border border-line"
            >
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-3xl sm:text-4xl font-medium text-accent">
                  Lesson {lesson.lesson}
                </h2>
                <div className="text-4xl sm:text-5xl">✅</div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-accent/15 rounded-lg p-3 sm:p-4">
                  <div className="text-xs sm:text-sm text-fg-soft mb-1">Word Bank</div>
                  <div className="text-lg sm:text-2xl font-medium text-accent">
                    {lesson.sections.wordBank}
                  </div>
                </div>

                <div className="bg-accent/15 rounded-lg p-3 sm:p-4">
                  <div className="text-xs sm:text-sm text-fg-soft mb-1">Multiple Choice</div>
                  <div className="text-lg sm:text-2xl font-medium text-accent">
                    {lesson.sections.multipleChoice}
                  </div>
                </div>

                <div className="bg-accent/15 rounded-lg p-3 sm:p-4">
                  <div className="text-xs sm:text-sm text-fg-soft mb-1">Word Order</div>
                  <div className="text-lg sm:text-2xl font-medium text-accent">
                    {lesson.sections.wordOrder}
                  </div>
                </div>

                <div className="bg-accent/15 rounded-lg p-3 sm:p-4">
                  <div className="text-xs sm:text-sm text-fg-soft mb-1">Reading</div>
                  <div className="text-lg sm:text-2xl font-medium text-accent">
                    {lesson.sections.reading}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm sm:text-base">
                <div className="text-fg-soft">
                  Total: <span className="font-medium text-fg">{lesson.totalQuestions}</span>
                </div>
                <div className="text-accent font-medium group-hover:translate-x-2 transition-transform">
                  Start test →
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Instructions */}
        <div className="mt-12 bg-surface-raised backdrop-blur-sm rounded-2xl p-8 text-fg">
          <h3 className="text-2xl font-medium mb-6 text-center">Test Format</h3>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <span>📝</span>
                <span>Word Bank Questions</span>
              </h4>
              <p className="text-sm text-fg-soft">
                Choose the correct word from a list to complete each sentence
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <span>✏️</span>
                <span>Multiple Choice</span>
              </h4>
              <p className="text-sm text-fg-soft">
                Select the best answer from multiple options
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <span>📖</span>
                <span>Reading Comprehension</span>
              </h4>
              <p className="text-sm text-fg-soft">
                Read passages and determine if statements are true or false
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <span>🎯</span>
                <span>Instant Grading</span>
              </h4>
              <p className="text-sm text-fg-soft">
                See your results immediately after submitting
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

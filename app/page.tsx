'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Papa from 'papaparse';
import { VocabCard, GrammarCard, MatomeTest } from './types';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [vocabCount, setVocabCount] = useState(0);
  const [grammarCount, setGrammarCount] = useState(0);
  const [matomeCount, setMatomeCount] = useState(0);
  const [vocabLessons, setVocabLessons] = useState<string[]>([]);
  const [grammarLessons, setGrammarLessons] = useState<string[]>([]);
  const [matomeLessons, setMatomeLessons] = useState<number[]>([]);
  const [kanjiCount, setKanjiCount] = useState(0);

  useEffect(() => {
    // Load CSV files and matome JSON to get counts and lessons
    Promise.all([
      fetch('/vocabfull.csv').then(r => r.text()),
      fetch('/grammarfull.csv').then(r => r.text()),
      fetch('/matome/glmjsonwithhiragana.json').then(r => r.json()),
      fetch('/kanji/kanjiWithMeanings.json').then(r => r.json())
    ])
      .then(([vocabText, grammarText, matomeData, kanjiData]) => {
        // Parse vocabulary
        Papa.parse<VocabCard>(vocabText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            setVocabCount(results.data.length);
            const textbooks = [...new Set(results.data.map(card => card.textbook).filter(t => t && t.length > 5))].sort();
            setVocabLessons(textbooks);
          },
        });

        // Parse grammar
        Papa.parse<GrammarCard>(grammarText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            setGrammarCount(results.data.length);
            const textbooks = [...new Set(results.data.map(card => card.textbook).filter(t => t && t.length > 5))].sort();
            setGrammarLessons(textbooks);
          },
        });

        // Parse matome data
        const tests = matomeData.tests as MatomeTest[];
        const totalQuestions = tests.reduce((sum, test) => {
          return sum + test.problems.reduce((pSum, problem) => {
            if (problem.type === 'word_bank' || problem.type === 'multiple_choice' || problem.type === 'word_order') {
              return pSum + (problem.sentences?.length || 0);
            } else if (problem.type === 'reading') {
              return pSum + (problem.statements?.length || 0);
            }
            return pSum;
          }, 0);
        }, 0);
        setMatomeCount(totalQuestions);
        const lessons = tests.map(t => t.lesson).sort((a, b) => a - b);
        setMatomeLessons(lessons);

        // Set kanji count
        setKanjiCount(kanjiData.length);

        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading data:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4">
            Japanese Study App
          </h1>
          <p className="text-white/80 text-xl">
            Choose what you'd like to study
          </p>
        </header>

        {/* Search Button */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/search')}
            className="w-full bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all hover:scale-[1.02] group"
          >
            <div className="flex items-center justify-center gap-4">
              <div className="text-3xl">🔍</div>
              <div className="text-2xl font-bold text-gray-800">Search All Content</div>
            </div>
          </button>
        </div>

        {/* Study Mode Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Vocabulary Card */}
          <button
            onClick={() => router.push('/vocabulary/select')}
            className="bg-white rounded-2xl shadow-2xl p-8 hover:shadow-3xl transition-all hover:scale-105 text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-3xl font-bold text-indigo-600">Vocabulary</h2>
              <div className="text-4xl">📝</div>
            </div>
            <p className="text-gray-600 mb-4">
              Study Japanese vocabulary with example sentences
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{vocabCount} cards</span>
              <span className="text-gray-500">{vocabLessons.length} textbook{vocabLessons.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="mt-4 text-indigo-600 font-semibold group-hover:translate-x-2 transition-transform">
              Start studying →
            </div>
          </button>

          {/* Grammar Card */}
          <button
            onClick={() => router.push('/grammar/select')}
            className="bg-white rounded-2xl shadow-2xl p-8 hover:shadow-3xl transition-all hover:scale-105 text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-3xl font-bold text-purple-600">Grammar</h2>
              <div className="text-4xl">📚</div>
            </div>
            <p className="text-gray-600 mb-4">
              Master Japanese grammar patterns and usage
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{grammarCount} grammar points</span>
              <span className="text-gray-500">{grammarLessons.length} textbook{grammarLessons.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="mt-4 text-purple-600 font-semibold group-hover:translate-x-2 transition-transform">
              Start studying →
            </div>
          </button>

          {/* Matome Tests Card */}
          <button
            onClick={() => router.push('/matome')}
            className="bg-white rounded-2xl shadow-2xl p-8 hover:shadow-3xl transition-all hover:scale-105 text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-3xl font-bold text-emerald-600">Matome Tests</h2>
              <div className="text-4xl">✅</div>
            </div>
            <p className="text-gray-600 mb-4">
              Practice with comprehensive lesson tests
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{matomeCount} questions</span>
              <span className="text-gray-500">Lessons {matomeLessons[0]}-{matomeLessons[matomeLessons.length - 1]}</span>
            </div>
            <div className="mt-4 text-emerald-600 font-semibold group-hover:translate-x-2 transition-transform">
              Take a test →
            </div>
          </button>

          {/* Kanji Dictionary Card */}
          <button
            onClick={() => router.push('/kanji')}
            className="bg-white rounded-2xl shadow-2xl p-8 hover:shadow-3xl transition-all hover:scale-105 text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-3xl font-bold text-orange-600">漢字 Dictionary</h2>
              <div className="text-4xl">📚</div>
            </div>
            <p className="text-gray-600 mb-4">
              Browse kanji with all related vocabulary
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{kanjiCount} kanji</span>
              <span className="text-gray-500">With examples</span>
            </div>
            <div className="mt-4 text-orange-600 font-semibold group-hover:translate-x-2 transition-transform">
              Browse kanji →
            </div>
          </button>

          {/* N3 Quiz Card */}
          <button
            onClick={() => router.push('/n3-quiz')}
            className="bg-white rounded-2xl shadow-2xl p-8 hover:shadow-3xl transition-all hover:scale-105 text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-3xl font-bold text-pink-600">N3 Practice Quiz</h2>
              <div className="text-4xl">🎯</div>
            </div>
            <p className="text-gray-600 mb-4">
              Review JLPT N3 kanji and vocabulary questions
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">19 questions</span>
              <span className="text-gray-500">Multiple choice</span>
            </div>
            <div className="mt-4 text-pink-600 font-semibold group-hover:translate-x-2 transition-transform">
              Start quiz →
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MatomeTest } from './types';
import { createClient } from './utils/supabase/client';

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
    const supabase = createClient();

    async function loadData() {
      try {
        // Fetch vocabulary count
        const { count: vocabCount, error: vocabCountError } = await supabase
          .from('vocabulary')
          .select('*', { count: 'exact', head: true });

        // Fetch distinct vocabulary textbooks using RPC function
        const { data: vocabTextbooks, error: vocabError } = await supabase
          .rpc('get_vocab_textbooks');

        // Fetch grammar count
        const { count: grammarCount, error: grammarCountError } = await supabase
          .from('grammar')
          .select('*', { count: 'exact', head: true });

        // Fetch distinct grammar textbooks using RPC function
        const { data: grammarTextbooks, error: grammarError } = await supabase
          .rpc('get_grammar_textbooks');

        // Fetch kanji count from database
        const { count: kanjiCount, error: kanjiCountError } = await supabase
          .from('kanji')
          .select('*', { count: 'exact', head: true });

        // Fetch matome from JSON
        const matomeData = await fetch('/matome/glmjsonwithhiragana.json').then(r => r.json());

        // Vocabulary
        if (vocabTextbooks && !vocabError && !vocabCountError) {
          setVocabCount(vocabCount || 0);
          const textbooks = vocabTextbooks.map((row: any) => row.textbook).filter(Boolean).sort();
          console.log('📚 Vocab - Total:', vocabCount, 'Textbooks:', textbooks);
          setVocabLessons(textbooks);
        } else {
          console.error('❌ Vocab error:', vocabError || vocabCountError);
        }

        // Grammar
        if (grammarTextbooks && !grammarError && !grammarCountError) {
          setGrammarCount(grammarCount || 0);
          const textbooks = grammarTextbooks.map((row: any) => row.textbook).filter(Boolean).sort();
          console.log('📗 Grammar - Total:', grammarCount, 'Textbooks:', textbooks);
          setGrammarLessons(textbooks);
        } else {
          console.error('❌ Grammar error:', grammarError || grammarCountError);
        }

        // Matome tests
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

        // Kanji count from database
        if (!kanjiCountError) {
          setKanjiCount(kanjiCount || 0);
          console.log('📝 Kanji - Total:', kanjiCount);
        } else {
          console.error('❌ Kanji error:', kanjiCountError);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    }

    loadData();
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
            Jojos Study Buddy
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

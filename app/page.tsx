'use client';

import Link from 'next/link';
import Papa from 'papaparse';
import { useEffect, useState } from 'react';
import { MatomeTest } from './types';
import { createClient } from './utils/supabase/client';
import ContinueSessionBanner from './components/ContinueSessionBanner';

interface TextbookRow {
  textbook: string | null;
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [vocabCount, setVocabCount] = useState(0);
  const [grammarCount, setGrammarCount] = useState(0);
  const [matomeCount, setMatomeCount] = useState(0);
  const [vocabLessons, setVocabLessons] = useState<string[]>([]);
  const [grammarLessons, setGrammarLessons] = useState<string[]>([]);
  const [matomeLessons, setMatomeLessons] = useState<number[]>([]);
  const [kanjiCount, setKanjiCount] = useState(0);
  const [n3Count, setN3Count] = useState(0);

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
          const textbooks = (vocabTextbooks as TextbookRow[]).map(row => row.textbook).filter((t): t is string => !!t).sort();
          setVocabLessons(textbooks);
        } else {
          console.error('❌ Vocab error:', vocabError || vocabCountError);
        }

        // Grammar
        if (grammarTextbooks && !grammarError && !grammarCountError) {
          setGrammarCount(grammarCount || 0);
          const textbooks = (grammarTextbooks as TextbookRow[]).map(row => row.textbook).filter((t): t is string => !!t).sort();
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

        // JLPT N3 quiz questions
        const n3Csv = await fetch('/n3_quiz.csv').then(r => r.text());
        const n3Rows = Papa.parse<{ id?: string; sentence_jp?: string }>(n3Csv, { header: true }).data;
        setN3Count(n3Rows.filter(q => q.id && q.sentence_jp).length);

        // Kanji count from database
        if (!kanjiCountError) {
          setKanjiCount(kanjiCount || 0);
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

  // Counts show a dash until they load so the page itself renders immediately
  const count = (n: number) => (loading ? '—' : n);

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl sm:text-6xl font-medium text-fg mb-4">
            Jojos Study Buddy
          </h1>
          <p className="text-fg-soft text-xl">
            Choose what you&apos;d like to study
          </p>
        </header>

        <ContinueSessionBanner />

        {/* Search Button */}
        <div className="mb-8">
          <Link
            href="/search"
            className="block w-full bg-surface rounded-2xl p-6 transition-all hover:scale-[1.02] group border border-line"
          >
            <div className="flex items-center justify-center gap-4">
              <div className="text-3xl">🔍</div>
              <div className="text-2xl font-medium text-fg">Search All Content</div>
            </div>
          </Link>
        </div>

        {/* Study Mode Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Vocabulary Card */}
          <Link
            href="/vocabulary/select"
            className="block bg-surface rounded-2xl p-8 transition-all hover:scale-105 text-left group border border-line"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-3xl font-medium text-accent">Vocabulary</h2>
              <div className="text-4xl">📝</div>
            </div>
            <p className="text-fg-soft mb-4">
              Study Japanese vocabulary with example sentences
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-fg-muted">{count(vocabCount)} cards</span>
              <span className="text-fg-muted">{count(vocabLessons.length)} textbook{vocabLessons.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="mt-4 text-accent font-medium group-hover:translate-x-2 transition-transform">
              Start studying →
            </div>
          </Link>

          {/* Grammar Card */}
          <Link
            href="/grammar/select"
            className="block bg-surface rounded-2xl p-8 transition-all hover:scale-105 text-left group border border-line"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-3xl font-medium text-accent">Grammar</h2>
              <div className="text-4xl">📚</div>
            </div>
            <p className="text-fg-soft mb-4">
              Master Japanese grammar patterns and usage
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-fg-muted">{count(grammarCount)} grammar points</span>
              <span className="text-fg-muted">{count(grammarLessons.length)} textbook{grammarLessons.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="mt-4 text-accent font-medium group-hover:translate-x-2 transition-transform">
              Start studying →
            </div>
          </Link>

          {/* Matome Tests Card */}
          <Link
            href="/matome"
            className="block bg-surface rounded-2xl p-8 transition-all hover:scale-105 text-left group border border-line"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-3xl font-medium text-accent">Matome Tests</h2>
              <div className="text-4xl">✅</div>
            </div>
            <p className="text-fg-soft mb-4">
              Practice with comprehensive lesson tests
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-fg-muted">{count(matomeCount)} questions</span>
              <span className="text-fg-muted">{loading ? '—' : `Lessons ${matomeLessons[0]}-${matomeLessons[matomeLessons.length - 1]}`}</span>
            </div>
            <div className="mt-4 text-accent font-medium group-hover:translate-x-2 transition-transform">
              Take a test →
            </div>
          </Link>

          {/* Kanji Dictionary Card */}
          <Link
            href="/kanji"
            className="block bg-surface rounded-2xl p-8 transition-all hover:scale-105 text-left group border border-line"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-3xl font-medium text-accent">漢字 Dictionary</h2>
              <div className="text-4xl">📚</div>
            </div>
            <p className="text-fg-soft mb-4">
              Browse kanji with all related vocabulary
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-fg-muted">{count(kanjiCount)} kanji</span>
              <span className="text-fg-muted">With examples</span>
            </div>
            <div className="mt-4 text-accent font-medium group-hover:translate-x-2 transition-transform">
              Browse kanji →
            </div>
          </Link>

          {/* Kanji Test Card */}
          <Link
            href="/kanji-test/select"
            className="block bg-surface rounded-2xl p-8 transition-all hover:scale-105 text-left group border border-line"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-3xl font-medium text-accent">Kanji Test</h2>
              <div className="text-4xl">✍️</div>
            </div>
            <p className="text-fg-soft mb-4">
              Type the reading of random kanji words from a chapter
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-fg-muted">10 words per test</span>
              <span className="text-fg-muted">Instant answer check</span>
            </div>
            <div className="mt-4 text-accent font-medium group-hover:translate-x-2 transition-transform">
              Take a test →
            </div>
          </Link>

          {/* N3 Quiz Card */}
          <Link
            href="/n3-quiz"
            className="block bg-surface rounded-2xl p-8 transition-all hover:scale-105 text-left group border border-line"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-3xl font-medium text-accent">N3 Practice Quiz</h2>
              <div className="text-4xl">🎯</div>
            </div>
            <p className="text-fg-soft mb-4">
              Review JLPT N3 kanji and vocabulary questions
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-fg-muted">{count(n3Count)} questions</span>
              <span className="text-fg-muted">Multiple choice</span>
            </div>
            <div className="mt-4 text-accent font-medium group-hover:translate-x-2 transition-transform">
              Start quiz →
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

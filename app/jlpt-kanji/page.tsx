'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { VocabCard } from '../types';
import Furigana from '../components/Furigana';
import { useAuth } from '../contexts/AuthContext';
import { useTestProgress } from '../hooks/useTestProgress';
import { loadBankQuestions, loadQuestionData } from '../services/jlptService';
import { fetchCardsBySelections, type VocabSelection } from '../services/vocabularyService';
import { buildQuestion, findTarget, KINDS, type Kind, type Question, type QuestionData } from '../utils/jlptQuestions';

// JLPT-style 文字・語彙 test built from the chosen chapters' words, in test order:
//   問題1 漢字読み and 問題2 表記     built live from the kanji data (app/utils/jlptQuestions.ts)
//   問題3 語形成 to 問題6 用法        from the jlpt_questions bank (scripts/v2/jlpt-questions.ts)

const TEST_SIZE = 10;
const HAS_KANJI = /[一-龯々]/;
const SELECT_PAGE = '/jlpt-kanji/select';
const LIVE_KINDS: Kind[] = ['reading', 'writing'];

const PICK_BLANK = '（　）に入れるのに最もよいものを、1・2・3・4から一つえらびなさい。';
const INSTRUCTIONS: Record<Kind, { title: string; short: string; jp: string; en: string }> = {
  reading: { title: '問題1　漢字読み', short: '漢字読み', jp: '＿＿＿の言葉の読み方として最もよいものを、1・2・3・4から一つえらびなさい。', en: 'Choose the best reading for the underlined word.' },
  writing: { title: '問題2　表記', short: '表記', jp: '＿＿＿の言葉を漢字で書くとき、最もよいものを、1・2・3・4から一つえらびなさい。', en: 'Choose the best way to write the underlined word in kanji.' },
  word_formation: { title: '問題3　語形成', short: '語形成', jp: PICK_BLANK, en: 'Choose the best word part for the blank.' },
  context: { title: '問題4　文脈規定', short: '文脈規定', jp: PICK_BLANK, en: 'Choose the best word for the blank.' },
  paraphrase: { title: '問題5　言い換え類義', short: '言い換え類義', jp: '＿＿＿の言葉に意味が最も近いものを、1・2・3・4から一つえらびなさい。', en: 'Choose the word closest in meaning to the underlined word.' },
  usage: { title: '問題6　用法', short: '用法', jp: '次の言葉の使い方として最もよいものを、1・2・3・4から一つえらびなさい。', en: 'Choose the sentence that uses the word correctly.' },
};

interface Answered {
  question: Question;
  picked: number | null;
}

function shuffle<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// A bank question with its choices in a new order (live questions are rebuilt instead)
const reshuffled = (q: Question): Question => ({ ...q, choices: shuffle(q.choices) });

/**
 * A fresh test: every possible question for the chosen types, then (for a 10-question test) a random few with
 * no word asked twice, sorted into test order (問題1 first).
 */
function buildTest(cards: VocabCard[], data: QuestionData, bank: Question[], kinds: Kind[], size: number | 'all'): Answered[] {
  const live = kinds.filter(k => LIVE_KINDS.includes(k));
  const candidates: Question[] = [];
  for (const card of cards) {
    if (!live.length) break;
    const q = buildQuestion(card, data, live[Math.floor(Math.random() * live.length)]);
    if (q && kinds.includes(q.kind)) candidates.push(q);
  }
  candidates.push(...bank.filter(q => kinds.includes(q.kind)).map(reshuffled));

  let picked = shuffle(candidates);
  // one question per word, and never both halves of a 言い換え pair (あつかましい → ずうずうしい, then
  // ずうずうしい → あつかましい would give the second answer away)
  const used = new Set<string>();
  picked = picked.filter(q => {
    const answer = q.kind === 'paraphrase' ? q.choices.find(c => c.correct)?.text : undefined;
    if ((size !== 'all' && used.has(q.card.vocab)) || (answer && used.has(answer))) return false;
    used.add(q.card.vocab);
    if (answer) used.add(answer);
    return true;
  });
  if (size !== 'all') picked = picked.slice(0, size);
  return picked
    .sort((a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind))
    .map(question => ({ question, picked: null }));
}

/** The question's sentence, with the underlined part or the blank. */
function Prompt({ q }: { q: Question }) {
  if (q.kind === 'usage') {
    return <p lang="ja" className="mt-6 mb-2 text-3xl text-fg text-center">{q.target ?? q.card.vocab}</p>;
  }
  const slot =
    q.kind === 'word_formation' || q.kind === 'context' ? (
      <span className="inline-block min-w-[3.5em] text-center text-fg-muted">（　　）</span>
    ) : (
      <span className="underline decoration-2 underline-offset-[6px] decoration-accent">
        {q.kind === 'reading' ? q.written : q.kind === 'writing' ? q.reading : q.target}
      </span>
    );
  return (
    <p lang="ja" className={`mt-6 mb-2 text-fg leading-loose ${q.before || q.after ? 'text-xl sm:text-2xl' : 'text-3xl text-center'}`}>
      {q.before}
      {slot}
      {q.after}
    </p>
  );
}

function JlptKanjiContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [pool, setPool] = useState<VocabCard[]>([]);
  const [data, setData] = useState<QuestionData | null>(null);
  const [bank, setBank] = useState<Question[]>([]);
  const [items, setItems] = useState<Answered[]>([]);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const size: number | 'all' = searchParams.get('count') === 'all' ? 'all' : TEST_SIZE;
  const typesParam = searchParams.get('types');
  const kinds = useMemo<Kind[]>(() => {
    const chosen = (typesParam ?? '').split(',').filter((k): k is Kind => (KINDS as readonly string[]).includes(k));
    return chosen.length ? chosen : [...KINDS];
  }, [typesParam]);
  const selectionsParam = searchParams.get('selections');
  const selections = useMemo<VocabSelection[] | null>(() => {
    if (!selectionsParam) return null;
    try {
      return JSON.parse(selectionsParam) as VocabSelection[];
    } catch {
      return null;
    }
  }, [selectionsParam]);

  const progress = useTestProgress({
    textbook: selections?.[0]?.textbook ?? '',
    lessons: () => [...new Set(items.map(i => i.question.card.lesson))],
    label: 'JLPT kanji test',
  });

  useEffect(() => {
    if (!selections) {
      router.replace(SELECT_PAGE);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const cards = await fetchCardsBySelections(selections, false);
        const seen = new Set<string>();
        const unique = cards.filter(card => {
          const key = `${card.vocab}|${card.reading}`;
          // kana-only words (あいにく) may have no reading; they still have written questions
          if ((!card.reading && HAS_KANJI.test(card.vocab)) || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        // 読み / 表記 need kanji; the written questions work for any word
        const withKanji = unique.filter(card => HAS_KANJI.test(card.vocab));
        const characters = [...new Set(withKanji.flatMap(c => c.vocab.match(/[一-龯々]/g) ?? []))];
        const otherWords = withKanji.map(findTarget).filter(t => t !== null).map(t => ({ written: t.written, reading: t.reading }));
        const [questionData, bankQuestions] = await Promise.all([loadQuestionData(characters, otherWords), loadBankQuestions(unique)]);
        if (cancelled) return;
        setPool(withKanji);
        setData(questionData);
        setBank(bankQuestions);
        setItems(buildTest(withKanji, questionData, bankQuestions, kinds, size));
      } catch (error) {
        console.error('Error building the JLPT kanji test:', error);
        if (!cancelled) setFailed(true);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [selections, kinds, size, router]);

  useEffect(() => {
    progress.questionShown();
    // restart the timer for each question
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, loading]);

  const startNew = (next: Answered[]) => {
    setItems(next);
    setIndex(0);
    setDone(false);
    progress.reset();
    window.scrollTo({ top: 0 });
  };

  const item = items[index] as Answered | undefined;
  const answered = item?.picked != null;

  const pick = (choice: number) => {
    if (!item || answered) return;
    progress.record(item.question.card.id, item.question.choices[choice].correct);
    setItems(prev => prev.map((it, i) => (i === index ? { ...it, picked: choice } : it)));
  };

  const advance = () => {
    if (index + 1 < items.length) {
      setIndex(index + 1);
      window.scrollTo({ top: 0 });
    } else {
      setDone(true);
      progress.finish();
    }
  };

  // 1-4 to answer, Enter or → for the next question
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done || !item) return;
      if (!answered && /^[1-4]$/.test(e.key)) pick(Number(e.key) - 1);
      else if (answered && (e.key === 'Enter' || e.key === 'ArrowRight')) advance();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-fg-muted text-lg">Writing questions...</div>
      </div>
    );
  }

  if (failed || items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-surface border border-line rounded-2xl p-8 max-w-md text-center">
          <h2 className="text-2xl font-medium text-fg mb-2">{failed ? 'Couldn’t load the test' : 'No questions for these chapters'}</h2>
          <p className="text-fg-muted mb-6">
            {failed
              ? 'Check your connection and try again.'
              : 'Those chapters have no questions of the chosen types yet. Try other chapters or question types.'}
          </p>
          <button onClick={() => router.push(SELECT_PAGE)} className="bg-accent text-on-accent px-6 py-3 rounded-xl font-medium hover:opacity-90 transition">
            Change chapters
          </button>
        </div>
      </div>
    );
  }

  // ---- results
  if (done) {
    const right = items.filter(it => it.picked != null && it.question.choices[it.picked].correct).length;
    const missed = items.filter(it => it.picked != null && !it.question.choices[it.picked].correct);
    return (
      <div className="min-h-screen p-4 sm:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-surface border border-line rounded-2xl p-8 text-center mb-4">
            <div className="text-6xl font-light text-accent mb-1">{right} / {items.length}</div>
            <p className="text-fg-soft mb-6">{missed.length === 0 ? 'Perfect score!' : `${missed.length} to review`}</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => data && startNew(buildTest(pool, data, bank, kinds, size))}
                className="bg-accent text-on-accent px-5 py-3 rounded-xl font-medium hover:opacity-90 transition"
              >
                {size === 'all' ? 'Reshuffle all' : `New ${TEST_SIZE} questions`}
              </button>
              {missed.length > 0 && data && (
                <button
                  onClick={() =>
                    startNew(
                      shuffle(missed).map(it => ({
                        question: LIVE_KINDS.includes(it.question.kind)
                          ? buildQuestion(it.question.card, data, it.question.kind) ?? it.question
                          : reshuffled(it.question),
                        picked: null,
                      }))
                    )
                  }
                  className="bg-surface-raised text-fg px-5 py-3 rounded-xl font-medium hover:bg-line transition"
                >
                  Retry {missed.length} missed
                </button>
              )}
              <button onClick={() => router.push(SELECT_PAGE)} className="bg-surface-raised text-fg px-5 py-3 rounded-xl font-medium hover:bg-line transition">
                Change chapters
              </button>
            </div>
          </div>

          {!authLoading && !user && (
            <p className="text-fg-muted text-sm text-center mb-4">
              <a href="/auth/login" className="text-accent hover:underline">Sign in</a> to save your results and track your progress.
            </p>
          )}

          {missed.length > 0 && (
            <ul className="space-y-2">
              {missed.map(it => {
                const q = it.question;
                const chosen = q.choices[it.picked!];
                const correct = q.choices.find(c => c.correct)!;
                return (
                  <li key={`${q.kind}-${q.card.id ?? q.card.vocab}`} className="bg-surface border border-line rounded-2xl px-5 py-4">
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      <span lang="ja" className="text-2xl text-fg">{q.card.vocab}</span>
                      <span lang="ja" className="text-lg text-accent">{q.card.reading}</span>
                      <span lang="ja" className="text-xs text-fg-muted">{INSTRUCTIONS[q.kind].short}</span>
                    </div>
                    <div lang="ja" className="text-sm text-fg mt-1">Answer: {correct.text}</div>
                    <div className="text-sm text-danger">
                      You picked <span lang="ja">{chosen.text}</span>
                      {chosen.note ? `: ${chosen.note}` : ''}
                    </div>
                    <div className="text-fg-muted text-sm">{q.card.my_meaning || q.card.english}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  }

  // ---- question
  const q = item!.question;
  const info = INSTRUCTIONS[q.kind];
  const percent = ((index + (answered ? 1 : 0)) / items.length) * 100;
  const sentences = q.kind === 'usage';

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center justify-between gap-3 text-sm text-fg-muted mb-3">
          <button onClick={() => router.push(SELECT_PAGE)} className="hover:text-fg transition-colors shrink-0">← Change</button>
          <span>JLPT kanji</span>
          <span className="shrink-0 tabular-nums">{index + 1} / {items.length}</span>
        </header>
        <div className="h-1 rounded-full bg-surface-raised overflow-hidden mb-4">
          <div className="h-full bg-accent transition-all duration-300" style={{ width: `${percent}%` }} />
        </div>

        <div className="bg-surface border border-line rounded-2xl p-5 sm:p-7">
          <div lang="ja" className="text-sm font-medium text-accent">{info.title}</div>
          <p lang="ja" className="text-xs text-fg-soft mt-1">{info.jp}</p>
          <p className="text-xs text-fg-muted">{info.en}</p>
          <Prompt q={q} />
        </div>

        <div className={`mt-4 grid grid-cols-1 gap-2 ${sentences ? '' : 'sm:grid-cols-2'}`} role="group" aria-label="Answers">
          {q.choices.map((choice, i) => {
            const isPicked = item!.picked === i;
            const style = !answered
              ? 'bg-surface border-line hover:border-accent'
              : choice.correct
                ? 'bg-success/15 border-success'
                : isPicked
                  ? 'bg-danger/15 border-danger'
                  : 'bg-surface border-line opacity-70';
            return (
              <button
                key={choice.text}
                onClick={() => pick(i)}
                disabled={answered}
                className={`text-left rounded-2xl border px-4 py-3 transition ${style}`}
              >
                <span className="flex items-baseline gap-3">
                  <span className="text-sm text-fg-muted tabular-nums shrink-0">{i + 1}</span>
                  <span lang="ja" className={`${sentences ? 'text-base leading-relaxed' : 'text-xl'} text-fg`}>{choice.text}</span>
                  {answered && choice.correct && <span className="ml-auto text-success text-sm">✓</span>}
                  {answered && isPicked && !choice.correct && <span className="ml-auto text-danger text-sm">✗</span>}
                </span>
                {answered && !choice.correct && choice.note && (
                  <span lang="ja" className="block text-xs text-fg-muted mt-1 ml-6">{choice.note}</span>
                )}
              </button>
            );
          })}
        </div>

        {answered && (
          <>
            <div className="mt-4 bg-surface border border-line rounded-2xl p-5">
              {q.explanation && <p className="text-sm text-fg mb-3">{q.explanation}</p>}
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span lang="ja" className="text-2xl text-fg">{q.card.vocab}</span>
                <span lang="ja" className="text-accent">{q.card.reading}</span>
              </div>
              <div className="text-fg-soft text-sm mt-1">{q.card.my_meaning || q.card.english}</div>
              {q.card.example_jp && (
                <div className="mt-3 pt-3 border-t border-line">
                  <Furigana text={q.card.example_jp} className="text-base text-fg" />
                  {q.card.example_en && <p className="text-sm text-fg-muted mt-1">{q.card.example_en}</p>}
                </div>
              )}
            </div>
            <button
              onClick={advance}
              className="mt-4 w-full h-16 rounded-2xl bg-accent text-on-accent text-lg font-medium hover:opacity-90 active:scale-[0.98] transition"
            >
              {index + 1 < items.length ? 'Next' : 'See results'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function JlptKanjiPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-fg-muted text-lg">Loading...</div>
        </div>
      }
    >
      <JlptKanjiContent />
    </Suspense>
  );
}

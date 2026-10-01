'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { VocabCard } from '../types';
import { fetchCardsBySelections, type VocabSelection } from '../services/vocabularyService';
import { useAuth } from '../contexts/AuthContext';
import { createStudySession, recordCardReviewsBatch, updateStudySession } from '../services/progressService';
import type { StudySession } from '../types/database';

const TEST_SIZE = 10;
// A card left open counts as at most this much study time
const MAX_ACTIVE_MS_PER_CARD = 60_000;
const HAS_KANJI = /[一-龯々]/;

type Mark = 'right' | 'wrong' | null;

interface TestItem {
  card: VocabCard;
  answer: string;
  mark: Mark;
}

function toHiragana(text: string): string {
  return text.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

function normalize(text: string): string {
  return toHiragana(text.normalize('NFKC'))
    .replace(/[～〜~]/g, '')
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/\s+/g, '');
}

// A reading can list alternatives ("きょう/こんにち"); any one of them is correct
function acceptedReadings(reading: string): string[] {
  const options = reading.split(/[/／;；、,]/).map(normalize).filter(Boolean);
  const whole = normalize(reading);
  return whole && !options.includes(whole) ? [...options, whole] : options;
}

function isCorrect(item: TestItem): boolean {
  return acceptedReadings(item.card.reading).includes(normalize(item.answer));
}

function shuffle<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Every test starts shuffled
function buildTest(cards: VocabCard[], size: number): TestItem[] {
  return shuffle(cards)
    .slice(0, size)
    .map(card => ({ card, answer: '', mark: null }));
}

function KanjiTestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [pool, setPool] = useState<VocabCard[]>([]);
  const [items, setItems] = useState<TestItem[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [showError, setShowError] = useState(false);
  const [loading, setLoading] = useState(true);

  // Progress is recorded for signed-in users the same way the flashcards do it: one study session
  // per test, with each graded answer batched into the database (which updates streaks and review dates)
  const sessionRef = useRef<Promise<StudySession | null> | null>(null);
  const pendingRef = useRef<{ vocabularyId: string; wasCorrect: boolean; responseTimeMs: number }[]>([]);
  const statsRef = useRef({ studied: 0, correct: 0, incorrect: 0, activeMs: 0 });
  const cardShownAtRef = useRef(0);
  const flushChainRef = useRef<Promise<void>>(Promise.resolve());
  const flushRef = useRef<(completed?: boolean) => Promise<void>>(async () => {});

  // Test size is chosen on the select page and arrives in the URL
  const useAll = searchParams.get('count') === 'all';
  const selectionsParam = searchParams.get('selections');
  const selections = useMemo<VocabSelection[] | null>(() => {
    if (!selectionsParam) return null;
    try {
      return JSON.parse(selectionsParam) as VocabSelection[];
    } catch {
      return null;
    }
  }, [selectionsParam]);

  const sizeFor = (poolSize: number) => (useAll ? poolSize : TEST_SIZE);

  useEffect(() => {
    if (!selections) {
      router.replace('/kanji-test/select');
      return;
    }

    let cancelled = false;
    fetchCardsBySelections(selections, false).then(cards => {
      if (cancelled) return;
      // Only words that actually contain kanji and have a reading to check against
      const seen = new Set<string>();
      const testable = cards.filter(card => {
        const key = `${card.vocab}|${card.reading}`;
        if (!card.reading || !HAS_KANJI.test(card.vocab) || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setPool(testable);
      setItems(buildTest(testable, useAll ? testable.length : TEST_SIZE));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [selections, useAll, router]);

  const startNew = (next: TestItem[]) => {
    setItems(next);
    setIndex(0);
    setRevealed(false);
    setDone(false);
    setShowError(false);
    sessionRef.current = null;
    statsRef.current = { studied: 0, correct: 0, incorrect: 0, activeMs: 0 };
    cardShownAtRef.current = Date.now();
    window.scrollTo({ top: 0 });
  };

  // Starts timing each card for the response-time stat
  useEffect(() => {
    cardShownAtRef.current = Date.now();
  }, [index, loading]);

  // Sends the answers so far (and the session totals) to the database. Calls are queued so they never overlap.
  const flush = (completed = false): Promise<void> => {
    const sessionPromise = sessionRef.current;
    const batch = pendingRef.current.splice(0);
    const stats = { ...statsRef.current };

    const run = async () => {
      const session = await sessionPromise;
      if (!user || !session || (batch.length === 0 && !completed)) return;

      if (batch.length > 0) {
        const result = await recordCardReviewsBatch({ userId: user.id, sessionId: session.id, reviews: batch });
        if (!result) {
          // Keep them for the next attempt
          pendingRef.current.unshift(...batch);
          return;
        }
      }

      await updateStudySession(session.id, {
        cards_studied: stats.studied,
        cards_correct: stats.correct,
        cards_incorrect: stats.incorrect,
        duration_seconds: Math.round(stats.activeMs / 1000),
        ...(completed ? { ended_at: new Date().toISOString() } : {}),
      });
    };

    flushChainRef.current = flushChainRef.current.then(run).catch(e => {
      console.error('Error saving kanji test progress:', e);
    });
    return flushChainRef.current;
  };

  useEffect(() => {
    flushRef.current = flush;
  });

  // Save what's been answered when the page is hidden (iOS app switch) or left mid-test
  useEffect(() => {
    const flushNow = () => {
      flushRef.current();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flushNow();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', flushNow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', flushNow);
      flushNow();
    };
  }, []);

  const recordAnswer = (item: TestItem, wasCorrect: boolean) => {
    if (!user || !item.card.id) return;

    if (!sessionRef.current) {
      sessionRef.current = createStudySession({
        user_id: user.id,
        textbook: selections?.[0]?.textbook ?? item.card.textbook,
        lessons: [...new Set(items.map(i => i.card.lesson))],
        session_type: 'kanji_test',
        cards_studied: 0,
        cards_correct: 0,
        cards_incorrect: 0,
        duration_seconds: 0,
        started_at: new Date().toISOString(),
        ended_at: null,
      });
    }

    const responseTimeMs = Math.min(Date.now() - cardShownAtRef.current, MAX_ACTIVE_MS_PER_CARD);
    pendingRef.current.push({ vocabularyId: item.card.id, wasCorrect, responseTimeMs });
    statsRef.current.activeMs += responseTimeMs;
    statsRef.current.studied += 1;
    if (wasCorrect) statsRef.current.correct += 1;
    else statsRef.current.incorrect += 1;
  };

  const setAnswer = (answer: string) => {
    setShowError(false);
    setItems(prev => prev.map((item, i) => (i === index ? { ...item, answer } : item)));
  };

  // Grades the typed answer and shows the correct reading
  const reveal = () => {
    if (!items[index].answer.trim()) {
      setShowError(true);
      return;
    }
    const correct = isCorrect(items[index]);
    recordAnswer(items[index], correct);
    setItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, mark: correct ? 'right' : 'wrong' } : item))
    );
    setRevealed(true);
  };

  const advance = () => {
    setShowError(false);
    if (index + 1 < items.length) {
      setIndex(index + 1);
      setRevealed(false);
    } else {
      setDone(true);
      flush(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-fg-muted text-lg">Picking words...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-surface border border-line rounded-2xl p-8 max-w-md text-center">
          <h2 className="text-2xl font-medium text-fg mb-2">No kanji words found</h2>
          <p className="text-fg-muted mb-6">Those chapters don&apos;t have words with kanji readings to test. Try another selection.</p>
          <button
            onClick={() => router.push('/kanji-test/select')}
            className="bg-accent text-on-accent px-6 py-3 rounded-xl font-medium hover:opacity-90 transition"
          >
            Change chapters
          </button>
        </div>
      </div>
    );
  }

  // Results
  if (done) {
    const rightCount = items.filter(item => item.mark === 'right').length;
    const missed = items.filter(item => item.mark === 'wrong');

    return (
      <div className="min-h-screen p-4 sm:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-surface border border-line rounded-2xl p-8 text-center mb-4">
            <div className="text-6xl font-light text-accent mb-1">
              {rightCount} / {items.length}
            </div>
            <p className="text-fg-soft mb-6">
              {missed.length === 0 ? 'Perfect score!' : `${missed.length} to review`}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => startNew(buildTest(pool, sizeFor(pool.length)))}
                className="bg-accent text-on-accent px-5 py-3 rounded-xl font-medium hover:opacity-90 transition"
              >
                {useAll ? 'Reshuffle all' : `New ${TEST_SIZE} words`}
              </button>
              {missed.length > 0 && (
                <button
                  onClick={() => startNew(shuffle(missed).map(item => ({ card: item.card, answer: '', mark: null })))}
                  className="bg-surface-raised text-fg px-5 py-3 rounded-xl font-medium hover:bg-line transition"
                >
                  Retry {missed.length} missed
                </button>
              )}
              <button
                onClick={() => router.push('/kanji-test/select')}
                className="bg-surface-raised text-fg px-5 py-3 rounded-xl font-medium hover:bg-line transition"
              >
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
              {missed.map(item => (
                <li key={item.card.id ?? item.card.vocab} className="bg-surface border border-line rounded-2xl px-5 py-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span lang="ja" className="text-2xl text-fg whitespace-nowrap">{item.card.vocab}</span>
                  <span lang="ja" className="text-lg text-accent whitespace-nowrap">{item.card.reading}</span>
                  <span className="text-fg-muted text-sm w-full">{item.card.my_meaning || item.card.english}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  const item = items[index];
  const isLast = index + 1 >= items.length;
  const progress = ((index + (revealed ? 1 : 0)) / items.length) * 100;

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center justify-between gap-3 text-sm text-fg-muted mb-3">
          <button onClick={() => router.push('/kanji-test/select')} className="hover:text-fg transition-colors shrink-0">
            ← Change
          </button>
          <span>Kanji test</span>
          <span className="shrink-0 tabular-nums">{index + 1} / {items.length}</span>
        </header>

        <div className="h-1 rounded-full bg-surface-raised overflow-hidden mb-4">
          <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        <div className="bg-surface border border-line rounded-2xl p-6 sm:p-8 min-h-96 flex flex-col items-center justify-center text-center">
          <div lang="ja" className={`font-light text-fg break-words max-w-full ${revealed ? 'text-5xl' : 'text-6xl sm:text-7xl'}`}>
            {item.card.vocab}
          </div>

          {revealed && (
            <div className="mt-6">
              <div lang="ja" className="text-3xl text-accent">{item.card.reading}</div>
              {item.mark === 'right' ? (
                <div className="text-success font-medium mt-2">Correct</div>
              ) : (
                <div className="mt-2">
                  <div className="text-danger font-medium">Incorrect</div>
                  <div lang="ja" className="text-danger line-through text-lg">{item.answer}</div>
                </div>
              )}
              <div className="text-fg-muted mt-3">{item.card.my_meaning || item.card.english}</div>
            </div>
          )}
        </div>

        <div className="mt-5 space-y-3">
          {!revealed ? (
            <>
              <div>
                <input
                  key={index}
                  type="text"
                  lang="ja"
                  value={item.answer}
                  onChange={e => setAnswer(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      reveal();
                    }
                  }}
                  placeholder="Type the reading in hiragana"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label={`Reading of ${item.card.vocab}`}
                  aria-invalid={showError}
                  className="w-full rounded-2xl bg-surface border border-line px-4 py-4 text-xl text-center text-fg placeholder:text-fg-muted placeholder:text-sm focus:outline-none focus:border-accent aria-invalid:border-danger"
                />
                {showError && <p className="text-danger text-sm text-center mt-2">Type your answer first.</p>}
              </div>
              <button
                onClick={reveal}
                className="w-full h-16 rounded-2xl bg-accent text-on-accent text-lg font-medium hover:opacity-90 active:scale-[0.98] transition"
              >
                Submit
              </button>
            </>
          ) : (
            <button
              onClick={advance}
              className="w-full h-16 rounded-2xl bg-accent text-on-accent text-lg font-medium hover:opacity-90 active:scale-[0.98] transition"
            >
              {isLast ? 'See results' : 'Next'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function KanjiTestPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-fg-muted text-lg">Loading...</div>
        </div>
      }
    >
      <KanjiTestContent />
    </Suspense>
  );
}

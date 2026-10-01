import type { ProgressOverview, ProgressWord } from '../services/progressService';
import type { StudySession } from '../types/database';

const DAY_MS = 24 * 60 * 60 * 1000;

// "2026-10-01" in the viewer's local time zone
export function localDateKey(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

// Consecutive days with at least one study session. The current streak stays alive until a full day is skipped.
function dayStreaks(sessions: StudySession[], today: Date): { current: number; longest: number } {
  const days = [...new Set(sessions.filter(s => s.cards_studied > 0).map(s => localDateKey(s.started_at)))]
    .map(dayNumber)
    .sort((a, b) => a - b);

  let longest = 0;
  let run = 0;
  days.forEach((day, i) => {
    run = i > 0 && day === days[i - 1] + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  });

  const todayNumber = dayNumber(localDateKey(today));
  const set = new Set(days);
  let cursor = set.has(todayNumber) ? todayNumber : todayNumber - 1;
  let current = 0;
  while (set.has(cursor)) {
    current += 1;
    cursor -= 1;
  }

  return { current, longest };
}

// Older sessions stored wall-clock time (a tab left open overnight kept counting), so cap each one
// at a minute per card studied. New sessions store active time and are normally well under the cap.
export function sessionSeconds(session: StudySession): number {
  return Math.min(session.duration_seconds || 0, session.cards_studied * 60);
}

export type MasteryLevel = 'struggling' | 'learning' | 'familiar' | 'mastered';

// Based on how many times in a row the word has been answered correctly
export function masteryLevel(word: ProgressWord): MasteryLevel {
  if (word.current_streak >= 7) return 'mastered';
  if (word.current_streak >= 3) return 'familiar';
  if (word.current_streak >= 1) return 'learning';
  return 'struggling';
}

export function accuracyOf(correct: number, total: number): number | null {
  return total > 0 ? Math.round((correct / total) * 100) : null;
}

export function computeProgress(overview: ProgressOverview, now: Date = new Date()) {
  const studied = overview.words.filter(w => w.times_reviewed > 0);

  const totalReviews = studied.reduce((sum, w) => sum + w.times_reviewed, 0);
  const totalCorrect = studied.reduce((sum, w) => sum + w.times_correct, 0);
  const studySeconds = overview.sessions.reduce((sum, s) => sum + sessionSeconds(s), 0);

  // next_review_date is set by the database in UTC, so compare the same way
  const todayUtc = now.toISOString().split('T')[0];
  const dueNow = studied.filter(w => w.next_review_date && w.next_review_date <= todayUtc).length;

  const mastery: Record<MasteryLevel, number> = { struggling: 0, learning: 0, familiar: 0, mastered: 0 };
  studied.forEach(w => {
    mastery[masteryLevel(w)] += 1;
  });

  const perDay = new Map<string, number>();
  overview.recentReviewTimes.forEach(t => {
    const key = localDateKey(t);
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  });
  const activity = Array.from({ length: 14 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (13 - i));
    const key = localDateKey(date);
    return {
      key,
      weekday: date.toLocaleDateString('en-US', { weekday: 'narrow' }),
      label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: perDay.get(key) ?? 0,
    };
  });

  const hardest = studied
    .filter(w => w.times_reviewed >= 2)
    .sort((a, b) => b.difficulty_score - a.difficulty_score || b.times_reviewed - a.times_reviewed)
    .slice(0, 10);

  const byTextbook = new Map<string, { textbook: string; words: number; reviews: number; correct: number }>();
  studied.forEach(w => {
    const entry = byTextbook.get(w.textbook) ?? { textbook: w.textbook, words: 0, reviews: 0, correct: 0 };
    entry.words += 1;
    entry.reviews += w.times_reviewed;
    entry.correct += w.times_correct;
    byTextbook.set(w.textbook, entry);
  });

  return {
    wordsStudied: studied.length,
    totalReviews,
    accuracy: accuracyOf(totalCorrect, totalReviews),
    studySeconds,
    dueNow,
    bestWordStreak: studied.reduce((max, w) => Math.max(max, w.best_streak), 0),
    streak: dayStreaks(overview.sessions, now),
    mastery,
    activity,
    hardest,
    byTextbook: [...byTextbook.values()]
      .map(t => ({ ...t, accuracy: accuracyOf(t.correct, t.reviews) }))
      .sort((a, b) => b.reviews - a.reviews),
    recentSessions: overview.sessions.filter(s => s.cards_studied > 0).slice(0, 10),
  };
}

export function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`;
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export type ProgressStats = ReturnType<typeof computeProgress>;

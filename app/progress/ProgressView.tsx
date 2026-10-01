import Link from 'next/link';
import { formatDuration, sessionSeconds, type MasteryLevel, type ProgressStats } from '../utils/progressStats';
import { getTextbookShortName } from '../utils/textbookColors';
import type { StudySession } from '../types/database';

const MASTERY_LEVELS: { level: MasteryLevel; label: string; hint: string; bar: string }[] = [
  { level: 'mastered', label: 'Mastered', hint: '7+ right in a row', bar: 'bg-success' },
  { level: 'familiar', label: 'Familiar', hint: '3 to 6 in a row', bar: 'bg-info' },
  { level: 'learning', label: 'Learning', hint: '1 or 2 in a row', bar: 'bg-warn' },
  { level: 'struggling', label: 'Struggling', hint: 'Last answer was wrong', bar: 'bg-danger' },
];

const SESSION_LABELS: Record<StudySession['session_type'], string> = {
  study: 'Flashcards',
  review: 'Due review',
  difficult: 'Difficult words',
  kanji_test: 'Kanji test',
};

function sessionTitle(session: StudySession): string {
  const lessons = [...session.lessons].sort((a, b) => parseInt(a) - parseInt(b));
  const shown = lessons.slice(0, 3).map(l => `L${l}`).join(', ');
  const more = lessons.length > 3 ? ` +${lessons.length - 3}` : '';
  return `${getTextbookShortName(session.textbook)} ${shown}${more}`;
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-surface border border-line rounded-2xl p-4">
      <div className="text-fg-muted text-xs mb-1">{label}</div>
      <div className="text-3xl font-light text-fg tabular-nums">{value}</div>
      {hint && <div className="text-fg-muted text-xs mt-1">{hint}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface border border-line rounded-2xl p-5 sm:p-6 mb-4">
      <h2 className="text-lg font-medium text-fg mb-4">{title}</h2>
      {children}
    </section>
  );
}

export default function ProgressView({ stats }: { stats: ProgressStats }) {
  const maxDaily = Math.max(...stats.activity.map(d => d.count), 1);
  const reviewsLastTwoWeeks = stats.activity.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-6">
          <Link href="/" className="text-fg-muted hover:text-fg text-sm transition-colors">← Back to Home</Link>
          <h1 className="text-3xl sm:text-4xl font-medium text-fg mt-2">Your progress</h1>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <Tile label="Words studied" value={stats.wordsStudied.toLocaleString()} />
          <Tile label="Total reviews" value={stats.totalReviews.toLocaleString()} />
          <Tile label="Accuracy" value={stats.accuracy === null ? '-' : `${stats.accuracy}%`} />
          <Tile label="Study time" value={formatDuration(stats.studySeconds)} />
          <Tile
            label="Day streak"
            value={String(stats.streak.current)}
            hint={`Best: ${stats.streak.longest} ${stats.streak.longest === 1 ? 'day' : 'days'}`}
          />
          <Tile label="Best word streak" value={String(stats.bestWordStreak)} hint="right in a row" />
        </div>

        {stats.dueNow > 0 ? (
          <Link
            href="/vocabulary?review=1&fresh=1"
            className="block bg-accent text-on-accent rounded-2xl p-5 mb-4 hover:opacity-90 transition"
          >
            <div className="text-lg font-medium">{stats.dueNow.toLocaleString()} {stats.dueNow === 1 ? 'word is' : 'words are'} due for review</div>
            <div className="text-on-accent/80 text-sm">Review them now →</div>
          </Link>
        ) : (
          <div className="bg-surface border border-line rounded-2xl p-5 mb-4 text-fg-soft">
            Nothing is due for review right now.
          </div>
        )}

        <Section title="Last 14 days">
          <div className="flex items-end gap-1.5 h-32" role="img" aria-label={`${reviewsLastTwoWeeks} reviews in the last 14 days`}>
            {stats.activity.map(day => (
              <div key={day.key} className="flex-1 h-full flex items-end" title={`${day.label}: ${day.count} ${day.count === 1 ? 'review' : 'reviews'}`}>
                <div
                  className={`w-full rounded-t ${day.count > 0 ? 'bg-accent' : 'bg-surface-raised'}`}
                  style={{ height: `${day.count > 0 ? Math.max((day.count / maxDaily) * 100, 6) : 3}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-1.5 mt-2" aria-hidden="true">
            {stats.activity.map(day => (
              <div key={day.key} className="flex-1 text-center text-[11px] text-fg-muted">{day.weekday}</div>
            ))}
          </div>
          <p className="text-fg-muted text-sm mt-3">
            {reviewsLastTwoWeeks.toLocaleString()} {reviewsLastTwoWeeks === 1 ? 'review' : 'reviews'} in the last 14 days
          </p>
        </Section>

        <Section title="How well you know your words">
          <div className="flex h-3 rounded-full overflow-hidden bg-surface-raised mb-4">
            {MASTERY_LEVELS.map(({ level, bar }) => (
              <div
                key={level}
                className={bar}
                style={{ width: `${(stats.mastery[level] / stats.wordsStudied) * 100}%` }}
              />
            ))}
          </div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-3">
            {MASTERY_LEVELS.map(({ level, label, hint, bar }) => (
              <li key={level} className="flex items-start gap-2">
                <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${bar}`} />
                <div>
                  <div className="text-fg">
                    {label} <span className="text-fg-muted tabular-nums">{stats.mastery[level].toLocaleString()}</span>
                  </div>
                  <div className="text-fg-muted text-xs">{hint}</div>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        {stats.hardest.length > 0 && (
          <Section title="Hardest words">
            <ul className="divide-y divide-line">
              {stats.hardest.map(word => (
                <li key={`${word.textbook}-${word.lesson}-${word.vocab}`} className="py-2.5 flex items-baseline gap-3">
                  <span lang="ja" className="text-xl text-fg">{word.vocab}</span>
                  <span className="text-fg-muted text-xs">L{word.lesson}</span>
                  <span className="ml-auto text-sm text-fg-soft tabular-nums">
                    {word.times_correct}/{word.times_reviewed} right
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="By textbook">
          <ul className="space-y-4">
            {stats.byTextbook.map(book => (
              <li key={book.textbook}>
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <span lang="ja" className="text-fg">{book.textbook}</span>
                  <span className="text-fg-muted text-sm tabular-nums shrink-0">
                    {book.accuracy === null ? '-' : `${book.accuracy}%`}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface-raised overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: `${book.accuracy ?? 0}%` }} />
                </div>
                <div className="text-fg-muted text-xs mt-1">
                  {book.words.toLocaleString()} words · {book.reviews.toLocaleString()} reviews
                </div>
              </li>
            ))}
          </ul>
        </Section>

        {stats.recentSessions.length > 0 && (
          <Section title="Recent sessions">
            <ul className="divide-y divide-line">
              {stats.recentSessions.map(session => (
                <li key={session.id} className="py-3 flex items-center gap-3">
                  <div className="min-w-0">
                    <div className="text-fg text-sm">{SESSION_LABELS[session.session_type] ?? 'Study'}</div>
                    <div lang="ja" className="text-fg-muted text-xs truncate">{sessionTitle(session)}</div>
                  </div>
                  <div className="ml-auto text-right shrink-0">
                    <div className="text-fg text-sm tabular-nums">
                      {session.cards_correct}/{session.cards_studied} right
                    </div>
                    <div className="text-fg-muted text-xs">
                      {new Date(session.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {sessionSeconds(session) > 0 && ` · ${formatDuration(sessionSeconds(session))}`}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </div>
  );
}

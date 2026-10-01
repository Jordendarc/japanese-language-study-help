import { createClient } from '@/app/utils/supabase/client';
import type {
  VocabProgress,
  VocabProgressInsert,
  VocabProgressUpdate,
  StudySession,
  StudySessionInsert,
  StudySessionUpdate,
} from '@/app/types/database';

const supabase = createClient();

// ============= VOCAB PROGRESS =============

export async function getVocabProgress(
  userId: string,
  vocab: string,
  textbook: string,
  lesson: string
): Promise<VocabProgress | null> {
  const { data, error } = await supabase
    .from('vocab_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('vocab', vocab)
    .eq('textbook', textbook)
    .eq('lesson', lesson)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = not found
    console.error('Error fetching vocab progress:', error);
    return null;
  }

  return data;
}

export async function createVocabProgress(
  progress: VocabProgressInsert
): Promise<VocabProgress | null> {
  const { data, error } = await supabase
    .from('vocab_progress')
    .insert(progress)
    .select()
    .single();

  if (error) {
    console.error('Error creating vocab progress:', error);
    return null;
  }

  return data;
}

export async function updateVocabProgress(
  id: string,
  updates: VocabProgressUpdate
): Promise<VocabProgress | null> {
  const { data, error } = await supabase
    .from('vocab_progress')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating vocab progress:', error);
    return null;
  }

  return data;
}

export async function recordCardReview({
  userId,
  vocabularyId,
  wasCorrect,
  responseTimeMs,
  sessionId,
}: {
  userId: string;
  vocabularyId: string;  // Now uses vocabulary.id foreign key
  wasCorrect: boolean;
  responseTimeMs: number;
  sessionId: string;
}): Promise<void> {
  // Use RPC function to record card review in one call
  // This replaces 3-4 separate API calls with a single database transaction
  const { error } = await supabase.rpc('record_card_review', {
    p_user_id: userId,
    p_session_id: sessionId,
    p_vocabulary_id: vocabularyId,
    p_was_correct: wasCorrect,
    p_response_time_ms: responseTimeMs,
  });

  if (error) {
    console.error('Error recording card review:', error);
  }
}

// Batch record multiple card reviews at once (more efficient)
export async function recordCardReviewsBatch({
  userId,
  sessionId,
  reviews,
}: {
  userId: string;
  sessionId: string;
  reviews: Array<{
    vocabularyId: string;
    wasCorrect: boolean;
    responseTimeMs: number;
  }>;
}): Promise<{ processed: number; errors: number } | null> {
  if (reviews.length === 0) {
    return { processed: 0, errors: 0 };
  }

  // Transform reviews to JSONB format expected by the database
  const reviewsJson = reviews.map(r => ({
    vocabulary_id: r.vocabularyId,
    was_correct: r.wasCorrect,
    response_time_ms: r.responseTimeMs,
  }));

  const { data, error } = await supabase.rpc('record_card_reviews_batch', {
    p_user_id: userId,
    p_session_id: sessionId,
    p_reviews: reviewsJson,
  });

  if (error) {
    console.error('Error recording batch reviews:', error);
    return null;
  }

  if (data && data.length > 0) {
    const result = data[0];
    return {
      processed: result.cards_processed,
      errors: result.errors_count,
    };
  }

  return null;
}

// ============= STUDY SESSIONS =============

export async function createStudySession(
  session: StudySessionInsert
): Promise<StudySession | null> {
  const { data, error } = await supabase
    .from('study_sessions')
    .insert(session)
    .select()
    .single();

  if (error) {
    console.error('Error creating study session:', error);
    return null;
  }

  return data;
}

export async function updateStudySession(
  id: string,
  updates: StudySessionUpdate
): Promise<StudySession | null> {
  const { data, error } = await supabase
    .from('study_sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating study session:', error);
    return null;
  }

  return data;
}

export async function getUserStudySessions(
  userId: string,
  limit = 10
): Promise<StudySession[]> {
  const { data, error } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching study sessions:', error);
    return [];
  }

  return data || [];
}

// ============= DIFFICULTY FILTERING =============

export async function getDifficultWords(
  userId: string,
  textbook?: string,
  lesson?: string,
  minDifficulty = 50
): Promise<VocabProgress[]> {
  let query = supabase
    .from('vocab_progress')
    .select('*')
    .eq('user_id', userId)
    .gte('difficulty_score', minDifficulty)
    .order('difficulty_score', { ascending: false });

  if (textbook) {
    query = query.eq('textbook', textbook);
  }

  if (lesson) {
    query = query.eq('lesson', lesson);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching difficult words:', error);
    return [];
  }

  return data || [];
}

// Ids of vocabulary whose spaced-repetition review date has arrived, most overdue first.
// `next_review_date` is set by the record_card_review database function.
export async function getDueVocabularyIds(userId: string, limit = 100): Promise<string[]> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('vocab_progress')
    .select('vocabulary_id')
    .eq('user_id', userId)
    .not('vocabulary_id', 'is', null)
    .lte('next_review_date', today)
    .order('next_review_date', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching due cards:', error);
    return [];
  }

  return (data ?? []).map(row => row.vocabulary_id as string);
}

export async function getDueVocabularyCount(userId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0];

  const { count, error } = await supabase
    .from('vocab_progress')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('vocabulary_id', 'is', null)
    .lte('next_review_date', today);

  if (error) {
    console.error('Error counting due cards:', error);
    return 0;
  }

  return count ?? 0;
}

// ============= STATISTICS =============

export async function getUserStats(userId: string) {
  const { data: progressData, error: progressError } = await supabase
    .from('vocab_progress')
    .select('*')
    .eq('user_id', userId);

  if (progressError) {
    console.error('Error fetching user stats:', progressError);
    return null;
  }

  const totalWords = progressData.length;
  const totalReviews = progressData.reduce((sum, p) => sum + p.times_reviewed, 0);
  const totalCorrect = progressData.reduce((sum, p) => sum + p.times_correct, 0);
  const totalIncorrect = progressData.reduce((sum, p) => sum + p.times_incorrect, 0);
  const averageAccuracy = totalReviews > 0 ? (totalCorrect / totalReviews) * 100 : 0;
  const currentStreakWords = progressData.filter((p) => p.current_streak > 0).length;
  const longestStreak = Math.max(...progressData.map((p) => p.best_streak), 0);

  return {
    totalWords,
    totalReviews,
    totalCorrect,
    totalIncorrect,
    averageAccuracy: Math.round(averageAccuracy * 10) / 10,
    currentStreakWords,
    longestStreak,
  };
}

// ============= PROGRESS OVERVIEW =============

export type ProgressWord = Pick<
  VocabProgress,
  | 'vocab'
  | 'textbook'
  | 'lesson'
  | 'times_reviewed'
  | 'times_correct'
  | 'times_incorrect'
  | 'total_time_spent_ms'
  | 'difficulty_score'
  | 'current_streak'
  | 'best_streak'
  | 'last_reviewed_at'
  | 'next_review_date'
>;

export interface ProgressOverview {
  words: ProgressWord[];
  sessions: StudySession[];
  /** reviewed_at timestamps for roughly the last two weeks, for the activity chart */
  recentReviewTimes: string[];
}

const ACTIVITY_DAYS = 14;

// Supabase returns at most 1000 rows per request, so read in pages
async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  maxRows = 10000
): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];

  while (rows.length < maxRows) {
    const { data, error } = await page(rows.length, rows.length + pageSize - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }

  return rows;
}

export async function getProgressOverview(userId: string): Promise<ProgressOverview | null> {
  const since = new Date(Date.now() - ACTIVITY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  try {
    const [words, sessions, reviews] = await Promise.all([
      fetchAll<ProgressWord>((from, to) =>
        supabase
          .from('vocab_progress')
          .select(
            'vocab, textbook, lesson, times_reviewed, times_correct, times_incorrect, total_time_spent_ms, difficulty_score, current_streak, best_streak, last_reviewed_at, next_review_date'
          )
          .eq('user_id', userId)
          .order('id')
          .range(from, to)
      ),
      fetchAll<StudySession>(
        (from, to) =>
          supabase
            .from('study_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('started_at', { ascending: false })
            .range(from, to),
        3000
      ),
      fetchAll<{ reviewed_at: string }>((from, to) =>
        supabase
          .from('card_reviews')
          .select('reviewed_at')
          .eq('user_id', userId)
          .gte('reviewed_at', since)
          .order('reviewed_at')
          .range(from, to)
      ),
    ]);

    return { words, sessions, recentReviewTimes: reviews.map(r => r.reviewed_at) };
  } catch (error) {
    console.error('Error loading progress:', error);
    return null;
  }
}

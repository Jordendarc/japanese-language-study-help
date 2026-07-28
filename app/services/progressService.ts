import { createClient } from '@/app/utils/supabase/client';
import type {
  VocabProgress,
  VocabProgressInsert,
  VocabProgressUpdate,
  StudySession,
  StudySessionInsert,
  StudySessionUpdate,
  CardReview,
  CardReviewInsert,
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
  const { data, error} = await supabase.rpc('record_card_review', {
    p_user_id: userId,
    p_session_id: sessionId,
    p_vocabulary_id: vocabularyId,
    p_was_correct: wasCorrect,
    p_response_time_ms: responseTimeMs,
  });

  if (error) {
    console.error('Error recording card review:', error);
    return;
  }

  // Optional: log the returned stats for debugging
  if (data && data.length > 0) {
    const stats = data[0];
    console.log(`📊 Card reviewed - Times: ${stats.times_reviewed}, Streak: ${stats.current_streak}, Difficulty: ${stats.difficulty_score}`);
  }
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

export async function getWordsForReview(userId: string): Promise<VocabProgress[]> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('vocab_progress')
    .select('*')
    .eq('user_id', userId)
    .lte('next_review_date', today)
    .order('next_review_date', { ascending: true });

  if (error) {
    console.error('Error fetching words for review:', error);
    return [];
  }

  return data || [];
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

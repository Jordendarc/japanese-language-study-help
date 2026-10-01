// Database types for Supabase tables

export interface VocabProgress {
  id: string;
  user_id: string;
  vocabulary_id?: string | null;
  vocab: string;
  reading: string | null;
  textbook: string;
  lesson: string;
  times_reviewed: number;
  times_correct: number;
  times_incorrect: number;
  total_time_spent_ms: number;
  average_response_time_ms: number;
  difficulty_score: number;
  last_reviewed_at: string | null;
  next_review_date: string | null;
  current_streak: number;
  best_streak: number;
  first_seen_at: string;
  updated_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  textbook: string;
  lessons: string[];
  session_type: 'study' | 'review' | 'difficult' | 'kanji_test';
  cards_studied: number;
  cards_correct: number;
  cards_incorrect: number;
  duration_seconds: number;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

export interface CardReview {
  id: string;
  session_id: string;
  user_id: string;
  vocab_progress_id: string | null;
  vocab: string;
  textbook: string;
  lesson: string;
  was_correct: boolean;
  response_time_ms: number;
  reviewed_at: string;
}

// Insert types (for creating new records)
export type VocabProgressInsert = Omit<VocabProgress, 'id' | 'first_seen_at' | 'updated_at'>;
export type StudySessionInsert = Omit<StudySession, 'id' | 'created_at'>;
export type CardReviewInsert = Omit<CardReview, 'id' | 'reviewed_at'>;

// Update types (for updating records)
export type VocabProgressUpdate = Partial<Omit<VocabProgress, 'id' | 'user_id' | 'first_seen_at'>>;
export type StudySessionUpdate = Partial<Omit<StudySession, 'id' | 'user_id' | 'created_at'>>;

import { createClient } from '@/app/utils/supabase/client';
import type { VocabSelection } from './vocabularyService';

const supabase = createClient();

const LOCAL_KEY = 'vocab-flashcard-session-v2';
const LEGACY_LOCAL_KEY = 'vocab-flashcard-session';

// Where the cards came from, so they can be re-fetched on resume
export type SessionSource =
  | { type: 'selection'; selections: VocabSelection[]; kanjiOnly: boolean }
  | { type: 'ids'; ids: string[]; label: string };

// Only card ids are stored (not whole cards) to keep this small enough for
// localStorage and a single DB row.
export interface SavedVocabSession {
  source: SessionSource;
  currentIds: string[];
  reviewIds: string[];
  currentIndex: number;
  round: number;
  totalReviewed: number;
  updatedAt: number;
}

export function sessionLabel(source: SessionSource): string {
  if (source.type === 'ids') return source.label;

  return source.selections
    .map(s => {
      const lessons = s.lessons.map(l => `L${l}`).join('+');
      return `${s.textbook} ${lessons}`;
    })
    .join(', ');
}

export function sameSource(a: SessionSource, b: SessionSource): boolean {
  return a.type === 'selection' && b.type === 'selection'
    && a.kanjiOnly === b.kanjiOnly
    && JSON.stringify(a.selections) === JSON.stringify(b.selections);
}

function loadLocal(): SavedVocabSession | null {
  try {
    // The old format stored whole card objects and ignored what was selected
    localStorage.removeItem(LEGACY_LOCAL_KEY);
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as SavedVocabSession) : null;
  } catch {
    return null;
  }
}

async function loadRemote(userId: string): Promise<SavedVocabSession | null> {
  const { data, error } = await supabase
    .from('study_session_state')
    .select('state')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error loading saved session:', error);
    return null;
  }

  return (data?.state as SavedVocabSession | undefined) ?? null;
}

// Returns whichever of the local / signed-in copies was saved most recently
export async function loadSavedSession(userId?: string): Promise<SavedVocabSession | null> {
  const local = loadLocal();
  const remote = userId ? await loadRemote(userId) : null;

  if (local && remote) return local.updatedAt >= remote.updatedAt ? local : remote;
  return local ?? remote;
}

export function saveSessionLocal(session: SavedVocabSession): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(session));
  } catch (e) {
    console.error('Error saving session locally:', e);
  }
}

export async function saveSessionRemote(userId: string, session: SavedVocabSession): Promise<void> {
  const { error } = await supabase.from('study_session_state').upsert({
    user_id: userId,
    state: session,
    updated_at: new Date(session.updatedAt).toISOString(),
  });

  if (error) {
    console.error('Error saving session to database:', error);
  }
}

export async function clearSavedSession(userId?: string): Promise<void> {
  try {
    localStorage.removeItem(LOCAL_KEY);
  } catch {
    // ignore
  }

  if (!userId) return;

  const { error } = await supabase.from('study_session_state').delete().eq('user_id', userId);
  if (error) {
    console.error('Error clearing saved session:', error);
  }
}

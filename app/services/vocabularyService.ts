import { createClient } from '@/app/utils/supabase/client';
import type { KanjiData, VocabCard } from '@/app/types';

const supabase = createClient();

// Row shape returned by the get_vocab_with_kanji_* RPC functions
interface VocabRow {
  id: string;
  vocab: string;
  reading: string | null;
  english: string;
  jp_meaning: string | null;
  my_meaning: string | null;
  example_jp: string | null;
  example_en: string | null;
  example: string | null;
  lesson: string;
  section: string | null;
  page: string | null;
  textbook: string;
  kanji_data: KanjiData[] | null;
}

export interface VocabSelection {
  textbook: string;
  lessons: string[];
}

function rowToCard(row: VocabRow): VocabCard {
  return {
    id: row.id,
    vocab: row.vocab,
    reading: row.reading || '',
    english: row.english,
    jp_meaning: row.jp_meaning || '',
    my_meaning: row.my_meaning || '',
    example_jp: row.example_jp || '',
    example_en: row.example_en || '',
    example: row.example || '',
    lesson: row.lesson,
    section: row.section || '',
    page: row.page || '',
    textbook: row.textbook,
    kanji_data: row.kanji_data || [],
  };
}

export async function fetchCardsBySelections(
  selections: VocabSelection[],
  kanjiOnly: boolean
): Promise<VocabCard[]> {
  const cards: VocabCard[] = [];

  for (const selection of selections) {
    const { data, error } = await supabase.rpc('get_vocab_with_kanji_by_selection', {
      p_textbook: selection.textbook,
      p_lessons: selection.lessons,
    });

    if (error) {
      console.error('Error fetching vocabulary:', error);
      continue;
    }

    cards.push(...(data as VocabRow[]).map(rowToCard));
  }

  return kanjiOnly ? cards.filter(card => card.kanji_data && card.kanji_data.length > 0) : cards;
}

// Returns cards in the same order as `ids` (ids that no longer exist are dropped)
export async function fetchCardsByIds(ids: string[]): Promise<VocabCard[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabase.rpc('get_vocab_with_kanji_by_ids', { p_ids: ids });

  if (error) {
    console.error('Error fetching vocabulary by id:', error);
    return [];
  }

  const byId = new Map((data as VocabRow[]).map(row => [row.id, rowToCard(row)]));
  return ids.flatMap(id => byId.get(id) ?? []);
}

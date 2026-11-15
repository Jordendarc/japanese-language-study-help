import { createClient } from '@/app/utils/supabase/client';
import { toHiragana } from '../utils/kanjiReadings';
import type { VocabCard } from '../types';
import { buildQuestionData, type KanjiFacts, type Kind, type Question, type QuestionData } from '../utils/jlptQuestions';
import { lookalikes } from './wordDetailsService';

const supabase = createClient();

type KanjiRow = { character: string; on_readings: string[] | null; kun_readings: string[] | null; meanings: string[] | null; frequency: number | null };

// Every kanji with its readings (about 1,500 rows), loaded once: the wrong answers come from all of them
let allKanji: Promise<KanjiFacts[]> | null = null;
function loadAllKanji(): Promise<KanjiFacts[]> {
  allKanji ??= (async () => {
    const rows: KanjiRow[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from('kanji')
        .select('character, on_readings, kun_readings, meanings, frequency')
        .range(from, from + 999);
      if (error) throw error;
      rows.push(...((data ?? []) as KanjiRow[]));
      if (!data || data.length < 1000) break;
    }
    return rows.map(r => ({
      character: r.character,
      on: [...new Set((r.on_readings ?? []).map(toHiragana))],
      kun: [...new Set((r.kun_readings ?? []).map(k => k.replace(/-/g, '').split('.')[0]).filter(Boolean))],
      kunFull: [...new Set((r.kun_readings ?? []).map(k => k.replace(/[-.]/g, '')).filter(Boolean))],
      meanings: r.meanings ?? [],
      frequency: r.frequency,
    }));
  })().catch(error => {
    allKanji = null;
    throw error;
  });
  return allKanji;
}

type BankRow = {
  vocabulary_id: string;
  kind: Kind;
  sentence_before: string;
  target: string | null;
  sentence_after: string;
  choices: string[];
  answer: number;
  notes: string[] | null;
  explanation_en: string | null;
};

/**
 * The written questions (語形成 / 文脈規定 / 言い換え類義 / 用法) for these cards, skipping any flagged for review.
 * Returns none if the jlpt_questions table hasn't been created yet, so the test still works with 読み / 表記.
 */
export async function loadBankQuestions(cards: VocabCard[]): Promise<Question[]> {
  const byId = new Map(cards.filter(c => c.id).map(c => [c.id!, c]));
  const ids = [...byId.keys()];
  const rows: BankRow[] = [];
  for (let i = 0; i < ids.length; i += 150) {
    const { data, error } = await supabase
      .from('jlpt_questions')
      .select('vocabulary_id, kind, sentence_before, target, sentence_after, choices, answer, notes, explanation_en')
      .in('vocabulary_id', ids.slice(i, i + 150))
      .eq('needs_review', false);
    if (error) {
      console.warn('JLPT question bank unavailable:', error.message);
      return [];
    }
    rows.push(...((data ?? []) as BankRow[]));
  }
  return rows.map(row => {
    const card = byId.get(row.vocabulary_id)!;
    return {
      kind: row.kind,
      card,
      target: row.target ?? undefined,
      explanation: row.explanation_en ?? undefined,
      before: row.sentence_before,
      after: row.sentence_after,
      written: card.vocab,
      reading: card.reading,
      ending: '',
      choices: row.choices.map((text, i) => ({ text, correct: i === row.answer, note: row.notes?.[i] || undefined })),
    };
  });
}

/**
 * What the question builder needs for the kanji in these words.
 * otherWords are the test's own words (written + reading), used as wrong answers for each other.
 */
export async function loadQuestionData(characters: string[], otherWords: QuestionData['otherWords']): Promise<QuestionData> {
  const [all, similar] = await Promise.all([loadAllKanji(), lookalikes(characters)]);
  return buildQuestionData(all, new Map([...similar].map(([c, list]) => [c, list.map(l => l.character)])), otherWords);
}

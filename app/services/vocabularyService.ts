import { createClient } from '@/app/utils/supabase/client';
import type { VocabCard } from '@/app/types';

const supabase = createClient();

export async function getAllVocabulary(): Promise<VocabCard[]> {
  const { data, error } = await supabase
    .from('vocabulary')
    .select('*')
    .order('textbook', { ascending: true })
    .order('lesson', { ascending: true });

  if (error) {
    console.error('Error fetching vocabulary:', error);
    return [];
  }

  // Transform database format to app format
  return data.map(row => ({
    vocab: row.vocab,
    reading: row.reading || '',
    english: row.english,
    my_meaning: row.my_meaning || '',
    example_jp: row.example_jp || '',
    example_en: row.example_en || '',
    example: row.example || '',
    lesson: row.lesson,
    section: row.section || '',
    page: row.page || '',
    textbook: row.textbook,
  }));
}

export async function getVocabularyByTextbookAndLessons(
  selections: { textbook: string; lessons: string[] }[]
): Promise<VocabCard[]> {
  const allCards: VocabCard[] = [];

  for (const selection of selections) {
    const { data, error } = await supabase
      .from('vocabulary')
      .select('*')
      .eq('textbook', selection.textbook)
      .in('lesson', selection.lessons);

    if (error) {
      console.error('Error fetching vocabulary:', error);
      continue;
    }

    const cards = data.map(row => ({
      vocab: row.vocab,
      reading: row.reading || '',
      english: row.english,
      my_meaning: row.my_meaning || '',
      example_jp: row.example_jp || '',
      example_en: row.example_en || '',
      example: row.example || '',
      lesson: row.lesson,
      section: row.section || '',
      page: row.page || '',
      textbook: row.textbook,
    }));

    allCards.push(...cards);
  }

  return allCards;
}

export async function getTextbooks(): Promise<string[]> {
  const { data, error } = await supabase
    .from('vocabulary')
    .select('textbook')
    .order('textbook', { ascending: true });

  if (error) {
    console.error('Error fetching textbooks:', error);
    return [];
  }

  // Get unique textbooks
  const textbooks = [...new Set(data.map(row => row.textbook))];
  return textbooks;
}

export async function getLessonsByTextbook(textbook: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('vocabulary')
    .select('lesson')
    .eq('textbook', textbook)
    .order('lesson', { ascending: true });

  if (error) {
    console.error('Error fetching lessons:', error);
    return [];
  }

  // Get unique lessons
  const lessons = [...new Set(data.map(row => row.lesson))];
  return lessons;
}

export async function searchVocabulary(searchTerm: string): Promise<VocabCard[]> {
  const { data, error } = await supabase
    .from('vocabulary')
    .select('*')
    .or(`vocab.ilike.%${searchTerm}%,reading.ilike.%${searchTerm}%,english.ilike.%${searchTerm}%,my_meaning.ilike.%${searchTerm}%`)
    .limit(50);

  if (error) {
    console.error('Error searching vocabulary:', error);
    return [];
  }

  return data.map(row => ({
    vocab: row.vocab,
    reading: row.reading || '',
    english: row.english,
    my_meaning: row.my_meaning || '',
    example_jp: row.example_jp || '',
    example_en: row.example_en || '',
    example: row.example || '',
    lesson: row.lesson,
    section: row.section || '',
    page: row.page || '',
    textbook: row.textbook,
  }));
}

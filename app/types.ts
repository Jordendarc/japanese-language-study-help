export interface VocabCard {
  vocab: string;
  reading: string;
  english: string;
  my_meaning: string;
  example_jp: string;
  example_en: string;
  example: string;
  lesson: string;
  page: string;
}

export interface GrammarCard {
  id: string;
  lesson: string;
  lesson_title: string;
  context: string;
  point: string;
  meaning: string;
  formation: string;
  jlpt: string;
  example_jp: string;
  example_en: string;
  nuance: string;
}

export type StudyMode = 'vocabulary' | 'grammar';

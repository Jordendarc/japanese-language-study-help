export interface VocabCard {
  vocab: string;
  reading: string;
  english: string;
  my_meaning: string;
  example_jp: string;
  example_en: string;
  example: string;
  lesson: string;
  section: string;
  page: string;
  textbook: string;
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

// GLM JSON format
export interface MatomeProblem {
  id: number;
  type: 'word_bank' | 'multiple_choice' | 'reading' | 'word_order';
  wordBank?: string[];
  choices?: string[];
  sentences?: Array<{
    text: string;
    answer: string;
    choices?: string[];
    correctOrder?: string[];
  }>;
  passage?: string;
  statements?: Array<{
    text: string;
    isTrue: boolean;
  }>;
}

export interface MatomeTest {
  lesson: number;
  problems: MatomeProblem[];
}

export interface UserAnswer {
  questionIndex: number;
  selectedAnswer: string;
  isCorrect: boolean;
}

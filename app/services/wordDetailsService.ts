import { createClient } from '@/app/utils/supabase/client';

const supabase = createClient();

export interface RelatedWord {
  id: string;
  vocab: string;
  reading: string;
  english: string;
  my_meaning: string;
  lesson: string;
  textbook: string;
}

// Words sharing a kanji don't change during a study session, so each kanji is fetched once
const cache = new Map<string, Promise<RelatedWord[]>>();

/** Every vocabulary word containing this kanji (uses the same database function as the kanji dictionary). */
export function wordsWithKanji(character: string): Promise<RelatedWord[]> {
  let request = cache.get(character);
  if (!request) {
    request = Promise.resolve(supabase.rpc('get_kanji_with_vocabulary', { p_kanji_character: character })).then(({ data, error }) => {
      if (error) {
        console.error('Error loading words for kanji:', error);
        cache.delete(character);
        return [];
      }
      const row = Array.isArray(data) ? data[0] : data;
      return ((row?.vocabulary ?? []) as RelatedWord[]).filter(word => word && word.vocab);
    });
    cache.set(character, request);
  }
  return request;
}

// Some lesson values carry stray characters from old CSV imports (e.g. `9",,`)
export function cleanLesson(lesson: string): string {
  return (lesson ?? '').replace(/["',]+/g, '').trim();
}

export function lessonNumber(lesson: string): number {
  const n = parseInt(cleanLesson(lesson), 10);
  return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
}

// ---------------------------------------------------------------------------------------------
// Vocabulary V2 data (words / kanji_components / kanji_similar / word_relations tables)

const KANJI_COLUMNS = 'id, character, meanings, on_readings, stroke_count, grade, radical, etymology_en, mnemonic_en';

export interface KanjiFacts {
  id: string;
  character: string;
  meanings: string[];
  on_readings: string[];
  stroke_count: number | null;
  grade: number | null;
  radical: string | null;
  /** why the parts add up to the meaning (filled in by the AI pass) */
  etymology_en: string | null;
  mnemonic_en: string | null;
}

export interface PartNode {
  part: string;
  /** how the children are arranged (⿰ ⿱ ...), null for a leaf */
  layout: string | null;
  /** meaning of the part: from kanji_parts for parts that aren't kanji, else the kanji table */
  meaning: string | null;
  /** a kanji in its own right: its own card shows its breakdown, so the tree stops here */
  isKanji: boolean;
  /** what the part does in this kanji: meaning, sound, radical (filled in by the AI pass) */
  role: string | null;
  children: PartNode[];
}

export interface KanjiBreakdown {
  facts: KanjiFacts;
  radicalMeaning: string | null;
  /** the kanji itself at the root; null for kanji that can't be split */
  tree: PartNode | null;
}

// Each loader runs once per key for the session; a failure is logged and retried next time
function once<T>(store: Map<string, Promise<T>>, key: string, load: () => Promise<T>, fallback: T): Promise<T> {
  let request = store.get(key);
  if (!request) {
    request = load().catch(error => {
      console.error('Word details:', error);
      store.delete(key);
      return fallback;
    });
    store.set(key, request);
  }
  return request;
}

const keyOf = (list: string[]) => [...list].sort().join('');

const kanjiCache = new Map<string, Promise<KanjiFacts[]>>();
function kanjiFacts(characters: string[]): Promise<KanjiFacts[]> {
  return once(kanjiCache, keyOf(characters), async () => {
    if (!characters.length) return [];
    const { data, error } = await supabase.from('kanji').select(KANJI_COLUMNS).in('character', characters);
    if (error) throw error;
    return (data ?? []) as KanjiFacts[];
  }, []);
}

type PartInfo = { meanings: Map<string, string>; kanji: Set<string> };
const partNameCache = new Map<string, Promise<PartInfo>>();
// Meanings for parts: the kanji table for parts that are kanji, kanji_parts for the rest (氵, 灬, ...)
function partMeanings(parts: string[]): Promise<PartInfo> {
  return once(partNameCache, keyOf(parts), async () => {
    const [named, asKanji] = await Promise.all([
      supabase.from('kanji_parts').select('part, name_en, meaning_en').in('part', parts),
      kanjiFacts(parts),
    ]);
    if (named.error) throw named.error;
    const out = new Map<string, string>();
    for (const k of asKanji) if (k.meanings?.length) out.set(k.character, k.meanings.slice(0, 2).join(', '));
    for (const p of (named.data ?? []) as { part: string; name_en: string | null; meaning_en: string | null }[]) {
      const text = p.meaning_en || p.name_en;
      if (text) out.set(p.part, text);
    }
    return { meanings: out, kanji: new Set(asKanji.map(k => k.character)) };
  }, { meanings: new Map(), kanji: new Set() });
}

type ComponentRow = { id: string; kanji_id: string; parent_id: string | null; part: string; layout: string | null; sort: number; role: string | null };

const breakdownCache = new Map<string, Promise<Map<string, KanjiBreakdown>>>();
/** Strokes, grade, radical and the part tree for each kanji in a word. */
export function kanjiBreakdowns(characters: string[]): Promise<Map<string, KanjiBreakdown>> {
  return once(breakdownCache, keyOf(characters), async () => {
    const facts = await kanjiFacts(characters);
    if (!facts.length) return new Map();
    const { data, error } = await supabase
      .from('kanji_components')
      .select('id, kanji_id, parent_id, part, layout, sort, role')
      .in('kanji_id', facts.map(f => f.id));
    if (error) throw error;
    const rows = (data ?? []) as ComponentRow[];

    const parts = [...new Set([...rows.map(r => r.part), ...facts.map(f => f.radical).filter((r): r is string => !!r)])];
    const { meanings, kanji } = parts.length ? await partMeanings(parts) : { meanings: new Map<string, string>(), kanji: new Set<string>() };

    const children = new Map<string, ComponentRow[]>();
    for (const r of rows) if (r.parent_id) children.set(r.parent_id, [...(children.get(r.parent_id) ?? []), r]);
    const toNode = (r: ComponentRow): PartNode => ({
      part: r.part,
      layout: r.layout,
      meaning: meanings.get(r.part) ?? null,
      isKanji: kanji.has(r.part),
      role: r.role,
      children: (children.get(r.id) ?? []).sort((a, b) => a.sort - b.sort).map(toNode),
    });

    return new Map(facts.map(f => {
      const root = rows.find(r => r.kanji_id === f.id && !r.parent_id);
      return [f.character, { facts: f, radicalMeaning: f.radical ? meanings.get(f.radical) ?? null : null, tree: root ? toNode(root) : null }];
    }));
  }, new Map());
}

export interface Lookalike {
  character: string;
  meanings: string[];
  on_readings: string[];
  score: number;
  sharedParts: string[];
  sameReading: string | null;
  looksAlike: boolean;
}

const lookalikeCache = new Map<string, Promise<Map<string, Lookalike[]>>>();
/** Kanji that look like each kanji in the word, closest first. */
export function lookalikes(characters: string[]): Promise<Map<string, Lookalike[]>> {
  return once(lookalikeCache, keyOf(characters), async () => {
    const facts = await kanjiFacts(characters);
    if (!facts.length) return new Map();
    const { data, error } = await supabase
      .from('kanji_similar')
      .select('kanji_id, similar_kanji_id, score, reasons')
      .in('kanji_id', facts.map(f => f.id))
      .order('score', { ascending: false });
    if (error) throw error;
    const pairs = (data ?? []) as { kanji_id: string; similar_kanji_id: string; score: number; reasons: Record<string, unknown> }[];
    const ids = [...new Set(pairs.map(p => p.similar_kanji_id))];
    let others: KanjiFacts[] = [];
    if (ids.length) {
      const result = await supabase.from('kanji').select(KANJI_COLUMNS).in('id', ids);
      if (result.error) throw result.error;
      others = (result.data ?? []) as KanjiFacts[];
    }
    const byId = new Map(others.map(k => [k.id, k]));

    return new Map(facts.map(f => [
      f.character,
      pairs
        .filter(p => p.kanji_id === f.id && byId.has(p.similar_kanji_id))
        .map(p => {
          const other = byId.get(p.similar_kanji_id)!;
          return {
            character: other.character,
            meanings: other.meanings ?? [],
            on_readings: other.on_readings ?? [],
            score: p.score,
            sharedParts: (p.reasons.shared_parts as string[] | undefined) ?? [],
            sameReading: (p.reasons.same_reading as string | undefined) ?? null,
            looksAlike: !!p.reasons.looks_alike,
          };
        }),
    ]));
  }, new Map());
}

export interface WordInfo {
  id: string;
  written: string;
  reading: string;
  part_of_speech: string | null;
  verb_class: string | null;
  godan_ending: string | null;
  transitivity: string | null;
  is_common: boolean | null;
  meaning_en: string | null;
}

export interface WordLink {
  label: string;
  word: WordInfo;
  /** where the linked word is first taught, if it's in the textbooks */
  textbook: string | null;
  lesson: string | null;
}

export interface WordLinks {
  word: WordInfo | null;
  tags: string[];
  links: WordLink[];
}

const WORD_COLUMNS = 'id, written, reading, part_of_speech, verb_class, godan_ending, transitivity, is_common, meaning_en';
// One-way links seen from the other end (e.g. 続ける is "derived from" nothing, but 続けて is derived from it)
const REVERSE_LABEL: Record<string, string> = {
  'derived-from': 'Made from this word',
  'compound-of': 'Compound using this word',
  'honorific-of': 'Honorific form',
  'humble-of': 'Humble form',
  'counter-for': 'Counter used for it',
  'phrase-containing': 'Phrase using this word',
};

type Labels = { label: Map<string, string>; symmetric: Set<string> };
const labelCache = new Map<string, Promise<Labels>>();
function labels(table: 'relation_types' | 'tag_types'): Promise<Labels> {
  return once(labelCache, table, async () => {
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw error;
    const rows = (data ?? []) as { code: string; label_en: string; is_symmetric?: boolean }[];
    return { label: new Map(rows.map(r => [r.code, r.label_en])), symmetric: new Set(rows.filter(r => r.is_symmetric).map(r => r.code)) };
  }, { label: new Map(), symmetric: new Set() });
}

const linksCache = new Map<string, Promise<WordLinks>>();
/** The dictionary word behind a flashcard, its tags and the words linked to it. */
export function wordLinks(cardId: string): Promise<WordLinks> {
  return once(linksCache, cardId, async () => {
    const item = await supabase.from('lesson_items').select('word_id').eq('id', cardId).maybeSingle();
    if (item.error) throw item.error;
    const wordId = (item.data as { word_id: string } | null)?.word_id;
    if (!wordId) return { word: null, tags: [], links: [] };

    const [word, tags, out, into, relationTypes, tagTypes] = await Promise.all([
      supabase.from('words').select(WORD_COLUMNS).eq('id', wordId).maybeSingle(),
      supabase.from('word_tags').select('tag').eq('word_id', wordId),
      supabase.from('word_relations').select('to_word_id, relation_type').eq('from_word_id', wordId),
      supabase.from('word_relations').select('from_word_id, relation_type').eq('to_word_id', wordId),
      labels('relation_types'),
      labels('tag_types'),
    ]);
    for (const r of [word, tags, out, into]) if (r.error) throw r.error;

    const nameOf = (code: string) => relationTypes.label.get(code) ?? code;
    const linked = [
      ...((out.data ?? []) as { to_word_id: string; relation_type: string }[]).map(r => ({ id: r.to_word_id, label: nameOf(r.relation_type) })),
      ...((into.data ?? []) as { from_word_id: string; relation_type: string }[]).map(r => ({
        id: r.from_word_id,
        label: relationTypes.symmetric.has(r.relation_type) ? nameOf(r.relation_type) : REVERSE_LABEL[r.relation_type] ?? nameOf(r.relation_type),
      })),
    ];

    const ids = [...new Set(linked.map(l => l.id))];
    let others: WordInfo[] = [];
    let lessons: { word_id: string; textbook: string; lesson: string }[] = [];
    if (ids.length) {
      const [w, l] = await Promise.all([
        supabase.from('words').select(WORD_COLUMNS).in('id', ids),
        supabase.from('lesson_items').select('word_id, textbook, lesson').in('word_id', ids),
      ]);
      if (w.error) throw w.error;
      if (l.error) throw l.error;
      others = (w.data ?? []) as WordInfo[];
      lessons = (l.data ?? []) as typeof lessons;
    }
    const words = new Map(others.map(w => [w.id, w]));
    const firstLesson = new Map<string, { textbook: string; lesson: string }>();
    for (const l of lessons) {
      const current = firstLesson.get(l.word_id);
      if (!current || lessonNumber(l.lesson) < lessonNumber(current.lesson)) firstLesson.set(l.word_id, l);
    }

    return {
      word: (word.data as WordInfo | null) ?? null,
      tags: ((tags.data ?? []) as { tag: string }[]).map(t => tagTypes.label.get(t.tag) ?? t.tag),
      // a word linked twice (derived from it and "see also") is listed once, under the first, more specific link
      links: linked
        .filter((l, i) => words.has(l.id) && linked.findIndex(other => other.id === l.id) === i)
        .map(l => ({
          label: l.label,
          word: words.get(l.id)!,
          textbook: firstLesson.get(l.id)?.textbook ?? null,
          lesson: firstLesson.get(l.id)?.lesson ?? null,
        })),
    };
  }, { word: null, tags: [], links: [] });
}

export interface WordKanjiNotes {
  /** how the kanji combine into the word's meaning */
  explanation: string | null;
  /** what each kanji contributes to this word, by character */
  inWord: Map<string, string>;
}

const notesCache = new Map<string, Promise<WordKanjiNotes>>();
/** The word-level explanations for a flashcard (filled in by the AI pass; empty until then). */
export function wordKanjiNotes(cardId: string): Promise<WordKanjiNotes> {
  const empty: WordKanjiNotes = { explanation: null, inWord: new Map() };
  return once(notesCache, cardId, async () => {
    const item = await supabase.from('lesson_items').select('word_id').eq('id', cardId).maybeSingle();
    if (item.error) throw item.error;
    const wordId = (item.data as { word_id: string } | null)?.word_id;
    if (!wordId) return empty;
    // select('*') so this keeps working before vocab-v2-explanations.sql has added kanji_explanation_en
    const [word, links] = await Promise.all([
      supabase.from('words').select('*').eq('id', wordId).maybeSingle(),
      supabase.from('word_kanji').select('kanji_id, meaning_in_word_en').eq('word_id', wordId),
    ]);
    if (word.error) throw word.error;
    if (links.error) throw links.error;
    const rows = ((links.data ?? []) as { kanji_id: string; meaning_in_word_en: string | null }[]).filter(r => r.meaning_in_word_en);
    const inWord = new Map<string, string>();
    if (rows.length) {
      const { data, error } = await supabase.from('kanji').select('id, character').in('id', rows.map(r => r.kanji_id));
      if (error) throw error;
      const characters = new Map(((data ?? []) as { id: string; character: string }[]).map(k => [k.id, k.character]));
      for (const r of rows) if (characters.has(r.kanji_id)) inWord.set(characters.get(r.kanji_id)!, r.meaning_in_word_en!);
    }
    return { explanation: ((word.data as { kanji_explanation_en?: string | null } | null)?.kanji_explanation_en) ?? null, inWord };
  }, empty);
}

// JLPT-style kanji questions built from flashcards.
//
//   問題1 漢字読み  the kanji word is underlined in a sentence; pick its reading
//   問題2 表記      the word is underlined in hiragana; pick how it's written in kanji
//
// Wrong answers are made the way the JLPT makes them:
//   readings  long / short vowel (こう・こ), ゅ / ょ, with or without ゛, っ / つ・く, another reading of the
//             same kanji, or the reading of a look-alike kanji (往 オウ → 住 ジュウ)
//   writing   a look-alike kanji (往 → 住) or a different kanji with the same reading (指導 → 支導)

import type { VocabCard } from '../types';
import { readingsInWord, toHiragana } from './kanjiReadings';

export interface KanjiFacts {
  character: string;
  /** hiragana */
  on: string[];
  /** hiragana stems: 食.べる → た */
  kun: string[];
  /** whole kun words: 食.べる → たべる */
  kunFull: string[];
  meanings: string[];
  frequency: number | null;
}

export interface Choice {
  text: string;
  correct: boolean;
  /** why a wrong choice is a trap */
  note?: string;
}

/**
 * The six 文字・語彙 question types, in test order. reading and writing are built here from the kanji data;
 * the other four come from the jlpt_questions bank (written by scripts/v2/jlpt-questions.ts).
 */
export const KINDS = ['reading', 'writing', 'word_formation', 'context', 'paraphrase', 'usage'] as const;
export type Kind = (typeof KINDS)[number];

/** Short names for each type, as the test and the drill book call them */
export const KIND_LABELS: Record<Kind, { jp: string; en: string }> = {
  reading: { jp: '漢字読み', en: 'Reading' },
  writing: { jp: '表記', en: 'Writing' },
  word_formation: { jp: '語形成', en: 'Word parts' },
  context: { jp: '文脈規定', en: 'Context' },
  paraphrase: { jp: '言い換え類義', en: 'Paraphrase' },
  usage: { jp: '用法', en: 'Usage' },
};

export interface Question {
  kind: Kind;
  card: VocabCard;
  /** bank questions: the underlined word (paraphrase) or the word whose usage is tested (usage) */
  target?: string;
  /** bank questions: why the answer is right */
  explanation?: string;
  /** the sentence around the underlined part; both empty when the word has no usable example */
  before: string;
  after: string;
  /** the underlined part as written in the sentence (kanji) and its reading */
  written: string;
  reading: string;
  /** the kana after the kanji in the dictionary form (蒸す → す), when the sentence conjugates it (蒸して) */
  ending: string;
  choices: Choice[];
}

export interface QuestionData {
  kanji: Map<string, KanjiFacts>;
  /** look-alike kanji for each kanji, closest first */
  lookalikes: Map<string, string[]>;
  /** kanji by hiragana on reading, most common first */
  byOnReading: Map<string, string[]>;
  /** kanji by whole kun word (さける → 避, 裂) */
  byKunWord: Map<string, string[]>;
  /** other words in the test, whose readings make wrong answers for native-reading words (するどい → にぶい) */
  otherWords: { written: string; reading: string }[];
}

const KANJI = /[一-龯㐀-䶿々]/;
const HIRAGANA = /^[ぁ-ゖー]+$/;

/** Lookup tables for buildQuestion, from every kanji's readings and the look-alike pairs. */
export function buildQuestionData(all: KanjiFacts[], lookalikeMap: Map<string, string[]>, otherWords: QuestionData['otherWords']): QuestionData {
  // kanji by reading, most common first (newspaper frequency rank; unranked last)
  const byOnReading = new Map<string, string[]>();
  const byKunWord = new Map<string, string[]>();
  for (const k of [...all].sort((a, b) => (a.frequency ?? 9999) - (b.frequency ?? 9999))) {
    for (const on of k.on) byOnReading.set(on, [...(byOnReading.get(on) ?? []), k.character]);
    for (const kun of k.kunFull) byKunWord.set(kun, [...(byKunWord.get(kun) ?? []), k.character]);
  }
  return { kanji: new Map(all.map(k => [k.character, k])), byOnReading, byKunWord, lookalikes: lookalikeMap, otherWords };
}

// ---------------------------------------------------------------------------------------------- the target

/** Example sentence without the inline readings: 体躯（たいく）を → 体躯を */
export function plainSentence(text: string): string {
  return (text ?? '').replace(/[（(][ぁ-ゖァ-ヶー・]+[）)]/g, '');
}

/** The part of the card that the question is about, found in its example sentence if possible. */
export function findTarget(card: VocabCard): Pick<Question, 'before' | 'after' | 'written' | 'reading' | 'ending'> | null {
  // the Japanese run that holds the kanji: "Vて以来" → "て以来", "～得る（うる・える）" → "得る"
  const vocab = card.vocab.normalize('NFKC').replace(/[（(][^）)]*[）)]/g, '').replace(/[～〜~]/g, '');
  let core = (vocab.match(/[ぁ-ゖァ-ヶー一-龯㐀-䶿々]+/g) ?? []).find(run => KANJI.test(run)) ?? '';
  let reading = toHiragana((card.reading ?? '').split(/[・/／、,]/)[0]).replace(/[^ぁ-ゖー]/g, '');
  if (!core || !reading) return null;

  // drop leading kana the reading shares (て以来 / ていらい → 以来 / いらい)
  while (core && !KANJI.test(core[0])) {
    if (reading[0] !== core[0]) return null;
    core = core.slice(1);
    reading = reading.slice(1);
  }
  const lastKanji = Math.max(...[...core].map((c, i) => (KANJI.test(c) ? i : -1)));
  const tail = core.slice(lastKanji + 1);
  if (!reading.endsWith(tail) || reading.length <= tail.length) return null;

  const sentence = plainSentence(card.example_jp);
  // longest start of the word that appears in the sentence (避ける → 避け in 避けて), then take as many
  // following kana as were cut off, so the underline covers the inflected word (避けて, 蒸し)
  for (let end = core.length; end > lastKanji; end--) {
    const stem = core.slice(0, end);
    const at = sentence.indexOf(stem);
    if (at < 0) continue;
    const cut = core.length - end;
    let extra = sentence.slice(at + stem.length, at + stem.length + cut);
    if (!HIRAGANA.test(extra || 'あ')) continue;
    // te- and ta-forms read better underlined whole: 騒いで, 蒸して, 囲った (not 囲っ)
    if (cut > 0 && 'てでただ'.includes(sentence[at + stem.length + extra.length] ?? '')) extra += sentence[at + stem.length + extra.length];
    const stemReading = reading.slice(0, reading.length - cut);
    return {
      ending: tail,
      before: sentence.slice(0, at),
      written: stem + extra,
      reading: stemReading + extra,
      after: sentence.slice(at + stem.length + extra.length),
    };
  }
  return { before: '', after: '', written: core, reading, ending: tail };
}

// ---------------------------------------------------------------------------------------------- readings

const O_ROW = 'おこごそぞとどのほぼぽもよろょ';
const U_ROW = 'うくぐすずつづぬふぶぷむゆるゅ';
const E_ROW = 'えけげせぜてでねへべぺめれ';
const VOICE: Record<string, string> = {
  か: 'が', き: 'ぎ', く: 'ぐ', け: 'げ', こ: 'ご', さ: 'ざ', し: 'じ', す: 'ず', せ: 'ぜ', そ: 'ぞ',
  た: 'だ', ち: 'ぢ', つ: 'づ', て: 'で', と: 'ど', は: 'ば', ひ: 'び', ふ: 'ぶ', へ: 'べ', ほ: 'ぼ',
};
const UNVOICE: Record<string, string> = Object.fromEntries([
  ...Object.entries(VOICE).map(([a, b]) => [b, a]),
  ['ぱ', 'は'], ['ぴ', 'ひ'], ['ぷ', 'ふ'], ['ぺ', 'へ'], ['ぽ', 'ほ'],
]);

/** Readings a learner could mistake this one for, each with the reason. */
function soundSlips(r: string): { text: string; note: string }[] {
  const out: { text: string; note: string }[] = [];
  const last = r[r.length - 1];
  const prev = r[r.length - 2];
  // long vowels: こう ⇄ こ, しゅう ⇄ しゅ, せい ⇄ せ
  if (r.length > 1 && last === 'う' && (O_ROW.includes(prev) || U_ROW.includes(prev))) out.push({ text: r.slice(0, -1), note: 'short vowel instead of long' });
  else if (r.length > 1 && last === 'い' && E_ROW.includes(prev)) out.push({ text: r.slice(0, -1), note: 'short vowel instead of long' });
  else if (O_ROW.includes(last) || 'ゅ'.includes(last)) out.push({ text: r + 'う', note: 'long vowel instead of short' });
  // ゅ ⇄ ょ (しゅう / しょう)
  if (r.includes('ゅ')) out.push({ text: r.replace('ゅ', 'ょ'), note: 'ょ instead of ゅ' });
  else if (r.includes('ょ')) out.push({ text: r.replace('ょ', 'ゅ'), note: 'ゅ instead of ょ' });
  // ゛ on the first sound
  if (VOICE[r[0]]) out.push({ text: VOICE[r[0]] + r.slice(1), note: 'voiced (゛) where it isn’t' });
  else if (UNVOICE[r[0]]) out.push({ text: UNVOICE[r[0]] + r.slice(1), note: 'missing the ゛' });
  // small っ ⇄ つ / く
  if (last === 'っ') out.push({ text: r.slice(0, -1) + 'く', note: 'く instead of small っ' }, { text: r.slice(0, -1) + 'つ', note: 'つ instead of small っ' });
  else if (r.length === 2 && 'くつ'.includes(last)) out.push({ text: r.slice(0, -1) + 'っ', note: 'small っ where it isn’t' });
  return out.filter(o => o.text && o.text !== r);
}

interface Slip { text: string; note: string; weight: number }

const lastKanjiIndex = (text: string) => Math.max(...[...text].map((c, i) => (KANJI.test(c) ? i : -1)));

// A kun (native Japanese) reading of the kanji here, not an on reading: 避ける さ, 鋭い するど
function isNativeReading(piece: string, facts: KanjiFacts | undefined): boolean {
  if (!facts) return false;
  const plain = piece.replace(/っ$/, '');
  // an on reading as written, voiced (かい → がい) or cut short by っ (がく → がっ)
  const unvoiced = (UNVOICE[piece[0]] ?? piece[0]) + piece.slice(1);
  const isOn = facts.on.some(on => on === piece || on === unvoiced || (piece.endsWith('っ') && on.startsWith(plain)));
  return !isOn && facts.kun.some(kun => kun === piece || kun.slice(1) === piece.slice(1));
}

function readingChoices(written: string, reading: string, ending: string, data: QuestionData): Choice[] | null {
  const chars = [...written];
  const sources = chars
    .filter(c => data.kanji.has(c))
    .map(c => ({ kanji: c, on_readings: data.kanji.get(c)!.on, kun_readings: data.kanji.get(c)!.kun }));
  const used = readingsInWord(written, reading, sources);

  // split the reading into one piece per character, if the kanji readings account for all of it
  const pieces: string[] = [];
  let rest = reading;
  for (const c of chars) {
    const piece = KANJI.test(c) ? used.get(c) : c;
    if (!piece || !rest.startsWith(piece)) {
      pieces.length = 0;
      break;
    }
    pieces.push(piece);
    rest = rest.slice(piece.length);
  }
  const split = pieces.length === chars.length && rest === '';

  const slips: Slip[] = [];
  const swap = (i: number, text: string) => pieces.map((p, j) => (j === i ? text : p)).join('');
  if (split) {
    chars.forEach((c, i) => {
      if (!KANJI.test(c)) return;
      const facts = data.kanji.get(c);
      if (isNativeReading(pieces[i], facts)) {
        // 避ける, 鋭い: borrowing another kanji's on reading (へきける) or stretching a vowel (するどうい) would be
        // obviously wrong, so the traps are other kun readings of this kanji and other words ending the same way
        for (const kun of facts?.kun ?? []) {
          if (kun !== pieces[i]) slips.push({ text: swap(i, kun), note: `${c} is read ${kun} in other words, not here`, weight: 2 });
        }
        const kana = written.slice(lastKanjiIndex(written) + 1);
        for (const other of data.otherWords) {
          // another kanji-plus-the-same-kana word (鋭い → 鈍い にぶい, 争い あらそい), not just any word ending in い
          const sameShape = other.written.endsWith(kana) && lastKanjiIndex(other.written) === other.written.length - kana.length - 1;
          if (sameShape && other.reading !== reading && other.written !== written && kana && other.reading.endsWith(kana) && Math.abs(other.reading.length - reading.length) <= 1) {
            slips.push({ text: other.reading, note: `that's the reading of ${other.written}`, weight: 3 });
          }
        }
        // a single kanji plus kana (避ける, 騒いで): any kanji's native word with the same dictionary ending,
        // conjugated like this one (およぐ → およいで, さす → さして)
        if (chars.filter(x => KANJI.test(x)).length === 1 && i === 0 && ending) {
          const own = pieces[0] + ending;
          for (const [word, owners] of data.byKunWord) {
            if (word === own || !word.endsWith(ending) || word.length < ending.length + 1) continue;
            const text = word.slice(0, word.length - ending.length) + kana;
            if (Math.abs(text.length - reading.length) <= 1) slips.push({ text, note: `a different word (${word}, as in ${owners[0]})`, weight: 1 });
          }
        }
        return;
      }
      for (const s of soundSlips(pieces[i])) slips.push({ text: swap(i, s.text), note: `${c}: ${s.note}`, weight: 2 });
      for (const on of facts?.on ?? []) {
        if (on !== pieces[i]) slips.push({ text: swap(i, on), note: `${c} is read ${on} in other words, not here`, weight: 2 });
      }
      for (const other of data.lookalikes.get(c) ?? []) {
        for (const on of (data.kanji.get(other)?.on ?? []).slice(0, 1)) {
          if (on !== pieces[i]) slips.push({ text: swap(i, on), note: `${on} is the reading of look-alike ${other}`, weight: 3 });
        }
      }
    });
  } else {
    // readings like 大人 おとな don't split by kanji: slip the sounds of the whole word
    for (const s of soundSlips(reading)) slips.push({ text: s.text, note: s.note, weight: 2 });
    for (let i = 1; i < reading.length - 1; i++) {
      for (const s of soundSlips(reading.slice(0, i + 1))) slips.push({ text: s.text + reading.slice(i + 1), note: s.note, weight: 1 });
    }
  }
  return pickThree({ text: reading, correct: true }, slips);
}

// ---------------------------------------------------------------------------------------------- writing

function writingChoices(written: string, reading: string, data: QuestionData): Choice[] | null {
  const chars = [...written];
  const sources = chars
    .filter(c => data.kanji.has(c))
    .map(c => ({ kanji: c, on_readings: data.kanji.get(c)!.on, kun_readings: data.kanji.get(c)!.kun }));
  const used = readingsInWord(written, reading, sources);

  const options = chars.map((c, i) => {
    if (!KANJI.test(c)) return [];
    const alike = (data.lookalikes.get(c) ?? []).slice(0, 3).map(k => ({ k, note: `${k} looks like ${c}` }));
    const sound = used.get(c);
    let same: { k: string; note: string }[] = [];
    if (sound && isNativeReading(sound, data.kanji.get(c))) {
      // same kun word, different kanji: さける 避ける / 裂ける
      const word = sound + written.slice(i + 1).replace(/[^ぁ-ゖ].*$/, '');
      same = (data.byKunWord.get(word) ?? [])
        .filter(k => k !== c)
        .slice(0, 3)
        .map(k => ({ k, note: `${k}${written.slice(i + 1)} is also read ${reading}` }));
    } else if (sound) {
      same = (data.byOnReading.get(sound.replace(/っ$/, 'つ')) ?? data.byOnReading.get(sound) ?? [])
        .filter(k => k !== c)
        .slice(0, 3)
        .map(k => ({ k, note: `${k} is also read ${sound}` }));
    }
    return [...alike, ...same].map(o => ({ ...o, i }));
  });

  const slips: Slip[] = [];
  const swap = (pairs: { i: number; k: string }[]) => chars.map((c, j) => pairs.find(p => p.i === j)?.k ?? c).join('');
  for (const list of options) for (const o of list) slips.push({ text: swap([o]), note: o.note, weight: 3 });
  // one wrong kanji in each of two places (往復 → 住複)
  for (let a = 0; a < options.length; a++) {
    for (let b = a + 1; b < options.length; b++) {
      const [x, y] = [options[a][0], options[b][0]];
      if (x && y) slips.push({ text: swap([x, y]), note: `${x.note}; ${y.note}`, weight: 2 });
    }
  }
  return pickThree({ text: written, correct: true }, slips);
}

// ---------------------------------------------------------------------------------------------- shared

function shuffle<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Three different wrong answers, favouring the stronger kinds of trap but mixing them up
function pickThree(correct: Choice, slips: Slip[]): Choice[] | null {
  const seen = new Set([correct.text]);
  const pool = shuffle(slips)
    .sort((a, b) => b.weight - a.weight)
    .filter(s => (seen.has(s.text) ? false : (seen.add(s.text), true)));
  if (pool.length < 3) return null;
  // the top-weighted kind first, then the rest at random, so a test isn't all one kind of trap
  const picked = [pool[0], ...shuffle(pool.slice(1)).slice(0, 2)];
  return shuffle([correct, ...picked.map(s => ({ text: s.text, correct: false, note: s.note }))]);
}

/** One question for the card, or null if it can't make a fair one. */
export function buildQuestion(card: VocabCard, data: QuestionData, prefer?: Question['kind']): Question | null {
  const target = findTarget(card);
  if (!target || ![...target.written].some(c => KANJI.test(c))) return null;
  const kinds: Question['kind'][] = prefer ? [prefer, prefer === 'reading' ? 'writing' : 'reading'] : shuffle(['reading', 'writing']);
  for (const kind of kinds) {
    const choices = kind === 'reading' ? readingChoices(target.written, target.reading, target.ending, data) : writingChoices(target.written, target.reading, data);
    if (choices) return { kind, card, ...target, choices };
  }
  return null;
}

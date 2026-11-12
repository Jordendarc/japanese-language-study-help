// Helpers for showing kanji readings, including working out which reading a kanji uses in a given word
// (食 is read た in 食べる but しょく in 食事).

export interface KanjiReadingSource {
  kanji: string;
  on_readings: string[];
  kun_readings: string[];
}

export function toHiragana(text: string): string {
  return text.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

// KANJIDIC-style kun reading "あ.う" -> "あ(う)", dropping the "-" prefix/suffix markers
export function formatKun(reading: string): string {
  const clean = reading.replace(/-/g, '');
  const [stem, okurigana] = clean.split('.');
  return okurigana ? `${stem}(${okurigana})` : stem;
}

const KANJI = /[一-龯㐀-䶿]/;
const VOICED: Record<string, string[]> = {
  か: ['が'], き: ['ぎ'], く: ['ぐ'], け: ['げ'], こ: ['ご'],
  さ: ['ざ'], し: ['じ'], す: ['ず'], せ: ['ぜ'], そ: ['ぞ'],
  た: ['だ'], ち: ['ぢ', 'じ'], つ: ['づ', 'ず'], て: ['で'], と: ['ど'],
  は: ['ば', 'ぱ'], ひ: ['び', 'ぴ'], ふ: ['ぶ', 'ぷ'], へ: ['べ', 'ぺ'], ほ: ['ぼ', 'ぽ'],
};

// A reading plus the sound changes it can undergo inside a compound: voicing of the first sound
// (rendaku: 手紙 → てがみ) and a small っ replacing a final つ/く/ち/き (学校 → がっこう)
function variants(reading: string): string[] {
  const out = new Set([reading]);
  for (const r of [...out]) {
    for (const v of VOICED[r[0]] ?? []) out.add(v + r.slice(1));
  }
  for (const r of [...out]) {
    if (r.length > 1 && 'つくちき'.includes(r[r.length - 1])) out.add(r.slice(0, -1) + 'っ');
  }
  return [...out];
}

function candidates(source: KanjiReadingSource | undefined): string[] {
  if (!source) return [];
  const on = source.on_readings.map(toHiragana);
  const kun = source.kun_readings.map(r => r.replace(/-/g, '').split('.')[0]);
  return [...new Set([...on, ...kun].filter(Boolean).flatMap(variants))].sort((a, b) => b.length - a.length);
}

const clean = (text: string) =>
  toHiragana(text.normalize('NFKC'))
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/[～〜~・\s]/g, '');

/**
 * Which reading each kanji uses in this word, e.g. 協会/きょうかい → { 協: 'きょう', 会: 'かい' }.
 * Only kanji whose reading is certain are included: if the word can be split more than one way,
 * kanji the splits disagree on are left out rather than guessed.
 */
export function readingsInWord(vocab: string, reading: string, kanji: KanjiReadingSource[]): Map<string, string> {
  const chars = [...clean(vocab)];
  const target = clean(reading);
  const byChar = new Map(kanji.map(k => [k.kanji, k]));
  const result = new Map<string, string>();
  if (!target || !chars.some(c => KANJI.test(c))) return result;

  const solutions: string[][] = [];
  const assigned: string[] = [];

  const walk = (ci: number, ri: number) => {
    if (solutions.length >= 20) return;
    if (ci === chars.length) {
      if (ri === target.length) solutions.push([...assigned]);
      return;
    }
    const ch = chars[ci];
    if (!KANJI.test(ch) && ch !== '々') {
      if (target[ri] === ch) {
        assigned.push('');
        walk(ci + 1, ri + 1);
        assigned.pop();
      }
      return;
    }
    // 々 repeats the previous kanji
    const source = ch === '々' ? byChar.get(chars[ci - 1]) : byChar.get(ch);
    // A kanji we have no data for can stand for any 1-3 kana, so its neighbours can still be worked out;
    // it never gets a reading of its own (marked with a leading "?" and skipped below)
    const options = source ? candidates(source) : [1, 2, 3].map(n => '?' + target.slice(ri, ri + n)).filter(o => o.length > 1);
    for (const option of options.filter(o => o.startsWith('?'))) {
      assigned.push(option);
      walk(ci + 1, ri + option.length - 1);
      assigned.pop();
    }
    for (const option of options) {
      if (!option.startsWith('?') && target.startsWith(option, ri)) {
        assigned.push(option);
        walk(ci + 1, ri + option.length);
        assigned.pop();
      }
    }
  };
  walk(0, 0);

  chars.forEach((ch, i) => {
    if (!KANJI.test(ch) || !solutions.length) return;
    const seen = new Set(solutions.map(s => s[i]));
    if (seen.size === 1 && !solutions[0][i].startsWith('?') && !result.has(ch)) result.set(ch, solutions[0][i]);
  });
  return result;
}

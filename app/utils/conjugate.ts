// Conjugates verbs and adjectives from their dictionary form. Used to show a word's forms and to spot
// textbook cards that are really a form of another word (食べて = te-form of 食べる).
// Form codes match the form_types table in supabase/vocab-v2-schema.sql.

export type VerbClass = 'ichidan' | 'godan' | 'irregular' | 'suru';

export type FormCode =
  | 'masu' | 'masu-stem' | 'te' | 'ta' | 'nai' | 'nakatta' | 'volitional' | 'potential' | 'passive' | 'causative'
  | 'causative-passive' | 'imperative' | 'prohibitive' | 'ba' | 'tara' | 'tari' | 'tai' | 'naide' | 'zu'
  | 'adverbial' | 'sa-noun' | 'sou' | 'sugiru';

export interface Conjugable {
  written: string;
  reading: string;
  partOfSpeech: string | null;
  verbClass: VerbClass | null;
}

export type Forms = Partial<Record<FormCode, { written: string; reading: string }>>;

const A: Record<string, string> = { う: 'わ', く: 'か', ぐ: 'が', す: 'さ', つ: 'た', ぬ: 'な', ぶ: 'ば', む: 'ま', る: 'ら' };
const I: Record<string, string> = { う: 'い', く: 'き', ぐ: 'ぎ', す: 'し', つ: 'ち', ぬ: 'に', ぶ: 'び', む: 'み', る: 'り' };
const E: Record<string, string> = { う: 'え', く: 'け', ぐ: 'げ', す: 'せ', つ: 'て', ぬ: 'ね', ぶ: 'べ', む: 'め', る: 'れ' };
const O: Record<string, string> = { う: 'お', く: 'こ', ぐ: 'ご', す: 'そ', つ: 'と', ぬ: 'の', ぶ: 'ぼ', む: 'も', る: 'ろ' };
const TE: Record<string, string> = { う: 'って', つ: 'って', る: 'って', む: 'んで', ぶ: 'んで', ぬ: 'んで', く: 'いて', ぐ: 'いで', す: 'して' };

// Honorific godan verbs whose masu-stem and imperative end in い rather than り
const HONORIFIC_GODAN = new Set(['いらっしゃる', 'おっしゃる', 'くださる', 'なさる', 'ござる']);

// Applies the same ending rules to the written form and the reading, so 食べる/たべる → 食べて/たべて
function both(word: Conjugable, rules: Partial<Record<FormCode, (s: string, dict: string) => string>>, cut: number): Forms {
  const out: Forms = {};
  const wStem = word.written.slice(0, word.written.length - cut);
  const rStem = word.reading.slice(0, word.reading.length - cut);
  for (const [code, rule] of Object.entries(rules) as [FormCode, (s: string, dict: string) => string][]) {
    out[code] = { written: rule(wStem, word.written), reading: rule(rStem, word.reading) };
  }
  return out;
}

function ichidan(word: Conjugable): Forms {
  return both(word, {
    masu: s => s + 'ます', 'masu-stem': s => s, te: s => s + 'て', ta: s => s + 'た', nai: s => s + 'ない',
    nakatta: s => s + 'なかった', volitional: s => s + 'よう', potential: s => s + 'られる', passive: s => s + 'られる',
    causative: s => s + 'させる', 'causative-passive': s => s + 'させられる', imperative: s => s + 'ろ',
    prohibitive: (_, d) => d + 'な', ba: s => s + 'れば', tara: s => s + 'たら', tari: s => s + 'たり',
    tai: s => s + 'たい', naide: s => s + 'ないで', zu: s => s + 'ず',
  }, 1);
}

function godan(word: Conjugable): Forms {
  const end = word.reading.slice(-1);
  if (!A[end]) return {};
  const iku = word.reading.endsWith('いく') && word.written.slice(-1) === 'く' && /行く$|いく$/.test(word.written);
  const honorific = HONORIFIC_GODAN.has(word.reading) || [...HONORIFIC_GODAN].some(h => word.reading.endsWith(h));
  const te = iku ? 'って' : TE[end];
  const ta = te.replace(/て$/, 'た').replace(/で$/, 'だ');
  const iStem = honorific ? 'い' : I[end];
  const aru = word.reading === 'ある';
  return both(word, {
    masu: s => s + iStem + 'ます', 'masu-stem': s => s + iStem, te: s => s + te, ta: s => s + ta,
    nai: s => (aru ? s.slice(0, -1) : s + A[end]) + 'ない', nakatta: s => (aru ? s.slice(0, -1) : s + A[end]) + 'なかった',
    volitional: s => s + O[end] + 'う', potential: s => s + E[end] + 'る', passive: s => s + A[end] + 'れる',
    causative: s => s + A[end] + 'せる', 'causative-passive': s => s + A[end] + (end === 'す' ? 'せられる' : 'される'),
    imperative: s => s + (honorific ? 'い' : E[end]), prohibitive: (_, d) => d + 'な', ba: s => s + E[end] + 'ば',
    tara: s => s + ta + 'ら', tari: s => s + ta + 'り', tai: s => s + iStem + 'たい',
    naide: s => (aru ? s.slice(0, -1) : s + A[end]) + 'ないで', zu: s => s + A[end] + 'ず',
  }, 1);
}

function suru(word: Conjugable): Forms {
  // Works for both 勉強する and a suru-noun stored without する (勉強)
  const base = word.written.endsWith('する') ? word : { ...word, written: word.written + 'する', reading: word.reading + 'する' };
  return both(base, {
    masu: s => s + 'します', 'masu-stem': s => s + 'し', te: s => s + 'して', ta: s => s + 'した', nai: s => s + 'しない',
    nakatta: s => s + 'しなかった', volitional: s => s + 'しよう', potential: s => s + 'できる', passive: s => s + 'される',
    causative: s => s + 'させる', 'causative-passive': s => s + 'させられる', imperative: s => s + 'しろ',
    prohibitive: (_, d) => d + 'な', ba: s => s + 'すれば', tara: s => s + 'したら', tari: s => s + 'したり',
    tai: s => s + 'したい', naide: s => s + 'しないで', zu: s => s + 'せず',
  }, 2);
}

function kuru(word: Conjugable): Forms {
  // 来る: the kanji stays, the reading changes (き/こ/く)
  const kanji = word.written.endsWith('来る');
  const w = (r: string) => (kanji ? word.written.slice(0, -2) + '来' + r.slice(1) : word.written.slice(0, -2) + r);
  const r = (x: string) => word.reading.slice(0, -2) + x;
  const make = (x: string) => ({ written: w(x), reading: r(x) });
  return {
    masu: make('きます'), 'masu-stem': make('き'), te: make('きて'), ta: make('きた'), nai: make('こない'),
    nakatta: make('こなかった'), volitional: make('こよう'), potential: make('こられる'), passive: make('こられる'),
    causative: make('こさせる'), 'causative-passive': make('こさせられる'), imperative: make('こい'),
    prohibitive: make('くるな'), ba: make('くれば'), tara: make('きたら'), tari: make('きたり'), tai: make('きたい'),
    naide: make('こないで'), zu: make('こず'),
  };
}

function iAdjective(word: Conjugable): Forms {
  // いい conjugates from よい
  const ii = /(^|[^぀-ゟ])いい$/.test(word.written) || word.reading.endsWith('いい');
  const target = ii ? { ...word, written: word.written.slice(0, -2) + 'よい', reading: word.reading.slice(0, -2) + 'よい' } : word;
  return both(target, {
    te: s => s + 'くて', ta: s => s + 'かった', nai: s => s + 'くない', nakatta: s => s + 'くなかった', ba: s => s + 'ければ',
    tara: s => s + 'かったら', adverbial: s => s + 'く', 'sa-noun': s => s + 'さ', sou: s => s + 'そう', sugiru: s => s + 'すぎる',
  }, 1);
}

function naAdjective(word: Conjugable): Forms {
  return both(word, {
    te: s => s + 'で', ta: s => s + 'だった', nai: s => s + 'じゃない', nakatta: s => s + 'じゃなかった', ba: s => s + 'なら',
    tara: s => s + 'だったら', adverbial: s => s + 'に', 'sa-noun': s => s + 'さ', sou: s => s + 'そう', sugiru: s => s + 'すぎる',
  }, 0);
}

/** All forms the word has, or {} when its type or class isn't known. */
export function conjugate(word: Conjugable): Forms {
  if (word.verbClass === 'suru') return suru(word);
  if (word.verbClass === 'irregular') return word.reading.endsWith('くる') ? kuru(word) : suru(word);
  if (word.verbClass === 'ichidan') return ichidan(word);
  if (word.verbClass === 'godan') return godan(word);
  if (word.partOfSpeech === 'i-adjective') return iAdjective(word);
  if (word.partOfSpeech === 'na-adjective') return naAdjective(word);
  return {};
}


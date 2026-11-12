'use client';

import { useEffect, useMemo, useState } from 'react';
import type { VocabCard } from '../types';
import { formatKun, readingsInWord } from '../utils/kanjiReadings';
import { describeWord, isUnencoded, LAYOUT_LABELS, PART_NAMES } from '../utils/kanjiParts';
import { getTextbookColor, getTextbookShortName } from '../utils/textbookColors';
import {
  cleanLesson,
  kanjiBreakdowns,
  lessonNumber,
  lookalikes,
  wordLinks,
  wordsWithKanji,
  type KanjiBreakdown,
  type Lookalike,
  type PartNode,
  type RelatedWord,
  type WordLinks,
} from '../services/wordDetailsService';

// "Word details" panel under a flashcard (Vocabulary V2):
//   Kanji        what each kanji means, how it's read here, and what it's built from
//   Same kanji   other words in the database that share those kanji
//   Look-alikes  kanji that are easy to mix up with the ones in this word
//   Related      the dictionary entry's details and linked words (transitive pair, opposites, see also, ...)
// Render it with key={card.id} so it starts fresh for every card.

const KANJI = /[一-龯㐀-䶿]/g;
const OPEN_KEY = 'word-details-open';
const PREVIEW_COUNT = 5;

type Tab = 'kanji' | 'same' | 'lookalikes' | 'related';
const TAB_LABELS: Record<Tab, string> = { kanji: 'Kanji', same: 'Same kanji', lookalikes: 'Look-alikes', related: 'Related' };

// Loads data for a tab; null while loading
function useLoaded<T>(load: () => Promise<T>, key: string): T | null {
  const [state, setState] = useState<{ key: string; value: T } | null>(null);
  useEffect(() => {
    let cancelled = false;
    load().then(value => {
      if (!cancelled) setState({ key, value });
    });
    return () => {
      cancelled = true;
    };
    // `key` identifies what `load` fetches
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state && state.key === key ? state.value : null;
}

function LessonBadge({ textbook, lesson }: { textbook: string; lesson: string }) {
  const colours = getTextbookColor(textbook);
  return (
    <span
      className="shrink-0 h-fit text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap"
      style={{ backgroundColor: colours.backgroundColor, color: colours.textColor }}
    >
      {getTextbookShortName(textbook)} L{cleanLesson(lesson)}
    </span>
  );
}

const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-block text-[11px] px-2 py-0.5 rounded-md bg-accent/15 text-accent">{children}</span>
);

const Loading = () => <p className="text-xs text-fg-muted">Loading...</p>;

// ---------------------------------------------------------------------------------------------- Kanji

function PartLabel({ node }: { node: PartNode }) {
  const unencoded = isUnencoded(node.part);
  const meaning = unencoded ? 'a shape with no character of its own' : node.meaning ?? PART_NAMES[node.part] ?? null;
  return (
    <div className="flex items-baseline gap-2 py-0.5">
      <span lang="ja" className="text-lg leading-tight text-fg w-6 text-center shrink-0">{unencoded ? '□' : node.part}</span>
      <span className="text-xs text-fg-soft min-w-0">
        {meaning ?? <span className="text-fg-muted">no meaning recorded yet</span>}
        {node.layout && LAYOUT_LABELS[node.layout] && (
          <span className="text-fg-muted"> · {LAYOUT_LABELS[node.layout]}</span>
        )}
      </span>
    </div>
  );
}

function PartTree({ nodes }: { nodes: PartNode[] }) {
  return (
    <ul className="space-y-0.5">
      {nodes.map((node, i) => (
        <li key={`${node.part}-${i}`}>
          <PartLabel node={node} />
          {node.children.length > 0 && (
            <div className="ml-3 pl-3 border-l border-line">
              <PartTree nodes={node.children} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function Breakdown({ breakdown }: { breakdown: KanjiBreakdown | undefined }) {
  if (!breakdown) return null;
  const { facts, radicalMeaning, tree } = breakdown;
  const stats = [
    facts.stroke_count && `${facts.stroke_count} strokes`,
    facts.grade && (facts.grade <= 6 ? `grade ${facts.grade}` : 'secondary school'),
  ].filter(Boolean);
  return (
    <div className="mt-2 space-y-2">
      {(stats.length > 0 || facts.radical) && (
        <div className="text-xs text-fg-muted">
          {stats.join(' · ')}
          {facts.radical && (
            <>
              {stats.length > 0 && ' · '}radical <span lang="ja" className="text-fg">{facts.radical}</span>
              {radicalMeaning || PART_NAMES[facts.radical] ? ` (${radicalMeaning ?? PART_NAMES[facts.radical]})` : ''}
            </>
          )}
        </div>
      )}
      {tree && tree.children.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-fg-muted mb-1">
            Built from{tree.layout && LAYOUT_LABELS[tree.layout] ? ` · ${LAYOUT_LABELS[tree.layout]}` : ''}
          </div>
          <PartTree nodes={tree.children} />
        </div>
      )}
    </div>
  );
}

function KanjiTab({ card, characters }: { card: VocabCard; characters: string[] }) {
  const details = useMemo(() => new Map((card.kanji_data ?? []).map(k => [k.kanji, k])), [card.kanji_data]);
  const usedReadings = useMemo(() => readingsInWord(card.vocab, card.reading, card.kanji_data ?? []), [card]);
  const breakdowns = useLoaded(() => kanjiBreakdowns(characters), characters.join(''));

  return (
    <ul className="divide-y divide-line">
      {characters.map(character => {
        const info = details.get(character);
        const here = usedReadings.get(character);
        const meanings = info?.meanings.length ? info.meanings : breakdowns?.get(character)?.facts.meanings ?? [];
        return (
          <li key={character} className="flex gap-4 py-3 first:pt-0 last:pb-0">
            <span lang="ja" className="text-4xl font-light text-fg w-12 text-center leading-none shrink-0">{character}</span>
            <div className="min-w-0 flex-1 text-sm">
              {info || meanings.length ? (
                <>
                  <div className="text-fg">{meanings.join(', ')}</div>
                  {info && (
                    <>
                      <div className="text-xs text-fg-muted" lang="ja">
                        On: {info.on_readings.length ? info.on_readings.join('、') : 'none'}
                      </div>
                      <div className="text-xs text-fg-muted" lang="ja">
                        Kun: {info.kun_readings.length ? info.kun_readings.map(formatKun).join('、') : 'none'}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="text-xs text-fg-muted">No details for this kanji yet.</div>
              )}
              {here && (
                <div className="mt-1.5">
                  <Chip>
                    read as <span lang="ja">{here}</span> here
                  </Chip>
                </div>
              )}
              {breakdowns === null ? <div className="mt-2"><Loading /></div> : <Breakdown breakdown={breakdowns.get(character)} />}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------------------------- Same kanji

function SameKanjiGroup({ character, card }: { character: string; card: VocabCard }) {
  const words = useLoaded<RelatedWord[]>(() => wordsWithKanji(character), character);
  const [showAll, setShowAll] = useState(false);

  // The textbook being studied first, then lesson order; skip this card's own word and duplicates
  const others = useMemo(() => {
    if (!words) return [];
    const seen = new Set<string>([`${card.vocab}|${card.reading}`]);
    return words
      .filter(word => {
        const key = `${word.vocab}|${word.reading}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) =>
        Number(b.textbook === card.textbook) - Number(a.textbook === card.textbook) ||
        a.textbook.localeCompare(b.textbook) ||
        lessonNumber(a.lesson) - lessonNumber(b.lesson)
      );
  }, [words, card.vocab, card.reading, card.textbook]);

  const shown = showAll ? others : others.slice(0, PREVIEW_COUNT);

  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-baseline justify-between mb-1.5">
        <span lang="ja" className="text-lg text-fg">{character}</span>
        <span className="text-xs text-fg-muted">
          {words === null ? 'Loading...' : `${others.length} other ${others.length === 1 ? 'word' : 'words'}`}
        </span>
      </div>
      {words !== null && others.length === 0 && <p className="text-xs text-fg-muted">No other words with this kanji yet.</p>}
      <ul className="divide-y divide-line">
        {shown.map(word => (
          <li key={word.id} className="flex justify-between gap-2 py-1.5">
            <div className="min-w-0">
              <div lang="ja" className="text-sm text-fg">{word.vocab}</div>
              <div className="text-xs text-fg-muted truncate">
                <span lang="ja">{word.reading}</span> · {word.my_meaning || word.english}
              </div>
            </div>
            <LessonBadge textbook={word.textbook} lesson={word.lesson} />
          </li>
        ))}
      </ul>
      {others.length > PREVIEW_COUNT && (
        <button onClick={() => setShowAll(v => !v)} className="w-full mt-1.5 text-xs text-accent hover:underline">
          {showAll ? 'Show fewer' : `Show all ${others.length}`}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------- Look-alikes

function reasonText(l: Lookalike): string[] {
  const out: string[] = [];
  if (l.looksAlike) out.push('looks alike');
  // parts are stored biggest first (晴 / 清 share 青, then 青's own pieces), so the first one says it best
  const part = l.sharedParts.find(p => !isUnencoded(p));
  if (part) out.push(`shares ${part}`);
  if (l.sameReading) out.push(`also read ${l.sameReading}`);
  return out;
}

function LookalikesTab({ characters }: { characters: string[] }) {
  const groups = useLoaded<Map<string, Lookalike[]>>(() => lookalikes(characters), characters.join(''));
  if (groups === null) return <Loading />;
  return (
    <>
      {characters.map(character => {
        const list = groups.get(character) ?? [];
        return (
          <div key={character} className="mb-4 last:mb-0">
            <div className="flex items-baseline justify-between mb-1.5">
              <span lang="ja" className="text-lg text-fg">{character}</span>
              <span className="text-xs text-fg-muted">{list.length ? `${list.length} to watch out for` : ''}</span>
            </div>
            {list.length === 0 && <p className="text-xs text-fg-muted">No easily confused kanji.</p>}
            <ul className="divide-y divide-line">
              {list.map(l => (
                <li key={l.character} className="flex gap-3 py-2">
                  <span lang="ja" className="text-3xl font-light text-fg w-10 text-center leading-none shrink-0">{l.character}</span>
                  <div className="min-w-0">
                    <div className="text-sm text-fg">{l.meanings.slice(0, 3).join(', ') || 'no meaning recorded'}</div>
                    {l.on_readings.length > 0 && (
                      <div className="text-xs text-fg-muted" lang="ja">On: {l.on_readings.join('、')}</div>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1" lang="ja">
                      {reasonText(l).map(r => <Chip key={r}>{r}</Chip>)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------------------------- Related

function RelatedTab({ card }: { card: VocabCard }) {
  const cardId = card.id ?? '';
  const data = useLoaded<WordLinks>(() => (cardId ? wordLinks(cardId) : Promise.resolve({ word: null, tags: [], links: [] })), cardId);
  if (data === null) return <Loading />;
  if (!data.word) return <p className="text-xs text-fg-muted">This card isn&apos;t linked to a dictionary word yet.</p>;

  const groups = new Map<string, WordLinks['links']>();
  for (const link of data.links) groups.set(link.label, [...(groups.get(link.label) ?? []), link]);
  const summary = describeWord(data.word);

  return (
    <div className="space-y-4">
      <div>
        {summary && <div className="text-sm text-fg">{summary}</div>}
        {data.word.meaning_en && <div className="text-xs text-fg-muted mt-0.5">Dictionary: {data.word.meaning_en}</div>}
        {data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {data.tags.map(tag => <Chip key={tag}>{tag}</Chip>)}
          </div>
        )}
      </div>

      {groups.size === 0 && <p className="text-xs text-fg-muted">No linked words yet.</p>}
      {[...groups].map(([label, links]) => (
        <div key={label}>
          <div className="text-[11px] uppercase tracking-wide text-fg-muted mb-1">{label}</div>
          <ul className="divide-y divide-line">
            {links.map(link => (
              <li key={link.word.id} className="flex justify-between gap-2 py-1.5">
                <div className="min-w-0">
                  <div lang="ja" className="text-sm text-fg">{link.word.written}</div>
                  <div className="text-xs text-fg-muted truncate">
                    <span lang="ja">{link.word.reading}</span>
                    {link.word.meaning_en && ` · ${link.word.meaning_en}`}
                  </div>
                </div>
                {link.textbook && link.lesson ? (
                  <LessonBadge textbook={link.textbook} lesson={link.lesson} />
                ) : (
                  <span className="shrink-0 h-fit text-[10px] text-fg-muted">not in textbooks</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------- Panel

export default function WordDetails({ card }: { card: VocabCard }) {
  const [open, setOpen] = useState(() => {
    try {
      return typeof window !== 'undefined' && localStorage.getItem(OPEN_KEY) === '1';
    } catch {
      return false;
    }
  });

  const characters = useMemo(() => [...new Set(card.vocab.match(KANJI) ?? [])], [card.vocab]);
  // words written only in kana get just the Related tab
  const tabs: Tab[] = characters.length ? ['kanji', 'same', 'lookalikes', 'related'] : ['related'];
  const [tab, setTab] = useState<Tab>(tabs[0]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(OPEN_KEY, next ? '1' : '0');
    } catch {
      // storage unavailable: the panel just won't remember being open
    }
  };

  return (
    <section className="mt-4">
      <button
        onClick={toggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-surface border border-line text-sm text-fg-soft hover:text-fg transition-colors"
      >
        <span>
          Word details · <span lang="ja">{card.vocab}</span>
        </span>
        <span aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="mt-2">
          {tabs.length > 1 && (
            <div className="flex gap-1 mb-2" role="tablist">
              {tabs.map(id => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition ${
                    tab === id ? 'bg-accent text-on-accent' : 'bg-surface text-fg-muted hover:text-fg'
                  }`}
                >
                  {TAB_LABELS[id]}
                </button>
              ))}
            </div>
          )}

          <div className="bg-surface border border-line rounded-2xl p-4">
            {tab === 'kanji' && <KanjiTab card={card} characters={characters} />}
            {tab === 'same' && characters.map(character => <SameKanjiGroup key={character} character={character} card={card} />)}
            {tab === 'lookalikes' && <LookalikesTab characters={characters} />}
            {tab === 'related' && <RelatedTab card={card} />}
          </div>
          {/* required by the dictionary licences (KANJIDIC2 / JMdict: CC BY-SA 4.0; IDS: GPLv2) */}
          <p className="px-4 pt-2 pb-3 text-[10px] leading-snug text-fg-muted">
            Kanji and word data from{' '}
            <a href="https://www.edrdg.org/edrdg/licence.html" target="_blank" rel="noopener noreferrer" className="underline">
              KANJIDIC2 and JMdict
            </a>{' '}
            © EDRDG (CC BY-SA 4.0). Kanji parts from CJKVI IDS, based on CHISE.
          </p>
        </div>
      )}
    </section>
  );
}

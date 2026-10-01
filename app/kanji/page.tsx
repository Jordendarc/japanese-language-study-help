'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Furigana from '../components/Furigana';
import { getTextbookColor, getTextbookShortName } from '../utils/textbookColors';
import { createClient } from '../utils/supabase/client';

interface VocabEntry {
  id: string;
  vocab: string;
  reading: string;
  english: string;
  example_jp: string;
  example_en: string;
  my_meaning: string;
  lesson: string;
  page: string;
  textbook: string;
}

interface KanjiData {
  id: string;
  character: string;
  meanings: string[];
  on_readings: string[];
  kun_readings: string[];
  all_readings: string[];
  vocabulary: VocabEntry[];
}

export default function KanjiPage() {
  const router = useRouter();
  const [kanjiData, setKanjiData] = useState<KanjiData[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedKanji, setExpandedKanji] = useState<Set<string>>(new Set());

  // Search with debouncing - wait 1.5 seconds after user stops typing
  useEffect(() => {
    if (!searchTerm.trim()) {
      setKanjiData([]);
      setSearching(false);
      return;
    }

    // Show searching indicator immediately
    setSearching(true);

    // Debounce: wait 1.5 seconds before actually searching
    const timeoutId = setTimeout(async () => {
      const supabase = createClient();
      const query = searchTerm.trim();

      try {
        // Search kanji using RPC function
        const { data: searchResults, error } = await supabase
          .rpc('search_kanji', { p_query: query, p_limit: 100 });

        if (error) {
          console.error('Search error:', error);
          setSearching(false);
          return;
        }

        // For each kanji result, fetch its full vocabulary
        if (searchResults && searchResults.length > 0) {
          const kanjiWithVocab = await Promise.all(
            searchResults.map(async (kanji: any) => {
              const { data: kanjiDetails } = await supabase
                .rpc('get_kanji_with_vocabulary', { p_kanji_character: kanji.character });

              if (kanjiDetails && kanjiDetails.length > 0) {
                return {
                  ...kanjiDetails[0],
                  vocabulary: kanjiDetails[0].vocabulary || [],
                };
              }
              return null;
            })
          );

          setKanjiData(kanjiWithVocab.filter(k => k !== null) as KanjiData[]);
        } else {
          setKanjiData([]);
        }

        setSearching(false);
      } catch (error) {
        console.error('Search error:', error);
        setSearching(false);
      }
    }, 1500); // 1.5 second debounce

    // Cleanup timeout if user types again before 1.5 seconds
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const toggleKanji = (character: string) => {
    const newExpanded = new Set(expandedKanji);
    if (newExpanded.has(character)) {
      newExpanded.delete(character);
    } else {
      newExpanded.add(character);
    }
    setExpandedKanji(newExpanded);
  };

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="bg-surface rounded-xl sm:rounded-2xl p-4 sm:p-8 mb-6 sm:mb-8 border border-line">
          <button
            onClick={() => router.push('/')}
            className="mb-3 sm:mb-4 text-accent hover:text-accent transition-colors flex items-center gap-2 text-sm sm:text-base"
          >
            <span>←</span>
            <span>Back to Home</span>
          </button>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl sm:text-5xl font-medium text-accent mb-2">
                漢字 Dictionary
              </h1>
              {searchTerm && !searching && (
                <p className="text-fg-soft text-sm sm:text-base">
                  Found {kanjiData.length} kanji • {kanjiData.reduce((sum, k) => sum + k.vocabulary.length, 0)} vocabulary words
                </p>
              )}
              {searching && (
                <p className="text-fg-soft text-sm sm:text-base">
                  Searching...
                </p>
              )}
              {!searchTerm && (
                <p className="text-fg-soft text-sm sm:text-base">
                  Type to search kanji, meanings, or vocabulary
                </p>
              )}
            </div>
            <div className="text-4xl sm:text-6xl">📚</div>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search kanji, meanings, or vocabulary..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border-2 border-accent/40 rounded-lg focus:border-accent focus:outline-none text-base sm:text-lg text-fg placeholder-fg-muted"
              autoFocus
            />
            {searching && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin h-6 w-6 border-2 border-accent border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>
        </header>

        {/* Kanji List */}
        <div className="space-y-4">
          {kanjiData.map((kanjiEntry) => {
            const isExpanded = expandedKanji.has(kanjiEntry.character);

            return (
              <div
                key={kanjiEntry.id}
                className="bg-surface rounded-xl sm:rounded-2xl overflow-hidden border border-line"
              >
                {/* Kanji Header */}
                <button
                  onClick={() => toggleKanji(kanjiEntry.character)}
                  className="w-full p-4 sm:p-6 flex items-center gap-4 sm:gap-6 hover:bg-accent/25 transition-colors"
                >
                  <div className="text-5xl sm:text-7xl font-medium text-accent flex-shrink-0">
                    {kanjiEntry.character}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-xl sm:text-2xl font-medium text-fg mb-1 break-words">
                      {kanjiEntry.meanings.join(', ') || 'No meanings listed'}
                    </div>
                    {kanjiEntry.all_readings && kanjiEntry.all_readings.length > 0 && (
                      <div className="text-sm sm:text-base text-fg-soft break-words">
                        読み方: {kanjiEntry.all_readings.join(', ')}
                      </div>
                    )}
                    <div className="text-xs sm:text-sm text-accent mt-2">
                      {kanjiEntry.vocabulary.length} vocabulary word{kanjiEntry.vocabulary.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl text-accent flex-shrink-0">
                    {isExpanded ? '▲' : '▼'}
                  </div>
                </button>

                {/* Vocabulary List */}
                {isExpanded && (
                  <div className="border-t border-line p-4 sm:p-6 bg-accent/15">
                    <div className="space-y-4">
                      {kanjiEntry.vocabulary.map((vocab: VocabEntry, idx: number) => {
                        // Get textbook info
                        const colors = vocab.textbook ? getTextbookColor(vocab.textbook) : null;
                        const textbookName = vocab.textbook ? getTextbookShortName(vocab.textbook) : null;
                        const textbookColor = colors?.backgroundColor || '#01AAC9';
                        const textbookTextColor = colors?.textColor || '#ffffff';

                        return (
                          <div
                            key={vocab.id || idx}
                            className="bg-surface rounded-lg p-3 sm:p-4 border-l-4 border-accent border border-line"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 mb-3">
                              <div className="flex-1 min-w-0">
                                <div className="text-xl sm:text-2xl font-medium text-fg mb-1 break-words">
                                  {vocab.vocab}
                                </div>
                                <div className="text-base sm:text-lg text-fg-soft mb-1">
                                  {vocab.reading}
                                </div>
                                <div className="text-sm sm:text-base text-accent font-medium">
                                  {vocab.english}
                                </div>
                                {vocab.my_meaning && vocab.my_meaning !== vocab.english && (
                                  <div className="text-xs sm:text-sm text-fg-soft mt-1 italic">
                                    {vocab.my_meaning}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2 text-xs sm:text-sm text-fg-muted sm:flex-shrink-0 flex-wrap">
                                {textbookName && (
                                  <span
                                    className="px-2 py-1 rounded font-medium"
                                    style={{ backgroundColor: textbookColor, color: textbookTextColor }}
                                  >
                                    {textbookName}
                                  </span>
                                )}
                                <span className="px-2 py-1 bg-accent/15 text-accent rounded font-medium">
                                  L{vocab.lesson}
                                </span>
                                <span className="px-2 py-1 bg-surface-raised text-fg rounded font-medium">
                                  P{vocab.page}
                                </span>
                              </div>
                            </div>

                            {/* Examples */}
                            {vocab.example_jp && (
                              <div className="mt-3 pt-3 border-t border-line space-y-2">
                                <div className="text-sm sm:text-base text-fg leading-relaxed break-words overflow-wrap-anywhere">
                                  <Furigana text={vocab.example_jp} />
                                </div>
                                <div className="text-xs sm:text-sm text-fg-soft italic break-words">
                                  {vocab.example_en}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {searchTerm && !searching && kanjiData.length === 0 && (
          <div className="bg-surface rounded-2xl p-8 text-center border border-line">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-medium text-fg mb-2">No kanji found</h2>
            <p className="text-fg-soft">
              Try searching for a different term
            </p>
          </div>
        )}

        {/* Initial State */}
        {!searchTerm && (
          <div className="bg-surface rounded-2xl p-8 text-center border border-line">
            <div className="text-6xl mb-4">🔎</div>
            <h2 className="text-2xl font-medium text-fg mb-2">Start typing to search</h2>
            <p className="text-fg-soft">
              Search by kanji character, meaning, or vocabulary word
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

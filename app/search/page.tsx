'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { VocabCard, GrammarCard } from '../types';
import Furigana from '../components/Furigana';
import { getTextbookColor, getTextbookShortName } from '../utils/textbookColors';
import { createClient } from '../utils/supabase/client';

type SearchResult = {
  type: 'vocab' | 'grammar';
  data: VocabCard | GrammarCard;
};

export default function SearchPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  // Search with debouncing - wait 1.5 seconds after user stops typing
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    // Show searching indicator immediately
    setSearching(true);

    // Debounce: wait 1.5 seconds before actually searching
    const timeoutId = setTimeout(async () => {
      const supabase = createClient();
      const query = searchQuery.trim();

      try {
        // Search both vocabulary and grammar in parallel
        const [vocabResponse, grammarResponse] = await Promise.all([
          supabase.rpc('search_vocabulary', { p_query: query, p_limit: 50 }),
          supabase.rpc('search_grammar', { p_query: query, p_limit: 50 })
        ]);

        const results: SearchResult[] = [];

        // Add vocabulary results
        if (vocabResponse.data) {
          vocabResponse.data.forEach((vocabData: any) => {
            results.push({
              type: 'vocab',
              data: vocabData as VocabCard
            });
          });
        }

        // Add grammar results
        if (grammarResponse.data) {
          grammarResponse.data.forEach((grammarData: any) => {
            results.push({
              type: 'grammar',
              data: grammarData as GrammarCard
            });
          });
        }

        setSearchResults(results);
        setSearching(false);
      } catch (error) {
        console.error('Search error:', error);
        setSearching(false);
      }
    }, 1500); // 1.5 second debounce

    // Cleanup timeout if user types again before 1.5 seconds
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-app p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="text-accent hover:text-accent mb-4 flex items-center gap-2"
          >
            ← Back to Home
          </button>
          <h1 className="text-4xl font-medium text-fg mb-2">Search</h1>
          <p className="text-fg-soft">Search across all vocabulary and grammar</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6 relative">
          <input
            type="text"
            placeholder="Search for vocabulary or grammar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-6 py-4 text-lg rounded-xl border-2 border-accent/40 focus:border-accent focus:outline-none bg-surface text-fg"
            autoFocus
          />
          {searching && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin h-6 w-6 border-2 border-accent border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>

        {/* Results Count */}
        {searchQuery && !searching && (
          <div className="mb-4 text-fg-soft">
            Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
          </div>
        )}
        {searching && (
          <div className="mb-4 text-fg-soft">
            Searching...
          </div>
        )}

        {/* Results */}
        <div className="space-y-4">
          {searchResults.map((result, index) => (
            <div key={index} className="bg-surface rounded-xl p-6 border border-line">
              {/* Type Badge */}
              <div className="mb-3">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  result.type === 'vocab'
                    ? 'bg-accent/15 text-accent'
                    : 'bg-accent/15 text-accent'
                }`}>
                  {result.type === 'vocab' ? 'Vocabulary' : 'Grammar'}
                </span>
              </div>

              {result.type === 'vocab' ? (
                // Vocabulary Result
                (() => {
                  const vocabData = result.data as VocabCard;
                  const colors = vocabData.textbook ? getTextbookColor(vocabData.textbook) : null;
                  const textbookName = vocabData.textbook ? getTextbookShortName(vocabData.textbook) : null;
                  const textbookColor = colors?.backgroundColor || '#01AAC9';
                  const textbookTextColor = colors?.textColor || '#ffffff';

                  return (
                    <>
                      <div className="flex items-start gap-3 mb-2">
                        <div className="text-3xl font-medium text-fg flex-1">
                          {vocabData.vocab}
                        </div>
                        {textbookName && (
                          <span
                            className="px-3 py-1 rounded-lg text-sm font-medium flex-shrink-0"
                            style={{ backgroundColor: textbookColor, color: textbookTextColor }}
                          >
                            {textbookName}
                          </span>
                        )}
                      </div>
                      <div className="text-xl text-accent mb-2">
                        {vocabData.reading}
                      </div>
                      <div className="text-lg text-fg mb-3">
                        {vocabData.my_meaning || vocabData.english}
                      </div>
                      {(vocabData.example_jp || vocabData.example) && (
                        <div className="bg-surface-raised p-4 rounded-lg border-l-4 border-accent">
                          {vocabData.example_jp ? (
                            <>
                              <Furigana text={vocabData.example_jp} className="text-base text-fg mb-1" />
                              {vocabData.example_en && (
                                <div className="text-sm text-fg-muted italic">
                                  {vocabData.example_en}
                                </div>
                              )}
                            </>
                          ) : (
                            <Furigana text={vocabData.example} className="text-base text-fg" />
                          )}
                        </div>
                      )}
                      {vocabData.lesson && (
                        <div className="text-sm text-fg-muted mt-3">
                          Lesson {vocabData.lesson}
                          {vocabData.page && `, p.${vocabData.page}`}
                        </div>
                      )}
                    </>
                  );
                })()
              ) : (
                // Grammar Result
                <>
                  <div className="text-3xl font-medium text-fg mb-2">
                    {(result.data as GrammarCard).point}
                  </div>
                  <div className="text-lg text-fg mb-3">
                    {(result.data as GrammarCard).meaning}
                  </div>
                  <div className="bg-surface-raised p-3 rounded-lg mb-3">
                    <div className="text-sm font-medium text-fg-soft mb-1">Formation:</div>
                    <div className="text-base text-fg">
                      {(result.data as GrammarCard).formation}
                    </div>
                  </div>
                  {(result.data as GrammarCard).example_jp && (
                    <div className="bg-surface-raised p-4 rounded-lg border-l-4 border-accent mb-3">
                      <Furigana text={(result.data as GrammarCard).example_jp} className="text-base text-fg mb-1" />
                      {(result.data as GrammarCard).example_en && (
                        <div className="text-sm text-fg-muted italic">
                          {(result.data as GrammarCard).example_en}
                        </div>
                      )}
                    </div>
                  )}
                  {(result.data as GrammarCard).nuance && (
                    <div className="bg-warn/15 p-3 rounded-lg border-l-4 border-warn mb-3">
                      <div className="text-sm font-medium text-fg-soft mb-1">Nuance:</div>
                      <div className="text-sm text-fg">
                        {(result.data as GrammarCard).nuance}
                      </div>
                    </div>
                  )}
                  <div className="text-sm text-fg-muted">
                    Lesson {(result.data as GrammarCard).lesson}: {(result.data as GrammarCard).lesson_title}
                    {(result.data as GrammarCard).jlpt && ` • ${(result.data as GrammarCard).jlpt}`}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {searchQuery && searchResults.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <div className="text-xl text-fg-soft">No results found for "{searchQuery}"</div>
          </div>
        )}

        {/* Initial State */}
        {!searchQuery && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔎</div>
            <div className="text-xl text-fg-soft">Start typing to search</div>
          </div>
        )}
      </div>
    </div>
  );
}

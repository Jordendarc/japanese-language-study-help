'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { VocabCard, GrammarCard } from '../types';
import Furigana from '../components/Furigana';

type SearchResult = {
  type: 'vocab' | 'grammar';
  data: VocabCard | GrammarCard;
};

export default function SearchPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [allVocab, setAllVocab] = useState<VocabCard[]>([]);
  const [allGrammar, setAllGrammar] = useState<GrammarCard[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Load both CSVs
  useEffect(() => {
    Promise.all([
      fetch('/vocab.csv').then(r => r.text()),
      fetch('/grammar.csv').then(r => r.text())
    ]).then(([vocabText, grammarText]) => {
      Papa.parse<VocabCard>(vocabText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setAllVocab(results.data);
        },
      });

      Papa.parse<GrammarCard>(grammarText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setAllGrammar(results.data);
          setLoading(false);
        },
      });
    });
  }, []);

  // Search function
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    // Search vocabulary
    allVocab.forEach(card => {
      const searchableText = [
        card.vocab,
        card.reading,
        card.english,
        card.my_meaning,
        card.example_jp,
        card.example_en,
        card.example
      ].join(' ').toLowerCase();

      if (searchableText.includes(query)) {
        results.push({ type: 'vocab', data: card });
      }
    });

    // Search grammar
    allGrammar.forEach(card => {
      const searchableText = [
        card.point,
        card.meaning,
        card.formation,
        card.example_jp,
        card.example_en,
        card.nuance,
        card.context
      ].join(' ').toLowerCase();

      if (searchableText.includes(query)) {
        results.push({ type: 'grammar', data: card });
      }
    });

    setSearchResults(results);
  }, [searchQuery, allVocab, allGrammar]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
        <div className="text-2xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="text-indigo-600 hover:text-indigo-800 mb-4 flex items-center gap-2"
          >
            ← Back to Home
          </button>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Search</h1>
          <p className="text-gray-600">Search across all vocabulary and grammar</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search for vocabulary or grammar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-6 py-4 text-lg rounded-xl border-2 border-indigo-300 focus:border-indigo-500 focus:outline-none bg-white text-gray-800"
            autoFocus
          />
        </div>

        {/* Results Count */}
        {searchQuery && (
          <div className="mb-4 text-gray-600">
            Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Results */}
        <div className="space-y-4">
          {searchResults.map((result, index) => (
            <div key={index} className="bg-white rounded-xl shadow-md p-6">
              {/* Type Badge */}
              <div className="mb-3">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                  result.type === 'vocab'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {result.type === 'vocab' ? 'Vocabulary' : 'Grammar'}
                </span>
              </div>

              {result.type === 'vocab' ? (
                // Vocabulary Result
                <>
                  <div className="text-3xl font-bold text-gray-800 mb-2">
                    {(result.data as VocabCard).vocab}
                  </div>
                  <div className="text-xl text-indigo-600 mb-2">
                    {(result.data as VocabCard).reading}
                  </div>
                  <div className="text-lg text-gray-700 mb-3">
                    {(result.data as VocabCard).my_meaning || (result.data as VocabCard).english}
                  </div>
                  {((result.data as VocabCard).example_jp || (result.data as VocabCard).example) && (
                    <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-indigo-600">
                      {(result.data as VocabCard).example_jp ? (
                        <>
                          <Furigana text={(result.data as VocabCard).example_jp} className="text-base text-gray-700 mb-1" />
                          {(result.data as VocabCard).example_en && (
                            <div className="text-sm text-gray-500 italic">
                              {(result.data as VocabCard).example_en}
                            </div>
                          )}
                        </>
                      ) : (
                        <Furigana text={(result.data as VocabCard).example} className="text-base text-gray-700" />
                      )}
                    </div>
                  )}
                  {(result.data as VocabCard).lesson && (
                    <div className="text-sm text-gray-500 mt-3">
                      Lesson {(result.data as VocabCard).lesson}
                      {(result.data as VocabCard).page && `, p.${(result.data as VocabCard).page}`}
                    </div>
                  )}
                </>
              ) : (
                // Grammar Result
                <>
                  <div className="text-3xl font-bold text-gray-800 mb-2">
                    {(result.data as GrammarCard).point}
                  </div>
                  <div className="text-lg text-gray-700 mb-3">
                    {(result.data as GrammarCard).meaning}
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg mb-3">
                    <div className="text-sm font-semibold text-gray-600 mb-1">Formation:</div>
                    <div className="text-base text-gray-800">
                      {(result.data as GrammarCard).formation}
                    </div>
                  </div>
                  {(result.data as GrammarCard).example_jp && (
                    <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-600 mb-3">
                      <Furigana text={(result.data as GrammarCard).example_jp} className="text-base text-gray-700 mb-1" />
                      {(result.data as GrammarCard).example_en && (
                        <div className="text-sm text-gray-500 italic">
                          {(result.data as GrammarCard).example_en}
                        </div>
                      )}
                    </div>
                  )}
                  {(result.data as GrammarCard).nuance && (
                    <div className="bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400 mb-3">
                      <div className="text-sm font-semibold text-gray-600 mb-1">Nuance:</div>
                      <div className="text-sm text-gray-700">
                        {(result.data as GrammarCard).nuance}
                      </div>
                    </div>
                  )}
                  <div className="text-sm text-gray-500">
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
            <div className="text-xl text-gray-600">No results found for "{searchQuery}"</div>
          </div>
        )}

        {/* Initial State */}
        {!searchQuery && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔎</div>
            <div className="text-xl text-gray-600">Start typing to search</div>
          </div>
        )}
      </div>
    </div>
  );
}

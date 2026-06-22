'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Furigana from '../components/Furigana';

interface VocabEntry {
  word: string;
  reading: string;
  english: string;
  example_jp: string;
  example_en: string;
  my_meaning: string;
  lesson: number;
  page: number;
}

interface KanjiData {
  kanji: string;
  meanings: string[];
  yomikata: string[];
  vocab: VocabEntry[];
}

export default function KanjiPage() {
  const router = useRouter();
  const [kanjiData, setKanjiData] = useState<KanjiData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedKanji, setExpandedKanji] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/kanji/kanjiWithMeanings.json')
      .then(r => r.json())
      .then(data => {
        setKanjiData(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading kanji:', error);
        setLoading(false);
      });
  }, []);

  const toggleKanji = (kanji: string) => {
    const newExpanded = new Set(expandedKanji);
    if (newExpanded.has(kanji)) {
      newExpanded.delete(kanji);
    } else {
      newExpanded.add(kanji);
    }
    setExpandedKanji(newExpanded);
  };

  const filteredKanji = kanjiData.filter(k => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      k.kanji.includes(searchTerm) ||
      k.meanings.some(m => m.toLowerCase().includes(term)) ||
      k.vocab.some(v =>
        v.word.includes(searchTerm) ||
        v.reading.includes(searchTerm) ||
        v.english.toLowerCase().includes(term)
      )
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
        <div className="text-white text-2xl">Loading kanji...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="bg-white rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-8 mb-6 sm:mb-8">
          <button
            onClick={() => router.push('/')}
            className="mb-3 sm:mb-4 text-orange-600 hover:text-orange-700 transition-colors flex items-center gap-2 text-sm sm:text-base"
          >
            <span>←</span>
            <span>Back to Home</span>
          </button>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl sm:text-5xl font-bold text-orange-600 mb-2">
                漢字 Dictionary
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                {filteredKanji.length} kanji • {kanjiData.reduce((sum, k) => sum + k.vocab.length, 0)} vocabulary words
              </p>
            </div>
            <div className="text-4xl sm:text-6xl">📚</div>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search kanji, meanings, or vocabulary..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border-2 border-orange-200 rounded-lg focus:border-orange-500 focus:outline-none text-base sm:text-lg"
          />
        </header>

        {/* Kanji List */}
        <div className="space-y-4">
          {filteredKanji.map((kanjiEntry) => {
            const isExpanded = expandedKanji.has(kanjiEntry.kanji);

            return (
              <div
                key={kanjiEntry.kanji}
                className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden"
              >
                {/* Kanji Header */}
                <button
                  onClick={() => toggleKanji(kanjiEntry.kanji)}
                  className="w-full p-4 sm:p-6 flex items-center gap-4 sm:gap-6 hover:bg-orange-50 transition-colors"
                >
                  <div className="text-5xl sm:text-7xl font-bold text-orange-600 flex-shrink-0">
                    {kanjiEntry.kanji}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-xl sm:text-2xl font-semibold text-gray-800 mb-1 break-words">
                      {kanjiEntry.meanings.join(', ') || 'No meanings listed'}
                    </div>
                    {kanjiEntry.yomikata.length > 0 && (
                      <div className="text-sm sm:text-base text-gray-600 break-words">
                        読み方: {kanjiEntry.yomikata.join(', ')}
                      </div>
                    )}
                    <div className="text-xs sm:text-sm text-orange-600 mt-2">
                      {kanjiEntry.vocab.length} vocabulary word{kanjiEntry.vocab.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl text-orange-600 flex-shrink-0">
                    {isExpanded ? '▲' : '▼'}
                  </div>
                </button>

                {/* Vocabulary List */}
                {isExpanded && (
                  <div className="border-t border-gray-200 p-4 sm:p-6 bg-orange-50/30">
                    <div className="space-y-4">
                      {kanjiEntry.vocab.map((vocab, idx) => (
                        <div
                          key={idx}
                          className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border-l-4 border-orange-500"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 break-words">
                                {vocab.word}
                              </div>
                              <div className="text-base sm:text-lg text-gray-600 mb-1">
                                {vocab.reading}
                              </div>
                              <div className="text-sm sm:text-base text-orange-700 font-semibold">
                                {vocab.english}
                              </div>
                              {vocab.my_meaning && vocab.my_meaning !== vocab.english && (
                                <div className="text-xs sm:text-sm text-gray-600 mt-1 italic">
                                  {vocab.my_meaning}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 text-xs sm:text-sm text-gray-500 sm:flex-shrink-0">
                              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded font-medium">
                                L{vocab.lesson}
                              </span>
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded font-medium">
                                P{vocab.page}
                              </span>
                            </div>
                          </div>

                          {/* Examples */}
                          {vocab.example_jp && (
                            <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                              <div className="text-sm sm:text-base text-gray-800 leading-relaxed break-words overflow-wrap-anywhere">
                                <Furigana text={vocab.example_jp} />
                              </div>
                              <div className="text-xs sm:text-sm text-gray-600 italic break-words">
                                {vocab.example_en}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredKanji.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No kanji found</h2>
            <p className="text-gray-600">
              Try searching for a different term
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

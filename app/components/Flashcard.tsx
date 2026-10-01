'use client';

import { VocabCard } from '../types';
import { useState, useEffect } from 'react';
import Furigana from './Furigana';
import { getTextbookColor, getTextbookShortName } from '../utils/textbookColors';

interface FlashcardProps {
  card: VocabCard;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  triggerGreenAnimation?: boolean;
  triggerRedAnimation?: boolean;
}

interface KanjiMeaning {
  kanji: string;
  meanings: string[];
}

export default function Flashcard({ card, onSwipeLeft, onSwipeRight, triggerGreenAnimation, triggerRedAnimation }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [animationState, setAnimationState] = useState<'none' | 'green' | 'red'>('none');
  const [showKanjiBreakdown, setShowKanjiBreakdown] = useState(false);
  const [kanjiBreakdown, setKanjiBreakdown] = useState<KanjiMeaning[]>([]);
  const [kanjiDataLoaded, setKanjiDataLoaded] = useState(false);

  const meaning = card.my_meaning || card.english;
  const lessonText = card.lesson ? `Lesson ${card.lesson}${card.page ? ', p.' + card.page : ''}` : '';

  // Get textbook info with color
  const getTextbookInfo = () => {
    if (!card.textbook) return null;

    const colors = getTextbookColor(card.textbook);

    return {
      name: getTextbookShortName(card.textbook),
      color: colors.backgroundColor,
      textColor: colors.textColor
    };
  };

  const textbookInfo = getTextbookInfo();

  // Function to extract kanji from text
  const extractKanji = (text: string): string[] => {
    if (!text) return [];
    const kanjiRegex = /[\u4E00-\u9FAF]/g;
    const matches = text.match(kanjiRegex);
    return matches ? [...new Set(matches)] : [];
  };

  // Load kanji meanings when breakdown is shown
  const loadKanjiBreakdown = async () => {
    if (kanjiDataLoaded) {
      setShowKanjiBreakdown(!showKanjiBreakdown);
      return;
    }

    const kanji = extractKanji(card.vocab);
    if (kanji.length === 0) {
      setShowKanjiBreakdown(!showKanjiBreakdown);
      return;
    }

    try {
      // First, try to use kanji data from the card (from database)
      if (card.kanji_data && card.kanji_data.length > 0) {
        const breakdown: KanjiMeaning[] = card.kanji_data.map(k => ({
          kanji: k.kanji,
          meanings: k.meanings
        }));

        setKanjiBreakdown(breakdown);
        setKanjiDataLoaded(true);
        setShowKanjiBreakdown(true);
        return;
      }

      // Fallback: Load from static JSON file (for backwards compatibility)
      const response = await fetch('/kanji/kanjiWithMeanings.json');
      const allKanjiData = await response.json();

      const breakdown: KanjiMeaning[] = kanji.map(k => {
        const found = (allKanjiData as KanjiMeaning[]).find(item => item.kanji === k);
        return {
          kanji: k,
          meanings: found?.meanings || ['(meaning not found)']
        };
      });

      setKanjiBreakdown(breakdown);
      setKanjiDataLoaded(true);
      setShowKanjiBreakdown(true);
    } catch (error) {
      console.error('Error loading kanji data:', error);
    }
  };

  // Reset flip state when card changes
  useEffect(() => {
    setIsFlipped(false);
    setAnimationState('none');
    setShowKanjiBreakdown(false);
    setKanjiDataLoaded(false);
    setKanjiBreakdown([]);
  }, [card]);

  // Handle animation triggers
  useEffect(() => {
    if (triggerGreenAnimation) {
      setAnimationState('green');
    } else if (triggerRedAnimation) {
      setAnimationState('red');
    }
  }, [triggerGreenAnimation, triggerRedAnimation]);

  const handleClick = () => {
    // Only flip if not selecting text
    const selection = window.getSelection();
    const hasSelection = selection && selection.toString().length > 0;

    if (!hasSelection) {
      setIsFlipped(prev => !prev);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto relative">
      <div
        className="relative w-full h-96 cursor-pointer"
        style={{
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: 'transform 0.5s',
          transformStyle: 'preserve-3d'
        }}
        onClick={handleClick}
      >
        {/* Front of card */}
        <div className="absolute w-full h-full backface-hidden bg-surface border border-line rounded-2xl p-8 flex flex-col items-center justify-center" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
          {/* Kanji Breakdown Button */}
          {extractKanji(card.vocab).length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                loadKanjiBreakdown();
              }}
              className="absolute top-4 right-4 px-3 py-1.5 bg-surface-raised hover:bg-line text-accent rounded-lg text-xs sm:text-sm font-medium transition-colors z-10"
            >
              漢字 {showKanjiBreakdown ? '▲' : '▼'}
            </button>
          )}

          {/* Kanji Breakdown Display */}
          {showKanjiBreakdown && kanjiBreakdown.length > 0 && (
            <div
              className="absolute top-14 right-4 bg-surface-raised border border-line rounded-xl p-3 z-10 max-w-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-xs sm:text-sm font-medium text-fg-muted mb-2">Kanji Breakdown:</div>
              <div className="space-y-2">
                {kanjiBreakdown.map((k, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="text-2xl text-accent flex-shrink-0">{k.kanji}</div>
                    <div className="text-xs sm:text-sm text-fg-soft pt-1">
                      {k.meanings.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 flex items-center justify-center">
            <div className="text-5xl sm:text-7xl font-light text-fg select-text cursor-text">
              {card.vocab}
            </div>
          </div>
          {lessonText && (
            <div className="text-sm text-fg-muted">
              {lessonText}
            </div>
          )}
        </div>

        {/* Back of card */}
        <div className="absolute w-full h-full backface-hidden bg-surface border border-line rounded-2xl rotate-y-180 flex flex-col" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
          {/* Textbook badge */}
          {textbookInfo && (
            <div
              className="absolute top-4 right-4 px-3 py-1 rounded-lg text-xs sm:text-sm font-medium z-10"
              style={{ backgroundColor: textbookInfo.color, color: textbookInfo.textColor }}
            >
              {textbookInfo.name}
            </div>
          )}

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 pt-8 flex flex-col items-center">
            <div className="text-xl sm:text-2xl md:text-3xl text-accent mb-3 sm:mb-4">
              {card.reading}
            </div>

            {/* Japanese meaning (if available) */}
            {card.jp_meaning && (
              <Furigana text={card.jp_meaning} className="text-base sm:text-lg md:text-xl text-fg-soft mb-2 sm:mb-3 text-center px-2 leading-relaxed" />
            )}

            {/* English meaning */}
            <div className="text-xl sm:text-3xl md:text-4xl font-medium text-fg mb-3 sm:mb-4 text-center px-2">
              {meaning}
            </div>

            {(card.example_jp && card.example_en) ? (
              <div className="mt-6 p-4 bg-surface-raised rounded-xl w-full max-w-lg">
                <Furigana text={card.example_jp} className="text-base sm:text-lg text-fg mb-2 break-words" />
                <div className="text-sm sm:text-base text-fg-muted break-words">
                  {card.example_en}
                </div>
              </div>
            ) : card.example ? (
              <div className="mt-6 p-4 bg-surface-raised rounded-xl w-full max-w-lg">
                <Furigana text={card.example} className="text-base sm:text-lg text-fg break-words" />
              </div>
            ) : null}
          </div>

          {/* Lesson text at bottom */}
          {lessonText && (
            <div className="text-sm text-fg-muted p-4 text-center border-t border-line">
              {lessonText}
            </div>
          )}
        </div>
      </div>

      {/* Color Flash Overlay */}
      {animationState !== 'none' && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            backgroundColor: animationState === 'green' ? 'var(--success)' : 'var(--danger)',
            animation: 'flash 0.4s ease-out forwards',
            zIndex: 10
          }}
        />
      )}

      <style jsx>{`
        @keyframes flash {
          0% {
            opacity: 0;
          }
          50% {
            opacity: 0.35;
          }
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

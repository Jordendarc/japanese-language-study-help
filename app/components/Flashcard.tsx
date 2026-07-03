'use client';

import { VocabCard } from '../types';
import { useState, useRef, useEffect } from 'react';
import Furigana from './Furigana';

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
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [animationState, setAnimationState] = useState<'none' | 'green' | 'red'>('none');
  const [showKanjiBreakdown, setShowKanjiBreakdown] = useState(false);
  const [kanjiBreakdown, setKanjiBreakdown] = useState<KanjiMeaning[]>([]);
  const [kanjiDataLoaded, setKanjiDataLoaded] = useState(false);
  const startXRef = useRef(0);
  const wasDraggingRef = useRef(false);

  const meaning = card.my_meaning || card.english;
  const lessonText = card.lesson ? `Lesson ${card.lesson}${card.page ? ', p.' + card.page : ''}` : '';

  // Get textbook info with color
  const getTextbookInfo = () => {
    if (!card.textbook) return null;

    const isShochukyu = card.textbook.includes('初中級');
    return {
      name: isShochukyu ? '初中級' : '中級',
      color: isShochukyu ? '#F9DD00' : '#01AAC9',
      textColor: isShochukyu ? '#000000' : '#ffffff'
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
      const response = await fetch('/kanji/kanjiWithMeanings.json');
      const allKanjiData = await response.json();

      const breakdown: KanjiMeaning[] = kanji.map(k => {
        const found = allKanjiData.find((item: any) => item.kanji === k);
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
    setSwipeOffset(0);
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

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    setIsDragging(true);
    wasDraggingRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startXRef.current;
    setSwipeOffset(diff);
    if (Math.abs(diff) > 5) {
      wasDraggingRef.current = true;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (Math.abs(swipeOffset) > 100) {
      if (swipeOffset > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (swipeOffset < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
    setSwipeOffset(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    startXRef.current = e.clientX;
    setIsDragging(true);
    wasDraggingRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const diff = e.clientX - startXRef.current;
    setSwipeOffset(diff);
    if (Math.abs(diff) > 5) {
      wasDraggingRef.current = true;
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (Math.abs(swipeOffset) > 100) {
      if (swipeOffset > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (swipeOffset < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
    setSwipeOffset(0);
    // Reset the dragging flag after a small delay to allow click to check it
    setTimeout(() => {
      wasDraggingRef.current = false;
    }, 10);
  };

  const handleClick = () => {
    // Only flip if not dragging
    if (!wasDraggingRef.current) {
      setIsFlipped(prev => !prev);
    }
  };

  const rotation = swipeOffset * 0.05;
  const opacity = 1 - Math.abs(swipeOffset) / 300;

  return (
    <div className="w-full max-w-2xl mx-auto relative">
      <div
        className="relative w-full h-96 cursor-pointer"
        style={{
          transform: `translateX(${swipeOffset}px) rotate(${rotation}deg) ${isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'}`,
          opacity: opacity,
          transition: isDragging ? 'none' : 'transform 0.5s, opacity 0.3s',
          transformStyle: 'preserve-3d'
        }}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Front of card */}
        <div className="absolute w-full h-full backface-hidden bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center justify-center" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
          {/* Kanji Breakdown Button */}
          {extractKanji(card.vocab).length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                loadKanjiBreakdown();
              }}
              className="absolute top-4 right-4 px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-xs sm:text-sm font-medium transition-colors z-10"
            >
              漢字 {showKanjiBreakdown ? '▲' : '▼'}
            </button>
          )}

          {/* Kanji Breakdown Display */}
          {showKanjiBreakdown && kanjiBreakdown.length > 0 && (
            <div
              className="absolute top-14 right-4 bg-indigo-50 border-2 border-indigo-200 rounded-lg p-3 shadow-lg z-10 max-w-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-xs sm:text-sm font-semibold text-indigo-700 mb-2">Kanji Breakdown:</div>
              <div className="space-y-2">
                {kanjiBreakdown.map((k, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="text-2xl font-bold text-indigo-600 flex-shrink-0">{k.kanji}</div>
                    <div className="text-xs sm:text-sm text-gray-700 pt-1">
                      {k.meanings.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 flex items-center justify-center">
            <div className="text-4xl sm:text-6xl font-bold text-gray-800">
              {card.vocab}
            </div>
          </div>
          {lessonText && (
            <div className="text-sm text-gray-500">
              {lessonText}
            </div>
          )}
        </div>

        {/* Back of card */}
        <div className="absolute w-full h-full backface-hidden bg-gray-50 rounded-2xl shadow-2xl p-8 flex flex-col items-center justify-center rotate-y-180" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
          {/* Textbook badge */}
          {textbookInfo && (
            <div
              className="absolute top-4 right-4 px-3 py-1 rounded-lg text-xs sm:text-sm font-bold"
              style={{ backgroundColor: textbookInfo.color, color: textbookInfo.textColor }}
            >
              {textbookInfo.name}
            </div>
          )}

          <div className="text-2xl sm:text-3xl text-indigo-600 mb-4">
            {card.reading}
          </div>
          <div className="text-2xl sm:text-4xl font-semibold text-gray-800 mb-4 text-center">
            {meaning}
          </div>

          {(card.example_jp && card.example_en) ? (
            <div className="mt-6 p-4 bg-white rounded-lg border-l-4 border-indigo-600 w-full max-w-lg">
              <Furigana text={card.example_jp} className="text-base sm:text-lg text-gray-700 mb-2" />
              <div className="text-sm sm:text-base text-gray-500 italic">
                {card.example_en}
              </div>
            </div>
          ) : card.example ? (
            <div className="mt-6 p-4 bg-white rounded-lg border-l-4 border-indigo-600 w-full max-w-lg">
              <Furigana text={card.example} className="text-base sm:text-lg text-gray-700" />
            </div>
          ) : null}

          {lessonText && (
            <div className="text-sm text-gray-500 mt-auto">
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
            backgroundColor: animationState === 'green' ? '#22c55e' : '#ef4444',
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
            opacity: 0.8;
          }
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

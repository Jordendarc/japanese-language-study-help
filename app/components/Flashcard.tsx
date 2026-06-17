'use client';

import { VocabCard } from '../types';
import { useState, useRef, useEffect } from 'react';
import Furigana from './Furigana';

interface FlashcardProps {
  card: VocabCard;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export default function Flashcard({ card, onSwipeLeft, onSwipeRight }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const wasDraggingRef = useRef(false);

  const meaning = card.my_meaning || card.english;
  const lessonText = card.lesson ? `Lesson ${card.lesson}${card.page ? ', p.' + card.page : ''}` : '';

  // Reset flip state when card changes
  useEffect(() => {
    setIsFlipped(false);
    setSwipeOffset(0);
  }, [card]);

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
    <div className="w-full max-w-2xl mx-auto">
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
          <div className="text-4xl sm:text-6xl font-bold text-gray-800 mb-4">
            {card.vocab}
          </div>
          {lessonText && (
            <div className="text-sm text-gray-500 mt-auto">
              {lessonText}
            </div>
          )}
        </div>

        {/* Back of card */}
        <div className="absolute w-full h-full backface-hidden bg-gray-50 rounded-2xl shadow-2xl p-8 flex flex-col items-center justify-center rotate-y-180" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
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
    </div>
  );
}

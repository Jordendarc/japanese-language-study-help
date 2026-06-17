'use client';

import { GrammarCard } from '../types';
import { useState, useRef, useEffect } from 'react';
import Furigana from './Furigana';

interface GrammarCardProps {
  card: GrammarCard;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export default function GrammarCardComponent({ card, onSwipeLeft, onSwipeRight }: GrammarCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const wasDraggingRef = useRef(false);

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
        className="relative w-full min-h-[450px] cursor-pointer"
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
          <div className="text-3xl sm:text-5xl font-bold text-gray-800 mb-6 text-center">
            {card.point}
          </div>
          {card.jlpt && (
            <div className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full font-semibold mb-4">
              {card.jlpt}
            </div>
          )}
          <div className="text-sm text-gray-500 mt-auto">
            Lesson {card.lesson}: {card.lesson_title}
          </div>
        </div>

        {/* Back of card */}
        <div className="absolute w-full h-full backface-hidden bg-gray-50 rounded-2xl shadow-2xl p-6 flex flex-col rotate-y-180 overflow-y-auto" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-semibold text-indigo-600 uppercase mb-1">Meaning</div>
              <div className="text-2xl font-semibold text-gray-800">
                {card.meaning}
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-indigo-600 uppercase mb-1">Formation</div>
              <div className="text-lg text-gray-700 bg-white p-3 rounded-lg border-l-4 border-indigo-600">
                {card.formation}
              </div>
            </div>

            {card.example_jp && card.example_en && (
              <div>
                <div className="text-sm font-semibold text-indigo-600 uppercase mb-1">Example</div>
                <div className="bg-white p-4 rounded-lg border-l-4 border-green-500">
                  <Furigana text={card.example_jp} className="text-lg text-gray-800 mb-2" />
                  <div className="text-base text-gray-600 italic">
                    {card.example_en}
                  </div>
                </div>
              </div>
            )}

            {card.nuance && (
              <div>
                <div className="text-sm font-semibold text-indigo-600 uppercase mb-1">Nuance</div>
                <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400">
                  {card.nuance}
                </div>
              </div>
            )}

            {card.context && (
              <div className="text-xs text-gray-500 mt-2">
                Context: {card.context}
              </div>
            )}
          </div>

          <div className="text-sm text-gray-500 mt-auto pt-4">
            Lesson {card.lesson}: {card.lesson_title}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import Link from 'next/link';

interface QuizQuestion {
  id: string;
  section: string;
  sentence_jp: string;
  sentence_en: string;
  answer: string;
  reading: string;
  choices: string;
  why_correct: string;
  why_incorrect: string;
}

export default function N3QuizPage() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [isComplete, setIsComplete] = useState(false);
  const [missedQuestions, setMissedQuestions] = useState<number[]>([]);
  const [showEnglish, setShowEnglish] = useState(false);

  useEffect(() => {
    Papa.parse('/n3_quiz.csv', {
      download: true,
      header: true,
      complete: (results) => {
        const data = results.data as QuizQuestion[];
        const filtered = data.filter(q => q.id && q.sentence_jp);
        setQuestions(filtered);
      }
    });
  }, []);

  const currentQuestion = questions[currentIndex];
  const choices = currentQuestion?.choices ? currentQuestion.choices.split(/[,、]/).map(c => c.trim()).filter(c => c) : [];

  const handleAnswerSelect = (choice: string) => {
    if (showExplanation) return; // Already answered

    setSelectedAnswer(choice);
    setShowExplanation(true);

    const isCorrect = choice === currentQuestion.answer;

    if (isCorrect) {
      setCorrectCount(correctCount + 1);
    } else {
      setMissedQuestions([...missedQuestions, currentIndex]);
    }

    setAnsweredQuestions(new Set([...answeredQuestions, currentIndex]));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setShowEnglish(false); // Reset English visibility for next question
    } else {
      setIsComplete(true);
    }
  };

  const handleReviewMissed = () => {
    if (missedQuestions.length > 0) {
      setCurrentIndex(missedQuestions[0]);
      setMissedQuestions(missedQuestions.slice(1));
      setSelectedAnswer(null);
      setShowExplanation(false);
      setShowEnglish(false);
      setIsComplete(false);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setShowEnglish(false);
    setCorrectCount(0);
    setAnsweredQuestions(new Set());
    setIsComplete(false);
    setMissedQuestions([]);
  };

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 via-pink-500 to-purple-600 flex items-center justify-center">
        <div className="text-white text-2xl">Loading quiz...</div>
      </div>
    );
  }

  if (isComplete) {
    const percentage = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 via-pink-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
          <h1 className="text-4xl font-bold text-gray-800 mb-6 text-center">Quiz Complete!</h1>

          <div className="text-center mb-8">
            <div className="text-6xl font-bold text-purple-600 mb-2">{percentage}%</div>
            <div className="text-xl text-gray-600">
              {correctCount} / {questions.length} correct
            </div>
          </div>

          {missedQuestions.length > 0 && (
            <div className="mb-6 text-center">
              <p className="text-gray-700 mb-4">
                You missed {missedQuestions.length} question{missedQuestions.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={handleReviewMissed}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-bold transition-colors"
              >
                Review Missed Questions
              </button>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={handleRestart}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-bold transition-colors"
            >
              Restart Quiz
            </button>

            <Link
              href="/"
              className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-bold transition-colors text-center"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isCorrect = selectedAnswer === currentQuestion.answer;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 via-pink-500 to-purple-600 p-4">
      <div className="max-w-4xl mx-auto pt-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-block bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-4 py-2 rounded-lg transition-colors mb-4"
          >
            ← Back to Home
          </Link>

          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            JLPT N3 Practice Quiz
          </h1>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 flex justify-between items-center text-white">
            <div>
              <span className="text-sm opacity-80">Question</span>
              <div className="text-xl font-bold">{currentIndex + 1} / {questions.length}</div>
            </div>
            <div>
              <span className="text-sm opacity-80">Section</span>
              <div className="text-xl font-bold">{currentQuestion.section}</div>
            </div>
            <div>
              <span className="text-sm opacity-80">Score</span>
              <div className="text-xl font-bold">{correctCount} / {answeredQuestions.size}</div>
            </div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 mb-6">
          {/* Japanese Sentence */}
          <div className="mb-6">
            <div className="text-3xl sm:text-4xl font-bold text-gray-800 mb-3 leading-relaxed">
              {currentQuestion.section === '語彙' ? (
                // For vocabulary questions, replace () with a visible blank
                currentQuestion.sentence_jp.split(/(\([^)]*\)|（[^）]*）)/).map((part, idx) => {
                  // Check if this part is parentheses (even if empty)
                  if (part.match(/^[()（）]/) || part.match(/\([^)]*\)/) || part.match(/（[^）]*）/)) {
                    // Extract content inside parentheses (if any)
                    const content = part.replace(/[()（）]/g, '');
                    return (
                      <span
                        key={idx}
                        className="inline-block min-w-[3rem] text-center border-b-4 border-purple-500 mx-1 px-2"
                      >
                        {content || '\u00A0\u00A0\u00A0'}
                      </span>
                    );
                  }
                  return <span key={idx}>{part}</span>;
                })
              ) : (
                currentQuestion.sentence_jp
              )}
            </div>

            {/* English Translation Toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowEnglish(!showEnglish)}
                className="text-sm text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-1"
              >
                {showEnglish ? '🙈 Hide' : '👁️ Show'} English
              </button>
              {showEnglish && (
                <div className="text-lg text-gray-600 flex-1">
                  {currentQuestion.sentence_en}
                </div>
              )}
            </div>
          </div>

          {/* Answer Reading (if exists) */}
          {currentQuestion.reading && showExplanation && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-gray-600">Reading: </span>
              <span className="text-lg font-bold text-blue-700">{currentQuestion.reading}</span>
            </div>
          )}

          {/* Choices */}
          <div className="space-y-3 mb-6">
            {choices.map((choice, idx) => {
              const isSelected = selectedAnswer === choice;
              const isCorrectChoice = choice === currentQuestion.answer;

              let buttonClass = 'w-full p-4 rounded-xl text-left font-bold text-lg transition-all border-2 ';

              if (showExplanation) {
                if (isCorrectChoice) {
                  buttonClass += 'bg-green-100 border-green-500 text-green-800';
                } else if (isSelected && !isCorrectChoice) {
                  buttonClass += 'bg-red-100 border-red-500 text-red-800';
                } else {
                  buttonClass += 'bg-gray-100 border-gray-300 text-gray-600';
                }
              } else {
                buttonClass += 'bg-white border-gray-300 text-gray-800 hover:bg-purple-50 hover:border-purple-400';
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswerSelect(choice)}
                  disabled={showExplanation}
                  className={buttonClass}
                >
                  {idx + 1}. {choice}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {showExplanation && (
            <div className="space-y-4 mb-6">
              {isCorrect ? (
                <div className="p-4 bg-green-50 rounded-xl border-2 border-green-500">
                  <div className="text-green-800 font-bold text-xl mb-2">✓ Correct!</div>
                  {currentQuestion.why_correct && (
                    <div className="text-green-700">{currentQuestion.why_correct}</div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-red-50 rounded-xl border-2 border-red-500">
                  <div className="text-red-800 font-bold text-xl mb-2">✗ Incorrect</div>
                  {currentQuestion.why_incorrect && (
                    <div className="text-red-700 mb-3">{currentQuestion.why_incorrect}</div>
                  )}
                  {currentQuestion.why_correct && (
                    <div className="text-gray-700">
                      <span className="font-bold">Correct answer: </span>
                      {currentQuestion.why_correct}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Next Button */}
          {showExplanation && (
            <button
              onClick={handleNext}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-4 rounded-xl font-bold text-xl transition-all shadow-lg"
            >
              {currentIndex < questions.length - 1 ? 'Next Question →' : 'Finish Quiz'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { MatomeTest } from '../../types';
import { WordBankQuestion } from '../components/WordBankQuestion';
import { MultipleChoiceQuestion } from '../components/MultipleChoiceQuestion';
import { ReadingQuestion } from '../components/ReadingQuestion';
import { WordOrderQuestion } from '../components/WordOrderQuestion';
import Furigana from '../../components/Furigana';

interface FlatQuestion {
  problemId: number;
  lessonNumber: number;
  problemType: 'word_bank' | 'multiple_choice' | 'reading' | 'word_order';
  text: string;
  answer: string;
  options: string[];
  passage?: string;
  correctOrder?: string[];
}

function MatomeTestMixedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lessonsParam = searchParams.get('lessons');

  const [loading, setLoading] = useState(true);
  const [flatQuestions, setFlatQuestions] = useState<FlatQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Map<number, string>>(new Map());
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [selectedLessons, setSelectedLessons] = useState<number[]>([]);

  useEffect(() => {
    if (!lessonsParam) {
      router.push('/matome/mix');
      return;
    }

    const lessons = lessonsParam.split(',').map(Number);
    setSelectedLessons(lessons);

    fetch('/matome/glmjsonwithhiragana.json')
      .then(r => r.json())
      .then(data => {
        const tests = data.tests as MatomeTest[];
        const selectedTests = tests.filter(t => lessons.includes(t.lesson));

        // Flatten problems into individual questions
        const questions: FlatQuestion[] = [];

        selectedTests.forEach(test => {
          test.problems.forEach(problem => {
            if (problem.type === 'word_bank' && problem.sentences) {
              problem.sentences.forEach(sentence => {
                questions.push({
                  problemId: problem.id,
                  lessonNumber: test.lesson,
                  problemType: 'word_bank',
                  text: sentence.text,
                  answer: sentence.answer,
                  options: problem.wordBank || [],
                });
              });
            } else if (problem.type === 'multiple_choice' && problem.sentences) {
              problem.sentences.forEach(sentence => {
                questions.push({
                  problemId: problem.id,
                  lessonNumber: test.lesson,
                  problemType: 'multiple_choice',
                  text: sentence.text,
                  answer: sentence.answer,
                  options: sentence.choices || problem.choices || [],
                });
              });
            } else if (problem.type === 'word_order' && problem.sentences) {
              problem.sentences.forEach(sentence => {
                questions.push({
                  problemId: problem.id,
                  lessonNumber: test.lesson,
                  problemType: 'word_order',
                  text: sentence.text,
                  answer: sentence.answer,
                  options: sentence.choices || [],
                  correctOrder: sentence.correctOrder,
                });
              });
            } else if (problem.type === 'reading' && problem.statements) {
              problem.statements.forEach(statement => {
                questions.push({
                  problemId: problem.id,
                  lessonNumber: test.lesson,
                  problemType: 'reading',
                  text: statement.text,
                  answer: String(statement.isTrue),
                  options: [],
                  passage: problem.passage,
                });
              });
            }
          });
        });

        // Shuffle questions
        const shuffled = questions.sort(() => Math.random() - 0.5);
        setFlatQuestions(shuffled);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading test:', error);
        setLoading(false);
      });
  }, [lessonsParam, router]);

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    const newAnswers = new Map(userAnswers);
    newAnswers.set(questionIndex, answer);
    setUserAnswers(newAnswers);
  };

  const handleSubmit = () => {
    let correctCount = 0;
    flatQuestions.forEach((q, idx) => {
      const userAnswer = userAnswers.get(idx) || '';
      if (userAnswer === q.answer) {
        correctCount++;
      }
    });
    setScore(correctCount);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRetry = () => {
    setUserAnswers(new Map());
    setSubmitted(false);
    setScore(0);
    // Re-shuffle
    const shuffled = [...flatQuestions].sort(() => Math.random() - 0.5);
    setFlatQuestions(shuffled);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
        <div className="text-white text-2xl">Loading mixed test...</div>
      </div>
    );
  }

  if (flatQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-2xl mb-4">No questions found</div>
          <button
            onClick={() => router.push('/matome/mix')}
            className="px-6 py-3 bg-white text-purple-600 font-bold rounded-lg hover:bg-purple-50 transition-colors"
          >
            Back to Mix Lessons
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-600 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 mb-8">
          <button
            onClick={() => router.push('/matome/mix')}
            className="mb-4 text-purple-600 hover:text-purple-700 transition-colors flex items-center gap-2"
          >
            <span>←</span>
            <span>Back to Mix Lessons</span>
          </button>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-purple-600 mb-2">
                Mixed Test
              </h1>
              <div className="text-gray-600">
                Lessons: {selectedLessons.join(', ')}
              </div>
            </div>
            <div className="text-5xl">🎲</div>
          </div>

          {submitted ? (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
              <div className="text-center mb-4">
                <div className="text-5xl font-bold text-purple-600 mb-2">
                  {score} / {flatQuestions.length}
                </div>
                <div className="text-xl text-gray-700">
                  {Math.round((score / flatQuestions.length) * 100)}% Correct
                </div>
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleRetry}
                  className="px-6 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Retry (Reshuffle)
                </button>
                <button
                  onClick={() => router.push('/matome/mix')}
                  className="px-6 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Change Lessons
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-gray-600">
              <div>
                <span className="font-semibold">{flatQuestions.length}</span> questions (shuffled)
              </div>
              <div>
                <span className="font-semibold">{userAnswers.size}</span> / {flatQuestions.length} answered
              </div>
            </div>
          )}
        </header>

        {/* Questions */}
        <div className="space-y-6 mb-8">
          {flatQuestions.map((question, questionIndex) => {
            const userAnswer = userAnswers.get(questionIndex) || '';
            const questionNumber = questionIndex + 1;

            return (
              <div key={questionIndex} className="bg-white rounded-2xl shadow-lg p-6">
                <div className="text-xs text-purple-600 font-semibold mb-3">
                  Question {questionNumber} • Lesson {question.lessonNumber} • {
                    question.problemType === 'word_bank' ? 'Word Bank' :
                    question.problemType === 'multiple_choice' ? 'Multiple Choice' :
                    question.problemType === 'word_order' ? 'Word Order' :
                    'Reading Comprehension'
                  }
                </div>

                {question.passage && (
                  <div className="mb-4 p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                    <div className="text-sm text-purple-700 font-semibold mb-2">Reading Passage:</div>
                    <div className="text-base leading-relaxed text-gray-900 whitespace-pre-wrap">
                      <Furigana text={question.passage} />
                    </div>
                  </div>
                )}

                {question.problemType === 'word_bank' && (
                  <WordBankQuestion
                    question={{
                      sentence_jp: question.text,
                      options: question.options,
                      answer: question.answer,
                    }}
                    questionNumber={questionNumber}
                    selectedAnswer={userAnswer}
                    onAnswerChange={(answer) => handleAnswerChange(questionIndex, answer)}
                    showCorrect={submitted}
                  />
                )}
                {question.problemType === 'multiple_choice' && (
                  <MultipleChoiceQuestion
                    question={{
                      sentence_jp: question.text,
                      options: question.options,
                      answer: question.answer,
                    }}
                    questionNumber={questionNumber}
                    selectedAnswer={userAnswer}
                    onAnswerChange={(answer) => handleAnswerChange(questionIndex, answer)}
                    showCorrect={submitted}
                  />
                )}
                {question.problemType === 'word_order' && (
                  <WordOrderQuestion
                    question={{
                      sentence_jp: question.text,
                      options: question.options,
                      answer: question.answer,
                      correctOrder: question.correctOrder,
                    }}
                    questionNumber={questionNumber}
                    selectedAnswer={userAnswer}
                    onAnswerChange={(answer) => handleAnswerChange(questionIndex, answer)}
                    showCorrect={submitted}
                  />
                )}
                {question.problemType === 'reading' && (
                  <ReadingQuestion
                    question={{
                      sentence_jp: question.text,
                      answer: question.answer,
                    }}
                    questionNumber={questionNumber}
                    selectedAnswer={userAnswer}
                    onAnswerChange={(answer) => handleAnswerChange(questionIndex, answer)}
                    showCorrect={submitted}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Submit Button */}
        {!submitted && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 sticky bottom-4">
            <button
              onClick={handleSubmit}
              disabled={userAnswers.size === 0}
              className={`w-full py-4 rounded-xl font-bold text-xl transition-all ${
                userAnswers.size === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : userAnswers.size === flatQuestions.length
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 hover:scale-[1.02] shadow-lg'
                  : 'bg-yellow-500 text-white hover:bg-yellow-600 hover:scale-[1.02] shadow-lg'
              }`}
            >
              {userAnswers.size === 0
                ? 'Answer at least one question to submit'
                : userAnswers.size === flatQuestions.length
                ? 'Submit Test'
                : `Submit (${userAnswers.size}/${flatQuestions.length} answered)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MatomeTestMixedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
        <div className="text-white text-2xl">Loading mixed test...</div>
      </div>
    }>
      <MatomeTestMixedContent />
    </Suspense>
  );
}

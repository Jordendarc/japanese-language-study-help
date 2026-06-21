'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MatomeTest, MatomeProblem } from '../../types';
import { WordBankQuestion } from '../components/WordBankQuestion';
import { MultipleChoiceQuestion } from '../components/MultipleChoiceQuestion';
import { ReadingQuestion } from '../components/ReadingQuestion';
import { WordOrderQuestion } from '../components/WordOrderQuestion';

interface FlatQuestion {
  problemId: number;
  problemType: 'word_bank' | 'multiple_choice' | 'reading' | 'word_order';
  sentenceIndex?: number;
  text: string;
  answer: string;
  options: string[];
  passage?: string;
  correctOrder?: string[];
}

export default function MatomeTestPage() {
  const router = useRouter();
  const params = useParams();
  const lesson = Number(params.lesson);

  const [loading, setLoading] = useState(true);
  const [flatQuestions, setFlatQuestions] = useState<FlatQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Map<number, string>>(new Map());
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    fetch('/matome/glmjson.json')
      .then(r => r.json())
      .then(data => {
        const tests = data.tests as MatomeTest[];
        const test = tests.find(t => t.lesson === lesson);

        if (!test) {
          setLoading(false);
          return;
        }

        // Flatten problems into individual questions
        const questions: FlatQuestion[] = [];

        test.problems.forEach(problem => {
          if (problem.type === 'word_bank' && problem.sentences) {
            problem.sentences.forEach((sentence, idx) => {
              questions.push({
                problemId: problem.id,
                problemType: 'word_bank',
                sentenceIndex: idx,
                text: sentence.text,
                answer: sentence.answer,
                options: problem.wordBank || [],
              });
            });
          } else if (problem.type === 'multiple_choice' && problem.sentences) {
            problem.sentences.forEach((sentence, idx) => {
              questions.push({
                problemId: problem.id,
                problemType: 'multiple_choice',
                sentenceIndex: idx,
                text: sentence.text,
                answer: sentence.answer,
                options: sentence.choices || problem.choices || [],
              });
            });
          } else if (problem.type === 'word_order' && problem.sentences) {
            problem.sentences.forEach((sentence, idx) => {
              questions.push({
                problemId: problem.id,
                problemType: 'word_order',
                sentenceIndex: idx,
                text: sentence.text,
                answer: sentence.answer,
                options: sentence.choices || [],
                correctOrder: sentence.correctOrder,
              });
            });
          } else if (problem.type === 'reading' && problem.statements) {
            problem.statements.forEach((statement, idx) => {
              questions.push({
                problemId: problem.id,
                problemType: 'reading',
                sentenceIndex: idx,
                text: statement.text,
                answer: String(statement.isTrue),
                options: [],
                passage: problem.passage,
              });
            });
          }
        });

        setFlatQuestions(questions);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading test:', error);
        setLoading(false);
      });
  }, [lesson]);

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
        <div className="text-white text-2xl">Loading test...</div>
      </div>
    );
  }

  if (flatQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-2xl mb-4">No test found for Lesson {lesson}</div>
          <button
            onClick={() => router.push('/matome')}
            className="px-6 py-3 bg-white text-emerald-600 font-bold rounded-lg hover:bg-emerald-50 transition-colors"
          >
            Back to Tests
          </button>
        </div>
      </div>
    );
  }

  // Group questions by problem ID for section display
  const questionsByProblem = new Map<number, FlatQuestion[]>();
  flatQuestions.forEach(q => {
    if (!questionsByProblem.has(q.problemId)) {
      questionsByProblem.set(q.problemId, []);
    }
    questionsByProblem.get(q.problemId)!.push(q);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-teal-600 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 mb-8">
          <button
            onClick={() => router.push('/matome')}
            className="mb-4 text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-2"
          >
            <span>←</span>
            <span>Back to Tests</span>
          </button>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl sm:text-5xl font-bold text-emerald-600">
              Lesson {lesson} Test
            </h1>
            <div className="text-4xl">✅</div>
          </div>

          {submitted ? (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 border-2 border-emerald-200">
              <div className="text-center mb-4">
                <div className="text-5xl font-bold text-emerald-600 mb-2">
                  {score} / {flatQuestions.length}
                </div>
                <div className="text-xl text-gray-700">
                  {Math.round((score / flatQuestions.length) * 100)}% Correct
                </div>
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleRetry}
                  className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => router.push('/matome')}
                  className="px-6 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Back to Tests
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-gray-600">
              <div>
                <span className="font-semibold">{flatQuestions.length}</span> questions
              </div>
              <div>
                <span className="font-semibold">{userAnswers.size}</span> / {flatQuestions.length} answered
              </div>
            </div>
          )}
        </header>

        {/* Questions by Problem */}
        {Array.from(questionsByProblem.entries()).map(([problemId, problemQuestions]) => {
          const firstQuestion = problemQuestions[0];
          let sectionTitle = '';

          if (firstQuestion.problemType === 'word_bank') {
            sectionTitle = `Word Bank (Problem ${problemId})`;
          } else if (firstQuestion.problemType === 'multiple_choice') {
            sectionTitle = `Multiple Choice (Problem ${problemId})`;
          } else if (firstQuestion.problemType === 'word_order') {
            sectionTitle = `Word Order (Problem ${problemId})`;
          } else if (firstQuestion.problemType === 'reading') {
            sectionTitle = `Reading Comprehension (Problem ${problemId})`;
          }

          return (
            <div key={problemId} className="mb-8">
              {/* Section Header */}
              <div className="bg-white rounded-t-2xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-emerald-700">
                  {sectionTitle}
                </h2>
                {firstQuestion.passage && (
                  <div className="mt-4 p-4 bg-emerald-50 rounded-lg border-l-4 border-emerald-500">
                    <div className="text-sm text-emerald-700 font-semibold mb-2">Reading Passage:</div>
                    <div className="text-base leading-relaxed text-gray-900 whitespace-pre-wrap">
                      {firstQuestion.passage}
                    </div>
                  </div>
                )}
              </div>

              {/* Questions */}
              <div className="bg-white rounded-b-2xl shadow-lg p-6 space-y-4">
                {problemQuestions.map((question) => {
                  const questionIndex = flatQuestions.indexOf(question);
                  const userAnswer = userAnswers.get(questionIndex) || '';
                  const questionNumber = questionIndex + 1;

                  if (question.problemType === 'word_bank') {
                    return (
                      <WordBankQuestion
                        key={questionIndex}
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
                    );
                  } else if (question.problemType === 'multiple_choice') {
                    return (
                      <MultipleChoiceQuestion
                        key={questionIndex}
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
                    );
                  } else if (question.problemType === 'word_order') {
                    return (
                      <WordOrderQuestion
                        key={questionIndex}
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
                    );
                  } else if (question.problemType === 'reading') {
                    return (
                      <ReadingQuestion
                        key={questionIndex}
                        question={{
                          sentence_jp: question.text,
                          answer: question.answer,
                        }}
                        questionNumber={questionNumber}
                        selectedAnswer={userAnswer}
                        onAnswerChange={(answer) => handleAnswerChange(questionIndex, answer)}
                        showCorrect={submitted}
                      />
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          );
        })}

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
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-[1.02] shadow-lg'
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

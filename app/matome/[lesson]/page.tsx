'use client';

import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { MatomeTest, MatomeProblem } from '../../types';
import { WordBankQuestion } from '../components/WordBankQuestion';
import { MultipleChoiceQuestion } from '../components/MultipleChoiceQuestion';
import { ReadingQuestion } from '../components/ReadingQuestion';
import { WordOrderQuestion } from '../components/WordOrderQuestion';
import Furigana from '../../components/Furigana';

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

function MatomeTestContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const lesson = Number(params.lesson);
  const textbook = searchParams.get('textbook') || 'dekiru';

  const [loading, setLoading] = useState(true);
  const [flatQuestions, setFlatQuestions] = useState<FlatQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Map<number, string>>(new Map());
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const jsonFile = textbook === 'dekiru'
      ? '/matome/glmjsonwithhiragana.json'
      : '/manaboumatome.json';

    fetch(jsonFile)
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
      console.log(`Question ${idx + 1}:`, {
        userAnswer,
        correctAnswer: q.answer,
        match: userAnswer === q.answer,
        type: q.problemType,
      });
      if (userAnswer === q.answer) {
        correctCount++;
      }
    });
    console.log('Total correct:', correctCount, 'out of', flatQuestions.length);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-fg text-2xl">Loading test...</div>
      </div>
    );
  }

  if (flatQuestions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-fg text-2xl mb-4">No test found for Lesson {lesson}</div>
          <button
            onClick={() => router.push('/matome')}
            className="px-6 py-3 bg-surface text-accent font-medium rounded-lg hover:bg-accent/25 transition-colors"
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
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="bg-surface rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 mb-6 sm:mb-8 border border-line">
          <button
            onClick={() => router.push('/matome')}
            className="mb-3 sm:mb-4 text-accent hover:text-accent transition-colors flex items-center gap-2 text-sm sm:text-base"
          >
            <span>←</span>
            <span>Back to Tests</span>
          </button>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-medium text-accent">
              Lesson {lesson}
            </h1>
            <div className="text-3xl sm:text-4xl">✅</div>
          </div>

          {submitted ? (
            <div className="bg-accent/15 rounded-lg sm:rounded-xl p-4 sm:p-6 border-2 border-accent/40">
              <div className="text-center mb-4">
                <div className="text-3xl sm:text-5xl font-medium text-accent mb-2">
                  {score} / {flatQuestions.length}
                </div>
                <div className="text-lg sm:text-xl text-fg">
                  {Math.round((score / flatQuestions.length) * 100)}% Correct
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <button
                  onClick={handleRetry}
                  className="px-6 py-3 bg-accent text-on-accent font-medium rounded-lg hover:opacity-90 transition-colors text-sm sm:text-base"
                >
                  Try Again
                </button>
                <button
                  onClick={() => router.push('/matome')}
                  className="px-6 py-3 bg-surface-raised text-fg font-medium rounded-lg hover:bg-line transition-colors text-sm sm:text-base"
                >
                  Back to Tests
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-fg-soft text-sm sm:text-base">
              <div>
                <span className="font-medium">{flatQuestions.length}</span> questions
              </div>
              <div>
                <span className="font-medium">{userAnswers.size}</span> / {flatQuestions.length} answered
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
            <div key={problemId} className="mb-6 sm:mb-8">
              {/* Section Header */}
              <div className="bg-surface rounded-t-xl sm:rounded-t-2xl p-2 sm:p-6 border border-line">
                <h2 className="text-xl sm:text-2xl font-medium text-accent">
                  {sectionTitle}
                </h2>
                {firstQuestion.passage && (
                  <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-accent/15 rounded-lg border-l-4 border-accent">
                    <div className="text-xs sm:text-sm text-accent font-medium mb-2">Reading Passage:</div>
                    <div className="text-sm sm:text-base leading-relaxed text-fg whitespace-pre-wrap">
                      <Furigana text={firstQuestion.passage} />
                    </div>
                  </div>
                )}
              </div>

              {/* Questions */}
              <div className="bg-surface rounded-b-xl sm:rounded-b-2xl p-2 sm:p-6 space-y-3 sm:space-y-4 border border-line">
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
          <div className="bg-surface rounded-xl sm:rounded-2xl p-4 sm:p-8 sticky bottom-2 sm:bottom-4 border border-line">
            <button
              onClick={handleSubmit}
              disabled={userAnswers.size === 0}
              className={`w-full py-3 sm:py-4 rounded-lg sm:rounded-xl font-medium text-base sm:text-xl transition-all ${
                userAnswers.size === 0
                  ? 'bg-surface-raised text-fg-muted cursor-not-allowed'
                  : userAnswers.size === flatQuestions.length
                  ? 'bg-accent text-on-accent hover:opacity-90 hover:scale-[1.02]'
                  : 'bg-warn text-on-accent hover:opacity-90 hover:scale-[1.02]'
              }`}
            >
              {userAnswers.size === 0
                ? 'Answer at least one'
                : userAnswers.size === flatQuestions.length
                ? 'Submit Test'
                : `Submit (${userAnswers.size}/${flatQuestions.length})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MatomeTestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-fg text-2xl">Loading test...</div>
      </div>
    }>
      <MatomeTestContent />
    </Suspense>
  );
}

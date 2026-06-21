import Furigana from '../../components/Furigana';

interface ReadingQuestionProps {
  question: {
    sentence_jp?: string;
    answer?: string | boolean;
    note?: string;
  };
  questionNumber: number;
  selectedAnswer: string;
  onAnswerChange: (answer: string) => void;
  showCorrect?: boolean;
  passage?: string;
}

export function ReadingQuestion({
  question,
  questionNumber,
  selectedAnswer,
  onAnswerChange,
  showCorrect = false,
  passage,
}: ReadingQuestionProps) {
  // Convert answer to string for comparison
  const correctAnswer = String(question.answer);
  const isCorrect = selectedAnswer === correctAnswer;
  const isAnswered = selectedAnswer !== '';

  return (
    <div className={`bg-white rounded-lg sm:rounded-xl p-3 sm:p-6 shadow-md ${
      showCorrect
        ? isCorrect
          ? 'ring-2 ring-green-500'
          : isAnswered
          ? 'ring-2 ring-red-500'
          : ''
        : ''
    }`}>
      <div className="flex sm:hidden mb-2">
        <div className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-sm">
          {questionNumber}
        </div>
      </div>
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="hidden sm:flex flex-shrink-0 w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full items-center justify-center font-bold">
          {questionNumber}
        </div>
        <div className="flex-1">
          {passage && (
            <div className="mb-3 sm:mb-4 p-2 sm:p-4 bg-gray-50 rounded-lg border-l-4 border-emerald-500">
              <div className="text-xs sm:text-sm text-emerald-700 mb-2 font-semibold">Passage:</div>
              <div className="text-sm sm:text-base leading-relaxed text-gray-900">
                <Furigana text={passage} />
              </div>
            </div>
          )}

          <div className="text-sm sm:text-base mb-3 sm:mb-4 leading-relaxed text-gray-900">
            <Furigana text={question.sentence_jp || ''} />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <button
              onClick={() => !showCorrect && onAnswerChange('true')}
              disabled={showCorrect}
              className={`flex-1 p-3 sm:p-4 rounded-lg border-2 transition-all font-bold text-sm sm:text-base ${
                showCorrect
                  ? correctAnswer === 'true'
                    ? 'bg-green-50 border-green-500 text-green-700 ring-2 ring-green-200'
                    : selectedAnswer === 'true'
                    ? 'bg-red-50 border-red-500 text-red-700 ring-2 ring-red-200'
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                  : selectedAnswer === 'true'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-200'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-emerald-50 hover:border-emerald-300'
              } ${!showCorrect ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className="flex items-center justify-center gap-2">
                {showCorrect && correctAnswer === 'true' && (
                  <span className="text-green-600">✓</span>
                )}
                {showCorrect && selectedAnswer === 'true' && correctAnswer !== 'true' && (
                  <span className="text-red-600">✗</span>
                )}
                <span>⭕ True (正しい)</span>
              </div>
            </button>

            <button
              onClick={() => !showCorrect && onAnswerChange('false')}
              disabled={showCorrect}
              className={`flex-1 p-3 sm:p-4 rounded-lg border-2 transition-all font-bold text-sm sm:text-base ${
                showCorrect
                  ? correctAnswer === 'false'
                    ? 'bg-green-50 border-green-500 text-green-700 ring-2 ring-green-200'
                    : selectedAnswer === 'false'
                    ? 'bg-red-50 border-red-500 text-red-700 ring-2 ring-red-200'
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                  : selectedAnswer === 'false'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-200'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-emerald-50 hover:border-emerald-300'
              } ${!showCorrect ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className="flex items-center justify-center gap-2">
                {showCorrect && correctAnswer === 'false' && (
                  <span className="text-green-600">✓</span>
                )}
                {showCorrect && selectedAnswer === 'false' && correctAnswer !== 'false' && (
                  <span className="text-red-600">✗</span>
                )}
                <span>❌ False (間違い)</span>
              </div>
            </button>
          </div>

          {question.note && (
            <div className="mt-4 text-sm text-gray-600 italic">
              Note: {question.note}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

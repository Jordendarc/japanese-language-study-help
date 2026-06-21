import Furigana from '../../components/Furigana';

interface MultipleChoiceQuestionProps {
  question: {
    sentence_jp?: string;
    options?: string[];
    answer?: string;
    note?: string;
  };
  questionNumber: number;
  selectedAnswer: string;
  onAnswerChange: (answer: string) => void;
  showCorrect?: boolean;
}

export function MultipleChoiceQuestion({
  question,
  questionNumber,
  selectedAnswer,
  onAnswerChange,
  showCorrect = false,
}: MultipleChoiceQuestionProps) {
  const isCorrect = selectedAnswer === question.answer;
  const isAnswered = selectedAnswer !== '';

  // Parse sentence to show blank
  // Note: Uses half-width parentheses with full-width space: (　)
  const sentence = question.sentence_jp || '';
  const parts = sentence.split('(　)');

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
          <div className="text-base sm:text-lg mb-3 sm:mb-4 leading-relaxed text-gray-900">
            <Furigana text={parts[0]} />
            {' '}
            <span className="inline mx-1 px-2 py-0.5 bg-gray-100 rounded font-bold text-gray-500 text-sm align-baseline whitespace-nowrap">
              ___
            </span>
            {' '}
            {parts[1] && <Furigana text={parts[1]} />}
          </div>

          <div className="space-y-2">
            {question.options?.map((option, idx) => {
              const optionNumber = idx + 1;
              const isSelected = selectedAnswer === option;
              const isCorrectOption = option === question.answer;

              let bgClass = 'bg-gray-50 hover:bg-emerald-50 border-gray-200';
              if (showCorrect) {
                if (isCorrectOption) {
                  bgClass = 'bg-green-50 border-green-500 ring-2 ring-green-200';
                } else if (isSelected && !isCorrect) {
                  bgClass = 'bg-red-50 border-red-500 ring-2 ring-red-200';
                } else {
                  bgClass = 'bg-gray-50 border-gray-200';
                }
              } else if (isSelected) {
                bgClass = 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200';
              }

              return (
                <button
                  key={idx}
                  onClick={() => !showCorrect && onAnswerChange(option)}
                  disabled={showCorrect}
                  className={`w-full text-left p-3 sm:p-4 rounded-lg border-2 transition-all ${bgClass} ${
                    !showCorrect ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className={`flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center text-xs sm:text-sm font-bold mt-0.5 ${
                      showCorrect && isCorrectOption
                        ? 'bg-green-500 border-green-500 text-white'
                        : showCorrect && isSelected && !isCorrect
                        ? 'bg-red-500 border-red-500 text-white'
                        : isSelected
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'bg-white border-gray-300 text-gray-600'
                    }`}>
                      {optionNumber}
                    </div>
                    <span className={`flex-1 text-sm sm:text-base break-words ${
                      showCorrect && isCorrectOption
                        ? 'font-bold text-green-700'
                        : showCorrect && isSelected && !isCorrect
                        ? 'font-bold text-red-700'
                        : 'text-gray-900'
                    }`}>
                      {option}
                    </span>
                    {showCorrect && isCorrectOption && (
                      <span className="flex-shrink-0 text-green-600 font-bold text-sm sm:text-base">✓</span>
                    )}
                    {showCorrect && isSelected && !isCorrect && (
                      <span className="flex-shrink-0 text-red-600 font-bold text-sm sm:text-base">✗</span>
                    )}
                  </div>
                </button>
              );
            })}
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

import Furigana from '../../components/Furigana';

interface WordOrderQuestionProps {
  question: {
    sentence_jp?: string;
    options?: string[];
    answer?: string;
    correctOrder?: string[];
    note?: string;
  };
  questionNumber: number;
  selectedAnswer: string;
  onAnswerChange: (answer: string) => void;
  showCorrect?: boolean;
}

export function WordOrderQuestion({
  question,
  questionNumber,
  selectedAnswer,
  onAnswerChange,
  showCorrect = false,
}: WordOrderQuestionProps) {
  const isCorrect = selectedAnswer === question.answer;
  const isAnswered = selectedAnswer !== '';

  // Parse sentence - word order questions have () placeholders
  const sentence = question.sentence_jp || '';
  const parts = sentence.split('()');

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
          <div className="mb-3 sm:mb-4">
            <div className="text-xs sm:text-sm text-emerald-700 font-semibold mb-2">
              Which word goes in the ★ position?
            </div>
            <div className="text-base sm:text-lg leading-relaxed text-gray-900 mb-2 sm:mb-3">
              <Furigana text={parts[0]} />
              {parts.slice(1).map((part, idx) => (
                <span key={idx}>
                  <span className="mx-1 px-2 py-1 bg-gray-100 rounded text-gray-500 font-mono">
                    {idx === parts.length - 2 ? '★' : '___'}
                  </span>
                  <Furigana text={part} />
                </span>
              ))}
            </div>
          </div>

          {showCorrect && question.correctOrder && (
            <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <div className="text-xs sm:text-sm text-blue-700 font-semibold mb-1">Correct order:</div>
              <div className="text-sm sm:text-base text-gray-900">
                {question.correctOrder.map((word, idx) => (
                  <span key={idx}>
                    {word === question.answer ? (
                      <span className="font-bold text-blue-700 underline">{word}</span>
                    ) : (
                      <span>{word}</span>
                    )}
                    {idx < question.correctOrder!.length - 1 && ' → '}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
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
                  className={`text-left p-4 rounded-lg border-2 transition-all ${bgClass} ${
                    !showCorrect ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-bold ${
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
                    <span className={`text-gray-900 ${
                      showCorrect && isCorrectOption
                        ? 'font-bold text-green-700'
                        : showCorrect && isSelected && !isCorrect
                        ? 'font-bold text-red-700'
                        : ''
                    }`}>
                      {option}
                    </span>
                    {showCorrect && isCorrectOption && (
                      <span className="ml-auto text-green-600 font-bold">✓ ★</span>
                    )}
                    {showCorrect && isSelected && !isCorrect && (
                      <span className="ml-auto text-red-600 font-bold">✗</span>
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

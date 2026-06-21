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
  const sentence = question.sentence_jp || '';
  const parts = sentence.split('（　）');

  return (
    <div className={`bg-white rounded-xl p-6 shadow-md ${
      showCorrect
        ? isCorrect
          ? 'ring-2 ring-green-500'
          : isAnswered
          ? 'ring-2 ring-red-500'
          : ''
        : ''
    }`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold">
          {questionNumber}
        </div>
        <div className="flex-1">
          <div className="text-lg mb-4 leading-relaxed text-gray-900">
            <Furigana text={parts[0]} />
            <span className="mx-2 px-3 py-1 bg-gray-100 rounded-lg font-bold text-gray-500">
              ___
            </span>
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
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${bgClass} ${
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
                      <span className="ml-auto text-green-600 font-bold">✓</span>
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

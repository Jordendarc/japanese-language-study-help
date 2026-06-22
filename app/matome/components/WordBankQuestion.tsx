import Furigana from '../../components/Furigana';

interface WordBankQuestionProps {
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

export function WordBankQuestion({
  question,
  questionNumber,
  selectedAnswer,
  onAnswerChange,
  showCorrect = false,
}: WordBankQuestionProps) {
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
        <div className="flex-1 min-w-0">
          <div className="text-base sm:text-lg mb-3 sm:mb-4 leading-relaxed text-gray-900 break-words overflow-wrap-anywhere">
            <Furigana text={parts[0]} />
            {showCorrect && !isCorrect && selectedAnswer ? (
              <>
                <span className="inline-block line-through text-red-500">{selectedAnswer}</span>
                <span className="inline-block text-green-600 font-bold ml-2">{question.answer}</span>
              </>
            ) : (
              <select
                value={selectedAnswer}
                onChange={(e) => onAnswerChange(e.target.value)}
                disabled={showCorrect}
                className={`inline-block mx-1 sm:mx-2 px-2 sm:px-3 py-1 text-sm sm:text-base border-2 rounded-lg font-bold ${
                  showCorrect
                    ? isCorrect
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : isAnswered
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-300 bg-gray-50'
                    : 'border-emerald-300 focus:border-emerald-500 focus:outline-none'
                }`}
              >
                <option value="">選択</option>
                {question.options?.map((option, idx) => (
                  <option key={idx} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
            {parts[1] && <Furigana text={parts[1]} />}
          </div>

          {showCorrect && !isCorrect && (
            <div className="mt-2 text-sm text-green-700 bg-green-50 p-3 rounded-lg">
              <span className="font-semibold">Correct answer:</span> {question.answer}
            </div>
          )}

          {question.note && (
            <div className="mt-2 text-sm text-gray-600 italic">
              Note: {question.note}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

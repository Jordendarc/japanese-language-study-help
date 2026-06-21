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
            {showCorrect && !isCorrect && selectedAnswer ? (
              <>
                <span className="line-through text-red-500">{selectedAnswer}</span>
                <span className="text-green-600 font-bold ml-2">{question.answer}</span>
              </>
            ) : (
              <select
                value={selectedAnswer}
                onChange={(e) => onAnswerChange(e.target.value)}
                disabled={showCorrect}
                className={`mx-2 px-3 py-1 border-2 rounded-lg font-bold ${
                  showCorrect
                    ? isCorrect
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : isAnswered
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-300 bg-gray-50'
                    : 'border-emerald-300 focus:border-emerald-500 focus:outline-none'
                }`}
              >
                <option value="">選んでください</option>
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

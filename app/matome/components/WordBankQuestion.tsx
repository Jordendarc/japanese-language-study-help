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
    <div className={`bg-surface rounded-lg sm:rounded-xl p-3 sm:p-6 border border-line ${
      showCorrect
        ? isCorrect
          ? 'ring-2 ring-success'
          : isAnswered
          ? 'ring-2 ring-danger'
          : ''
        : ''
    }`}>
      <div className="flex sm:hidden mb-2">
        <div className="w-6 h-6 bg-accent/15 text-accent rounded-full flex items-center justify-center font-medium text-sm">
          {questionNumber}
        </div>
      </div>
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="hidden sm:flex flex-shrink-0 w-8 h-8 bg-accent/15 text-accent rounded-full items-center justify-center font-medium">
          {questionNumber}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-base sm:text-lg mb-3 sm:mb-4 leading-relaxed text-fg break-words overflow-wrap-anywhere">
            <Furigana text={parts[0]} />
            {showCorrect && !isCorrect && selectedAnswer ? (
              <>
                <span className="inline-block line-through text-danger">{selectedAnswer}</span>
                <span className="inline-block text-success font-medium ml-2">{question.answer}</span>
              </>
            ) : (
              <select
                value={selectedAnswer}
                onChange={(e) => onAnswerChange(e.target.value)}
                disabled={showCorrect}
                className={`inline-block mx-1 sm:mx-2 px-2 sm:px-3 py-1 text-sm sm:text-base border-2 rounded-lg font-medium ${
                  showCorrect
                    ? isCorrect
                      ? 'border-success bg-success/15 text-success'
                      : isAnswered
                      ? 'border-danger bg-danger/15 text-danger'
                      : 'border-line bg-surface-raised'
                    : 'border-accent/40 focus:border-accent focus:outline-none'
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
            <div className="mt-2 text-sm text-success bg-success/15 p-3 rounded-lg">
              <span className="font-medium">Correct answer:</span> {question.answer}
            </div>
          )}

          {question.note && (
            <div className="mt-2 text-sm text-fg-soft italic">
              Note: {question.note}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

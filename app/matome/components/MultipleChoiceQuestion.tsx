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
            {' '}
            <span className="inline-block mx-1 px-2 py-0.5 bg-surface-raised rounded font-medium text-fg-muted text-sm align-baseline whitespace-nowrap">
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

              let bgClass = 'bg-surface-raised hover:bg-accent/25 border-line';
              if (showCorrect) {
                if (isCorrectOption) {
                  bgClass = 'bg-success/15 border-success ring-2 ring-success/30';
                } else if (isSelected && !isCorrect) {
                  bgClass = 'bg-danger/15 border-danger ring-2 ring-danger/30';
                } else {
                  bgClass = 'bg-surface-raised border-line';
                }
              } else if (isSelected) {
                bgClass = 'bg-accent/15 border-accent ring-2 ring-accent/30';
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
                    <div className={`flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center text-xs sm:text-sm font-medium mt-0.5 ${
                      showCorrect && isCorrectOption
                        ? 'bg-success border-success text-on-accent'
                        : showCorrect && isSelected && !isCorrect
                        ? 'bg-danger border-danger text-on-accent'
                        : isSelected
                        ? 'bg-accent border-accent text-on-accent'
                        : 'bg-surface border-line text-fg-soft'
                    }`}>
                      {optionNumber}
                    </div>
                    <span className={`flex-1 min-w-0 text-sm sm:text-base break-words overflow-wrap-anywhere ${
                      showCorrect && isCorrectOption
                        ? 'font-medium text-success'
                        : showCorrect && isSelected && !isCorrect
                        ? 'font-medium text-danger'
                        : 'text-fg'
                    }`}>
                      <Furigana text={option} />
                    </span>
                    {showCorrect && isCorrectOption && (
                      <span className="flex-shrink-0 text-success font-medium text-sm sm:text-base">✓</span>
                    )}
                    {showCorrect && isSelected && !isCorrect && (
                      <span className="flex-shrink-0 text-danger font-medium text-sm sm:text-base">✗</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {question.note && (
            <div className="mt-4 text-sm text-fg-soft italic">
              Note: {question.note}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
          <div className="mb-3 sm:mb-4">
            <div className="text-xs sm:text-sm text-accent font-medium mb-2">
              Which word goes in the ★ position?
            </div>
            <div className="text-base sm:text-lg leading-relaxed text-fg mb-2 sm:mb-3 break-words overflow-wrap-anywhere">
              <Furigana text={parts[0]} />
              {parts.slice(1).map((part, idx) => (
                <span key={idx}>
                  <span className="inline-block mx-1 px-2 py-1 bg-surface-raised rounded text-fg-muted font-mono whitespace-nowrap">
                    {idx === parts.length - 2 ? '★' : '___'}
                  </span>
                  <Furigana text={part} />
                </span>
              ))}
            </div>
          </div>

          {showCorrect && question.correctOrder && (
            <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-accent/15 rounded-lg border-l-4 border-accent">
              <div className="text-xs sm:text-sm text-accent font-medium mb-1">Correct order:</div>
              <div className="text-sm sm:text-base text-fg">
                {question.correctOrder.map((word, idx) => (
                  <span key={idx}>
                    {word === question.answer ? (
                      <span className="font-medium text-accent underline">{word}</span>
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
                  className={`text-left p-4 rounded-lg border-2 transition-all ${bgClass} ${
                    !showCorrect ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
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
                    <span className={`flex-1 min-w-0 text-sm sm:text-base break-words overflow-wrap-anywhere text-fg ${
                      showCorrect && isCorrectOption
                        ? 'font-medium text-success'
                        : showCorrect && isSelected && !isCorrect
                        ? 'font-medium text-danger'
                        : ''
                    }`}>
                      <Furigana text={option} />
                    </span>
                    {showCorrect && isCorrectOption && (
                      <span className="ml-auto text-success font-medium">✓ ★</span>
                    )}
                    {showCorrect && isSelected && !isCorrect && (
                      <span className="ml-auto text-danger font-medium">✗</span>
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

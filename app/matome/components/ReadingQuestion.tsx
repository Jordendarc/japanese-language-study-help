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
          {passage && (
            <div className="mb-3 sm:mb-4 p-2 sm:p-4 bg-surface-raised rounded-lg border-l-4 border-accent">
              <div className="text-xs sm:text-sm text-accent mb-2 font-medium">Passage:</div>
              <div className="text-sm sm:text-base leading-relaxed text-fg break-words overflow-wrap-anywhere">
                <Furigana text={passage} />
              </div>
            </div>
          )}

          <div className="text-sm sm:text-base mb-3 sm:mb-4 leading-relaxed text-fg break-words overflow-wrap-anywhere">
            <Furigana text={question.sentence_jp || ''} />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <button
              onClick={() => !showCorrect && onAnswerChange('true')}
              disabled={showCorrect}
              className={`flex-1 p-3 sm:p-4 rounded-lg border-2 transition-all font-medium text-sm sm:text-base ${
                showCorrect
                  ? correctAnswer === 'true'
                    ? 'bg-success/15 border-success text-success ring-2 ring-success/30'
                    : selectedAnswer === 'true'
                    ? 'bg-danger/15 border-danger text-danger ring-2 ring-danger/30'
                    : 'bg-surface-raised border-line text-fg-soft'
                  : selectedAnswer === 'true'
                  ? 'bg-accent/15 border-accent text-accent ring-2 ring-accent/30'
                  : 'bg-surface-raised border-line text-fg hover:bg-accent/25 hover:border-accent/40'
              } ${!showCorrect ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className="flex items-center justify-center gap-2">
                {showCorrect && correctAnswer === 'true' && (
                  <span className="text-success">✓</span>
                )}
                {showCorrect && selectedAnswer === 'true' && correctAnswer !== 'true' && (
                  <span className="text-danger">✗</span>
                )}
                <span>⭕ True (正しい)</span>
              </div>
            </button>

            <button
              onClick={() => !showCorrect && onAnswerChange('false')}
              disabled={showCorrect}
              className={`flex-1 p-3 sm:p-4 rounded-lg border-2 transition-all font-medium text-sm sm:text-base ${
                showCorrect
                  ? correctAnswer === 'false'
                    ? 'bg-success/15 border-success text-success ring-2 ring-success/30'
                    : selectedAnswer === 'false'
                    ? 'bg-danger/15 border-danger text-danger ring-2 ring-danger/30'
                    : 'bg-surface-raised border-line text-fg-soft'
                  : selectedAnswer === 'false'
                  ? 'bg-accent/15 border-accent text-accent ring-2 ring-accent/30'
                  : 'bg-surface-raised border-line text-fg hover:bg-accent/25 hover:border-accent/40'
              } ${!showCorrect ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className="flex items-center justify-center gap-2">
                {showCorrect && correctAnswer === 'false' && (
                  <span className="text-success">✓</span>
                )}
                {showCorrect && selectedAnswer === 'false' && correctAnswer !== 'false' && (
                  <span className="text-danger">✗</span>
                )}
                <span>❌ False (間違い)</span>
              </div>
            </button>
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

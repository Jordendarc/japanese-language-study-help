'use client';

interface FuriganaProps {
  text: string;
  className?: string;
}

export default function Furigana({ text, className = '' }: FuriganaProps) {
  if (!text) return null;

  // Parse text like "試合（しあい）の後半（こうはん）で逆転（ぎゃくてん）した"
  // into segments with kanji and their readings
  const parseText = (input: string) => {
    const segments: Array<{ kanji: string; reading: string } | { text: string }> = [];

    // Regex to match kanji/symbols (not hiragana or katakana) followed by reading in parentheses
    // [\u4E00-\u9FAF] = Kanji
    // \u3005 = 々 (iteration mark)
    const regex = /([\u4E00-\u9FAF\u3005]+)（([^（）]+?)）/g;
    let match;
    let lastIndex = 0;

    while ((match = regex.exec(input)) !== null) {
      // Add any text before this match as plain text
      if (match.index > lastIndex) {
        const plainText = input.substring(lastIndex, match.index);
        if (plainText) {
          segments.push({ text: plainText });
        }
      }

      // Add the kanji with reading
      segments.push({
        kanji: match[1],
        reading: match[2]
      });

      lastIndex = regex.lastIndex;
    }

    // Add any remaining text
    if (lastIndex < input.length) {
      const remainingText = input.substring(lastIndex);
      if (remainingText) {
        segments.push({ text: remainingText });
      }
    }

    return segments;
  };

  const segments = parseText(text);

  return (
    <span className={`furigana-container ${className}`}>
      {segments.map((segment, index) => {
        if ('text' in segment) {
          // Plain text segment
          return (
            <ruby key={index} className="furigana-plain">
              {segment.text}
              <rt className="furigana-reading" style={{ visibility: 'hidden' }}>　</rt>
            </ruby>
          );
        } else {
          // Kanji with furigana
          return (
            <ruby key={index} className="furigana-ruby">
              {segment.kanji}
              <rt className="furigana-reading">{segment.reading}</rt>
            </ruby>
          );
        }
      })}

      <style jsx>{`
        .furigana-container {
          line-height: 2.2;
          display: inline;
        }
        .furigana-ruby,
        .furigana-plain {
          ruby-position: over;
        }
        .furigana-reading {
          font-size: 0.5em;
          color: #666;
        }
      `}</style>
    </span>
  );
}

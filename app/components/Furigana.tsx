'use client';

interface FuriganaProps {
  text: string;
  className?: string;
}

export default function Furigana({ text, className = '' }: FuriganaProps) {
  if (!text) return null;

  // Parse text like "試合（しあい）の後半（こうはん）で逆転（ぎゃくてん）した"
  // Also handles regular parentheses: "会社(かいしゃ)"
  // And mixed kana+kanji like "お小遣(こづか)い" and "当(あ)たり"
  // into segments with kanji and their readings
  const parseText = (input: string) => {
    const segments: Array<{ kanji: string; reading: string } | { text: string }> = [];

    // New strategy: Find parentheses first, then look backwards to find the word
    // Match pattern: any sequence of kanji/kana directly before parentheses that contains at least one kanji
    // This handles:
    // - 会社(かいしゃ) - consecutive kanji
    // - お小遣(こづか)い - prefix kana + kanji + suffix kana
    // - 当(あ)たり - kanji + okurigana between word parts
    // - 働(はたら)いて - kanji + okurigana
    //
    // [\u4E00-\u9FAF] = Kanji
    // [\u3040-\u309F] = Hiragana (ぁ-ん)
    // [\u30A0-\u30FF] = Katakana
    // \u3005 = 々 (iteration mark)

    // Use a more specific pattern:
    // Match any continuous sequence of kanji/kana immediately before parentheses
    // But ONLY if it starts with kanji (no leading standalone hiragana particles)
    // Changed to greedy (*) to capture full word like 会社, not just 社
    const regex = /([\u4E00-\u9FAF\u3005][\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3005]*)[（(]([^（）()]+?)[）)]/g;

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

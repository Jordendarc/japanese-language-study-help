/**
 * Utility functions for textbook color management
 */

export interface TextbookColorInfo {
  backgroundColor: string;
  textColor: string;
}

/**
 * Get the color scheme for a textbook based on its name
 * @param textbook - The textbook name
 * @returns Object with backgroundColor and textColor
 */
export function getTextbookColor(textbook: string): TextbookColorInfo {
  // Check for 初中級 first (Shochukyu - Early Intermediate)
  if (textbook.includes('初中級')) {
    return {
      backgroundColor: '#F9DD00', // Yellow
      textColor: '#000000'         // Black
    };
  }

  // Check for まなぼう (Manabu textbook)
  if (textbook.includes('まなぼう')) {
    return {
      backgroundColor: '#6B46C1', // Deep purple
      textColor: '#ffffff'         // White
    };
  }

  // Default to 中級 (Chukyu - Intermediate)
  return {
    backgroundColor: '#01AAC9', // Cyan
    textColor: '#ffffff'         // White
  };
}

/**
 * Get just the background color for a textbook
 * @param textbook - The textbook name
 * @returns The background color hex string
 */
export function getTextbookBackgroundColor(textbook: string): string {
  return getTextbookColor(textbook).backgroundColor;
}

/**
 * Get just the text color for a textbook
 * @param textbook - The textbook name
 * @returns The text color hex string
 */
export function getTextbookTextColor(textbook: string): string {
  return getTextbookColor(textbook).textColor;
}

/**
 * Get a short display name for a textbook
 * @param textbook - The textbook name
 * @returns Short name like '初中級', 'まなぼう', or '中級'
 */
export function getTextbookShortName(textbook: string): string {
  if (textbook.includes('初中級')) {
    return '初中級';
  }
  if (textbook.includes('まなぼう')) {
    return 'まなぼう';
  }
  return '中級';
}

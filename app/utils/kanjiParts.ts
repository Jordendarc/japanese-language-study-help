// Labels for the kanji part trees in the Word details panel.

/** How the parts of a kanji are arranged, by IDS layout character. */
export const LAYOUT_LABELS: Record<string, string> = {
  '⿰': 'left + right',
  '⿱': 'top + bottom',
  '⿲': 'left + middle + right',
  '⿳': 'top + middle + bottom',
  '⿴': 'inside a frame',
  '⿵': 'frame open at the bottom',
  '⿶': 'frame open at the top',
  '⿷': 'frame open on the right',
  '⿸': 'wrapped from the top left',
  '⿹': 'wrapped from the top right',
  '⿺': 'wrapped from the bottom left',
  '⿻': 'overlapping',
};

// Names for radicals and side forms that aren't kanji themselves, used until kanji_parts has its own.
// The shapes are the traditional radical names (氵 is "water" because it's a squashed 水).
export const PART_NAMES: Record<string, string> = {
  '亻': 'person', '氵': 'water', '扌': 'hand', '忄': 'heart', '艹': 'grass', '⺾': 'grass', '辶': 'movement', '⻌': 'movement',
  '⻍': 'movement', '灬': 'fire', '刂': 'knife', '⺈': 'knife', '阝': 'village / hill', '礻': 'altar, spirit', '衤': 'clothing',
  '犭': 'dog, animal', '⺮': 'bamboo', '罒': 'net', '⺲': 'net', '耂': 'old', '爫': 'claw', '⺍': 'small', '⺌': 'small',
  '⺕': 'pig\'s head', '彑': 'pig\'s head', '丷': 'two drops', '宀': 'roof', '冖': 'cover', '亠': 'lid', '疒': 'sickness',
  '广': 'building with a roof', '彳': 'step, going', '攵': 'strike', '攴': 'strike', '夂': 'going slowly', '厶': 'private',
  '冫': 'ice', '癶': 'spread legs', '卄': 'twenty', '廿': 'twenty', '⺊': 'divination', '亼': 'gather', '尸': 'body, flag',
  '囗': 'enclosure', '匚': 'box', '凵': 'open box', '勹': 'wrap', '冂': 'upside-down box', '儿': 'legs', '丿': 'slash',
  '丶': 'dot', '乙': 'second', '亅': 'hook', '丨': 'line', '几': 'table', '卩': 'seal', '⺋': 'seal', '廴': 'long stride',
  '彡': 'hair, sparkle', '歹': 'death', '殳': 'weapon', '疋': 'bolt of cloth', '禸': 'track', '襾': 'cover', '覀': 'cover',
  '龷': 'together', '䒑': 'grass top', '业': 'business (top part)', '𠂉': 'person on top', '⺗': 'heart', '⺼': 'flesh',
};

/** Parts IDS couldn't encode (circled numbers, &CDP-...; references) have no character of their own. */
export const isUnencoded = (part: string) => part.startsWith('&') || /^[①-⑳]$/.test(part);

const VERB_CLASS: Record<string, string> = {
  godan: 'godan (う-verb)',
  ichidan: 'ichidan (る-verb)',
  irregular: 'irregular verb',
  suru: 'する verb',
};

/** "Verb · godan (う-verb) · intransitive · common word" */
export function describeWord(word: {
  part_of_speech: string | null;
  verb_class: string | null;
  transitivity: string | null;
  is_common: boolean | null;
}): string {
  const bits: string[] = [];
  if (word.part_of_speech) bits.push(word.part_of_speech.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase()));
  if (word.verb_class) bits.push(word.part_of_speech === 'verb' ? VERB_CLASS[word.verb_class] ?? word.verb_class : word.verb_class === 'suru' ? 'takes する' : VERB_CLASS[word.verb_class] ?? word.verb_class);
  if (word.transitivity) bits.push(word.transitivity === 'both' ? 'transitive and intransitive' : word.transitivity);
  if (word.is_common) bits.push('common word');
  return bits.join(' · ');
}

// The composition shared by the valley scenes: where Fuji, the lake, the pagoda and the tree rows sit
// for each screen shape. Different art styles draw the same view from these numbers.

export interface ValleyLayout {
  name: 'landscape' | 'square' | 'portrait';
  W: number;
  H: number;
  /** y of the horizon (far shore of the valley) */
  hy: number;
  sunX: number;
  fuji: { cx: number; peakY: number; halfW: number };
  lake: { cx: number; cy: number; rx: number; ry: number };
  pagoda: { cx: number; baseY: number; s: number };
  /** canopy centre line of each tree row, back to front, plus how far the rows climb at the screen edges */
  rows: { base: number; boost: number; scale: number; spacing: number; depth: number }[];
}

const LANDSCAPE: ValleyLayout = {
  name: 'landscape',
  W: 1600,
  H: 1000,
  hy: 592,
  sunX: 150,
  fuji: { cx: 640, peakY: 232, halfW: 760 },
  lake: { cx: 350, cy: 652, rx: 370, ry: 44 },
  pagoda: { cx: 1290, baseY: 985, s: 1.18 },
  rows: [
    { base: 752, boost: 46, scale: 0.5, spacing: 58, depth: 0.2 },
    { base: 806, boost: 92, scale: 0.72, spacing: 86, depth: 0.48 },
    { base: 884, boost: 150, scale: 1.02, spacing: 120, depth: 0.76 },
    { base: 985, boost: 200, scale: 1.3, spacing: 146, depth: 1 },
  ],
};

const SQUARE: ValleyLayout = {
  name: 'square',
  W: 1100,
  H: 1100,
  hy: 640,
  sunX: 100,
  fuji: { cx: 470, peakY: 318, halfW: 660 },
  lake: { cx: 270, cy: 700, rx: 300, ry: 42 },
  pagoda: { cx: 850, baseY: 1086, s: 1.16 },
  rows: [
    { base: 806, boost: 42, scale: 0.52, spacing: 58, depth: 0.2 },
    { base: 866, boost: 84, scale: 0.74, spacing: 84, depth: 0.48 },
    { base: 952, boost: 136, scale: 1.0, spacing: 112, depth: 0.76 },
    { base: 1070, boost: 186, scale: 1.34, spacing: 150, depth: 1 },
  ],
};

const PORTRAIT: ValleyLayout = {
  name: 'portrait',
  W: 900,
  H: 1600,
  hy: 838,
  sunX: 70,
  fuji: { cx: 400, peakY: 500, halfW: 640 },
  lake: { cx: 230, cy: 902, rx: 260, ry: 40 },
  pagoda: { cx: 668, baseY: 1580, s: 1.3 },
  rows: [
    { base: 1100, boost: 50, scale: 0.6, spacing: 66, depth: 0.2 },
    { base: 1190, boost: 90, scale: 0.86, spacing: 98, depth: 0.48 },
    { base: 1330, boost: 150, scale: 1.1, spacing: 118, depth: 0.76 },
    { base: 1540, boost: 210, scale: 1.45, spacing: 156, depth: 1 },
  ],
};

export function valleyLayoutFor(viewportWidth: number, viewportHeight: number): ValleyLayout {
  const aspect = viewportWidth / viewportHeight;
  if (aspect < 0.72) return PORTRAIT;
  return aspect < 1.25 ? SQUARE : LANDSCAPE;
}

// Mt. Fuji's classic profile: steep near the summit and flattening toward the base, with a slightly
// different right flank and the Hoei shoulder on it so it isn't perfectly symmetrical. Points run from
// the crater rim down to the foot on each side; `wobble` adds a little unevenness to the ridgeline.
export function fujiProfile(
  layout: ValleyLayout,
  wobble: (u: number, dir: -1 | 1) => number,
  steps = 48
): { left: [number, number][]; right: [number, number][]; baseY: number; height: number; crater: number } {
  const { cx, peakY, halfW } = layout.fuji;
  const baseY = layout.hy + 16;
  const height = baseY - peakY;
  const crater = halfW * 0.045;
  const side = (dir: -1 | 1, power: number) => {
    const points: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const u = i / steps; // 0 at the crater rim, 1 at the foot
      const d = crater + (halfW - crater) * u;
      let h = height * Math.pow(1 - u, power);
      if (dir === 1) h += height * 0.03 * Math.exp(-Math.pow((u - 0.27) / 0.05, 2));
      points.push([cx + dir * d, baseY - h + (u > 0.03 ? wobble(u, dir) : 0)]);
    }
    return points;
  };
  return { left: side(-1, 2.0), right: side(1, 2.12), baseY, height, crater };
}

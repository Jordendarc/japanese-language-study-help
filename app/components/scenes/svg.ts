// Small helpers shared by the scene drawings.

const NS = 'http://www.w3.org/2000/svg';

export type Attrs = Record<string, string | number>;
export type Point = [number, number];

export function el(tag: string, attrs: Attrs, parent?: Element): SVGElement {
  const e = document.createElementNS(NS, tag);
  for (const key in attrs) e.setAttribute(key, String(attrs[key]));
  parent?.appendChild(e);
  return e;
}

// Seeded random numbers, so a scene looks the same on every visit
export function rng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Smooth 1D and 2D value noise in [0, 1]
export function makeNoise(seed: number) {
  const r = rng(seed);
  const table = Array.from({ length: 256 }, () => r());
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const at = (i: number, j: number) => table[(i * 57 + j * 131) & 255];
  return {
    n1(x: number): number {
      const i = Math.floor(x);
      const f = smooth(x - i);
      return table[i & 255] + (table[(i + 1) & 255] - table[i & 255]) * f;
    },
    n2(x: number, y: number): number {
      const i = Math.floor(x);
      const j = Math.floor(y);
      const fx = smooth(x - i);
      const fy = smooth(y - j);
      const top = at(i, j) + (at(i + 1, j) - at(i, j)) * fx;
      const bottom = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * fx;
      return top + (bottom - top) * fy;
    },
  };
}

export const cssVar = (name: string) => `var(--${name})`;
export const fill = (name: string) => `fill:${cssVar(name)}`;
export const stop = (offset: number, name: string, opacity = 1) =>
  ({ offset, style: `stop-color:${cssVar(name)};stop-opacity:${opacity}` }) as Attrs;

export function gradient(defs: Element, id: string, vertical: boolean, stops: Attrs[], extra: Attrs = {}) {
  const g = el('linearGradient', { id, x1: 0, y1: 0, x2: vertical ? 0 : 1, y2: vertical ? 1 : 0, ...extra }, defs);
  stops.forEach(s => el('stop', s, g));
}

// One SVG layer covering a region of the scene, positioned by percentages inside the stage
export function layer(
  stage: HTMLElement,
  size: { W: number; H: number },
  x: number,
  y: number,
  w: number,
  h: number,
  className: string
): SVGElement {
  const svg = el('svg', { viewBox: `${x} ${y} ${w} ${h}`, preserveAspectRatio: 'none', class: `scene-layer ${className}` });
  const style = (svg as unknown as HTMLElement).style;
  style.left = `${(x / size.W) * 100}%`;
  style.top = `${(y / size.H) * 100}%`;
  style.width = `${(w / size.W) * 100}%`;
  style.height = `${(h / size.H) * 100}%`;
  stage.appendChild(svg);
  return svg;
}

export const toPath = (points: Point[]) =>
  points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');

// Scene "anime-valley": the same view as sunsetValley (Mt. Fuji over a valley with a lake and town,
// a pagoda, a sakura forest) drawn like a hand-painted anime background: ink outlines, flat cel-shaded
// colour with hard-edged shadows, and big cumulus clouds. No blur or noise filters, so it's cheap to paint.
//
// Everything is generated from fixed seeds, and every colour comes from the palette in globals.css for
// `.scenery[data-style="anime-valley"]`, with one block per time of day.

import type { Scene } from './index';
import { cssVar, el, layer, makeNoise, rng, toPath, type Attrs, type Point } from './svg';
import { fujiProfile, valleyLayoutFor, type ValleyLayout } from './valleyLayout';

// Flat fill with an ink outline (width 0 = no outline)
function paint(fillName: string | null, inkWidth = 0, extra = ''): Attrs {
  const fillPart = fillName ? `fill:${cssVar(fillName)}` : 'fill:none';
  const strokePart = inkWidth ? `;stroke:${cssVar('ink')};stroke-width:${inkWidth};stroke-linejoin:round;stroke-linecap:round` : '';
  return { style: fillPart + strokePart + (extra ? `;${extra}` : '') };
}

// A colour that fades toward the distance colour (depth 0 = far, 1 = near)
const hazed = (name: string, depth: number, toward = 'tree-haze') =>
  `color-mix(in srgb, ${cssVar(name)} ${Math.round(55 + depth * 45)}%, ${cssVar(toward)})`;

let clipCount = 0;

// ---------- clouds ----------

interface CloudPuff { x: number; y: number; r: number }

// Cel-shaded cloud: every puff in the shadow tone, then again in white nudged up and toward the light,
// which leaves a crisp crescent of shadow under each one. Clipped to a flat base.
function cloudShape(svg: SVGElement, defs: Element, puffs: CloudPuff[], baseY: number) {
  const id = `an-cloud-${clipCount++}`;
  const minX = Math.min(...puffs.map(p => p.x - p.r)) - 10;
  const maxX = Math.max(...puffs.map(p => p.x + p.r)) + 10;
  const minY = Math.min(...puffs.map(p => p.y - p.r)) - 10;
  el('rect', { x: minX, y: minY, width: maxX - minX, height: baseY - minY }, el('clipPath', { id }, defs));
  const g = el('g', { 'clip-path': `url(#${id})` }, svg);
  puffs.forEach(p => el('circle', { cx: p.x, cy: p.y, r: p.r, ...paint('cloud-shade') }, g));
  puffs.forEach(p => el('circle', { cx: p.x - p.r * 0.15, cy: p.y - p.r * 0.26, r: p.r * 0.85, ...paint('cloud-lit') }, g));
}

// A flat-bottomed drifting cumulus
function cumulus(svg: SVGElement, defs: Element, x: number, y: number, w: number, seed: number) {
  const r = rng(seed);
  const h = w * 0.24;
  const count = Math.max(5, Math.round(w / (h * 0.75)));
  const puffs: CloudPuff[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const bulge = Math.sin(t * Math.PI);
    const pr = h * (0.42 + bulge * 0.5 + r() * 0.2);
    puffs.push({ x: x + t * w, y: y - pr * 0.55, r: pr });
  }
  // a second, smaller row on top for a billowing crown
  for (let i = 0; i < Math.round(count * 0.5); i++) {
    const t = 0.25 + r() * 0.5;
    const pr = h * (0.4 + r() * 0.3);
    puffs.push({ x: x + t * w, y: y - h * (0.75 + r() * 0.35), r: pr });
  }
  cloudShape(svg, defs, puffs, y);
}

// A towering cloud bank standing behind the mountains
function cloudTower(svg: SVGElement, defs: Element, cx: number, baseY: number, width: number, height: number, seed: number) {
  const r = rng(seed);
  const rows = 5;
  const puffs: CloudPuff[] = [];
  for (let k = 0; k < rows; k++) {
    const t = k / (rows - 1);
    const rowWidth = width * (1 - t * 0.72);
    const pr = (height / rows) * (0.95 - t * 0.2);
    const count = Math.max(2, Math.round(rowWidth / (pr * 1.15)));
    const lean = (r() - 0.4) * width * 0.12 * t;
    for (let i = 0; i < count; i++) {
      const u = count === 1 ? 0.5 : i / (count - 1);
      puffs.push({
        x: cx + lean + (u - 0.5) * rowWidth + (r() - 0.5) * pr * 0.4,
        y: baseY - t * height * 0.86 - pr * 0.35 + (r() - 0.5) * pr * 0.3,
        r: pr * (0.85 + r() * 0.4),
      });
    }
  }
  cloudShape(svg, defs, puffs, baseY + 30);
}

function drawSky(stage: HTMLElement, L: ValleyLayout) {
  const svg = layer(stage, L, -L.W * 0.06, 0, L.W * 1.12, L.hy + 20, 'scene-clouds');
  const defs = el('defs', {}, svg);

  // long painted brush streaks low in the sky
  const r = rng(13);
  for (let i = 0; i < 5; i++) {
    const w = L.W * (0.18 + r() * 0.3);
    el('rect', {
      x: r() * L.W, y: L.hy * (0.55 + r() * 0.36), width: w, height: 3 + r() * 5, rx: 4,
      ...paint('cloud-lit'), opacity: 0.28 + r() * 0.2,
    }, svg);
  }

  const spots: [number, number, number][] = [[0.04, 0.24, 0.2], [0.34, 0.13, 0.25], [0.63, 0.3, 0.16], [0.88, 0.17, 0.2], [0.2, 0.44, 0.13]];
  spots.forEach(([fx, fy, fw], i) => cumulus(svg, defs, L.W * fx, L.hy * fy, L.W * fw, 21 + i * 7));
}

// ---------- Mt. Fuji ----------

function drawFuji(svg: SVGElement, defs: Element, L: ValleyLayout): string {
  const { cx, peakY, halfW } = L.fuji;
  const noise = makeNoise(31);
  const steps = 40;
  const { left, right, baseY, height, crater } = fujiProfile(L, (u, dir) => (noise.n1(u * 14 + (dir === 1 ? 30 : 0)) - 0.5) * 7, steps);
  const rim: Point[] = [[cx - crater * 0.35, peakY + 5], [cx + crater * 0.3, peakY + 2]];
  const silhouette: Point[] = [...[...left].reverse(), ...rim, ...right];
  const footY = baseY + 80;
  const body = `${toPath(silhouette)} L${cx + halfW} ${footY} L${cx - halfW} ${footY} Z`;
  const r = rng(7);

  el('path', { d: body, ...paint('fuji') }, svg);

  // cel shadow: a jagged ridge runs down from the crater, and everything on the far side of it is in shade
  const ridge: Point[] = [];
  for (let i = 0; i <= 9; i++) {
    const t = i / 9;
    const zig = i === 0 ? 0 : (i % 2 ? 1 : -1) * halfW * 0.035 * (0.4 + t);
    ridge.push([cx + crater * 0.1 + t * halfW * 0.16 + zig, peakY + 4 + t * (footY - peakY - 4)]);
  }
  const shadow = `${toPath(ridge)} L${cx + halfW} ${footY} ${toPath([...right].reverse()).replace(/^M/, 'L')} Z`;
  el('path', { d: shadow, ...paint('fuji-shade') }, svg);

  // snow cap with long fingers running down the gullies
  const snowIndex = Math.round(steps * 0.26);
  const from = left[snowIndex];
  const to = right[snowIndex];
  const teeth: Point[] = [];
  const count = 12;
  for (let i = 1; i < count; i++) {
    const t = i / count;
    const drop = (i % 2 ? 1 : -0.45) * height * 0.07 * (0.6 + r() * 0.8);
    teeth.push([to[0] + (from[0] - to[0]) * t, to[1] + (from[1] - to[1]) * t + drop]);
  }
  const snowOutline: Point[] = [...left.slice(0, snowIndex + 1).reverse(), ...rim, ...right.slice(0, snowIndex + 1), ...teeth];
  const snow = `${toPath(snowOutline)} Z`;
  el('path', { d: snow }, el('clipPath', { id: 'an-snow' }, defs));
  el('path', { d: snow, ...paint('snow') }, svg);
  el('path', { d: shadow, ...paint('snow-shade'), 'clip-path': 'url(#an-snow)' }, svg);

  // ink: the snow line, a few rock strokes on the lit slope, the shadow ridge, then the silhouette
  el('path', { d: toPath([to, ...teeth, from]), ...paint(null, 1.6), opacity: 0.55 }, svg);
  for (let i = 0; i < 9; i++) {
    const index = Math.round(steps * (0.45 + r() * 0.45));
    const [sx, sy] = left[index];
    const [ux, uy] = left[Math.max(0, index - 3)];
    const length = 0.5 + r() * 0.9;
    const inset = 30 + r() * (halfW * 0.22);
    el('path', {
      d: `M${sx + inset} ${sy + inset * 0.2} l${(ux - sx) * length} ${(uy - sy) * length}`,
      ...paint(null, 1.5), opacity: 0.35,
    }, svg);
  }
  el('path', { d: toPath(ridge.slice(0, 7)), ...paint(null, 1.8), opacity: 0.45 }, svg);
  el('path', { d: toPath(silhouette), ...paint(null, 3.2) }, svg);

  return body;
}

// ---------- ridges, valley, lake, town ----------

function drawRidge(svg: SVGElement, L: ValleyLayout, y0: number, amp: number, seed: number, freq: number, colour: string) {
  const noise = makeNoise(seed);
  const points: Point[] = [];
  for (let x = -40; x <= L.W + 40; x += 14) {
    points.push([x, y0 - amp * (noise.n1(x * freq) * 0.7 + noise.n1(x * freq * 3.1 + 50) * 0.3)]);
  }
  el('path', { d: `${toPath(points)} L${L.W + 40} ${L.H + 20} L-40 ${L.H + 20} Z`, ...paint(colour) }, svg);
  el('path', { d: toPath(points), ...paint(null, 2.2), opacity: 0.75 }, svg);
}

function lakeOutline(L: ValleyLayout): Point[] {
  const { cx, cy, rx, ry } = L.lake;
  const noise = makeNoise(53);
  const points: Point[] = [];
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const k = 0.86 + noise.n1(i * 0.42) * 0.3;
    points.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return points;
}

function drawValley(svg: SVGElement, defs: Element, L: ValleyLayout, fujiBody: string) {
  const { cx, cy, rx, ry } = L.lake;
  const landTop = L.hy + 10;
  const landBottom = L.rows[0].base + 70;
  const r = rng(5);
  const inLake = (x: number, y: number, pad = 1.12) => Math.pow((x - cx) / (rx * pad), 2) + Math.pow((y - cy) / (ry * pad * 1.3), 2) < 1;

  // a band of mist at Fuji's foot, then the forested ridges in front of it
  for (let x = -30; x < L.W + 40; x += 34) {
    el('circle', { cx: x + r() * 16, cy: L.hy - 2 - r() * 10, r: 20 + r() * 16, ...paint('mist') }, svg);
  }
  el('rect', { x: -40, y: L.hy - 4, width: L.W + 80, height: 40, ...paint('mist') }, svg);
  drawRidge(svg, L, L.hy + 6, 36, 7, 0.0042, 'ridge-far');
  drawRidge(svg, L, L.hy + 22, 22, 23, 0.007, 'ridge-near');

  // valley floor with a patchwork of fields
  el('rect', { x: -40, y: landTop + 12, width: L.W + 80, height: landBottom - landTop + 40, ...paint('land') }, svg);
  for (let i = 0; i < 26; i++) {
    const t = Math.pow(r(), 0.8);
    const y = landTop + 18 + t * (landBottom - landTop - 30);
    const w = (50 + r() * 170) * (0.35 + t);
    const h = (7 + r() * 13) * (0.4 + t * 1.3);
    const x = r() * L.W;
    if (inLake(x + w / 2, y + h / 2, 1.2)) continue;
    const lean = ((x + w / 2 - L.W * 0.45) / L.W) * h * 1.4;
    el('path', { d: `M${x} ${y} L${x + w} ${y} L${x + w + lean} ${y + h} L${x + lean} ${y + h} Z`, ...paint(i % 2 ? 'land-2' : 'land-3') }, svg);
  }
  el('path', {
    d: `M${L.W * 0.63} ${landTop + 16} C${L.W * 0.6} ${landTop + 60} ${L.W * 0.5} ${landTop + 90} ${L.W * 0.52} ${landBottom}`,
    fill: 'none', style: `stroke:${cssVar('road')}`, 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.85,
  }, svg);

  // lake: flat colour, Fuji mirrored in it as a simple darker shape, crisp white highlight streaks
  const outline = lakeOutline(L);
  const lakeD = `${toPath(outline)} Z`;
  el('path', { d: lakeD }, el('clipPath', { id: 'an-lake' }, defs));
  el('path', { d: lakeD, ...paint('lake') }, svg);
  const inLakeGroup = el('g', { 'clip-path': 'url(#an-lake)' }, svg);
  el('path', { d: fujiBody, transform: `translate(0 ${(cy - ry) * 2}) scale(1 -1)`, ...paint('lake-reflect'), opacity: 0.3 }, inLakeGroup);
  for (let i = 0; i < 12; i++) {
    const w = 26 + r() * 100;
    el('rect', {
      x: cx - rx + r() * rx * 2 - w / 2, y: cy - ry * 0.8 + r() * ry * 1.6, width: w, height: 2.4 + r() * 2.2, rx: 2,
      ...paint('lake-hi'), opacity: 0.75,
    }, inLakeGroup);
  }
  el('path', { d: lakeD, ...paint(null, 2.4) }, svg);

  // town: little houses with hipped roofs, clustered, growing with nearness
  const noise = makeNoise(71);
  const roofs = ['roof-a', 'roof-b', 'roof-c', 'roof-a'];
  const rows = 15;
  for (let j = 0; j < rows; j++) {
    const t = j / (rows - 1);
    const y = landTop + 26 + Math.pow(t, 1.3) * (landBottom - landTop - 36);
    const size = 4 + t * 11;
    for (let x = -20 + r() * size * 3; x < L.W + 20; x += size * (2.2 + r() * 1.6)) {
      const px = x + (r() - 0.5) * size;
      const py = y + (r() - 0.5) * size * 0.7;
      if (inLake(px, py) || noise.n2(px / 150, py / 70) < 0.42) continue;
      const w = size * (1.1 + r() * 0.9);
      const h = size * (0.55 + r() * 0.45);
      const roofH = size * (0.45 + r() * 0.3);
      const over = size * 0.18;
      const inkWidth = Math.max(0.5, size * 0.085);
      el('rect', { x: px - w / 2, y: py - h, width: w, height: h, style: `fill:${hazed('house-wall', t, 'mist')};stroke:${cssVar('ink')};stroke-width:${inkWidth}` }, svg);
      el('path', {
        d: `M${px - w / 2 - over} ${py - h} L${px + w / 2 + over} ${py - h} L${px + w / 2 - over * 1.6} ${py - h - roofH} L${px - w / 2 + over * 1.6} ${py - h - roofH} Z`,
        style: `fill:${hazed(roofs[Math.floor(r() * roofs.length)], t, 'mist')};stroke:${cssVar('ink')};stroke-width:${inkWidth};stroke-linejoin:round`,
      }, svg);
      if (size > 6 && r() < 0.6) {
        el('rect', { x: px - w * 0.22, y: py - h * 0.72, width: w * 0.24, height: h * 0.42, style: `fill:${cssVar('town-lit')};opacity:${cssVar('lights')}` }, svg);
      }
    }
  }
}

// ---------- trees ----------

function drawTree(parent: Element, cx: number, cy: number, s: number, depth: number, r: () => number) {
  const rx = 96 * s;
  const ry = 60 * s;
  const outline = 1.5 + depth * 1.9;

  // nearer trees show their trunk
  if (depth > 0.7) {
    el('path', {
      d: `M${cx - 9 * s} ${cy + ry * 0.4} C${cx - 13 * s} ${cy + ry * 1.4} ${cx - 4 * s} ${cy + ry * 2} ${cx - 17 * s} ${cy + ry * 3.2} ` +
        `L${cx + 17 * s} ${cy + ry * 3.2} C${cx + 6 * s} ${cy + ry * 2} ${cx + 13 * s} ${cy + ry * 1.3} ${cx + 9 * s} ${cy + ry * 0.4} Z`,
      ...paint('trunk', outline),
    }, parent);
  }

  const count = 11 + Math.floor(r() * 5);
  const puffs: { x: number; y: number; r: number; dx: number; dy: number }[] = [];
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const u = Math.sqrt(r());
    const dx = Math.cos(a) * u;
    const dy = Math.sin(a) * u * 0.9;
    puffs.push({ x: cx + dx * rx, y: cy + dy * ry, r: (25 + r() * 17) * s * (1.05 - u * 0.3), dx, dy });
  }

  // one ink outline around the whole crown, then the shadow tone, then lighter tones nudged toward the sun
  const tone = (name: string) => `fill:${hazed(name, depth)}`;
  puffs.forEach(p => el('circle', { cx: p.x, cy: p.y, r: p.r + outline, style: `fill:${hazed('ink', depth * 0.6 + 0.4)}` }, parent));
  puffs.forEach(p => el('circle', { cx: p.x, cy: p.y, r: p.r, style: tone('bloom-shade') }, parent));
  puffs.forEach(p => el('circle', { cx: p.x - p.r * 0.16, cy: p.y - p.r * 0.21, r: p.r * 0.84, style: tone('bloom-mid') }, parent));
  puffs
    .filter(p => p.dx < 0.2 && p.dy < 0.15)
    .forEach(p => el('circle', { cx: p.x - p.r * 0.3, cy: p.y - p.r * 0.36, r: p.r * 0.5, style: tone('bloom-lit') }, parent));

  // the little scallop marks that say "clumps of blossom", and a few bright flecks
  for (let i = 0; i < 4; i++) {
    const p = puffs[Math.floor(r() * puffs.length)];
    const w = p.r * (0.35 + r() * 0.3);
    el('path', {
      d: `M${p.x - w * 0.2} ${p.y + p.r * 0.25} q${w * 0.5} ${w * 0.45} ${w} 0`,
      fill: 'none', style: `stroke:${hazed('ink', depth * 0.6 + 0.4)}`, 'stroke-width': 0.9 + depth * 0.9, 'stroke-linecap': 'round', opacity: 0.5,
    }, parent);
  }
  for (let i = 0; i < 5; i++) {
    const p = puffs[Math.floor(r() * puffs.length)];
    el('circle', { cx: p.x - p.r * (0.1 + r() * 0.5), cy: p.y - p.r * (0.1 + r() * 0.5), r: (2 + r() * 2.6) * s, style: tone('bloom-hi') }, parent);
  }
}

function drawTreeRow(parent: Element, L: ValleyLayout, index: number) {
  const row = L.rows[index];
  const r = rng(101 + index * 37);
  // rows sit lower in the middle of the picture and climb toward the edges, framing the valley
  const centre = L.W * 0.44;
  const lift = (x: number) => Math.pow(Math.min(1, Math.abs(x - centre) / (L.W * 0.56)), 1.7) * row.boost;
  for (let x = -row.spacing * 0.5; x < L.W + row.spacing; x += row.spacing * (0.72 + r() * 0.5)) {
    const s = row.scale * (0.82 + r() * 0.42);
    drawTree(parent, x, row.base - lift(x) + (r() - 0.5) * 34 * s, s, row.depth, r);
  }
}

// ---------- pagoda ----------

function drawPagoda(parent: Element, L: ValleyLayout) {
  const { cx, baseY, s } = L.pagoda;
  const g = el('g', { transform: `translate(${cx} ${baseY}) scale(${s})` }, parent);
  const tiers = 5;
  const pitch = 94;
  const wallH = 50;
  const span = (i: number) => 348 * Math.pow(0.865, i); // eave to eave
  const body = (i: number) => span(i) * 0.46; // wall width
  const shadowWash = { style: `fill:${cssVar('ink')}`, opacity: 0.24 };

  el('rect', { x: -body(0) / 2 - 34, y: -4, width: body(0) + 68, height: 40, ...paint('pg-dark', 2.4) }, g);

  for (let i = 0; i < tiers; i++) {
    const floor = -i * pitch;
    const w = body(i);
    const eave = floor - wallH;
    const half = span(i) / 2;
    const last = i === tiers - 1;

    // wall, plaster panels with dark window slits, posts, and a flat shadow down the side away from the sun
    el('rect', { x: -w / 2, y: eave, width: w, height: wallH, ...paint('pg-wall') }, g);
    const bay = w / 3;
    for (let b = 0; b < 3; b++) {
      el('rect', { x: -w / 2 + b * bay + 5, y: eave + 10, width: bay - 10, height: wallH - 24, ...paint('pg-panel', 1.2) }, g);
      el('rect', { x: -w / 2 + b * bay + bay / 2 - bay * 0.15, y: eave + 15, width: bay * 0.3, height: wallH - 32, ...paint('pg-dark') }, g);
    }
    el('rect', { x: w * 0.12, y: eave, width: w * 0.38, height: wallH, ...shadowWash }, g);
    el('rect', { x: -w / 2, y: eave, width: w, height: wallH, ...paint(null, 2.2) }, g);

    // balcony rail
    const rail = w + 40;
    for (let x = -rail / 2 + 3; x <= rail / 2 - 3; x += 10) el('rect', { x, y: floor - 20, width: 2.4, height: 14, ...paint('pg-wall') }, g);
    el('rect', { x: -rail / 2, y: floor - 8, width: rail, height: 9, ...paint('pg-wall-shade', 1.8) }, g);
    el('rect', { x: -rail / 2, y: floor - 23, width: rail, height: 4, ...paint('pg-wall', 1.4) }, g);

    // the base of the storey above, rising out of this roof
    if (!last) {
      const podium = body(i + 1) + 34;
      el('rect', { x: -podium / 2, y: floor - pitch - 2, width: podium, height: pitch - wallH - 18, ...paint('pg-dark', 2) }, g);
    }

    // roof: the whole shape in the shadow tone, then the top surface in the roof colour, which leaves
    // the thick eave edge dark; a wash of shadow on the far half; ribs; a highlight; then the ink outline
    const top = last ? eave - 58 : eave - 26;
    const neck = last ? 6 : body(i + 1) / 2 + 30;
    const upper =
      `M${-half - 6} ${eave - 16} Q${-half + 20} ${eave + 9} ${-half * 0.58} ${eave - 4} Q${-neck - 6} ${eave - 12} ${-neck} ${top} ` +
      `L${neck} ${top} Q${neck + 6} ${eave - 12} ${half * 0.58} ${eave - 4} Q${half - 20} ${eave + 9} ${half + 6} ${eave - 16} `;
    const roof = `${upper}Q0 ${eave + 12} ${-half - 6} ${eave - 16} Z`;
    el('path', { d: roof, ...paint('pg-roof-shade') }, g);
    el('path', { d: `${upper}Q0 ${eave - 2} ${-half - 6} ${eave - 16} Z`, ...paint('pg-roof') }, g);
    el('path', {
      d: `M2 ${top} L${neck} ${top} Q${neck + 6} ${eave - 12} ${half * 0.58} ${eave - 4} Q${half - 20} ${eave + 9} ${half + 6} ${eave - 16} Q${half * 0.5} ${eave - 6} ${half * 0.2} ${eave - 3} Z`,
      ...shadowWash,
    }, g);
    const ribs = el('g', { ...paint(null, 1), opacity: 0.32 }, g);
    for (let k = -5; k <= 5; k++) {
      const t = k / 5.6;
      el('path', { d: `M${t * neck} ${top + 2} Q${t * (neck + (half - neck) * 0.45)} ${eave - 13} ${t * half * 0.92} ${eave - 3}` }, ribs);
    }
    el('path', {
      d: `M${-half * 0.6} ${eave - 9} Q${-neck - 9} ${eave - 16} ${-neck - 3} ${top + 5}`,
      fill: 'none', style: `stroke:${cssVar('pg-roof-lit')}`, 'stroke-width': 3.2, 'stroke-linecap': 'round',
    }, g);
    el('path', { d: roof, ...paint(null, 2.6) }, g);
  }

  // spire: a pole with stacked rings and a finial
  const tip = -(tiers - 1) * pitch - wallH - 58;
  el('rect', { x: -10, y: tip - 6, width: 20, height: 12, ...paint('pg-dark', 1.8) }, g);
  el('rect', { x: -2.8, y: tip - 128, width: 5.6, height: 124, ...paint('pg-dark', 1.2) }, g);
  for (let k = 0; k < 9; k++) {
    el('rect', { x: -10 + k * 0.4, y: tip - 110 + k * 11, width: 20 - k * 0.8, height: 5.4, rx: 1.6, ...paint(k % 3 === 0 ? 'gold' : 'pg-dark', 1.2) }, g);
  }
  el('circle', { cx: 0, cy: tip - 135, r: 6, ...paint('gold', 1.6) }, g);
}

// ---------- build ----------

function buildScene(stage: HTMLElement, L: ValleyLayout) {
  stage.replaceChildren();
  clipCount = 0;

  // Painted sky and the sun are plain CSS backgrounds. The sun is drawn as flat rings; a palette can
  // make it invisible (midday) by setting the sun colours to transparent.
  const horizon = (L.hy / L.H) * 100;
  const sunAt = `${(L.sunX / L.W) * 100}% ${horizon}%`;
  stage.style.background =
    `radial-gradient(circle at ${sunAt}, ${cssVar('sun')} 0 3.2%, ${cssVar('sun-halo1')} 3.2% 6%, ${cssVar('sun-halo2')} 6% 10%, transparent 10%), ` +
    `linear-gradient(to bottom, ${cssVar('sky-top')} 0%, ${cssVar('sky-mid')} ${(horizon * 0.55).toFixed(1)}%, ${cssVar('sky-low')} ${horizon.toFixed(1)}%, ${cssVar('sky-low')} 100%)`;

  drawSky(stage, L);

  // mountains, valley, the back tree rows and the pagoda: painted once, never animated
  const land = layer(stage, L, 0, 0, L.W, L.H, 'scene-land');
  const defs = el('defs', {}, land);
  const cloudHeight = (L.hy - L.fuji.peakY) * 0.8;
  cloudTower(land, defs, L.W * 0.86, L.hy + 6, L.W * 0.36, cloudHeight, 3);
  cloudTower(land, defs, L.W * 0.27, L.hy + 6, L.W * 0.2, cloudHeight * 0.42, 17);
  const fujiBody = drawFuji(land, defs, L);
  drawValley(land, defs, L, fujiBody);
  drawTreeRow(land, L, 0);
  drawTreeRow(land, L, 1);
  drawPagoda(land, L);

  // four-point sparkles on the lake: a tiny layer, so their twinkle repaints almost nothing
  const { cx, cy, rx, ry } = L.lake;
  const sparkles = layer(stage, L, cx - rx, cy - ry * 1.2, rx * 2, ry * 2.4, 'scene-glints');
  const r = rng(77);
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2;
    const u = Math.sqrt(r()) * 0.8;
    const x = cx + Math.cos(a) * rx * u;
    const y = cy + Math.sin(a) * ry * u;
    const k = 4 + r() * 6;
    el('path', {
      d: `M${x} ${y - k} Q${x} ${y} ${x + k} ${y} Q${x} ${y} ${x} ${y + k} Q${x} ${y} ${x - k} ${y} Q${x} ${y} ${x} ${y - k} Z`,
      class: 'scene-glint',
      style: `fill:${cssVar('lake-hi')};animation-duration:${(2.2 + r() * 3).toFixed(1)}s;animation-delay:${(-r() * 5).toFixed(1)}s`,
    }, sparkles);
  }

  // the two front tree rows each get their own layer so they can sway in the wind
  [2, 3].forEach(index => {
    const row = L.rows[index];
    const top = row.base - row.boost - 150 * row.scale;
    const svg = layer(stage, L, -60, top, L.W + 120, L.H - top + 40, `scene-trees scene-trees-${index}`);
    // undergrowth, so nothing behind shows through between the trunks
    const noise = makeNoise(200 + index);
    const edge: Point[] = [];
    for (let x = -60; x <= L.W + 60; x += 24) edge.push([x, row.base + 20 * row.scale - noise.n1(x * 0.012) * 40 * row.scale - Math.pow(Math.min(1, Math.abs(x - L.W * 0.44) / (L.W * 0.56)), 1.7) * row.boost]);
    el('path', { d: `${toPath(edge)} L${L.W + 60} ${L.H + 40} L-60 ${L.H + 40} Z`, style: `fill:${hazed('bush', row.depth)}` }, svg);
    drawTreeRow(svg, L, index);
  });
}

export const animeValley: Scene = {
  id: 'anime-valley',
  label: 'Anime valley',
  layoutFor: valleyLayoutFor,
  timeFor: theme => (theme === 'day' ? 'day' : 'sunset'),
  build: (stage, layout) => buildScene(stage, layout as ValleyLayout),
};

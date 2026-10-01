// Scene "sunset-valley": Mt. Fuji over a valley with a lake and town, a pagoda, and a sakura forest,
// in a semi-realistic painted style. Draws the scene
// into a container, as a few stacked SVG layers. Everything is generated from fixed seeds, so it looks the
// same on every visit. Colours come from the --scene palette variables in globals.css, so a different
// time of day is only a different palette.
//
// Layers are separate SVGs so the browser paints each one once and then only moves them: the clouds
// drift and the front tree rows sway using cheap transforms, without repainting thousands of shapes.

import type { Scene } from './index';
import { cssVar, el, fill, gradient, layer, makeNoise, rng, stop, toPath, type Point } from './svg';
import { fujiProfile, valleyLayoutFor, type ValleyLayout as SceneLayout } from './valleyLayout';

// A colour that fades toward the haze colour with distance (depth 0 = far, 1 = near)
const hazed = (name: string, depth: number) =>
  `color-mix(in srgb, ${cssVar(name)} ${Math.round(58 + depth * 42)}%, ${cssVar('tree-haze')})`;

// ---------- Mt. Fuji ----------

function fujiOutline(L: SceneLayout) {
  const noise = makeNoise(19);
  return fujiProfile(L, (u, dir) => (noise.n1(u * 22 + (dir === 1 ? 40 : 0)) - 0.5) * 5);
}

function drawFuji(svg: SVGElement, defs: Element, L: SceneLayout): string {
  const { cx, peakY, halfW } = L.fuji;
  const { left, right, baseY, height } = fujiOutline(L);
  const crater = halfW * 0.045;
  const outline: Point[] = [
    ...[...left].reverse(),
    [cx - crater * 0.35, peakY + 5],
    [cx + crater * 0.3, peakY + 2],
    ...right,
  ];
  const d = `${toPath(outline)} L${cx + halfW} ${baseY + 80} L${cx - halfW} ${baseY + 80} Z`;

  gradient(defs, 'sc-fuji', false, [stop(0, 'fuji-l'), stop(0.45, 'fuji-m'), stop(1, 'fuji-r')]);
  gradient(defs, 'sc-snow', false, [stop(0, 'snow-l'), stop(0.5, 'snow-m'), stop(1, 'snow-r')]);
  gradient(defs, 'sc-fuji-haze', true, [stop(0.4, 'fuji-haze', 0), stop(1, 'fuji-haze', 0.9)]);
  el('path', { d }, el('clipPath', { id: 'sc-fuji-clip' }, defs));

  // Snow line: a top-to-bottom fade broken up by vertically stretched noise, which gives the streaks
  // of snow running down the gullies instead of a clean zigzag edge.
  const snowTop = peakY - 10;
  const snowHeight = height * 0.62;
  const snowGradient = el('linearGradient', { id: 'sc-snow-fade', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  el('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': 1 }, snowGradient);
  el('stop', { offset: 0.22, 'stop-color': '#fff', 'stop-opacity': 1 }, snowGradient);
  el('stop', { offset: 1, 'stop-color': '#fff', 'stop-opacity': 0 }, snowGradient);
  const snowFilter = el('filter', { id: 'sc-snow-filter', x: 0, y: 0, width: 1, height: 1, 'color-interpolation-filters': 'sRGB' }, defs);
  el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.022 0.0045', numOctaves: 4, seed: 11, result: 'n' }, snowFilter);
  el('feColorMatrix', { in: 'n', type: 'matrix', values: '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1 0 0 0 0', result: 'na' }, snowFilter);
  el('feComposite', { in: 'SourceGraphic', in2: 'na', operator: 'arithmetic', k1: 0, k2: 1, k3: 1, k4: -0.95, result: 'c' }, snowFilter);
  el('feFuncA', { type: 'linear', slope: 7, intercept: -1.2 }, el('feComponentTransfer', { in: 'c' }, snowFilter));
  const snowMask = el('mask', { id: 'sc-snow-mask', maskUnits: 'userSpaceOnUse', x: cx - halfW, y: snowTop, width: halfW * 2, height: snowHeight }, defs);
  el('rect', { x: cx - halfW, y: snowTop, width: halfW * 2, height: snowHeight, fill: 'url(#sc-snow-fade)', filter: 'url(#sc-snow-filter)' }, snowMask);

  // Rock texture: noise used as a height map and lit from the sun side
  const rock = el('filter', { id: 'sc-rock', x: 0, y: 0, width: 1, height: 1, 'color-interpolation-filters': 'sRGB' }, defs);
  el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.011 0.02', numOctaves: 5, seed: 3, result: 'n' }, rock);
  const light = el('feDiffuseLighting', { in: 'n', surfaceScale: 5, diffuseConstant: 1.15, 'lighting-color': '#ffffff' }, rock);
  el('feDistantLight', { azimuth: 200, elevation: 40 }, light);

  const g = el('g', {}, svg);
  el('path', { d, fill: 'url(#sc-fuji)' }, g);

  // gullies fanning out from the summit: light on the sun side, dark on the shaded side
  const gullies = el('g', { fill: 'none', 'stroke-linecap': 'round', 'clip-path': 'url(#sc-fuji-clip)' }, g);
  const r = rng(29);
  for (let k = 1; k <= 6; k++) {
    for (const dir of [-1, 1] as const) {
      const u = (k + r() * 0.7) / 7.2;
      const footX = cx + dir * (crater + (halfW - crater) * u * 0.92);
      const startX = cx + dir * crater * (0.3 + u * 0.6);
      const bend = cx + dir * halfW * u * 0.34;
      const y0 = peakY + height * 0.05;
      const yc = peakY + height * 0.55;
      const course: Point[] = [];
      for (let t = 0; t <= 1.001; t += 0.1) {
        const x = (1 - t) * (1 - t) * startX + 2 * t * (1 - t) * bend + t * t * footX;
        const y = (1 - t) * (1 - t) * y0 + 2 * t * (1 - t) * yc + t * t * baseY;
        course.push([x + (r() - 0.5) * 16 * t, y]);
      }
      el('path', {
        d: toPath(course),
        'stroke-linejoin': 'round',
        stroke: dir === -1 ? '#ffffff' : '#0d0a2a',
        'stroke-width': 1.5 + r() * 4,
        opacity: dir === -1 ? 0.04 + r() * 0.05 : 0.08 + r() * 0.08,
      }, gullies);
    }
  }

  el('path', { d, fill: 'url(#sc-snow)', mask: 'url(#sc-snow-mask)' }, g);
  el('rect', {
    x: cx - halfW, y: peakY - 20, width: halfW * 2, height: height + 100,
    filter: 'url(#sc-rock)', 'clip-path': 'url(#sc-fuji-clip)', opacity: 0.5, style: 'mix-blend-mode:soft-light',
  }, g);
  // distance haze, clipped to the mountain so it reads as air in front of it rather than sky showing through
  el('rect', { x: cx - halfW, y: peakY, width: halfW * 2, height: height + 80, fill: 'url(#sc-fuji-haze)', 'clip-path': 'url(#sc-fuji-clip)' }, g);
  // warm rim of light along the sun-facing slope
  el('path', {
    d: toPath(left.slice(0, 34)), fill: 'none', style: `stroke:${cssVar('fuji-rim')}`, 'stroke-width': 2.6, opacity: 0.7, filter: 'url(#sc-soft)',
  }, g);

  return d;
}

// ---------- ridges, valley, lake, town ----------

function ridgePath(L: SceneLayout, y0: number, amp: number, seed: number, freq: number): string {
  const noise = makeNoise(seed);
  const points: Point[] = [];
  for (let x = -40; x <= L.W + 40; x += 10) {
    const n = noise.n1(x * freq) * 0.65 + noise.n1(x * freq * 3.3 + 50) * 0.25 + noise.n1(x * freq * 9 + 90) * 0.1;
    points.push([x, y0 - amp * n]);
  }
  return `${toPath(points)} L${L.W + 40} ${L.H + 20} L-40 ${L.H + 20} Z`;
}

function lakeOutline(L: SceneLayout): Point[] {
  const { cx, cy, rx, ry } = L.lake;
  const noise = makeNoise(53);
  const points: Point[] = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const k = 0.86 + noise.n1(i * 0.42) * 0.3;
    points.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return points;
}

function drawValley(svg: SVGElement, defs: Element, L: SceneLayout, fujiD: string) {
  const { cx, cy, rx, ry } = L.lake;
  const landTop = L.hy + 8;
  const landBottom = L.rows[0].base + 60;

  gradient(defs, 'sc-land', true, [stop(0, 'land-far'), stop(1, 'land-near')]);
  gradient(defs, 'sc-lake', true, [stop(0, 'lake-top'), stop(0.5, 'lake-mid'), stop(1, 'lake-bot')]);
  gradient(defs, 'sc-valley-haze', true, [stop(0, 'mist', 0.6), stop(1, 'mist', 0)]);

  // forested ridges in front of Fuji's foot
  el('ellipse', { cx: L.fuji.cx, cy: L.hy - 6, rx: L.fuji.halfW * 0.9, ry: 20, style: fill('mist'), opacity: 0.4, filter: 'url(#sc-blur-big)' }, svg);
  el('path', { d: ridgePath(L, L.hy + 4, 34, 7, 0.0042), style: fill('ridge-far') }, svg);
  el('path', { d: ridgePath(L, L.hy + 20, 22, 23, 0.007), style: fill('ridge-near'), filter: 'url(#sc-rough-fine)' }, svg);

  el('rect', { x: -40, y: landTop + 10, width: L.W + 80, height: landBottom - landTop + 40, fill: 'url(#sc-land)' }, svg);

  // town: clusters of small roofs with some lit windows, sparse fields between them
  const noise = makeNoise(71);
  const r = rng(5);
  const town = el('g', {}, svg);
  const glow = el('g', { filter: 'url(#sc-soft)', style: `opacity:${cssVar('lights')}` }, svg);
  const inLake = (x: number, y: number) => Math.pow((x - cx) / (rx * 1.12), 2) + Math.pow((y - cy) / (ry * 1.5), 2) < 1;
  const rows = 26;
  for (let j = 0; j < rows; j++) {
    const t = j / (rows - 1);
    const y = landTop + 22 + Math.pow(t, 1.35) * (landBottom - landTop - 30);
    const size = 1.6 + t * 6.4;
    for (let x = -20 + r() * size * 3; x < L.W + 20; x += size * (1.9 + r() * 1.6)) {
      const px = x + (r() - 0.5) * size;
      const py = y + (r() - 0.5) * size * 0.8;
      if (inLake(px, py) || noise.n2(px / 150, py / 70) < 0.4) continue;
      const w = size * (1 + r() * 1.1);
      const h = size * (0.55 + r() * 0.6);
      const roof = r() < 0.3 ? 'town-roof' : 'town';
      el('rect', {
        x: px - w / 2, y: py - h, width: w, height: h,
        style: `fill:color-mix(in srgb, ${cssVar(roof)} ${Math.round(30 + Math.pow(t, 0.8) * 70)}%, ${cssVar('land-far')})`,
      }, town);
      if (r() < 0.28) {
        const lx = px + (r() - 0.5) * w * 0.6;
        el('circle', { cx: lx, cy: py - h * 0.4, r: Math.max(0.7, size * 0.16), style: fill('town-lit') }, town);
        if (r() < 0.5) el('circle', { cx: lx, cy: py - h * 0.4, r: size * 0.42, style: fill('town-lit') }, glow);
      }
    }
  }

  // lake: sky reflected in it, Fuji mirrored and rippled, a dark far shore
  const outline = lakeOutline(L);
  const lakeD = `${toPath(outline)} Z`;
  const shoreY = cy - ry;
  el('path', { d: lakeD }, el('clipPath', { id: 'sc-lake-clip' }, defs));
  const ripple = el('filter', { id: 'sc-ripple', x: -0.05, y: -0.1, width: 1.1, height: 1.2 }, defs);
  el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.004 0.09', numOctaves: 2, seed: 5, result: 'n' }, ripple);
  el('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: 13, xChannelSelector: 'R', yChannelSelector: 'G' }, ripple);
  el('feGaussianBlur', { stdDeviation: 1.1 }, ripple);

  el('path', { d: lakeD, fill: 'url(#sc-lake)' }, svg);
  const inLakeGroup = el('g', { 'clip-path': 'url(#sc-lake-clip)' }, svg);
  el('path', { d: fujiD, fill: 'url(#sc-fuji)', transform: `translate(0 ${shoreY * 2}) scale(1 -1)`, opacity: 0.55, filter: 'url(#sc-ripple)' }, inLakeGroup);
  el('ellipse', { cx: L.sunX + 30, cy: cy - ry * 0.2, rx: rx * 0.3, ry: ry * 1.1, style: fill('glow-a'), opacity: 0.55, filter: 'url(#sc-blur-big)' }, inLakeGroup);
  // faint horizontal wave lines
  const waves = el('g', { fill: 'none', stroke: '#ffffff', 'stroke-linecap': 'round', opacity: 0.16 }, inLakeGroup);
  for (let i = 0; i < 46; i++) {
    const wy = shoreY + 6 + Math.pow(r(), 1.3) * ry * 1.8;
    const wx = cx - rx + r() * rx * 2;
    el('line', { x1: wx, y1: wy, x2: wx + 20 + r() * 90, y2: wy, 'stroke-width': 0.8 + r() }, waves);
  }
  // dark tree line along the far shore
  el('path', {
    d: toPath(outline.slice(40, 69)), fill: 'none', style: `stroke:${cssVar('shore')}`, 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.55,
  }, svg);

  el('rect', { x: -40, y: landTop - 6, width: L.W + 80, height: (landBottom - landTop) * 0.7, fill: 'url(#sc-valley-haze)' }, svg);
}

// ---------- trees ----------

interface Puff { x: number; y: number; r: number; dx: number; dy: number }

function drawTree(parent: Element, cx: number, cy: number, s: number, depth: number, r: () => number) {
  // some trees are a deeper pink, and nearer rows sit more in evening shadow
  const deep = r() < 0.3 + depth * 0.15;
  const rx = 100 * s;
  const ry = 64 * s;
  const names = deep ? ['bloom-deep', 'bloom-shade', 'bloom-mid'] : ['bloom-shade', 'bloom-mid', 'bloom-lit'];

  // dark understory and a trunk, mostly hidden but they give the canopy something to sit on
  el('ellipse', { cx, cy: cy + ry * 0.7, rx: rx * 0.9, ry: ry * 0.7, style: `fill:${hazed('bloom-deep', depth)}` }, parent);
  el('path', {
    d: `M${cx + 6 * s} ${cy + ry * 2.2} C${cx - 8 * s} ${cy + ry * 1.4} ${cx + 10 * s} ${cy + ry * 0.7} ${cx - 2 * s} ${cy}`,
    fill: 'none', style: `stroke:${hazed('bloom-deep', depth)}`, 'stroke-width': 8 * s, 'stroke-linecap': 'round',
  }, parent);

  const count = Math.round(30 + depth * 22);
  const puffs: Puff[] = [];
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const u = Math.sqrt(r());
    const dx = Math.cos(a) * u;
    const dy = Math.sin(a) * u * 0.9;
    puffs.push({ x: cx + dx * rx, y: cy + dy * ry, r: (13 + r() * 19) * s * (1.1 - u * 0.4), dx, dy });
  }
  // sun is low on the left: the left and top of each tree catch the light
  const tone = (p: Puff) => ((p.dx < -0.25 && p.dy < 0.3) || p.dy < -0.5 ? 2 : p.dx > 0.2 || p.dy > 0.25 ? 0 : 1);
  puffs.sort((a, b) => tone(a) - tone(b) || a.y - b.y);
  const paint = (level: number) =>
    puffs.filter(p => tone(p) === level).forEach(p => el('circle', { cx: p.x, cy: p.y, r: p.r, style: `fill:${hazed(names[level], depth)}` }, parent));
  paint(0);
  // a few dark boughs reaching into the crown, half hidden by the brighter blossom in front
  for (let i = 0; i < 4; i++) {
    const a = -Math.PI * (0.15 + r() * 0.7);
    const reach = 0.55 + r() * 0.4;
    el('path', {
      d: `M${cx - 2 * s} ${cy + ry * 0.35} Q${cx + Math.cos(a) * rx * 0.3} ${cy + Math.sin(a) * ry * 0.2} ${cx + Math.cos(a) * rx * reach} ${cy + Math.sin(a) * ry * reach}`,
      fill: 'none', style: `stroke:${hazed('trunk', depth)}`, 'stroke-width': (1.6 + r() * 2) * s, 'stroke-linecap': 'round', opacity: 0.5,
    }, parent);
  }
  paint(1);
  paint(2);

  // dappled blossom highlights
  const highlights = Math.round(count * (0.7 + depth * 0.9));
  for (let i = 0; i < highlights; i++) {
    const p = puffs[Math.floor(r() * puffs.length)];
    if (tone(p) === 0 && r() < 0.7) continue;
    el('circle', {
      cx: p.x + (r() - 0.5) * p.r * 1.5 - 3 * s, cy: p.y + (r() - 0.5) * p.r * 1.3 - 4 * s, r: (1.8 + r() * 3.4) * s,
      style: `fill:${hazed('bloom-hi', depth)}`, opacity: 0.7 + r() * 0.3,
    }, parent);
  }
}

function drawTreeRow(parent: Element, L: SceneLayout, index: number) {
  const row = L.rows[index];
  const r = rng(101 + index * 37);
  const svgRoot = parent.closest('svg') ?? parent;
  const foliage = el('filter', { id: `sc-foliage-${index}`, x: -0.05, y: -0.05, width: 1.1, height: 1.1, 'color-interpolation-filters': 'sRGB' }, el('defs', {}, svgRoot));
  el('feTurbulence', { type: 'fractalNoise', baseFrequency: (0.03 / row.scale).toFixed(4), numOctaves: 3, seed: 5, result: 'n' }, foliage);
  el('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: 13 * row.scale, xChannelSelector: 'R', yChannelSelector: 'G', result: 'shape' }, foliage);
  el('feTurbulence', { type: 'fractalNoise', baseFrequency: (0.075 / row.scale).toFixed(4), numOctaves: 4, seed: 9, result: 'bumps' }, foliage);
  const lit = el('feDiffuseLighting', { in: 'bumps', surfaceScale: 3.4, diffuseConstant: 1.2, 'lighting-color': '#ffffff', result: 'light' }, foliage);
  el('feDistantLight', { azimuth: 205, elevation: 44 }, lit);
  el('feBlend', { in: 'light', in2: 'shape', mode: 'soft-light', result: 'textured' }, foliage);
  el('feComposite', { in: 'textured', in2: 'shape', operator: 'in' }, foliage);
  const g = el('g', { filter: `url(#sc-foliage-${index})` }, parent);
  // rows sit lower in the middle of the picture and climb toward the edges, framing the valley
  const centre = L.W * 0.44;
  const lift = (x: number) => Math.pow(Math.min(1, Math.abs(x - centre) / (L.W * 0.56)), 1.7) * row.boost;
  for (let x = -row.spacing * 0.5; x < L.W + row.spacing; x += row.spacing * (0.72 + r() * 0.5)) {
    const s = row.scale * (0.82 + r() * 0.42);
    drawTree(g, x, row.base - lift(x) + (r() - 0.5) * 34 * s, s, row.depth, r);
  }
}

// ---------- pagoda ----------

// Each roof rises from its eaves to the floor of the storey above, so the tower reads as one solid
// structure rather than separate roofs stacked in the air.
function drawPagoda(parent: Element, defs: Element, L: SceneLayout) {
  const { cx, baseY, s } = L.pagoda;
  gradient(defs, 'sc-roof', true, [stop(0, 'roof-lit'), stop(0.55, 'roof-mid'), stop(1, 'roof-dark')]);
  gradient(defs, 'sc-wall', false, [stop(0, 'wall-lit'), stop(1, 'wall-shade')]);
  gradient(defs, 'sc-form', false, [
    { offset: 0, 'stop-color': '#000', 'stop-opacity': 0 }, { offset: 0.5, 'stop-color': '#000', 'stop-opacity': 0 },
    { offset: 1, 'stop-color': '#0a0520', 'stop-opacity': 0.42 },
  ]);

  const g = el('g', { transform: `translate(${cx} ${baseY}) scale(${s})` }, parent);
  const tiers = 5;
  const pitch = 94;
  const wallH = 50;
  const span = (i: number) => 348 * Math.pow(0.865, i); // eave to eave
  const body = (i: number) => span(i) * 0.46; // wall width

  // stone base
  el('rect', { x: -body(0) / 2 - 34, y: -4, width: body(0) + 68, height: 40, style: fill('wall-dark') }, g);

  for (let i = 0; i < tiers; i++) {
    const floor = -i * pitch;
    const w = body(i);
    const eave = floor - wallH;
    const half = span(i) / 2;

    // wall with plaster panels, posts and dark lattice windows
    el('rect', { x: -w / 2, y: eave, width: w, height: wallH, fill: 'url(#sc-wall)' }, g);
    const bays = 3;
    const bay = w / bays;
    for (let b = 0; b < bays; b++) {
      el('rect', { x: -w / 2 + b * bay + 5, y: eave + 9, width: bay - 10, height: wallH - 22, style: fill('panel'), opacity: 0.94 }, g);
      el('rect', { x: -w / 2 + b * bay + bay / 2 - bay * 0.16, y: eave + 14, width: bay * 0.32, height: wallH - 30, style: fill('wall-dark'), opacity: 0.8 }, g);
    }
    for (let b = 0; b <= bays; b++) el('rect', { x: -w / 2 + b * bay - 2.4, y: eave, width: 4.8, height: wallH, style: fill('wall-shade') }, g);
    el('rect', { x: -w / 2, y: eave, width: w, height: wallH, fill: 'url(#sc-form)' }, g);

    // balcony rail around the storey
    const rail = w + 40;
    el('rect', { x: -rail / 2, y: floor - 7, width: rail, height: 8, style: fill('wall-shade') }, g);
    for (let x = -rail / 2 + 2; x <= rail / 2 - 2; x += 10) el('rect', { x, y: floor - 20, width: 2.4, height: 14, style: fill('wall-lit') }, g);
    el('rect', { x: -rail / 2, y: floor - 22, width: rail, height: 3.2, style: fill('wall-lit') }, g);

    // rafters under the eave
    el('path', {
      d: `M${-half + 16} ${eave - 2} Q0 ${eave + 9} ${half - 16} ${eave - 2} L${w / 2 + 4} ${eave + 16} L${-w / 2 - 4} ${eave + 16} Z`,
      style: fill('wall-dark'),
    }, g);

    // roof: upswept tips, concave slope, rising to the storey above (or to the spire on the top tier)
    const last = i === tiers - 1;
    const top = last ? eave - 58 : eave - 26;
    const neck = last ? 6 : body(i + 1) / 2 + 30;
    // the base of the storey above, rising out of this roof
    if (!last) {
      const podium = body(i + 1) + 34;
      el('rect', { x: -podium / 2, y: floor - pitch - 2, width: podium, height: pitch - wallH - 18, style: fill('wall-dark') }, g);
    }
    const roof =
      `M${-half - 6} ${eave - 16} Q${-half + 20} ${eave + 9} ${-half * 0.58} ${eave - 4} ` +
      `Q${-neck - 6} ${eave - 12} ${-neck} ${top} L${neck} ${top} ` +
      `Q${neck + 6} ${eave - 12} ${half * 0.58} ${eave - 4} Q${half - 20} ${eave + 9} ${half + 6} ${eave - 16} ` +
      `Q0 ${eave + 11} ${-half - 6} ${eave - 16} Z`;
    el('path', { d: roof, fill: 'url(#sc-roof)' }, g);
    // tile ribs
    const ribs = el('g', { fill: 'none', style: `stroke:${cssVar('roof-dark')}`, 'stroke-width': 1.1, opacity: 0.45 }, g);
    for (let k = -6; k <= 6; k++) {
      const t = k / 6.5;
      el('path', { d: `M${t * neck} ${top + 2} Q${t * (neck + (half - neck) * 0.45)} ${eave - 14} ${t * half * 0.94} ${eave + 4}` }, ribs);
    }
    el('path', { d: roof, fill: 'url(#sc-form)' }, g);
    el('path', {
      d: `M${-half - 6} ${eave - 16} Q${-half + 20} ${eave + 9} ${-half * 0.58} ${eave - 4} Q${-neck - 6} ${eave - 12} ${-neck} ${top}`,
      fill: 'none', style: `stroke:${cssVar('roof-rim')}`, 'stroke-width': 2.4, 'stroke-linecap': 'round', opacity: 0.85,
    }, g);
    el('path', { d: `M${-half - 4} ${eave - 14} Q0 ${eave + 12} ${half + 4} ${eave - 14}`, fill: 'none', style: `stroke:${cssVar('wall-lit')}`, 'stroke-width': 2.6, opacity: 0.85 }, g);
  }

  // spire: a pole with stacked rings and a finial
  const tip = -(tiers - 1) * pitch - wallH - 58;
  el('rect', { x: -10, y: tip - 6, width: 20, height: 12, style: fill('spire') }, g);
  el('rect', { x: -2.6, y: tip - 128, width: 5.2, height: 124, style: fill('spire') }, g);
  for (let k = 0; k < 9; k++) {
    el('rect', { x: -10 + k * 0.4, y: tip - 110 + k * 11, width: 20 - k * 0.8, height: 5, rx: 1.6, style: fill(k % 3 === 0 ? 'gold' : 'spire') }, g);
  }
  el('circle', { cx: 0, cy: tip - 134, r: 5.5, style: fill('gold') }, g);
}

// ---------- clouds ----------

function drawClouds(stage: HTMLElement, L: SceneLayout) {
  const height = L.hy + 30;
  const svg = layer(stage, L, -L.W * 0.06, 0, L.W * 1.12, height, 'scene-clouds');
  const defs = el('defs', {}, svg);

  // Fractal noise thresholded into cloud shapes, then lit from the low sun so the undersides glow
  const cloud = el('filter', { id: 'sc-cloud', x: 0, y: 0, width: 1, height: 1, 'color-interpolation-filters': 'sRGB' }, defs);
  el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.0032 0.0105', numOctaves: 5, seed: 8, result: 'n' }, cloud);
  el('feColorMatrix', { in: 'n', type: 'matrix', values: '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  2.7 0 0 0 -1.32', result: 'a' }, cloud);
  const lit = el('feDiffuseLighting', { in: 'a', surfaceScale: 10, diffuseConstant: 1.05, style: `lighting-color:${cssVar('cloud-lit')}`, result: 'lit' }, cloud);
  el('feDistantLight', { azimuth: 150, elevation: 24 }, lit);
  el('feFlood', { style: `flood-color:${cssVar('cloud-shade')}`, result: 'shade' }, cloud);
  el('feBlend', { in: 'lit', in2: 'shade', mode: 'screen', result: 'colour' }, cloud);
  el('feComposite', { in: 'colour', in2: 'a', operator: 'in' }, cloud);

  // keep the clouds off the very top and thin them toward the horizon
  const fade = el('linearGradient', { id: 'sc-cloud-fade', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  [[0, 0.1], [0.2, 0.9], [0.62, 1], [0.86, 0.55], [1, 0]].forEach(([offset, opacity]) =>
    el('stop', { offset, 'stop-color': '#fff', 'stop-opacity': opacity }, fade));
  const mask = el('mask', { id: 'sc-cloud-mask', maskUnits: 'userSpaceOnUse', x: -L.W * 0.06, y: 0, width: L.W * 1.12, height }, defs);
  el('rect', { x: -L.W * 0.06, y: 0, width: L.W * 1.12, height, fill: 'url(#sc-cloud-fade)' }, mask);

  const g = el('g', { mask: 'url(#sc-cloud-mask)' }, svg);
  el('rect', { x: -L.W * 0.06, y: 0, width: L.W * 1.12, height, filter: 'url(#sc-cloud)' }, g);

  // a few stars high up; the palette decides how visible they are
  const r = rng(41);
  const stars = el('g', { style: `opacity:${cssVar('stars')}` }, svg);
  for (let i = 0; i < 60; i++) {
    el('circle', { cx: r() * L.W, cy: r() * height * 0.4, r: 0.6 + r() * 1.1, fill: '#fff6ff', opacity: 0.4 + r() * 0.6 }, stars);
  }
}

// ---------- build ----------

function buildScene(stage: HTMLElement, L: SceneLayout) {
  stage.replaceChildren();

  // Sky and sun glow are plain CSS backgrounds: free to paint and they sit behind every layer
  const horizon = (L.hy / L.H) * 100;
  const sky = [0, 0.2, 0.42, 0.62, 0.82, 1].map((t, i) => `${cssVar(`sky-${i}`)} ${(t * horizon).toFixed(1)}%`).join(', ');
  const sunAt = `${(L.sunX / L.W) * 100}% ${(L.hy / L.H) * 100}%`;
  stage.style.background =
    `radial-gradient(circle at ${sunAt}, ${cssVar('glow-a')} 0, ${cssVar('glow-a')} 1.4%, color-mix(in srgb, ${cssVar('glow-b')} 70%, transparent) 5%, transparent 34%), ` +
    `linear-gradient(to bottom, ${sky}, ${cssVar('sky-5')} 100%)`;

  drawClouds(stage, L);

  // mountains, valley, the back tree rows and the pagoda: painted once, never animated
  const land = layer(stage, L, 0, 0, L.W, L.H, 'scene-land');
  const defs = el('defs', {}, land);
  el('feGaussianBlur', { stdDeviation: 1.3 }, el('filter', { id: 'sc-soft', x: -0.2, y: -0.2, width: 1.4, height: 1.4 }, defs));
  el('feGaussianBlur', { stdDeviation: 16 }, el('filter', { id: 'sc-blur-big', x: -0.4, y: -1, width: 1.8, height: 3 }, defs));
  const rough = el('filter', { id: 'sc-rough-fine', x: -0.05, y: -0.05, width: 1.1, height: 1.1 }, defs);
  el('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.07, numOctaves: 3, seed: 5, result: 'n' }, rough);
  el('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: 6, xChannelSelector: 'R', yChannelSelector: 'G' }, rough);

  const fujiD = drawFuji(land, defs, L);
  drawValley(land, defs, L, fujiD);
  drawTreeRow(land, L, 0);
  drawTreeRow(land, L, 1);
  drawPagoda(land, defs, L);

  // sun glitter on the lake: tiny layer, so its twinkle repaints almost nothing
  const { cx, cy, rx, ry } = L.lake;
  const glintLayer = layer(stage, L, cx - rx, cy - ry * 1.2, rx * 2, ry * 2.4, 'scene-glints');
  const r = rng(77);
  const glintX = Math.min(Math.max(L.sunX + 30, cx - rx * 0.8), cx + rx * 0.8);
  for (let i = 0; i < 40; i++) {
    const down = Math.pow(r(), 1.2);
    const y = cy - ry * 0.95 + down * ry * 1.9;
    const spread = 16 + down * rx * 0.3;
    const x = glintX + (r() - 0.5) * spread * 2;
    const line = el('line', {
      x1: x, y1: y, x2: x + 8 + r() * 34, y2: y, 'stroke-width': 1.2 + r() * 2, 'stroke-linecap': 'round',
      style: `stroke:${cssVar('lake-glint')};animation-duration:${(2.5 + r() * 3.5).toFixed(1)}s;animation-delay:${(-r() * 5).toFixed(1)}s`,
      class: 'scene-glint',
    }, glintLayer);
    line.setAttribute('opacity', '0.9');
  }

  // the two front tree rows each get their own layer so they can sway in the wind
  [2, 3].forEach(index => {
    const row = L.rows[index];
    const top = row.base - row.boost - 150 * row.scale;
    const svg = layer(stage, L, -60, top, L.W + 120, L.H - top + 40, `scene-trees scene-trees-${index}`);
    drawTreeRow(svg, L, index);
    if (index === 3) {
      // deepen the very bottom so the picture sits on a dark base
      const shade = el('linearGradient', { id: 'sc-floor', x1: 0, y1: 0, x2: 0, y2: 1 }, el('defs', {}, svg));
      el('stop', { offset: 0.55, style: `stop-color:${cssVar('tree-dark')};stop-opacity:0` }, shade);
      el('stop', { offset: 1, style: `stop-color:${cssVar('tree-dark')};stop-opacity:0.6` }, shade);
      el('rect', { x: -60, y: top, width: L.W + 120, height: L.H - top + 40, fill: 'url(#sc-floor)' }, svg);
    }
  });
}

export const sunsetValley: Scene = {
  id: 'sunset-valley',
  label: 'Sunset valley',
  layoutFor: valleyLayoutFor,
  timeFor: () => 'sunset',
  // Its full-screen noise, lighting and displacement filters made the site unusably slow on real devices.
  // Kept for its look; it needs baking to a static image (or far fewer filters) before it can come back.
  shelved: true,
  build: (stage, layout) => buildScene(stage, layout as SceneLayout),
};

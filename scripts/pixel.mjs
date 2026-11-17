// Pixel-art knight scene for the hero banner: a knight fishing from the castle
// bank, a sword planted beside him with a crow on the hilt. Everything is drawn
// on a cell grid and merged into one <path> per colour; text uses a built-in
// 5×7 bitmap font, so nothing depends on fonts installed on the viewer's machine.

/* ---------- grid ---------- */

class Grid {
  constructor(unit, ox = 0, oy = 0) {
    this.u = unit;
    this.ox = ox;
    this.oy = oy;
    this.cells = new Map();
  }

  put(x, y, color) {
    if (color) this.cells.set(`${x},${y}`, { x, y, color });
  }

  rect(x, y, w, h, color) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.put(x + i, y + j, color);
  }

  sprite(rows, x, y, pal, mirror = false) {
    rows.forEach((row, j) => {
      [...row].forEach((ch, i) => {
        if (ch === '.') return;
        const color = pal[ch];
        if (!color) throw new Error(`pixel: no palette colour for "${ch}"`);
        this.put(mirror ? x + row.length - 1 - i : x + i, y + j, color);
      });
    });
  }

  line(x0, y0, x1, y1, color) {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.put(x0, y0, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  svg(attrs = '') {
    const rows = new Map();
    for (const c of this.cells.values()) {
      if (!rows.has(c.y)) rows.set(c.y, []);
      rows.get(c.y).push(c);
    }
    const paths = new Map();
    const { u, ox, oy } = this;
    const emit = (r) => {
      const d = `M${ox + r.x * u} ${oy + r.y * u}h${r.w * u}v${u}h-${r.w * u}z`;
      paths.set(r.color, (paths.get(r.color) ?? '') + d);
    };
    for (const [y, cells] of rows) {
      cells.sort((a, b) => a.x - b.x);
      let run = null;
      for (const c of cells) {
        if (run && c.x === run.x + run.w && c.color === run.color) run.w++;
        else {
          if (run) emit(run);
          run = { x: c.x, y, w: 1, color: c.color };
        }
      }
      if (run) emit(run);
    }
    const body = [...paths].map(([color, d]) => `<path fill="${color}" d="${d}"/>`).join('');
    return `<g${attrs ? ` ${attrs}` : ''}>${body}</g>`;
  }
}

/* ---------- 5×7 font ---------- */

const GLYPHS = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '#..#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '..#..', '.#...'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '~': ['.....', '.....', '.#...', '#.#.#', '...#.', '.....', '.....'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '·': ['.....', '.....', '.....', '.##..', '.##..', '.....', '.....'],
  '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
  '>': ['.#...', '..#..', '...#.', '....#', '...#.', '..#..', '.#...'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
};

const textWidth = (str, s) => (str.length * 6 - 1) * s;

function pixelText(str, x, y, s, color) {
  const g = new Grid(s, x, y);
  [...str.toUpperCase()].forEach((ch, i) => {
    const glyph = GLYPHS[ch];
    if (!glyph) throw new Error(`pixel font: no glyph for "${ch}" in "${str}"`);
    g.sprite(glyph.map((r) => r.replace(/#/g, 'x')), i * 6, 0, { x: color });
  });
  return g;
}

/* ---------- sprites ---------- */

// Seated knight facing left (mirrored when drawn). P plume, A/M/D armour,
// V visor slit, C cape, G gauntlet.
const KNIGHT = [
  '.......PP....',
  '......PPpP...',
  '.....PPp.....',
  '....MAAAM....',
  '...MAAAAAM...',
  '...VVVVAAM...',
  '...AAAAAAM...',
  '....MAAAM....',
  '...AAAAAMMC..',
  '..AAAAAAAMCC.',
  '.AAAAAAAAMCC.',
  'GAAMAAAAMMCC.',
  '...MMMMMMMCC.',
  '...DDDDDDDCC.',
  'AAAAAAAAMMC..',
  'AM...........',
  'AM...........',
  'DD...........',
];

const SWORD = ['..GG..', '..BB..', '..BB..', 'GGGGGG', '..ST..', '..ST..', '..ST..', '..ST..', '..ST..', '..ST..', '..ST..'];

const CROW = ['..KK...', '.KEK...', 'OKKKKK.', '..KKKKK', '..KKK..', '..K.K..'];

const BIRD = [
  ['K...K', '.K.K.', '..K..'],
  ['.....', '.KKK.', 'K...K'],
];

const FLAME = [
  ['.Y.', 'YOY', 'ORO', '.R.'],
  ['..Y', '.YO', 'ORO', '.R.'],
  ['Y..', 'OY.', 'ORO', '.R.'],
];

const FLAG = [
  ['PPP', 'Pp.'],
  ['PP.', 'PpP'],
];

const CLOUD = ['...WWW.....', '.WWWWWWW...', 'WWWWWWWWWW.', '.SSSSSSSSSS'];

/* ---------- palettes ---------- */

const PALETTE = {
  dark: {
    sky: ['#0B0E1F', '#11153A', '#191D4A', '#24285C', '#33356E'],
    orb: '#F4EFD8', crater: '#D6CEAE', halo: '#F4EFD8', haloOpacity: 0.12,
    star: ['#FFFFFF', '#9FB0FF'],
    castle: '#0B0C1C', castleShade: '#070812', window: '#FFC857',
    grass: '#1E3A2E', stone: '#2B2F45', mortar: '#1D2033',
    water: ['#0F1C40', '#0A1430'], wave: '#3A55A0', glint: '#F4EFD8',
    knight: { P: '#E2463B', p: '#A82E26', A: '#C9D1E0', M: '#8A94AB', D: '#4E566B', V: '#0B0E1F', C: '#7A2230', G: '#C9A227' },
    sword: { G: '#C9A227', B: '#5A3A1E', S: '#D5DCEA', T: '#8A94AB' },
    crow: { K: '#05060C', E: '#FFC857', O: '#3A3A44' },
    bird: '#05060C',
    flame: { Y: '#FFE08A', O: '#FF8A2F', R: '#E2463B' }, pole: '#5A3A1E',
    flag: { P: '#E2463B', p: '#A82E26' },
    rod: '#8B5A2B', line: '#B9C3E0', bobber: ['#E2463B', '#FFFFFF'],
    cloud: null,
    label: '#8A94C8', name: '#F4EFD8', text: '#B7C0E8', accent: '#E2463B',
    dissolve: '#0B0E1F',
  },
  light: {
    sky: ['#6FBDEB', '#86C9EF', '#A0D5F3', '#BCE2F6', '#D8EFF9'],
    orb: '#FFE58A', crater: '#FFD24A', halo: '#FFF6C9', haloOpacity: 0.45,
    star: null,
    castle: '#4A5878', castleShade: '#3A4562', window: '#232B42',
    grass: '#4E9B4C', stone: '#8C92A8', mortar: '#6E7490',
    water: ['#3C8FD2', '#2B73B5'], wave: '#A9DBFF', glint: '#FFF3C2',
    knight: { P: '#D93A30', p: '#9E2A22', A: '#E6EBF3', M: '#9AA4BA', D: '#555E75', V: '#1A2033', C: '#8E2636', G: '#C9A227' },
    sword: { G: '#C9A227', B: '#5A3A1E', S: '#F1F4FA', T: '#9AA4BA' },
    crow: { K: '#141722', E: '#FFC857', O: '#4A4A55' },
    bird: '#2A3247',
    flame: { Y: '#FFE08A', O: '#FF8A2F', R: '#E2463B' }, pole: '#6B4524',
    flag: { P: '#D93A30', p: '#9E2A22' },
    rod: '#7A4A22', line: '#F4F7FC', bobber: ['#D93A30', '#FFFFFF'],
    cloud: { W: '#FFFFFF', S: '#D3EAF7' },
    label: '#1F3A60', name: '#0F1B33', text: '#1B2D4D', accent: '#B8322A',
    dissolve: '#CFE6F5',
  },
};

/* ---------- layouts (grid cells) ---------- */

export const PIXEL_LAYOUT = {
  wide: {
    P: 8, cols: 150, rows: 50, water: 37, ledge: 34, bankTo: 92, kx: 82,
    orb: { c: 113, r: 9, rad: 5 }, tip: { c: 108, r: 20 }, bob: { c: 112, r: 40 },
    sword: 75, torch: 3, castle: [122, 150],
    towers: [{ dx: 0, w: 5, h: 14 }, { dx: 9, w: 7, h: 21 }, { dx: 20, w: 5, h: 12 }],
    text: { x: 72, label: 64, name: 96, line1: 150, line2: 180, labelS: 3, nameS: 4, lineS: 3 },
    clouds: [[8, 3], [58, 6], [128, 30]],
  },
  compact: {
    P: 8, cols: 75, rows: 65, water: 54, ledge: 51, bankTo: 38, kx: 28,
    orb: { c: 47, r: 31, rad: 4 }, tip: { c: 46, r: 39 }, bob: { c: 50, r: 57 },
    sword: 18, torch: 3, castle: [60, 75],
    towers: [{ dx: 0, w: 5, h: 12 }, { dx: 8, w: 7, h: 19 }],
    text: { x: 40, label: 48, name: 80, line1: 134, line2: 164, labelS: 3, nameS: 4, lineS: 3 },
    clouds: [[4, 27], [52, 22]],
  },
};

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/* ---------- scene ---------- */

// Returns { svg, css }. `frames(name, n, dur)` helpers rely on the shared
// `.a` animation class defined by the hero.
export function knightScene(themeName, layoutName, copy) {
  const c = PALETTE[themeName];
  const L = PIXEL_LAYOUT[layoutName];
  const { P, cols, rows, water: W, ledge } = L;
  const rand = rng(layoutName === 'wide' ? 3 : 5);
  const out = [];

  // Sky: five bands with a dithered row between each pair.
  const sky = new Grid(P);
  const bandH = W / c.sky.length;
  for (let y = 0; y < W; y++) {
    const band = Math.min(c.sky.length - 1, Math.floor(y / bandH));
    const edge = band < c.sky.length - 1 && y === Math.floor((band + 1) * bandH) - 1;
    for (let x = 0; x < cols; x++) sky.put(x, y, edge && (x + y) % 2 ? c.sky[band + 1] : c.sky[band]);
  }
  out.push(sky.svg());

  // Text block bounds (px) — keeps stars and clouds out of the copy.
  const T = L.text;
  const textBox = {
    x0: T.x - 16,
    x1: T.x + Math.max(textWidth(copy.name, T.nameS), ...copy.lines.map((l) => textWidth(l, T.lineS) + 12 * T.lineS)) + 16,
    y0: T.label - 16,
    y1: T.line2 + 7 * T.lineS + 16,
  };
  const inText = (x, y) => x * P >= textBox.x0 - P && x * P <= textBox.x1 && y * P >= textBox.y0 - P && y * P <= textBox.y1;

  // Orb (moon / sun) with a soft pixel halo.
  const { orb } = L;
  const halo = new Grid(P);
  const disc = new Grid(P);
  for (let y = orb.r - orb.rad - 2; y <= orb.r + orb.rad + 2; y++) {
    for (let x = orb.c - orb.rad - 2; x <= orb.c + orb.rad + 2; x++) {
      const d = Math.hypot(x - orb.c, y - orb.r);
      if (d <= orb.rad + 0.3) disc.put(x, y, c.orb);
      else if (d <= orb.rad + 2.2) halo.put(x, y, c.halo);
    }
  }
  for (const [dx, dy] of [[-2, -1], [1, 1], [2, -2], [-1, 2]]) disc.put(orb.c + dx, orb.r + dy, c.crater);
  out.push(halo.svg(`opacity="${c.haloOpacity}" class="a pulse"`), disc.svg());

  // Stars (night) or clouds (day).
  if (c.star) {
    const groups = [new Grid(P), new Grid(P), new Grid(P)];
    let placed = 0;
    while (placed < Math.round(cols * 0.3)) {
      const x = Math.floor(rand() * cols);
      const y = 1 + Math.floor(rand() * (W - 12));
      if (inText(x, y) || Math.hypot(x - orb.c, y - orb.r) < orb.rad + 4) continue;
      const g = groups[placed % 3];
      const color = c.star[placed % 5 === 0 ? 1 : 0];
      if (placed % 9 === 0) {
        g.put(x, y, color);
        g.put(x - 1, y, c.star[1]);
        g.put(x + 1, y, c.star[1]);
        g.put(x, y - 1, c.star[1]);
        g.put(x, y + 1, c.star[1]);
      } else g.put(x, y, color);
      placed++;
    }
    groups.forEach((g, i) => out.push(g.svg(`class="a blink b${i}"`)));
  } else {
    L.clouds.forEach(([x, y], i) => {
      const g = new Grid(P);
      g.sprite(CLOUD, x, y, c.cloud);
      out.push(g.svg(`class="a cloud" style="animation-delay:-${i * 7}s"`));
    });
  }

  // Flying bird crossing the sky, two flap frames.
  const birdY = 3;
  const birdFrames = BIRD.map((f, i) => {
    const g = new Grid(P);
    g.sprite(f, -6, birdY, { K: c.bird });
    return g.svg(`class="a fr2 k${i}"${i ? ' opacity="0"' : ''}`);
  });
  out.push(`<g class="a fly">${birdFrames.join('')}</g>`);

  // Castle on its island.
  const [cx0, cx1] = L.castle;
  const castle = new Grid(P);
  const isle = new Grid(P);
  for (let y = ledge; y < W; y++) {
    for (let x = cx0 - 2; x < cx1; x++) {
      if (y === ledge) isle.put(x, y, c.grass);
      else isle.put(x, y, (x + (y % 2) * 2) % 4 === 0 ? c.mortar : c.stone);
    }
  }
  const wallTop = ledge - 6;
  castle.rect(cx0 + 1, wallTop, cx1 - cx0 - 1, 6, c.castle);
  for (let x = cx0 + 1; x < cx1; x += 2) castle.put(x, wallTop - 1, c.castle);
  let flagTower = null;
  const windows = new Grid(P);
  for (const t of L.towers) {
    const x0 = cx0 + t.dx;
    const top = ledge - t.h;
    castle.rect(x0, top, t.w, t.h, c.castle);
    for (let x = x0; x < x0 + t.w; x += 2) castle.put(x, top - 1, c.castle);
    for (let y = top; y < ledge; y++) castle.put(x0 + t.w - 1, y, c.castleShade);
    const mid = x0 + Math.floor(t.w / 2);
    windows.rect(mid, top + 3, 1, 2, c.window);
    if (t.h > 13) windows.rect(mid, top + 9, 1, 2, c.window);
    if (!flagTower || t.h > flagTower.h) flagTower = { x: mid, top, h: t.h };
  }
  castle.rect(cx0 + 4 + (L.towers[0].w - 1), ledge - 3, 2, 3, c.mortar);
  out.push(isle.svg(), castle.svg(), windows.svg(themeName === 'dark' ? 'class="a glow"' : ''));
  const pole = new Grid(P);
  pole.rect(flagTower.x, flagTower.top - 6, 1, 5, c.pole);
  out.push(pole.svg());
  out.push(
    FLAG.map((f, i) => {
      const g = new Grid(P);
      g.sprite(f, flagTower.x + 1, flagTower.top - 6, c.flag);
      return g.svg(`class="a fr2 k${i}"${i ? ' opacity="0"' : ''}`);
    }).join(''),
  );

  // Bank on the left: grass on top, brick below.
  const bank = new Grid(P);
  for (let y = ledge; y < W; y++) {
    for (let x = 0; x <= L.bankTo; x++) {
      if (y === ledge) bank.put(x, y, c.grass);
      else bank.put(x, y, (x + (y % 2) * 2) % 4 === 0 ? c.mortar : c.stone);
    }
  }
  out.push(bank.svg());

  // Water with drifting highlights and the orb's reflection.
  const sea = new Grid(P);
  for (let y = W; y < rows; y++) {
    for (let x = 0; x < cols; x++) sea.put(x, y, y < W + 3 || (y === W + 3 && (x + y) % 2) ? c.water[0] : c.water[1]);
  }
  out.push(sea.svg());
  const waves = [new Grid(P), new Grid(P)];
  for (let i = 0; i < Math.round(cols / 6); i++) {
    const y = W + 1 + Math.floor(rand() * (rows - W - 2));
    const x = Math.floor(rand() * cols);
    if (Math.abs(x - orb.c) < 5) continue;
    waves[i % 2].rect(x, y, 2 + Math.floor(rand() * 3), 1, c.wave);
  }
  waves.forEach((g, i) => out.push(g.svg(`class="a wave w${i}" opacity=".7"`)));
  const glints = [new Grid(P), new Grid(P)];
  for (let y = W + 1, i = 0; y < rows; y += 2, i++) {
    const w = Math.max(1, orb.rad - 1 - Math.floor(i / 2));
    glints[i % 2].rect(orb.c - Math.floor(w / 2) + (i % 2), y, w, 1, c.glint);
  }
  glints.forEach((g, i) => out.push(g.svg(`class="a glint fr2 k${i}" opacity="${i ? 0 : 0.55}"`)));

  // Torch.
  const torch = new Grid(P);
  torch.rect(L.torch, ledge - 5, 1, 5, c.pole);
  out.push(torch.svg());
  out.push(
    FLAME.map((f, i) => {
      const g = new Grid(P);
      g.sprite(f, L.torch - 1, ledge - 9, c.flame);
      return g.svg(`class="a fr3 k${i}"${i ? ' opacity="0"' : ''}`);
    }).join(''),
  );

  // Sword with the crow on the hilt.
  const swordTop = ledge - SWORD.length;
  const sword = new Grid(P);
  sword.sprite(SWORD, L.sword, swordTop, c.sword);
  const crow = new Grid(P);
  crow.sprite(CROW, L.sword - 1, swordTop - CROW.length, c.crow);
  out.push(sword.svg(), crow.svg('class="a hop"'));

  // Knight, rod, line and float.
  const kTop = ledge - 15;
  const knight = new Grid(P);
  knight.sprite(KNIGHT, L.kx, kTop, c.knight, true);
  out.push(knight.svg());
  const half = P / 2;
  const rod = new Grid(half);
  const hand = { c: L.kx + KNIGHT[0].length, r: kTop + 11 };
  rod.line(hand.c * 2, hand.r * 2 + 1, L.tip.c * 2, L.tip.r * 2, c.rod);
  out.push(rod.svg());
  const fishing = new Grid(half);
  fishing.line(L.tip.c * 2, L.tip.r * 2, L.bob.c * 2, L.bob.r * 2 - 3, c.line);
  out.push(fishing.svg('opacity=".75"'));
  const bobber = new Grid(half);
  bobber.rect(L.bob.c * 2 - 1, L.bob.r * 2 - 3, 2, 2, c.bobber[0]);
  bobber.rect(L.bob.c * 2 - 1, L.bob.r * 2 - 1, 2, 1, c.bobber[1]);
  out.push(bobber.svg('class="a nib"'));
  const rings = [0, 1].map((i) => {
    const g = new Grid(half);
    const spread = 3 + i * 2;
    g.rect(L.bob.c * 2 - 1 - spread - 1, L.bob.r * 2, 2, 1, c.wave);
    g.rect(L.bob.c * 2 + spread, L.bob.r * 2, 2, 1, c.wave);
    return g.svg(`class="a fr2 k${i}"${i ? ' opacity="0"' : ''}`);
  });
  out.push(rings.join(''));

  // Copy in the bitmap font, with a blinking cursor.
  out.push(pixelText(copy.handle, T.x, T.label, T.labelS, c.label).svg());
  out.push(pixelText(copy.name, T.x, T.name, T.nameS, c.name).svg());
  const prompt = pixelText('>', T.x, T.line1, T.lineS, c.accent).svg();
  const indent = T.x + 12 * T.lineS;
  out.push(prompt, pixelText(copy.lines[0], indent, T.line1, T.lineS, c.text).svg());
  out.push(pixelText('>', T.x, T.line2, T.lineS, c.accent).svg(), pixelText(copy.lines[1], indent, T.line2, T.lineS, c.text).svg());
  const cursorX = indent + textWidth(copy.lines[1], T.lineS) + 2 * T.lineS;
  out.push(`<rect class="a fr2 k0" x="${cursorX}" y="${T.line2}" width="${4 * T.lineS}" height="${7 * T.lineS}" fill="${c.accent}"/>`);

  const W_px = cols * P;
  const birdTravel = W_px + 12 * P;
  const css = `
.px *{shape-rendering:crispEdges}
.fr2{animation-name:fr2;animation-duration:1s;animation-timing-function:step-end}
.fr2.k1{animation-delay:-.5s}
@keyframes fr2{0%{opacity:1}50%,100%{opacity:0}}
.glint{animation-name:gl}
@keyframes gl{0%{opacity:.55}50%,100%{opacity:0}}
.fr3{animation-name:fr3;animation-duration:.6s;animation-timing-function:step-end}
.fr3.k1{animation-delay:-.4s}.fr3.k2{animation-delay:-.2s}
@keyframes fr3{0%{opacity:1}33.33%,100%{opacity:0}}
.blink{animation-name:blink;animation-timing-function:step-end}.b0{animation-duration:2.4s}.b1{animation-duration:3.6s;animation-delay:-1.2s}.b2{animation-duration:5s;animation-delay:-2s}
@keyframes blink{0%{opacity:1}70%{opacity:.25}85%,100%{opacity:1}}
.pulse{animation-name:pulse;animation-duration:3s;animation-timing-function:step-end}
@keyframes pulse{0%{opacity:${c.haloOpacity}}50%,100%{opacity:${c.haloOpacity * 0.6}}}
.glow{animation-name:glow;animation-duration:2.2s;animation-timing-function:step-end}
@keyframes glow{0%{opacity:1}40%{opacity:.75}60%,100%{opacity:1}}
.wave{animation-name:wave;animation-duration:2s;animation-timing-function:step-end}.w1{animation-delay:-1s}
@keyframes wave{0%{transform:translateX(0)}50%,100%{transform:translateX(${P}px)}}
.nib{animation-name:nib;animation-duration:1.6s;animation-timing-function:step-end}
@keyframes nib{0%{transform:translateY(0)}50%,100%{transform:translateY(${half}px)}}
.hop{animation-name:hop;animation-duration:5s;animation-timing-function:step-end}
@keyframes hop{0%{transform:translateY(0)}80%{transform:translateY(-${P}px)}86%,100%{transform:translateY(0)}}
.fly{animation-name:fly;animation-duration:16s;animation-timing-function:steps(${Math.round(birdTravel / P)})}
@keyframes fly{from{transform:translateX(0)}to{transform:translateX(${birdTravel}px)}}
.cloud{animation-name:cloud;animation-duration:24s;animation-direction:alternate;animation-timing-function:steps(8)}
@keyframes cloud{from{transform:translateX(0)}to{transform:translateX(${8 * P}px)}}
`;

  return { svg: out.join('\n'), css, dissolve: c.dissolve };
}

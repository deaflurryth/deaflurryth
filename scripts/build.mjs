#!/usr/bin/env node
// Builds the generated parts of the profile README from profile.config.mjs:
//   assets/icons/{dark,light}/<slug>.svg   – stack tiles
//   assets/hero/{dark,light}-{wide,compact}.svg – animated header scene
//   README.md blocks (HERO, LINKS, STACK) between <!-- NAME:START --> and <!-- NAME:END -->
// No dependencies; needs Node 18+ (global fetch).

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hero, links, REPO, SIMPLE_ICONS_VERSION, stack } from '../profile.config.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ICON_SIZE = 44;
const THEMES = ['dark', 'light'];
const asset = (path) => `https://raw.githubusercontent.com/${REPO.slug}/${REPO.branch}/${path}`;

/* ---------- colour helpers ---------- */

const hexToRgb = (hex) => {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = (rgb) => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
const luminance = (rgb) => {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const mix = (a, b, t) => a.map((c, i) => c + (b[i] - c) * t);

/* ---------- icon tiles ---------- */

const TILE = {
  dark: { top: '#1C2230', bottom: '#141922', stroke: '#2B3342', fg: '#E6EDF3', toward: [255, 255, 255] },
  light: { top: '#FFFFFF', bottom: '#F2F4F7', stroke: '#D0D7DE', fg: '#1F2328', toward: [0, 0, 0] },
};

// Brand colour, nudged until it reaches 3:1 against the tile. Near-black
// brands (Next.js, Cursor, MCP…) use the theme's neutral foreground instead.
function logoColor(brandHex, theme) {
  const t = TILE[theme];
  const brand = hexToRgb(brandHex);
  if (luminance(brand) < 0.03) return t.fg;
  const bg = mix(hexToRgb(t.top), hexToRgb(t.bottom), 0.5);
  for (let k = 0; k <= 1; k += 0.05) {
    const c = mix(brand, t.toward, k);
    if (contrast(c, bg) >= 3) return rgbToHex(c);
  }
  return t.fg;
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function tileSvg({ name, path, color }, theme) {
  const t = TILE[theme];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img" aria-label="${esc(name)}">
<title>${esc(name)}</title>
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.top}"/><stop offset="1" stop-color="${t.bottom}"/></linearGradient></defs>
<rect x="2" y="2" width="252" height="252" rx="58" fill="url(#g)" stroke="${t.stroke}" stroke-width="4"/>
<path transform="translate(62 62) scale(5.5)" fill="${color}" d="${path}"/>
</svg>
`;
}

const dataCache = new Map();
async function iconData(version) {
  if (!dataCache.has(version)) {
    const base = `https://cdn.jsdelivr.net/npm/simple-icons@${version}`;
    const p = (async () => {
      for (const file of ['data/simple-icons.json', '_data/simple-icons.json']) {
        const res = await fetch(`${base}/${file}`);
        if (res.ok) {
          const json = await res.json();
          return Array.isArray(json) ? json : json.icons;
        }
      }
      throw new Error(`simple-icons@${version}: data file not found`);
    })();
    dataCache.set(version, p);
  }
  return dataCache.get(version);
}

const SLUG_MAP = { '+': 'plus', '.': 'dot', '&': 'and', đ: 'd', ħ: 'h', ı: 'i', ĸ: 'k', ŀ: 'l', ł: 'l', ß: 'ss', ŧ: 't', ø: 'o' };
const titleToSlug = (title) =>
  title
    .toLowerCase()
    .replace(/[+.&đħıĸŀłßŧø]/g, (c) => SLUG_MAP[c])
    .normalize('NFD')
    .replace(/[^a-z\d]/g, '');

async function loadIcon(item) {
  const version = item.from ?? SIMPLE_ICONS_VERSION;
  const res = await fetch(`https://cdn.jsdelivr.net/npm/simple-icons@${version}/icons/${item.slug}.svg`);
  if (!res.ok) throw new Error(`Icon "${item.slug}" not found in simple-icons@${version} (HTTP ${res.status})`);
  const svg = await res.text();
  const path = svg.match(/<path[^>]*\sd="([^"]+)"/)?.[1];
  if (!path) throw new Error(`Icon "${item.slug}": no path in SVG`);
  let hex = item.color;
  if (!hex) {
    const meta = (await iconData(version)).find((i) => (i.slug ?? titleToSlug(i.title)) === item.slug);
    hex = meta?.hex ?? '000000';
  }
  return { ...item, path, hex };
}

/* ---------- hero scene ---------- */

const HERO_THEME = {
  dark: {
    skyTop: '#060A13', skyHorizon: '#141D30', waterTop: '#0E1628', waterBottom: '#04070D',
    horizon: '#26324A', far: '#0F1729', near: '#070C16', figure: '#03060B', rim: '#3A4B6E',
    star: '#C9D4F0', orb: '#ECF0F8', glow: '#8EA6FF', glowOpacity: 0.26, reflection: '#D2DDFF',
    line: '#A3B2D1', ripple: '#8396BC', bird: null,
    label: '#7F8DA8', name: '#EEF2F8', tagline: '#AAB7D0', accent: '#FF6B5E', bobberBase: '#F2F4F8',
  },
  light: {
    skyTop: '#E4ECF7', skyHorizon: '#FBF2E6', waterTop: '#DCE6F1', waterBottom: '#C2D1E3',
    horizon: '#C3CFDE', far: '#BCC8D8', near: '#8E9DB3', figure: '#1B2330', rim: '#FFFFFF',
    star: null, orb: '#FFE2B8', glow: '#FFB067', glowOpacity: 0.38, reflection: '#FFFFFF',
    line: '#56657E', ripple: '#6F82A0', bird: '#3C475A',
    label: '#56637A', name: '#0E1525', tagline: '#39455A', accent: '#E0473A', bobberBase: '#FFFFFF',
  },
};

const LAYOUT = {
  wide: {
    W: 1200, H: 400, horizon: 292,
    text: { x: 72, label: 112, name: 178, tagline: 228, nameSize: 56, tagSize: 22, labelSize: 15 },
    orb: { x: 1004, y: 104, r: 24 }, boat: 790, boatScale: 1.35, fish: 650, trees: [1040, 1200], stars: 36,
  },
  compact: {
    W: 600, H: 520, horizon: 404,
    text: { x: 40, label: 72, name: 126, tagline: 170, nameSize: 46, tagSize: 19, labelSize: 15 },
    orb: { x: 470, y: 250, r: 20 }, boat: 240, boatScale: 1.25, fish: 98, trees: [500, 600], stars: 26,
  },
};

const FONT_SANS = `ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, 'Helvetica Neue', Arial, sans-serif`;
const FONT_MONO = `ui-monospace, 'SF Mono', SFMono-Regular, 'JetBrains Mono', Menlo, Consolas, monospace`;

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const f = (n) => Number(n.toFixed(2));

function spruce(x, base, h, w) {
  const hw = w / 2;
  const tiers = [0, 1, 2].map((t) => ({ y: base - h + h * (0.36 + t * 0.27), hw: hw * (0.5 + t * 0.25) }));
  const trunk = Math.max(1.2, w * 0.05);
  const right = tiers.flatMap((t, i) =>
    i < 2 ? [[x + t.hw, t.y], [x + t.hw * 0.42, t.y - h * 0.035]] : [[x + t.hw, t.y], [x + trunk, t.y]],
  );
  const pts = [[x, base - h], ...right, [x + trunk, base], [x - trunk, base], ...right.reverse().map(([px, py]) => [2 * x - px, py])];
  return `M${pts.map(([px, py]) => `${f(px)} ${f(py)}`).join('L')}Z`;
}

function heroSvg(themeName, layoutName) {
  const c = HERO_THEME[themeName];
  const L = LAYOUT[layoutName];
  const { W, H, horizon: Y, text: T, orb } = L;
  const rand = rng(layoutName === 'wide' ? 7 : 11);

  // Text block bounds, so stars stay out of the copy.
  const textBox = { x0: T.x - 16, x1: T.x + T.tagSize * 0.58 * 44, y0: T.label - 24, y1: T.tagline + 16 };

  let stars = '';
  if (c.star) {
    let placed = 0;
    while (placed < L.stars) {
      const x = rand() * W;
      const y = 14 + rand() * (Y - 70);
      if (x > textBox.x0 && x < textBox.x1 && y > textBox.y0 && y < textBox.y1) continue;
      if (Math.hypot(x - orb.x, y - orb.y) < orb.r * 3) continue;
      const r = 0.6 + rand() * 1.1;
      stars += `<circle class="a tw tw${placed % 3}" cx="${f(x)}" cy="${f(y)}" r="${f(r)}" style="animation-delay:-${f(rand() * 6)}s"/>`;
      placed++;
    }
  }

  let birds = '';
  if (c.bird) {
    const flock = [
      [orb.x - 210, orb.y + 18, 1],
      [orb.x - 184, orb.y + 8, 0.8],
      [orb.x - 238, orb.y + 30, 0.7],
    ];
    birds = `<g class="a drift" fill="none" stroke="${c.bird}" stroke-width="1.4" stroke-linecap="round" opacity=".55">${flock
      .map(
        ([x, y, s], i) =>
          `<g transform="translate(${f(x)} ${f(y)}) scale(${s})"><path class="a flap" style="animation-delay:-${i * 0.3}s" d="M-6 0Q-3-3.5 0 0Q3-3.5 6 0"/></g>`,
      )
      .join('')}</g>`;
  }

  // Far ridge across the whole width, low so it never touches the copy.
  let ridge = `M0 ${Y}`;
  for (let x = 0; x <= W; x += 80) ridge += `Q${f(x + 40)} ${f(Y - 6 - rand() * 12)} ${f(x + 80)} ${Y}`;
  ridge += `V${Y + 1}H0Z`;

  // Spruce line on the right edge.
  let trees = '';
  for (let x = L.trees[0]; x < L.trees[1] + 20; x += 14 + rand() * 12) {
    const h = 26 + rand() * 40 + (x - L.trees[0]) * 0.12;
    trees += spruce(x, Y + 1, h, h * 0.42);
  }
  let farTrees = '';
  for (let x = L.trees[0] - 140; x < L.trees[0] + 40; x += 10 + rand() * 10) {
    const h = 12 + rand() * 14;
    farTrees += spruce(x, Y + 1, h, h * 0.45);
  }

  // Moon / sun reflection on the water.
  let glints = '';
  const rows = Math.floor((H - Y - 10) / 8);
  for (let i = 0; i < rows; i++) {
    const y = Y + 7 + i * 8;
    const w = (orb.r * 2.1 + 10) * (1 - (i / rows) * 0.55) * (0.55 + rand() * 0.45);
    const x = orb.x - w / 2 + (rand() - 0.5) * 10;
    const op = 0.5 * (1 - i / rows) + 0.08;
    glints += `<rect class="a sh sh${i % 3}" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="1.6" rx=".8" opacity="${f(op)}" style="animation-delay:-${f(rand() * 4)}s"/>`;
  }

  // Boat + fisherman, facing the float.
  const bx = L.boat;
  const wy = Y + 30;
  const hull = `M${bx - 62} ${wy - 14}H${bx + 58}Q${bx + 52} ${wy + 2} ${bx + 34} ${wy + 4}H${bx - 40}Q${bx - 58} ${wy + 2} ${bx - 62} ${wy - 14}Z`;
  const figure = `<g stroke="${c.figure}" stroke-linecap="round" stroke-linejoin="round" fill="none">
<path d="M${bx - 22} ${wy - 20}L${bx - 15} ${wy - 46}" stroke-width="16"/>
<path d="M${bx - 18} ${wy - 22}L${bx + 6} ${wy - 30}L${bx + 12} ${wy - 16}" stroke-width="9"/>
<path d="M${bx - 13} ${wy - 44}L${bx + 2} ${wy - 34}L${bx + 16} ${wy - 38}" stroke-width="6"/>
</g>
<circle cx="${bx - 12}" cy="${wy - 61}" r="8" fill="${c.figure}"/>
<path d="M${bx - 20} ${wy - 66}Q${bx - 19} ${wy - 78} ${bx - 11} ${wy - 78}Q${bx - 3} ${wy - 78} ${bx - 3} ${wy - 66}Z" fill="${c.figure}"/>
<ellipse cx="${bx - 11}" cy="${wy - 66}" rx="14" ry="2.6" fill="${c.figure}"/>
<path d="${hull}" fill="${c.figure}"/>`;

  const k = L.boatScale;
  const tipLocal = { x: bx + 160, y: wy - 116 };
  const tip = { x: f(bx + (tipLocal.x - bx) * k), y: f(wy + (tipLocal.y - wy) * k) };
  const rod = `<path d="M${bx + 14} ${wy - 37}Q${bx + 82} ${wy - 112} ${tipLocal.x} ${tipLocal.y}" stroke="${c.figure}" stroke-width="${f(1.8 / k)}" fill="none" stroke-linecap="round"/>`;
  const bob = { x: orb.x - 4, y: Y + 44 };
  const line = `<path class="a line" d="M${tip.x} ${tip.y}Q${f(tip.x + (bob.x - tip.x) * 0.35)} ${f((tip.y + bob.y) / 2 + 26)} ${bob.x} ${bob.y - 6}" stroke="${c.line}" stroke-width=".8" fill="none" opacity=".6"/>`;
  const bobber = `<g class="a bob"><path d="M${bob.x} ${bob.y - 10}V${bob.y - 5}" stroke="${c.figure}" stroke-width="1.2"/><path d="M${bob.x - 3.4} ${bob.y}A3.4 5 0 0 1 ${bob.x + 3.4} ${bob.y}Z" fill="${c.accent}"/><path d="M${bob.x - 3.4} ${bob.y}A3.4 4 0 0 0 ${bob.x + 3.4} ${bob.y}Z" fill="${c.bobberBase}"/></g>`;
  const ripples = [0, 1, 2]
    .map((i) => `<ellipse class="a rp" cx="${bob.x}" cy="${bob.y + 3}" rx="18" ry="3.4" style="animation-delay:-${f(i * 1.3)}s"/>`)
    .join('');

  // Fish jumping in an arc around a pivot under the water.
  const fishR = 58;
  const pivot = { x: L.fish, y: Y + 42 };
  const fish = `<g clip-path="url(#above)"><g class="a fish" style="transform-origin:${pivot.x}px ${pivot.y}px"><path transform="translate(${pivot.x} ${pivot.y - fishR})" d="M12 0Q4-5.5-6-1.2L-12.5-4.5-11 0-12.5 4.5-6 1.2Q4 5.5 12 0Z" fill="${c.figure}"/></g></g>`;
  const splashX = f(fishR * Math.sin(Math.acos((pivot.y - Y) / fishR)));
  const splashes = `<ellipse class="a sp sp-out" cx="${f(pivot.x - splashX)}" cy="${Y + 2}" rx="12" ry="2.4"/><ellipse class="a sp sp-in" cx="${f(pivot.x + splashX)}" cy="${Y + 2}" rx="12" ry="2.4"/>`;

  const lineCount = hero.taglines.length;
  const slot = 4;
  const FADE = 0.45; // line 1 starts already faded in, so a static first frame still shows it
  const cycle = slot * lineCount;
  const pct = (s) => f((s / cycle) * 100);
  const taglines = hero.taglines
    .map(
      (t, i) =>
        `<text class="a tg${i === 0 ? ' first' : ''}" x="${T.x + T.tagSize * 1.1}" y="${T.tagline}" style="animation-delay:${f(i * slot - FADE)}s">${esc(t)}</text>`,
    )
    .join('');

  const reflectionOpacity = themeName === 'dark' ? 0.32 : 0.14;
  const title = `${hero.name} — ${hero.taglines[0]}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
<style>
.a{animation-timing-function:ease-in-out;animation-iteration-count:infinite}
.tw{fill:${c.star ?? 'none'};animation-name:tw}.tw0{animation-duration:3.6s}.tw1{animation-duration:5.4s}.tw2{animation-duration:7.2s}
@keyframes tw{0%,100%{opacity:.9}50%{opacity:.2}}
.sh{fill:${c.reflection};animation-name:sh;transform-box:fill-box;transform-origin:center}.sh0{animation-duration:3.2s}.sh1{animation-duration:4.4s}.sh2{animation-duration:5.6s}
@keyframes sh{0%,100%{transform:translateX(-3px) scaleX(.92)}50%{transform:translateX(3px) scaleX(1.06)}}
.bob{animation-name:bob;animation-duration:3.2s}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(2.5px)}}
.line{animation-name:ln;animation-duration:3.2s;transform-box:fill-box;transform-origin:50% 0}
@keyframes ln{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.02)}}
.rp{fill:none;stroke:${c.ripple};stroke-width:.8;opacity:.3;animation-name:rp;animation-duration:3.9s;animation-timing-function:cubic-bezier(.2,.6,.3,1);transform-box:fill-box;transform-origin:center}
@keyframes rp{0%{transform:scale(.25);opacity:.75}100%{transform:scale(1.7);opacity:0}}
.fish{opacity:0;animation-name:fish;animation-duration:11s;animation-timing-function:linear}
@keyframes fish{0%,62%{transform:rotate(-62deg);opacity:0}62.5%{opacity:1}73%{transform:rotate(62deg);opacity:1}73.5%,100%{transform:rotate(62deg);opacity:0}}
.sp{fill:none;stroke:${c.ripple};stroke-width:.9;opacity:0;animation-duration:11s;animation-timing-function:cubic-bezier(.2,.6,.3,1);transform-box:fill-box;transform-origin:center}
.sp-out{animation-name:sp-out}.sp-in{animation-name:sp-in}
@keyframes sp-out{0%,63%{transform:scale(.3);opacity:0}64%{opacity:.8}72%,100%{transform:scale(1.8);opacity:0}}
@keyframes sp-in{0%,72%{transform:scale(.3);opacity:0}73%{opacity:.8}82%,100%{transform:scale(2);opacity:0}}
.drift{animation-name:drift;animation-duration:28s;animation-direction:alternate}
@keyframes drift{from{transform:translateX(0)}to{transform:translateX(-70px)}}
.flap{animation-name:flap;animation-duration:.9s;transform-box:fill-box;transform-origin:center}
@keyframes flap{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.45)}}
.tg{font:400 ${T.tagSize}px ${FONT_SANS};fill:${c.tagline};opacity:0;animation-name:tg;animation-duration:${cycle}s;animation-fill-mode:both;animation-timing-function:cubic-bezier(.2,.7,.2,1)}
.tg.first{opacity:1}
@keyframes tg{0%{opacity:0;transform:translateY(6px)}${pct(FADE)}%{opacity:1;transform:translateY(0)}${pct(slot - FADE)}%{opacity:1;transform:translateY(0)}${pct(slot)}%{opacity:0;transform:translateY(-6px)}100%{opacity:0;transform:translateY(-6px)}}
@media (prefers-reduced-motion:reduce){.a{animation:none!important}}
</style>
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.skyTop}"/><stop offset="1" stop-color="${c.skyHorizon}"/></linearGradient>
<linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.waterTop}"/><stop offset="1" stop-color="${c.waterBottom}"/></linearGradient>
<radialGradient id="glow"><stop offset="0" stop-color="${c.glow}" stop-opacity="${c.glowOpacity}"/><stop offset="1" stop-color="${c.glow}" stop-opacity="0"/></radialGradient>
<clipPath id="above"><rect width="${W}" height="${Y + 0.5}"/></clipPath>
<clipPath id="below"><rect y="${Y}" width="${W}" height="${H - Y}"/></clipPath>
</defs>
<rect width="${W}" height="${Y}" fill="url(#sky)"/>
<circle cx="${orb.x}" cy="${orb.y}" r="${orb.r * 7}" fill="url(#glow)"/>
${stars}
<circle cx="${orb.x}" cy="${orb.y}" r="${orb.r}" fill="${c.orb}"/>
${birds}
<path d="${ridge}" fill="${c.far}"/>
<path d="${farTrees}" fill="${c.far}"/>
<path d="${trees}" fill="${c.near}"/>
<rect y="${Y}" width="${W}" height="${H - Y}" fill="url(#water)"/>
<rect y="${Y}" width="${W}" height="1" fill="${c.horizon}" opacity=".7"/>
<g clip-path="url(#below)" opacity="${reflectionOpacity}"><g transform="translate(0 ${2 * Y + 2}) scale(1 -1)"><path d="${trees}" fill="${c.near}"/></g></g>
${glints}
<g clip-path="url(#below)" opacity="${reflectionOpacity}"><g transform="translate(0 ${2 * (wy + 4 * k)}) scale(1 -1) translate(${bx} ${wy}) scale(${k}) translate(${-bx} ${-wy})"><path d="${hull}" fill="${c.figure}"/></g></g>
${ripples}
${splashes}
${fish}
<g transform="translate(${bx} ${wy}) scale(${k}) translate(${-bx} ${-wy})">
${figure}
<path d="M${bx - 60} ${wy - 14.5}H${bx + 56}" stroke="${c.rim}" stroke-width=".8" opacity=".55"/>
${rod}
</g>
${line}
${bobber}
<text x="${T.x}" y="${T.label}" style="font:500 ${T.labelSize}px ${FONT_MONO};letter-spacing:.06em" fill="${c.label}">${esc(hero.handle)}</text>
<text x="${T.x - 2}" y="${T.name}" style="font:600 ${T.nameSize}px ${FONT_SANS};letter-spacing:-.025em" fill="${c.name}">${esc(hero.name)}</text>
<text x="${T.x}" y="${T.tagline}" style="font:500 ${T.tagSize}px ${FONT_MONO}" fill="${c.accent}">›</text>
${taglines}
</svg>
`;
}

/* ---------- README blocks ---------- */

const GLOBE = (color) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`;

const BADGE_BG = { dark: '161B22', light: 'F6F8FA' };

function badgeUrl(link, theme) {
  const label = encodeURIComponent(link.label.replace(/-/g, '--').replace(/_/g, '__'));
  const params = new URLSearchParams({ style: 'for-the-badge' });
  if (link.icon === 'globe') {
    const color = theme === 'dark' ? '8B949E' : '57606A';
    params.set('logo', `data:image/svg+xml;base64,${Buffer.from(GLOBE(color)).toString('base64')}`);
  } else {
    params.set('logo', link.logo);
    params.set('logoColor', link.logoColor);
  }
  return `https://img.shields.io/badge/${label}-${BADGE_BG[theme]}?${params.toString().replace(/&/g, '&amp;')}`;
}

function linksBlock() {
  const items = links.map(
    (l) =>
      `<a href="${esc(l.href)}"><picture><source media="(prefers-color-scheme: dark)" srcset="${badgeUrl(l, 'dark')}"><img alt="${esc(l.label)}" src="${badgeUrl(l, 'light')}"></picture></a>`,
  );
  return `<p align="center">\n  ${items.join('\n  ')}\n</p>`;
}

function stackBlock(loaded) {
  return stack
    .map((group, gi) => {
      const icons = loaded[gi]
        .map(
          (i) =>
            `<picture><source media="(prefers-color-scheme: dark)" srcset="${asset(`assets/icons/dark/${i.slug}.svg`)}"><img src="${asset(`assets/icons/light/${i.slug}.svg`)}" width="${ICON_SIZE}" height="${ICON_SIZE}" alt="${esc(i.name)}" title="${esc(i.name)}"></picture>`,
        )
        .join('&nbsp;\n');
      const names = [...loaded[gi].map((i) => i.name), ...(group.also ?? [])].map(esc).join(' · ');
      return `<h4>${esc(group.title)}</h4>\n<p>\n${icons}\n<br><sub>${names}</sub>\n</p>`;
    })
    .join('\n\n');
}

function heroBlock() {
  const alt = esc(`${hero.name} — ${hero.taglines[0]}. A fisherman in a boat on a quiet lake, waiting for a bite.`);
  return `<picture>
  <source media="(prefers-color-scheme: dark) and (max-width: 600px)" srcset="${asset('assets/hero/dark-compact.svg')}">
  <source media="(max-width: 600px)" srcset="${asset('assets/hero/light-compact.svg')}">
  <source media="(prefers-color-scheme: dark)" srcset="${asset('assets/hero/dark-wide.svg')}">
  <img src="${asset('assets/hero/light-wide.svg')}" width="100%" alt="${alt}">
</picture>`;
}

function replaceBlock(readme, name, content) {
  const re = new RegExp(`(<!-- ${name}:START -->)[\\s\\S]*?(<!-- ${name}:END -->)`);
  if (!re.test(readme)) throw new Error(`README.md: markers for ${name} not found`);
  return readme.replace(re, `$1\n${content}\n$2`);
}

/* ---------- main ---------- */

async function main() {
  const loaded = await Promise.all(stack.map((g) => Promise.all(g.items.map(loadIcon))));

  await rm(join(ROOT, 'assets/icons'), { recursive: true, force: true });
  for (const theme of THEMES) {
    const dir = join(ROOT, 'assets/icons', theme);
    await mkdir(dir, { recursive: true });
    for (const icon of loaded.flat()) {
      await writeFile(join(dir, `${icon.slug}.svg`), tileSvg({ ...icon, color: logoColor(icon.hex, theme) }, theme));
    }
  }

  const heroDir = join(ROOT, 'assets/hero');
  await mkdir(heroDir, { recursive: true });
  for (const theme of THEMES) {
    for (const layout of Object.keys(LAYOUT)) {
      await writeFile(join(heroDir, `${theme}-${layout}.svg`), heroSvg(theme, layout));
    }
  }

  const readmePath = join(ROOT, 'README.md');
  let readme = await readFile(readmePath, 'utf8');
  readme = replaceBlock(readme, 'HERO', heroBlock());
  readme = replaceBlock(readme, 'LINKS', linksBlock());
  readme = replaceBlock(readme, 'STACK', stackBlock(loaded));
  await writeFile(readmePath, readme);

  console.log(`✓ ${loaded.flat().length} icons × ${THEMES.length} themes, 4 hero variants, README blocks updated`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

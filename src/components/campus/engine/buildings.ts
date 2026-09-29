/**
 * Bâtiments du campus (construits face à +z, base à y = 0) : Direction, Bibliothèque, Salle de TD,
 * Amphithéâtre, Stade, et l'allée d'entrée (décor). Aucun élément ne s'anime.
 */
import { Group, Object3D, SphereGeometry } from 'three';
import { Batch, C, FONT, Kit, WinBatches, mat4 } from './kit';

export interface BuiltRoom {
  /** Maillages cliquables. */
  hit: Object3D[];
  /** Hauteur où poser l'étiquette. */
  top: number;
  /** Rafraîchissement ponctuel (horloge) ; renvoie true s'il faut redessiner. */
  update?: () => boolean;
}
export type Builder = (g: Group, K: Kit) => BuiltRoom;

export interface Parts { b: Batch; win: WinBatches; hit: Object3D[] }
export function start(K: Kit): Parts { return { b: K.batch(), win: { lit: K.batch(), dark: K.batch() }, hit: [] }; }
export function inFrame(s: Parts, m: ReturnType<typeof mat4>, fn: () => void) {
  s.b.frame = s.win.lit.frame = s.win.dark.frame = m; fn(); s.b.frame = s.win.lit.frame = s.win.dark.frame = null;
}
export function finish(g: Group, K: Kit, s: Parts, cast = true) {
  const m = s.b.mesh(K.MAT.body, { cast }); g.add(m); s.hit.push(m);
  for (const w of [s.win.lit, s.win.dark]) if (!w.empty) { const wm = w.mesh(K.MAT.win, { cast: false }); g.add(wm); s.hit.push(wm); }
  const l = s.b.lines(); if (l) g.add(l);
}
/** Toit plat avec acrotère. */
export function flatRoof(K: Kit, b: Batch, w: number, d: number, y: number) {
  K.box(b, w, 0.3, d, C.roof, 0, y, 0);
  K.box(b, w + 0.4, 1, 0.4, C.wallW, 0, y, d / 2, 0, true);
  K.box(b, w + 0.4, 1, 0.4, C.wallW, 0, y, -d / 2, 0, true);
  K.box(b, 0.4, 1, d, C.wallW, w / 2, y, 0, 0, true);
  K.box(b, 0.4, 1, d, C.wallW, -w / 2, y, 0, 0, true);
}
/** Cadran d'horloge à l'heure réelle. */
export function drawClock(c: CanvasRenderingContext2D, w: number) {
  const r = w / 2 - 6;
  const hand = (a: number, len: number, wd: number) => {
    c.save(); c.rotate(a); c.strokeStyle = '#1a1a1a'; c.lineCap = 'round'; c.lineWidth = wd;
    c.beginPath(); c.moveTo(0, 12); c.lineTo(0, -len); c.stroke(); c.restore();
  };
  c.save(); c.translate(w / 2, w / 2);
  c.fillStyle = '#fbfaf7'; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  c.lineWidth = 10; c.strokeStyle = '#c0892f'; c.stroke();
  for (let i = 0; i < 12; i++) { c.save(); c.rotate(i * Math.PI / 6); c.fillStyle = '#1a1a1a'; c.fillRect(-3, -r + 18, 6, i % 3 ? 12 : 24); c.restore(); }
  const d = new Date(), h = d.getHours() % 12, m = d.getMinutes();
  hand((h + m / 60) * Math.PI / 6, r * 0.5, 10); hand(m * Math.PI / 30, r * 0.74, 6);
  c.fillStyle = '#c0892f'; c.beginPath(); c.arc(0, 0, 10, 0, Math.PI * 2); c.fill();
  c.restore();
}

/* ---------------- La Direction : statistiques ---------------- */
const direction: Builder = (g, K) => {
  const s = start(K), { b, win } = s;
  const W = 24, D = 13, FL = 5, FH = 3.2, H = FL * FH + 0.5;
  K.box(b, W + 1.4, 0.5, D + 1.4, C.stone, 0, 0, 0, 0, true);
  K.box(b, W, H - 0.5, D, C.wall, 0, 0.5, 0, 0, true);
  flatRoof(K, b, W, D, H);
  K.facade(b, win, { x0: -11.9, z: D / 2, bays: 3, bayW: 2.8, floors: FL, fh: FH, y0: 0.5, seed: 3 });
  K.facade(b, win, { x0: 3.5, z: D / 2, bays: 3, bayW: 2.8, floors: FL, fh: FH, y0: 0.5, seed: 5 });
  inFrame(s, mat4(0, 0, 0, Math.PI), () => K.facade(b, win, { x0: -12, z: D / 2, bays: 8, bayW: 3, floors: FL, fh: FH, y0: 0.5, seed: 7 }));
  for (const sgn of [1, -1]) inFrame(s, mat4(0, 0, 0, sgn * Math.PI / 2), () => K.facade(b, win, { x0: -6, z: W / 2, bays: 4, bayW: 3, floors: FL, fh: FH, y0: 0.5, seed: 11 + sgn }));
  // Tour centrale : mur-rideau vitré, ailettes dorées, horloge
  const TH = H + 4.5, TZ = D / 2 + 1.2;
  K.box(b, 6.8, TH, D + 2.4, C.wallW, 0, 0, 0, 0, true);
  K.box(b, 7.2, 0.8, D + 2.8, C.wallW, 0, TH, 0, 0, true);
  K.box(win.lit, 2.6, H - 4.2, 0.12, C.glass, 0, 4, TZ + 0.02);
  for (let f = 1; f < FL; f++) K.box(b, 2.8, 0.22, 0.3, C.wallW, 0, 0.5 + f * FH + 0.4, TZ + 0.1);
  for (const x of [-1.75, 1.75]) K.box(b, 0.32, H - 1.2, 0.5, C.gold, x, 1, TZ + 0.2);
  K.box(win.dark, 3.2, 3, 0.12, C.glass, 0, 0.5, TZ + 0.02);
  K.box(b, 8, 0.35, 2.8, C.gold, 0, 3.8, TZ + 1.3, 0, true);
  for (const x of [-3.6, 3.6]) K.box(b, 0.3, 3.3, 0.3, C.dark, x, 0.5, TZ + 2.5);
  K.box(b, 10, 0.25, 2.4, C.stone, 0, 0, TZ + 3.2);
  K.box(b, 10, 0.25, 1.2, C.stone, 0, 0.25, TZ + 2.4);
  K.box(b, 2.4, 1.3, 2, C.trim, -8, H + 0.3, -2, 0, true);
  K.box(b, 1.6, 1, 1.6, C.trim, 8.5, H + 0.3, 1.5, 0, true);
  K.cyl(b, 0.08, 5, C.dark, 2.6, TH + 0.8, -4, 6);
  K.box(b, 2.4, 1.4, 0.06, C.gold, 3.8, TH + 4.4, -4);
  const clock = K.tex(256, 256, drawClock);
  K.panel(g, 3.2, 3.2, clock, 0, H + 2.2, TZ + 0.05, { transparent: true });
  finish(g, K, s);
  let lastMin = new Date().getMinutes();
  return {
    hit: s.hit, top: TH + 6,
    update() {
      const m = new Date().getMinutes();
      if (m === lastMin) return false;
      lastMin = m; K.redraw(clock); return true;
    },
  };
};

/* ---------------- La Bibliothèque : leçons ---------------- */
const bibliotheque: Builder = (g, K) => {
  const s = start(K), { b, win } = s;
  const W = 22, D = 12, FL = 3, FH = 3.4, H = FL * FH + 0.5;
  K.box(b, W + 1.2, 0.5, D + 1.2, C.stone, 0, 0, 0, 0, true);
  K.box(b, W, H - 0.5, D, C.wall, 0, 0.5, 0, 0, true);
  K.box(b, W + 0.8, 0.5, D + 0.8, C.wallW, 0, H, 0, 0, true);
  b.add(K.hipRoof(W + 0.6, D + 0.6, 3.8), mat4(0, H + 0.5, 0), C.roofHip, true);
  K.facade(b, win, { x0: -10.9, z: D / 2, bays: 2, bayW: 3.3, floors: FL, fh: FH, y0: 0.5, seed: 2 });
  K.facade(b, win, { x0: 4.3, z: D / 2, bays: 2, bayW: 3.3, floors: FL, fh: FH, y0: 0.5, seed: 4 });
  inFrame(s, mat4(0, 0, 0, Math.PI), () => K.facade(b, win, { x0: -10.8, z: D / 2, bays: 6, bayW: 3.6, floors: FL, fh: FH, y0: 0.5, seed: 6 }));
  for (const sgn of [1, -1]) inFrame(s, mat4(0, 0, 0, sgn * Math.PI / 2), () => K.facade(b, win, { x0: -5.7, z: W / 2, bays: 3, bayW: 3.8, floors: FL, fh: FH, y0: 0.5, seed: 8 + sgn }));
  // Rotonde d'entrée à redans
  const R = 4.4, BZ = D / 2;
  b.add(K.GEO.half16, mat4(0, 0.5, BZ, 0, R, H + 1.2, R), C.wallW, true);
  b.add(K.GEO.half16, mat4(0, H + 1.7, BZ, 0, R + 0.3, 0.4, R + 0.3), C.wallW, true);
  b.add(K.GEO.half16, mat4(0, H + 2.1, BZ, 0, R - 0.9, 1.1, R - 0.9), C.wall, true);
  b.add(K.GEO.half16, mat4(0, H + 3.2, BZ, 0, R - 0.6, 0.3, R - 0.6), C.wallW, true);
  for (let f = 0; f < FL; f++) for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i + 0.5) * Math.PI / 5;
    const m = mat4(Math.sin(a) * (R + 0.02), 0.5 + f * FH + 1.0, BZ + Math.cos(a) * (R + 0.02), a, 1.3, 1.9, 0.12);
    (f === 0 && i === 2 ? win.dark : win.lit).add(K.GEO.box, m, C.glass);
  }
  K.box(b, 5.6, 0.3, 1.8, C.gold, 0, 3.3, BZ + R + 0.7, 0, true);
  const sign = K.tex(1024, 96, (c, w, h) => {
    c.fillStyle = '#1a1a1a'; c.font = `600 60px ${FONT.serif}`; c.textBaseline = 'middle';
    K.spaced(c, 'BIBLIOTHÈQUE', w / 2, h / 2 + 4, 16);
  });
  K.panel(g, 5.2, 0.5, sign, 0, 3.9, BZ + R + 0.2, { transparent: true });
  const pi = K.tex(128, 128, (c, w, h) => {
    c.fillStyle = '#c0892f'; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#1a1a1a'; c.font = `italic 600 86px ${FONT.serif}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('π', w / 2, h / 2 + 2);
  });
  K.panel(g, 1.5, 1.5, pi, 0, H + 2.65, BZ + R - 0.8, { transparent: true });
  K.box(b, 7, 0.25, 1.6, C.stone, 0, 0, BZ + R + 1.6);
  finish(g, K, s);
  return { hit: s.hit, top: H + 8 };
};

/* ---------------- La Salle de TD : exercices ---------------- */
function drawBoard(c: CanvasRenderingContext2D, w: number, h: number) {
  c.fillStyle = '#2f4739'; c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(255,255,255,.035)';
  for (let i = 0; i < 40; i++) c.fillRect((i * 173) % w, (i * 97) % h, 120, 3);
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  c.fillStyle = '#f4efe4'; c.font = `italic 500 66px ${FONT.serif}`; c.fillText('f(x) = x³ − 3x + 1', 50, 108);
  c.fillStyle = 'rgba(244,239,228,.85)'; c.font = `italic 500 50px ${FONT.serif}`;
  c.fillText('f′(x) = 3x² − 3', 50, 196); c.fillText('f′(x) = 0  ⇔  x = ±1', 50, 272);
  c.fillStyle = 'rgba(244,239,228,.6)'; c.font = `500 30px ${FONT.sans}`; c.fillText('Étude de fonction', 50, 420);
  const X0 = 640, X1 = 990, Y0 = 50, Y1 = 440;
  const sx = (x: number) => X0 + (x + 2.3) / 4.6 * (X1 - X0), sy = (y: number) => Y1 - (y + 3.6) / 9.2 * (Y1 - Y0);
  c.strokeStyle = 'rgba(244,239,228,.45)'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(X0, sy(0)); c.lineTo(X1, sy(0)); c.moveTo(sx(0), Y0); c.lineTo(sx(0), Y1); c.stroke();
  c.strokeStyle = '#e6c67c'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath();
  for (let i = 0; i <= 80; i++) { const x = -2.2 + i * 4.4 / 80, y = x * x * x - 3 * x + 1; if (i) c.lineTo(sx(x), sy(y)); else c.moveTo(sx(x), sy(y)); }
  c.stroke();
  c.fillStyle = '#f4efe4';
  for (const x of [-1, 1]) { c.beginPath(); c.arc(sx(x), sy(x * x * x - 3 * x + 1), 9, 0, Math.PI * 2); c.fill(); }
}

const td: Builder = (g, K) => {
  const s = start(K), { b, win } = s;
  const W = 16, D = 12, FL = 4, FH = 3.2, H = FL * FH + 0.5;
  K.box(b, W + 1.2, 0.5, D + 1.2, C.stone, 0, 0, 0, 0, true);
  K.box(b, W, H - 0.5, D, C.wall, 0, 0.5, 0, 0, true);
  flatRoof(K, b, W, D, H);
  K.facade(b, win, { x0: -7.5, z: D / 2, bays: 5, bayW: 3, floors: FL - 1, fh: FH, y0: 0.5 + FH, seed: 13 });
  K.facade(b, win, { x0: 1.5, z: D / 2, bays: 2, bayW: 3, floors: 1, fh: FH, y0: 0.5, pil: false, seed: 17 });
  inFrame(s, mat4(0, 0, 0, Math.PI), () => K.facade(b, win, { x0: -7.5, z: D / 2, bays: 5, bayW: 3, floors: FL, fh: FH, y0: 0.5, seed: 19 }));
  for (const sgn of [1, -1]) inFrame(s, mat4(0, 0, 0, sgn * Math.PI / 2), () => K.facade(b, win, { x0: -6, z: W / 2, bays: 4, bayW: 3, floors: FL, fh: FH, y0: 0.5, seed: 21 + sgn }));
  K.box(win.dark, 2.4, 2.7, 0.12, C.glass, 0, 0.5, D / 2 + 0.02);
  K.box(b, 4.2, 0.3, 2, C.dark, 0, 3.3, D / 2 + 1, 0, true);
  K.box(b, 6.6, 3.1, 0.25, C.wood, -4.6, 0.6, D / 2 + 0.12, 0, true);
  K.panel(g, 6.2, 2.75, K.tex(1024, 456, drawBoard), -4.6, 2.15, D / 2 + 0.27);
  K.box(b, 3, 1.2, 2.2, C.trim, 3.5, H + 0.3, -2, 0, true);
  K.box(b, 1.4, 0.9, 1.4, C.trim, -4.5, H + 0.3, 1.5, 0, true);
  finish(g, K, s);
  return { hit: s.hit, top: H + 5 };
};

/* ---------------- L'Amphithéâtre : examens ---------------- */
const amphi: Builder = (g, K) => {
  const s = start(K), { b, win } = s;
  const W = 18, D = 13, H = 9;
  K.box(b, W + 1.2, 0.5, D + 1.2, C.stone, 0, 0, 0, 0, true);
  K.box(b, W, H - 0.5, D, C.wall, 0, 0.5, 0, 0, true);
  K.box(b, W + 0.6, 0.5, D + 0.6, C.wallW, 0, H, 0, 0, true);
  b.add(K.GEO.half16, mat4(0, H + 0.5, D / 2, 0, W / 2, D, 3.2, -Math.PI / 2), C.roofHip, true);
  K.box(win.lit, 12, 3.4, 0.12, C.glass, 0, 0.6, D / 2 + 0.02);
  K.box(win.dark, W - 1, 3.6, 0.12, C.glass, 0, 4.6, D / 2 + 0.02);
  for (let x = -W / 2 + 0.6; x <= W / 2 - 0.5; x += 1.15) K.box(b, 0.26, 4.2, 0.6, C.wallW, x, 4.3, D / 2 + 0.25);
  for (const sgn of [1, -1]) inFrame(s, mat4(0, 0, 0, sgn * Math.PI / 2), () => {
    K.box(win.dark, D - 1.5, 5.6, 0.12, C.glass, 0, 2.2, W / 2 + 0.02);
    for (let x = -D / 2 + 0.8; x <= D / 2 - 0.7; x += 1.15) K.box(b, 0.26, 6.4, 0.6, C.wallW, x, 1.9, W / 2 + 0.25);
  });
  K.box(b, 14, 0.4, 3.2, C.dark, 0, 4.0, D / 2 + 1.6, 0, true);
  K.box(b, 14.2, 0.12, 3.3, C.gold, 0, 3.92, D / 2 + 1.6);
  for (const x of [-6.6, 6.6]) K.box(b, 0.3, 3.5, 0.3, C.dark, x, 0.5, D / 2 + 3);
  K.box(b, 14, 0.25, 2.6, C.stone, 0, 0, D / 2 + 3.6);
  K.box(b, 14, 0.25, 1.4, C.stone, 0, 0.25, D / 2 + 2.9);
  const sign = K.tex(640, 72, (c, w, h) => {
    c.fillStyle = '#1a1a1a'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#e6b95e'; c.font = `600 32px ${FONT.sans}`; c.textBaseline = 'middle';
    K.spaced(c, 'AMPHITHÉÂTRE · EXAMENS', w / 2, h / 2 + 2, 4);
  });
  K.panel(g, 7.2, 0.8, sign, 0, 4.9, D / 2 + 3.25);
  finish(g, K, s);
  return { hit: s.hit, top: H + 6.5 };
};

/* ---------------- Le Stade : parcours ---------------- */
function drawTrack(c: CanvasRenderingContext2D, w: number, h: number) {
  c.fillStyle = '#b3b276'; c.fillRect(0, 0, w, h);
  const u = w / 42, r = h / 2 - 4;
  const stadium = (inset: number) => {
    const rr = r - inset; c.beginPath();
    c.moveTo(r + 4, inset + 4); c.lineTo(w - r - 4, inset + 4);
    c.arc(w - r - 4, h / 2, rr, -Math.PI / 2, Math.PI / 2);
    c.lineTo(r + 4, h - inset - 4);
    c.arc(r + 4, h / 2, rr, Math.PI / 2, Math.PI * 1.5);
    c.closePath();
  };
  c.fillStyle = '#b86a4c'; stadium(0); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 2.5;
  for (let i = 0; i <= 6; i++) { stadium(i * 0.6 * u); c.stroke(); }
  c.save(); stadium(3.6 * u); c.clip();
  const fx = 4 + 3.6 * u, fw = w - 2 * fx;
  for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#6f9a4e' : '#79a456'; c.fillRect(fx + i * fw / 16, 0, fw / 16 + 1, h); }
  c.restore();
  const L = 7.2 * u, T0 = 6.2 * u, R0 = w - 7.2 * u, B0 = h - 6.2 * u;
  c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 3.5;
  c.strokeRect(L, T0, R0 - L, B0 - T0);
  c.beginPath(); c.moveTo(w / 2, T0); c.lineTo(w / 2, B0); c.stroke();
  c.beginPath(); c.arc(w / 2, h / 2, 2.6 * u, 0, Math.PI * 2); c.stroke();
  for (const right of [false, true]) {
    c.strokeRect(right ? R0 - 4 * u : L, h / 2 - 4.5 * u, 4 * u, 9 * u);
    c.strokeRect(right ? R0 - 1.6 * u : L, h / 2 - 2.2 * u, 1.6 * u, 4.4 * u);
  }
}
function drawScore(K: Kit) {
  return (c: CanvasRenderingContext2D, w: number) => {
    c.fillStyle = '#121211'; c.fillRect(0, 0, w, 256);
    c.textBaseline = 'middle';
    c.fillStyle = '#e6b95e'; c.font = `600 28px ${FONT.sans}`; K.spaced(c, 'LE STADE', w / 2, 46, 6);
    c.fillStyle = '#f1ede6'; c.font = `600 64px ${FONT.serif}`; c.textAlign = 'center'; c.fillText('Parcours', w / 2, 126);
    c.fillStyle = '#9d978b'; c.font = `500 24px ${FONT.mono}`; c.fillText('VIDÉO · QUIZ · CHAPITRE', w / 2, 206);
  };
}
/** Point sur l'ovale (droites + demi-cercles centrés en x = ±9.1), abscisse curviligne s. */
function stadiumAt(s: number, R: number): [number, number] {
  const S = 18.2, A = Math.PI * R, L = 2 * S + 2 * A;
  s = ((s % L) + L) % L;
  if (s < S) return [-9.1 + s, R];
  s -= S; if (s < A) { const a = s / R; return [9.1 + R * Math.sin(a), R * Math.cos(a)]; }
  s -= A; if (s < S) return [9.1 - s, -R];
  s -= S; const a = s / R; return [-9.1 - R * Math.sin(a), -R * Math.cos(a)];
}

const stade: Builder = (g, K) => {
  const b = K.batch(), hit: Object3D[] = [];
  const track = K.panel(g, 42, 24, K.tex(1344, 768, drawTrack), 0, 0.06, 0, { rx: -Math.PI / 2 });
  track.receiveShadow = true; hit.push(track);
  for (const sx of [-1, 1]) {
    const x = sx * 13.9;
    K.cyl(b, 0.1, 2.2, C.white, x, 0, -2.3, 6); K.cyl(b, 0.1, 2.2, C.white, x, 0, 2.3, 6);
    K.box(b, 0.2, 0.2, 4.8, C.white, x, 2.15, 0);
  }
  // Tribune couverte et tableau
  for (let i = 0; i < 4; i++) K.box(b, 20, 0.55 * (i + 1), 0.95, i % 2 ? C.trim : C.stone, 0, 0, -12.6 - i * 0.95, 0, true);
  for (const x of [-9.6, 0, 9.6]) K.box(b, 0.3, 4.6, 0.3, C.dark, x, 0, -16);
  K.box(b, 21, 0.3, 4.4, C.wallW, 0, 4.6, -14.2, 0, true);
  K.box(b, 5.4, 2.6, 0.3, C.dark, 0, 4.9, -12.3, 0, true);
  hit.push(K.panel(g, 5, 2.4, K.tex(512, 256, drawScore(K)), 0, 6.2, -12.13));
  // Projecteurs aux quatre coins (éteints : c'est le jour)
  const bulbs = K.batch();
  for (const [x, z] of [[-22, -13.5], [22, -13.5], [-22, 13.5], [22, 13.5]]) {
    const ry = Math.atan2(-x, -z);
    K.cyl(b, 0.22, 14, C.dark, x, 0, z, 6);
    const m = mat4(x, 14, z, ry);
    b.frame = m; bulbs.frame = m;
    K.box(b, 2.6, 1.6, 0.4, C.dark, 0, 0, 0);
    for (const px of [-0.7, 0.7]) for (const py of [0.45, 1.15]) K.box(bulbs, 0.55, 0.5, 0.1, 0xf4ecd8, px, py - 0.25, 0.22);
    b.frame = bulbs.frame = null;
  }
  g.add(bulbs.mesh(K.MAT.bulb, { cast: false }));
  // Six fanions dorés autour de la piste (décor)
  const R = 7.9, L = 2 * 18.2 + 2 * Math.PI * R;
  for (let i = 0; i < 6; i++) {
    const [x, z] = stadiumAt(L * (i + 0.5) / 6, R);
    K.cyl(b, 0.07, 2.6, C.dark, x, 0, z, 6);
    K.box(b, 1.1, 0.7, 0.05, C.gold, x + 0.55, 1.9, z);
  }
  const body = b.mesh(); g.add(body); hit.push(body);
  const l = b.lines(); if (l) g.add(l);
  return { hit, top: 9 };
};

/* ---------------- L'allée d'entrée (décor, non cliquable) ---------------- */
export function buildAlley(g: Group, K: Kit) {
  const b = K.batch();
  K.box(b, 5, 0.08, 34, C.walk, 0, 0, -1);
  for (const sx of [-1, 1]) K.box(b, 0.25, 0.14, 34, C.stone, sx * 2.6, 0, -1);
  for (const sx of [-1, 1]) {
    K.box(b, 1.7, 6.2, 1.7, C.brick, sx * 4.4, 0, 16, 0, true);
    K.box(b, 2.1, 0.4, 2.1, C.wallW, sx * 4.4, 6.2, 16, 0, true);
  }
  K.box(b, 11, 1, 1.1, C.gold, 0, 5.4, 16, 0, true);
  const sign = K.tex(512, 64, (c, w, h) => {
    c.fillStyle = '#1a1a1a'; c.font = `700 46px ${FONT.serif}`; c.textBaseline = 'middle';
    K.spaced(c, 'FIDNI', w / 2, h / 2 + 3, 16);
  });
  K.panel(g, 4.2, 0.62, sign, 0, 5.9, 16.58, { transparent: true });
  for (let i = 0; i < 6; i++) {
    const z = 12 - i * 5.2;
    K.tree(b, 5.2, z + 2.4, 0.95 + ((i + 1) % 3) * 0.1, C.cherry[(i + 1) % 3], 'round', i);
    if (z > 10) K.tree(b, -5.2, z, 0.95 + (i % 3) * 0.1, C.cherry[i % 3], 'round', i + 3);
  }
  for (const z of [5, -4.5]) K.box(b, 0.6, 0.5, 2, C.wood, 3.6, 0, z, 0, true);
  g.add(b.mesh());
  const l = b.lines(); if (l) g.add(l);
}

/** Demi-sphère (coupole) : utilitaire partagé avec annex.ts. */
export function domeGeometry(K: Kit) { return K.own(new SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)); }

export const BUILDERS_A = { direction, bibliotheque, td, amphi, stade };

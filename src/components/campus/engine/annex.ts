/** La Gare (concours), le Labo (Skill IQ), le Pavillon des classes. Construits face à +z. */
import { C, FONT, mat4 } from './kit';
import { Builder, domeGeometry, drawClock, finish, flatRoof, inFrame, start } from './buildings';

/* ---------------- La Gare : concours ---------------- */
const gare: Builder = (g, K) => {
  const s = start(K), { b, win } = s;
  const W = 14, D = 5.5;
  K.box(b, W + 0.8, 0.4, D + 0.8, C.stone, 0, 0, 0, 0, true);
  K.box(b, W, 1.3, D, C.brick, 0, 0.4, 0, 0, true);
  K.box(b, W, 3.6, D, C.wall, 0, 1.7, 0, 0, true);
  K.box(b, W + 0.5, 0.3, D + 0.5, C.wallW, 0, 5.3, 0, 0, true);
  b.add(K.hipRoof(W + 0.7, D + 0.7, 2.2), mat4(0, 5.6, 0), C.roofHip, true);
  for (const x0 of [-6.4, 3]) K.facade(b, win, { x0, z: D / 2, bays: 1, bayW: 3.4, floors: 1, fh: 3.6, y0: 1.7, pil: false, band: false, seed: 31 });
  // Hall central avec horloge et enseigne, côté campus
  K.box(b, 5, 7.4, D + 1, C.wallW, 0, 0.4, 0, 0, true);
  b.add(K.hipRoof(5.6, D + 1.6, 2.2), mat4(0, 7.8, 0), C.roofDark, true);
  K.box(win.dark, 2.6, 3.2, 0.12, C.glass, 0, 0.4, D / 2 + 0.52);
  K.panel(g, 1.9, 1.9, K.tex(256, 256, drawClock), 0, 5.7, D / 2 + 0.56, { transparent: true });
  const sign = K.tex(512, 72, (c, w, h) => {
    c.fillStyle = '#1a1a1a'; c.font = `700 44px ${FONT.serif}`; c.textBaseline = 'middle';
    K.spaced(c, 'GARE', w / 2, h / 2 + 3, 14);
  });
  K.panel(g, 2.6, 0.5, sign, 0, 4.1, D / 2 + 0.56, { transparent: true });
  // Quai, marquise, voie à butoirs, train à quai (immobile)
  const PZ = -D / 2 - 1.4, RZ = -D / 2 - 4.5;
  K.box(b, 30, 0.9, 2.8, C.stone, 0, 0, PZ, 0, true);
  K.box(b, 30, 0.03, 0.25, C.gold, 0, 0.9, PZ - 1.2);
  K.box(b, 22, 0.2, 3.4, C.roofDark, 0, 4.4, PZ - 0.2, 0, true);
  for (let x = -9; x <= 9; x += 6) K.cyl(b, 0.1, 3.5, C.dark, x, 0.9, PZ - 1, 6);
  K.box(b, 30, 0.1, 3.4, C.stone, 0, 0, RZ);
  for (let x = -14.5; x <= 14.5; x += 1.4) K.box(b, 0.42, 0.1, 2.6, C.wood, x, 0.1, RZ);
  for (const dz of [-0.72, 0.72]) K.box(b, 30, 0.16, 0.14, C.rail, 0, 0.2, RZ + dz);
  for (const x of [-15, 15]) K.box(b, 0.6, 1.1, 2.6, C.brick, x, 0, RZ, 0, true);
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 8.4;
    K.box(b, 8, 3, 2.9, C.wallW, x, 0.55, RZ, 0, true);
    K.box(b, 8, 0.5, 2.94, C.brand, x, 1.1, RZ);
    K.box(b, 8, 0.1, 2.95, C.gold, x, 1.7, RZ);
    K.box(win.lit, 6.8, 0.8, 2.97, C.glass, x, 2, RZ);
    K.box(b, 7.6, 0.3, 2.6, C.roof, x, 3.55, RZ);
  }
  // Tableau des départs, tourné vers la caméra
  const board = K.tex(640, 320, (c, w, h) => {
    c.fillStyle = '#121211'; c.fillRect(0, 0, w, h);
    c.textBaseline = 'middle';
    c.fillStyle = '#e6b95e'; c.font = `600 30px ${FONT.sans}`; K.spaced(c, 'DÉPARTS', w / 2, 38, 8);
    ['ENSA', 'ENSAM', 'MÉDECINE'].forEach((d, i) => {
      const y = 104 + i * 58;
      c.fillStyle = '#f1ede6'; c.font = `500 36px ${FONT.mono}`; c.textAlign = 'left'; c.fillText(d, 30, y);
      c.fillStyle = '#9d978b'; c.font = `500 24px ${FONT.mono}`; c.textAlign = 'right'; c.fillText(`VOIE ${i + 1}`, w - 30, y);
    });
    c.fillStyle = '#9d978b'; c.font = `500 18px ${FONT.mono}`; c.textAlign = 'left'; c.fillText('CONCOURS D’ENTRÉE', 30, h - 24);
  });
  K.box(b, 0.3, 2, 0.3, C.dark, 12.8, 0.9, PZ);
  K.box(b, 3.9, 2.2, 0.2, C.dark, 12.8, 2.6, PZ, Math.PI / 2, true);
  K.panel(g, 3.6, 1.8, board, 12.92, 3.7, PZ, { ry: Math.PI / 2 });
  finish(g, K, s);
  return { hit: s.hit, top: 11 };
};

/* ---------------- Le Labo : Skill IQ ---------------- */
const labo: Builder = (g, K) => {
  const s = start(K), { b, win } = s;
  const W = 9, D = 15, FL = 2, FH = 3.4, H = FL * FH + 0.5;
  K.box(b, W + 1, 0.5, D + 1, C.stone, 0, 0, 0, 0, true);
  K.box(b, W, H - 0.5, D, C.wall, 0, 0.5, 0, 0, true);
  flatRoof(K, b, W, D, H);
  K.facade(b, win, { x0: -4.2, z: D / 2, bays: 3, bayW: 2.8, floors: 1, fh: FH, y0: 0.5 + FH, seed: 41 });
  for (const x0 of [-4.2, 1.4]) K.facade(b, win, { x0, z: D / 2, bays: 1, bayW: 2.8, floors: 1, fh: FH, y0: 0.5, pil: false, seed: 43 });
  K.box(win.dark, 1.8, 2.7, 0.12, C.glass, 0, 0.5, D / 2 + 0.02);
  K.box(b, 3.4, 0.25, 1.6, C.dark, 0, 3.3, D / 2 + 0.8, 0, true);
  for (const sgn of [1, -1]) inFrame(s, mat4(0, 0, 0, sgn * Math.PI / 2), () => K.facade(b, win, { x0: -7, z: W / 2, bays: 5, bayW: 2.8, floors: FL, fh: FH, y0: 0.5, seed: 47 + sgn }));
  // Coupole d'observatoire et sa fente
  K.cyl(b, 3.1, 1.4, C.wallW, 0, H + 0.5, -3.2, 24, true);
  b.add(domeGeometry(K), mat4(0, H + 1.9, -3.2, 0, 3.1, 3.1, 3.1), C.trim);
  b.add(K.GEO.box, mat4(0, H + 2.1, -0.6, 0, 0.9, 2.9, 0.35, -0.75), C.dark);
  // Panneau « Skill IQ » devant l'entrée
  const gauss = K.tex(512, 294, (c, w, h) => {
    c.fillStyle = '#fbfaf7'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1a1a1a'; c.font = `600 34px ${FONT.serif}`; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    c.fillText('Skill IQ', 24, 48);
    c.fillStyle = '#6b6862'; c.font = `500 18px ${FONT.mono}`; c.fillText('MESURE TON NIVEAU', 24, 76);
    const X0 = 24, X1 = w - 24, Y0 = h - 30, top = 100;
    const gx = (u: number) => X0 + (u + 3) / 6 * (X1 - X0), gy = (u: number) => Y0 - Math.exp(-u * u / 2) * (Y0 - top);
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 4; c.beginPath();
    for (let i = 0; i <= 120; i++) { const u = -3 + i * 0.05; if (i) c.lineTo(gx(u), gy(u)); else c.moveTo(gx(u), gy(u)); }
    c.stroke();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 2; c.beginPath(); c.moveTo(X0, Y0); c.lineTo(X1, Y0); c.stroke();
  });
  for (const x of [-4.6, -1.4]) K.box(b, 0.14, 2.6, 0.14, C.dark, x, 0, D / 2 + 3);
  K.box(b, 3.5, 2.1, 0.12, C.dark, -3, 1.1, D / 2 + 2.93);
  K.panel(g, 3.3, 1.9, gauss, -3, 2.15, D / 2 + 3.0);
  finish(g, K, s);
  return { hit: s.hit, top: H + 6 };
};

/* ---------------- Le Pavillon des classes ---------------- */
const classes: Builder = (g, K) => {
  const s = start(K), { b, win } = s;
  const W = 16, D = 7, FL = 2, FH = 3.6, H = FL * FH + 0.5;
  K.box(b, W + 1, 0.5, D + 1, C.stone, 0, 0, 0, 0, true);
  K.box(b, W, H - 0.5, D, C.wall, 0, 0.5, 0, 0, true);
  flatRoof(K, b, W, D, H);
  K.facade(b, win, { x0: -7.6, z: D / 2, bays: 4, bayW: 3.8, floors: FL, fh: FH, y0: 0.5, winW: 2.6, winH: 2.1, seed: 53 });
  for (let k = 0; k < 3; k++) K.box(b, W - 0.4, 0.1, 0.55, C.wood, 0, 0.5 + FH + FH * 0.92 + k * 0.22, D / 2 + 0.45);
  K.box(win.dark, 1.1, 2.6, 0.12, C.glass, 0, 0.5, D / 2 + 0.4);
  K.box(b, 3, 0.2, 1.6, C.dark, 0, 3.15, D / 2 + 0.9, 0, true);
  const sign = K.tex(512, 72, (c, w, h) => {
    c.fillStyle = '#1a1a1a'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#f1ede6'; c.font = `600 34px ${FONT.sans}`; c.textBaseline = 'middle';
    K.spaced(c, 'CLASSES', w / 2, h / 2 + 2, 8);
  });
  K.panel(g, 3.2, 0.56, sign, 0, 3.75, D / 2 + 0.42);
  for (const sgn of [1, -1]) inFrame(s, mat4(0, 0, 0, sgn * Math.PI / 2), () => K.facade(b, win, { x0: -3.5, z: W / 2, bays: 2, bayW: 3.5, floors: FL, fh: FH, y0: 0.5, seed: 59 + sgn }));
  finish(g, K, s);
  return { hit: s.hit, top: H + 5 };
};

export const BUILDERS_B = { gare, labo, classes };

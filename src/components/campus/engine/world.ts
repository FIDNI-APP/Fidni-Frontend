/** Le campus limité à son enceinte : socle de maquette, clôture, cour, passerelles, arbres, bâtiments. */
import {
  CircleGeometry, Group, Mesh, MeshLambertMaterial, PlaneGeometry, RepeatWrapping, Scene, Vector3,
} from 'three';
import type { RoomId } from '../campusRooms';
import { C, Kit } from './kit';
import { BUILDERS_A, BuiltRoom, buildAlley } from './buildings';
import { BUILDERS_B } from './annex';

const BUILDERS = { ...BUILDERS_A, ...BUILDERS_B };

/** Position (x, z), orientation et ancre locale de l'étiquette (x, z). */
const PLACE: Record<RoomId, { x: number; z: number; face: number; a: [number, number] }> = {
  direction:    { x: 0,    z: -20, face: 0,            a: [0, 2] },
  bibliotheque: { x: -29,  z: -16, face: 0,            a: [0, 4] },
  td:           { x: 26,   z: -18, face: 0,            a: [0, 0] },
  amphi:        { x: -17,  z: 17,  face: Math.PI / 2,  a: [0, 5] },
  stade:        { x: 17,   z: 19,  face: 0,            a: [0, -14] },
  gare:         { x: 42.5, z: 18,  face: -Math.PI / 2, a: [0, -3] },
  labo:         { x: 41,   z: -22, face: 0,            a: [0, -2] },
  classes:      { x: -41,  z: 17,  face: Math.PI / 2,  a: [0, -3] },
};
const PLOT = { x: 52, z: 34 }, MARGIN = 4;

export interface PlacedRoom extends BuiltRoom {
  id: RoomId; group: Group; face: number; anchorLocal: Vector3;
  hover: number; pop: number; bornAt: number;
}

export function buildCampus(scene: Scene, K: Kit) {
  let seed = 23;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];

  /* Le sol s'étend jusqu'à l'horizon et se fond dans la brume dorée ; seule l'enceinte est construite. */
  const w = 2 * (PLOT.x + MARGIN);
  const ground = new Mesh(new CircleGeometry(900, 64).rotateX(-Math.PI / 2), new MeshLambertMaterial({ color: C.grass }));
  ground.position.y = -0.03; ground.receiveShadow = true; scene.add(ground);

  const low = K.batch(), b = K.batch(), win = K.batch(), bulbs = K.batch();
  for (const sz of [-1, 1]) K.box(low, w - 2, 0.1, MARGIN - 1, C.walk, 0, 0, sz * (PLOT.z + MARGIN / 2));
  for (const sx of [-1, 1]) K.box(low, MARGIN - 1, 0.1, 2 * PLOT.z + 1, C.walk, sx * (PLOT.x + MARGIN / 2), 0, 0);

  /* Clôture : piliers de brique, muret, grille ; une seule ouverture, au portail FIDNI */
  const gap = (x: number, z: number) => z > 0 && x > -35.8 && x < -23.7;
  const side = (x0: number, z0: number, x1: number, z1: number) => {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.round(L / 5.5), ry = Math.atan2(x1 - x0, z1 - z0);
    for (let i = 0; i < n; i++) {
      const ax = x0 + (x1 - x0) * i / n, az = z0 + (z1 - z0) * i / n;
      const bx = x0 + (x1 - x0) * (i + 1) / n, bz = z0 + (z1 - z0) * (i + 1) / n;
      const mx = (ax + bx) / 2, mz = (az + bz) / 2, seg = L / n;
      if (!gap(ax, az)) K.box(b, 1, 2.3, 1, C.brick, ax, 0, az, 0, true);
      if (gap(mx, mz)) continue;
      K.box(b, 0.5, 0.8, seg - 1, C.brick2, mx, 0, mz, ry);
      K.box(b, 0.12, 0.1, seg - 1, C.rail, mx, 1.95, mz, ry);
      for (let k = 1; k < 8; k++) K.box(b, 0.08, 1.2, 0.08, C.rail, ax + (bx - ax) * k / 8, 0.8, az + (bz - az) * k / 8);
    }
  };
  side(-PLOT.x, -PLOT.z, PLOT.x, -PLOT.z); side(PLOT.x, -PLOT.z, PLOT.x, PLOT.z);
  side(PLOT.x, PLOT.z, -PLOT.x, PLOT.z); side(-PLOT.x, PLOT.z, -PLOT.x, -PLOT.z);
  K.box(b, 1, 2.3, 1, C.brick, -PLOT.x, 0, -PLOT.z, 0, true);

  /* Bâtiments */
  const rooms = {} as Record<RoomId, PlacedRoom>;
  (Object.keys(PLACE) as RoomId[]).forEach((id, i) => {
    const pl = PLACE[id];
    const g = new Group(); g.position.set(pl.x, 0, pl.z); g.rotation.y = pl.face; scene.add(g);
    const built = BUILDERS[id](g, K);
    rooms[id] = { ...built, id, group: g, face: pl.face, anchorLocal: new Vector3(pl.a[0], built.top, pl.a[1]), hover: 0, pop: 0, bornAt: 0.25 + i * 0.08 };
  });
  const alley = new Group(); alley.position.set(-29.75, 0, 18); scene.add(alley);
  buildAlley(alley, K);

  /* Cour pavée et parvis de l'amphi */
  const tile = K.tex(256, 256, (c, tw) => {
    c.fillStyle = '#d6cfc1'; c.fillRect(0, 0, tw, tw);
    c.fillStyle = '#cdc5b6'; c.fillRect(0, 0, tw / 2, tw / 2); c.fillRect(tw / 2, tw / 2, tw / 2, tw / 2);
    c.strokeStyle = 'rgba(120,108,92,.35)'; c.lineWidth = 3; c.strokeRect(0, 0, tw, tw); c.beginPath();
    c.moveTo(tw / 2, 0); c.lineTo(tw / 2, tw); c.moveTo(0, tw / 2); c.lineTo(tw, tw / 2); c.stroke();
  });
  tile.wrapS = tile.wrapT = RepeatWrapping;
  const paveMat = new MeshLambertMaterial({ map: tile });
  const paving = (pw: number, pd: number, x: number, z: number) => {
    const g = new PlaneGeometry(pw, pd); g.rotateX(-Math.PI / 2);
    const uv = g.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * pw / 2.4, uv.getY(i) * pd / 2.4);
    const m = new Mesh(g, paveMat); m.position.set(x, 0.05, z); m.receiveShadow = true; scene.add(m);
  };
  paving(80, 15, 0, -3.5); paving(26, 3, 0, -12); paving(5, 23, -7, 15.5);

  /* Passerelles vitrées entre les bâtiments */
  for (const [x0, x1] of [[-18, -12], [12, 18], [34, 36.5]]) {
    const x = (x0 + x1) / 2, pw = x1 - x0;
    K.box(b, pw, 0.5, 3.2, C.wallW, x, 3.6, -17, 0, true);
    K.box(b, pw, 0.5, 3.2, C.wallW, x, 6.8, -17, 0, true);
    K.box(win, pw, 2.7, 3, C.glass, x, 4.1, -17);
    for (const z of [-15.6, -18.4]) K.box(b, 0.3, 3.6, 0.3, C.dark, x, 0, z);
  }
  /* Jardinières, bancs, tables de pique-nique, lampadaires */
  for (const [x, z] of [[-19, -7], [-12, -7], [10, -7], [17, -7], [-19, 2.2], [-13, 2.2]]) {
    K.box(b, 3.2, 0.6, 3.2, C.stone, x, 0, z, 0, true);
    K.box(b, 2.8, 0.1, 2.8, C.soil, x, 0.6, z);
    K.tree(b, x, z, 0.75, pick(C.leaf), 'round', rnd() * 6);
    K.box(b, 2.2, 0.45, 0.6, C.wood, x, 0, z + 2.3, 0, true);
  }
  for (const x of [30.5, 35]) {
    K.box(b, 3, 0.12, 1.6, C.wood, x, 0.75, -5, 0, true);
    for (const dz of [-1.3, 1.3]) K.box(b, 3, 0.1, 0.45, C.wood, x, 0.42, -5 + dz);
    for (const dx of [-1.2, 1.2]) K.box(b, 0.12, 0.75, 0.12, C.dark, x + dx, 0, -5);
  }
  for (const [x, z] of [[-24, 3.8], [-15, 3.8], [0, 3.8], [15, -10.8], [-15, -10.8], [30, 3.8], [36, -10], [-7, 26]]) {
    K.cyl(b, 0.1, 4.2, C.dark, x, 0, z, 6);
    K.box(bulbs, 0.55, 0.45, 0.55, 0xf4ecd8, x, 4.2, z);
  }
  /* Arbres le long de la clôture et entre les bâtiments */
  const spots: [number, number][] = [];
  for (let z = -29; z <= 30; z += 5) spots.push([z > 4 && z < 29 ? -48.5 : -47 + rnd() * 2, z]);
  for (let x = -36; x <= 30; x += 6) spots.push([x + rnd() * 2, -31 + rnd()]);
  for (const z of [-8, -2.5]) spots.push([48 + rnd(), z]);
  for (const z of [-30, -24, -18, -12]) spots.push([49 + rnd(), z]);
  spots.push([-37, -6], [-21, 30.5], [-13, 30.5], [-42, 31]);
  for (const [x, z] of spots) K.tree(b, x, z, 0.8 + rnd() * 0.45, pick(C.leaf), rnd() > 0.8 ? 'cone' : 'round', rnd() * 6);
  /* Un cadre d'arbres sombres autour de l'enceinte (devant et sur les côtés), avec des trouées, comme sur un décor peint */
  const BELT = [0x3f6437, 0x46703c, 0x385a33] as const, out = MARGIN + 5;
  for (let x = -64; x <= 64; x += 7) if (rnd() > 0.3) K.tree(b, x + (rnd() - 0.5) * 3, PLOT.z + out + rnd() * 6, 1.1 + rnd() * 0.6, pick(BELT), rnd() > 0.7 ? 'cone' : 'round', rnd() * 6);
  for (const sx of [-1, 1]) for (let z = -30; z <= 34; z += 8) {
    if (rnd() > 0.35) K.tree(b, sx * (PLOT.x + out + rnd() * 6), z, 1.1 + rnd() * 0.6, pick(BELT), rnd() > 0.7 ? 'cone' : 'round', rnd() * 6);
  }

  scene.add(low.mesh(K.MAT.body, { cast: false }));
  scene.add(b.mesh());
  const lines = b.lines(); if (lines) scene.add(lines);
  scene.add(win.mesh(K.MAT.win, { cast: false }));
  scene.add(bulbs.mesh(K.MAT.bulb, { cast: false }));

  return {
    rooms,
    /** Seule mise à jour : l'horloge de la Direction, une fois par minute. */
    update(): boolean {
      let changed = false;
      for (const id in rooms) if (rooms[id as RoomId].update?.()) changed = true;
      return changed;
    },
  };
}

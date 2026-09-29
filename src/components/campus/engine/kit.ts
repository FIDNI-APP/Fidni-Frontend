/**
 * Kit de construction du campus : géométrie fusionnée (couleurs par sommet), matériaux légers,
 * textures dessinées au canvas. Un kit par moteur, pour tout libérer quand la vue 3D est démontée.
 */
import {
  BoxGeometry, BufferGeometry, CanvasTexture, Color, ConeGeometry, CylinderGeometry, EdgesGeometry, Euler,
  Float32BufferAttribute, IcosahedronGeometry, LineBasicMaterial, LineSegments, Material, Matrix3, Matrix4, Mesh,
  MeshLambertMaterial, Object3D, PlaneGeometry, Quaternion, RepeatWrapping, SRGBColorSpace, Vector3,
} from 'three';

/** Palette (sRGB) : bâtiments blancs, toits gris, accents or et vert de la charte. */
export const C = {
  grass: 0xb3b276, grass2: 0xa6a86c, soil: 0x7d6a55,
  wall: 0xf3f1ec, wallW: 0xfbfaf7, wall2: 0xe9e5dd, trim: 0xd8d3ca, dark: 0x3b3b3a,
  roof: 0xb3aea5, roofHip: 0x8f8a83, roofDark: 0x6d6964,
  stone: 0xc9c2b5, walk: 0xcdc8be, brick: 0x9b5a45, brick2: 0x8a4e3c, rail: 0x3a3a3a,
  gold: 0xc0892f, brand: 0x1a7a4a, wood: 0x9a7552, trunk: 0x6e5641, glass: 0x8e9cc4, white: 0xffffff,
  leaf: [0x4f7a42, 0x5a8448, 0x668d4e, 0x44703d, 0x6e9453],
  cherry: [0xe7b3c5, 0xdca1b6, 0xefc3d1],
} as const;

export const FONT = {
  serif: '"Fraunces", Georgia, serif',
  mono: '"DM Mono", Consolas, monospace',
  sans: '"DM Sans", system-ui, sans-serif',
};

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
export interface WinBatches { lit: Batch; dark: Batch }
export interface FacadeOpts {
  x0: number; z: number; bays: number; bayW: number; floors: number; fh: number;
  y0?: number; winW?: number; winH?: number; pil?: boolean; band?: boolean; seed?: number;
}

const _e = new Euler(), _q = new Quaternion(), _p = new Vector3(), _s = new Vector3();
/** Matrice de pose : position, rotation (x, y, z), échelle. */
export function mat4(x: number, y: number, z: number, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0): Matrix4 {
  _e.set(rx, ry, rz); _q.setFromEuler(_e);
  return new Matrix4().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
}

interface BatchHost {
  flat(g: BufferGeometry): BufferGeometry;
  edgesOf(g: BufferGeometry): EdgesGeometry;
  MAT: { body: Material; edge: LineBasicMaterial };
}

/** Accumule des géométries transformées, puis les fusionne en un seul maillage (un seul appel de dessin). */
export class Batch {
  pos: number[] = []; nor: number[] = []; col: number[] = []; lin: number[] = [];
  frame: Matrix4 | null = null;
  constructor(private readonly kit: BatchHost) {}

  add(geo: BufferGeometry, m: Matrix4, hex: number, edges = false): this {
    const mm = this.frame ? this.frame.clone().multiply(m) : m;
    const g = this.kit.flat(geo), p = g.getAttribute('position'), n = g.getAttribute('normal');
    const nm = new Matrix3().getNormalMatrix(mm), v = new Vector3(), c = new Color(hex);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(mm); this.pos.push(v.x, v.y, v.z);
      v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); this.nor.push(v.x, v.y, v.z);
      this.col.push(c.r, c.g, c.b);
    }
    if (edges) {
      const e = this.kit.edgesOf(geo).getAttribute('position');
      for (let i = 0; i < e.count; i++) { v.fromBufferAttribute(e, i).applyMatrix4(mm); this.lin.push(v.x, v.y, v.z); }
    }
    return this;
  }

  mesh(material?: Material, o: { cast?: boolean; receive?: boolean } = {}): Mesh {
    const mat = material ?? this.kit.MAT.body;
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new Float32BufferAttribute(this.nor, 3));
    if (mat.vertexColors) g.setAttribute('color', new Float32BufferAttribute(this.col, 3));
    g.computeBoundingSphere();
    const m = new Mesh(g, mat);
    m.castShadow = o.cast !== false; m.receiveShadow = o.receive !== false;
    return m;
  }

  lines(): LineSegments | null {
    if (!this.lin.length) return null;
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(this.lin, 3));
    const l = new LineSegments(g, this.kit.MAT.edge);
    l.raycast = () => {};
    return l;
  }

  get empty(): boolean { return this.pos.length === 0; }
}

export type Kit = ReturnType<typeof createKit>;

export function createKit() {
  const MAT = {
    body: new MeshLambertMaterial({ vertexColors: true }),
    win: new MeshLambertMaterial({ color: C.glass }),
    bulb: new MeshLambertMaterial({ color: 0xf4ecd8 }),
    edge: new LineBasicMaterial({ color: 0x2b2b2a, transparent: true, opacity: 0.14, depthWrite: false }),
  };
  /** Géométries unitaires, posées à y = 0. */
  const GEO = {
    box: new BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
    cyl6: new CylinderGeometry(1, 1, 1, 6).translate(0, 0.5, 0),
    cyl12: new CylinderGeometry(1, 1, 1, 12).translate(0, 0.5, 0),
    cyl24: new CylinderGeometry(1, 1, 1, 24).translate(0, 0.5, 0),
    half16: new CylinderGeometry(1, 1, 1, 16, 1, false, -Math.PI / 2, Math.PI).translate(0, 0.5, 0), // moitié avant (z ≥ 0)
    cone6: new ConeGeometry(1, 1, 6).translate(0, 0.5, 0),
    ico: new IcosahedronGeometry(1, 0),
  };
  const nonIdx = new Map<BufferGeometry, BufferGeometry>();
  const edgeCache = new Map<BufferGeometry, EdgesGeometry>();
  const owned: { dispose(): void }[] = [];
  const drawers = new WeakMap<CanvasTexture, { ctx: CanvasRenderingContext2D; draw: Draw; w: number; h: number }>();

  const kit = {
    MAT, GEO,
    flat(g: BufferGeometry): BufferGeometry {
      let f = nonIdx.get(g);
      if (!f) { f = g.index ? g.toNonIndexed() : g; nonIdx.set(g, f); if (f !== g) owned.push(f); }
      return f;
    },
    edgesOf(g: BufferGeometry): EdgesGeometry {
      let e = edgeCache.get(g);
      if (!e) { e = new EdgesGeometry(g, 25); edgeCache.set(g, e); owned.push(e); }
      return e;
    },
    batch(): Batch { return new Batch(kit); },
    own<T extends { dispose(): void }>(x: T): T { owned.push(x); return x; },

    box(b: Batch, w: number, h: number, d: number, hex: number, x: number, y: number, z: number, ry = 0, edges = false) {
      b.add(GEO.box, mat4(x, y, z, ry, w, h, d), hex, edges);
    },
    cyl(b: Batch, r: number, h: number, hex: number, x: number, y: number, z: number, seg: 6 | 12 | 24 = 12, edges = false) {
      b.add(seg === 6 ? GEO.cyl6 : seg === 24 ? GEO.cyl24 : GEO.cyl12, mat4(x, y, z, 0, r, h, r), hex, edges);
    },
    blob(b: Batch, r: number, hex: number, x: number, y: number, z: number, sy = 1, rot = 0) {
      b.add(GEO.ico, mat4(x, y, z, rot, r, r * sy, r, rot), hex);
    },
    /** Arbre feuillu (trois volumes) ou conifère. */
    tree(b: Batch, x: number, z: number, s: number, hex: number, kind: 'round' | 'cone' = 'round', rot = 0) {
      kit.cyl(b, 0.28 * s, 1.8 * s, C.trunk, x, 0, z, 6);
      if (kind === 'cone') {
        b.add(GEO.cone6, mat4(x, 1.3 * s, z, rot, 1.8 * s, 3.2 * s, 1.8 * s), hex);
        b.add(GEO.cone6, mat4(x, 3.0 * s, z, rot, 1.3 * s, 2.6 * s, 1.3 * s), hex);
      } else {
        kit.blob(b, 1.9 * s, hex, x, 3.2 * s, z, 0.95, rot);
        kit.blob(b, 1.3 * s, hex, x + 0.9 * s, 2.7 * s, z + 0.5 * s, 0.9, rot + 1);
        kit.blob(b, 1.2 * s, hex, x - 0.8 * s, 3.9 * s, z - 0.4 * s, 0.9, rot + 2);
      }
    },
    /** Façade : travées de fenêtres, pilastres, bandeaux d'étage, sur le plan z (face +z). */
    facade(b: Batch, win: WinBatches, o: FacadeOpts) {
      const { x0, z, bays, bayW, floors, fh, y0 = 0, pil = true, band = true } = o;
      const winW = o.winW ?? bayW * 0.62, winH = o.winH ?? fh * 0.55;
      let s = o.seed ?? 1;
      const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      for (let f = 0; f < floors; f++) {
        const y = y0 + f * fh + fh * 0.28;
        for (let i = 0; i < bays; i++) {
          const x = x0 + bayW * (i + 0.5);
          kit.box(rnd() < 0.5 ? win.lit : win.dark, winW, winH, 0.12, C.glass, x, y, z + 0.02);
          kit.box(b, winW + 0.2, 0.12, 0.28, C.trim, x, y - 0.12, z + 0.08);
        }
        if (band) kit.box(b, bays * bayW + 0.4, 0.3, 0.3, C.wallW, x0 + bays * bayW / 2, y0 + (f + 1) * fh - 0.3, z + 0.1);
      }
      if (pil) for (let i = 0; i <= bays; i++) kit.box(b, 0.34, floors * fh, 0.42, C.wallW, x0 + i * bayW, y0, z + 0.15);
    },
    /** Toit en croupe, faîtage selon x. */
    hipRoof(w: number, d: number, h: number): BufferGeometry {
      const a = w / 2, bb = d / 2, r = Math.max(0, a - bb);
      const P: Record<string, number[]> = { A: [-a, 0, bb], B: [a, 0, bb], C: [a, 0, -bb], D: [-a, 0, -bb], R1: [-r, h, 0], R2: [r, h, 0] };
      const pos: number[] = [];
      for (const k of ['A', 'B', 'R2', 'A', 'R2', 'R1', 'C', 'D', 'R1', 'C', 'R1', 'R2', 'B', 'C', 'R2', 'D', 'A', 'R1']) pos.push(...P[k]);
      const g = new BufferGeometry();
      g.setAttribute('position', new Float32BufferAttribute(pos, 3));
      g.computeVertexNormals();
      owned.push(g);
      return g;
    },
    /** Texture dessinée au canvas. */
    tex(w: number, h: number, draw: Draw, repeat?: [number, number]): CanvasTexture {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const ctx = c.getContext('2d') as CanvasRenderingContext2D;
      draw(ctx, w, h);
      const t = new CanvasTexture(c);
      t.colorSpace = SRGBColorSpace; t.anisotropy = 4;
      if (repeat) { t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
      drawers.set(t, { ctx, draw, w, h });
      return t;
    },
    redraw(t: CanvasTexture) {
      const d = drawers.get(t); if (!d) return;
      d.ctx.clearRect(0, 0, d.w, d.h); d.draw(d.ctx, d.w, d.h); t.needsUpdate = true;
    },
    /** Panneau texturé vertical, face +z. */
    panel(parent: Object3D, w: number, h: number, texture: CanvasTexture, x: number, y: number, z: number, o: { transparent?: boolean; rx?: number; ry?: number } = {}): Mesh {
      const m = new Mesh(new PlaneGeometry(w, h), new MeshLambertMaterial({ map: texture, transparent: !!o.transparent }));
      m.position.set(x, y, z);
      if (o.rx) m.rotation.x = o.rx;
      if (o.ry) m.rotation.y = o.ry;
      m.receiveShadow = !o.transparent;
      parent.add(m);
      return m;
    },
    /** Texte à espacement de lettres régulier, centré. */
    spaced(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, spacing: number) {
      const chars = [...text], widths = chars.map((ch) => ctx.measureText(ch).width);
      let x = cx - (widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1)) / 2;
      ctx.textAlign = 'left';
      chars.forEach((ch, i) => { ctx.fillText(ch, x, cy); x += widths[i] + spacing; });
    },
    /** Libère ce que le kit a créé hors de la scène (géométries unitaires, caches, matériaux partagés). */
    dispose() {
      Object.values(GEO).forEach((g) => g.dispose());
      Object.values(MAT).forEach((m) => m.dispose());
      owned.forEach((x) => x.dispose());
    },
  };
  return kit;
}

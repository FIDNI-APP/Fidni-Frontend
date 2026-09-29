/**
 * Moteur de la vue 3D : rendu, caméra orbitale amortie, sélection des bâtiments, étiquettes.
 * La boucle ne tourne que lorsqu'il y a quelque chose à redessiner, puis s'arrête (zéro calcul au repos).
 */
import {
  DirectionalLight, Fog, HemisphereLight, LineSegments, Material, Mesh, NoToneMapping, Object3D, PCFShadowMap,
  PerspectiveCamera, Raycaster, Scene, Texture, Vector2, Vector3, WebGLRenderer,
} from 'three';
import type { RoomId } from '../campusRooms';
import type { Tier } from '../webgl';
import { createKit } from './kit';
import { createSky, Sky } from './sky';
import { buildCampus, PlacedRoom } from './world';

/**
 * Heure dorée. Le soleil (lumière principale, qui porte les ombres) est bas, au nord-ouest, derrière le campus :
 * les ombres longues viennent vers la caméra. Une lumière chaude d'appoint côté caméra garde les façades lumineuses
 * (la « triche » des décors peints), et le ciel ambiant, froid, donne leur teinte lavande aux faces à l'ombre.
 */
const SUN_AZ = 0.534, SUN_EL = 0.26, SUN_SKY_EL = 0.085; // azimut (vers l'ouest depuis le nord), élévations (rad)
const sunDir = (el: number) => new Vector3(-Math.sin(SUN_AZ) * Math.cos(el), Math.sin(el), -Math.cos(SUN_AZ) * Math.cos(el));

const TIERS: Record<Tier, { dpr: number; shadow: number }> = {
  high: { dpr: 1.75, shadow: 2048 },
  mid: { dpr: 1.25, shadow: 1024 },
  low: { dpr: 1, shadow: 0 },
};
const ORDER: Tier[] = ['high', 'mid', 'low'];

export interface CameraShot { r: number; phi: number; off: number }
export interface EngineEvents {
  /** Clic sur un bâtiment (ou dans le vide : null). */
  onSelect: (id: RoomId | null) => void;
  /** Première interaction (pour masquer l'aide). */
  onInteract: () => void;
}
/** Orbite autour de (tx, ty, tz) ; `tilt` relève le regard pour laisser voir le ciel en vue d'ensemble. */
interface Rig { theta: number; phi: number; r: number; tx: number; ty: number; tz: number; tilt: number }

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const unwrap = (a: number, ref: number) => {
  while (a - ref > Math.PI) a -= Math.PI * 2;
  while (a - ref < -Math.PI) a += Math.PI * 2;
  return a;
};

export class CampusEngine {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(44, 1, 2, 2000);
  private readonly kit = createKit();
  private readonly sun = new DirectionalLight(0xffd29a, 2.6);
  private readonly sky: Sky;
  private readonly rooms: Record<RoomId, PlacedRoom>;
  private readonly campusUpdate: () => boolean;
  private readonly hitList: Object3D[] = [];
  private readonly owner = new Map<Object3D, RoomId>();
  private readonly ray = new Raycaster();
  private readonly ndc = new Vector2();
  private readonly v3 = new Vector3();
  private readonly pts = new Map<number, { x: number; y: number }>();
  private readonly ro: ResizeObserver;
  private readonly clockTimer: number;
  private readonly reduce: boolean;
  private tier: Tier;
  private goal: Rig;
  private rig: Rig;
  private rate = 2.6;
  private shift = { x: 0, y: 0 };
  private shiftGoal = { x: 0, y: 0 };
  private focusId: RoomId | null = null;
  private hoverId: RoomId | null = null;
  private uiHover: RoomId | null = null;
  private labels: Partial<Record<RoomId, HTMLElement>> = {};
  private moved = 0;
  private pinch: { d: number; r: number } | null = null;
  private mouse: { x: number; y: number } | null = null;
  private needPick = false;
  private dirty = true;
  private raf = 0;
  private last = 0;
  private t = 0;
  private probe = { n: 0, sum: 0, done: false };
  private W = 1;
  private H = 1;

  constructor(
    private readonly container: HTMLElement,
    private readonly canvas: HTMLCanvasElement,
    private readonly ev: EngineEvents,
    opts: { tier: Tier; reduceMotion: boolean; autoTier: boolean },
  ) {
    this.tier = opts.tier;
    this.reduce = opts.reduceMotion;
    this.probe.done = !opts.autoTier || this.reduce;

    this.renderer = new WebGLRenderer({ canvas, antialias: this.tier !== 'low', alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = NoToneMapping;           // la palette peinte est respectée telle quelle
    this.renderer.shadowMap.type = PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;          // ombres recalculées seulement quand la scène change

    const hemi = new HemisphereLight(0x93a5d6, 0xd9bb9c, 1.8);
    const fill = new DirectionalLight(0xffd6b0, 1.8);
    fill.position.set(-35, 50, 80);
    this.sun.position.copy(sunDir(SUN_EL)).multiplyScalar(220);
    Object.assign(this.sun.shadow.camera, { left: -95, right: 95, top: 95, bottom: -95, near: 40, far: 480 });
    this.sun.shadow.camera.updateProjectionMatrix();
    this.sun.shadow.bias = -0.0005; this.sun.shadow.normalBias = 0.05;
    this.sky = createSky(sunDir(SUN_SKY_EL), this.tier === 'low' ? 1024 : 2048);
    this.scene.fog = new Fog(this.sky.haze, 170, 720);
    this.scene.add(hemi, fill, this.sun, this.sun.target, this.sky.dome, this.sky.glare);

    const campus = buildCampus(this.scene, this.kit);
    this.rooms = campus.rooms;
    this.campusUpdate = campus.update;
    for (const id of Object.keys(this.rooms) as RoomId[]) {
      for (const m of this.rooms[id].hit) { this.hitList.push(m); this.owner.set(m, id); }
    }

    this.measure();
    this.goal = this.overviewRig();
    this.rig = this.reduce ? { ...this.goal } : { ...this.goal, theta: this.goal.theta - 0.25, phi: 0.82, r: this.goal.r * 1.3 };
    this.applyTier(this.tier);

    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onUp);
    canvas.addEventListener('pointerleave', this.onLeave);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.ro = new ResizeObserver(() => { this.measure(); this.resize(); });
    this.ro.observe(container);
    // L'horloge de la Direction : vérifiée toutes les 20 s, redessinée au changement de minute
    this.clockTimer = window.setInterval(() => { if (this.campusUpdate()) this.wake(); }, 20000);
    this.resize();
  }

  /* ---------------- API ---------------- */

  setLabels(map: Partial<Record<RoomId, HTMLElement>>) { this.labels = map; this.wake(); }

  setUiHover(id: RoomId | null) { this.uiHover = id; this.wake(); }

  focus(id: RoomId, shot: CameraShot) {
    const room = this.rooms[id];
    this.focusId = id; this.rate = 3;
    const c = room.group.localToWorld(new Vector3(room.anchorLocal.x, 0, room.anchorLocal.z));
    const narrow = this.W < 820;
    this.goal = {
      tx: c.x, ty: room.top * 0.28, tz: c.z, tilt: 0,
      r: shot.r * (narrow ? 1.3 : 1), phi: shot.phi,
      theta: unwrap(room.face + shot.off, this.rig.theta),
    };
    this.setShift();
    this.wake();
  }

  overview() {
    this.focusId = null; this.rate = 2.4;
    const o = this.overviewRig(); o.theta = unwrap(o.theta, this.rig.theta);
    this.goal = o;
    this.setShift();
    this.wake();
  }

  /** Clavier : rotation, inclinaison, zoom. */
  nudge(dTheta: number, dPhi: number, zoom = 1) {
    this.goal.theta += dTheta;
    this.goal.phi = clamp(this.goal.phi + dPhi, 0.3, 1.36);
    this.goal.r = clamp(this.goal.r * zoom, 28, 230);
    this.rate = 4; this.wake();
  }

  dispose() {
    cancelAnimationFrame(this.raf); this.raf = 0;
    window.clearInterval(this.clockTimer);
    this.ro.disconnect();
    const c = this.canvas;
    c.removeEventListener('pointerdown', this.onDown);
    c.removeEventListener('pointermove', this.onMove);
    c.removeEventListener('pointerup', this.onUp);
    c.removeEventListener('pointercancel', this.onUp);
    c.removeEventListener('pointerleave', this.onLeave);
    c.removeEventListener('wheel', this.onWheel);
    this.scene.traverse((o) => {
      if (o instanceof Mesh || o instanceof LineSegments) {
        o.geometry.dispose();
        const mats: Material[] = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          const map = (m as Material & { map?: Texture | null }).map;
          if (map) map.dispose();
          m.dispose();
        }
      }
    });
    this.sky.dispose();
    this.kit.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  /* ---------------- interne ---------------- */

  private measure() {
    this.W = Math.max(1, this.container.clientWidth);
    this.H = Math.max(1, this.container.clientHeight);
  }

  private overviewRig(): Rig {
    const a = this.W / this.H;
    const r = a < 1.25 ? 124 * Math.min(2.1, 1.35 / a) : 124;
    // Face au soleil couchant, caméra basse et regard relevé : un tiers de ciel en haut, le campus en dessous.
    return { theta: 0.22, phi: 1.3, r, tx: 2, ty: 0, tz: 4, tilt: r * 0.154 };
  }

  /** Décale l'image pour que le bâtiment ne soit pas caché par le panneau (à droite, ou en bas sur mobile). */
  private setShift() {
    if (!this.focusId) { this.shiftGoal = { x: 0, y: 0 }; return; }
    this.shiftGoal = this.W < 820 ? { x: 0, y: this.H * 0.22 } : { x: 190, y: 0 };
  }

  private applyTier(t: Tier) {
    this.tier = t;
    const q = TIERS[t];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.dpr));
    const shadows = q.shadow > 0;
    if (this.renderer.shadowMap.enabled !== shadows) {
      this.renderer.shadowMap.enabled = shadows;
      this.scene.traverse((o) => {
        if (o instanceof Mesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.needsUpdate = true; });
      });
    }
    this.sun.castShadow = shadows;
    if (shadows && this.sun.shadow.mapSize.x !== q.shadow) {
      this.sun.shadow.mapSize.set(q.shadow, q.shadow);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    this.renderer.shadowMap.needsUpdate = true;
    this.resize();
  }

  private resize() {
    this.renderer.setSize(this.W, this.H, false);
    this.camera.aspect = this.W / this.H;
    this.camera.updateProjectionMatrix();
    if (!this.focusId) this.goal.r = this.overviewRig().r;
    this.setShift();
    this.wake();
  }

  private wake() {
    this.dirty = true;
    if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame(this.frame); }
  }

  private pick(x: number, y: number): RoomId | null {
    const r = this.canvas.getBoundingClientRect();
    this.ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.camera);
    const h = this.ray.intersectObjects(this.hitList, false)[0];
    return h ? this.owner.get(h.object) ?? null : null;
  }

  private readonly onDown = (e: PointerEvent) => {
    this.canvas.setPointerCapture(e.pointerId);
    this.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.moved = 0; this.rate = 6;
    if (this.pts.size === 2) {
      const [a, b] = [...this.pts.values()];
      this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), r: this.goal.r };
    }
    this.wake();
  };

  private readonly onMove = (e: PointerEvent) => {
    this.mouse = { x: e.clientX, y: e.clientY }; this.needPick = true;
    const p = this.pts.get(e.pointerId);
    if (p) {
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (this.pts.size === 1) {
        this.goal.theta -= dx * 0.005;
        this.goal.phi = clamp(this.goal.phi - dy * 0.004, 0.3, 1.36);
        this.moved += Math.abs(dx) + Math.abs(dy);
        if (this.moved > 5) { this.canvas.classList.add('is-dragging'); this.ev.onInteract(); }
      } else if (this.pts.size === 2 && this.pinch) {
        const [a, b] = [...this.pts.values()];
        this.goal.r = clamp(this.pinch.r * this.pinch.d / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), 28, 230);
        this.moved = 99; this.ev.onInteract();
      }
    }
    this.wake();
  };

  private readonly onUp = (e: PointerEvent) => {
    if (!this.pts.has(e.pointerId)) return;
    const single = this.pts.size === 1;
    this.pts.delete(e.pointerId);
    if (this.pts.size < 2) this.pinch = null;
    this.canvas.classList.remove('is-dragging');
    if (single && this.moved < 6) {
      const id = this.pick(e.clientX, e.clientY);
      if (id || this.focusId) { this.ev.onInteract(); this.ev.onSelect(id); }
    }
  };

  private readonly onLeave = () => {
    this.mouse = null;
    if (this.hoverId) { this.hoverId = null; this.canvas.classList.remove('is-hovering'); this.wake(); }
  };

  private readonly onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.goal.r = clamp(this.goal.r * (1 + clamp(e.deltaY, -120, 120) * 0.0014), 28, 230);
    this.rate = 4; this.ev.onInteract(); this.wake();
  };

  private readonly frame = (now: number) => {
    this.raf = 0;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now; this.t += dt;
    let need = this.dirty; this.dirty = false;

    // Caméra : rapprochement amorti de l'objectif
    const e = this.reduce ? 1 : 1 - Math.exp(-dt * this.rate);
    let delta = 0;
    for (const k of Object.keys(this.goal) as (keyof Rig)[]) {
      const d = this.goal[k] - this.rig[k];
      this.rig[k] += d * e; delta += Math.abs(d);
    }
    this.shift.x += (this.shiftGoal.x - this.shift.x) * e;
    this.shift.y += (this.shiftGoal.y - this.shift.y) * e;
    delta += Math.abs(this.shiftGoal.x - this.shift.x) + Math.abs(this.shiftGoal.y - this.shift.y);
    if (delta > 0.002) need = true;

    // Survol
    if (this.needPick && this.mouse && !this.pts.size) {
      this.needPick = false;
      const h = this.pick(this.mouse.x, this.mouse.y);
      if (h !== this.hoverId) { this.hoverId = h; this.canvas.classList.toggle('is-hovering', !!h); need = true; }
    }

    // Bâtiments : apparition à l'ouverture, léger soulèvement au survol
    let moving = false;
    for (const id of Object.keys(this.rooms) as RoomId[]) {
      const r = this.rooms[id];
      const p = this.reduce ? 1 : clamp((this.t - r.bornAt) / 0.8, 0, 1);
      if (p !== r.pop) { r.pop = p; moving = true; }
      r.group.scale.set(1, Math.max(0.001, 1 - Math.pow(1 - p, 3)), 1);
      const hot = id === this.hoverId || id === this.uiHover ? 1 : id === this.focusId ? 0.55 : 0;
      const nh = r.hover + (hot - r.hover) * (1 - Math.exp(-dt * 10));
      if (Math.abs(nh - r.hover) > 0.001) moving = true;
      r.hover = Math.abs(hot - nh) < 0.002 ? hot : nh;
      r.group.position.y = r.hover * (id === this.focusId ? 0.15 : 0.4);
    }
    if (moving) { need = true; this.renderer.shadowMap.needsUpdate = true; }

    if (!need) return;          // rien ne change : la boucle s'arrête ici jusqu'au prochain réveil

    const sp = Math.sin(this.rig.phi);
    this.camera.position.set(
      this.rig.tx + this.rig.r * sp * Math.sin(this.rig.theta),
      this.rig.ty + this.rig.r * Math.cos(this.rig.phi),
      this.rig.tz + this.rig.r * sp * Math.cos(this.rig.theta),
    );
    this.camera.lookAt(this.rig.tx, this.rig.ty + this.rig.tilt, this.rig.tz);
    this.camera.setViewOffset(this.W, this.H, this.shift.x, this.shift.y, this.W, this.H);
    this.renderer.render(this.scene, this.camera);
    this.placeLabels();

    // Qualité automatique : si l'intro rame, on baisse d'un cran (ou deux)
    if (!this.probe.done) {
      if (this.t > 0.4 && this.t < 1.8) { this.probe.n++; this.probe.sum += dt; }
      else if (this.t >= 1.8 && this.probe.n > 5) {
        this.probe.done = true;
        const fps = this.probe.n / this.probe.sum, i = ORDER.indexOf(this.tier);
        if (fps < 38 && i < ORDER.length - 1) this.applyTier(ORDER[fps < 22 ? ORDER.length - 1 : i + 1]);
      }
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  private placeLabels() {
    for (const id of Object.keys(this.rooms) as RoomId[]) {
      const el = this.labels[id]; if (!el) continue;
      const room = this.rooms[id];
      room.group.localToWorld(this.v3.copy(room.anchorLocal)).project(this.camera);
      const x = (this.v3.x * 0.5 + 0.5) * this.W, y = (-this.v3.y * 0.5 + 0.5) * this.H;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, calc(-100% - 8px))`;
      el.classList.toggle('is-gone', this.v3.z > 1 || room.pop < 0.95);
      el.classList.toggle('is-dim', !!this.focusId && id !== this.focusId);
      el.classList.toggle('is-hot', id === this.hoverId || id === this.uiHover);
      el.classList.toggle('is-active', id === this.focusId);
    }
  }
}

/**
 * Ciel de fin de journée, peint une seule fois au canvas puis posé sur un dôme :
 * dégradé bleu → pêche → or, nuages roses éclairés par-dessous, soleil bas, collines lointaines dans la brume.
 * Rien ne bouge : c'est un décor peint, comme dans un film d'animation.
 */
import {
  AdditiveBlending, BackSide, CanvasTexture, Color, Mesh, MeshBasicMaterial, SRGBColorSpace, SphereGeometry, Sprite,
  SpriteMaterial, Vector3,
} from 'three';

/** Couleur de la brume : le sol se fond dans cette teinte à l'horizon. */
export const HAZE = '#efc6a1';

type Stops = [number, string][];

/** Position (u, v) sur une texture équirectangulaire d'une SphereGeometry, pour une direction donnée. */
function dirToUV(d: Vector3): [number, number] {
  let a = Math.atan2(d.z, -d.x);
  if (a < 0) a += Math.PI * 2;
  const el = Math.asin(Math.max(-1, Math.min(1, d.y / d.length())));
  return [a / (Math.PI * 2), 0.5 - el / Math.PI];
}

function paintSky(W: number, H: number, sunU: number, sunV: number): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  const hy = H / 2, sx = sunU * W, sy = sunV * H;
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const vGrad = (stops: Stops) => { const gr = g.createLinearGradient(0, 0, 0, H); stops.forEach(([o, col]) => gr.addColorStop(o, col)); return gr; };
  /** Proximité angulaire au soleil sur l'horizon : 1 face au soleil, 0 à 90° et au-delà. */
  const nearSun = (x: number) => {
    const d = Math.min(Math.abs(x - sx), W - Math.abs(x - sx)) / W;
    return Math.pow(Math.max(0, Math.cos(d * Math.PI * 2 * 0.95)), 1.25);
  };

  // 1. Côté opposé au soleil : bleu-lavande et bande rose au-dessus de l'horizon
  g.fillStyle = vGrad([[0, '#1f3670'], [0.3, '#34508c'], [0.38, '#6572aa'], [0.42, '#9a93c2'], [0.45, '#c9a2bf'], [0.48, '#eab9b6'], [0.5, '#f2cdb9'], [0.53, HAZE], [1, '#dcae8a']]);
  g.fillRect(0, 0, W, H);
  // 2. Côté soleil : or et pêche, fondus colonne par colonne autour du soleil
  g.fillStyle = vGrad([[0, '#1f3670'], [0.3, '#3b5592'], [0.37, '#5e6aa8'], [0.4, '#8e86bd'], [0.42, '#c98aa8'], [0.44, '#f19a82'], [0.46, '#ffbc78'], [0.48, '#ffd896'], [0.5, '#fff1c4'], [0.53, HAZE], [1, '#dfae84']]);
  const step = Math.max(2, Math.round(W / 512));
  for (let x = 0; x < W; x += step) {
    g.globalAlpha = nearSun(x + step / 2);
    if (g.globalAlpha > 0.01) g.fillRect(x, 0, step, H);
  }
  g.globalAlpha = 1;

  // 3. Nuages : amas de bulles à fond plat, sombres et bordés d'or près du soleil, roses ailleurs
  const cloud = (cx: number, cy: number, w: number, h: number, s: number) => {
    const top = s > 0.5 ? '#9c6f8e' : '#8f8cc0';
    const body = s > 0.5 ? '#c98590' : '#eea3a3';
    const rim = s > 0.5 ? '#ffdca0' : '#ffd3be';
    const blobs: [number, number, number][] = [];
    const n = 12 + Math.round(w / 18);
    for (let k = 0; k < n; k++) {
      const t = rnd() - 0.5, edge = 1 - Math.abs(t) * 1.6;
      const r = h * (0.35 + rnd() * 0.5) * Math.max(0.25, edge);
      blobs.push([t * w, -r * 0.55 - rnd() * h * 0.25, r]);
    }
    // Même forme dessinée de part et d'autre du raccord de la texture
    for (const off of [-W, 0, W]) {
      const x0 = cx + off;
      if (x0 + w < 0 || x0 - w > W) continue;
      const gr = g.createLinearGradient(0, cy - h, 0, cy);
      gr.addColorStop(0, top); gr.addColorStop(0.62, body); gr.addColorStop(1, rim);
      g.save();
      g.beginPath(); g.rect(x0 - w, cy - h * 2.2, w * 2, h * 2.2); g.clip();
      g.fillStyle = gr;
      for (const [bx, by, r] of blobs) { g.beginPath(); g.arc(x0 + bx, cy + by, r, 0, Math.PI * 2); g.fill(); }
      g.restore();
    }
  };
  if ('filter' in g) g.filter = `blur(${Math.max(0.6, W / 1600)}px)`;
  for (let i = 0; i < 34; i++) {
    const el = 0.015 + Math.pow(rnd(), 1.7) * 0.33;         // élévation (rad) : dans la bande de ciel visible, surtout bas
    const cx = rnd() * W, cy = (0.5 - el / Math.PI) * H;
    const w = (60 + rnd() * 200) * (0.5 + el * 2.5) * (W / 2048), h = w * (0.16 + rnd() * 0.1);
    const dx = Math.min(Math.abs(cx - sx), W - Math.abs(cx - sx));
    if (Math.hypot(dx, cy - sy) < W * 0.045) continue;       // le disque du soleil reste dégagé
    cloud(cx, cy, w, h, nearSun(cx));
  }
  if ('filter' in g) g.filter = 'none';

  // 4. Soleil : grand halo, cœur éblouissant
  for (const off of [-W, 0, W]) {
    const x = sx + off;
    const halo = g.createRadialGradient(x, sy, 0, x, sy, W * 0.12);
    halo.addColorStop(0, 'rgba(255,240,200,.7)'); halo.addColorStop(0.1, 'rgba(255,222,160,.32)'); halo.addColorStop(0.4, 'rgba(255,200,140,.12)'); halo.addColorStop(1, 'rgba(255,190,130,0)');
    g.fillStyle = halo; g.fillRect(x - W * 0.12, sy - W * 0.12, W * 0.24, W * 0.24);
    g.fillStyle = 'rgba(255,252,236,1)'; g.beginPath(); g.arc(x, sy, W * 0.008, 0, Math.PI * 2); g.fill();
  }

  // 5. Horizon : collines lointaines dans la brume (elles masquent aussi la jonction avec le sol)
  g.fillStyle = 'rgba(160,122,146,.3)';
  g.beginPath(); g.moveTo(0, hy + H * 0.04);
  for (let x = 0; x <= W; x += W / 256) {
    const y = hy - H * (0.006 + 0.008 * (0.5 + 0.5 * Math.sin(x / W * Math.PI * 14)) * (0.5 + 0.5 * Math.sin(x / W * Math.PI * 5 + 1)));
    g.lineTo(x, y);
  }
  g.lineTo(W, hy + H * 0.04); g.closePath(); g.fill();
  const haze = g.createLinearGradient(0, hy - H * 0.05, 0, hy + H * 0.05);
  haze.addColorStop(0, 'rgba(255,226,190,0)'); haze.addColorStop(0.5, 'rgba(255,226,190,.55)'); haze.addColorStop(1, 'rgba(239,198,161,1)');
  g.fillStyle = haze; g.fillRect(0, hy - H * 0.05, W, H * 0.1);
  g.fillStyle = HAZE; g.fillRect(0, hy + H * 0.05, W, H * 0.45);
  return c;
}

/** Halo additif du soleil : quand un bâtiment passe devant, il le masque naturellement. */
function glareTexture(): CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,244,214,.9)'); gr.addColorStop(0.08, 'rgba(255,228,176,.5)'); gr.addColorStop(0.35, 'rgba(255,190,130,.14)'); gr.addColorStop(1, 'rgba(255,160,110,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace;
  return t;
}

export interface Sky { dome: Mesh; glare: Sprite; haze: Color; dispose(): void }

/** Crée le dôme de ciel et le halo, le soleil étant placé dans la direction `sun` (vers le soleil). */
export function createSky(sun: Vector3, resolution: 1024 | 2048): Sky {
  const [u, v] = dirToUV(sun);
  const tex = new CanvasTexture(paintSky(resolution, resolution / 2, u, v));
  tex.colorSpace = SRGBColorSpace;
  const dome = new Mesh(
    new SphereGeometry(900, 48, 24),
    new MeshBasicMaterial({ map: tex, side: BackSide, fog: false, depthWrite: false, toneMapped: false }),
  );
  dome.renderOrder = -1;
  dome.raycast = () => {};
  const glareTex = glareTexture();
  const glare = new Sprite(new SpriteMaterial({
    map: glareTex, blending: AdditiveBlending, transparent: true, opacity: 0.4, depthWrite: false, fog: false, toneMapped: false,
  }));
  glare.position.copy(sun).normalize().multiplyScalar(800);
  glare.scale.set(90, 90, 1);
  glare.raycast = () => {};
  return {
    dome, glare, haze: new Color(HAZE),
    dispose() {
      tex.dispose(); glareTex.dispose();
      dome.geometry.dispose(); (dome.material as MeshBasicMaterial).dispose(); glare.material.dispose();
    },
  };
}

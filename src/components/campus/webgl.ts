/**
 * Détection légère (sans importer three) : le navigateur peut-il afficher la vue 3D, et à quel niveau ?
 * three.js récent exige WebGL2. Un rendu logiciel (SwiftShader, llvmpipe…) reste possible mais en qualité basse.
 */
export type Tier = 'high' | 'mid' | 'low';
export interface WebGLSupport { ok: boolean; soft: boolean; tier: Tier }

let cached: WebGLSupport | null = null;

export function probeWebGL(): WebGLSupport {
  if (cached) return cached;
  let ok = false, soft = false;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    ok = !!gl;
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
      soft = /swiftshader|llvmpipe|software|basic render/i.test(name);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    ok = false;
  }
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency || 4, mem = nav.deviceMemory || 8;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  let tier: Tier = cores >= 8 && mem >= 8 && !coarse ? 'high' : 'mid';
  if (cores <= 2 || mem <= 2 || soft) tier = 'low';
  cached = { ok, soft, tier };
  return cached;
}

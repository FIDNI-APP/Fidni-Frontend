/** Sonnerie d'un appel entrant, jouée par le navigateur (deux notes douces, aucune ressource à télécharger). */
let ctx: AudioContext | null = null;
let minuterie: number | null = null;

function note(freq: number, debut: number, duree: number) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, debut);
  g.gain.linearRampToValueAtTime(0.12, debut + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, debut + duree);
  o.connect(g).connect(ctx.destination);
  o.start(debut);
  o.stop(debut + duree + 0.05);
}

export function sonner() {
  arreterSonnerie();
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  } catch {
    return;
  }
  const jouer = () => {
    if (!ctx) return;
    const t = ctx.currentTime;
    note(660, t, 0.35);
    note(880, t + 0.4, 0.5);
  };
  jouer();
  minuterie = window.setInterval(jouer, 2600);
}

export function arreterSonnerie() {
  if (minuterie) window.clearInterval(minuterie);
  minuterie = null;
  ctx?.close().catch(() => {});
  ctx = null;
}

/**
 * Nouvelle mise en ligne du front (13/10/2026). Un onglet ouvert avant garde l'ancien JavaScript en mémoire, et
 * Cloudflare garde les anciens fichiers /assets (« immutable ») : l'ancien site continuait de marcher sans erreur,
 * et rien de nouveau n'apparaissait tant qu'on ne rechargeait pas à la main (le garde-fou « vite:preloadError »
 * d'App.tsx ne joue que si un fichier manque).
 * On compare donc le script d'entrée chargé à celui de /index.html : 5 s après le chargement, au retour sur
 * l'onglet, puis toutes les 10 min (une fois par minute au plus). S'il a changé : rechargement au prochain
 * changement de page (on quittait la page : rien n'est perdu) et, d'ici là, un message « Mettre à jour ».
 * Anti-boucle : la version visée est notée avant de recharger ; si le rechargement rend encore l'ancienne (HTML
 * gardé en cache quelque part), on n'insiste pas. En développement (pas de /assets/index-…), rien ne tourne.
 */
import toast from 'react-hot-toast';
import { t } from '@/i18n';

const ENTREE = /<script[^>]*\ssrc="(\/assets\/index-[^"]+\.js)"/;
const VISEE = 'fidni:version-visee';
const INTERVALLE = 10 * 60 * 1000;
const ECART_MIN = 60 * 1000;

let nouvelle: string | null = null;
let derniere = 0;
let enCours = false;

const chargee = () =>
  document.querySelector<HTMLScriptElement>('script[type="module"][src^="/assets/index-"]')?.getAttribute('src') ?? null;

const dejaTentee = (version: string) => {
  try { return sessionStorage.getItem(VISEE) === version; } catch { return false; }
};

const recharger = () => {
  if (!nouvelle) return;
  try { sessionStorage.setItem(VISEE, nouvelle); } catch { /* stockage indisponible : rechargement quand même */ }
  window.location.reload();
};

const annoncer = () => {
  toast((tst) => (
    <span className="flex items-center gap-3">
      {t('Nouvelle version de FIDNI')}
      <button type="button" onClick={() => { toast.dismiss(tst.id); recharger(); }}
        className="min-h-8 rounded-lg bg-white/15 px-2.5 font-semibold hover:bg-white/25">
        {t('Mettre à jour')}
      </button>
      <button type="button" onClick={() => toast.dismiss(tst.id)} aria-label={t('Fermer')}
        className="min-h-8 px-1 text-[17px] leading-none text-white/60 hover:text-white">
        ×
      </button>
    </span>
  ), { id: 'nouvelle-version', duration: Infinity });
};

async function verifier() {
  const actuelle = chargee();
  if (!actuelle || nouvelle || enCours || Date.now() - derniere < ECART_MIN) return;
  enCours = true;
  derniere = Date.now();
  try {
    const r = await fetch(`/index.html?v=${Date.now()}`, { cache: 'no-store', credentials: 'omit' });
    if (!r.ok) return;
    const enLigne = ENTREE.exec(await r.text())?.[1];
    if (!enLigne || enLigne === actuelle || dejaTentee(enLigne)) return;
    nouvelle = enLigne;
    annoncer();
  } catch {
    /* hors ligne : on réessaiera au prochain retour sur l'onglet */
  } finally {
    enCours = false;
  }
}

/** À appeler une fois, au chargement du site. */
export function surveillerNouvelleVersion() {
  if (!chargee()) return;
  window.setTimeout(verifier, 5000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') verifier(); });
  window.addEventListener('focus', () => { verifier(); });
  // Page rendue par le cache de navigation (retour arrière, onglet réveillé sur téléphone).
  window.addEventListener('pageshow', (e) => { if (e.persisted) { derniere = 0; verifier(); } });
  window.setInterval(() => { if (document.visibilityState === 'visible') verifier(); }, INTERVALLE);
}

/** Changement de page : si une nouvelle version est en ligne, la page d'arrivée se charge directement avec elle. */
export function rechargerSiNouvelleVersion() {
  recharger();
}

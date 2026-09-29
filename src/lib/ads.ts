// Publicité Google AdSense, chargée UNIQUEMENT après accord explicite (bandeau de consentement).
// Tant que le visiteur n'a pas cliqué « Accepter », aucun script ni cookie Google n'est chargé.

export const ADS_ENABLED = true;
export const ADSENSE_CLIENT = 'ca-pub-1910021700658911'; // identique à public/ads.txt
/** ID d'un bloc « Annonce display » créé dans AdSense (Annonces → Par bloc d'annonces). Vide = aucun emplacement. */
export const ADSENSE_SLOT = '';

// ---- Consentement (CNIL : choix conservé 6 mois, refus aussi simple que l'acceptation)
type Choice = 'granted' | 'denied';
const KEY = 'fidni:consent-ads';
const VALIDITY_MS = 182 * 24 * 3600 * 1000;
export const CONSENT_EVENT = 'fidni:consent-change';

export const readConsent = (): Choice | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { v, at } = JSON.parse(raw) as { v: Choice; at: number };
    return Date.now() - at < VALIDITY_MS && (v === 'granted' || v === 'denied') ? v : null;
  } catch {
    return null;
  }
};

export const saveConsent = (v: Choice) => {
  try { localStorage.setItem(KEY, JSON.stringify({ v, at: Date.now() })); } catch { /* navigation privée */ }
  // Retirer un accord déjà donné : recharger pour décharger le script Google de la page.
  const wasLoaded = !!document.querySelector('script[data-fidni-adsense]');
  window.dispatchEvent(new Event(CONSENT_EVENT));
  if (v === 'granted') loadAdSense();
  else if (wasLoaded) window.location.reload();
};

/** Rouvre le bandeau (lien « Gérer les cookies » du pied de page). */
export const openConsentBanner = () => window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: 'open' }));

// ---- Script AdSense
declare global {
  interface Window { adsbygoogle?: unknown[] }
}

export const loadAdSense = () => {
  if (!ADS_ENABLED || readConsent() !== 'granted' || document.querySelector('script[data-fidni-adsense]')) return;
  // Public visé : lycéens (15 ans et plus pour l'essentiel) et enseignants. Les moins de 15 ans
  // sont invités par le bandeau à demander l'accord d'un parent (RGPD, art. 8 ; loi I&L, art. 45).
  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
  s.dataset.fidniAdsense = '1';
  document.head.appendChild(s);
};

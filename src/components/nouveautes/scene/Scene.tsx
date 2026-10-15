/**
 * Mécanique des scènes animées de la fenêtre « Nouveautés » (14/10/2026) : de vrais composants de la page, montrés
 * dans une « capture » vivante. Une scène avance par phases (`useTimeline`) et se rejoue en boucle ; une caméra
 * descend vers ce qui compte (`Ecran vers=`) ; un curseur va cliquer (`Curseur`). Rien n'est cliquable pour de vrai
 * (`inert`) : le texte de l'étape porte le sens. Mouvement réduit : l'état final, sans curseur ni boucle.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const EASE = [0.4, 0, 0.2, 1] as const;

/** Phase en cours : la phase i dure `durees[i]` ms, puis on rejoue (`tour` + 1 : la scène se remonte). */
export function useTimeline(durees: readonly number[], fige: number) {
  const reduit = !!useReducedMotion();
  const [etat, setEtat] = useState({ phase: 0, tour: 0 });
  useEffect(() => {
    if (reduit) return undefined;
    let id = 0;
    const attendre = (ms: number) => {
      id = window.setTimeout(() => {
        if (document.hidden) { attendre(400); return; } // onglet caché : on reprend là où on en était
        setEtat((e) => (e.phase + 1 >= durees.length ? { phase: 0, tour: e.tour + 1 } : { phase: e.phase + 1, tour: e.tour }));
      }, ms);
    };
    attendre(durees[etat.phase]);
    return () => window.clearTimeout(id);
  }, [etat, reduit, durees]);
  return reduit ? { phase: fige, tour: 0, reduit } : { ...etat, reduit };
}

/** Un nombre qui défile de 0 à `cible` (immédiat en mouvement réduit). */
export function useCompte(cible: number, decimales = 0, duree = 900) {
  const reduit = !!useReducedMotion();
  const [v, setV] = useState(reduit ? cible : 0);
  useEffect(() => {
    if (reduit) return undefined;
    let raf = 0;
    const t0 = performance.now();
    const pas = (t: number) => {
      const k = Math.min(1, (t - t0) / duree);
      setV(cible * (1 - (1 - k) ** 3));
      if (k < 1) raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf);
  }, [cible, duree, reduit]);
  const f = 10 ** decimales;
  return Math.round((reduit ? cible : v) * f) / f;
}

/** Le cadre : fond de la page, coupé en bas comme une capture ; `vers` = sélecteur à amener à `marge` px du haut (la caméra descend). */
export const Ecran: React.FC<{ children: React.ReactNode; vers?: string | null; marge?: number; dessus?: React.ReactNode; className?: string }> = ({
  children, vers = null, marge = 12, dessus = null, className = '',
}) => {
  const contenu = useRef<HTMLDivElement>(null);
  const [y, setY] = useState(0);
  useLayoutEffect(() => {
    const box = contenu.current;
    const el = vers && box ? box.querySelector(vers) : null;
    if (!el || !box) { setY(0); return; }
    // L'écart ne dépend pas du décalage déjà appliqué (les deux bougent ensemble) ; ramené en px CSS (fenêtre encore
    // un peu réduite à son ouverture, zoom du navigateur).
    const b = box.getBoundingClientRect();
    const k = box.offsetHeight ? b.height / box.offsetHeight : 1;
    setY(-Math.max(0, (el.getBoundingClientRect().top - b.top) / k - marge));
  }, [vers, marge]);
  return (
    <div className={`absolute inset-x-3 bottom-0 top-3 overflow-hidden rounded-t-2xl border border-b-0 border-line bg-paper shadow-[0_10px_30px_rgba(20,18,16,.10)] sm:inset-x-6 sm:top-5 ${className}`}>
      <motion.div ref={contenu} animate={{ y }} transition={{ duration: 0.7, ease: EASE }} className="p-3 sm:p-4">
        {children}
      </motion.div>
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-10" style={{ background: 'linear-gradient(to top, rgb(var(--c-paper)), rgb(var(--c-paper) / 0))' }} aria-hidden />
      {dessus /* panneau posé sur la capture (détail d'un chapitre) */}
    </div>
  );
};

/**
 * Curseur : va au centre de l'élément `cible` (sélecteur cherché dans `racine`), `appui` = il clique (pression et onde).
 * `cible` null : il attend, discret, en bas à droite.
 */
export const Curseur: React.FC<{ racine: React.RefObject<HTMLElement | null>; cible: string | null; appui?: boolean; decalage?: { x: number; y: number } }> = ({
  racine, cible, appui = false, decalage = { x: 0, y: 0 },
}) => {
  const reduit = useReducedMotion();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dx = decalage.x, dy = decalage.y;
  // Après le rendu complet (la référence de `racine` est posée après les effets de ses enfants).
  useEffect(() => {
    const root = racine.current;
    if (!root) return;
    const r = root.getBoundingClientRect();
    const k = root.offsetWidth ? r.width / root.offsetWidth : 1; // px CSS (ouverture de la fenêtre, zoom)
    const el = cible ? root.querySelector(cible) : null;
    // Sans cible : il part d'en bas à droite, puis s'efface là où il a cliqué.
    if (!el) { setPos((p) => p ?? { x: root.offsetWidth * 0.82, y: root.offsetHeight * 0.92 }); return; }
    const b = el.getBoundingClientRect();
    setPos({ x: (b.left - r.left + b.width / 2) / k + dx, y: (b.top - r.top + b.height / 2) / k + dy });
  }, [racine, cible, dx, dy]);
  if (reduit || !pos) return null;
  return (
    <motion.div className="pointer-events-none absolute start-0 top-0 z-20" aria-hidden
      initial={{ x: pos.x, y: pos.y, opacity: 0 }} animate={{ x: pos.x, y: pos.y, opacity: cible ? 1 : 0 }}
      transition={{ x: { duration: 0.8, ease: EASE }, y: { duration: 0.8, ease: EASE }, opacity: { duration: 0.25 } }}>
      {appui && (
        <motion.span className="absolute -start-4 -top-4 block h-8 w-8 rounded-full bg-brand/30"
          initial={{ scale: 0.2, opacity: 0.9 }} animate={{ scale: 1.5, opacity: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }} />
      )}
      <motion.svg width="20" height="22" viewBox="0 0 20 22" className="drop-shadow-[0_2px_3px_rgba(20,18,16,.35)]"
        animate={{ scale: appui ? [1, 0.8, 1] : 1 }} transition={{ duration: 0.35 }} style={{ originX: 0, originY: 0 }}>
        <path d="M2 1.5 L2 17.5 L6.4 13.6 L9.3 20 L12.1 18.8 L9.3 12.6 L15.2 12.4 Z" fill="#fff" stroke="#1a1a1a" strokeWidth="1.5" strokeLinejoin="round" />
      </motion.svg>
    </motion.div>
  );
};

/** Centre d'un élément de la scène, en px CSS (même correction d'échelle que le curseur) : origine d'une bascule. */
export function useCentre(racine: React.RefObject<HTMLElement | null>, selecteur: string) {
  const [c, setC] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const root = racine.current;
    const el = root?.querySelector(selecteur);
    if (!root || !el) return;
    const r = root.getBoundingClientRect();
    const k = root.offsetWidth ? r.width / root.offsetWidth : 1;
    const b = el.getBoundingClientRect();
    setC({ x: (b.left - r.left + b.width / 2) / k, y: (b.top - r.top + b.height / 2) / k });
  }, [racine, selecteur]);
  return c;
}

/**
 * Mode sombre (15/10/2026) : la même capture en clair et en sombre, l'une sur l'autre. Le calque sombre (`.dark` :
 * variables et règles du mode sombre sur ce sous-arbre seulement) recouvre le clair (`.fd-fixe.fd-clair` : reste clair
 * même si la page est en sombre). `coupe` = sa forme visible (clip-path animé) : un cercle qui s'ouvre, un rideau…
 */
export const DeuxModes: React.FC<{ rendu: (sombre: boolean) => React.ReactNode; coupe: string; duree?: number }> = ({ rendu, coupe, duree = 0.9 }) => {
  const reduit = useReducedMotion();
  return (
    <>
      <div className="fd-fixe fd-clair absolute inset-0 text-ink">{rendu(false)}</div>
      <motion.div className="dark absolute inset-0 text-ink" initial={{ clipPath: coupe }} animate={{ clipPath: coupe }}
        transition={{ duration: reduit ? 0 : duree, ease: [0.65, 0, 0.35, 1] }}>
        {rendu(true)}
      </motion.div>
    </>
  );
};

// `inert` (React 19) manque aux types de React installés.
const INERT = { inert: true } as React.HTMLAttributes<HTMLDivElement>;

/** Le conteneur d'une scène : décoratif (aria-hidden), rien de cliquable dedans (inert). */
export const Plateau = React.forwardRef<HTMLDivElement, { children: React.ReactNode }>(({ children }, ref) => (
  <div ref={ref} className="pointer-events-none relative h-full w-full select-none" aria-hidden {...INERT}>
    {children}
  </div>
));
Plateau.displayName = 'Plateau';

// Feuilles et tiroirs du téléphone : ils suivent le doigt et se ferment d'un geste (07/11/2026, principes d'Apple,
// « Designing Fluid Interfaces »). Le panneau colle au doigt ; au lâcher, on projette le geste : un petit coup rapide
// ferme autant qu'un long glissé lent. Ressort sans rebond : le site reste calme. Le voile s'éclaircit pendant le geste.
// Le bouton Fermer et Échap restent les chemins au clavier et au lecteur d'écran.
import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { animate, useDragControls, useMotionValue, useTransform, type PanInfo, type Transition } from 'framer-motion';

/** Entrée et sortie par le même chemin, à la même vitesse. */
export const RESSORT_FEUILLE: Transition = { type: 'spring', bounce: 0, duration: 0.34 };

/** Où le geste s'arrêterait s'il continuait sur sa lancée (formule de décélération d'Apple). */
const projection = (vitesse: number, deceleration = 0.998) => (vitesse / 1000) * deceleration / (1 - deceleration);

// En dessous de ce glissé, c'est un tremblement du doigt, pas un geste : la feuille revient.
const GESTE_MINIMUM = 12;

// La vitesse au lâcher est calculée ici, sur les 100 dernières ms du doigt. Celle de framer-motion (info.velocity) est
// fausse pour un coup bref : quand rien n'est animé, son horloge dort et son premier point garde une date périmée
// (mesuré : -145 px/s au lieu de -776 pour le même geste), et la feuille revenait au lieu de se fermer.
const FENETRE_VITESSE = 100;
type Point = { t: number; p: number };
const vitesseAuLacher = (points: Point[], dernier: Point, repli: number) => {
  const recents = points.filter((x) => dernier.t - x.t <= FENETRE_VITESSE);
  const premier = recents[0];
  if (!premier) return 0; // doigt arrêté avant de lâcher
  return dernier.t > premier.t ? ((dernier.p - premier.p) / (dernier.t - premier.t)) * 1000 : repli;
};

export function useGlisserPourFermer({ onClose, refPanneau, ouvert = true, actif = true, axe = 'y', sens = 1 }: {
  onClose: () => void;
  refPanneau: RefObject<HTMLElement | null>;
  /** Un composant resté monté (feuille fermée puis rouverte) repart avec un voile entier. */
  ouvert?: boolean;
  /** Faux sur ordinateur : le panneau n'y est plus une feuille. */
  actif?: boolean;
  /** 'y' : on prend la feuille par sa poignée (sa liste défile). 'x' : le tiroir se prend partout (défilement vertical conservé). */
  axe?: 'x' | 'y';
  /** Sens de la fermeture sur l'axe : 1 vers le bas ou la droite, -1 vers la gauche. */
  sens?: 1 | -1;
}) {
  const controles = useDragControls();
  const avancement = useMotionValue(0);
  const opaciteVoile = useTransform(avancement, [0, 1], [1, 0.25]);
  const fermer = useRef(onClose);
  fermer.current = onClose;
  const points = useRef<Point[]>([]);

  useEffect(() => { if (ouvert) avancement.set(0); }, [ouvert, avancement]);

  const taille = () => {
    const el = refPanneau.current;
    return Math.max(1, el ? (axe === 'y' ? el.offsetHeight : el.offsetWidth) : 1);
  };

  const panneau = actif ? {
    drag: axe,
    dragControls: controles,
    dragListener: axe === 'x',
    dragConstraints: { top: 0, bottom: 0, left: 0, right: 0 },
    // 1 : collé au doigt vers la fermeture. 0,05 : résistance de l'autre côté, il n'y a rien à y voir.
    dragElastic: axe === 'y'
      ? { top: 0.05, bottom: 1 }
      : sens < 0 ? { left: 1, right: 0.05 } : { left: 0.05, right: 1 },
    dragMomentum: false,
    // Retour en place sans rebond et sans traîner : amortissement critique (49 = 2 × √600), environ 0,3 s.
    // Le réglage par défaut de framer-motion mettait près d'une seconde à se poser.
    dragTransition: { bounceStiffness: 600, bounceDamping: 49 },
    onDragStart: () => { points.current = []; },
    onDrag: (_: unknown, info: PanInfo) => {
      points.current.push({ t: performance.now(), p: info.point[axe] });
      if (points.current.length > 32) points.current.shift();
      avancement.set(Math.min(1, Math.max(0, (info.offset[axe] * sens) / taille())));
    },
    onDragEnd: (_: unknown, info: PanInfo) => {
      const parcouru = info.offset[axe] * sens;
      const vitesse = vitesseAuLacher(points.current, { t: performance.now(), p: info.point[axe] }, info.velocity[axe]);
      if (parcouru > GESTE_MINIMUM && parcouru + projection(vitesse * sens) > taille() / 2) fermer.current();
      else animate(avancement, 0, RESSORT_FEUILLE);
    },
  } : {};

  /** Poignée et en-tête d'une feuille : la zone qu'on saisit (ses boutons restent des boutons). */
  const poignee = actif ? {
    style: { touchAction: 'none' as const },
    onPointerDown: (e: ReactPointerEvent) => {
      if (!(e.target as Element).closest('button, a, input, select, textarea')) controles.start(e);
    },
  } : {};

  return { panneau, poignee, opaciteVoile };
}

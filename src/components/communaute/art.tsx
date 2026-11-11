/**
 * Dessins de la communauté (09/11/2026) : bannières à étoiles (zellige), médailles des badges dans un cadre en étoile à
 * huit branches (khatam), avatar entouré de son ornement. Couleurs fixes, identiques en mode sombre (fd-fixe).
 *
 * Images des ornements (générées à part, voir le prompt donné à Natsu) : quand elles existent dans public/badges/,
 * ARTS les liste et elles remplacent le dessin : cadre-<palier>.webp autour, <badge>.webp découpé en rond au centre.
 */
import React, { useId } from 'react';
import {
  Crown, Feather, Flame, GraduationCap, HandHeart, ListChecks, Lock, Mountain, PenLine, Puzzle, type LucideIcon,
} from 'lucide-react';
import type { Banniere, BadgeId } from '@/lib/api/communauteApi';
import { t } from '@/i18n';

export const ICONES: Record<BadgeId, LucideIcon> = {
  serie: Flame, defis: Puzzle, exercices: PenLine, maitrise: GraduationCap, quiz: ListChecks,
  approfondi: Mountain, entraide: HandHeart, auteur: Feather, fondateur: Crown,
};

export const PALIERS = ['', 'Bronze', 'Argent', 'Or'] as const;

/** Images fournies (public/badges/…), vides tant qu'elles n'existent pas : le dessin les remplace. */
const ARTS: { cadres: Partial<Record<1 | 2 | 3, string>>; emblemes: Partial<Record<BadgeId, string>> } = { cadres: {}, emblemes: {} };

type Metal = 'bronze' | 'argent' | 'or' | 'verrou';
const METAL_DE = (palier: number): Metal => (palier >= 3 ? 'or' : palier === 2 ? 'argent' : palier === 1 ? 'bronze' : 'verrou');
const METAUX: Record<Metal, [string, string, string]> = {
  bronze: ['#7a4a2a', '#e0a878', '#a0643a'],
  argent: ['#6f7883', '#eef1f4', '#9aa3ad'],
  or: ['#9a6e1c', '#f6dc8c', '#c0892f'],
  verrou: ['#bdb7ac', '#eeebe5', '#d2cdc4'],
};
const TRAIT = '#3b2a1a';

/** Étoile à huit branches (deux carrés superposés) : 16 sommets autour de (c, c). */
export function etoile(c: number, r: number): string {
  const interieur = r * 0.7654;
  const pts: string[] = [];
  for (let i = 0; i < 16; i += 1) {
    const a = (Math.PI / 8) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : interieur;
    pts.push(`${(c + rr * Math.cos(a)).toFixed(2)},${(c + rr * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}

/* ────── Bannières ────── */

const BANNIERE_COULEURS: Record<Banniere, { fond: string; trait: string; plein: string; opacite: number }> = {
  'zellige-vert': { fond: '#1a7a4a', trait: '#e2b65a', plein: '#fffffe', opacite: 0.07 },
  'zellige-or': { fond: '#c0892f', trait: '#fff4dc', plein: '#fff4dc', opacite: 0.1 },
  nuit: { fond: '#1f1d1a', trait: '#c18a30', plein: '#c18a30', opacite: 0.08 },
  sable: { fond: '#f3ecdd', trait: '#cfae6d', plein: '#c0892f', opacite: 0.08 },
  menthe: { fond: '#e3f1e8', trait: '#7fbf98', plein: '#1a7a4a', opacite: 0.07 },
  terre: { fond: '#a9503a', trait: '#f3d3b0', plein: '#f3d3b0', opacite: 0.09 },
};

export const BANNIERE_NOMS: Record<Banniere, string> = {
  'zellige-vert': 'Zellige vert', 'zellige-or': 'Zellige or', nuit: 'Nuit', sable: 'Sable', menthe: 'Menthe', terre: 'Terre',
};

/** Motif d'étoiles et de rosaces, répété ; `className` donne la hauteur. */
export const BanniereArt: React.FC<{ banniere: Banniere; className?: string }> = ({ banniere, className = '' }) => {
  const id = useId().replace(/:/g, '');
  const c = BANNIERE_COULEURS[banniere] ?? BANNIERE_COULEURS['zellige-vert'];
  return (
    <svg aria-hidden className={`fd-fixe block w-full ${className}`} preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id={`m${id}`} width="56" height="56" patternUnits="userSpaceOnUse">
          <rect width="56" height="56" fill={c.fond} />
          <polygon points={etoile(28, 17)} fill={c.plein} fillOpacity={c.opacite * 2} stroke={c.trait} strokeWidth="1.3" strokeOpacity=".75" />
          <polygon points={etoile(28, 8)} fill="none" stroke={c.trait} strokeWidth="1" strokeOpacity=".55" />
          {[0, 56].flatMap((x) => [0, 56].map((y) => (
            <polygon key={`${x}-${y}`} points={etoile(0, 9).split(' ').map((p) => {
              const [px, py] = p.split(',').map(Number);
              return `${px + x},${py + y}`;
            }).join(' ')} fill="none" stroke={c.trait} strokeWidth="1" strokeOpacity=".5" />
          )))}
          <path d="M28 0 V11 M28 45 V56 M0 28 H11 M45 28 H56" stroke={c.trait} strokeWidth="1" strokeOpacity=".4" />
        </pattern>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".18" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill={`url(#m${id})`} />
      <rect width="100%" height="100%" fill={`url(#g${id})`} />
    </svg>
  );
};

/* ────── Médailles ────── */

const CadreEtoile: React.FC<{ metal: Metal; size: number; className?: string }> = ({ metal, size, className = '' }) => {
  const id = useId().replace(/:/g, '');
  const [sombre, clair, base] = METAUX[metal];
  return (
    <svg aria-hidden viewBox="0 0 100 100" width={size} height={size} className={`fd-fixe ${className}`}>
      <defs>
        <linearGradient id={`c${id}`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor={clair} />
          <stop offset="0.45" stopColor={base} />
          <stop offset="1" stopColor={sombre} />
        </linearGradient>
      </defs>
      <polygon points={etoile(50, 48)} fill={`url(#c${id})`} stroke={TRAIT} strokeWidth="2.4" strokeLinejoin="round" />
      <polygon points={etoile(50, 40)} fill="none" stroke={clair} strokeWidth="1.2" strokeOpacity=".7" strokeLinejoin="round" />
    </svg>
  );
};

/**
 * Médaille d'un badge. palier 0 : pas encore obtenu (grisée, cadenas). `taille` en pixels.
 */
export const Medaille: React.FC<{ badge: BadgeId; palier: number; taille?: number; className?: string; titre?: string }> = ({
  badge, palier: brut, taille = 64, className = '', titre,
}) => {
  const palier = palierVisuel({ id: badge, palier: brut });
  const metal = METAL_DE(palier);
  const Icone = ICONES[badge] ?? Crown;
  const cadre = palier ? ARTS.cadres[Math.min(palier, 3) as 1 | 2 | 3] : undefined;
  const embleme = ARTS.emblemes[badge];
  const centre = taille * 0.6;
  return (
    <span role={titre ? 'img' : undefined} aria-label={titre} aria-hidden={titre ? undefined : true}
      className={`fd-fixe relative inline-flex shrink-0 items-center justify-center ${className}`} style={{ width: taille, height: taille }}>
      {cadre ? <img src={cadre} alt="" className="absolute inset-0 h-full w-full object-contain" />
        : <CadreEtoile metal={metal} size={taille} className="absolute inset-0" />}
      <span className="relative flex items-center justify-center overflow-hidden rounded-full"
        style={{
          width: centre, height: centre,
          background: palier ? 'radial-gradient(circle at 35% 30%, #2a9a62, #1a7a4a 55%, #125a37)' : 'radial-gradient(circle at 35% 30%, #e9e5de, #d6d1c8)',
          boxShadow: `0 0 0 ${Math.max(1.5, taille / 40)}px ${TRAIT}, inset 0 0 0 ${Math.max(1, taille / 64)}px rgba(255,255,255,.25)`,
        }}>
        {embleme && palier ? <img src={embleme} alt="" className="h-full w-full object-cover" />
          : <Icone strokeWidth={2.1} style={{ width: centre * 0.52, height: centre * 0.52, color: palier ? '#fff4dc' : '#a8a196' }} />}
      </span>
      {!palier && (
        <span className="absolute bottom-0 end-0 flex items-center justify-center rounded-full bg-white shadow-[0_1px_3px_rgba(20,18,16,.25)]"
          style={{ width: taille * 0.3, height: taille * 0.3 }}>
          <Lock style={{ width: taille * 0.16, height: taille * 0.16, color: '#8a857c' }} />
        </span>
      )}
    </span>
  );
};

/** Nom d'un palier, traduit. */
export const nomPalier = (palier: number) => (palier ? t(PALIERS[Math.min(palier, 3)]) : t('À gagner'));

/** « Membre fondateur » n'a qu'un palier : il se montre en or. */
export const palierVisuel = (b: { id: BadgeId; palier: number }) => (b.id === 'fondateur' && b.palier ? 3 : b.palier);

/** « Entraide · Argent » ; « Membre fondateur » seul (pas de palier). */
export const libelleBadge = (b: { id: BadgeId; nom: string; palier: number }) =>
  (b.id === 'fondateur' ? t(b.nom) : `${t(b.nom)} · ${nomPalier(b.palier)}`);

/* ────── Avatar orné ────── */

/**
 * Photo (ou lionceau) dans un rond ; avec un palier, l'ornement en étoile du badge mis en avant l'entoure.
 * `taille` : diamètre de la photo en pixels.
 */
export const AvatarOrne: React.FC<{ src?: string | null; nom: string; taille: number; palier?: number; className?: string }> = ({
  src, nom, taille, palier = 0, className = '',
}) => {
  const [casse, setCasse] = React.useState(false);
  React.useEffect(() => { setCasse(false); }, [src]);
  const orne = palier > 0;
  const cadre = orne ? ARTS.cadres[Math.min(palier, 3) as 1 | 2 | 3] : undefined;
  const ext = orne ? Math.round(taille * 1.34) : taille;
  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center ${className}`} style={{ width: ext, height: ext }}>
      {orne && (cadre ? <img src={cadre} alt="" aria-hidden className="fd-fixe absolute inset-0 h-full w-full object-contain" />
        : <CadreEtoile metal={METAL_DE(palier)} size={ext} className="absolute inset-0" />)}
      <span className="relative flex items-center justify-center overflow-hidden rounded-full bg-ink font-semibold text-white"
        style={{ width: taille, height: taille, fontSize: taille * 0.4, boxShadow: orne ? `0 0 0 ${Math.max(2, taille / 36)}px ${TRAIT}` : '0 0 0 4px #fff' }}>
        {src && !casse ? <img src={src} alt="" onError={() => setCasse(true)} className="h-full w-full object-cover" />
          : <span aria-hidden>{nom.charAt(0).toUpperCase()}</span>}
      </span>
    </span>
  );
};

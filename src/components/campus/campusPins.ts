/**
 * Carte illustrée du campus : chaque étiquette est posée sur un bâtiment de l'illustration
 * et mène à une page existante du site. Positions en fractions de l'image (0 → 1), mesurées sur l'illustration.
 */
import type { DashboardStats } from '@/lib/api';
import type { CampusRoomId } from '@/stores/homeViewStore';
// Importée (et non posée dans public/) : le build lui donne un nom unique par version, qu'aucun cache ne peut confondre.
import mapImageUrl from '@/assets/campus/campus-map.webp';

export type PinIcon = 'landmark' | 'book' | 'dumbbell' | 'exam' | 'compass' | 'cap' | 'cog' | 'users';

export interface MapPin {
  id: CampusRoomId;
  /** Nom affiché sur l'illustration. */
  name: string;
  /** Nom de la page, identique à la sidebar. */
  page: string;
  icon: PinIcon;
  /** Point d'ancrage sur l'image (le petit rond au bout de la tige). */
  x: number;
  y: number;
  desc: string;
  route: (username?: string) => string;
}

export const MAP_PINS: MapPin[] = [
  {
    id: 'direction', name: 'Bâtiment principal', page: 'Statistiques', icon: 'landmark', x: 0.469, y: 0.266,
    desc: 'Ton bilan sur la durée : temps d’étude, maîtrise par chapitre, séries.',
    route: (u) => (u ? '/statistiques' : '/'),
  },
  {
    id: 'bibliotheque', name: 'Bibliothèque', page: 'Leçons', icon: 'book', x: 0.239, y: 0.3,
    desc: 'Les cours rédigés, chapitre par chapitre : définitions, théorèmes et méthodes.',
    route: () => '/lessons',
  },
  {
    id: 'td', name: 'Espace exercices', page: 'Exercices', icon: 'dumbbell', x: 0.864, y: 0.322,
    desc: 'Des exercices corrigés pas à pas, à auto-évaluer question par question.',
    route: () => '/exercises',
  },
  {
    id: 'amphi', name: 'Espace examens', page: 'Examens', icon: 'exam', x: 0.625, y: 0.441,
    desc: 'Sujets de bac et contrôles types, à passer en conditions réelles.',
    route: () => '/exams',
  },
  {
    id: 'stade', name: 'Orientation / Parcours', page: 'Parcours', icon: 'compass', x: 0.324, y: 0.518,
    desc: 'Des parcours guidés, chapitre après chapitre : vidéo, puis quiz.',
    route: () => '/learning-path',
  },
  {
    id: 'gare', name: 'Concours', page: 'Concours', icon: 'cap', x: 0.134, y: 0.567,
    desc: 'Les concours d’entrée — ENSA, ENSAM, Médecine : annales en conditions réelles, simulations et astuces.',
    route: () => '/concours',
  },
  {
    id: 'labo', name: 'Espace compétences', page: 'Skill IQ', icon: 'cog', x: 0.632, y: 0.597,
    desc: 'Évalue ton niveau chapitre par chapitre, du palier Débutant au palier Difficile.',
    route: () => '/skill-iq',
  },
  {
    id: 'classes', name: 'Classes', page: 'Classes', icon: 'users', x: 0.148, y: 0.416,
    desc: 'Tes classes : les listes d’exercices de ton professeur et ta progression dans le groupe.',
    route: () => '/classrooms',
  },
];

/** Étiquette de la carte correspondant à une entrée de la sidebar (même route), s'il y en a une. */
export function pinForPath(to: string): MapPin | undefined {
  return MAP_PINS.find((p) => p.id !== 'direction' && p.route() === to);
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/** Vrai si le nom du bâtiment dit déjà la page (« Espace exercices » → Exercices) : inutile de répéter la page. */
export function nameSaysPage(p: MapPin): boolean {
  return fold(p.name).includes(fold(p.page));
}

/** Chiffres réels de /dashboard/stats/ quand ils concernent le bâtiment ; rien d'inventé sinon. */
export function campusStats(id: CampusRoomId, s: DashboardStats | null): [string, string][] {
  if (!s) return [];
  if (id === 'direction') return [[`${s.streak_days || 0} j`, 'de série'], [s.study_time || '0min', 'temps d’étude']];
  if (id === 'td') return [[`${s.exercises_started || 0} / ${s.total_exercises || 0}`, 'exercices commencés'], [`${s.perfect_completions || 0}`, 'exercices parfaits']];
  return [];
}

let pending: Promise<HTMLImageElement | null> | null = null;

/**
 * Charge et décode l'illustration une seule fois : au survol du sélecteur puis à l'affichage,
 * c'est la même requête. En cas d'échec (réseau), on réessaiera à la prochaine demande.
 */
export function loadMapImage(): Promise<HTMLImageElement | null> {
  if (!pending) {
    const p = new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      // Décodée avant affichage (pas de saccade) ; decode() peut rester en attente sur certains navigateurs, d'où le délai maximal.
      img.onload = () => {
        Promise.race([img.decode().catch(() => undefined), new Promise((r) => setTimeout(r, 400))]).then(() => resolve(img));
      };
      img.onerror = () => resolve(null);
      img.src = mapImageUrl;
    });
    pending = p;
    p.then((img) => { if (!img && pending === p) pending = null; });
  }
  return pending;
}

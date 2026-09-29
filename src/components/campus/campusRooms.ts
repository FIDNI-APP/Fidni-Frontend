/**
 * Campus 3D — chaque bâtiment correspond à une page existante du site.
 * Aucune donnée inventée ici : seulement des routes réelles et une phrase qui décrit la page.
 */

import type { CampusRoomId } from '@/stores/homeViewStore';

export type RoomId = CampusRoomId;

export interface CampusRoom {
  id: RoomId;
  /** Raccourci clavier dans la vue 3D. */
  key: string;
  /** Nom de la page, identique à la sidebar. */
  page: string;
  /** Nom du bâtiment, affiché au survol. */
  building: string;
  desc: string;
  route: (username?: string) => string;
  /** Plan de caméra quand on se rend au bâtiment (distance, inclinaison, décalage d'angle). */
  cam: { r: number; phi: number; off: number };
}

export const CAMPUS_ROOMS: CampusRoom[] = [
  {
    id: 'direction', key: '1', page: 'Statistiques', building: 'La Direction',
    desc: 'Ton bilan sur la durée : temps d’étude, maîtrise par chapitre, séries.',
    route: (u) => (u ? `/profile/${u}?tab=statistics` : '/'),
    cam: { r: 82, phi: 1.0, off: 0.32 },
  },
  {
    id: 'bibliotheque', key: '2', page: 'Leçons', building: 'La Bibliothèque',
    desc: 'Les cours rédigés, chapitre par chapitre : définitions, théorèmes et méthodes.',
    route: () => '/lessons',
    cam: { r: 70, phi: 1.02, off: 0.4 },
  },
  {
    id: 'td', key: '3', page: 'Exercices', building: 'La Salle de TD',
    desc: 'Des exercices corrigés pas à pas, à auto-évaluer question par question.',
    route: () => '/exercises',
    cam: { r: 70, phi: 1.02, off: -0.4 },
  },
  {
    id: 'amphi', key: '4', page: 'Examens', building: 'L’Amphithéâtre',
    desc: 'Sujets de bac et contrôles types, à passer en conditions réelles.',
    route: () => '/exams',
    cam: { r: 70, phi: 1.0, off: -0.35 },
  },
  {
    id: 'stade', key: '5', page: 'Parcours', building: 'Le Stade',
    desc: 'Des parcours guidés qui se suivent comme des tours de piste : vidéo, puis quiz, chapitre après chapitre.',
    route: () => '/learning-path',
    cam: { r: 88, phi: 0.9, off: 0.3 },
  },
  {
    id: 'gare', key: '6', page: 'Concours', building: 'La Gare',
    desc: 'Les concours d’entrée — ENSA, ENSAM, Médecine : annales en conditions réelles, simulations et astuces.',
    route: () => '/concours',
    cam: { r: 74, phi: 0.98, off: 0.55 },
  },
  {
    id: 'labo', key: '7', page: 'Skill IQ', building: 'Le Labo',
    desc: 'Évalue ton niveau chapitre par chapitre, du palier Débutant au palier Difficile.',
    route: () => '/skill-iq',
    cam: { r: 64, phi: 1.0, off: 0.5 },
  },
  {
    id: 'classes', key: '8', page: 'Classes', building: 'Le Pavillon des classes',
    desc: 'Tes classes : les listes d’exercices de ton professeur et ta progression dans le groupe.',
    route: () => '/classrooms',
    cam: { r: 62, phi: 1.0, off: -0.45 },
  },
];

/** Bâtiment correspondant à une entrée de la sidebar (même route), s'il y en a un. */
export function roomForPath(to: string): CampusRoom | undefined {
  return CAMPUS_ROOMS.find((r) => r.id !== 'direction' && r.route() === to);
}

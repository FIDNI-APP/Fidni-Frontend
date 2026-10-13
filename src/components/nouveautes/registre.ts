/**
 * Fenêtres « Nouveautés » (14/10/2026) : ce que chacune raconte, étape par étape. Le serveur décide qui la voit et
 * retient qu'elle a été vue (backend apps/users/nouveautes.py, même id) ; ce fichier reste léger (pas de scène
 * importée ici : elles sont chargées avec la fenêtre). Ajouter une nouveauté = une entrée ici + une ligne côté serveur.
 */
export type SceneId = 'apercu' | 'faibles' | 'chapitres' | 'temps';

export interface Etape { scene: SceneId; titre: string; texte: string }

export interface Nouveaute {
  id: string;
  /** Ce qui est nouveau, à côté de la pastille « Nouveau ». */
  sujet: string;
  etapes: Etape[];
  /** Dernière étape : le bouton principal. */
  cta: { label: string; to: string };
  /** Visite guidée qui raconte la même chose : marquée vue si la fenêtre est vue jusqu'au bout. */
  visite?: string;
}

export const NOUVEAUTES: Record<string, Nouveaute> = {
  'progression-2026-10': {
    id: 'progression-2026-10',
    sujet: 'Ma progression',
    visite: 'progression',
    cta: { label: 'Voir ma progression', to: '/progression' },
    etapes: [
      { scene: 'apercu', titre: 'Ta progression en un coup d’œil', texte: 'Questions réussies, note aux examens, temps, jours actifs. Touche un jour pour voir ce que tu as fait.' },
      { scene: 'faibles', titre: 'Tes points faibles, théorème par théorème', texte: 'Les théorèmes de tes questions ratées, les moins réussis d’abord, et un clic pour t’entraîner.' },
      { scene: 'chapitres', titre: 'Ta note, chapitre par chapitre', texte: 'Moyenne, minimum, maximum et évolution, d’après ce que tu coches sur ta copie.' },
      { scene: 'temps', titre: 'Où passe ton temps', texte: 'Par chapitre, puis par contenu. Touche une barre pour creuser.' },
    ],
  },
};

/** La plus récente : rouverte par `?nouveautes=1`. */
export const DERNIERE = 'progression-2026-10';

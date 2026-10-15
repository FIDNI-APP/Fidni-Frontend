/**
 * Fenêtres « Nouveautés » (14/10/2026) : ce que chacune raconte, étape par étape. Le serveur décide qui la voit et
 * retient qu'elle a été vue (backend apps/users/nouveautes.py, même id) ; ce fichier reste léger (pas de scène
 * importée ici : elles sont chargées avec la fenêtre). Ajouter une nouveauté = une entrée ici + une ligne côté serveur.
 */
export type SceneId = 'apercu' | 'faibles' | 'chapitres' | 'temps' | 'sombre-bascule' | 'sombre-contenu' | 'sombre-reglage';

/** Bouton de la dernière étape : une page à ouvrir, ou le mode sombre à mettre (`dejaLabel` s'il l'est déjà). */
export type Cta = { label: string; to: string } | { label: string; theme: 'dark'; dejaLabel: string };

export interface Etape { scene: SceneId; titre: string; texte: string }

export interface Nouveaute {
  id: string;
  /** Ce qui est nouveau, à côté de la pastille « Nouveau ». */
  sujet: string;
  etapes: Etape[];
  /** Dernière étape : le bouton principal. */
  cta: Cta;
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
  // Mode sombre (15/10/2026) : pour tout le monde ; le bouton le met tout de suite.
  'mode-sombre-2026-10': {
    id: 'mode-sombre-2026-10',
    sujet: 'Mode sombre',
    cta: { label: 'Passer en mode sombre', theme: 'dark', dejaLabel: 'C’est parti' },
    etapes: [
      { scene: 'sombre-bascule', titre: 'Le mode sombre est arrivé', texte: 'Touche la lune en haut de l’écran : tout FIDNI passe en sombre, plus doux pour les yeux le soir.' },
      { scene: 'sombre-contenu', titre: 'Tes exercices aussi', texte: 'Énoncés, corrigés, Ma progression : tout se lit en sombre. Les figures gardent leur fond blanc.' },
      { scene: 'sombre-reglage', titre: 'Clair, sombre ou système', texte: 'Le soleil te ramène au clair. Dans Paramètres, « Système » suit le réglage de ton téléphone.' },
    ],
  },
};

/** La plus récente : rouverte par `?nouveautes=1` (ou son id : `?nouveautes=progression-2026-10`). */
export const DERNIERE = 'mode-sombre-2026-10';

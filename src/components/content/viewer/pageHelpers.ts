// Petits outils partagés par la page d'un contenu (en-tête, fil d'Ariane, rendu des questions).
import { useEffect, useSyncExternalStore } from 'react';

/**
 * Largeur de la feuille à l'écran = celle de la feuille A4 imprimée (PaperExport : 210 mm − 2 × 16 mm de
 * marges = 178 mm de texte en 11 pt, soit 45,9 fois la taille du texte), rapportée à la taille du texte de
 * l'écran (17,5 px, ReadingStyles). Mêmes proportions, donc à peu près les mêmes retours à la ligne que le PDF.
 * Le cadre de chaque page s'en déduit : marges intérieures de la feuille, colonnes voisines, marges de la page.
 */
export const SHEET_TEXT_PX = Math.round(45.9 * 17.5); // 803
const PAGE_PAD = 2 * 32 + 2; // md:px-8 de la page + bordures de la feuille
/** Examen : feuille (sm:px-8) + colonne « copie » (272 px) et son écart (32 px). */
export const EXAM_TWO_COLUMNS_PX = SHEET_TEXT_PX + 2 * 32 + 2 + 32 + 272;
export const DETAIL_MAX_WIDTH = {
  // Exercice : la feuille et la colonne « Question par question » (15/10/2026), comme l'examen.
  exercise: EXAM_TWO_COLUMNS_PX + 2 * 32,
  lesson: 200 + 40 + SHEET_TEXT_PX + 2 * 48 + PAGE_PAD, // sommaire (200 px, écart 40 px), feuille en sm:px-12
  exam: EXAM_TWO_COLUMNS_PX + 2 * 32,
} as const;

type Named = { id?: number | string; name: string; slug?: string; class_levels?: Named[] };
type Slugged = Named & { slug: string };

/**
 * Page de niveau / de chapitre d'un contenu (/exercises/niveau/<niveau>/<chapitre>) : le niveau de l'élève
 * s'il est concerné, sinon un niveau où le premier chapitre existe. Sert au retour et au fil d'Ariane.
 */
export function contentHub(
  content: { class_levels?: unknown; chapters?: unknown },
  studentLevel: string | null,
): { level: Slugged | null; chapter: Slugged | null } {
  const levels = ((content.class_levels || []) as Named[]).filter((l): l is Slugged => !!l.slug);
  const chapter = ((content.chapters || []) as Named[]).find((ch): ch is Slugged => !!ch.slug);
  const inChapter = (l: Named) => !chapter?.class_levels?.length || chapter.class_levels.some((x) => x.slug === l.slug);
  const level = levels.find((l) => l.slug === studentLevel && inChapter(l)) ?? levels.find(inChapter) ?? levels[0] ?? null;
  return { level, chapter: level && chapter && inChapter(level) ? chapter : null };
}

// Une seule demande à l'élève à la fois sur la page : tant qu'un « Tu avais trouvé ? » attend sa réponse,
// les autres (ressenti du FinishPanel…) patientent. Compteur partagé, lu avec useFoundPromptOpen().
let openPrompts = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** Vrai tant qu'au moins un « Tu avais trouvé ? » est affiché sur la page. */
export const useFoundPromptOpen = () => useSyncExternalStore(subscribe, () => openPrompts > 0, () => false);

/** Une demande « Tu avais trouvé ? » est affichée tant que `active` est vrai. */
export function useRegisterPrompt(active: boolean) {
  useEffect(() => {
    if (!active) return;
    openPrompts += 1; emit();
    return () => { openPrompts -= 1; emit(); };
  }, [active]);
}

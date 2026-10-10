// Petits outils partagés par la page d'un contenu (en-tête, fil d'Ariane, rendu des questions).
import { useEffect, useSyncExternalStore } from 'react';

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

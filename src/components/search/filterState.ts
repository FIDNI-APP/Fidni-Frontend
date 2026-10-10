// État des filtres des listes (exercices, examens, leçons) : partagé par la barre de filtres
// (HorizontalFilterBar) et la page de liste (ContentList).
import type { Difficulty } from '@/types';

export interface ListFilters {
  classLevels: string[];
  subjects: string[];
  subfields: string[];
  chapters: string[];
  theorems: string[];
  difficulties: Difficulty[];
  showViewed?: boolean;
  hideViewed?: boolean;
  showCompleted?: boolean;
  showFailed?: boolean;
  /** « À faire » : tout sauf ce que l'élève a déjà réussi. */
  todo?: boolean;
  isNationalExam?: boolean;
  dateStart?: string | null;
  dateEnd?: string | null;
}

/** Slugs du niveau et du chapitre choisis (s'il n'y en a qu'un) : la liste peut aller sur leur page. */
export interface FilterSlugs { level?: string; chapter?: string }

/** Filtre actif affiché en étiquette : `key` = « champ:valeur » (« difficulties:hard », « todo »). */
export interface ActiveChip { key: string; label: string }

/** Filtres imposés par la page (niveau, chapitre d'une page de niveau / chapitre). */
export interface FixedFilters { classLevels?: string[]; chapters?: string[] }

/** Filtres vides (en gardant ceux qu'impose la page). */
export function clearedFilters(fixed?: FixedFilters): ListFilters {
  return {
    classLevels: [...(fixed?.classLevels ?? [])], subjects: [], subfields: [], chapters: [...(fixed?.chapters ?? [])],
    theorems: [], difficulties: [], showViewed: false, hideViewed: false, showCompleted: false, showFailed: false,
    todo: false, isNationalExam: undefined, dateStart: null, dateEnd: null,
  };
}

/** Bascule une valeur d'un filtre à choix multiple ; un niveau ou un chapitre retire ce qui en dépend. */
export function toggled(filters: ListFilters, field: 'classLevels' | 'subjects' | 'subfields' | 'chapters' | 'theorems' | 'difficulties', value: string): ListFilters {
  const current = filters[field] as string[];
  const values = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  const next = { ...filters, [field]: values } as ListFilters;
  if (field === 'classLevels') Object.assign(next, { subjects: [], subfields: [], chapters: [], theorems: [] });
  else if (field === 'subjects') Object.assign(next, { subfields: [], chapters: [], theorems: [] });
  else if (field === 'chapters') next.theorems = [];
  return next;
}

/** Filtres sans l'étiquette `key` (« Retirer … × »). */
export function withoutChip(filters: ListFilters, key: string): ListFilters {
  const [field, value] = key.split(':');
  if (value !== undefined && ['classLevels', 'subjects', 'subfields', 'chapters', 'theorems', 'difficulties'].includes(field)) {
    return toggled(filters, field as 'classLevels', value);
  }
  if (field === 'isNationalExam') return { ...filters, isNationalExam: undefined };
  if (field === 'dateStart' || field === 'dateEnd') return { ...filters, [field]: null };
  return { ...filters, [field]: false };
}

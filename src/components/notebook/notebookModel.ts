// Cahiers de cours : forme des réponses de l'API (GET /notebooks/get_notebooks/, /notebooks/:id/) et petits calculs
// partagés par l'onglet « Cahiers » de Mes enregistrements et la liseuse (/notebooks?nb=<id>).
// Les identifiants arrivent en nombres : on compare toujours avec String().
import { t, dateLocale } from '@/i18n';
import { hubPath, slugify } from '@/lib/api/hubApi';

export type Id = string | number;
export interface NbRef { id: Id; name: string; slug?: string | null }
export interface NbLesson { id: Id; title: string; content?: string; structure?: unknown }
export interface NbEntry { id: Id; lesson: NbLesson; page_order?: number; added_at?: string }
export interface NbSection { id: Id; chapter: NbRef; lesson_entries: NbEntry[]; user_notes?: string; order?: number }
export interface NbNotebook {
  id: Id;
  title: string;
  subject: NbRef;
  class_level: NbRef;
  sections: NbSection[];
  created_at?: string;
  updated_at?: string;
}

export const sameId = (a: unknown, b: unknown) => String(a) === String(b);

// Les mots (« leçon », « chapitres remplis »…) sont des clés de traduction : t() est appelé à l'affichage.
export const plural = (n: number, word: string, many = `${word}s`) => t('{n} {mot}', { n, mot: t(n > 1 ? many : word) });

/** Ce que montre la couverture : leçons rangées, chapitres remplis sur le programme, dernier ajout. */
export function summarize(nb: NbNotebook) {
  const sections = nb.sections ?? [];
  let lessons = 0;
  let filled = 0;
  let last: { title: string; at: string } | null = null;
  for (const s of sections) {
    const entries = s.lesson_entries ?? [];
    lessons += entries.length;
    if (entries.length) filled += 1;
    for (const e of entries) {
      if (e.added_at && (!last || e.added_at > last.at)) last = { title: e.lesson?.title ?? '', at: e.added_at };
    }
  }
  return { lessons, filled, total: sections.length, last };
}

/** « aujourd’hui », « hier », « il y a 3 j », puis la date. */
export function ago(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((start(new Date()) - start(d)) / 86_400_000);
  if (days <= 0) return t('aujourd’hui');
  if (days === 1) return t('hier');
  if (days < 30) return t('il y a {n} j', { n: days });
  return t('le {date}', { date: d.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' }) });
}

/** Chapitres du cahier : ceux qui ont des leçons d'abord (dans l'ordre du cahier), puis les vides. */
export function splitSections(nb: NbNotebook | null) {
  const all = [...(nb?.sections ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return {
    filled: all.filter((s) => s.lesson_entries?.length),
    empty: all.filter((s) => !s.lesson_entries?.length),
  };
}

/** Leçons d'un chapitre du programme, au niveau du cahier (dossier /lessons/niveau/<niveau>/<chapitre>). */
export function chapterLessonsPath(nb: NbNotebook, chapter: NbRef): string {
  const level = nb.class_level?.slug || (nb.class_level?.name ? slugify(nb.class_level.name) : '');
  const ch = chapter.slug || (chapter.name ? slugify(chapter.name) : '');
  return level ? hubPath('lessons', level, ch || undefined) : '/lessons';
}

/** Message d'erreur renvoyé par l'API (« Tu as déjà un cahier qui porte ce nom… »), sinon le message prévu. */
export const apiError = (e: unknown, fallback: string): string =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;

// Données des cartes de liste (exercices, examens, leçons) : repères (chapitre, niveau, nombre de
// questions, durée…), état de l'élève, ressenti des élèves, favori.
import { useEffect, useState } from 'react';
import type { ExerciseListItem, ExamListItem, Felt, LessonListItem, UserProgress } from '@/types/content';
import { exerciseContentAPI, examContentAPI, lessonContentAPI } from '@/lib/api';
import { hubPath, slugify } from '@/lib/api/hubApi';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/auth/AuthController';

export type ListItem = ExerciseListItem | ExamListItem | LessonListItem;

/** Ce que les cartes lisent de la structure JSON d'un contenu (blocs d'exercice/examen, sections de leçon). */
export interface PreviewNode {
  id?: string;
  type?: string;
  title?: string;
  points?: number;
  content?: { html?: string };
  subQuestions?: PreviewNode[];
  subSections?: PreviewNode[];
}
export interface PreviewStructure { blocks?: PreviewNode[]; sections?: PreviewNode[]; a_verifier?: boolean }
export const structureOf = (item: ListItem): PreviewStructure | undefined =>
  (item as { structure?: PreviewStructure }).structure;
export type ListKind = 'exercise' | 'lesson' | 'exam';

export const BASE_PATH: Record<ListKind, string> = { exercise: '/exercises', lesson: '/lessons', exam: '/exams' };
export const TYPE_LABEL: Record<ListKind, string> = { exercise: 'Exercice', lesson: 'Leçon', exam: 'Examen' };

// Tons adoucis du site (vert / ambre / brique).
export const DIFFICULTY: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  easy:   { label: 'Facile',    dot: '#2f8a57', text: '#15633c', bg: '#eaf3ed' },
  medium: { label: 'Moyen',     dot: '#c9962e', text: '#9a6e1c', bg: '#faf3e2' },
  hard:   { label: 'Difficile', dot: '#b4534b', text: '#a23b34', bg: '#fbecea' },
};

const nameOf = (x: unknown): string => (typeof x === 'string' ? x : (x as { name?: string } | undefined)?.name ?? '');

export function chapterLabel(item: ListItem): string | null {
  const ch = item.chapters ?? [];
  if (!ch.length) return null;
  return nameOf(ch[0]) + (ch.length > 1 ? ` +${ch.length - 1}` : '');
}

/**
 * Page du chapitre de la carte (/exercises/niveau/2eme-bac-sm/limites-et-continuite). `levelSlug` : le niveau
 * de la page affichée, s'il fait partie de ceux du contenu ; sinon le premier niveau du contenu.
 */
export function chapterHref(item: ListItem, kind: ListKind, levelSlug?: string | null): string | null {
  const ch = item.chapters?.[0];
  if (!ch?.name) return null;
  const levels = (item.class_levels ?? []).map((lv) => lv.slug || (lv.name ? slugify(lv.name) : '')).filter(Boolean);
  const level = levelSlug && levels.includes(levelSlug) ? levelSlug : levels[0];
  if (!level) return null;
  return hubPath(BASE_PATH[kind].slice(1), level, ch.slug || slugify(ch.name));
}

export function levelLabel(item: ListItem): string | null {
  const lv = item.class_levels ?? [];
  if (!lv.length) return null;
  return nameOf(lv[0]) + (lv.length > 1 ? ` +${lv.length - 1}` : '');
}

/** HTML → texte brut (pour compter les mots d'une leçon). */
function flatten(html: string): string {
  return html
    .replace(/<(br|\/p|\/li|\/div|\/h\d)\s*\/?>/gi, ' ')
    .replace(/<img[^>]*>/gi, ' [figure] ')
    .replace(/<[^>]*>/g, '')
    .replace(/\$\$([\s\S]*?)\$\$/g, (_, m) => `$${m}$`)
    .replace(/\\dfrac/g, '\\frac')
    .replace(/\\displaystyle/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

function durationLabel(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} h${m ? ` ${String(m).padStart(2, '0')}` : ''}` : `${m} min`;
}

/** Durée attendue « ≈ 25 min » (somme des meta.expected_seconds des questions, calculée par le serveur). */
export const expectedLabel = (item: ListItem): string | null => {
  const min = (item as { expected_minutes?: number | null }).expected_minutes;
  return min && min > 0 ? `≈ ${durationLabel(min)}` : null;
};

/** Repères chiffrés, tous tirés du contenu lui-même (rien d'estimé au hasard). */
export function facts(item: ListItem, kind: ListKind): string[] {
  const s = structureOf(item);
  const out: string[] = [];
  if (kind === 'lesson') {
    const n = Array.isArray(s?.sections) ? s.sections.length : 0;
    if (n) out.push(plural(n, 'partie'));
    const words = Array.isArray(s?.sections)
      ? flatten(s.sections.map((x) => [x?.content?.html ?? '', ...(x?.subSections ?? []).map((y) => y?.content?.html ?? '')].join(' ')).join(' '))
        .split(' ').filter(Boolean).length
      : 0;
    if (words) out.push(`${Math.max(1, Math.round(words / 150))} min de lecture`);
    return out;
  }
  if (kind === 'exam') {
    const exam = item as ExamListItem;
    // En mode Cartes la structure est tronquée : le nombre de parties vient du serveur quand il le donne.
    const parts = exam.section_count
      ?? (Array.isArray(s?.blocks) ? s.blocks.filter((b) => b?.type === 'section').length : 0);
    if (parts) out.push(plural(parts, 'exercice'));
    if (exam.total_points) out.push(`${exam.total_points} points`);
    const duration = exam.duration_minutes ? durationLabel(exam.duration_minutes) : expectedLabel(item);
    if (duration) out.push(duration);
    if (!parts && exam.item_count) out.push(plural(exam.item_count, 'question'));
    return out;
  }
  const n = (item as ExerciseListItem).item_count;
  if (n) out.push(plural(n, 'question'));
  const expected = expectedLabel(item);
  if (expected) out.push(expected);
  return out;
}

/** Questions déjà évaluées par l'élève (null : rien de commencé, ou visiteur). */
export function questionProgress(item: ListItem): UserProgress | null {
  const p = (item as { user_progress?: UserProgress | null }).user_progress;
  return p && p.total > 0 && p.assessed > 0 ? p : null;
}

/** Infobulle du ressenti : « 34 % des 22 élèves l'ont réussi · 9 avis ». */
export function feltTooltip(felt: Felt): string {
  const parts: string[] = [];
  if (felt.success_pct != null && felt.n > 0) {
    parts.push(felt.n === 1 ? `${felt.success_pct} % de réussite (1 élève)` : `${felt.success_pct} % des ${felt.n} élèves l’ont réussi`);
  }
  const { easier = 0, as_said = 0, harder = 0 } = felt.votes ?? {};
  const total = easier + as_said + harder;
  if (total > 0) {
    // Sans réussite mesurée, les avis sont toute l'explication : on les détaille.
    parts.push(felt.success_pct == null
      ? `${total} avis : ${harder} « plus dur », ${as_said} « comme annoncé », ${easier} « plus facile »`
      : `${total} avis`);
  }
  return parts.join(' · ') || 'Ressenti des élèves';
}

/** Téléphone (sous 640 px, le « sm » de Tailwind) : suit les changements de taille. */
export function usePhone(): boolean {
  const query = '(max-width: 639px)';
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const on = () => setPhone(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return phone;
}

export type Progress = 'success' | 'review' | null;
export const progressOf = (item: ListItem): Progress => (item.user_complete ?? null) as Progress;

/** Favori : état local + appel API, fenêtre de connexion pour un visiteur. */
export function useBookmark(item: ListItem, kind: ListKind) {
  const { isAuthenticated } = useAuth();
  const { openModal } = useAuthModal();
  const [saved, setSaved] = useState(Boolean(item.user_save));
  const [busy, setBusy] = useState(false);
  useEffect(() => setSaved(Boolean(item.user_save)), [item.user_save]);

  const toggle = async (e?: { preventDefault(): void; stopPropagation(): void }) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!isAuthenticated) { openModal('favori'); return; }
    const api = kind === 'exam' ? examContentAPI : kind === 'lesson' ? lessonContentAPI : exerciseContentAPI;
    setBusy(true);
    try {
      if (saved) await api.unsave(String(item.id)); else await api.save(String(item.id));
      setSaved(!saved);
    } catch (err) {
      console.error('Favori', err);
    } finally {
      setBusy(false);
    }
  };
  return { saved, busy, toggle };
}

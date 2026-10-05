// Données des cartes de liste (exercices, examens, leçons) : repères (chapitre, niveau, nombre de
// questions…), état de l'élève, favori.
import { useEffect, useState } from 'react';
import type { ExerciseListItem, ExamListItem, LessonListItem } from '@/types/content';
import { exerciseContentAPI, examContentAPI, lessonContentAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/auth/AuthController';

export type ListItem = ExerciseListItem | ExamListItem | LessonListItem;
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

/** Repères chiffrés, tous tirés du contenu lui-même (rien d'estimé au hasard). */
export function facts(item: ListItem, kind: ListKind): string[] {
  const s = (item as { structure?: any }).structure;
  const out: string[] = [];
  if (kind === 'lesson') {
    const n = Array.isArray(s?.sections) ? s.sections.length : 0;
    if (n) out.push(plural(n, 'partie'));
    const words = Array.isArray(s?.sections)
      ? flatten(s.sections.map((x: any) => [x?.content?.html ?? '', ...(x?.subSections ?? []).map((y: any) => y?.content?.html ?? '')].join(' ')).join(' '))
        .split(' ').filter(Boolean).length
      : 0;
    if (words) out.push(`${Math.max(1, Math.round(words / 150))} min de lecture`);
    return out;
  }
  if (kind === 'exam') {
    const parts = Array.isArray(s?.blocks) ? s.blocks.filter((b: any) => b?.type === 'section').length : 0;
    if (parts) out.push(plural(parts, 'exercice'));
    const exam = item as ExamListItem;
    if (exam.total_points) out.push(`${exam.total_points} points`);
    if (exam.duration_minutes) out.push(durationLabel(exam.duration_minutes));
    if (!parts && exam.item_count) out.push(plural(exam.item_count, 'question'));
    return out;
  }
  const n = (item as ExerciseListItem).item_count;
  if (n) out.push(plural(n, 'question'));
  return out;
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
    if (!isAuthenticated) { openModal(); return; }
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

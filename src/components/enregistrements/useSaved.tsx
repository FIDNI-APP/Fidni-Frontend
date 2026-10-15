// Favoris de l'élève : exercices, examens et leçons enregistrés (trois appels en parallèle ; un type en
// échec n'empêche pas d'afficher les autres). Retirer un favori est immédiat, avec « Annuler » pendant 5 s.
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { t } from '@/i18n';
import { getUserSavedExams, getUserSavedExercises, getUserSavedLessons } from '@/lib/api/userApi';
import { examContentAPI, exerciseContentAPI, lessonContentAPI } from '@/lib/api';
import type { ListItem, ListKind } from '@/components/content/listing/listingUtils';

export type SavedItem = ListItem & { kind: ListKind };

type Page = ListItem[] | { results?: ListItem[] } | null | undefined;
const asList = (data: Page): ListItem[] => (Array.isArray(data) ? data : data?.results || []);
const KINDS: ListKind[] = ['exercise', 'exam', 'lesson'];
const apiFor = (kind: ListKind) => (kind === 'exam' ? examContentAPI : kind === 'lesson' ? lessonContentAPI : exerciseContentAPI);
export const savedKey = (x: SavedItem) => `${x.kind}-${x.id}`;

/** Le serveur répond 400 « already_saved » quand le favori existe déjà : c'est un succès. */
const alreadySaved = (e: unknown) => Boolean((e as { response?: { data?: { already_saved?: boolean } } })?.response?.data?.already_saved);

export function useSaved(username: string | undefined) {
  const [items, setItems] = useState<SavedItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  const reload = useCallback(async () => {
    if (!username) return;
    setFailed(false);
    const res = await Promise.allSettled([
      getUserSavedExercises(username), getUserSavedExams(username), getUserSavedLessons(username),
    ]);
    if (res.some((r) => r.status === 'rejected')) setFailed(true);
    setItems(res.flatMap((r, i) => (r.status === 'fulfilled'
      ? asList(r.value as Page).map((item) => ({ ...item, kind: KINDS[i] }) as SavedItem)
      : [])));
  }, [username]);

  useEffect(() => { reload(); }, [reload]);

  const putBack = (item: SavedItem, index: number) => setItems((cur) => {
    if (!cur || cur.some((x) => savedKey(x) === savedKey(item))) return cur;
    const next = [...cur];
    next.splice(Math.min(Math.max(index, 0), next.length), 0, item);
    return next;
  });

  const remove = async (item: SavedItem) => {
    const index = (items ?? []).findIndex((x) => savedKey(x) === savedKey(item));
    setItems((cur) => cur?.filter((x) => savedKey(x) !== savedKey(item)) ?? cur);
    const api = apiFor(item.kind);
    try {
      await api.unsave(String(item.id));
    } catch {
      putBack(item, index);
      toast.error(t('Le favori n’a pas pu être retiré.'));
      return;
    }
    const undo = async () => {
      putBack(item, index);
      try {
        await api.save(String(item.id));
      } catch (e) {
        if (alreadySaved(e)) return;
        setItems((cur) => cur?.filter((x) => savedKey(x) !== savedKey(item)) ?? cur);
        toast.error(t('Le favori n’a pas pu être remis.'));
      }
    };
    toast((tt) => (
      <span className="flex items-center gap-3">
        <span>{t('Retiré de tes favoris')}</span>
        <button type="button" onClick={() => { toast.dismiss(tt.id); undo(); }}
          className="-my-1 min-h-9 rounded-lg px-2 font-semibold text-brand-line underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
          {t('Annuler')}
        </button>
      </span>
    ), { id: `favori-${savedKey(item)}`, duration: 5000 });
  };

  return { items, failed, reload, remove };
}

export type SavedState = ReturnType<typeof useSaved>;

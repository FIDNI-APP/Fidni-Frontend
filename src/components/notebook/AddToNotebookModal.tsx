// Ajouter une leçon à un cahier de cours : directement dans le chapitre de la leçon.
// Le cahier de la bonne matière et du bon niveau vient en premier ; s'il n'existe pas, on le crée en
// un clic (ses chapitres sont créés d'après le programme), et le chapitre manquant est ajouté au besoin.
// On ne propose jamais un chapitre sans rapport (« Nombres complexes » pour une leçon de limites).
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ArrowRight, BookMarked, Check, Loader2, Plus, X } from 'lucide-react';
import { api } from '@/lib/api/apiClient';
import { addLessonToNotebook, addChapterToNotebook } from '@/lib/api/notebookApi';
import toast from 'react-hot-toast';

interface Ref { id: string | number; name: string }
interface NotebookSection { id: string | number; chapter: Ref; lesson_entries: { id: string | number; lesson: { id: string | number } }[] }
interface Notebook { id: string | number; title: string; subject: Ref; class_level: Ref; sections: NotebookSection[] }

interface AddToNotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId: string;
  lessonTitle?: string;
  lessonChapters?: { id: string; name: string }[];
  lessonSubject?: { id: string | number; name: string } | null;
  lessonLevels?: { id: string | number; name: string }[];
}

const same = (a: unknown, b: unknown) => String(a) === String(b);

export const AddToNotebookModal: React.FC<AddToNotebookModalProps> = ({
  isOpen, onClose, lessonId, lessonTitle, lessonChapters = [], lessonSubject, lessonLevels = [],
}) => {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<{ notebookId: string | number; chapter: string } | null>(null);
  // Nom du cahier créé depuis la leçon : proposé, modifiable (avant : toujours « Matière - Niveau »).
  const [newTitle, setNewTitle] = useState('');
  useEffect(() => {
    if (lessonSubject && lessonLevels.length) setNewTitle(`${lessonSubject.name} - ${lessonLevels[0].name}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonSubject?.id, lessonLevels[0]?.id]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/notebooks/get_notebooks/');
      setNotebooks(r.data || []);
    } catch {
      setNotebooks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) { setDone(null); load(); }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Cahiers de la même matière : ceux du niveau de la leçon d'abord.
  const { matching, others } = useMemo(() => {
    const bySubject = notebooks.filter((n) => !lessonSubject || same(n.subject?.id, lessonSubject.id));
    const levelOk = (n: Notebook) => !lessonLevels.length || lessonLevels.some((l) => same(l.id, n.class_level?.id));
    return { matching: bySubject.filter(levelOk), others: bySubject.filter((n) => !levelOk(n)) };
  }, [notebooks, lessonSubject, lessonLevels]);

  const hasLesson = (s?: NotebookSection) => !!s?.lesson_entries?.some((e) => same(e.lesson?.id, lessonId));

  const addTo = async (nb: Notebook, chapter: { id: string; name: string }) => {
    const key = `${nb.id}-${chapter.id}`;
    setBusy(key);
    try {
      let section: { id: string | number } | undefined = nb.sections.find((s) => same(s.chapter?.id, chapter.id));
      if (!section) section = await addChapterToNotebook(String(nb.id), String(chapter.id));
      await addLessonToNotebook(String(nb.id), String(section!.id), lessonId);
      toast.success(`Leçon ajoutée à « ${chapter.name} »`);
      setDone({ notebookId: nb.id, chapter: chapter.name });
      await load();
    } catch {
      toast.error('La leçon n’a pas pu être ajoutée.');
    } finally {
      setBusy(null);
    }
  };

  const createAndAdd = async () => {
    if (!lessonSubject || !lessonLevels.length) return;
    setBusy('create');
    try {
      const r = await api.post('/notebooks/create_notebook/', {
        subject_id: lessonSubject.id, class_level_id: lessonLevels[0].id, title: newTitle.trim(),
      });
      const nb: Notebook = r.data;
      const chapter = lessonChapters[0];
      if (chapter) {
        let section: { id: string | number } | undefined = nb.sections?.find((s) => same(s.chapter?.id, chapter.id));
        if (!section) section = await addChapterToNotebook(String(nb.id), String(chapter.id));
        await addLessonToNotebook(String(nb.id), String(section!.id), lessonId);
        setDone({ notebookId: nb.id, chapter: chapter.name });
      }
      toast.success('Cahier créé, leçon ajoutée');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Le cahier n’a pas pu être créé.');
    } finally {
      setBusy(null);
    }
  };

  const NotebookBlock: React.FC<{ nb: Notebook }> = ({ nb }) => (
    <div className="rounded-xl border border-line bg-white">
      <div className="px-4 pt-3 pb-2 flex items-baseline justify-between gap-3">
        <p className="font-semibold text-ink truncate">{nb.title}</p>
        <p className="text-[12px] text-ink-faint shrink-0">{nb.class_level?.name}</p>
      </div>
      <ul className="px-2 pb-2">
        {(lessonChapters.length ? lessonChapters : []).map((ch) => {
          const section = nb.sections.find((s) => same(s.chapter?.id, ch.id));
          const added = hasLesson(section);
          const key = `${nb.id}-${ch.id}`;
          return (
            <li key={ch.id}>
              <button type="button" disabled={added || busy !== null} onClick={() => addTo(nb, ch)}
                className={`w-full flex items-center justify-between gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors ${
                  added ? 'bg-brand-soft' : 'hover:bg-[#f7f6f3]'}`}>
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-[.06em] text-ink-faint">Chapitre</span>
                  <span className={`block truncate text-[14px] font-medium ${added ? 'text-brand-hover' : 'text-ink'}`}>{ch.name}</span>
                  {!section && !added && <span className="block text-[12px] text-ink-faint">Sera ajouté à ce cahier</span>}
                </span>
                {busy === key ? <Loader2 className="w-4 h-4 animate-spin text-brand" />
                  : added ? <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-hover shrink-0"><Check className="w-4 h-4" /> Ajoutée</span>
                  : <span className="inline-flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1.5 text-[12.5px] font-semibold text-white shrink-0"><Plus className="w-3.5 h-3.5" /> Ajouter</span>}
              </button>
            </li>
          );
        })}
        {!lessonChapters.length && (
          <li className="px-2.5 py-2 text-[13px] text-ink-faint">Cette leçon n’est rattachée à aucun chapitre.</li>
        )}
      </ul>
    </div>
  );

  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-[rgba(20,18,16,.45)] backdrop-blur-[2px]" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center p-4">
        <div role="dialog" aria-modal="true" aria-labelledby="nb-modal-title" onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl border border-line bg-white shadow-[0_20px_50px_rgba(20,18,16,.25)]">
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
            <div className="min-w-0">
              <h2 id="nb-modal-title" className="flex items-center gap-2 text-[17px] font-semibold text-ink">
                <BookMarked className="w-5 h-5 text-brand" /> Ajouter à mon cahier
              </h2>
              {lessonTitle && <p className="mt-0.5 truncate text-[13px] text-ink-faint">{lessonTitle}</p>}
            </div>
            <button onClick={onClose} aria-label="Fermer" className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-[#f2f1ee]"><X className="w-5 h-5" /></button>
          </div>

          <div className="px-5 pb-5 flex flex-col gap-3">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-ink-faint" /></div>
            ) : (
              <>
                {matching.map((nb) => <NotebookBlock key={nb.id} nb={nb} />)}

                {matching.length === 0 && lessonSubject && lessonLevels.length > 0 && (
                  <div className="rounded-xl border border-dashed border-brand-line bg-brand-soft/40 px-4 py-4">
                    <p className="text-[14px] font-semibold text-ink">Pas encore de cahier {lessonSubject.name} — {lessonLevels[0].name}</p>
                    <p className="mt-1 text-[13px] text-ink-soft">
                      Crée-le : ses chapitres suivent le programme, et cette leçon ira directement dans
                      {lessonChapters[0] ? <> « {lessonChapters[0].name} »</> : ' son chapitre'}.
                    </p>
                    <label className="mt-3 block">
                      <span className="block text-[12px] font-semibold text-ink-soft">Nom du cahier</span>
                      <input value={newTitle} maxLength={200} onChange={(e) => setNewTitle(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
                    </label>
                    <button type="button" onClick={createAndAdd} disabled={busy !== null || !newTitle.trim()} className="fd-btn-primary mt-3 w-full justify-center">
                      {busy === 'create' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Créer le cahier et ajouter la leçon
                    </button>
                  </div>
                )}

                {others.length > 0 && (
                  <details className="group">
                    <summary className="cursor-pointer select-none text-[12.5px] font-medium text-ink-faint hover:text-ink">
                      Autres cahiers de {lessonSubject?.name || 'cette matière'} ({others.length})
                    </summary>
                    <div className="mt-2 flex flex-col gap-2">{others.map((nb) => <NotebookBlock key={nb.id} nb={nb} />)}</div>
                  </details>
                )}

                {done && (
                  <Link to={`/notebooks?nb=${done.notebookId}`} onClick={onClose}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-line px-3 py-2.5 text-[13.5px] font-semibold text-ink-soft hover:border-ink hover:text-ink">
                    Ouvrir mon cahier <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default AddToNotebookModal;

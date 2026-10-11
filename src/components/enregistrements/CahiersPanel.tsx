// Onglet « Cahiers » de Mes enregistrements : l'étagère des cahiers, leur création en un clic (petite fenêtre
// pré-remplie) et, quand il n'y en a pas, comment on en remplit un. Une seule action « Nouveau cahier » visible
// (la case pointillée ; sur téléphone, le bouton de la section) et une seule explication, sous l'étagère.
import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight, BookMarked, FolderTree, Loader2, Plus, Printer } from 'lucide-react';
import { LessonIcon } from '@/components/icons/LessonIcon';
import { CardsSkeleton, EmptyState, Section } from '@/components/space/Page';
import type { profileLevel } from '@/lib/api/hubApi';
import { summarize, type NbNotebook } from '@/components/notebook/notebookModel';
import { NotebookCover } from './NotebookCover';
import { CreateNotebookModal } from './CreateNotebookModal';
import { RenameNotebookModal } from './RenameNotebookModal';
import { lessonsHome, type NotebooksState } from './useNotebooks';

type Level = ReturnType<typeof profileLevel>;

const STEPS: [React.ComponentType<{ className?: string }>, string, string][] = [
  [LessonIcon, 'Ouvre une leçon', 'puis « Ajouter à mon cahier ».'],
  [FolderTree, 'Elle se range seule', 'dans le chapitre qui va bien.'],
  [Printer, 'Relis ou imprime', 'tout ton cours, chapitre par chapitre.'],
];

const HowTo: React.FC = () => (
  <ol className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
    {STEPS.map(([Icon, title, text], i) => (
      <li key={i} className="flex gap-3 bg-[#fcfbf9] px-4 py-3.5">
        <span className="fd-nums flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11.5px] font-bold text-ink-soft ring-1 ring-line">{i + 1}</span>
        <p className="text-[12.5px] leading-snug text-ink-faint">
          <span className="flex items-center gap-1.5 font-semibold text-ink-soft"><Icon className="h-3.5 w-3.5" /> {title}</span>
          {text}
        </p>
      </li>
    ))}
  </ol>
);

export const CahiersPanel: React.FC<{ state: NotebooksState; level: Level }> = ({ state, level }) => {
  const navigate = useNavigate();
  const { list, create, rename, remove } = state;
  const [creating, setCreating] = useState(false);
  const [quick, setQuick] = useState(false);
  const [renaming, setRenaming] = useState<NbNotebook | null>(null);
  const titles = useMemo(() => (list ?? []).map((n) => n.title), [list]);
  const anyEmpty = (list ?? []).some((n) => summarize(n).lessons === 0);

  const open = (nb: NbNotebook) => navigate(`/notebooks?nb=${nb.id}`);

  // Premier cahier : niveau du profil connu → création directe (Maths, nom « Matière - Niveau »), puis on l'ouvre.
  const createFirst = async () => {
    if (!level) { setCreating(true); return; }
    setQuick(true);
    try {
      const nb = await create({ levelId: level.id });
      toast.success('Cahier créé');
      open(nb);
    } catch (e) {
      toast.error((e as Error).message);
      setCreating(true);
    } finally {
      setQuick(false);
    }
  };

  const del = async (nb: NbNotebook) => {
    const n = summarize(nb).lessons;
    const what = n === 1 ? ' La leçon qui y est rangée reste sur Fidni.'
      : n > 1 ? ` Les ${n} leçons qui y sont rangées restent sur Fidni.` : '';
    if (!window.confirm(`Supprimer le cahier « ${nb.title} » ?${what}`)) return;
    try {
      await remove(nb.id);
      toast.success('Cahier supprimé');
    } catch {
      toast.error('Le cahier n’a pas pu être supprimé.');
    }
  };

  const lessonsLink = (
    <Link to={lessonsHome(level)} className="fd-btn-ghost min-h-10">
      <LessonIcon className="h-4 w-4" /> {level ? 'Voir les leçons de mon niveau' : 'Voir les leçons'}
    </Link>
  );

  return (
    <>
      {list === null ? (
        <CardsSkeleton n={3} className="sm:grid-cols-2 lg:grid-cols-3" />
      ) : list.length === 0 ? (
        <div className="flex flex-col gap-4">
          <EmptyState icon={BookMarked} title="Ton premier cahier de cours"
            text="Range-y les leçons que tu veux relire : elles se classent toutes seules par chapitre."
            action={(
              <button type="button" onClick={createFirst} disabled={quick} className="fd-btn-primary min-h-10" data-tour="cahiers-nouveau">
                {quick ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Créer mon cahier
              </button>
            )}
            secondary={lessonsLink} />
          <HowTo />
        </div>
      ) : (
        <Section id="mes-cahiers" title="Mes cahiers"
          action={(
            // Téléphone seulement : sur grand écran, la case « Nouveau cahier » de l'étagère suffit.
            <button type="button" onClick={() => setCreating(true)} className="fd-btn-ghost min-h-10 sm:hidden" data-tour="cahiers-nouveau">
              <Plus className="h-4 w-4" /> Nouveau cahier
            </button>
          )}>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-tour="cahiers-liste">
            {list.map((nb) => (
              <NotebookCover key={nb.id} notebook={nb} onRename={() => setRenaming(nb)} onDelete={() => del(nb)} />
            ))}
            {/* Sur téléphone, le bouton de la section suffit. */}
            <li className="hidden sm:block">
              <button type="button" onClick={() => setCreating(true)} data-tour="cahiers-nouveau"
                className="flex h-full min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#d8d4cc] text-[13.5px] font-semibold text-ink-faint transition-colors hover:border-ink-faint hover:text-ink sm:min-h-[212px]">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f2f1ee] text-ink-soft"><Plus className="h-5 w-5" /></span>
                Nouveau cahier
              </button>
            </li>
          </ul>
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-faint">
            <span className="inline-flex items-center gap-1.5">
              <BookMarked className="h-4 w-4 shrink-0 text-gold-strong" />
              {anyEmpty ? 'Pour remplir un cahier : ouvre une leçon' : 'Pour ajouter une leçon : ouvre-la'}, puis « Ajouter à mon cahier ».
            </span>
            <Link to={lessonsHome(level)} className="inline-flex min-h-10 items-center gap-1 font-semibold text-brand-hover hover:underline">
              {level ? 'Leçons de mon niveau' : 'Voir les leçons'} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </p>
        </Section>
      )}

      <CreateNotebookModal open={creating} onClose={() => setCreating(false)} defaultLevelId={level?.id ?? null}
        takenTitles={titles} existing={list ?? []} create={create}
        onCreated={(nb) => { setCreating(false); toast.success('Cahier créé'); open(nb); }} />
      <RenameNotebookModal notebook={renaming} onClose={() => setRenaming(null)}
        rename={async (title) => { if (renaming) { await rename(renaming.id, title); toast.success('Cahier renommé'); } }} />
    </>
  );
};

export default CahiersPanel;

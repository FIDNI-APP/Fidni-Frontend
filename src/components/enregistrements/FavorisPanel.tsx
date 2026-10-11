// Onglet « Favoris » de Mes enregistrements : ce que l'élève a enregistré avec le signet, rangé par type
// (exercices, examens, leçons), avec où il en est. Le signet vert retire le favori (avec « Annuler ») ;
// une leçon se range dans un cahier d'un clic.
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bookmark, BookMarked, Check, FileCheck, PenTool, Search, X } from 'lucide-react';
import { LessonIcon } from '@/components/icons/LessonIcon';
import { CardsSkeleton, EmptyState, Section } from '@/components/space/Page';
import { DifficultyChip, NationalTag, ProgressPill } from '@/components/content/listing/ListingParts';
import { BASE_PATH, chapterLabel, levelLabel, progressOf, type ListKind } from '@/components/content/listing/listingUtils';
import { AddToNotebookModal } from '@/components/notebook/AddToNotebookModal';
import type { ExamListItem } from '@/types/content';
import { savedKey, type SavedItem, type SavedState } from './useSaved';

const SEARCH_FROM = 9; // la recherche n'apparaît qu'au-delà de 8 favoris
const HERE = '/enregistrements?onglet=favoris';

const GROUPS: { kind: ListKind; title: string; icon: React.ComponentType<{ className?: string }>; hint?: string }[] = [
  { kind: 'exercise', title: 'Exercices', icon: PenTool },
  { kind: 'exam', title: 'Examens', icon: FileCheck },
  { kind: 'lesson', title: 'Leçons', icon: LessonIcon, hint: 'Range-les dans ton cahier pour les relire par chapitre.' },
];

/** Leçon déjà rangée dans un cahier : où la retrouver. */
export interface InNotebook { notebookId: string | number; sectionId: string | number; title: string }

const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

const FavoriCard: React.FC<{
  item: SavedItem;
  inNotebook?: InNotebook;
  onRemove: () => void;
  onRange: () => void;
}> = ({ item, inNotebook, onRemove, onRange }) => {
  const group = GROUPS.find((g) => g.kind === item.kind)!;
  const Icon = group.icon;
  const meta = [chapterLabel(item), levelLabel(item)].filter(Boolean).join(' · ');
  const progress = progressOf(item);
  const exam = item.kind === 'exam' ? (item as ExamListItem) : null;
  const lesson = item.kind === 'lesson';

  return (
    <li className="group relative flex min-w-0 items-start gap-3 rounded-2xl border border-line bg-white p-4 pr-2 transition-[border-color,box-shadow] hover:border-[#cfc9bf] hover:shadow-[0_6px_16px_rgba(20,18,16,.06)]">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f4f2ee] text-ink-soft" aria-hidden>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <Link to={`${BASE_PATH[item.kind]}/${item.id}`} state={{ from: HERE }}
          className="block text-[14.5px] font-semibold leading-snug text-ink line-clamp-2 after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-brand/40">
          {item.title || 'Sans titre'}
        </Link>
        {meta && <p className="mt-1 truncate text-[12.5px] text-ink-faint">{meta}</p>}
        {(!lesson || progress === 'success') && <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {!lesson && <DifficultyChip difficulty={(item as { difficulty?: string | null }).difficulty} felt={item.felt} />}
          {exam?.is_national_exam && <NationalTag year={exam.national_year} />}
          {lesson ? (
            progress === 'success' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11.5px] font-semibold text-brand-hover">
                <Check className="h-3 w-3" strokeWidth={2.5} /> Lue
              </span>
            )
          ) : progress ? <ProgressPill progress={progress} /> : (
            <span className="inline-flex items-center rounded-full bg-[#f2f1ee] px-2 py-0.5 text-[11.5px] font-medium text-ink-faint">Pas encore fait</span>
          )}
        </div>}
        {lesson && (
          <div className="relative z-10 mt-2 -ml-2">
            {inNotebook ? (
              <Link to={`/notebooks?nb=${inNotebook.notebookId}&chapitre=${inNotebook.sectionId}`}
                className="inline-flex min-h-10 max-w-full items-center gap-1.5 rounded-lg px-2 py-1 text-[12.5px] font-semibold text-brand-hover hover:bg-brand-soft">
                <BookMarked className="h-4 w-4 shrink-0" />
                <span className="min-w-0 line-clamp-2">Dans ton cahier « {inNotebook.title} »</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
              </Link>
            ) : (
              <button type="button" onClick={onRange}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-[12.5px] font-semibold text-ink-soft hover:bg-[#f2f1ee] hover:text-ink">
                <BookMarked className="h-4 w-4" /> Ranger dans un cahier
              </button>
            )}
          </div>
        )}
      </div>
      <button type="button" onClick={onRemove} aria-label={`Retirer « ${item.title} » de tes favoris`} title="Retirer des favoris"
        className="relative z-10 -mt-1.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-brand transition-colors hover:bg-brand-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
        <Bookmark className="h-[18px] w-[18px]" fill="currentColor" />
      </button>
    </li>
  );
};

export const FavorisPanel: React.FC<{
  state: SavedState;
  inNotebooks: Map<string, InNotebook>;
  exercisesTo: string;
  lessonsTo: string;
  hasLevel: boolean;
  onNotebookChanged: () => void;
}> = ({ state, inNotebooks, exercisesTo, lessonsTo, hasLevel, onNotebookChanged }) => {
  const { items, remove } = state;
  const [query, setQuery] = useState('');
  const [ranging, setRanging] = useState<SavedItem | null>(null);

  const shown = useMemo(() => {
    const q = fold(query.trim());
    if (!q || !items) return items;
    return items.filter((x) => fold(`${x.title ?? ''} ${(x.chapters ?? []).map((c) => c.name).join(' ')}`).includes(q));
  }, [items, query]);

  if (items === null) return <CardsSkeleton n={4} className="sm:grid-cols-2" />;

  if (items.length === 0) {
    return (
      <EmptyState icon={Bookmark} title="Rien de mis de côté pour l’instant"
        text="Touche le signet d’un exercice, d’un examen ou d’une leçon : tu le retrouves ici, avec où tu en es."
        action={<Link to={exercisesTo} className="fd-btn-primary min-h-10"><PenTool className="h-4 w-4" /> {hasLevel ? 'Exercices de mon niveau' : 'Voir les exercices'}</Link>}
        secondary={<Link to={lessonsTo} className="fd-btn-ghost min-h-10"><LessonIcon className="h-4 w-4" /> {hasLevel ? 'Leçons de mon niveau' : 'Voir les leçons'}</Link>} />
    );
  }

  return (
    <div className="flex flex-col gap-10" data-tour="favoris-liste">
      {items.length >= SEARCH_FROM && (
        <div className="relative -mb-4" data-tour="favoris-recherche">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher un titre ou un chapitre…" aria-label="Chercher dans tes favoris"
            className="min-h-11 w-full rounded-xl border border-line bg-white pl-10 pr-11 text-[14px] text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 [&::-webkit-search-cancel-button]:hidden" />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Effacer la recherche"
              className="absolute right-1 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-ink-faint hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {shown && shown.length === 0 ? (
        <EmptyState compact tone="ink" icon={Search} title="Aucun favori ne correspond"
          text={`Rien pour « ${query.trim()} » dans tes favoris.`}
          action={<button type="button" onClick={() => setQuery('')} className="fd-btn-ghost min-h-10">Effacer la recherche</button>} />
      ) : GROUPS.map((g) => {
        const list = (shown ?? []).filter((x) => x.kind === g.kind);
        if (!list.length) return null;
        // « Range-les dans ton cahier » : seulement s'il reste une leçon à ranger.
        const hint = g.kind === 'lesson' && !list.some((x) => !inNotebooks.has(String(x.id))) ? undefined : g.hint;
        return (
          <Section key={g.kind} id={`favoris-${g.kind}`} title={g.title} count={list.length} hint={hint}>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {list.map((x) => (
                <FavoriCard key={savedKey(x)} item={x} inNotebook={inNotebooks.get(String(x.id))}
                  onRemove={() => remove(x)} onRange={() => setRanging(x)} />
              ))}
            </ul>
          </Section>
        );
      })}

      {ranging && (
        <AddToNotebookModal isOpen onClose={() => setRanging(null)} onChanged={onNotebookChanged}
          lessonId={String(ranging.id)} lessonTitle={ranging.title}
          lessonChapters={(ranging.chapters ?? []).map((c) => ({ id: String(c.id), name: c.name }))}
          lessonSubject={ranging.subject ? { id: ranging.subject.id, name: ranging.subject.name } : null}
          lessonLevels={(ranging.class_levels ?? []).map((l) => ({ id: l.id, name: l.name }))} />
      )}
    </div>
  );
};

export default FavorisPanel;

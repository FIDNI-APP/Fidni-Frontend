/**
 * Affichage « Énoncés » des listes (ordinateur) : un contenu en entier, à travailler sur place.
 * Refait le 11/10/2026 dans le langage des cartes : en haut, chapitre, difficulté et favori, le titre ;
 * puis une barre d'outils sobre (chrono, « Terminé ? », « Liste ») ; l'énoncé (coupé en fondu, « Lire la
 * suite ») ; en pied, les avis discrets et « Ouvrir la page ». Couleurs du site : vert = action / réussi,
 * or = à revoir (plus de vert émeraude, d'ambre, de rouge ni de bleu).
 */
import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronDown, Clock, Eye, ListPlus, Loader2, MessageSquare, Pause, Play, RotateCcw, Save, Timer } from 'lucide-react';
import { FloatingPanel } from '@/components/ui/FloatingPanel';
import { ClampedPreview } from '@/components/content/ClampedPreview';
import { ExerciseRenderer } from '@/components/content/viewer/ExerciseRenderer';
import { LessonRenderer } from '@/components/content/viewer/LessonRenderer';
import type { FlexibleLessonStructure } from '@/components/content/editor/FlexibleLessonEditor';
import type { FlexibleExerciseStructure } from '@/components/content/editor/FlexibleExerciseEditor';
import type { AssessSource } from '@/lib/api/contentItemApi';
import type { AssessmentStatus } from '@/types/content';
import { BookmarkButton, DifficultyChip, QuietVotes, SchoolTag } from './ListingParts';
import { chapterLabel, dateLongue, facts, ilYa, levelLabel, type ListItem, type ListKind } from './listingUtils';

type Completion = 'success' | 'review' | null;
/** Questions évaluées : le type attendu par le rendu de l'énoncé. */
type ProgressData = React.ComponentProps<typeof ExerciseRenderer>['progress'];

interface StatementCardProps {
  item: ListItem;
  kind: ListKind;
  path: string;
  from: string;
  isAuthenticated: boolean;
  /** Le niveau va de soi (page de niveau ou de chapitre). */
  hideLevel?: boolean;
  saved: boolean;
  onToggleSave: () => void;
  completion: Completion;
  onSetCompletion: (status: Completion) => void;
  vote: { vote: number; likes: number; dislikes: number };
  onVote: (value: 1 | -1) => void;
  timer: { isRunning: boolean; elapsed: number };
  savingTimer: boolean;
  sessionCount: number;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onSaveTimer: () => void;
  onAddToList: () => void;
  progressData: ProgressData;
  onAssess: (path: string, status: AssessmentStatus, source?: AssessSource) => void;
  onSolutionOpen: (path: string) => void;
  /** Indication ouverte (journal de « Ma progression »). */
  onHintOpen?: (path: string) => void;
  showAllSolutions: boolean;
}

const formatTime = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

const tool = 'inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40';
const mini = 'inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40';

export const StatementCard: React.FC<StatementCardProps> = ({
  item, kind, path, from, isAuthenticated, hideLevel, saved, onToggleSave, completion, onSetCompletion, vote, onVote,
  timer, savingTimer, sessionCount, onToggleTimer, onResetTimer, onSaveTimer, onAddToList,
  progressData, onAssess, onSolutionOpen, onHintOpen, showAllSolutions,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const lesson = kind === 'lesson';
  const hasStructure = !!item.structure && typeof item.structure === 'object'
    && ('blocks' in item.structure || 'sections' in item.structure);
  const chapter = chapterLabel(item);
  const national = 'is_national_exam' in item && item.is_national_exam;
  const year = 'national_year' in item ? item.national_year : null;
  const infos = [...facts(item, kind), hideLevel ? null : levelLabel(item)].filter(Boolean).join(' · ');
  const comments = item.comment_count ?? 0;

  const pick = (s: 'success' | 'review') => { onSetCompletion(completion === s ? null : s); setMenuOpen(false); };

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-white">
      <header className="px-5 pb-4 pt-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 pt-2 text-[12.5px] text-ink-faint">
            {chapter && <span className="font-semibold text-ink-soft">{chapter}</span>}
            {national && <span className="font-semibold text-gold-strong">Bac national{year ? ` ${year}` : ''}</span>}
            {'difficulty' in item && <DifficultyChip difficulty={item.difficulty} felt={item.felt} plain />}
            {infos && <span className="fd-nums">{infos}</span>}
            <SchoolTag school={item.school} />
          </div>
          <BookmarkButton saved={saved} busy={false} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSave(); }} className="-mr-2 shrink-0" />
        </div>
        <h3 className="fd-display mt-1 text-[22px] leading-tight text-ink">
          <Link to={path} state={{ from }} className="hover:underline decoration-line underline-offset-4">{item.title}</Link>
        </h3>

        {/* Outils : chrono, statut, liste de révision. */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          {!lesson && (
            <div data-tour="liste-chrono"
              className={`inline-flex h-9 items-center gap-0.5 rounded-xl border pl-2.5 pr-1 ${
                timer.isRunning ? 'border-brand-line bg-brand-soft text-brand-hover'
                  : timer.elapsed > 0 ? 'border-gold-line bg-gold-soft text-gold-strong' : 'border-line bg-white text-ink-faint'}`}>
              <Timer className="h-4 w-4" aria-hidden />
              <span className="fd-nums ml-1 mr-1 min-w-[2.75rem] text-[13px] font-semibold" aria-label="Temps">{formatTime(timer.elapsed)}</span>
              <button type="button" onClick={onToggleTimer} className={`${mini} hover:bg-white`}
                title={timer.isRunning ? 'Pause' : 'Démarrer'} aria-label={timer.isRunning ? 'Pause' : 'Démarrer le chrono'}>
                {timer.isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </button>
              <button type="button" onClick={onResetTimer} disabled={timer.elapsed === 0 || timer.isRunning}
                className={`${mini} hover:bg-white`} title="Remettre à zéro" aria-label="Remettre le chrono à zéro">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              {timer.elapsed > 0 && (
                <button type="button" onClick={onSaveTimer} disabled={savingTimer || timer.isRunning}
                  className={`${mini} text-brand-hover hover:bg-white`} title="Enregistrer le temps" aria-label="Enregistrer le temps">
                  {savingTimer ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                </button>
              )}
              {sessionCount > 0 && (
                <Link to={path} state={{ from }}
                  className="fd-nums ml-0.5 rounded-lg bg-white/80 px-1.5 py-0.5 text-[11.5px] font-semibold text-ink-soft hover:text-ink"
                  title={`${sessionCount} session${sessionCount > 1 ? 's' : ''} enregistrée${sessionCount > 1 ? 's' : ''}`}>
                  {sessionCount}
                </Link>
              )}
            </div>
          )}

          <button ref={anchor} type="button" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-haspopup="menu"
            data-tour="liste-terminer"
            title={completion === 'success' ? 'Réussi' : completion === 'review' ? 'À revoir' : 'Pas encore fait : dis si tu l’as réussi'}
            className={`${tool} ${completion === 'success' ? 'border-brand-line bg-brand-soft text-brand-hover'
              : completion === 'review' ? 'border-gold-line bg-gold-soft text-gold-strong'
                : 'border-line bg-white text-ink-soft hover:border-[#cfc9bf] hover:text-ink'}`}>
            {completion === 'success' ? <><Check className="h-4 w-4" /> Réussi</>
              : completion === 'review' ? <><RotateCcw className="h-3.5 w-3.5" /> À revoir</>
                : <>{lesson ? 'Lue ?' : 'Terminé ?'}</>}
            <ChevronDown className={`h-3.5 w-3.5 opacity-60 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>
          {menuOpen && (
            <FloatingPanel anchorRef={anchor} open onClose={() => setMenuOpen(false)} role="menu"
              className="min-w-[160px] rounded-xl border border-line bg-white p-1 shadow-[0_12px_32px_rgba(20,18,16,.12)]">
              <button type="button" role="menuitemradio" aria-checked={completion === 'success'} onClick={() => pick('success')}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors ${
                  completion === 'success' ? 'bg-brand-soft text-brand-hover' : 'text-ink-soft hover:bg-[#f7f6f3] hover:text-ink'}`}>
                <Check className="h-4 w-4 text-brand" /> {lesson ? 'Lue' : 'Réussi'}
              </button>
              <button type="button" role="menuitemradio" aria-checked={completion === 'review'} onClick={() => pick('review')}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors ${
                  completion === 'review' ? 'bg-gold-soft text-gold-strong' : 'text-ink-soft hover:bg-[#f7f6f3] hover:text-ink'}`}>
                <RotateCcw className="h-3.5 w-3.5 text-gold-strong" /> À revoir
              </button>
            </FloatingPanel>
          )}

          {!lesson && (
            <button type="button" onClick={onAddToList} data-tour="liste-revision" title="Ajouter à une liste de révision"
              className={`${tool} border-line bg-white text-ink-soft hover:border-[#cfc9bf] hover:text-ink`}>
              <ListPlus className="h-4 w-4" /> Liste
            </button>
          )}
        </div>
      </header>

      <div className="border-t border-[#f0ede8] px-5 py-5 sm:px-6">
        <ClampedPreview>
          {hasStructure ? (
            lesson ? (
              <LessonRenderer structure={item.structure as unknown as FlexibleLessonStructure} />
            ) : (
              <ExerciseRenderer
                structure={item.structure as unknown as FlexibleExerciseStructure}
                progress={progressData}
                onAssess={onAssess}
                onSolutionOpen={onSolutionOpen}
                onHintOpen={onHintOpen}
                interactive={isAuthenticated}
                showAllSolutions={showAllSolutions}
                compact={false}
              />
            )
          ) : (
            <p className="text-[13px] italic text-ink-faint">Ancien format : ouvre la page pour le voir en entier.</p>
          )}
        </ClampedPreview>
      </div>

      <footer className="flex items-center gap-1 border-t border-[#f0ede8] px-3 py-1.5 sm:px-4">
        <div data-tour="vote" className="flex items-center">
          <QuietVotes likes={vote.likes} dislikes={vote.dislikes} userVote={(vote.vote || 0) as 1 | -1 | 0} onVote={onVote} />
        </div>
        {(item.view_count ?? 0) > 0 && (
          <span className="ml-1 inline-flex items-center gap-1 text-[12.5px] text-ink-faint fd-nums" title="Vues">
            <Eye className="h-3.5 w-3.5" aria-hidden /> {item.view_count}<span className="sr-only"> vues</span>
          </span>
        )}
        {comments > 0 && (
          <span className="ml-2 inline-flex items-center gap-1 text-[12.5px] text-ink-faint fd-nums" title="Messages">
            <MessageSquare className="h-3.5 w-3.5" aria-hidden /> {comments}<span className="sr-only"> messages</span>
          </span>
        )}
        {ilYa(item.created_at) && (
          <span className="ml-2 hidden items-center gap-1 whitespace-nowrap text-[12.5px] text-ink-faint md:inline-flex" title={`Ajouté le ${dateLongue(item.created_at)}`}>
            <Clock className="h-3.5 w-3.5" aria-hidden /> {ilYa(item.created_at)}
          </span>
        )}
        <Link to={path} state={{ from }} data-tour="liste-ouvrir"
          className="ml-auto inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-[13px] font-semibold text-brand-hover transition-colors hover:bg-brand-soft">
          {lesson ? 'Ouvrir la leçon' : 'Ouvrir la page'} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </footer>
    </article>
  );
};

export default StatementCard;

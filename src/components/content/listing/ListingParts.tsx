// Petits éléments des cartes de liste (exercices, examens, leçons).
// Mêmes mots partout pour l'état de l'élève : « Réussi », « À revoir », « Pas encore fait » (« À faire » dans
// les cartes de liste, comme le filtre).
import React, { useState } from 'react';
import { Bookmark, Check, Loader2, Pencil, RotateCcw, School, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react';
import type { Felt, UserProgress } from '@/types/content';
import { DIFFICULTY, feltTooltip, type Progress } from './listingUtils';
import { DifficultyBars } from '@/components/common/DifficultyBars';
import { t } from '@/i18n';

export const ProgressPill: React.FC<{ progress: Progress }> = ({ progress }) =>
  progress === 'success' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-semibold bg-brand-soft text-brand-hover">
      <Check className="w-3 h-3" strokeWidth={2.5} /> {t('Réussi')}
    </span>
  ) : progress === 'review' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-semibold bg-gold-soft text-gold-strong">
      <RotateCcw className="w-3 h-3" /> {t('À revoir')}
    </span>
  ) : null;

/**
 * Difficulté annoncée par l'auteur ; « Moyen · ressenti Difficile » quand les élèves l'ont vécu autrement
 * (backend things/difficulty.py), avec en infobulle « 34 % des 22 élèves l'ont réussi · 9 avis ».
 * `interactive` (cartes de liste, hors de tout lien) : un toucher ouvre l'explication, sinon invisible sur
 * téléphone (pas de survol) et cachée sous le lien de la carte sur ordinateur.
 */
export const DifficultyChip: React.FC<{
  difficulty?: string | null;
  felt?: Felt | null;
  interactive?: boolean;
  /** Cartes de liste (11/10/2026) : sans pastille de couleur, encre et barres seulement ; le ressenti en or. */
  plain?: boolean;
}> = ({
  difficulty, felt, interactive = false, plain = false,
}) => {
  const [open, setOpen] = useState(false);
  const d = difficulty ? DIFFICULTY[difficulty] : null;
  if (!d) return null;
  const f = felt?.differs ? DIFFICULTY[felt.level] : null;
  const tip = f && felt ? t('Ressenti des élèves : {level}. {detail}', { level: t(f.label), detail: feltTooltip(felt) }) : undefined;
  const chip = plain
    ? 'inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-soft'
    : 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11.5px] font-semibold';
  const tone = plain ? undefined : { background: d.bg, color: d.text };
  const inner = (
    <>
      <DifficultyBars difficulty={difficulty} />
      {t(d.label)}
      {f && (plain ? (
        <>
          <span aria-hidden className="text-ink-faint">·</span>
          <span className="font-medium text-gold-strong underline decoration-gold-line decoration-dotted underline-offset-[3px]">
            {t('ressenti {level}', { level: t(f.label).toLowerCase() })}
          </span>
        </>
      ) : (
        <span className="font-medium" style={{ color: f.text }}>
          <span aria-hidden>· </span>{t('ressenti {level}', { level: t(f.label) })}
        </span>
      ))}
    </>
  );
  if (!f || !interactive) {
    return (
      <span className={chip} style={tone} title={tip}>
        {inner}
        {tip && <span className="sr-only"> ({tip})</span>}
      </span>
    );
  }
  return (
    <span className="relative z-10 inline-flex">
      <button type="button" aria-expanded={open} title={tip}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
        className={`${chip} relative cursor-help before:absolute before:-inset-y-3 before:inset-x-0 before:content-[''] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand`}
        style={tone}>
        {inner}
        <span className="sr-only"> ({tip})</span>
      </button>
      {open && (
        <span role="tooltip"
          className="absolute start-0 top-full z-20 mt-1.5 w-max max-w-[240px] rounded-lg bg-ink px-2.5 py-1.5 text-[11.5px] font-medium leading-snug text-white shadow-lg">
          {tip}
        </span>
      )}
    </span>
  );
};

/** Travail commencé : fine barre « 3/6 questions » (questions déjà évaluées par l'élève). */
export const QuestionProgressBar: React.FC<{ progress: UserProgress }> = ({ progress }) => {
  const pct = Math.min(100, Math.round((progress.assessed / progress.total) * 100));
  return (
    <div className="flex items-center gap-2" title={progress.success > 1
      ? (progress.assessed > 1 ? t('{s} réussies sur {a} évaluées', { s: progress.success, a: progress.assessed }) : t('{s} réussies sur {a} évaluée', { s: progress.success, a: progress.assessed }))
      : (progress.assessed > 1 ? t('{s} réussie sur {a} évaluées', { s: progress.success, a: progress.assessed }) : t('{s} réussie sur {a} évaluée', { s: progress.success, a: progress.assessed }))}>
      <div className="h-1.5 flex-1 max-w-[140px] rounded-full bg-[#efece6] overflow-hidden" role="progressbar"
        aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.assessed}
        aria-label={t('Questions évaluées')}>
        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
      <span className="fd-nums text-[12px] font-medium text-ink-faint">{t('{a}/{total} questions', { a: progress.assessed, total: progress.total })}</span>
    </div>
  );
};

/** Établissement d'origine : petite étiquette calme (nom, ville en infobulle). */
export const SchoolTag: React.FC<{ school?: { name: string; city?: string | null } | null }> = ({ school }) => (
  school ? (
    <span title={school.city ? t('Donné au {school} ({city})', { school: school.name, city: school.city }) : t('Donné au {school}', { school: school.name })}
      className="inline-flex max-w-[14rem] items-center gap-1 rounded-full border border-line bg-white px-2 py-0.5 text-[11.5px] font-medium text-ink-soft">
      <School className="h-3 w-3 shrink-0 text-ink-faint" aria-hidden /><span className="truncate">{school.name}</span>
    </span>
  ) : null
);

export const NationalTag: React.FC<{ year?: number | null }> = ({ year }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] font-semibold bg-gold-soft text-gold-strong">
    {t('Bac national')}{year ? ` ${year}` : ''}
  </span>
);

const iconBtn = 'relative z-10 w-9 h-9 rounded-lg inline-flex items-center justify-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand';

export const BookmarkButton: React.FC<{ saved: boolean; busy: boolean; onClick: (e: React.MouseEvent) => void; className?: string }> = ({
  saved, busy, onClick, className = '',
}) => (
  <button type="button" onClick={onClick} data-tour="favori"
    className={`${iconBtn} ${saved ? 'text-brand hover:bg-brand-soft' : 'text-ink-faint hover:text-ink hover:bg-[#f2f1ee]'} ${className}`}
    aria-label={saved ? t('Retirer des favoris') : t('Ajouter aux favoris')} aria-pressed={saved}
    title={saved ? t('Retirer des favoris') : t('Ajouter aux favoris')}>
    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bookmark className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} />}
  </button>
);

export const OwnerButtons: React.FC<{ onEdit?: () => void; onDelete?: () => void }> = ({ onEdit, onDelete }) => (
  <>
    {onEdit && (
      <button type="button" className={`${iconBtn} text-ink-faint hover:text-ink hover:bg-[#f2f1ee]`} aria-label={t('Modifier')} title={t('Modifier')}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }}>
        <Pencil className="w-4 h-4" />
      </button>
    )}
    {onDelete && (
      <button type="button" className={`${iconBtn} text-ink-faint hover:text-[#a23b34] hover:bg-[#fbecea]`} aria-label={t('Supprimer')} title={t('Supprimer')}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}>
        <Trash2 className="w-4 h-4" />
      </button>
    )}
  </>
);

/* ───────────── Cartes de liste (refonte du 11/10/2026) ───────────── */

/** Bouton icône des cartes : 40 px au doigt, 36 px à la souris. */
export const cardIconBtn = 'relative z-10 inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand sm:h-9 sm:w-9';

/**
 * État de l'élève en un mot, en haut à gauche des cartes : ✓ Réussi (vert), ↻ À revoir (or), « 1/3 » (commencé),
 * ◌ À faire (discret). Leçon : « Lue ». Visiteur : rien (rien n'est suivi).
 */
export const CardStatus: React.FC<{
  progress: Progress;
  started?: UserProgress | null;
  lesson?: boolean;
  signedIn: boolean;
}> = ({ progress, started, lesson = false, signedIn }) => {
  const base = 'inline-flex shrink-0 items-center gap-1.5 text-[12.5px]';
  if (progress === 'success') {
    return (
      <span className={`${base} font-semibold text-brand-hover`}>
        <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-brand text-white" aria-hidden>
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
        {lesson ? t('Lue') : t('Réussi')}
      </span>
    );
  }
  if (progress === 'review') {
    return (
      <span className={`${base} font-semibold text-gold-strong`}>
        <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-gold-soft ring-1 ring-gold-line" aria-hidden>
          <RotateCcw className="h-2.5 w-2.5" strokeWidth={3} />
        </span>
        {t('À revoir')}
      </span>
    );
  }
  if (!signedIn) return null;
  if (started && !lesson) {
    const pct = Math.min(100, Math.round((started.assessed / started.total) * 100));
    return (
      <span className={`${base} font-medium text-ink-soft`}
        title={started.assessed > 1
          ? (started.success > 1 ? t('{a} questions évaluées sur {total}, dont {s} réussies', { a: started.assessed, total: started.total, s: started.success }) : t('{a} questions évaluées sur {total}, dont {s} réussie', { a: started.assessed, total: started.total, s: started.success }))
          : (started.success > 1 ? t('{a} question évaluée sur {total}, dont {s} réussies', { a: started.assessed, total: started.total, s: started.success }) : t('{a} question évaluée sur {total}, dont {s} réussie', { a: started.assessed, total: started.total, s: started.success }))}>
        <span className="h-1.5 w-8 overflow-hidden rounded-full bg-[#efece6]" aria-hidden>
          <span className="block h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
        </span>
        <span className="fd-nums">{started.total > 1 ? t('{a}/{total} questions', { a: started.assessed, total: started.total }) : t('{a}/{total} question', { a: started.assessed, total: started.total })}</span>
      </span>
    );
  }
  return (
    <span className={`${base} text-ink-faint`}>
      <span className="h-[18px] w-[18px] rounded-full border-[1.5px] border-dashed border-[#cfc9bf]" aria-hidden />
      {lesson ? t('Pas encore lue') : t('À faire')}
    </span>
  );
};

/**
 * J'aime / je n'aime pas, en discret (pied des cartes) : des icônes, le nombre seulement s'il y en a.
 * Le nombre change tout de suite ; `onVote` appelle le serveur.
 */
export const QuietVotes: React.FC<{
  likes: number;
  dislikes: number;
  userVote: 1 | -1 | 0;
  onVote: (value: 1 | -1) => void;
}> = ({ likes, dislikes, userVote, onVote }) => {
  const btn = 'relative z-10 inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-semibold fd-nums transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand sm:h-9 sm:min-w-9';
  const stop = (e: React.MouseEvent, v: 1 | -1) => { e.preventDefault(); e.stopPropagation(); onVote(v); };
  return (
    <span className="inline-flex items-center">
      <button type="button" onClick={(e) => stop(e, 1)} aria-pressed={userVote === 1} aria-label={t('J’aime ({n})', { n: likes })}
        title={userVote === 1 ? t('Tu aimes ce contenu · touche pour retirer') : t('J’aime : ce contenu m’a aidé')}
        className={`${btn} ${userVote === 1 ? 'bg-brand-soft text-brand-hover' : 'text-ink-faint hover:bg-[#f2f1ee] hover:text-ink'}`}>
        <ThumbsUp className="h-4 w-4" fill={userVote === 1 ? 'currentColor' : 'none'} fillOpacity={userVote === 1 ? 0.25 : 0} aria-hidden />
        {likes > 0 && <span>{likes}</span>}
      </button>
      <button type="button" onClick={(e) => stop(e, -1)} aria-pressed={userVote === -1} aria-label={t('Je n’aime pas ({n})', { n: dislikes })}
        title={userVote === -1 ? t('Tu n’aimes pas ce contenu · touche pour retirer') : t('Je n’aime pas')}
        className={`${btn} ${userVote === -1 ? 'bg-[#efede9] text-ink' : 'text-ink-faint hover:bg-[#f2f1ee] hover:text-ink'}`}>
        <ThumbsDown className="h-4 w-4" fill={userVote === -1 ? 'currentColor' : 'none'} fillOpacity={userVote === -1 ? 0.25 : 0} aria-hidden />
        {dislikes > 0 && <span>{dislikes}</span>}
      </button>
    </span>
  );
};

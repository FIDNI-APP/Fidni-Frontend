/**
 * « Mes points faibles » (13/10/2026, demandé par le propriétaire : l'élève doit savoir sur quoi se concentrer) : les
 * théorèmes de ses questions de la période, les moins réussis d'abord — combien de questions il a ratées, sa réussite,
 * et les questions encore à refaire (le contenu et la question, un clic pour y aller). « S'entraîner » ouvre les
 * exercices du chapitre sur ce théorème. Les théorèmes sont désormais montrés à l'élève (avant : jamais).
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ChevronDown, Dumbbell, RotateCcw } from 'lucide-react';
import type { PointFaible } from '@/lib/api/tableauApi';
import { shortDate } from '@/pages/progression/format';
import { practiceUrl } from '@/pages/progression/links';
import { trackAction } from '@/lib/usage';
import { COULEUR } from './chart';
import { BarreQuestions } from './Chapitres';

const VISIBLES = 4;
const STATUT = { review: 'à revoir', failed: 'ratée', partial: 'en partie' } as const;

/** « S'entraîner » sur ce théorème : les exercices de son chapitre filtrés par théorème, les plus faciles d'abord. */
const entrainer = (p: PointFaible) => {
  if (!p.chapitre) return p.id ? `/exercises?theorems=${p.id}` : '/exercises';
  const base = practiceUrl(p.chapitre.hub_url, p.chapitre.id);
  return p.id ? `${base}${base.includes('?') ? '&' : '?'}theorems=${p.id}` : base;
};

const Ligne: React.FC<{ p: PointFaible; compact?: boolean }> = ({ p, compact = false }) => {
  const [open, setOpen] = useState(false);
  return (
    <li className="px-4 py-3.5 sm:px-5">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1 basis-[220px]">
          <p className="text-[14px] font-semibold leading-snug text-ink">{p.nom}</p>
          <p className="mt-0.5 text-[12px] text-ink-faint">
            {!compact && p.chapitre && <>{p.chapitre.nom} · </>}
            <span className="fd-nums">{p.questions} question{p.questions > 1 ? 's' : ''} : {p.ratees} ratée{p.ratees > 1 ? 's' : ''}{p.partielles ? `, ${p.partielles} en partie` : ''}, {p.reussies} réussie{p.reussies > 1 ? 's' : ''}</span>
          </p>
          <BarreQuestions r={p} className="mt-2 max-w-[260px]" />
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="fd-nums text-right">
            <b className="block text-[18px] leading-none" style={{ color: p.taux < 50 ? '#9a6e1c' : '#33302b' }}>{p.taux} %</b>
            <span className="text-[11px] text-ink-faint">de réussite</span>
          </span>
          <Link to={entrainer(p)} onClick={() => trackAction('prog-point-faible')}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-brand-soft px-3 text-[13px] font-semibold text-brand-hover hover:bg-[#dcece2]">
            <Dumbbell className="h-4 w-4" aria-hidden /> S’entraîner
          </Link>
        </div>
      </div>
      {p.a_revoir_total > 0 && (
        <>
          <button type="button" onClick={() => { setOpen((v) => !v); if (!open) trackAction('prog-point-faible'); }} aria-expanded={open}
            className="mt-2 inline-flex min-h-9 items-center gap-1.5 text-[12.5px] font-semibold text-gold-strong hover:underline">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            {p.a_revoir_total} question{p.a_revoir_total > 1 ? 's' : ''} à refaire
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
          </button>
          {open && (
            <ul className="mt-1 divide-y divide-line rounded-xl border border-line bg-[#fcfbf9]">
              {p.a_revoir.map((q) => (
                <li key={`${q.id}-${q.question}`}>
                  <Link to={q.url} className="group flex items-center gap-3 px-3 py-2.5 text-[13px] hover:bg-white">
                    <span className="fd-nums w-10 shrink-0 font-semibold text-ink">{q.question}</span>
                    <span className="min-w-0 flex-1 truncate text-ink-soft group-hover:underline">{q.titre}</span>
                    <span className="hidden shrink-0 text-[12px] text-ink-faint sm:inline">{STATUT[q.statut]} · {shortDate(q.date)}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden />
                  </Link>
                </li>
              ))}
              {p.a_revoir_total > p.a_revoir.length && (
                <li className="px-3 py-2 text-[12px] text-ink-faint">et {p.a_revoir_total - p.a_revoir.length} autre{p.a_revoir_total - p.a_revoir.length > 1 ? 's' : ''}</li>
              )}
            </ul>
          )}
        </>
      )}
    </li>
  );
};

export const PointsFaibles: React.FC<{ points: PointFaible[]; compact?: boolean }> = ({ points, compact = false }) => {
  const [tous, setTous] = useState(false);
  if (!points.length) {
    return (
      <p className="flex items-center gap-2 rounded-2xl border border-line bg-white px-5 py-4 text-[13.5px] text-ink-soft">
        <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: COULEUR.reussies }} aria-hidden />
        Pas de point faible sur cette période : aucune question ratée qui reste à refaire.
      </p>
    );
  }
  const shown = tous || compact ? points : points.slice(0, VISIBLES);
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <ul className="divide-y divide-line">{shown.map((p) => <Ligne key={p.nom} p={p} compact={compact} />)}</ul>
      {!compact && points.length > VISIBLES && (
        <button type="button" onClick={() => setTous((v) => !v)} aria-expanded={tous}
          className="flex min-h-11 w-full items-center justify-center gap-1.5 border-t border-line text-[13px] font-semibold text-ink-soft hover:text-ink">
          {tous ? 'Voir moins' : `Voir les ${points.length} points faibles`}
          <ChevronDown className={`h-4 w-4 transition-transform ${tous ? 'rotate-180' : ''}`} aria-hidden />
        </button>
      )}
    </div>
  );
};

export default PointsFaibles;

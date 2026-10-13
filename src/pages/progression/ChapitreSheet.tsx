// Détail d'un chapitre de « Ma progression » (13/10/2026) : ce qui manque pour « Maîtrisé » (les critères remplis
// sont repliés), réussite par difficulté, deux repères, l'autonomie quand elle est mesurée, les contenus à revoir.
// Peu de texte : des repères et des chiffres. Actions en bas. Les théorèmes des questions ne sont pas montrés.
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { CheckCircle2, ChevronDown, CircleDashed, Clock } from 'lucide-react';
import { Sheet } from '@/components/space/Sheet';
import { trackAction } from '@/lib/usage';
import { actionUrl, lessonsUrl, practiceUrl, quizUrl } from './links';
import { chapterAction } from './actions';
import { DIFF_LABEL } from './etat';
import { EtatPill } from './Objectif';
import { Avis } from './Avis';
import { daysAgo } from './format';
import type { ChapterProgress, Critere, Difficulte } from './types';

const CRITERE_ICON = { ok: CheckCircle2, a_faire: CircleDashed, en_attente: Clock } as const;
const CRITERE_COLOR = { ok: 'text-brand', a_faire: 'text-ink-faint', en_attente: 'text-gold-strong' } as const;

export function ChapitreSheet({ chapter, onClose }: { chapter: ChapterProgress | null; onClose: () => void }) {
  const c = chapter;
  const etat = c?.etat ?? 'non_evalue';
  const action = c ? chapterAction(c) : null;
  return (
    <Sheet open={!!c} onClose={onClose} labelId="chapitre-titre" title={c?.name ?? ''}
      subtitle={c && (
        <>
          <span className="flex flex-wrap items-center gap-2"><EtatPill etat={etat} enProgres={c.en_progres} />
            {c.pct !== null && c.pct !== undefined && etat !== 'non_evalue' && <span className="fd-nums text-[13px] font-semibold text-ink">{c.pct} %</span>}</span>
          {c.raison && <span className="mt-1.5 block">{c.raison}</span>}
        </>
      )}
      footer={c && action && (
        <div className="flex flex-wrap gap-2">
          <Link to={actionUrl(action, c)} onClick={() => trackAction('prog-chapitre-action')} className="fd-btn-primary min-h-11 flex-1 justify-center">{action.label}</Link>
          {action.kind !== 'cours' && <Link to={lessonsUrl(c.hub_url, c.id)} onClick={() => trackAction('prog-cours')} className="fd-btn-ghost min-h-11">Le cours</Link>}
          {c.quiz_ready && action.kind !== 'quiz' && <Link to={quizUrl(c.id, '/progression')} onClick={() => trackAction('prog-quiz')} className="fd-btn-ghost min-h-11">Le quiz</Link>}
        </div>
      )}>
      {c && (
        <div className="flex flex-col gap-6">
          <Criteres key={c.id} criteres={c.criteres ?? []} />

          <Block title="Où j’en suis">
            <Difficulties chapter={c} />
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
              <Fact k="Questions évaluées" v={String(c.reussite?.questions ?? 0)} />
              <Fact k="Dernière évaluation" v={c.derniere_evaluation ? daysAgo(c.derniere_evaluation) : '—'} />
              <Autonomie chapter={c} />
            </dl>
          </Block>

          {c.review.length > 0 && (
            <Block title="À revoir">
              <ul className="space-y-1">
                {c.review.map((r) => <li key={r.id}><Link to={r.url} className="text-[13.5px] font-medium text-ink underline-offset-4 hover:underline">{r.title}</Link></li>)}
              </ul>
            </Block>
          )}

          <Avis sujet={etat} cle={String(c.id)} />
        </div>
      )}
    </Sheet>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[.08em] text-ink-faint">{title}</h3>
      {children}
    </section>
  );
}

function CritereRow({ k }: { k: Critere }) {
  const Icon = CRITERE_ICON[k.etat];
  return (
    <li className="flex gap-2.5 text-[13.5px] leading-snug">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${CRITERE_COLOR[k.etat]}`} aria-label={k.etat === 'ok' ? 'Rempli' : k.etat === 'en_attente' ? 'En attente' : 'À faire'} />
      <span className={k.etat === 'ok' ? 'text-ink' : 'text-ink-soft'}>{k.texte}</span>
    </li>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[12px] text-ink-faint">{k}</dt>
      <dd className="font-semibold text-ink">{v}</dd>
    </div>
  );
}

function Difficulties({ chapter: c }: { chapter: ChapterProgress }) {
  const rows = (['easy', 'medium', 'hard'] as Difficulte[]).map((d) => ({ d, s: c.reussite?.par_difficulte?.[d] }));
  if (!rows.some((r) => r.s)) return <p className="text-[13px] text-ink-faint">Pas encore de question évaluée.</p>;
  return (
    <ul className="space-y-2">
      {rows.map(({ d, s }) => (
        <li key={d} className="flex items-center gap-3 text-[13px]">
          <span className="w-16 shrink-0 text-ink-soft">{DIFF_LABEL[d]}</span>
          {s && s.pct !== null ? (
            <>
              <span className="block h-1.5 flex-1 overflow-hidden rounded-full bg-[#f2f1ee]" role="img" aria-label={`${s.pct} %`}>
                <span className="block h-full rounded-full bg-brand/70" style={{ width: `${Math.max(s.pct, 3)}%` }} />
              </span>
              <span className="fd-nums w-24 text-right text-ink-faint"><b className="text-ink">{s.pct} %</b> · {s.questions} q.</span>
            </>
          ) : (
            <Link to={practiceUrl(c.hub_url, c.id, d)} className="flex-1 text-[12.5px] text-ink-faint underline-offset-4 hover:text-ink hover:underline">Pas encore essayé</Link>
          )}
        </li>
      ))}
    </ul>
  );
}

function Autonomie({ chapter: c }: { chapter: ChapterProgress }) {
  const seul = c.autonomie?.seul;
  const tr = c.autonomie?.transfert;
  return (
    <>
      {seul && seul.pct !== null && <Fact k="Réussi sans aide" v={`${seul.pct} %`} />}
      {tr && tr.visible && <Fact k="Seul après une aide" v={`${tr.reussis} fois sur ${tr.essais}`} />}
    </>
  );
}

/** Ce qui manque pour « Maîtrisé » ; les critères remplis restent repliés (« 3 critères remplis »). */
function Criteres({ criteres }: { criteres: Critere[] }) {
  const [open, setOpen] = useState(false);
  const manque = criteres.filter((k) => k.etat !== 'ok');
  const ok = criteres.filter((k) => k.etat === 'ok');
  return (
    <Block title={manque.length ? 'Pour passer « Maîtrisé »' : 'Maîtrisé'}>
      {manque.length > 0 && <ul className="space-y-2">{manque.map((k) => <CritereRow key={k.cle} k={k} />)}</ul>}
      {ok.length > 0 && (
        <>
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
            className={`inline-flex min-h-9 items-center gap-1.5 text-[13px] font-medium text-ink-faint hover:text-ink ${manque.length ? 'mt-1.5' : ''}`}>
            <CheckCircle2 className="h-4 w-4 text-brand" aria-hidden />
            {manque.length ? `${ok.length} critère${ok.length > 1 ? 's' : ''} rempli${ok.length > 1 ? 's' : ''}` : 'Tous les critères remplis'}
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
          </button>
          {open && <ul className="mt-1 space-y-2">{ok.map((k) => <CritereRow key={k.cle} k={k} />)}</ul>}
        </>
      )}
    </Block>
  );
}

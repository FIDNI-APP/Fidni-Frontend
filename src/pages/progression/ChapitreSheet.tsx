// Détail d'un chapitre de « Ma progression » (13/10/2026) : « Pourquoi ce statut ? » (les critères observés),
// réussite par difficulté, tentatives, dernière évaluation, maîtrise durable, autonomie (seul / de moins en moins
// d'aide), notions, et les trois progressions (parcours, résultats, apprentissages). Actions en bas.
import { Link } from 'react-router-dom';
import { CheckCircle2, CircleDashed, Clock } from 'lucide-react';
import { Sheet } from '@/components/space/Sheet';
import { trackAction } from '@/lib/usage';
import { actionUrl, lessonsUrl, practiceUrl, quizUrl } from './links';
import { chapterAction } from './actions';
import { DIFF_LABEL, ETAT } from './etat';
import { EtatPill } from './Objectif';
import { Avis } from './Avis';
import { daysAgo, shortDate } from './format';
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
          <Block title="Pourquoi ce statut ?">
            <ul className="space-y-2">
              {(c.criteres ?? []).map((k) => <CritereRow key={k.cle} k={k} />)}
            </ul>
          </Block>

          <Block title="Où j’en suis">
            <Difficulties chapter={c} />
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
              <Fact k="Questions évaluées" v={String(c.reussite?.questions ?? 0)} />
              <Fact k="Exercices évalués" v={String(c.exercices_evalues ?? 0)} />
              <Fact k="Dernière évaluation" v={c.derniere_evaluation ? daysAgo(c.derniere_evaluation) : '—'} />
              <Fact k="Maîtrise durable" v={durable(c)} />
            </dl>
          </Block>

          <Block title="Autonomie">
            <Autonomie chapter={c} />
          </Block>

          {((c.notions?.best.length ?? 0) + (c.notions?.worst.length ?? 0) > 0 || (c.notions_couvertes?.dispo ?? 0) > 0) && (
            <Block title="Notions">
              {c.notions?.worst.length ? <p className="text-[13px] text-ink-soft">À retravailler : {c.notions.worst.map((n) => `${n.label} (${n.pct} %)`).join(', ')}</p> : null}
              {c.notions?.best.length ? <p className="mt-1 text-[13px] text-ink-soft">Tu réussis : {c.notions.best.map((n) => n.label).join(', ')}</p> : null}
              {c.notions_couvertes && c.notions_couvertes.dispo > 0 && (
                <p className="mt-1 text-[12.5px] text-ink-faint">{c.notions_couvertes.reussies} notion{c.notions_couvertes.reussies > 1 ? 's' : ''} réussie{c.notions_couvertes.reussies > 1 ? 's' : ''} sur {c.notions_couvertes.dispo} présentes dans les exercices.</p>
              )}
            </Block>
          )}

          <Block title="Mes 3 progressions">
            <ul className="space-y-2.5 text-[13px] leading-relaxed">
              <li><b className="font-semibold text-ink">Parcours</b> <span className="text-ink-soft">— {c.travailles ?? 0} exercice{(c.travailles ?? 0) > 1 ? 's' : ''} travaillé{(c.travailles ?? 0) > 1 ? 's' : ''} sur {c.contents} disponibles.</span></li>
              <li><b className="font-semibold text-ink">Résultats</b> <span className="text-ink-soft">— {c.reussite?.pct !== null && c.reussite?.pct !== undefined ? `${c.reussite.pct} % de réussite` : 'pas encore assez de questions'}{c.tendance !== null && c.tendance !== undefined ? `, ${c.tendance >= 0 ? '+' : '−'}${Math.abs(c.tendance)} pts en 30 jours` : ''}.</span></li>
              <li><b className="font-semibold text-ink">Apprentissages</b> <span className="text-ink-soft">— {ETAT[etat].label.toLowerCase()} ; {durable(c).toLowerCase()}.</span></li>
            </ul>
            <p className="mt-2 text-[12px] leading-relaxed text-ink-faint">Finir tous les exercices ne veut pas dire tout maîtriser, et on peut maîtriser sans tout faire : c’est la troisième qui compte le plus.</p>
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

function durable(c: ChapterProgress) {
  const d = c.durable;
  if (!d) return '—';
  if (d.etat === 'confirmee') return `Confirmée le ${shortDate(d.le!)}`;
  if (d.etat === 'n_a_pas_tenu') return `N’a pas tenu le ${shortDate(d.le!)}`;
  if (d.etat === 'a_verifier') return d.due ? 'À revérifier maintenant' : `À revérifier dès le ${shortDate(d.a_partir_du!)}`;
  return 'Pas encore mesurée';
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
    <div className="space-y-2 text-[13px] leading-relaxed">
      <p className="text-ink-soft"><b className="font-semibold text-ink">Je sais résoudre seul :</b>{' '}
        {seul && seul.pct !== null ? `${seul.pct} % de tes réussites sans indice ni solution.`
          : `pas encore assez de recul (${seul?.suivies ?? 0}/${seul?.min ?? 5} réussites suivies).`}</p>
      <p className="text-ink-soft"><b className="font-semibold text-ink">Je m’en passe de plus en plus :</b>{' '}
        {tr && tr.visible ? `après une aide, tu as réussi seul la question suivante ${tr.reussis} fois sur ${tr.essais}.`
          : 'pas encore assez de recul.'}</p>
      <p className="text-[12px] text-ink-faint">Les indications et les solutions sont faites pour apprendre : l’important est d’en avoir de moins en moins besoin.</p>
    </div>
  );
}

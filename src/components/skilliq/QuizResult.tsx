// Résultat d'un quiz (refait le 31/10/2026) : le score en grand avec justes, fausses, sans réponse et temps, l'écart
// avec le passage précédent ; pour l'approfondissement, la médaille « Chapitre approfondi » (BADGE_PCT %) ou ce qu'il
// manque ; une action principale (s'entraîner, l'approfondissement après un bon quiz du cours, « Retour à mon DS »
// depuis un plan de DS : ?retour=). 01/11/2026 : puis le récapitulatif par théorème, les théorèmes à revoir d'abord ;
// chaque théorème montre une pastille par question (verte juste, orange fausse, grise sans réponse) et se déplie sur
// ses questions corrigées, explication en vert ou en orange selon la réponse. Le même écran rouvre le dernier passage
// (`dernier`), corrigé tel qu'il était (correction figée côté serveur : énoncé et réponses de ce passage-là).
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Award, BookOpen, Check, ChevronDown, ChevronLeft, Dumbbell, LineChart, Minus, Mountain, RotateCcw, X } from 'lucide-react';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { lessonsUrl, practiceUrl } from '@/pages/progression/links';
import { Delta, ExplanationBox } from './QuizRow';
import { QUIZ_TYPE } from './quizTypes';
import { t } from '@/i18n';
import { MathText } from './MathText';
import {
  BADGE_PCT, RING, answered, frDate, goodAnswers, hasReport, pct, picked, typeOf,
  type ActiveQuiz, type CorrectionItem, type QuizQuestion, type SkillAssessment, type TheoremReport,
} from './types';

/** Durée lisible : « 45 s », « 8 min ». */
const duree = (s: number) => (s < 60 ? t('{n} s', { n: Math.max(1, Math.round(s)) }) : t('{n} min', { n: Math.round(s / 60) }));

/** Approfondissement : la médaille, obtenue ou pas encore (avec ce qu'il manque). */
const Medal: React.FC<{ score: number }> = ({ score }) => {
  const earned = score >= BADGE_PCT;
  return (
    <div className={`flex items-center gap-4 border-t px-6 py-4 sm:px-8 ${earned ? 'border-gold-line bg-gold-soft' : 'border-line'}`}>
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
        earned ? 'bg-gold text-white shadow-[0_0_0_5px_rgba(192,137,47,.18)]' : 'bg-paper text-ink-faint ring-1 ring-line'}`} aria-hidden>
        <Award className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-ink">{t('Chapitre approfondi')}</p>
        {earned ? <p className="text-[13px] font-medium text-gold-strong">{t('Badge obtenu')}</p> : (
          <>
            <p className="fd-nums text-[13px] text-ink-faint">
              {t('Badge à {n} %', { n: BADGE_PCT })} · {BADGE_PCT - score > 1 ? t('il manque {n} points', { n: BADGE_PCT - score }) : t('il manque {n} point', { n: BADGE_PCT - score })}
            </p>
            <div className="mt-2 h-1.5 max-w-xs overflow-hidden rounded-full bg-[#efece6]" aria-hidden>
              <div className="h-full rounded-full bg-gold" style={{ width: `${Math.min(100, (score / BADGE_PCT) * 100)}%` }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

type Item = CorrectionItem & { n: number; question: string; options: string[] };

/** Une question corrigée, dans son théorème : statut, énoncé, réponses (la bonne en vert, la sienne en orange si elle
 *  est fausse) et l'explication, verte ou orange selon la réponse. */
const QuestionDetail: React.FC<{ c: Item }> = ({ c }) => {
  const skipped = !answered(c);
  const goods = goodAnswers(c);
  const mines = picked(c.your_answer);
  const multi = goods.length > 1;
  return (
    <li className="rounded-xl border border-line bg-white p-4">
      <p className="flex flex-wrap items-center gap-2 text-[12px] font-semibold">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
          c.is_correct ? 'bg-brand-soft text-brand-hover' : skipped ? 'bg-[#f2f1ee] text-ink-soft' : 'bg-gold-soft text-gold-strong'}`}>
          {c.is_correct ? <Check className="h-3.5 w-3.5" aria-hidden /> : skipped ? <Minus className="h-3.5 w-3.5" aria-hidden /> : <X className="h-3.5 w-3.5" aria-hidden />}
          {t('Question {n}', { n: c.n })} · {c.is_correct ? t('juste') : skipped ? t('sans réponse') : t('fausse')}
        </span>
        {multi && <span className="font-normal text-ink-faint">{t('{n} bonnes réponses', { n: goods.length })}</span>}
      </p>
      <p className="mt-2.5 text-[14.5px] font-medium leading-relaxed text-ink"><MathText text={c.question} className="fd-latex" /></p>
      <ul className="mt-3 flex flex-col gap-1.5">
        {c.options.map((opt, i) => {
          const good = goods.includes(i);
          const mine = mines.includes(i);
          return (
            <li key={i} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-[14px] ${
              good ? 'border-brand-line bg-brand-soft' : mine ? 'border-gold-line bg-gold-soft' : 'border-transparent'}`}>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11.5px] font-bold ${
                good ? 'bg-brand text-white' : mine ? 'bg-gold text-white' : 'text-ink-faint ring-1 ring-line'}`} aria-hidden>
                {good ? <Check className="h-3.5 w-3.5" /> : mine ? <X className="h-3.5 w-3.5" /> : String.fromCharCode(65 + i)}
              </span>
              <MathText text={opt} className={`fd-latex min-w-0 flex-1 ${good ? 'font-semibold text-ink' : 'text-ink-soft'}`} />
              {mine ? <span className="shrink-0 text-[11.5px] font-semibold text-ink-faint">{t('ta réponse')}</span>
                : multi && good && !skipped && <span className="shrink-0 text-[11.5px] font-semibold text-ink-faint">{t('oubliée')}</span>}
            </li>
          );
        })}
      </ul>
      <ExplanationBox ok={c.is_correct} text={c.explanation} className="mt-3" />
    </li>
  );
};

/** Un théorème du récapitulatif : ses questions dans ce passage (vide pour un passage sans correction gardée). */
type Group = { key: string; name: string; justes: number; total: number; items: Item[] };

/** Questions rangées par théorème (une question à plusieurs théorèmes apparaît sous chacun) ; sans correction gardée,
 *  le bilan par théorème du passage, sans les questions. */
function byTheorem(items: Item[], report: TheoremReport | null): Group[] {
  if (!items.length) {
    return (report?.theoremes ?? []).map((th) => ({ key: String(th.id), name: th.name, justes: th.justes, total: th.total, items: [] }));
  }
  const groups = new Map<string, Group>();
  const autres: Item[] = [];
  for (const c of items) {
    if (!c.theoremes?.length) { autres.push(c); continue; }
    for (const name of c.theoremes) {
      const g = groups.get(name) ?? { key: name, name, justes: 0, total: 0, items: [] };
      g.items.push(c);
      g.total += 1;
      g.justes += c.is_correct ? 1 : 0;
      groups.set(name, g);
    }
  }
  const out = [...groups.values()];
  if (autres.length) {
    out.push({ key: '', name: t('Autres questions'), justes: autres.filter((c) => c.is_correct).length, total: autres.length, items: autres });
  }
  return out;
}

/** Une ligne de théorème : statut, nom, une pastille par question, score ; un clic déplie ses questions. */
const TheoremRow: React.FC<{ g: Group; open: boolean; onToggle: () => void }> = ({ g, open, onToggle }) => {
  const ok = g.justes === g.total;
  const can = g.items.length > 0;
  const body = (
    <>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${ok ? 'bg-brand-soft text-brand-hover' : 'bg-gold-soft text-gold-strong'}`} aria-hidden>
        {ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-semibold leading-snug text-ink">{g.name}</span>
        {can && (
          <span className="mt-2 flex flex-wrap gap-1" aria-hidden>
            {g.items.map((c) => (
              <span key={c.id} className={`h-1.5 w-6 rounded-full ${c.is_correct ? 'bg-brand' : answered(c) ? 'bg-gold' : 'bg-line'}`} />
            ))}
          </span>
        )}
      </span>
      <span className={`fd-nums shrink-0 text-[15px] font-bold ${ok ? 'text-brand-hover' : 'text-gold-strong'}`}>
        {g.justes}/{g.total}<span className="sr-only"> {t('justes')}</span>
      </span>
      {can && <ChevronDown className={`h-4 w-4 shrink-0 text-ink-faint transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />}
    </>
  );
  return (
    <li>
      {can ? (
        <button type="button" onClick={onToggle} aria-expanded={open}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-start transition-colors hover:bg-paper/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40">
          {body}
        </button>
      ) : <div className="flex items-center gap-3 px-4 py-3.5">{body}</div>}
      {open && (
        <ol className="flex flex-col gap-3 border-t border-line bg-paper/60 p-3 sm:p-4">
          {g.items.map((c) => <QuestionDetail key={c.id} c={c} />)}
        </ol>
      )}
    </li>
  );
};

/** Le récapitulatif par théorème : à revoir d'abord (les moins réussis en tête), puis maîtrisés. */
const TheoremRecap: React.FC<{ groups: Group[]; nonEvalues: string[] }> = ({ groups, nonEvalues }) => {
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const weak = groups.filter((g) => g.justes < g.total)
    .sort((a, b) => a.justes / a.total - b.justes / b.total || b.total - a.total || a.name.localeCompare(b.name, 'fr'));
  const ok = groups.filter((g) => g.justes === g.total).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'fr'));
  const expandable = groups.filter((g) => g.items.length > 0);
  const allOpen = expandable.length > 0 && expandable.every((g) => open.has(g.key));
  const toggle = (key: string) => setOpen((s) => {
    const next = new Set(s);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const list = (title: string, rows: Group[], tone: string) => rows.length > 0 && (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint">
        {title} <span className={`fd-nums rounded-full px-1.5 py-px text-[11px] ${tone}`}>{rows.length}</span>
      </h3>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
        {rows.map((g) => <TheoremRow key={g.key} g={g} open={open.has(g.key)} onToggle={() => toggle(g.key)} />)}
      </ul>
    </div>
  );
  return (
    <section aria-labelledby="quiz-recap-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="quiz-recap-title" className="fd-display text-[20px] leading-tight text-ink">{t('Récapitulatif par théorème')}</h2>
        {expandable.length > 0 && (
          <button type="button" onClick={() => setOpen(allOpen ? new Set() : new Set(expandable.map((g) => g.key)))}
            className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-[13px] font-semibold text-ink-soft transition-colors hover:bg-white hover:text-ink">
            {allOpen ? t('Tout replier') : t('Tout déplier')} <ChevronDown className={`h-4 w-4 transition-transform ${allOpen ? 'rotate-180' : ''}`} aria-hidden />
          </button>
        )}
      </div>
      {list(t('À revoir'), weak, 'bg-gold-soft text-gold-strong')}
      {list(t('Maîtrisés'), ok, 'bg-brand-soft text-brand-hover')}
      {nonEvalues.length > 0 && (
        <p className="text-[12.5px] text-ink-faint">{t('Pas évalués sur ce passage : {liste}.', { liste: nonEvalues.join(' · ') })}</p>
      )}
    </section>
  );
};

export const QuizResult: React.FC<{
  quiz: ActiveQuiz;
  result: SkillAssessment;
  /** Questions servies (fin d'un passage) ; vide pour le dernier résultat (la correction porte ses énoncés). */
  questions: QuizQuestion[];
  retour: string | null;
  /** Dernier résultat rouvert depuis la liste (et non la fin d'un passage). */
  dernier?: boolean;
  onRedo: () => void;
  onBack: () => void;
  /** Lancer l'approfondissement du chapitre (quiz du cours terminé, approfondissement prêt). */
  onDeep?: () => void;
}> = ({ quiz, result, questions, retour, dernier = false, onRedo, onBack, onDeep }) => {
  const score = pct(result);
  const type = typeOf(quiz);
  const deep = type === 'approfondissement';
  const TypeIcon = QUIZ_TYPE[type].icon;
  // Après un bon quiz du cours, l'approfondissement devient la suite logique (pas depuis un plan de DS).
  const goDeeper = !deep && !!onDeep && score >= 50 && !retour;
  const hub = result.hub_url ?? quiz.hub_url;
  // Le thème du chapitre (Analyse…) dit plus que la matière, toujours « Mathématiques ».
  const subject = quiz.subject ?? result.subject_name;
  // Correction dans l'ordre servi ; énoncé et réponses figés quand le serveur les donne, sinon ceux du quiz.
  const byId = new Map(questions.map((q) => [q.id, q]));
  const items: Item[] = (result.correction ?? []).flatMap((c, i) => {
    const q = byId.get(c.id);
    const question = c.question ?? q?.question;
    const options = c.options ?? q?.options;
    return question && options ? [{ ...c, n: i + 1, question, options }] : [];
  });
  const wrong = items.filter((c) => !c.is_correct && answered(c));
  const skipped = items.filter((c) => !answered(c));
  const right = items.filter((c) => c.is_correct);
  const total = items.length || questions.length;
  // Le pourcentage compte un peu plus les questions difficiles : on le dit quand il s'écarte du simple compte.
  const weighted = items.length > 0 && Math.round((right.length / items.length) * 100) !== score;
  const report = hasReport(result.par_theoreme) ? result.par_theoreme : null;
  const groups = byTheorem(items, report);

  const ghost = 'fd-btn-ghost min-h-11 justify-center text-[13.5px]';
  const practice = (primary: boolean) => (
    <Link to={practiceUrl(hub, quiz.id)} className={primary ? 'fd-btn-primary min-h-11 justify-center text-[14px]' : ghost}>
      <Dumbbell className="h-4 w-4" aria-hidden /> {t('S’entraîner sur ce chapitre')} {primary && <ArrowRight className="h-4 w-4" aria-hidden />}
    </Link>
  );
  const main = dernier ? (
    <button type="button" onClick={onRedo} className="fd-btn-primary min-h-11 justify-center text-[14px]">
      <RotateCcw className="h-4 w-4" aria-hidden /> {t('Refaire le quiz')}
    </button>
  ) : retour ? (
    <Link to={retour} className="fd-btn-primary min-h-11 justify-center text-[14px]"><ArrowLeft className="h-4 w-4" aria-hidden /> {t('Retour à mon DS')}</Link>
  ) : goDeeper ? (
    <button type="button" onClick={onDeep} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ink px-5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90">
      <Mountain className="h-4 w-4" aria-hidden /> {t('Passer à l’approfondissement')}
    </button>
  ) : practice(true);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <button type="button" onClick={onBack}
        className="-ms-1 inline-flex min-h-10 items-center gap-1 self-start rounded-lg px-1 pe-2 text-[13px] font-medium text-ink-faint transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
        <ChevronLeft className="h-4 w-4" aria-hidden /> {t('Quiz par chapitre')}
      </button>

      <section className="overflow-hidden rounded-3xl border border-line bg-white" aria-labelledby="quiz-result-title">
        <div className="p-6 sm:p-8">
          <p className="flex flex-wrap items-center gap-x-1.5 text-[12px] font-semibold text-ink-faint">
            <TypeIcon className="h-3.5 w-3.5" aria-hidden /> {t(QUIZ_TYPE[type].label)}{subject ? ` · ${t(subject)}` : ''}
            {dernier && <span>· {t('dernier passage, le {date}', { date: frDate(result.completed_at) })}</span>}
          </p>
          <h1 id="quiz-result-title" className="fd-display mt-2 text-[28px] leading-[1.12] text-ink sm:text-[34px]">{quiz.name}</h1>
          <div className="mt-7 flex flex-col items-center gap-7 sm:flex-row sm:gap-10">
            <ProgressRing percentage={score} size={136} strokeWidth={10} trackColor={RING.track} progressColor={score >= 50 ? RING.good : RING.low}>
              <span className="fd-nums text-[34px] font-bold leading-none text-ink">{score}<span className="text-[16px]"> %</span></span>
            </ProgressRing>
            <dl className="grid w-full grid-cols-2 gap-x-6 gap-y-5 sm:w-auto sm:grid-cols-4 sm:gap-x-9">
              {[
                { key: 'justes', label: t('Justes'), value: String(right.length), tone: 'text-brand-hover' },
                { key: 'fausses', label: t('Fausses'), value: String(wrong.length), tone: wrong.length ? 'text-gold-strong' : 'text-ink' },
                { key: 'sans', label: t('Sans réponse'), value: String(skipped.length), tone: 'text-ink' },
                ...(result.time_spent ? [{ key: 'temps', label: t('Temps'), value: duree(result.time_spent), tone: 'text-ink' }] : []),
              ].map((it) => (
                <div key={it.key}>
                  <dt className="text-[12.5px] text-ink-faint">{it.label}</dt>
                  <dd className={`fd-nums mt-1 text-[26px] font-bold leading-none ${it.tone}`}>{it.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12.5px] text-ink-faint">
            <span className="fd-nums">{t('{n} questions', { n: total })}</span>
            <Delta a={result} long />
            {weighted && <span>{t('Score pondéré par la difficulté des questions')}</span>}
          </div>
        </div>

        {deep && <Medal score={score} />}

        <div className="flex flex-col gap-2 border-t border-line bg-paper/60 px-6 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:px-8">
          {main}
          {!dernier && <button type="button" onClick={onRedo} className={ghost}><RotateCcw className="h-4 w-4" aria-hidden /> {t('Refaire le quiz')}</button>}
          {(dernier || retour || goDeeper) && practice(false)}
          <Link to={lessonsUrl(hub, quiz.id)} className={ghost}><BookOpen className="h-4 w-4" aria-hidden /> {t('Le cours')}</Link>
          {/* L'approfondissement ne compte pas dans la maîtrise : pas de lien vers Ma progression. */}
          {!deep && <Link to={`/progression?chapitre=${quiz.id}`} className={ghost}><LineChart className="h-4 w-4" aria-hidden /> {t('Ma progression')}</Link>}
        </div>
      </section>

      {groups.length > 0 && <TheoremRecap groups={groups} nonEvalues={(report?.non_evalues ?? []).map((x) => x.name)} />}

      {items.length === 0 && dernier && (
        <p className="rounded-2xl border border-line bg-white px-5 py-4 text-[13.5px] text-ink-faint">
          {t('La correction de ce passage n’a pas été gardée (passage d’avant la mise à jour des quiz).')}
        </p>
      )}
    </div>
  );
};

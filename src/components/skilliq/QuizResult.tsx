import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Award, BookOpen, Check, ChevronDown, ChevronLeft, Dumbbell, LineChart, Minus, Mountain, RotateCcw, X } from 'lucide-react';
import { lessonsUrl, practiceUrl } from '@/pages/progression/links';
import { Delta } from './QuizRow';
import { QUIZ_TYPE } from './quizTypes';
import { t } from '@/i18n';
import { MathText } from './MathText';
import {
  BADGE_PCT, answered, frDate, goodAnswers, hasReport, pct, picked, typeOf,
  type ActiveQuiz, type CorrectionItem, type QuizQuestion, type SkillAssessment, type TheoremReport,
} from './types';

/** Durée lisible : « 45 s », « 8 min ». */
const duree = (s: number) => (s < 60 ? t('{n} s', { n: Math.max(1, Math.round(s)) }) : t('{n} min', { n: Math.round(s / 60) }));

/** Approfondissement : la médaille, obtenue ou pas encore (avec ce qu'il manque). */
const Medal: React.FC<{ score: number }> = ({ score }) => {
  const earned = score >= BADGE_PCT;
  return (
    <div className="flex items-center gap-4 border-t border-line px-6 py-4 sm:px-8">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
        earned ? 'bg-gold text-white' : 'bg-paper text-ink-faint ring-1 ring-line'}`} aria-hidden>
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

/** Dans la liste à revoir, l’élève peut ouvrir les corrections une par une. */
const QuestionDetail: React.FC<{ c: Item; initialOpen?: boolean }> = ({ c, initialOpen }) => {
  const skipped = !answered(c);
  const goods = goodAnswers(c);
  const mines = picked(c.your_answer);
  const multi = goods.length > 1;
  const heading = (
    <>
      <span className="flex flex-wrap items-center gap-2 text-[12px] font-semibold">
        <span className={`inline-flex items-center gap-1 px-0.5 py-0.5 ${
          c.is_correct ? 'text-brand-hover' : skipped ? 'text-ink-soft' : 'text-gold-strong'}`}>
          {c.is_correct ? <Check className="h-3.5 w-3.5" aria-hidden /> : skipped ? <Minus className="h-3.5 w-3.5" aria-hidden /> : <X className="h-3.5 w-3.5" aria-hidden />}
          {t('Question {n}', { n: c.n })} · {c.is_correct ? t('juste') : skipped ? t('sans réponse') : t('fausse')}
        </span>
        {multi && <span className="font-normal text-ink-faint">{t('{n} bonnes réponses', { n: goods.length })}</span>}
      </span>
      <span className="mt-1.5 block text-[14.5px] font-medium leading-relaxed text-ink"><MathText text={c.question} className="fd-latex" /></span>
    </>
  );
  const answers = (
    <>
      <ul className="mt-3 flex flex-col gap-1.5">
        {c.options.map((opt, i) => {
          const good = goods.includes(i);
          const mine = mines.includes(i);
          return (
            <li key={i} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-[14px] ${
              good ? 'border-brand-line bg-brand-soft' : mine ? 'border-gold-line bg-gold-soft' : 'border-transparent'}`}>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11.5px] font-semibold ${
                good ? 'bg-brand text-white' : mine ? 'bg-gold text-white' : 'text-ink-faint ring-1 ring-line'}`} aria-hidden>
                {good ? <Check className="h-3.5 w-3.5" /> : mine ? <X className="h-3.5 w-3.5" /> : String.fromCharCode(65 + i)}
              </span>
              <MathText text={opt} className={`fd-latex min-w-0 flex-1 ${good ? 'font-semibold text-ink' : 'text-ink-soft'}`} />
              {good && <span className="sr-only">{t('Bonne réponse')}</span>}
              {mine ? <span className="shrink-0 text-[11.5px] font-semibold text-ink-faint">{t('ta réponse')}</span>
                : multi && good && !skipped && <span className="shrink-0 text-[11.5px] font-semibold text-ink-faint">{t('oubliée')}</span>}
            </li>
          );
        })}
      </ul>
      {c.explanation && (
        <div className="mt-4 border-s-2 border-line ps-4">
          <h4 className="text-xs font-semibold text-ink-soft">{t('Explication')}</h4>
          <p className="mt-1 text-sm leading-relaxed text-ink"><MathText text={c.explanation} className="fd-latex" /></p>
        </div>
      )}
    </>
  );
  return (
    <li className="min-w-0 bg-white py-4">
      {initialOpen === undefined ? <>{heading}{answers}</> : (
        <details open={initialOpen} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded focus-visible:outline-brand [&::-webkit-details-marker]:hidden">
            <span className="min-w-0">{heading}</span>
            <ChevronDown size={16} className="shrink-0 text-ink-soft group-open:rotate-180" aria-hidden />
          </summary>
          {answers}
        </details>
      )}
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

/** Une ligne de théorème : statut, nom et score ; un clic déplie ses questions. */
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
      </span>
      <span className={`fd-nums shrink-0 text-[15px] font-semibold ${ok ? 'text-brand-hover' : 'text-gold-strong'}`}>
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
        <ol className="divide-y divide-line border-t border-line bg-white px-4 sm:px-6">
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
      <h3 className="mb-2 flex items-center gap-2 text-[12.5px] font-medium text-ink-faint">
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
  const [review, setReview] = useState<'missed' | 'theorems'>('missed');
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
  const missed = items.filter((c) => !c.is_correct);
  const wrong = items.filter((c) => !c.is_correct && answered(c));
  const skipped = items.filter((c) => !answered(c));
  const right = items.filter((c) => c.is_correct);
  const total = items.length || questions.length;
  // Le pourcentage compte un peu plus les questions difficiles : on le dit quand il s'écarte du simple compte.
  const weighted = items.length > 0 && Math.round((right.length / items.length) * 100) !== score;
  const report = hasReport(result.par_theoreme) ? result.par_theoreme : null;
  const groups = byTheorem(items, report);

  const ghost = 'inline-flex min-h-10 items-center justify-center gap-1.5 rounded px-2 text-sm font-medium text-ink-soft hover:text-brand-hover focus-visible:ring-2 focus-visible:ring-brand';
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
    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-4 sm:gap-5">
      <button type="button" onClick={onBack}
        className="-ms-1 inline-flex min-h-10 items-center gap-1 self-start rounded-lg px-1 pe-2 text-[13px] font-medium text-ink-faint transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
        <ChevronLeft className="h-4 w-4" aria-hidden /> {t('Quiz par chapitre')}
      </button>

      <section className="overflow-hidden rounded-xl border border-line border-t-[3px] border-t-brand bg-white" aria-labelledby="quiz-result-title">
        <div className="px-5 py-5 sm:px-8 sm:py-7">
          <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-ink-soft">
            <TypeIcon className="h-4 w-4" aria-hidden /> {t(QUIZ_TYPE[type].label)}{subject ? ` · ${t(subject)}` : ''}
            {dernier && <span>· {t('dernier passage, le {date}', { date: frDate(result.completed_at) })}</span>}
          </p>
          <h1 id="quiz-result-title" className="fd-display mt-2 text-[28px] leading-tight text-ink sm:text-4xl">{quiz.name}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3 border-y border-line py-4">
            <div className="flex items-baseline gap-2">
              <span className="sr-only">{t('Score')}</span>
              <strong className="fd-nums text-[52px] font-semibold leading-none tracking-tight text-ink">{score}<span className="ms-1 text-2xl font-normal">%</span></strong>
            </div>
            <div className="flex flex-col items-start gap-1.5 text-sm text-ink-soft">
              <div className="flex flex-wrap gap-x-3">
                {total > 0 && <span>{t('{n} questions', { n: total })}</span>}
                {!!result.time_spent && <span>{t('Temps')} · {duree(result.time_spent)}</span>}
              </div>
              <Delta a={result} long />
              {weighted && <span className="text-xs">{t('Score pondéré par la difficulté des questions')}</span>}
            </div>
          </div>
          {items.length > 0 && (
            <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {[[t('Justes'), right.length], [t('Fausses'), wrong.length], [t('Sans réponse'), skipped.length]].map(([label, count]) => (
                <div key={label} className="flex items-baseline gap-1.5"><dt className="text-ink-soft">{label}</dt><dd className="fd-nums font-semibold text-ink">{count}</dd></div>
              ))}
            </dl>
          )}
        </div>

        {deep && <Medal score={score} />}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line px-5 py-3 sm:px-8">
          {main}
        </div>
      </section>

      {missed.length > 0 && (
        <div role="group" aria-label={t('Voir le corrigé')} className="flex flex-wrap gap-x-5 border-b border-line">
          {([{ key: 'missed', label: t('Questions à revoir') }, { key: 'theorems', label: t('Par théorème') }] as const).map(({ key, label }) => (
            <button key={key} type="button" aria-pressed={review === key} onClick={() => setReview(key)}
              className={`min-h-11 border-b-2 text-sm font-semibold ${review === key ? 'border-brand text-ink' : 'border-transparent text-ink-soft'}`}>
              {label}{key === 'missed' && <span className="ms-2 font-normal">{missed.length}</span>}
            </button>
          ))}
        </div>
      )}
      {missed.length > 0 && review === 'missed' ? (
        <ol aria-label={t('Questions à revoir')} className="divide-y divide-line rounded-xl border border-line bg-white px-4 sm:px-6">
          {missed.map((item, index) => <QuestionDetail key={item.id} c={item} initialOpen={index === 0} />)}
        </ol>
      ) : groups.length > 0 && (
        <TheoremRecap groups={groups} nonEvalues={(report?.non_evalues ?? []).map((x) => x.name)} />
      )}

      {items.length === 0 && dernier && (
        <p className="rounded-2xl border border-line bg-white px-5 py-4 text-[13.5px] text-ink-faint">
          {t('La correction de ce passage n’a pas été gardée (passage d’avant la mise à jour des quiz).')}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-2">
        {!dernier && <button type="button" onClick={onRedo} className={ghost}><RotateCcw className="h-4 w-4" aria-hidden /> {t('Refaire le quiz')}</button>}
        {(dernier || retour || goDeeper) && practice(false)}
        <Link to={lessonsUrl(hub, quiz.id)} className={ghost}><BookOpen className="h-4 w-4" aria-hidden /> {t('Le cours')}</Link>
        {/* L'approfondissement ne compte pas dans la maîtrise : pas de lien vers Ma progression. */}
        {!deep && <Link to={`/progression?chapitre=${quiz.id}`} className={ghost}><LineChart className="h-4 w-4" aria-hidden /> {t('Ma progression')}</Link>}
      </div>
    </div>
  );
};

// src/components/profile/SkillIQSection.tsx — Quiz par chapitre (/skill-iq), refonte du 11/10/2026.
// La page part du niveau de l'élève (programme et maîtrise de Ma progression) :
//  - aucun quiz prêt pour son niveau (la production aujourd'hui) : un état vide honnête, avec de quoi travailler
//    tout de suite (les exercices de son chapitre le plus fragile, sa progression) et les chapitres prévus, repliés ;
//  - des quiz prêts : le prochain à passer (le chapitre le plus fragile pas encore testé), puis tous les quiz du niveau ;
//  - barre de niveaux (13/10/2026) : « Mon niveau » par défaut, puis les autres niveaux qui ont des quiz, au choix ;
//    visiteur : une invitation à créer son compte.
// Un quiz = (chapitre, niveau) depuis le 13/10/2026 : jamais les questions d'un autre niveau.
// Lien profond : /skill-iq?chapitre=<id>[&niveau=<id>][&retour=/revisions/ds/12] lance le quiz, ou dit qu'il n'est pas encore prêt ;
// `retour` donne « Retour à mon DS » après le résultat ; `&resultat=1` rouvre le dernier résultat. Les éléments sont dans
// components/skilliq/. 14/10/2026 : un quiz commencé se reprend (gardé sur le serveur) ; un quiz passé rouvre son
// dernier résultat, correction comprise (GET /skill-assessments/chapter/<id>/).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Brain, ChevronLeft, Dumbbell, Hourglass, RotateCcw, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useOpenSignup } from '@/components/auth/SignupPrompt';
import { Page, PageHeader, EmptyState, Section } from '@/components/space/Page';
import { exercisesHome } from '@/components/layout/nav';
import { profileLevel } from '@/lib/api/hubApi';
import { trackAction } from '@/lib/usage';
import { practiceUrl } from '@/pages/progression/links';
import type { User } from '@/types';
import { findChapter, getEnCours, getLastResult, getQuiz, getTaxonomy, type TaxonomyLevel } from '@/components/skilliq/api';
import { ComingSoon } from '@/components/skilliq/ComingSoon';
import { SEO } from '@/components/layout/SEO';
import { LevelQuizzes, OtherLevel, levelsWithQuizzes } from '@/components/skilliq/OtherLevel';
import { QuizList } from '@/components/skilliq/QuizList';
import { QuizResult } from '@/components/skilliq/QuizResult';
import { QuizRunner } from '@/components/skilliq/QuizRunner';
import { useQuizChapters } from '@/components/skilliq/useQuizChapters';
import { isFresh, quizKey, safeReturn, takenOn, type ActiveQuiz, type CorrectionItem, type QuizChapter, type QuizEnCours, type QuizQuestion, type SkillAssessment } from '@/components/skilliq/types';

const SUBTITLE = 'Toutes les questions d’un chapitre, chronométrées, corrigées une à une, et ton bilan théorème par théorème.';

/** Page sur /skill-iq ; simple colonne quand le composant est affiché dans le profil (?tab=skilliq). */
const Shell: React.FC<{ narrow?: boolean; children: React.ReactNode }> = ({ narrow = false, children }) => {
  const { pathname } = useLocation();
  if (!pathname.startsWith('/skill-iq')) return <div className="flex flex-col">{children}</div>;
  return <Page width={narrow ? 'narrow' : 'default'}>{children}</Page>;
};

const Header: React.FC<{ subtitle?: string }> = ({ subtitle }) => (
  <div data-tour="skilliq-hero">
    <PageHeader eyebrow="Mon suivi" title="Quiz par chapitre" subtitle={subtitle} />
  </div>
);

/** Squelette à la forme de l'état le plus fréquent (une carte centrée, une ligne repliée). */
const PageSkeleton: React.FC = () => (
  <div role="status" aria-label="Chargement" className="flex flex-col gap-3">
    <div className="flex animate-pulse flex-col items-center rounded-2xl border border-line bg-white px-6 py-10 sm:py-12">
      <div className="h-14 w-14 rounded-2xl bg-[#efece6]" />
      <div className="mt-5 h-4 w-1/2 max-w-xs rounded bg-[#efece6]" />
      <div className="mt-3 h-3 w-2/3 max-w-md rounded bg-[#f2f1ee]" />
      <div className="mt-2 h-3 w-1/2 max-w-sm rounded bg-[#f2f1ee]" />
      <div className="mt-6 h-11 w-72 max-w-full rounded-xl bg-[#efece6]" />
    </div>
    <div className="h-12 animate-pulse rounded-2xl border border-line bg-white" />
  </div>
);

/** Questions en cours de chargement : la forme de la carte question. */
const QuestionSkeleton: React.FC<{ name: string; onQuit: () => void }> = ({ name, onQuit }) => (
  <div className="mx-auto flex w-full max-w-2xl flex-col gap-5" role="status" aria-label="Préparation du quiz">
    <button type="button" onClick={onQuit} className="-ml-1 inline-flex min-h-10 items-center gap-1 self-start rounded-lg px-1 pr-2 text-[13px] font-medium text-ink-faint hover:text-ink">
      <ChevronLeft className="h-4 w-4" aria-hidden /> Quitter
    </button>
    <div>
      <div className="h-3 w-24 rounded bg-[#efece6]" />
      <h1 className="fd-display mt-2 text-[24px] leading-tight text-ink sm:text-[28px]">{name}</h1>
    </div>
    <div className="animate-pulse rounded-3xl border border-line bg-white p-5 sm:p-7">
      <div className="h-6 w-24 rounded-full bg-[#f2f1ee]" />
      <div className="mt-4 h-4 w-11/12 rounded bg-[#efece6]" />
      <div className="mt-2.5 h-4 w-2/3 rounded bg-[#efece6]" />
      <div className="mt-6 flex flex-col gap-2.5">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-14 rounded-2xl border border-line bg-[#fcfbf9]" />)}
      </div>
    </div>
  </div>
);

/** Arrivée par un lien vers le quiz d'un chapitre qui n'en a pas encore. */
const MissingBanner: React.FC<{ chapter: { id: number; name: string | null; hub_url: string | null }; retour: string | null; onClose: () => void }> = ({
  chapter, retour, onClose,
}) => (
  <div role="status" className="relative mb-6 flex flex-col gap-3 rounded-2xl bg-gold-soft p-4 pr-12 ring-1 ring-gold-line sm:flex-row sm:items-center sm:gap-4 sm:p-5 sm:pr-14">
    <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-gold-strong ring-1 ring-gold-line sm:flex" aria-hidden>
      <Hourglass className="h-5 w-5" />
    </span>
    <div className="min-w-0 flex-1">
      <p className="text-[14.5px] font-semibold leading-snug text-ink">
        {chapter.name ? <>Le quiz « {chapter.name} » n’est pas encore prêt.</> : 'Le quiz de ce chapitre n’est pas encore prêt.'}
      </p>
      <p className="mt-0.5 text-[13px] text-ink-soft">En attendant, entraîne-toi sur ses exercices, les plus faciles d’abord.</p>
    </div>
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Link to={practiceUrl(chapter.hub_url, chapter.id)} className="fd-btn-primary min-h-11 justify-center sm:min-h-10">
        <Dumbbell className="h-4 w-4" aria-hidden /> S’entraîner sur ce chapitre
      </Link>
      {retour && (
        <Link to={retour} className="fd-btn-ghost min-h-11 justify-center text-[13px] sm:min-h-10">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Retour à mon DS
        </Link>
      )}
    </div>
    <button type="button" onClick={onClose} aria-label="Fermer"
      className="absolute right-2 top-2 inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink-faint transition-colors hover:bg-white/70 hover:text-ink sm:top-1/2 sm:-translate-y-1/2">
      <X className="h-4 w-4" />
    </button>
  </div>
);

const QuizPage: React.FC<{ user: User; onRetry: () => void }> = ({ user, onRetry }) => {
  const isTeacher = user.profile?.user_type === 'teacher';
  const data = useQuizChapters(user.username, isTeacher, user.id);
  const [searchParams, setSearchParams] = useSearchParams();
  // Arrivée depuis un lien (?chapitre=, ?retour=) : gardée ici, puis l'adresse est nettoyée.
  const [wanted, setWanted] = useState<number | null>(() => Number(searchParams.get('chapitre')) || null);
  const [wantedLevel, setWantedLevel] = useState<number | null>(() => Number(searchParams.get('niveau')) || null);
  const [retour, setRetour] = useState(() => safeReturn(searchParams.get('retour')));
  const [missing, setMissing] = useState<{ id: number; name: string | null; hub_url: string | null } | null>(null);
  const [active, setActive] = useState<ActiveQuiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [seconds, setSeconds] = useState(600);
  const [left, setLeft] = useState(600);
  const [initial, setInitial] = useState<CorrectionItem[]>([]);
  const [result, setResult] = useState<SkillAssessment | null>(null);
  // Dernier résultat rouvert depuis la liste (et non la fin d'un passage) ; null : chargement ou échec.
  const [dernier, setDernier] = useState<'charge' | 'ok' | 'echec' | null>(null);
  const [wantedResult, setWantedResult] = useState(() => searchParams.get('resultat') === '1');
  const [enCours, setEnCours] = useState<Record<string, QuizEnCours>>({});
  const refreshEnCours = () => {
    getEnCours().then((rows) => setEnCours(Object.fromEntries(rows.map((r) => [quizKey(r.niveau, r.chapitre), r])))).catch(() => {});
  };
  useEffect(refreshEnCours, []);
  const request = useRef(0);
  // Barre de niveaux : null = mon niveau (par défaut), sinon un autre niveau choisi par l'élève.
  const [view, setView] = useState<number | null>(null);
  const [taxonomy, setTaxonomy] = useState<TaxonomyLevel[] | null>(null);
  const student = !isTeacher && !!(data.level ?? profileLevel(user));
  useEffect(() => {
    if (!student) return;
    let alive = true;
    getTaxonomy().then((t) => { if (alive) setTaxonomy(t); }).catch(() => { if (alive) setTaxonomy([]); });
    return () => { alive = false; };
  }, [student]);
  const otherLevels = useMemo(() => levelsWithQuizzes(taxonomy ?? [], data.availableAll, data.level?.id ?? null),
    [taxonomy, data.availableAll, data.level?.id]);

  useEffect(() => {
    if (!searchParams.has('chapitre') && !searchParams.has('retour')) return;
    const id = Number(searchParams.get('chapitre')) || null;
    if (id) setWanted(id);
    setWantedLevel(Number(searchParams.get('niveau')) || null);
    if (searchParams.has('retour')) setRetour(safeReturn(searchParams.get('retour')));
    setWantedResult(searchParams.get('resultat') === '1');
    setSearchParams((p) => { const next = new URLSearchParams(p); ['chapitre', 'niveau', 'retour', 'resultat'].forEach((k) => next.delete(k)); return next; }, { replace: true });
  }, [searchParams, setSearchParams]);

  /** Lance le quiz : reprend le passage commencé s'il y en a un, sinon un nouveau tirage (`nouveau` : toujours). */
  const start = (q: ActiveQuiz, nouveau = false) => {
    const id = ++request.current;
    setActive(q);
    setResult(null);
    setDernier(null);
    setQuestions(null);
    setMissing(null);
    window.scrollTo({ top: 0 });
    getQuiz(q.id, q.levelId, nouveau)
      .then((r) => {
        if (request.current !== id) return;
        if (r.reprise) trackAction('quiz-repris');
        setSeconds(r.seconds);
        setLeft(r.left);
        setInitial(r.verifiees);
        setQuestions(r.questions);
      })
      .catch(() => { if (request.current === id) setQuestions([]); });
  };

  // « Refaire » : nouvelle tentative sur un chapitre déjà passé (mesurée), toujours un nouveau tirage.
  const redo = (q: ActiveQuiz) => { trackAction('quiz-refait'); start(q, true); };

  /** Dernier résultat d'un quiz passé, avec sa correction (figée au moment du passage). */
  const showLast = (q: ActiveQuiz) => {
    const id = ++request.current;
    trackAction('quiz-dernier-resultat');
    setActive(q);
    setResult(null);
    setQuestions([]);
    setDernier('charge');
    setMissing(null);
    window.scrollTo({ top: 0 });
    getLastResult(q.id, q.levelId)
      .then((r) => { if (request.current === id) { setResult(r); setDernier('ok'); } })
      .catch(() => { if (request.current === id) setDernier('echec'); });
  };

  const close = () => {
    request.current++;
    setActive(null);
    setResult(null);
    setDernier(null);
    setQuestions(null);
    refreshEnCours();
    window.scrollTo({ top: 0 });
  };

  const fromChapter = (c: QuizChapter): ActiveQuiz => ({ id: c.id, name: c.name, subject: c.subject ?? c.subfield, hub_url: c.hub_url,
    levelId: data.level?.id ?? null });
  const startChapter = (c: QuizChapter) => {
    const q = fromChapter(c);
    if (enCours[quizKey(q.levelId, c.id)]) start(q); else if (c.taken) redo(q); else start(q);
  };

  // Lien vers le quiz d'un chapitre : on le lance s'il est prêt, sinon on le dit (bandeau) au lieu de rien.
  useEffect(() => {
    if (!wanted || data.loading) return;
    const id = wanted;
    const own = data.level?.id ?? null;
    // Le quiz d'un autre niveau (lien d'une notification, par exemple) : celui-là, pas celui de l'élève.
    const lv = wantedLevel && wantedLevel !== own ? wantedLevel : own;
    setWanted(null);
    setWantedLevel(null);
    const mine = lv === own ? data.chapters.find((c) => c.id === id) : undefined;
    const ready = (lv === own ? data.available[String(id)] : data.availableAll[String(lv)]?.[String(id)]) ?? mine?.ready ?? 0;
    const taken = takenOn(data.mine, id, lv, own);
    const showResult = wantedResult;
    setWantedResult(false);
    (async () => {
      const info = mine ? { name: mine.name, subject: mine.subfield } : await findChapter(id).catch(() => null);
      const quiz = { id, name: info?.name ?? 'Quiz du chapitre', subject: info?.subject ?? null, hub_url: mine?.hub_url ?? null, levelId: lv };
      if (showResult && taken) {
        showLast(quiz);
      } else if (ready > 0) {
        if (taken && !enCours[quizKey(lv, id)]) redo(quiz); else start(quiz);
      } else {
        setMissing({ id, name: info?.name ?? null, hub_url: quiz.hub_url });
      }
    })();
    // start/redo sont recréées à chaque rendu ; seul le chargement des données compte ici.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted, data.loading]);

  /* ─────────── Un quiz : passage, puis résultat ─────────── */
  if (active) {
    return (
      <Shell narrow>
        {result ? (
          <QuizResult quiz={active} result={result} questions={questions ?? []} retour={retour} dernier={dernier === 'ok'}
            onRedo={() => redo(active)} onBack={close} />
        ) : dernier === 'charge' ? (
          <QuestionSkeleton name={active.name} onQuit={close} />
        ) : dernier === 'echec' ? (
          <div className="mx-auto w-full max-w-2xl">
            <EmptyState tone="gold" icon={Hourglass} title="Ton dernier résultat n’a pas pu se charger"
              text="Vérifie ta connexion, ou refais le quiz."
              action={<button type="button" onClick={() => redo(active)} className="fd-btn-primary min-h-11"><RotateCcw className="h-4 w-4" aria-hidden /> Refaire le quiz</button>}
              secondary={<button type="button" onClick={close} className="fd-btn-ghost min-h-11 text-[13px]">Retour aux quiz</button>} />
          </div>
        ) : questions === null ? (
          <QuestionSkeleton name={active.name} onQuit={close} />
        ) : questions.length === 0 ? (
          <div className="mx-auto w-full max-w-2xl">
            <EmptyState tone="gold" icon={Hourglass} title="Ce quiz n’est pas encore prêt"
              text={`Les questions de « ${active.name} » arrivent bientôt. En attendant, entraîne-toi sur ses exercices.`}
              action={<Link to={practiceUrl(active.hub_url, active.id)} className="fd-btn-primary min-h-11"><Dumbbell className="h-4 w-4" aria-hidden /> S’entraîner sur ce chapitre</Link>}
              secondary={<button type="button" onClick={close} className="fd-btn-ghost min-h-11 text-[13px]">Retour aux quiz</button>} />
          </div>
        ) : (
          <QuizRunner key={`${active.id}:${active.levelId}:${request.current}`} quiz={active} questions={questions} seconds={seconds}
            left={left} initial={initial} onQuit={close} onRestart={() => start(active, true)}
            onDone={(r) => { setResult(r); setDernier(null); data.refreshMine(); refreshEnCours(); window.scrollTo({ top: 0 }); }} />
        )}
      </Shell>
    );
  }

  /* ─────────── La page ─────────── */
  const level = data.level ?? profileLevel(user);
  const variant = isTeacher ? 'teacher' : level ? 'student' : 'no-level';
  const hasHere = variant === 'student' && data.ready.length > 0;
  // Professeur ou élève sans niveau : les quiz de tous les niveaux, choisis par niveau.
  const browse = variant !== 'student' && data.elsewhere > 0;
  const other = (
    <OtherLevel availableByLevel={data.availableAll} mine={data.mine} fresh={data.fresh} excludeLevelId={data.level?.id ?? null} standalone={browse}
      enCours={enCours} onStart={(q, again) => (again ? redo : start)(q)} onView={showLast} />
  );

  // Élève : niveaux au choix dès qu'un autre niveau a des quiz ; le sien est montré d'abord.
  const levelBar = variant === 'student' && otherLevels.length > 0;
  const shown = levelBar ? otherLevels.find((l) => l.id === view) ?? null : null;

  return (
    <Shell>
      <Header subtitle={hasHere || browse || levelBar ? SUBTITLE : undefined} />

      {levelBar && !data.loading && (
        <div role="tablist" aria-label="Niveau des quiz" className="mb-5 flex flex-wrap items-center gap-2" data-tour="skilliq-choix-niveau">
          <button type="button" role="tab" aria-selected={!shown} onClick={() => setView(null)}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-[13px] font-semibold transition-colors ${
              !shown ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-soft hover:border-[#cfc9bf] hover:text-ink'}`}>
            Mon niveau{level ? <span className={`font-normal ${!shown ? 'text-white/75' : 'text-ink-faint'}`}>· {level.name}</span> : null}
          </button>
          {otherLevels.map((l) => {
            const on = shown?.id === l.id;
            const hasNew = l.subjects.some((s) => s.chapters.some((c) => isFresh(data.fresh[quizKey(l.id, c.id)], takenOn(data.mine, c.id, l.id))));
            return (
              <button key={l.id} type="button" role="tab" aria-selected={on} onClick={() => setView(l.id)}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-[13px] font-semibold transition-colors ${
                  on ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-soft hover:border-[#cfc9bf] hover:text-ink'}`}>
                {l.name}
                <span className={`fd-nums text-[11.5px] ${on ? 'text-white/70' : 'text-ink-faint'}`}>{l.count}</span>
                {hasNew && <span className="h-2 w-2 rounded-full bg-gold" aria-label="nouveau quiz" />}
              </button>
            );
          })}
        </div>
      )}

      {data.failed && (
        <div role="alert" className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-4 py-3">
          <p className="flex-1 text-[13.5px] font-medium text-[#a23b34]">Une partie de la page n’a pas pu se charger. Vérifie ta connexion.</p>
          <button type="button" onClick={onRetry} className="fd-btn-ghost min-h-9"><RotateCcw className="h-4 w-4" /> Réessayer</button>
        </div>
      )}

      {missing && <MissingBanner chapter={missing} retour={retour} onClose={() => setMissing(null)} />}

      {data.loading ? <PageSkeleton />
        : shown ? (
          <LevelQuizzes fixedLevelId={shown.id} availableByLevel={data.availableAll} mine={data.mine} fresh={data.fresh}
            enCours={enCours} onStart={(q, again) => (again ? redo : start)(q)} onView={showLast} />
        ) : hasHere ? (
          <QuizList data={data} enCours={enCours} onStart={startChapter} onView={(c) => showLast(fromChapter(c))}>
            {data.elsewhere > 0 && !levelBar && other}
          </QuizList>
        ) : browse ? (
          <Section id="tous-les-quiz" title="Choisis un niveau"
            hint={variant === 'no-level' ? (
              <>
                <Link to={`/profile/${encodeURIComponent(user.username)}/edit#scolarite`} className="font-semibold text-brand-hover hover:underline">Indique ton niveau</Link>
                {' '}pour voir directement tes quiz.
              </>
            ) : 'Les quiz prêts, niveau par niveau.'}>
            <div data-tour="skilliq-niveaux">{other}</div>
          </Section>
        ) : (
          <div className="flex flex-col gap-3">
            <ComingSoon variant={variant} fragile={data.fragile} exercisesHref={exercisesHome(user)}
              chapters={data.chapters} levelName={level?.name ?? null} username={user.username} quiet={!!missing} />
            {variant === 'student' && data.elsewhere > 0 && !levelBar && other}
          </div>
        )}
    </Shell>
  );
};

export const SkillIQSection: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const openSignup = useOpenSignup('quiz');
  const [attempt, setAttempt] = useState(0);

  if (isLoading) {
    return <Shell><Header /><PageSkeleton /></Shell>;
  }

  // Visiteur : les quiz se passent avec un compte (le score est gardé dans sa progression).
  if (!isAuthenticated || !user) {
    return (
      <Shell>
        {/* Invitation à s'inscrire, rien à indexer. */}
        <SEO title="Quiz par chapitre – Fidni" description="Des quiz chronométrés et corrigés par chapitre, avec un compte gratuit." noindex />
        <Header />
        <EmptyState tone="brand" icon={Brain} title="Les quiz par chapitre, avec ton compte"
          text="Des questions chronométrées et corrigées sur un chapitre, pour mesurer ta maîtrise théorème par théorème. Avec un compte gratuit, ton score est gardé dans ta progression."
          action={<button type="button" onClick={() => openSignup('signup')} className="fd-btn-primary min-h-11">Créer mon compte</button>}
          secondary={<button type="button" onClick={() => openSignup('login')} className="fd-btn-ghost min-h-11 text-[13px]">J’ai déjà un compte</button>} />
      </Shell>
    );
  }

  return <QuizPage key={attempt} user={user} onRetry={() => setAttempt((n) => n + 1)} />;
};

export default SkillIQSection;

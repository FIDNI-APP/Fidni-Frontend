/**
 * Quiz par chapitre (page /skill-iq du site, components/skilliq) : liste des quiz d'un niveau, fiche d'un quiz,
 * passage (une question à la fois, corrigée dès qu'on valide — réponse verrouillée —, minuteur en pause pendant la
 * correction, reprise d'un passage commencé, envoi automatique au temps écoulé) et résultat (score, bilan par
 * théorème, correction). Mêmes appels que le site : un passage commencé sur le site se reprend ici, et inversement.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IonButton, IonIcon, IonLabel, IonProgressBar, IonSegment, IonSegmentButton, IonSpinner } from '@ionic/react';
import { checkmarkCircle, chevronForward, closeCircle, helpCircleOutline, playCircleOutline, timeOutline, trophyOutline } from 'ionicons/icons';
import { useAuth } from '@/contexts/AuthContext';
import { getHub, type HubFolder, type LevelFolder } from '@/lib/api/hubApi';
import { checkAnswer, getAvailable, getEnCours, getLastResult, getMine, getQuiz, submitQuiz } from '@/components/skilliq/api';
import { MathText } from '@/components/skilliq/MathText';
import {
  goodAnswers, hasReport, pct, picked, previousPct, takenOn, toPick, type Answer, type CorrectionItem, type QuizEnCours,
  type QuizQuestion, type QuizStart, type SkillAssessment,
} from '@/components/skilliq/types';
import { dateLocale, t } from '@/i18n';
import { useNav } from '../nav';
import { useSession } from '../session';
import { DifficultyChip, Empty, ErrorState, Loading, Screen, countLabel, haptic, useLoad } from '../ui';
import { ContentListScreen } from './ContentList';

interface QuizRef { id: number; name: string; levelId: number; ready: number }

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const LETTERS = 'ABCDEFGH';

/** Anneau de score : vert à partir de 50 %, or en dessous (jamais rouge : ce n'est pas une faute). */
function ScoreRing({ value, size = 64 }: { value: number; size?: number }) {
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const color = value >= 50 ? 'var(--ion-color-primary)' : 'var(--ion-color-warning)';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--fdm-line)" strokeWidth="6" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${(c * value) / 100} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 + size / 11} textAnchor="middle" fontSize={size / 4.2} fontWeight="700" fill="var(--ion-text-color)">{value}%</text>
    </svg>
  );
}

/** Les quiz du niveau de l'élève (Profil › Quiz par chapitre). */
export function QuizListScreen({ level }: { level: LevelFolder }) {
  return <Screen title={t('Quiz par chapitre')}><QuizChapters level={level} /></Screen>;
}

/** Ouvre le quiz d'un chapitre (objectif de l'accueil) : nombre de questions prêtes lu sur le serveur. */
export async function quizFor(chapter: { id: number; name: string }, levelId: number): Promise<QuizRef | null> {
  const available = await getAvailable(levelId).catch(() => ({} as Record<string, number>));
  const ready = available[String(chapter.id)] ?? 0;
  return ready > 0 ? { id: chapter.id, name: chapter.name, levelId, ready } : null;
}

/** Quiz d'un niveau, dans l'ordre du programme (onglet Explorer › Quiz). */
export function QuizChapters({ level }: { level: LevelFolder }) {
  const { isAuthenticated } = useAuth();
  const { setGuest } = useSession();
  const nav = useNav();
  const data = useLoad(async () => {
    if (!isAuthenticated) return null;
    const [available, hub, mine, enCours] = await Promise.all([
      getAvailable(level.id), getHub('exercises', level.slug).catch(() => null), getMine().catch(() => []), getEnCours().catch(() => []),
    ]);
    const folders = ((hub?.folders ?? hub?.chapters ?? []) as HubFolder[]);
    const named = new Map(folders.map((f) => [String(f.id), f.name]));
    const order = folders.map((f) => String(f.id));
    const ids = Object.keys(available).filter((id) => available[id] > 0)
      .sort((a, b) => (order.indexOf(a) + 1 || 999) - (order.indexOf(b) + 1 || 999));
    return ids.map((id) => ({
      quiz: { id: Number(id), name: named.get(id) ?? t('Chapitre'), levelId: level.id, ready: available[id] } as QuizRef,
      taken: takenOn(mine, Number(id), level.id),
      enCours: enCours.find((e: QuizEnCours) => e.chapitre === Number(id) && e.niveau === level.id) ?? null,
    }));
  }, [level.id, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <>
        <Empty icon={helpCircleOutline} title={t('Des quiz pour chaque chapitre')} text={t('Crée un compte gratuit pour passer les quiz et suivre tes scores.')} />
        <div style={{ textAlign: 'center' }}>
          <button type="button" onClick={() => setGuest(false)} style={{ color: 'var(--ion-color-primary)', fontWeight: 700, fontSize: 16 }}>{t('Créer mon compte')}</button>
        </div>
      </>
    );
  }
  if (data.loading && !data.data) return <Loading />;
  if (data.error && !data.data) return <ErrorState onRetry={data.reload} />;
  const rows = data.data ?? [];
  return (
    <>
      <div className="fdm-section-label">{t('Quiz par chapitre')}</div>
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map(({ quiz, taken, enCours }) => (
          <button key={quiz.id} type="button" className="fdm-card fdm-pressable" onClick={() => { haptic.tap(); nav.push(() => <QuizScreen quiz={quiz} />); }}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', textAlign: 'start', color: 'inherit' }}>
            {taken ? <ScoreRing value={pct(taken)} size={46} /> : (
              <span style={{ width: 46, height: 46, borderRadius: 23, display: 'grid', placeItems: 'center', background: 'var(--fdm-brand-soft)', color: 'var(--ion-color-primary)' }}>
                <IonIcon icon={helpCircleOutline} style={{ fontSize: 24 }} />
              </span>
            )}
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 650, fontSize: 15.5 }}>{quiz.name}</span>
              <span className="fdm-muted" style={{ fontSize: 13 }}>
                {countLabel(Math.min(quiz.ready, 30), '{n} question', '{n} questions')} · {t('{n} min', { n: String(Math.min(quiz.ready, 30)) })}
              </span>
              {enCours && <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--fdm-gold-strong)', marginTop: 3 }}>
                {t('En cours : {n}/{total}', { n: String(enCours.repondues), total: String(enCours.total) })}</span>}
            </span>
            <IonIcon flipRtl icon={chevronForward} className="fdm-muted" />
          </button>
        ))}
        {!rows.length && <Empty icon={helpCircleOutline} title={t('Pas encore de quiz pour ce niveau')} />}
      </div>
    </>
  );
}

/** Un quiz : sa fiche, puis le passage et le résultat dans le même écran (le retour ramène à la liste). */
export function QuizScreen({ quiz }: { quiz: QuizRef }) {
  const nav = useNav();
  const [stage, setStage] = useState<'fiche' | 'run' | 'result'>('fiche');
  const [start, setStart] = useState<QuizStart | null>(null);
  const [result, setResult] = useState<SkillAssessment | null>(null);
  const [busy, setBusy] = useState(false);
  const info = useLoad(async () => {
    const [mine, enCours] = await Promise.all([getMine().catch(() => []), getEnCours().catch(() => [])]);
    return {
      taken: takenOn(mine, quiz.id, quiz.levelId),
      enCours: enCours.find((e: QuizEnCours) => e.chapitre === quiz.id && e.niveau === quiz.levelId) ?? null,
    };
  }, [quiz.id, stage === 'fiche']);

  const launch = async (nouveau: boolean) => {
    haptic.tap();
    setBusy(true);
    try {
      setStart(await getQuiz(quiz.id, quiz.levelId, nouveau));
      setStage('run');
    } finally { setBusy(false); }
  };
  const showLast = async () => {
    setBusy(true);
    try { setResult(await getLastResult(quiz.id, quiz.levelId)); setStage('result'); } finally { setBusy(false); }
  };
  const practice = () => nav.push(() => (
    <ContentListScreen title={quiz.name} kind="exercise" filters={{ classLevels: [String(quiz.levelId)], chapters: [String(quiz.id)], todo: true }} />
  ));

  if (stage === 'run' && start) {
    return <QuizRun quiz={quiz} start={start} onDone={(r) => { setResult(r); setStage('result'); haptic.success(); }} />;
  }
  if (stage === 'result' && result) {
    return (
      <Screen title={quiz.name}>
        <QuizResultView result={result} />
        <div style={{ padding: '18px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <IonButton expand="block" shape="round" disabled={busy} onClick={() => launch(true)}>{t('Refaire le quiz')}</IonButton>
          <IonButton expand="block" shape="round" fill="outline" onClick={practice}>{t('S’entraîner sur ce chapitre')}</IonButton>
        </div>
      </Screen>
    );
  }

  const taken = info.data?.taken;
  const enCours = info.data?.enCours;
  const n = Math.min(quiz.ready, 30);
  return (
    <Screen title={t('Quiz')}>
      <div style={{ padding: '22px 20px 0', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: 36, margin: '0 auto', display: 'grid', placeItems: 'center', background: 'var(--fdm-brand-soft)', color: 'var(--ion-color-primary)' }}>
          <IonIcon icon={helpCircleOutline} style={{ fontSize: 40 }} />
        </div>
        <h1 className="fdm-title" style={{ fontSize: 26, fontWeight: 600, margin: '14px 0 6px' }}>{quiz.name}</h1>
        <div className="fdm-muted" style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 14.5 }}>
          <span>{countLabel(n, '{n} question', '{n} questions')}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IonIcon icon={timeOutline} />{t('{n} min', { n: String(n) })}</span>
        </div>
        <p className="fdm-muted" style={{ fontSize: 14, lineHeight: 1.5, margin: '14px 0 0' }}>
          {t('Chaque réponse est corrigée dès que tu la valides. Le chrono s’arrête pendant la correction.')}
        </p>
      </div>

      {taken && (
        <div className="fdm-card" style={{ margin: '20px 16px 0', padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <ScoreRing value={pct(taken)} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700 }}>{t('Ton dernier résultat')}</div>
            <div className="fdm-muted" style={{ fontSize: 13.5 }}>
              {new Date(taken.completed_at).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long' })}
              {taken.attempts && taken.attempts > 1 ? ` · ${countLabel(taken.attempts, '{n} passage', '{n} passages')}` : ''}
            </div>
            {taken.a_correction && (
              <button type="button" onClick={showLast} style={{ marginTop: 6, color: 'var(--ion-color-primary)', fontWeight: 700, fontSize: 14 }}>{t('Voir ma correction')}</button>
            )}
          </div>
        </div>
      )}

      <div style={{ padding: '22px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <IonButton expand="block" shape="round" size="large" disabled={busy} onClick={() => launch(false)}>
          {busy ? <IonSpinner name="crescent" /> : <><IonIcon slot="start" icon={playCircleOutline} />
            {enCours ? t('Reprendre ({n}/{total})', { n: String(enCours.repondues), total: String(enCours.total) }) : taken ? t('Refaire le quiz') : t('Commencer le quiz')}</>}
        </IonButton>
        {enCours && <IonButton expand="block" fill="clear" disabled={busy} onClick={() => launch(true)}>{t('Recommencer avec de nouvelles questions')}</IonButton>}
        <IonButton expand="block" fill="outline" shape="round" onClick={practice}>{t('S’entraîner sur ce chapitre')}</IonButton>
      </div>
    </Screen>
  );
}

/** Le passage : une question à la fois, corrigée à la validation ; barre d'onglets cachée pour rester concentré. */
function QuizRun({ quiz, start, onDone }: { quiz: QuizRef; start: QuizStart; onDone: (r: SkillAssessment) => void }) {
  const { questions, seconds } = start;
  const known = useMemo(() => Object.fromEntries(start.verifiees.map((c) => [c.id, c])) as Record<number, CorrectionItem>, [start]);
  const [index, setIndex] = useState(() => Math.max(0, questions.findIndex((x) => !known[x.id])));
  const [answers, setAnswers] = useState<Record<number, Answer>>(() =>
    Object.fromEntries(start.verifiees.filter((c) => picked(c.your_answer).length > 0).map((c) => [c.id, c.your_answer as Answer])));
  const [checked, setChecked] = useState<Record<number, CorrectionItem>>(known);
  const [checking, setChecking] = useState(false);
  const [left, setLeft] = useState(start.left);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const dotsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.classList.add('fdm-focus');
    return () => document.body.classList.remove('fdm-focus');
  }, []);

  const total = questions.length;
  const q: QuizQuestion = questions[index];
  const correction = checked[q.id];
  const need = toPick(q);
  const multi = need > 1;
  const sel = picked(answers[q.id]);
  const ready = multi ? sel.length === need : sel.length > 0;
  const missing = questions.flatMap((x, i) => (checked[x.id] ? [] : [i]));
  const complete = missing.length === 0;
  const paused = !!correction || submitting;

  // Temps consommé, cumulé tic après tic (juste même si le téléphone met l'application en veille) ; reprise : le temps déjà pris.
  const used = useRef((seconds - start.left) * 1000);
  const lastTick = useRef(Date.now());
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const submit = useCallback(async (force = false) => {
    if (submitting || (!force && !complete)) return;
    setSubmitting(true);
    setError('');
    const all = Object.fromEntries(questions.map((x) => [x.id, picked(answers[x.id]).length ? answers[x.id] : -1]));
    try {
      onDone(await submitQuiz(quiz.id, quiz.levelId, all, Math.round(used.current / 1000)));
    } catch (e) {
      setError((e as { response?: { status?: number } })?.response?.status === 409
        ? t('Ce passage a expiré. Relance le quiz.') : t('L’envoi a échoué. Vérifie ta connexion et réessaie.'));
      setSubmitting(false);
    }
  }, [submitting, complete, questions, answers, quiz.id, quiz.levelId, onDone]);
  const submitRef = useRef(submit);
  submitRef.current = submit;

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      if (!pausedRef.current) used.current += now - lastTick.current;
      lastTick.current = now;
      const rest = Math.max(0, seconds - Math.floor(used.current / 1000));
      setLeft(rest);
      if (rest === 0 && !pausedRef.current) void submitRef.current(true);
    };
    const timer = window.setInterval(tick, 500);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, [seconds]);

  useEffect(() => {
    dotsRef.current?.querySelector<HTMLElement>(`[data-i="${index}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [index]);

  const choose = (i: number) => {
    if (correction) return;
    haptic.tap();
    if (!multi) { setAnswers((a) => ({ ...a, [q.id]: i })); return; }
    const next = sel.includes(i) ? sel.filter((x) => x !== i) : sel.length < need ? [...sel, i].sort((a, b) => a - b) : sel;
    setAnswers((a) => ({ ...a, [q.id]: next }));
  };

  const validate = async () => {
    if (!ready || correction || checking) return;
    setChecking(true);
    setError('');
    try {
      const c = await checkAnswer(q.id, multi ? sel : sel[0], Math.round(used.current / 1000));
      setChecked((m) => ({ ...m, [q.id]: c }));
      if (c.is_correct) haptic.success(); else haptic.warning();
    } catch {
      setError(t('La correction n’a pas pu être chargée. Réessaie.'));
    } finally { setChecking(false); }
  };

  const next = () => {
    haptic.tap();
    if (index < total - 1) setIndex(index + 1);
    else if (complete) void submit();
    else setIndex(missing[0]);
  };

  const good = correction ? goodAnswers(correction) : [];
  const low = left <= 60 && !paused;
  const timer = (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 12px', height: 32, borderRadius: 16, marginInlineEnd: 8, fontWeight: 700,
      fontVariantNumeric: 'tabular-nums', background: low ? 'var(--fdm-gold-soft)' : 'rgba(120,115,105,.10)', color: low ? 'var(--fdm-gold-strong)' : 'inherit',
    }}><IonIcon icon={timeOutline} />{clock(left)}{paused && !submitting ? ' ⏸' : ''}</span>
  );

  const footer = (
    <div style={{ background: 'var(--ion-toolbar-background)', borderTop: '1px solid var(--fdm-line)', padding: '10px 16px calc(10px + env(safe-area-inset-bottom, 0px))' }}>
      {error && <p style={{ color: 'var(--ion-color-danger)', fontSize: 13.5, margin: '0 0 8px' }}>{error}</p>}
      {!correction
        ? <IonButton expand="block" shape="round" disabled={!ready || checking} onClick={validate}>{checking ? <IonSpinner name="crescent" /> : t('Valider')}</IonButton>
        : <IonButton expand="block" shape="round" disabled={submitting} onClick={next}>
            {submitting ? <IonSpinner name="crescent" /> : index < total - 1 ? t('Question suivante') : complete ? t('Voir mon résultat') : t('Questions restantes')}
          </IonButton>}
    </div>
  );

  return (
    <Screen title={quiz.name} actions={timer} footer={footer}>
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
          <span>{t('Question {n} sur {total}', { n: String(index + 1), total: String(total) })}</span>
          <span className="fdm-muted">{t('{n} corrigées', { n: String(total - missing.length) })}</span>
        </div>
        <IonProgressBar value={(total - missing.length) / total} style={{ height: 6, borderRadius: 3 }} />
        <div ref={dotsRef} className="fdm-hscroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '12px 0 2px' }}>
          {questions.map((x, i) => {
            const c = checked[x.id];
            const bg = c ? (c.is_correct ? 'var(--ion-color-primary)' : 'var(--ion-color-warning)') : 'var(--fdm-card)';
            return (
              <button key={x.id} type="button" data-i={i} onClick={() => { haptic.tap(); setIndex(i); }} style={{
                flexShrink: 0, width: 32, height: 32, borderRadius: 16, fontSize: 13, fontWeight: 700, background: bg,
                color: c ? '#fff' : 'inherit', border: i === index ? '2px solid var(--ion-text-color)' : '1px solid var(--fdm-line)',
              }}>{i + 1}</button>
            );
          })}
        </div>
      </div>

      <div className="fdm-card" style={{ margin: '12px 16px 0', padding: '16px 16px 18px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
          <DifficultyChip value={q.difficulty} />
          {multi && <span className="fdm-chip" style={{ background: 'var(--fdm-gold-soft)', color: 'var(--fdm-gold-strong)' }}>{t('Choisis {n} réponses', { n: String(need) })}</span>}
        </div>
        <div className="fdm-math" style={{ fontSize: 17, lineHeight: 1.55 }}><MathText text={q.question} /></div>
      </div>

      <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {q.options.map((opt, i) => {
          const chosen = sel.includes(i);
          const isGood = correction && good.includes(i);
          const isBad = correction && chosen && !good.includes(i);
          const border = isGood ? 'var(--ion-color-primary)' : isBad ? 'var(--ion-color-warning)' : chosen ? 'var(--ion-text-color)' : 'var(--fdm-line)';
          const bg = isGood ? 'var(--fdm-brand-soft)' : isBad ? 'var(--fdm-gold-soft)' : 'var(--fdm-card)';
          return (
            <button key={i} type="button" role={multi ? 'checkbox' : 'radio'} aria-checked={chosen} onClick={() => choose(i)}
              className={correction ? undefined : 'fdm-pressable'}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 14px', borderRadius: 16, textAlign: 'start', color: 'inherit', background: bg, border: `2px solid ${border}` }}>
              <span style={{
                flexShrink: 0, width: 30, height: 30, borderRadius: multi ? 8 : 15, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14,
                background: chosen && !correction ? 'var(--ion-text-color)' : 'rgba(120,115,105,.12)', color: chosen && !correction ? 'var(--ion-background-color)' : 'inherit',
              }}>{LETTERS[i]}</span>
              <span className="fdm-math" style={{ flex: 1, minWidth: 0, fontSize: 16 }}><MathText text={opt} /></span>
              {isGood && <IonIcon icon={checkmarkCircle} color="primary" style={{ fontSize: 24 }} />}
              {isBad && <IonIcon icon={closeCircle} color="warning" style={{ fontSize: 24 }} />}
            </button>
          );
        })}
      </div>

      {correction && (
        <div style={{ margin: '14px 16px 0', padding: '14px 16px', borderRadius: 16, background: correction.is_correct ? 'var(--fdm-brand-soft)' : 'var(--fdm-gold-soft)' }}>
          <div style={{ fontWeight: 800, color: correction.is_correct ? 'var(--ion-color-primary)' : 'var(--fdm-gold-strong)' }}>
            {correction.is_correct ? t('Bonne réponse !') : t('Pas tout à fait')}
          </div>
          {correction.explanation && <div className="fdm-math" style={{ fontSize: 15, marginTop: 6 }}><MathText text={correction.explanation} /></div>}
        </div>
      )}
    </Screen>
  );
}

/** Résultat d'un passage : score, évolution, bilan par théorème, correction (Erreurs / Sans réponse / Toutes). */
function QuizResultView({ result }: { result: SkillAssessment }) {
  const [tab, setTab] = useState<'erreurs' | 'vides' | 'toutes'>('erreurs');
  const score = pct(result);
  const before = previousPct(result);
  const items = result.correction ?? [];
  const right = items.filter((c) => c.is_correct).length;
  const shown = items.filter((c) => (tab === 'toutes' ? true : tab === 'vides' ? picked(c.your_answer).length === 0 : !c.is_correct && picked(c.your_answer).length > 0));
  const report = hasReport(result.par_theoreme) ? result.par_theoreme : null;

  return (
    <>
      <div className="fdm-card" style={{ margin: '18px 16px 0', padding: 20, textAlign: 'center' }}>
        <ScoreRing value={score} size={110} />
        <div className="fdm-title" style={{ fontSize: 22, fontWeight: 600, marginTop: 10 }}>
          {score >= 80 ? t('Excellent !') : score >= 50 ? t('Bien joué !') : t('Continue, tu progresses')}
        </div>
        <div className="fdm-muted" style={{ fontSize: 14.5, marginTop: 4 }}>
          {items.length ? t('{n} bonnes réponses sur {total}', { n: String(right), total: String(items.length) }) : null}
          {before != null && <> · {score >= before ? '▲' : '▼'} {t('{pct} % la dernière fois', { pct: String(before) })}</>}
        </div>
      </div>

      {report && (
        <>
          <div className="fdm-section-label">{t('Par théorème')}</div>
          <div className="fdm-card" style={{ margin: '0 16px', padding: '6px 16px' }}>
            {report.theoremes.map((th, i) => (
              <div key={th.id} style={{ padding: '10px 0', borderTop: i ? '1px solid var(--fdm-line)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 14 }}>
                  <span style={{ fontWeight: 600 }}>{th.name}</span><span style={{ fontWeight: 700 }}>{th.justes}/{th.total}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--fdm-line)', marginTop: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${th.pct}%`, height: '100%', background: th.pct >= 50 ? 'var(--ion-color-primary)' : 'var(--ion-color-warning)' }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {items.length > 0 && (
        <>
          <div className="fdm-section-label">{t('Correction')}</div>
          <div style={{ padding: '0 16px' }}>
            <IonSegment value={tab} onIonChange={(e) => setTab(e.detail.value as typeof tab)}>
              <IonSegmentButton value="erreurs"><IonLabel>{t('Erreurs')}</IonLabel></IonSegmentButton>
              <IonSegmentButton value="vides"><IonLabel>{t('Sans réponse')}</IonLabel></IonSegmentButton>
              <IonSegmentButton value="toutes"><IonLabel>{t('Toutes')}</IonLabel></IonSegmentButton>
            </IonSegment>
          </div>
          <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {shown.map((c) => {
              const mine = picked(c.your_answer);
              const good = goodAnswers(c);
              return (
                <div key={c.id} className="fdm-card" style={{ padding: 16 }}>
                  {c.question && <div className="fdm-math" style={{ fontSize: 15.5, fontWeight: 600 }}><MathText text={c.question} /></div>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                    {(c.options ?? []).map((o, i) => {
                      const g = good.includes(i);
                      const m = mine.includes(i);
                      if (!g && !m) return null;
                      return (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 10px', borderRadius: 10, background: g ? 'var(--fdm-brand-soft)' : 'var(--fdm-gold-soft)' }}>
                          <IonIcon icon={g ? checkmarkCircle : closeCircle} color={g ? 'primary' : 'warning'} />
                          <span className="fdm-math" style={{ fontSize: 14.5, flex: 1 }}><MathText text={o} /></span>
                          <span className="fdm-muted" style={{ fontSize: 11.5, fontWeight: 700 }}>{m ? t('Ta réponse') : t('Bonne réponse')}</span>
                        </div>
                      );
                    })}
                  </div>
                  {c.explanation && <div className="fdm-math fdm-muted" style={{ fontSize: 14.5, marginTop: 10 }}><MathText text={c.explanation} /></div>}
                </div>
              );
            })}
            {!shown.length && <Empty icon={trophyOutline} title={tab === 'erreurs' ? t('Aucune erreur, bravo !') : t('Rien ici')} />}
          </div>
        </>
      )}
    </>
  );
}

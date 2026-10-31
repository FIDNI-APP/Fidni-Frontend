/**
 * Un exercice, un devoir ou une leçon dans l'application, comme la page du site (pages/content/ContentDetail.tsx) :
 * une seule feuille (énoncé, parties, questions numérotées) ; pour chaque question « Indication », « Solution »,
 * « Tu avais trouvé ? » et la réussite des élèves (question_stats) ; vues, j'aime, discussion. Mêmes appels que le
 * site : progression par question (`assess_many`, résultat déduit quand tout est évalué), aides (`/aide/`), vue du
 * jour, temps passé, favori, liste de révision, signalement. Le « ⋯ » garde l'en-tête léger.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { IonButton, IonIcon, IonProgressBar, useIonActionSheet, useIonToast } from '@ionic/react';
import {
  arrowForward, bookmark, bookmarkOutline, bulbOutline, chatbubbleOutline, checkmarkCircle, ellipseOutline,
  ellipsisHorizontal, eyeOffOutline, eyeOutline, peopleOutline, refreshCircle, thumbsUpOutline,
} from 'ionicons/icons';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTimeTracker } from '@/hooks/usePageTimeTracker';
import {
  assessQuestions, examContentAPI, exerciseContentAPI, getRecommendations, lessonContentAPI, type RecommendedItem,
} from '@/lib/api/contentItemApi';
import { getQuestionStats, type QuestionStat } from '@/lib/api/statisticsApi';
import { quickAddToRevision } from '@/lib/api/revisionListApi';
import { recordHelp } from '@/lib/helpTracking';
import { assessablePaths } from '@/lib/utils/contentHelpers';
import { publicUrl, shareLink } from '@/lib/native';
import { LessonRenderer } from '@/components/content/viewer/LessonRenderer';
import type { ExerciseBlock, FlexibleExerciseStructure } from '@/components/content/editor/FlexibleExerciseEditor';
import type { FlexibleLessonStructure } from '@/components/content/editor/FlexibleLessonEditor';
import type { Comment, VoteValue } from '@/types';
import type { AssessmentStatus, ContentBlock, ContentExam, ContentExercise, ContentLesson } from '@/types/content';
import { t } from '@/i18n';
import { useNav } from '../nav';
import { useSession } from '../session';
import { DifficultyChip, ErrorState, Loading, MathHtml, Screen, countLabel, haptic, useLoad } from '../ui';
import { Discussion, Votes } from './Discussion';
import { ReportSheet } from './ReportSheet';

export type ContentKind = 'exercise' | 'exam' | 'lesson';
type Content = (ContentExercise | ContentExam | ContentLesson) & { comments?: Comment[]; comment_count?: number };
type Progress = Record<string, AssessmentStatus>;
type Stats = Record<string, QuestionStat>;

const API = { exercise: exerciseContentAPI, exam: examContentAPI, lesson: lessonContentAPI };
const KIND_LABEL: Record<ContentKind, string> = { exercise: 'Exercice', exam: 'Devoir', lesson: 'Leçon' };
const PATH: Record<ContentKind, string> = { exercise: 'exercises', exam: 'exams', lesson: 'lessons' };
const SUB_LETTERS = 'abcdefghijklmnopqrstuvwxyz';
// En dessous, « 2/3 » plutôt qu'un pourcentage trompeur (même règle que QuestionChart du site).
const PERCENT_FROM = 5;

const OPTIONS: Record<AssessmentStatus, { label: string; icon: string; color: string; soft: string }> = {
  success: { label: 'Réussi', icon: checkmarkCircle, color: 'var(--ion-color-primary)', soft: 'var(--fdm-brand-soft)' },
  partial: { label: 'En partie', icon: ellipseOutline, color: 'var(--ion-text-color)', soft: 'rgba(120,115,105,.14)' },
  review: { label: 'À revoir', icon: refreshCircle, color: 'var(--fdm-gold-strong)', soft: 'var(--fdm-gold-soft)' },
  failed: { label: 'À revoir', icon: refreshCircle, color: 'var(--fdm-gold-strong)', soft: 'var(--fdm-gold-soft)' },
};

/** Questions numérotées (la numérotation repart à 1 à chaque partie d'un devoir) : chemin et libellé. */
function numbering(structure?: FlexibleExerciseStructure): { path: string; label: string }[] {
  const out: { path: string; label: string }[] = [];
  let n = 0;
  for (const b of structure?.blocks ?? []) {
    if (b.type === 'section') { n = 0; continue; }
    if (b.type !== 'question') continue;
    n += 1;
    if (b.subQuestions?.length) b.subQuestions.forEach((sq, i) => out.push({ path: `${b.id}.${sq.id}`, label: t('Question {n} {lettre}', { n, lettre: SUB_LETTERS[i] ?? i + 1 }) }));
    else out.push({ path: b.id, label: t('Question {n}', { n }) });
  }
  return out;
}

export function ContentScreen({ id, kind }: { id: number | string; kind: ContentKind }) {
  const { isAuthenticated } = useAuth();
  const { requireAccount, openWeb } = useSession();
  const nav = useNav();
  const [sheet] = useIonActionSheet();
  const [toast] = useIonToast();
  const api = API[kind];
  const sid = String(id);

  const { data, error, loading, reload } = useLoad(async () => {
    const [content, progress] = await Promise.all([
      api.get(sid) as Promise<Content>,
      isAuthenticated && kind !== 'lesson' ? exerciseContentAPI.getProgress(sid).catch(() => null) : Promise.resolve(null),
    ]);
    const statuses: Progress = {};
    for (const [p, v] of Object.entries(progress?.item_progress ?? {})) if (v?.status) statuses[p] = v.status as AssessmentStatus;
    return { content, statuses };
  }, [sid, kind, isAuthenticated]);

  const content = data?.content;
  const [progress, setProgress] = useState<Progress>({});
  const [completion, setCompletion] = useState<'success' | 'review' | null>(null);
  const [saved, setSaved] = useState(false);
  const [next, setNext] = useState<RecommendedItem[] | null>(null);
  const [stats, setStats] = useState<Stats>({});
  const [reporting, setReporting] = useState(false);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    if (!data) return;
    setProgress(data.statuses);
    setCompletion(data.content.user_complete ?? null);
    setSaved(!!data.content.user_save);
  }, [data]);

  // Réussite des élèves question par question ; relue peu après une évaluation (le serveur efface son cache).
  const loadStats = () => { if (kind !== 'lesson') getQuestionStats(sid).then((r) => setStats(r.questions || {})).catch(() => undefined); };
  useEffect(loadStats, [sid, kind]); // eslint-disable-line react-hooks/exhaustive-deps
  const statsTimer = useRef<number>();

  usePageTimeTracker({ contentType: kind, contentId: sid, enabled: !!content });

  // Vue : une par contenu et par jour depuis cet appareil (le serveur dédoublonne aussi).
  useEffect(() => {
    if (!content) return;
    try {
      const key = `fidni:vue:${sid}`;
      if (Date.now() - Number(localStorage.getItem(key) || 0) > 24 * 3600 * 1000) {
        localStorage.setItem(key, String(Date.now()));
        api.recordView(sid).catch(() => undefined);
      }
    } catch { api.recordView(sid).catch(() => undefined); }
  }, [content, sid, api]);

  const structure = content?.structure as unknown as FlexibleExerciseStructure | undefined;
  const leaves = useMemo(() => (kind === 'lesson' ? [] : assessablePaths(structure)), [structure, kind]);
  const questions = useMemo(() => (kind === 'lesson' ? [] : numbering(structure)), [structure, kind]);
  const assessedCount = leaves.filter((p) => progress[p]).length;
  const options: AssessmentStatus[] = kind === 'exam' ? ['success', 'partial', 'review'] : ['success', 'review'];

  // Une question évaluée (re-toucher le choix actif l'efface) ; résultat du contenu quand tout est évalué.
  const assess = async (path: string, status: AssessmentStatus, source: 'question' | 'apres_solution' = 'question') => {
    if (!requireAccount(t('Crée un compte gratuit pour enregistrer tes réussites et retrouver ce qu’il faut revoir.'))) return;
    const before = progressRef.current;
    const value: AssessmentStatus | null = before[path] === status ? null : status;
    const nextProgress = { ...before };
    if (value) nextProgress[path] = value; else delete nextProgress[path];
    let target: 'success' | 'review' | null | undefined;
    if (leaves.length && leaves.every((p) => nextProgress[p])) target = leaves.every((p) => nextProgress[p] === 'success') ? 'success' : 'review';
    else if (completion && !value) target = null;
    const sendCompletion = target !== undefined && target !== completion;
    setProgress(nextProgress);
    if (sendCompletion) setCompletion(target ?? null);
    if (value === 'success') haptic.success(); else haptic.tap();
    try {
      await assessQuestions(sid, { [path]: value }, { source, ...(sendCompletion ? { completion: target } : {}) });
      window.clearTimeout(statsTimer.current);
      statsTimer.current = window.setTimeout(loadStats, 700);
      if (sendCompletion && target) getRecommendations(sid, target).then(setNext).catch(() => setNext([]));
    } catch {
      setProgress(before);
      if (sendCompletion) setCompletion(completion);
    }
  };

  const onHelp = (path: string, kindOfHelp: 'indice' | 'solution') => {
    if (isAuthenticated && kind !== 'lesson') recordHelp(sid, path, kindOfHelp);
  };

  const toggleSave = async () => {
    if (!requireAccount(t('Crée un compte gratuit pour garder tes favoris.'))) return;
    haptic.tap();
    const was = saved;
    setSaved(!was);
    try { if (was) await api.unsave(sid); else await api.save(sid); } catch { setSaved(was); }
  };

  const more = () => {
    if (!content) return;
    haptic.tap();
    void sheet({
      header: content.title,
      buttons: [
        { text: t('Partager'), handler: () => { void shareLink({ title: content.title, text: t('{titre} – sur Fidni', { titre: content.title }), url: publicUrl(`/${PATH[kind]}/${sid}`) }); } },
        ...(kind !== 'lesson' ? [{ text: t('Ajouter à une liste de révision'), handler: () => {
          if (!requireAccount()) return;
          quickAddToRevision(Number(sid))
            .then((r) => toast({ message: t('Ajouté à « {liste} »', { liste: r.list_name }), duration: 2200, position: 'top' }))
            .catch(() => toast({ message: t('Impossible d’ajouter ce contenu.'), duration: 2200, position: 'top' }));
        } }] : []),
        { text: t('Version PDF à imprimer'), handler: () => openWeb(`/${PATH[kind]}/${sid}/pdf`) },
        { text: t('Signaler une erreur'), handler: () => { if (requireAccount(t('Crée un compte gratuit pour signaler une erreur : tu recevras la réponse de l’équipe.'))) setReporting(true); } },
        { text: t('Annuler'), role: 'cancel' },
      ],
    });
  };

  const actions = content ? (
    <>
      <IonButton onClick={toggleSave} aria-label={t('Favori')}><IonIcon slot="icon-only" icon={saved ? bookmark : bookmarkOutline} /></IonButton>
      <IonButton onClick={more} aria-label={t('Plus')}><IonIcon slot="icon-only" icon={ellipsisHorizontal} /></IonButton>
    </>
  ) : undefined;

  const footer = isAuthenticated && kind !== 'lesson' && leaves.length > 0 && content ? (
    <div style={{ background: 'var(--ion-toolbar-background)', borderTop: '1px solid var(--fdm-line)', padding: '10px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
        <span>{t('{n} / {total} questions évaluées', { n: String(assessedCount), total: String(leaves.length) })}</span>
        {completion === 'success' && <span style={{ color: 'var(--ion-color-primary)' }}>✓ {t('Réussi')}</span>}
        {completion === 'review' && <span style={{ color: 'var(--fdm-gold-strong)' }}>↻ {t('À revoir')}</span>}
      </div>
      <IonProgressBar value={leaves.length ? assessedCount / leaves.length : 0} color={completion === 'review' ? 'warning' : 'primary'}
        style={{ height: 6, borderRadius: 3 }} />
    </div>
  ) : undefined;

  return (
    <Screen title={t(KIND_LABEL[kind])} actions={actions} footer={footer} onRefresh={reload}>
      {loading && !content && <Loading />}
      {error && !content ? <ErrorState onRetry={reload} /> : null}
      {content && (
        <>
          <ContentHeading content={content} kind={kind} />
          {kind === 'lesson'
            ? <div className="fdm-card fdm-math" style={{ margin: '0 16px', padding: '18px 18px 8px' }}>
                <LessonRenderer structure={content.structure as unknown as FlexibleLessonStructure} />
              </div>
            : <Paper structure={structure} progress={progress} options={options} stats={stats} onAssess={assess} onHelp={onHelp} />}

          {completion && next !== null && next.length > 0 && (
            <div style={{ margin: '22px 16px 0' }}>
              <div className="fdm-section-label" style={{ margin: '0 4px 10px' }}>
                {completion === 'success' ? t('Bravo ! Pour continuer') : t('Pour t’entraîner encore')}
              </div>
              {next.slice(0, 3).map((item) => (
                <button key={item.id} type="button" className="fdm-card fdm-pressable"
                  onClick={() => nav.push(() => <ContentScreen id={item.id} kind={item.type} />)}
                  style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 12, padding: '14px 16px', marginBottom: 10, textAlign: 'start', color: 'inherit' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{item.title}</div>
                    {item.reason && <div className="fdm-muted" style={{ fontSize: 13, marginTop: 2 }}>{item.reason}</div>}
                  </div>
                  <IonIcon flipRtl icon={arrowForward} color="primary" />
                </button>
              ))}
            </div>
          )}

          <Votes id={sid} api={api} likes={content.like_count ?? 0} dislikes={content.dislike_count ?? 0} userVote={(content.user_vote ?? 0) as VoteValue} />
          <Discussion id={sid} api={api} initial={content.comments ?? []} />
          <ReportSheet open={reporting} onClose={() => setReporting(false)} contentId={sid} kind={kind} questions={questions} />
        </>
      )}
    </Screen>
  );
}

function ContentHeading({ content, kind }: { content: Content; kind: ContentKind }) {
  const chapter = content.chapters?.[0]?.name;
  const level = content.class_levels?.[0]?.name;
  const comments = content.comment_count ?? content.comments?.length ?? 0;
  const credit = (content.structure as { credit?: string } | undefined)?.credit;
  const meta = (icon: string, value: number | string) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IonIcon icon={icon} />{value}</span>
  );
  return (
    <div style={{ padding: '18px 20px 14px' }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--fdm-gold-strong)' }}>
        {[t(KIND_LABEL[kind]), chapter, level].filter(Boolean).join(' · ')}
      </div>
      <h1 className="fdm-title" style={{ fontSize: 25, lineHeight: 1.2, margin: '8px 0 10px', fontWeight: 600 }}>{content.title}</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, fontSize: 13.5 }} className="fdm-muted">
        <DifficultyChip value={content.difficulty} />
        {meta(eyeOutline, content.view_count ?? 0)}
        {meta(thumbsUpOutline, content.like_count ?? 0)}
        {meta(chatbubbleOutline, comments)}
      </div>
      {(credit || content.author?.username) && (
        <div className="fdm-muted" style={{ fontSize: 13, marginTop: 8 }}>
          {credit || t('Par {auteur}', { auteur: content.author?.is_deleted ? t('Compte supprimé') : content.author.username })}
        </div>
      )}
    </div>
  );
}

interface PaperProps {
  structure?: FlexibleExerciseStructure;
  progress: Progress;
  options: AssessmentStatus[];
  stats: Stats;
  onAssess: (path: string, status: AssessmentStatus, source?: 'question' | 'apres_solution') => void;
  onHelp: (path: string, kind: 'indice' | 'solution') => void;
}

/** Toute la feuille dans un seul cadre, comme sur le site : énoncé, parties (devoirs) et questions. */
function Paper({ structure, ...rest }: PaperProps) {
  let n = 0;
  const blocks = structure?.blocks ?? [];
  return (
    <div className="fdm-card" style={{ margin: '0 16px', padding: '4px 16px 6px' }}>
      {blocks.map((block, i) => {
        const divider: React.CSSProperties = i ? { borderTop: '1px solid var(--fdm-line)' } : {};
        if (block.type === 'section') {
          n = 0;
          return (
            <div key={block.id} style={{ ...divider, padding: '18px 0 6px', display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <div className="fdm-title" style={{ flex: 1, fontSize: 19, fontWeight: 600, color: 'var(--ion-color-primary)' }}><MathHtml html={block.content?.html} /></div>
              {Number(block.points) > 0 && <span className="fdm-muted" style={{ fontSize: 12.5, fontWeight: 700 }}>{countLabel(Number(block.points), '{n} pt', '{n} pts')}</span>}
            </div>
          );
        }
        if (block.type === 'context') {
          return <div key={block.id} style={{ ...divider, padding: '14px 0' }}><MathHtml html={block.content?.html} /></div>;
        }
        n += 1;
        return <div key={block.id} style={{ ...divider, padding: '14px 0' }}><Question block={block} number={n} {...rest} /></div>;
      })}
    </div>
  );
}

function Question({ block, number, ...rest }: { block: ExerciseBlock; number: number } & Omit<PaperProps, 'structure'>) {
  const subs = block.subQuestions ?? [];
  return (
    <>
      <div style={{ display: 'flex', gap: 10 }}>
        <span style={{
          flexShrink: 0, width: 26, height: 26, borderRadius: 13, background: 'var(--fdm-brand-soft)', color: 'var(--ion-color-primary)',
          display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13.5, marginTop: 1,
        }}>{number}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <MathHtml html={block.content?.html} />
          {Number(block.points) > 0 && <div className="fdm-muted" style={{ fontSize: 12, marginTop: 4, fontWeight: 600 }}>{countLabel(Number(block.points), '{n} pt', '{n} pts')}</div>}
        </div>
      </div>
      {subs.length === 0
        ? <Leaf path={block.id} hint={block.hint} solution={block.solution} {...rest} />
        : subs.map((sq, i) => (
            <div key={sq.id} style={{ marginTop: 14, marginInlineStart: 36 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontWeight: 700, color: 'var(--fdm-muted)', minWidth: 16 }}>{SUB_LETTERS[i] ?? i + 1})</span>
                <div style={{ flex: 1, minWidth: 0 }}><MathHtml html={sq.content?.html} /></div>
              </div>
              <Leaf path={`${block.id}.${sq.id}`} hint={sq.hint} solution={sq.solution} indent={24} {...rest} />
            </div>
          ))}
    </>
  );
}

/** Réussite des élèves sur une question : « 2/3 » tant qu'il y a peu d'évaluations, un pourcentage ensuite. */
function ClassRate({ stat }: { stat?: QuestionStat }) {
  if (!stat || stat.total < 1) return null;
  const pct = Math.round((stat.success / stat.total) * 100);
  const low = stat.total >= PERCENT_FROM && pct < 50;
  return (
    <span title={t('Élèves qui réussissent cette question')} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 700,
      color: low ? 'var(--fdm-gold-strong)' : 'var(--fdm-muted)',
    }}>
      <IonIcon icon={peopleOutline} />
      {stat.total >= PERCENT_FROM ? t('{pct} % réussissent', { pct }) : t('{n}/{total} réussissent', { n: stat.success, total: stat.total })}
    </span>
  );
}

/** Indication, solution, réussite des élèves et auto-évaluation d'une question (ou sous-question). */
function Leaf({ path, hint, solution, indent = 36, progress, options, stats, onAssess, onHelp }: {
  path: string; hint?: ContentBlock; solution?: ContentBlock;
  /** Retrait : aligné sur l'énoncé (après le numéro, ou la lettre d'une sous-question). */
  indent?: number;
} & Omit<PaperProps, 'structure'>) {
  const [hintOpen, setHintOpen] = useState(false);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const current = progress[path];
  const shown = current === 'failed' || (current === 'partial' && !options.includes('partial')) ? 'review' : current;

  const pill = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 13px', borderRadius: 17, fontSize: 13.5, fontWeight: 600,
    background: active ? 'var(--ion-color-primary)' : 'rgba(120,115,105,.10)', color: active ? '#fff' : 'var(--ion-text-color)',
  });

  return (
    <div style={{ marginTop: 10, marginInlineStart: indent }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        {hint?.html && (
          <button type="button" className="fdm-pressable" style={pill(hintOpen)}
            onClick={() => { haptic.tap(); if (!hintOpen) onHelp(path, 'indice'); setHintOpen(!hintOpen); }}>
            <IonIcon icon={bulbOutline} />{t('Indication')}
          </button>
        )}
        {solution?.html && (
          <button type="button" className="fdm-pressable" style={pill(solutionOpen)}
            onClick={() => { haptic.tap(); if (!solutionOpen) onHelp(path, 'solution'); setSolutionOpen(!solutionOpen); }}>
            <IonIcon icon={solutionOpen ? eyeOffOutline : eyeOutline} />{solutionOpen ? t('Masquer') : t('Solution')}
          </button>
        )}
      </div>
      {hintOpen && hint?.html && (
        <div style={{ marginTop: 10, padding: '12px 14px', borderRadius: 14, background: 'var(--fdm-gold-soft)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fdm-gold-strong)', marginBottom: 4 }}>{t('Indication')}</div>
          <MathHtml html={hint.html} />
        </div>
      )}
      {solutionOpen && solution?.html && (
        <div style={{ marginTop: 10, padding: '12px 14px', borderRadius: 14, background: 'var(--fdm-brand-soft)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ion-color-primary)', marginBottom: 4 }}>{t('Solution')}</div>
          <MathHtml html={solution.html} />
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 6 }}>
        <span className="fdm-muted" style={{ fontSize: 12.5, flex: 1 }}>{t('Tu avais trouvé ?')}</span>
        <ClassRate stat={stats[path]} />
      </div>
      {/* Un seul rang, choix de même largeur (deux pour un exercice, trois pour un devoir). */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${options.length}, 1fr)`, gap: 6 }}>
        {options.map((o) => {
          const opt = OPTIONS[o];
          const active = shown === o;
          return (
            <button key={o} type="button" className="fdm-pressable" aria-pressed={active}
              onClick={() => onAssess(path, o, solutionOpen ? 'apres_solution' : 'question')}
              style={{
                height: 36, padding: '0 6px', borderRadius: 12, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                background: active ? opt.soft : 'transparent', color: active ? opt.color : 'var(--fdm-muted)',
                border: `1.5px solid ${active ? opt.color : 'var(--fdm-line)'}`, whiteSpace: 'nowrap',
              }}>
              <IonIcon icon={opt.icon} />{t(opt.label)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

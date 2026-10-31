/**
 * Un exercice, un devoir ou une leçon dans l'application. Pour chaque question : énoncé, « Indication »,
 * « Solution », puis « Tu avais trouvé ? » (Réussi / À revoir ; un devoir ajoute « En partie »). Mêmes appels que la
 * page du site (pages/content/ContentDetail.tsx) : progression par question (`assess_many`, résultat du contenu
 * déduit quand tout est évalué), aides ouvertes (`/aide/`), vue du jour, temps passé, favori.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { IonButton, IonIcon, IonProgressBar } from '@ionic/react';
import {
  bookmark, bookmarkOutline, bulbOutline, checkmarkCircle, eyeOffOutline, eyeOutline, refreshCircle, shareOutline,
  ellipseOutline, arrowForward,
} from 'ionicons/icons';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTimeTracker } from '@/hooks/usePageTimeTracker';
import {
  assessQuestions, examContentAPI, exerciseContentAPI, getRecommendations, lessonContentAPI, type RecommendedItem,
} from '@/lib/api/contentItemApi';
import { recordHelp } from '@/lib/helpTracking';
import { assessablePaths } from '@/lib/utils/contentHelpers';
import { publicUrl, shareLink } from '@/lib/native';
import { LessonRenderer } from '@/components/content/viewer/LessonRenderer';
import type { ExerciseBlock, FlexibleExerciseStructure, SubQuestionBlock } from '@/components/content/editor/FlexibleExerciseEditor';
import type { FlexibleLessonStructure } from '@/components/content/editor/FlexibleLessonEditor';
import type { AssessmentStatus, ContentBlock, ContentExam, ContentExercise, ContentLesson } from '@/types/content';
import { t } from '@/i18n';
import { useNav } from '../nav';
import { useSession } from '../session';
import { DifficultyChip, ErrorState, Loading, MathHtml, Screen, haptic, useLoad } from '../ui';

export type ContentKind = 'exercise' | 'exam' | 'lesson';
type Content = ContentExercise | ContentExam | ContentLesson;
type Progress = Record<string, AssessmentStatus>;

const API = { exercise: exerciseContentAPI, exam: examContentAPI, lesson: lessonContentAPI };
const KIND_LABEL: Record<ContentKind, string> = { exercise: 'Exercice', exam: 'Devoir', lesson: 'Leçon' };
const SUB_LETTERS = 'abcdefghijklmnopqrstuvwxyz';

const OPTIONS: Record<AssessmentStatus, { label: string; icon: string; color: string; soft: string }> = {
  success: { label: 'Réussi', icon: checkmarkCircle, color: 'var(--ion-color-primary)', soft: 'var(--fdm-brand-soft)' },
  partial: { label: 'En partie', icon: ellipseOutline, color: 'var(--ion-text-color)', soft: 'rgba(120,115,105,.14)' },
  review: { label: 'À revoir', icon: refreshCircle, color: 'var(--fdm-gold-strong)', soft: 'var(--fdm-gold-soft)' },
  failed: { label: 'À revoir', icon: refreshCircle, color: 'var(--fdm-gold-strong)', soft: 'var(--fdm-gold-soft)' },
};

export function ContentScreen({ id, kind }: { id: number | string; kind: ContentKind }) {
  const { isAuthenticated } = useAuth();
  const { requireAccount } = useSession();
  const nav = useNav();
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
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    if (!data) return;
    setProgress(data.statuses);
    setCompletion(data.content.user_complete ?? null);
    setSaved(!!data.content.user_save);
  }, [data]);

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

  const share = () => {
    if (!content) return;
    haptic.tap();
    const path = kind === 'exercise' ? 'exercises' : kind === 'exam' ? 'exams' : 'lessons';
    void shareLink({ title: content.title, text: t('{titre} – sur Fidni', { titre: content.title }), url: publicUrl(`/${path}/${sid}`) });
  };

  const actions = content ? (
    <>
      <IonButton onClick={share} aria-label={t('Partager')}><IonIcon slot="icon-only" icon={shareOutline} /></IonButton>
      <IonButton onClick={toggleSave} aria-label={t('Favori')}><IonIcon slot="icon-only" icon={saved ? bookmark : bookmarkOutline} /></IonButton>
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
            : <Blocks structure={structure} progress={progress} options={options} onAssess={assess} onHelp={onHelp} />}
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
        </>
      )}
    </Screen>
  );
}

function ContentHeading({ content, kind }: { content: Content; kind: ContentKind }) {
  const chapter = content.chapters?.[0]?.name;
  const level = content.class_levels?.[0]?.name;
  return (
    <div style={{ padding: '18px 20px 14px' }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--fdm-gold-strong)' }}>
        {[t(KIND_LABEL[kind]), chapter, level].filter(Boolean).join(' · ')}
      </div>
      <h1 className="fdm-title" style={{ fontSize: 25, lineHeight: 1.2, margin: '8px 0 10px', fontWeight: 600 }}>{content.title}</h1>
      <DifficultyChip value={content.difficulty} />
    </div>
  );
}

interface BlocksProps {
  structure?: FlexibleExerciseStructure;
  progress: Progress;
  options: AssessmentStatus[];
  onAssess: (path: string, status: AssessmentStatus, source?: 'question' | 'apres_solution') => void;
  onHelp: (path: string, kind: 'indice' | 'solution') => void;
}

/** Énoncé, parties (devoirs : la numérotation repart à 1) et questions. */
function Blocks({ structure, progress, options, onAssess, onHelp }: BlocksProps) {
  let n = 0;
  return (
    <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {(structure?.blocks ?? []).map((block) => {
        if (block.type === 'section') {
          n = 0;
          return (
            <div key={block.id} className="fdm-title" style={{ fontSize: 20, fontWeight: 600, margin: '14px 4px 0' }}>
              <MathHtml html={block.content?.html} />
            </div>
          );
        }
        if (block.type === 'context') {
          return (
            <div key={block.id} className="fdm-card" style={{ padding: '16px 18px' }}>
              <MathHtml html={block.content?.html} />
            </div>
          );
        }
        n += 1;
        return <QuestionCard key={block.id} block={block} number={n} progress={progress} options={options} onAssess={onAssess} onHelp={onHelp} />;
      })}
    </div>
  );
}

function QuestionCard({ block, number, progress, options, onAssess, onHelp }: { block: ExerciseBlock; number: number } & Omit<BlocksProps, 'structure'>) {
  const subs = block.subQuestions ?? [];
  return (
    <div className="fdm-card" style={{ padding: '16px 16px 14px' }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <span style={{
          flexShrink: 0, width: 28, height: 28, borderRadius: 14, background: 'var(--fdm-brand-soft)', color: 'var(--ion-color-primary)',
          display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14,
        }}>{number}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <MathHtml html={block.content?.html} />
          {block.points ? <div className="fdm-muted" style={{ fontSize: 12, marginTop: 4 }}>{t('{n} pts', { n: String(block.points) })}</div> : null}
        </div>
      </div>
      {subs.length === 0
        ? <Leaf path={block.id} hint={block.hint} solution={block.solution} progress={progress} options={options} onAssess={onAssess} onHelp={onHelp} />
        : subs.map((sq: SubQuestionBlock, i) => (
            <div key={sq.id} style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--fdm-line)' }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ fontWeight: 700, color: 'var(--fdm-muted)', minWidth: 18 }}>{SUB_LETTERS[i] ?? i + 1})</span>
                <div style={{ flex: 1, minWidth: 0 }}><MathHtml html={sq.content?.html} /></div>
              </div>
              <Leaf path={`${block.id}.${sq.id}`} hint={sq.hint} solution={sq.solution} progress={progress} options={options} onAssess={onAssess} onHelp={onHelp} />
            </div>
          ))}
    </div>
  );
}

/** Indication, solution et auto-évaluation d'une question (ou sous-question). */
function Leaf({ path, hint, solution, progress, options, onAssess, onHelp }: {
  path: string; hint?: ContentBlock; solution?: ContentBlock;
} & Omit<BlocksProps, 'structure'>) {
  const [hintOpen, setHintOpen] = useState(false);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const current = progress[path];
  const shown = current === 'failed' || (current === 'partial' && !options.includes('partial')) ? 'review' : current;

  const pill = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', borderRadius: 18, fontSize: 14, fontWeight: 600,
    background: active ? 'var(--ion-color-primary)' : 'rgba(120,115,105,.10)', color: active ? '#fff' : 'var(--ion-text-color)',
  });

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
      <div style={{ marginTop: 12 }}>
        <div className="fdm-muted" style={{ fontSize: 12.5, marginBottom: 6 }}>{t('Tu avais trouvé ?')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${options.length}, 1fr)`, gap: 8 }}>
          {options.map((o) => {
            const opt = OPTIONS[o];
            const active = shown === o;
            return (
              <button key={o} type="button" className="fdm-pressable" aria-pressed={active}
                onClick={() => onAssess(path, o, solutionOpen ? 'apres_solution' : 'question')}
                style={{
                  height: 42, borderRadius: 12, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: active ? opt.soft : 'transparent', color: active ? opt.color : 'var(--fdm-muted)',
                  border: `1.5px solid ${active ? opt.color : 'var(--fdm-line)'}`,
                }}>
                <IonIcon icon={opt.icon} />{t(opt.label)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

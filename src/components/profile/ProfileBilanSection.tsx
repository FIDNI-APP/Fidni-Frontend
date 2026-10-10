// src/components/profile/ProfileBilanSection.tsx
//
// The profile's own job: the long view. `/` (Accueil) already answers "what's
// happening this week" — streak, study time, weekly chart, recommendations —
// so this page answers "where do I actually stand, by chapter, and what should
// I work on next". No stat is duplicated from the dashboard.
//
// Mastery has two honest sources, in order of authority:
//   1. A Skill IQ assessment for the chapter (a real score out of max).
//   2. Failing that, the user's own exercise record on that chapter
//      (réussis vs à revoir) — weaker evidence, labelled as such.
// A chapter with neither is shown as "Non évalué" rather than as a zero, which
// would read as failure instead of absence.

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Brain, RotateCcw, Sparkles, Target } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { hubPath, profileLevel } from '@/lib/api/hubApi';
import { practiceUrl, quizUrl } from '@/pages/progression/links';

export interface SkillAssessment {
  id: number;
  chapter: number;
  chapter_name: string;
  subject_name: string;
  score: number;
  max_score: number;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  completed_at: string;
  /** Passage précédent (null au premier) et nombre de passages (10/10/2026). */
  previous_score?: number | null;
  previous_max?: number | null;
  attempts?: number;
  /** Page d'exercices du chapitre au niveau de l'élève (« S'entraîner ») ; null hors de son niveau. */
  hub_url?: string | null;
}

/** Niveau ou chapitre tel que l'envoient les cartes (ContentListSerializer : id, nom, slug). */
interface TaxonRef { id: number | string; name: string; slug?: string }

/** Exercice réussi ou à revoir (/users/<u>/success_thing/, review_thing/) : seuls ces champs servent ici. */
interface ExerciseRecord {
  chapters?: TaxonRef[];
  class_levels?: (TaxonRef | string)[];
  subject?: { name?: string } | null;
}

/** Une publication de l'utilisateur. */
interface PublishedItem {
  id: number | string;
  type?: string;
  title: string;
  subject?: { name?: string } | null;
  chapters?: { name?: string }[];
  vote_count?: number;
  view_count?: number;
}

interface ProfileBilanSectionProps {
  progressData: {
    successExercises: ExerciseRecord[];
    reviewExercises: ExerciseRecord[];
  };
  assessments: SkillAssessment[];
  contributions: PublishedItem[];
  learningStats?: { total_viewed?: number } | null;
  isOwner: boolean;
  /** Objectifs de notes (privés : fournis au seul propriétaire). */
  goals?: { subject: number | string; subject_name?: string; min_grade: number | string; max_grade: number | string }[];
  editUrl?: string;
  loading?: boolean;
}

// Same vocabulary as SkillIQSection, so a level reads identically in both places.
const LEVEL_STYLE: Record<string, { label: string; bg: string; color: string; bar: string }> = {
  beginner:     { label: 'Débutant',      bg: '#f2f1ee', color: '#6b6862', bar: '#b8b4ac' },
  intermediate: { label: 'Intermédiaire', bg: '#eaf3ed', color: '#15633c', bar: '#1a7a4a' },
  advanced:     { label: 'Avancé',        bg: '#efece7', color: '#33302b', bar: '#4b4843' },
  expert:       { label: 'Expert',        bg: '#1a1a1a', color: '#ffffff', bar: '#1a1a1a' },
};

interface ChapterRecord {
  id: number | string;
  name: string;
  subject?: string;
  solved: number;
  toReview: number;
  assessment?: SkillAssessment;
  /** Page d'exercices du chapitre à son niveau : celle du quiz (serveur), sinon déduite des exercices. */
  hubUrl?: string | null;
}

/** Niveau de l'élève (id et slug de sa page) : les liens « S'entraîner » mènent à la page du chapitre à ce niveau. */
type StudentLevel = { id: string; slug: string } | null;

/** Page du chapitre au niveau de l'élève, si l'exercice est bien de son niveau (slugs fournis par la carte). */
function exerciseHub(ex: ExerciseRecord, chapter: TaxonRef, level: StudentLevel): string | null {
  if (!level || !chapter.slug) return null;
  const mine = (ex.class_levels || []).some((l) => typeof l === 'object' && String(l.id) === level.id);
  return mine ? hubPath('exercises', level.slug, chapter.slug) : null;
}

/** Fold the two exercise lists and the assessments into one row per chapter. */
function buildChapterRecords(
  successExercises: ExerciseRecord[],
  reviewExercises: ExerciseRecord[],
  assessments: SkillAssessment[],
  level: StudentLevel,
): ChapterRecord[] {
  const byId = new Map<string, ChapterRecord>();

  const touch = (chapter: TaxonRef, subjectName?: string): ChapterRecord => {
    const key = String(chapter.id);
    let record = byId.get(key);
    if (!record) {
      record = { id: chapter.id, name: chapter.name, subject: subjectName, solved: 0, toReview: 0 };
      byId.set(key, record);
    }
    return record;
  };
  const fromExercise = (ex: ExerciseRecord, field: 'solved' | 'toReview') => {
    (ex.chapters || []).forEach((c) => {
      const record = touch(c, ex.subject?.name);
      record[field] += 1;
      record.hubUrl = record.hubUrl || exerciseHub(ex, c, level);
    });
  };

  successExercises.forEach((ex) => fromExercise(ex, 'solved'));
  reviewExercises.forEach((ex) => fromExercise(ex, 'toReview'));
  assessments.forEach(a => {
    const record = touch({ id: a.chapter, name: a.chapter_name }, a.subject_name);
    record.assessment = a;
    // Le serveur sait si le chapitre est du niveau de l'élève : son lien l'emporte.
    if (a.hub_url !== undefined) record.hubUrl = a.hub_url;
  });

  return Array.from(byId.values());
}

/** « S'entraîner » sur un chapitre : sa page à son niveau (les plus faciles d'abord, sans les réussis), sinon la liste filtrée. */
const practiceOf = (r: ChapterRecord) => practiceUrl(r.hubUrl, r.id);

/** Percentage to fill the bar with, plus what that number is actually based on. */
function masteryOf(record: ChapterRecord): { percent: number; label: string; style: typeof LEVEL_STYLE[string] | null; basis: string } {
  if (record.assessment) {
    const { score, max_score, level } = record.assessment;
    const percent = max_score > 0 ? Math.round((score / max_score) * 100) : 0;
    return { percent, label: LEVEL_STYLE[level]?.label ?? 'Évalué', style: LEVEL_STYLE[level] ?? LEVEL_STYLE.beginner, basis: 'Test Skill IQ' };
  }
  const attempted = record.solved + record.toReview;
  if (attempted > 0) {
    const percent = Math.round((record.solved / attempted) * 100);
    return { percent, label: `${record.solved}/${attempted} réussis`, style: null, basis: 'D\'après tes exercices' };
  }
  return { percent: 0, label: 'Non évalué', style: null, basis: '' };
}

const SectionTitle: React.FC<{ children: React.ReactNode; action?: React.ReactNode }> = ({ children, action }) => (
  <div className="flex items-baseline justify-between gap-3 mb-4">
    <h2 className="fd-display" style={{ fontSize: 17, color: '#1a1a1a' }}>{children}</h2>
    {action}
  </div>
);

const ChapterRow: React.FC<{ record: ChapterRecord }> = ({ record }) => {
  const { percent, label, style, basis } = masteryOf(record);

  return (
    <Link
      to={practiceOf(record)}
      className="grid items-center gap-3 group"
      style={{ gridTemplateColumns: 'minmax(0,1fr) 96px', padding: '9px 0', textDecoration: 'none' }}
    >
      <div className="min-w-0">
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="truncate" style={{ fontSize: 13.5, fontWeight: 500, color: '#1a1a1a' }}>{record.name}</span>
          {basis && (
            <span className="flex-shrink-0" style={{ fontSize: 10.5, color: '#9a958c' }}>{basis}</span>
          )}
        </div>
        <div style={{ height: 6, borderRadius: 99, background: '#f2f1ee', overflow: 'hidden' }}>
          <div
            style={{
              width: `${percent}%`,
              height: '100%',
              borderRadius: 99,
              background: style ? style.bar : '#1a7a4a',
              transition: 'width .4s ease',
            }}
          />
        </div>
      </div>

      {style ? (
        <span
          className="justify-self-end text-center"
          style={{
            background: style.bg, color: style.color, fontSize: 10.5, fontWeight: 700,
            padding: '3px 9px', borderRadius: 99, letterSpacing: '.02em', whiteSpace: 'nowrap',
          }}
        >
          {style.label}
        </span>
      ) : (
        <span className="justify-self-end fd-nums" style={{ fontSize: 11.5, color: '#6b6862', whiteSpace: 'nowrap' }}>
          {label}
        </span>
      )}
    </Link>
  );
};

/** Ranked "do this next" list. Ordered by how much evidence there is of a gap. */
function buildPriorities(records: ChapterRecord[]) {
  const priorities: { key: string; chapter: string; reason: string; to: string; cta: string; icon: React.ElementType }[] = [];

  records
    .filter(r => r.toReview > 0)
    .sort((a, b) => b.toReview - a.toReview)
    .forEach(r => priorities.push({
      key: `review-${r.id}`,
      chapter: r.name,
      reason: `${r.toReview} exercice${r.toReview > 1 ? 's' : ''} marqué${r.toReview > 1 ? 's' : ''} à revoir`,
      to: practiceOf(r),
      cta: 'Reprendre',
      icon: RotateCcw,
    }));

  records
    .filter(r => r.assessment && (r.assessment.level === 'beginner' || r.assessment.level === 'intermediate'))
    .sort((a, b) => (a.assessment!.score / a.assessment!.max_score) - (b.assessment!.score / b.assessment!.max_score))
    .forEach(r => priorities.push({
      key: `weak-${r.id}`,
      chapter: r.name,
      reason: `Niveau ${LEVEL_STYLE[r.assessment!.level].label.toLowerCase()} au test`,
      to: practiceOf(r),
      cta: "S'entraîner",
      icon: Sparkles,
    }));

  // Un chapitre déjà listé (exercices à revoir) n'apparaît pas une seconde fois.
  records
    .filter(r => !r.assessment && r.solved + r.toReview > 0 && !priorities.some(p => p.chapter === r.name))
    .forEach(r => priorities.push({
      key: `untested-${r.id}`,
      chapter: r.name,
      reason: 'Jamais évalué — situe ton niveau',
      to: quizUrl(r.id),
      cta: 'Passer le test',
      icon: Brain,
    }));

  return priorities.slice(0, 5);
}

export const ProfileBilanSection: React.FC<ProfileBilanSectionProps> = ({
  progressData,
  assessments,
  contributions,
  learningStats,
  isOwner,
  goals,
  editUrl,
  loading = false,
}) => {
  // Le Bilan détaillé n'est montré qu'au propriétaire : le niveau est celui de l'élève connecté.
  const { user } = useAuth();
  const own = profileLevel(user);
  const levelId = own?.id ?? null;
  const levelSlug = own?.slug ?? null;
  const records = useMemo(
    () => buildChapterRecords(progressData.successExercises, progressData.reviewExercises, assessments,
      levelId && levelSlug ? { id: levelId, slug: levelSlug } : null),
    [progressData.successExercises, progressData.reviewExercises, assessments, levelId, levelSlug]
  );

  const priorities = useMemo(() => buildPriorities(records), [records]);

  // Assessed chapters first, then the ones with the most exercise evidence.
  const orderedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      if (!!a.assessment !== !!b.assessment) return a.assessment ? -1 : 1;
      return (b.solved + b.toReview) - (a.solved + a.toReview);
    });
  }, [records]);

  const published = contributions.slice(0, 5);

  if (!isOwner) {
    return <PublicationsCard items={published} isOwner={false} total={contributions.length} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
      {/* ── Mastery, the page's centrepiece ── */}
      <section className="md:col-span-2 fd-card p-5 md:p-6">
        <SectionTitle
          action={
            <Link to="/skill-iq" style={{ fontSize: 12.5, color: '#15633c', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Skill IQ <ArrowRight className="w-3.5 h-3.5 inline" style={{ verticalAlign: '-2px' }} />
            </Link>
          }
        >
          Maîtrise par chapitre
        </SectionTitle>

        {loading ? (
          <SkeletonRows />
        ) : orderedRecords.length === 0 ? (
          <EmptyMastery />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {orderedRecords.map((record, i) => (
              <div key={record.id} style={{ borderTop: i === 0 ? 'none' : '1px solid #f2f1ee' }}>
                <ChapterRow record={record} />
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-col gap-4">
      {/* ── What to do about it ── */}
      <section className="fd-card p-5 md:p-6 flex flex-col flex-1">
        <SectionTitle>À travailler</SectionTitle>

        {loading ? (
          <SkeletonRows rows={3} />
        ) : priorities.length === 0 ? (
          <p style={{ fontSize: 13, color: '#6b6862', lineHeight: 1.6 }}>
            Rien à reprendre pour l'instant. Marque un exercice « à revoir » et il apparaîtra ici.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {priorities.map((p, i) => {
              const Icon = p.icon;
              return (
                <li key={p.key} style={{ borderTop: i === 0 ? 'none' : '1px solid #f2f1ee' }}>
                  <Link
                    to={p.to}
                    className="flex items-start gap-2.5 group"
                    style={{ padding: '11px 0', textDecoration: 'none' }}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#9a958c', marginTop: 2 }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate" style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>
                        {p.chapter}
                      </span>
                      <span className="block" style={{ fontSize: 11.5, color: '#6b6862', marginTop: 1 }}>
                        {p.reason}
                      </span>
                      <span style={{ fontSize: 11.5, color: '#15633c', fontWeight: 600 }}>
                        {p.cta} <ArrowRight className="w-3 h-3 inline" style={{ verticalAlign: '-1px' }} />
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {!loading && (learningStats?.total_viewed ?? 0) > 0 && (
          <p className="mt-auto pt-4" style={{ fontSize: 11.5, color: '#9a958c', borderTop: '1px solid #f2f1ee' }}>
            <span className="fd-nums">{learningStats?.total_viewed}</span> contenus consultés au total
          </p>
        )}
      </section>

      {goals && <GoalsCard goals={goals} editUrl={editUrl} />}
      </div>

      {/* ── What they've put back in ── */}
      <div className="md:col-span-3">
        <PublicationsCard items={published} isOwner total={contributions.length} />
      </div>
    </div>
  );
};

export const PublicationsCard: React.FC<{ items: PublishedItem[]; isOwner: boolean; total: number }> = ({ items, isOwner, total }) => (
  <section className="fd-card p-5 md:p-6">
    <SectionTitle
      action={
        total > items.length ? (
          <span style={{ fontSize: 12.5, color: '#9a958c' }} className="fd-nums">{items.length} sur {total}</span>
        ) : undefined
      }
    >
      {isOwner ? 'Mes publications' : 'Publications'}
    </SectionTitle>

    {items.length === 0 ? (
      <p style={{ fontSize: 13, color: '#6b6862', lineHeight: 1.6 }}>
        {isOwner
          ? "Tu n'as rien publié pour l'instant. Proposer un exercice ou une leçon est le meilleur moyen de vérifier que tu maîtrises un chapitre."
          : "Cet utilisateur n'a rien publié pour l'instant."}
      </p>
    ) : (
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {items.map((item, i) => (
          <li key={item.id} style={{ borderTop: i === 0 ? 'none' : '1px solid #f2f1ee' }}>
            <Link
              to={`/${item.type === 'lesson' ? 'lessons' : item.type === 'exam' ? 'exams' : 'exercises'}/${item.id}`}
              className="flex items-center justify-between gap-4"
              style={{ padding: '11px 0', textDecoration: 'none' }}
            >
              <span className="min-w-0">
                <span className="block truncate" style={{ fontSize: 13.5, fontWeight: 500, color: '#1a1a1a' }}>
                  {item.title}
                </span>
                <span className="block" style={{ fontSize: 11.5, color: '#9a958c', marginTop: 2 }}>
                  {item.subject?.name}
                  {item.chapters?.[0]?.name ? ` · ${item.chapters[0].name}` : ''}
                </span>
              </span>
              <span className="flex items-center gap-4 flex-shrink-0 fd-nums" style={{ fontSize: 12, color: '#6b6862' }}>
                <span title="Votes">▲ {item.vote_count ?? 0}</span>
                <span title="Vues">{item.view_count ?? 0} vue{(item.view_count ?? 0) > 1 ? 's' : ''}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    )}
  </section>
);

/** Moyenne actuelle → objectif, sur l'échelle 0–20 : le chemin qui reste, sans rien inventer. */
export const GoalsCard: React.FC<{ goals: NonNullable<ProfileBilanSectionProps['goals']>; editUrl?: string }> = ({ goals, editUrl }) => (
  <section className="fd-card p-5 md:p-6">
    <SectionTitle
      action={editUrl ? (
        <Link to={`${editUrl}#objectifs`} style={{ fontSize: 12.5, color: '#15633c', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          {goals.length ? 'Modifier' : 'Fixer'}
        </Link>
      ) : undefined}
    >
      Mes objectifs
    </SectionTitle>
    {goals.length === 0 ? (
      <p className="flex items-start gap-2" style={{ fontSize: 13, color: '#6b6862', lineHeight: 1.6 }}>
        <Target className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#9a958c', marginTop: 3 }} />
        Note ta moyenne actuelle et celle que tu vises : tu verras le chemin qui reste.
      </p>
    ) : (
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {goals.map(g => {
          const now = Number(g.min_grade), target = Number(g.max_grade);
          const lo = Math.min(now, target), hi = Math.max(now, target);
          return (
            <li key={String(g.subject)}>
              <div className="flex items-baseline justify-between gap-3" style={{ marginBottom: 6 }}>
                <span className="truncate" style={{ fontSize: 13.5, fontWeight: 500, color: '#1a1a1a' }}>{g.subject_name ?? 'Matière'}</span>
                <span className="fd-nums flex-shrink-0" style={{ fontSize: 12, color: '#6b6862' }}>
                  {now.toLocaleString('fr-FR')} → <strong style={{ color: '#15633c' }}>{target.toLocaleString('fr-FR')}</strong>/20
                </span>
              </div>
              <div style={{ position: 'relative', height: 6, borderRadius: 99, background: '#f2f1ee' }} aria-hidden>
                <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${(lo / 20) * 100}%`, borderRadius: 99, background: '#d8d4cc' }} />
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${(lo / 20) * 100}%`, width: `${((hi - lo) / 20) * 100}%`, borderRadius: 99, background: '#1a7a4a' }} />
              </div>
            </li>
          );
        })}
      </ul>
    )}
  </section>
);

const EmptyMastery: React.FC = () => (
  <div style={{ padding: '8px 0 4px' }}>
    <p style={{ fontSize: 13.5, color: '#33302b', lineHeight: 1.65, marginBottom: 14, maxWidth: 460 }}>
      Ton bilan est encore vide. Il se remplit de deux façons : un test Skill IQ situe ton niveau sur un
      chapitre, et chaque exercice que tu marques <strong style={{ fontWeight: 600 }}>réussi</strong> ou{' '}
      <strong style={{ fontWeight: 600 }}>à revoir</strong> affine la mesure.
    </p>
    <div className="flex items-center gap-2.5 flex-wrap">
      <Link to="/skill-iq" className="fd-btn-primary" style={{ textDecoration: 'none' }}>
        <Brain className="w-3.5 h-3.5" /> Passer un test
      </Link>
      <Link to="/exercises" className="fd-btn-ghost" style={{ textDecoration: 'none' }}>
        Parcourir les exercices
      </Link>
    </div>
  </div>
);

const SkeletonRows: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i}>
        <div className="animate-pulse" style={{ height: 10, width: `${45 + ((i * 13) % 35)}%`, background: '#f2f1ee', borderRadius: 4, marginBottom: 8 }} />
        <div className="animate-pulse" style={{ height: 6, background: '#f7f6f3', borderRadius: 99 }} />
      </div>
    ))}
  </div>
);

export default ProfileBilanSection;

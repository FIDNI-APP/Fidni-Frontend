import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Users, Hash, Copy, Check, RefreshCw, BookOpen, Plus,
  Trash2, Loader2, X, ClipboardList, GraduationCap, Calendar,
  ChevronRight, FileText, Flag, Sparkles,
} from 'lucide-react';
import { SEO } from '@/components/layout/SEO';
import { useAuth } from '@/contexts/AuthContext';
import {
  getClassroom, regenerateJoinCode, getMembers, removeMember,
  addSubject, removeSubject,
  listTDLists, createTDList, deleteTDList, addTDListItem, removeTDListItem,
  getRosterStats, getStudentStats, getTDSuivi, classroomError, errorStatus,
  type Classroom, type ClassroomMember, type TDList, type TDSuivi, type TDSuiviCell,
  type RosterStudentCard, type StudentSkillStats, type SkillAxes,
} from '@/lib/api/classroomApi';
import { getSubjects } from '@/lib/api/hierarchyApi';
import { getExercises } from '@/lib/api';
import { getDifficultyLabel, type Difficulty } from '@/lib/utils/difficultyHelpers';
import type { SubjectModel, Content as ContentT } from '@/types';

type Tab = 'students' | 'tdlists' | 'subjects';
type LoadState = 'loading' | 'ok' | 'error';

/** Sous ce score global, le prof voit le repère « À suivre » (plus de paliers or / argent / bronze). */
const WATCH_BELOW = 40;

const AXIS_LABELS: { key: keyof SkillAxes; label: string; short: string }[] = [
  { key: 'precision',    label: 'Précision',    short: 'PRÉ' },
  { key: 'regularite',   label: 'Régularité',   short: 'RÉG' },
  { key: 'vitesse',      label: 'Vitesse',      short: 'VIT' },
  { key: 'difficulte',   label: 'Difficulté',   short: 'DIF' },
  { key: 'perseverance', label: 'Persévérance', short: 'PER' },
  { key: 'engagement',   label: 'Engagement',   short: 'ENG' },
];

const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);

/** « 12/28 élèves ont fini ». */
const finishedLabel = (finished: number, total: number) =>
  `${finished}/${total} ${plural(finished, 'élève a', 'élèves ont')} fini`;

const difficultyFr = (d: string | null | undefined) =>
  (d === 'easy' || d === 'medium' || d === 'hard' ? getDifficultyLabel(d as Difficulty) : null);

export default function ClassroomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabChoice, setTab] = useState<Tab | null>(null);

  // tab data
  const [members, setMembers] = useState<ClassroomMember[]>([]);
  const [tdLists, setTdLists] = useState<TDList[]>([]);
  const [allSubjects, setAllSubjects] = useState<SubjectModel[]>([]);
  const [roster, setRoster] = useState<RosterStudentCard[]>([]);
  const [rosterState, setRosterState] = useState<LoadState>('loading');
  const [activeSubjectId, setActiveSubjectId] = useState<number | null>(null);

  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showCreateTD, setShowCreateTD] = useState(false);
  const [activeStudent, setActiveStudent] = useState<RosterStudentCard | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError('');
      const [c, m, tl, subs] = await Promise.all([
        getClassroom(id),
        getMembers(id).catch(() => []),
        listTDLists(id).catch(() => []),
        getSubjects().catch(() => []),
      ]);
      setClassroom(c);
      setMembers(m);
      setTdLists(tl);
      setAllSubjects(subs);
      setCode(c.join_code);
    } catch (e) {
      console.error(e);
      setError("Impossible de charger la classe.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { refresh(); }, [refresh]);

  const isOwner = !!classroom?.is_owner;
  // Le prof arrive sur ses élèves ; l'élève sur ses TD (il ne voit pas les résultats de ses camarades).
  const tab: Tab = tabChoice ?? (isOwner ? 'students' : 'tdlists');
  const loaded = classroom !== null;

  // Cartes de compétences (le prof : toute la classe ; l'élève : la sienne seulement).
  useEffect(() => {
    if (!id || !loaded || tab !== 'students') return;
    let alive = true;
    setRosterState('loading');
    getRosterStats(id, activeSubjectId)
      .then((r) => { if (alive) { setRoster(r.students); setRosterState('ok'); } })
      .catch((e) => { console.error(e); if (alive) setRosterState('error'); });
    return () => { alive = false; };
  }, [id, loaded, tab, activeSubjectId]);

  // Spinner plein écran au premier chargement seulement : un rafraîchissement (TD modifié…)
  // ne doit pas démonter la page ni fermer la fenêtre ouverte.
  if (loading && !classroom) {
    return (
      <div style={{ minHeight: '100vh', background: '#faf9f7' }} className="flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#1a1a1a' }} />
      </div>
    );
  }
  if (!classroom) {
    return (
      <div style={{ minHeight: '100vh', background: '#faf9f7' }} className="flex items-center justify-center px-4">
        <div className="fd-card p-8 text-center">
          <p style={{ color: '#6b6862', fontSize: 14 }}>{error || 'Classe introuvable.'}</p>
          <Link to="/classrooms" className="fd-btn-primary mt-4 inline-flex"><ArrowLeft className="w-4 h-4" /> Retour</Link>
        </div>
      </div>
    );
  }

  const classroomSubjectOptions = classroom.subjects.map(cs => ({
    id: allSubjects.find(s => s.name === cs.subject_name)?.id,
    name: cs.subject_name,
  })).filter(s => s.id) as { id: string; name: string }[];
  const activeSubject = classroomSubjectOptions.find(s => Number(s.id) === activeSubjectId) || null;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (e) { console.error(e); }
  };

  const regenerate = async () => {
    if (!window.confirm("Régénérer le code ? L'ancien ne fonctionnera plus.")) return;
    setBusy(true);
    try {
      const r = await regenerateJoinCode(classroom.id);
      setCode(r.join_code);
      await refresh();
    } finally { setBusy(false); }
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = isOwner
    ? [
      { key: 'students', label: 'Élèves', icon: <Users className="w-3.5 h-3.5" /> },
      { key: 'tdlists', label: 'TD listes', icon: <ClipboardList className="w-3.5 h-3.5" /> },
      { key: 'subjects', label: 'Matières', icon: <BookOpen className="w-3.5 h-3.5" /> },
    ]
    : [
      { key: 'tdlists', label: 'TD listes', icon: <ClipboardList className="w-3.5 h-3.5" /> },
      { key: 'students', label: 'Mes compétences', icon: <Sparkles className="w-3.5 h-3.5" /> },
      { key: 'subjects', label: 'Matières', icon: <BookOpen className="w-3.5 h-3.5" /> },
    ];

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7' }}>
      <SEO title={`${classroom.name} - Fidni`} description="Détails de la classe" />

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* Header */}
        <div className="mb-5">
          <button onClick={() => navigate('/classrooms')} className="fd-btn-ghost mb-3"
                  style={{ padding: '7px 12px', fontSize: 12 }}>
            <ArrowLeft className="w-3 h-3" /> Mes classes
          </button>

          <div className="fd-card p-4 sm:p-5 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div
                className="inline-flex items-center justify-center flex-shrink-0"
                style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: 'linear-gradient(135deg,#1a1a1a,#9a958c)', color: '#fff',
                  boxShadow: '0 8px 24px rgba(20,18,16,.25)',
                }}
              >
                <GraduationCap className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1a1a1a', letterSpacing: '-0.02em' }}>
                  {classroom.name}
                </h1>
                {/* Le « · » accompagne l'élément qui le suit : il ne reste jamais seul en fin de ligne. */}
                <div className="flex items-center gap-x-2 gap-y-0.5 mt-1 flex-wrap" style={{ fontSize: 12, color: '#6b6862' }}>
                  {classroom.class_level_name && <span>{classroom.class_level_name}</span>}
                  <span className="inline-flex items-center gap-1">
                    {classroom.class_level_name && <span aria-hidden className="mr-1">·</span>}
                    <Users className="w-3 h-3" /> {classroom.student_count} {plural(classroom.student_count, 'élève', 'élèves')}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span aria-hidden className="mr-1">·</span>
                    <BookOpen className="w-3 h-3" /> {classroom.subjects.length} {plural(classroom.subjects.length, 'matière', 'matières')}
                  </span>
                </div>
              </div>
            </div>

            <div
              data-tour="classe-code"
              className="flex items-center gap-3"
              style={{
                background: 'linear-gradient(135deg,#f2f1ee,#faf9f7)',
                border: '1px solid #e7e3dc', borderRadius: 12, padding: '8px 12px',
              }}
            >
              <Hash className="w-4 h-4" style={{ color: '#000000' }} />
              <span style={{ fontFamily: 'DM Mono', fontSize: 18, fontWeight: 800, color: '#000000', letterSpacing: '.12em' }}>
                {code}
              </span>
              <button onClick={copyCode} className="fd-btn-ghost" style={{ padding: '8px 10px', fontSize: 11 }}
                      aria-label="Copier le code" title="Copier le code">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              {isOwner && (
                <button onClick={regenerate} className="fd-btn-ghost" style={{ padding: '8px 10px', fontSize: 11 }} disabled={busy}
                        aria-label="Régénérer le code" title="Régénérer le code">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 flex-wrap mb-5" data-tour="classe-onglets" role="tablist">
          {tabs.map(t => (
            <TabButton key={t.key} active={tab === t.key} onClick={() => setTab(t.key)} icon={t.icon}>
              {t.label}
            </TabButton>
          ))}
        </div>

        {/* Subject filter (visible on Students + TDs tabs) */}
        {tab !== 'subjects' && classroomSubjectOptions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span style={{ fontSize: 11, color: '#6b6862', fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' }}>
              Matière :
            </span>
            <button
              className={`fd-pill ${activeSubjectId === null ? 'is-active' : ''}`}
              style={{ minHeight: 36 }}
              onClick={() => setActiveSubjectId(null)}
            >
              Toutes
            </button>
            {classroomSubjectOptions.map(s => (
              <button
                key={s.id}
                className={`fd-pill ${activeSubjectId === Number(s.id) ? 'is-active' : ''}`}
                style={{ minHeight: 36 }}
                onClick={() => setActiveSubjectId(Number(s.id))}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        {/* Tab content */}
        {tab === 'students' && (
          <StudentsTab
            roster={roster}
            state={rosterState}
            onOpen={(s) => setActiveStudent(s)}
            isOwner={isOwner}
            meId={user ? String(user.id) : null}
          />
        )}
        {tab === 'tdlists' && (
          <TDListsTab
            classroomId={classroom.id}
            isOwner={isOwner}
            tdLists={tdLists}
            activeSubject={activeSubject ? { id: Number(activeSubject.id), name: activeSubject.name } : null}
            onCreateClick={() => setShowCreateTD(true)}
            onChanged={refresh}
          />
        )}
        {tab === 'subjects' && (
          <SubjectsTab
            classroom={classroom}
            allSubjects={allSubjects}
            onChanged={refresh}
            isOwner={isOwner}
            members={members}
            onRemoveMember={async (sid) => {
              if (window.confirm('Retirer cet élève ?')) {
                await removeMember(classroom.id, sid);
                await refresh();
              }
            }}
          />
        )}
      </div>

      {/* Modals */}
      {showCreateTD && (
        <CreateTDModal
          classroomId={classroom.id}
          subjects={classroomSubjectOptions}
          onClose={() => setShowCreateTD(false)}
          onCreated={async () => { setShowCreateTD(false); await refresh(); }}
        />
      )}

      {activeStudent && (
        <StudentStatsModal
          classroomId={classroom.id}
          student={activeStudent}
          isSelf={!isOwner}
          subjectOptions={classroomSubjectOptions}
          initialSubjectId={activeSubjectId}
          onClose={() => setActiveStudent(null)}
        />
      )}
    </div>
  );
}

/* ─────────────────── Tabs ─────────────────── */
function TabButton({ active, onClick, icon, children }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      role="tab"
      aria-selected={active}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        minHeight: 38, padding: '8px 16px', borderRadius: 99, border: 'none',
        background: active ? '#1a1a1a' : '#fff',
        color: active ? '#fff' : '#6b6862',
        fontSize: 13, fontWeight: active ? 700 : 500,
        fontFamily: 'DM Sans', cursor: 'pointer',
        boxShadow: active ? '0 6px 20px rgba(20,18,16,.25)' : '0 2px 6px rgba(20,18,16,.05)',
        transition: 'all .18s',
      }}
    >
      {icon} {children}
    </button>
  );
}

/* ─────────────────── shared bits ─────────────────── */
function Avatar({ user, size }: { user: { username: string; avatar?: string | null }; size: number }) {
  if (user.avatar) {
    return <img src={user.avatar} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  }
  return (
    <div
      className="inline-flex items-center justify-center flex-shrink-0"
      style={{
        width: size, height: size, borderRadius: '50%',
        background: 'linear-gradient(135deg,#1a1a1a,#9a958c)', color: '#fff',
        fontSize: Math.round(size * 0.38), fontWeight: 700,
      }}
    >
      {user.username[0]?.toUpperCase()}
    </div>
  );
}

/** Fenêtre par-dessus la page : clic à côté ou Échap pour fermer. */
function Modal({ label, maxWidth, onClose, children }: {
  label: string; maxWidth: number; onClose: () => void; children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(20,18,16,.45)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12,
        animation: 'fadeIn .15s ease',
      }}
      onClick={onClose}
    >
      <div
        className="fd-card animate-fade-up p-4 sm:p-6"
        style={{ width: '100%', maxWidth, maxHeight: '92vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Fermer"
      className="inline-flex items-center justify-center flex-shrink-0"
      style={{ width: 36, height: 36, background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b6862' }}
    >
      <X className="w-5 h-5" />
    </button>
  );
}

const sectionTitle: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: '#6b6862', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8,
};

/* ─────────────────── Students tab ─────────────────── */
function StudentsTab({ roster, state, onOpen, isOwner, meId }: {
  roster: RosterStudentCard[];
  state: LoadState;
  onOpen: (s: RosterStudentCard) => void;
  isOwner: boolean;
  meId: string | null;
}) {
  if (state === 'loading') {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#1a1a1a' }} />
      </div>
    );
  }
  if (state === 'error') {
    return (
      <div className="fd-card text-center" style={{ padding: 40 }}>
        <p style={{ fontSize: 13, color: '#6b6862' }}>Impossible de charger les compétences pour le moment. Réessaie plus tard.</p>
      </div>
    );
  }

  // L'élève ne voit que sa propre carte : jamais celles de ses camarades.
  if (!isOwner) {
    const mine = roster.find(c => String(c.student.id) === meId) || null;
    return (
      <div style={{ maxWidth: 440 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a' }}>Mes compétences</h2>
        <p style={{ fontSize: 12, color: '#6b6862', marginTop: 2, marginBottom: 12 }}>
          Calculées à partir de ton travail sur Fidni. Tes camarades ne les voient pas. Touche ta carte pour le détail.
        </p>
        {mine ? (
          <SkillCard card={mine} onClick={() => onOpen(mine)} />
        ) : (
          <div className="fd-card text-center" style={{ padding: 32 }}>
            <p style={{ fontSize: 13, color: '#6b6862' }}>Fais quelques exercices pour voir apparaître tes compétences.</p>
          </div>
        )}
      </div>
    );
  }

  if (roster.length === 0) {
    return (
      <div className="fd-card text-center" style={{ padding: 48 }}>
        <Users className="w-10 h-10 mx-auto mb-3" style={{ color: '#6b6862' }} />
        <p style={{ fontSize: 13, color: '#6b6862' }}>Partage le code de la classe pour que tes élèves la rejoignent.</p>
      </div>
    );
  }
  const toWatch = roster.filter(c => c.overall < WATCH_BELOW).length;
  return (
    <>
      <p style={{ fontSize: 12, color: '#6b6862', marginBottom: 12 }}>
        {roster.length} {plural(roster.length, 'élève', 'élèves')}
        {toWatch > 0 && <> · <strong style={{ color: '#92400e' }}>{toWatch} à suivre</strong> (score global sous {WATCH_BELOW})</>}
        . Touche une carte pour le détail.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {roster.map(card => (
          <SkillCard key={card.student.id} card={card} watch onClick={() => onOpen(card)} />
        ))}
      </div>
    </>
  );
}

/* ─────────────────── Skill card (neutre : pas de palier) ─────────────────── */
function SkillCard({ card, onClick, watch = false }: {
  card: RosterStudentCard; onClick: () => void;
  /** Vue du prof : repère « À suivre » sous WATCH_BELOW. */
  watch?: boolean;
}) {
  const flagged = watch && card.overall < WATCH_BELOW;
  return (
    <button
      onClick={onClick}
      className="fd-card text-left w-full"
      style={{ cursor: 'pointer', padding: 0, overflow: 'hidden', background: '#fff' }}
    >
      <div className="flex items-center gap-3" style={{ padding: '14px 16px', borderBottom: '1px solid #efece6' }}>
        <Avatar user={card.student} size={44} />
        <div className="flex-1 min-w-0">
          <div className="truncate" style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.01em' }}>
            {card.student.username}
          </div>
          {flagged ? (
            <span
              className="inline-flex items-center gap-1"
              style={{
                marginTop: 3, fontSize: 10, fontWeight: 700, color: '#92400e',
                background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 99, padding: '1px 8px',
              }}
            >
              <Flag className="w-3 h-3" /> À suivre
            </span>
          ) : (
            <div style={{ fontSize: 11, color: '#6b6862', marginTop: 1 }}>Score global</div>
          )}
        </div>
        <div style={{ fontSize: 30, fontWeight: 800, fontFamily: 'DM Mono', color: '#1a1a1a', lineHeight: 1, letterSpacing: '-0.04em' }}>
          {card.overall}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-y-2 gap-x-3" style={{ padding: '12px 16px' }}>
        {AXIS_LABELS.map(a => (
          <div key={a.key} className="flex items-center gap-1.5" title={a.label}>
            <span style={{ fontSize: 12, fontWeight: 800, fontFamily: 'DM Mono', color: '#1a1a1a', minWidth: 20 }}>
              {card.axes[a.key]}
            </span>
            <span style={{ fontSize: 10, color: '#6b6862', fontWeight: 600, letterSpacing: '.04em' }}>{a.short}</span>
          </div>
        ))}
      </div>
    </button>
  );
}

/* ─────────────────── Student stats modal (radar) ─────────────────── */
function StudentStatsModal({ classroomId, student, isSelf, subjectOptions, initialSubjectId, onClose }: {
  classroomId: number; student: RosterStudentCard;
  /** L'élève regarde ses propres statistiques. */
  isSelf: boolean;
  subjectOptions: { id: string; name: string }[];
  initialSubjectId: number | null; onClose: () => void;
}) {
  const [subjectId, setSubjectId] = useState<number | null>(initialSubjectId);
  const [data, setData] = useState<StudentSkillStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    getStudentStats(classroomId, { studentId: student.student.id, subjectId })
      .then((d) => { if (alive) setData(d); })
      .catch((e) => {
        if (!alive) return;
        setData(null);
        setError(errorStatus(e) === 403
          ? 'Tu ne peux voir que tes statistiques.'
          : 'Impossible de charger les statistiques. Réessaie plus tard.');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [classroomId, student.student.id, subjectId]);

  return (
    <Modal label={isSelf ? 'Mes statistiques' : `Statistiques de ${student.student.username}`} maxWidth={540} onClose={onClose}>
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar user={student.student} size={40} />
          <div className="min-w-0">
            <h3 className="truncate" style={{ fontSize: 16, fontWeight: 800, color: '#1a1a1a' }}>
              {isSelf ? 'Mes compétences' : student.student.username}
            </h3>
            <p style={{ fontSize: 11, color: '#6b6862' }}>Statistiques de compétences</p>
          </div>
        </div>
        <CloseButton onClick={onClose} />
      </div>

      {/* Subject pills */}
      {subjectOptions.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <button
            className={`fd-pill ${subjectId === null ? 'is-active' : ''}`}
            style={{ minHeight: 36 }}
            onClick={() => setSubjectId(null)}
          >
            Toutes matières
          </button>
          {subjectOptions.map(s => (
            <button
              key={s.id}
              className={`fd-pill ${subjectId === Number(s.id) ? 'is-active' : ''}`}
              style={{ minHeight: 36 }}
              onClick={() => setSubjectId(Number(s.id))}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#1a1a1a' }} />
        </div>
      ) : error || !data ? (
        <div className="text-center" style={{ padding: '32px 12px' }}>
          <p style={{ fontSize: 13, color: '#6b6862' }}>{error || 'Aucune statistique pour le moment.'}</p>
          <button className="fd-btn-ghost mt-4" onClick={onClose}>Fermer</button>
        </div>
      ) : (
        <>
          <div
            className="text-center mb-4"
            style={{
              background: 'linear-gradient(135deg,#f2f1ee,#faf9f7)',
              borderRadius: 14, border: '1px solid #e7e3dc', padding: 14,
            }}
          >
            <div style={{ fontSize: 11, color: '#6b6862', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Score global {data.subject ? `· ${data.subject.name}` : ''}
            </div>
            <div style={{ fontSize: 44, fontWeight: 900, fontFamily: 'DM Mono', color: '#000000', letterSpacing: '-0.04em', lineHeight: 1, marginTop: 4 }}>
              {data.overall}
            </div>
          </div>

          <RadarChart axes={data.axes} />

          <div className="grid grid-cols-2 gap-2 mt-4">
            {AXIS_LABELS.map(a => (
              <div
                key={a.key}
                className="flex items-center justify-between"
                style={{
                  background: '#f9f8ff', border: '1px solid #e7e3dc',
                  borderRadius: 10, padding: '8px 12px',
                }}
              >
                <span style={{ fontSize: 12, color: '#33302b', fontWeight: 600 }}>{a.label}</span>
                <span style={{ fontSize: 14, fontWeight: 800, fontFamily: 'DM Mono', color: '#000000' }}>
                  {data.axes[a.key]}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}

function RadarChart({ axes }: { axes: SkillAxes }) {
  const size = 280;
  const cx = size / 2, cy = size / 2;
  const radius = 100;
  const n = AXIS_LABELS.length;

  const angleFor = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / n;
  const point = (i: number, value: number) => {
    const r = (value / 100) * radius;
    const a = angleFor(i);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  };

  const ringPath = (frac: number) => {
    return AXIS_LABELS.map((_, i) => {
      const r = radius * frac;
      const a = angleFor(i);
      return `${i === 0 ? 'M' : 'L'}${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    }).join(' ') + ' Z';
  };

  const polygon = AXIS_LABELS.map((a, i) => {
    const [x, y] = point(i, axes[a.key]);
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ') + ' Z';

  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', maxWidth: 360, height: 'auto', display: 'block', margin: '0 auto' }}>
      <defs>
        <radialGradient id="radarFill">
          <stop offset="0%" stopColor="#9a958c" stopOpacity=".5" />
          <stop offset="100%" stopColor="#1a1a1a" stopOpacity=".15" />
        </radialGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((f, idx) => (
        <path key={idx} d={ringPath(f)} fill="none" stroke="#e8e5f8" strokeWidth="1" strokeDasharray={idx === 3 ? undefined : '3,4'} />
      ))}
      {AXIS_LABELS.map((_, i) => {
        const a = angleFor(i);
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={cx + radius * Math.cos(a)} y2={cy + radius * Math.sin(a)}
            stroke="#e7e3dc" strokeWidth="1"
          />
        );
      })}
      <path d={polygon} fill="url(#radarFill)" stroke="#1a1a1a" strokeWidth="2" strokeLinejoin="round" />
      {AXIS_LABELS.map((label, i) => {
        const [x, y] = point(i, axes[label.key]);
        return <circle key={label.key} cx={x} cy={y} r="3.5" fill="#1a1a1a" stroke="#fff" strokeWidth="2" />;
      })}
      {AXIS_LABELS.map((label, i) => {
        const a = angleFor(i);
        const r = radius + 18;
        const tx = cx + r * Math.cos(a);
        const ty = cy + r * Math.sin(a);
        return (
          <text
            key={label.key}
            x={tx} y={ty} textAnchor="middle" dominantBaseline="middle"
            fontSize="10" fontWeight="700" fontFamily="DM Sans" fill="#33302b"
          >
            {label.short}
          </text>
        );
      })}
    </svg>
  );
}

/* ─────────────────── TD lists tab ─────────────────── */
function TDListsTab({
  classroomId, isOwner, tdLists, activeSubject, onCreateClick, onChanged,
}: {
  classroomId: number; isOwner: boolean;
  tdLists: TDList[];
  /** Matière choisie dans les pastilles « Matière : » (null = toutes). */
  activeSubject: { id: number; name: string } | null;
  onCreateClick: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const active = tdLists.find(t => t.id === activeId) || null;

  // Un TD sans matière vaut pour toutes : il reste affiché quel que soit le filtre.
  const shown = activeSubject
    ? tdLists.filter(td => (td.subject != null
      ? td.subject === activeSubject.id
      : !td.subject_name || td.subject_name === activeSubject.name))
    : tdLists;

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a' }}>
            TD listes <span style={{ color: '#6b6862', fontFamily: 'DM Mono', fontSize: 14, fontWeight: 500, marginLeft: 6 }}>· {shown.length}</span>
          </h2>
          <p style={{ fontSize: 12, color: '#6b6862' }}>
            {isOwner ? 'Les exercices que tu donnes à ta classe' : 'Les exercices donnés par ton enseignant·e'}
          </p>
        </div>
        {isOwner && (
          <button onClick={onCreateClick} className="fd-btn-primary">
            <Plus className="w-4 h-4" /> Nouveau TD
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="fd-card text-center" style={{ padding: 48 }}>
          <ClipboardList className="w-10 h-10 mx-auto mb-3" style={{ color: '#6b6862' }} />
          <p style={{ fontSize: 13, color: '#6b6862' }}>
            {tdLists.length > 0 && activeSubject
              ? `Aucun TD en ${activeSubject.name}.`
              : isOwner ? "Crée un TD pour assigner des exercices à tes élèves." : "Aucun TD pour le moment."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {shown.map(td => (
            <TDListCard key={td.id} td={td} isOwner={isOwner} onOpen={() => setActiveId(td.id)} />
          ))}
        </div>
      )}

      {active && (
        <TDListDetailModal
          classroomId={classroomId}
          td={active}
          isOwner={isOwner}
          onClose={() => setActiveId(null)}
          onChanged={onChanged}
        />
      )}
    </>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div style={{ height: 6, borderRadius: 99, background: '#f2f1ee', overflow: 'hidden' }}>
      <div
        style={{
          height: '100%',
          width: `${pct}%`,
          background: pct === 100 ? 'linear-gradient(90deg,#16a34a,#34d399)' : 'linear-gradient(90deg,#1a1a1a,#9a958c)',
          transition: 'width .4s ease',
        }}
      />
    </div>
  );
}

function TDListCard({ td, isOwner, onOpen }: { td: TDList; isOwner: boolean; onOpen: () => void }) {
  const due = td.due_date ? new Date(td.due_date) : null;
  // Le prof voit l'avancement de sa classe ; l'élève, le sien.
  const cls = isOwner ? td.class_progress : null;
  const mine = !isOwner ? td.progress : null;
  const pct = cls
    ? (cls.total > 0 ? Math.round((cls.finished * 100) / cls.total) : 0)
    : mine && mine.total > 0 ? Math.round((mine.completed * 100) / mine.total) : 0;
  return (
    <button
      onClick={onOpen}
      className="fd-card text-left"
      style={{ padding: 18, cursor: 'pointer', background: '#fff' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="inline-flex items-center justify-center flex-shrink-0"
            style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'linear-gradient(135deg,#1a1a1a,#9a958c)', color: '#fff',
            }}
          >
            <ClipboardList className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.01em' }}>{td.title}</div>
            {td.subject_name && (
              <div style={{ fontSize: 10, color: '#6b6862', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                {td.subject_name}
              </div>
            )}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#6b6862' }} />
      </div>

      <div className="flex items-center gap-3 mt-3" style={{ fontSize: 11, color: '#6b6862' }}>
        <span className="inline-flex items-center gap-1"><FileText className="w-3 h-3" />{td.item_count} ex.</span>
        {due && <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />à rendre le {due.toLocaleDateString('fr-FR')}</span>}
      </div>

      {cls && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1" style={{ fontSize: 11, color: '#6b6862' }}>
            <span>{cls.total === 0 ? 'Aucun élève dans la classe' : finishedLabel(cls.finished, cls.total)}</span>
            {cls.total > 0 && (
              <span style={{ fontFamily: 'DM Mono', fontWeight: 700, color: pct === 100 ? '#15803d' : '#000000' }}>{pct} %</span>
            )}
          </div>
          <ProgressBar pct={pct} />
        </div>
      )}
      {mine && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1" style={{ fontSize: 11, color: '#6b6862' }}>
            <span>Ma progression</span>
            <span style={{ fontFamily: 'DM Mono', fontWeight: 700, color: pct === 100 ? '#15803d' : '#000000' }}>
              {mine.completed}/{mine.total}
            </span>
          </div>
          <ProgressBar pct={pct} />
        </div>
      )}
    </button>
  );
}

function TDListDetailModal({ classroomId, td, isOwner, onClose, onChanged }: {
  classroomId: number; td: TDList; isOwner: boolean;
  onClose: () => void; onChanged: () => Promise<void> | void;
}) {
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ContentT[]>([]);
  const [busy, setBusy] = useState(false);

  const doSearch = async (q: string) => {
    setSearch(q);
    if (!q.trim()) { setResults([]); return; }
    try {
      setSearching(true);
      const r = await getExercises({ search: q, per_page: 8 });
      setResults(r.results || []);
    } finally { setSearching(false); }
  };

  const add = async (id: string | number) => {
    setBusy(true);
    try { await addTDListItem(classroomId, td.id, id); await onChanged(); }
    catch (e) { alert(classroomError(e, "Impossible d'ajouter cet exercice.")); }
    finally { setBusy(false); }
  };

  const remove = async (itemId: number) => {
    if (!window.confirm('Retirer cet exercice du TD ?')) return;
    setBusy(true);
    try { await removeTDListItem(classroomId, td.id, itemId); await onChanged(); }
    finally { setBusy(false); }
  };

  return (
    <Modal label={td.title} maxWidth={isOwner ? 880 : 640} onClose={onClose}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a', letterSpacing: '-0.02em' }}>
            {td.title}
          </h3>
          {td.description && <p style={{ fontSize: 12, color: '#6b6862', marginTop: 4 }}>{td.description}</p>}
          <div className="flex items-center gap-2 mt-2 flex-wrap" style={{ fontSize: 11, color: '#6b6862' }}>
            {[
              td.subject_name,
              td.due_date ? `à rendre le ${new Date(td.due_date).toLocaleDateString('fr-FR')}` : null,
              td.created_by_username ? `par ${td.created_by_username}` : null,
            ].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isOwner && (
            <button
              onClick={async () => {
                if (window.confirm('Supprimer ce TD ?')) {
                  await deleteTDList(classroomId, td.id);
                  onClose();
                  await onChanged();
                }
              }}
              aria-label="Supprimer le TD"
              title="Supprimer le TD"
              className="inline-flex items-center justify-center"
              style={{ width: 36, height: 36, background: 'transparent', border: 'none', cursor: 'pointer', color: '#b91c1c' }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <CloseButton onClick={onClose} />
        </div>
      </div>

      {/* Suivi de la classe (prof) */}
      {isOwner && <TDSuiviSection classroomId={classroomId} td={td} />}

      {/* Items */}
      <div className="mb-4 mt-4">
        <h4 style={sectionTitle}>Exercices ({td.items.length})</h4>
        {td.items.length === 0 ? (
          <p style={{ fontSize: 12, color: '#6b6862', fontStyle: 'italic' }}>Aucun exercice.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {td.items.map((item, i) => {
              const diff = difficultyFr(item.content_difficulty);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2"
                  style={{
                    background: '#f9f8ff', border: '1px solid #e7e3dc',
                    borderRadius: 10, padding: '10px 12px',
                  }}
                >
                  <span
                    className="inline-flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 24, height: 24, borderRadius: 7, background: '#fff', border: '1px solid #e7e3dc',
                      fontSize: 11, fontWeight: 800, fontFamily: 'DM Mono', color: '#1a1a1a',
                    }}
                  >
                    {i + 1}
                  </span>
                  <Link
                    to={`/exercises/${item.content_display_id}`}
                    className="flex-1 min-w-0"
                    style={{ textDecoration: 'none' }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }} className="truncate">
                      {item.content_title}
                    </div>
                    <div style={{ fontSize: 10, color: '#6b6862', marginTop: 2 }}>
                      {[`#${item.content_display_id}`, item.content_subject, diff].filter(Boolean).join(' · ')}
                    </div>
                  </Link>
                  {isOwner && (
                    <button
                      onClick={() => remove(item.id)}
                      disabled={busy}
                      aria-label="Retirer du TD"
                      title="Retirer du TD"
                      className="inline-flex items-center justify-center flex-shrink-0"
                      style={{ width: 36, height: 36, background: 'transparent', border: 'none', cursor: 'pointer', color: '#b91c1c' }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add exercises (owner only) */}
      {isOwner && (
        <div>
          <h4 style={sectionTitle}>Ajouter un exercice</h4>
          <input
            value={search}
            onChange={e => doSearch(e.target.value)}
            placeholder="Rechercher un exercice…"
            style={inputStyle}
          />
          {searching && <p style={{ fontSize: 11, color: '#6b6862', marginTop: 6 }}>Recherche…</p>}
          {results.length > 0 && (
            <div className="flex flex-col gap-1 mt-3">
              {results.map(r => {
                const already = td.items.some(i => i.content_id === r.id || i.content_display_id === r.display_id);
                const meta = [r.chapters?.[0]?.name, difficultyFr(r.difficulty)].filter(Boolean).join(' · ');
                return (
                  <button
                    key={r.id}
                    onClick={() => !already && add(r.id)}
                    disabled={already || busy}
                    style={{
                      background: already ? '#f0fdf4' : '#fff',
                      border: '1px solid ' + (already ? '#bbf7d0' : '#e7e3dc'),
                      borderRadius: 10, padding: '8px 12px', cursor: already ? 'default' : 'pointer',
                      textAlign: 'left', minHeight: 40,
                      opacity: already ? .7 : 1,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }} className="truncate">
                      {r.title}
                      {already && <span style={{ marginLeft: 8, fontSize: 10, color: '#15803d' }}>· déjà ajouté</span>}
                    </div>
                    {meta && <div style={{ fontSize: 10, color: '#6b6862', marginTop: 1 }} className="truncate">{meta}</div>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ─────────────────── Suivi d'un TD (prof) : élèves × exercices ─────────────────── */
type CellKind = 'success' | 'review' | 'started' | 'none';

const CELL_STYLE: Record<CellKind, { label: string; bg: string; border: string; color: string; mark: string }> = {
  success: { label: 'Réussi', bg: '#dcfce7', border: '#86efac', color: '#15803d', mark: '✓' },
  review:  { label: 'À revoir', bg: '#fef3c7', border: '#fcd34d', color: '#b45309', mark: '!' },
  started: { label: 'Commencé', bg: '#fff', border: '#a8a39a', color: '#6b6862', mark: '•' },
  none:    { label: 'Pas commencé', bg: 'transparent', border: '#cfcac2', color: '#c4c0b8', mark: '' },
};

const EMPTY_CELL: TDSuiviCell = { status: null, review_questions: 0, at: null };

function cellKind(c: TDSuiviCell): CellKind {
  if (c.status === 'success') return 'success';
  if (c.status === 'review' || c.review_questions > 0) return 'review';
  return c.at ? 'started' : 'none';
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

function cellText(c: TDSuiviCell) {
  const kind = cellKind(c);
  const parts: string[] = [CELL_STYLE[kind].label];
  if (c.review_questions > 0) {
    parts[0] += ` (${c.review_questions} ${plural(c.review_questions, 'question', 'questions')} à revoir)`;
  }
  if (c.at) parts.push(`le ${shortDate(c.at)}`);
  return parts.join(' · ');
}

function Pastille({ kind, size = 24 }: { kind: CellKind; size?: number }) {
  const s = CELL_STYLE[kind];
  return (
    <span
      aria-hidden
      className="inline-flex items-center justify-center"
      style={{
        width: size, height: size, borderRadius: '50%',
        background: s.bg, color: s.color,
        border: `1.5px ${kind === 'none' ? 'dashed' : 'solid'} ${s.border}`,
        fontSize: Math.round(size * 0.5), fontWeight: 800, lineHeight: 1,
      }}
    >
      {s.mark}
    </span>
  );
}

function TDSuiviSection({ classroomId, td }: { classroomId: number; td: TDList }) {
  const [suivi, setSuivi] = useState<TDSuivi | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [picked, setPicked] = useState<{ student: string; n: number; title: string; cell: TDSuiviCell } | null>(null);
  // Recharge quand les exercices du TD changent (ajout / retrait).
  const itemsKey = td.items.map(i => i.id).join(',');

  useEffect(() => {
    let alive = true;
    setState('loading');
    getTDSuivi(classroomId, td.id)
      .then((r) => { if (alive) { setSuivi(r); setState('ok'); } })
      .catch((e) => { console.error(e); if (alive) setState('error'); });
    return () => { alive = false; };
  }, [classroomId, td.id, itemsKey]);

  const box: React.CSSProperties = {
    background: '#fff', border: '1px solid #e7e3dc', borderRadius: 12, padding: 14, marginTop: 14,
  };

  if (state === 'loading') {
    return (
      <div style={box} className="flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#1a1a1a' }} />
      </div>
    );
  }
  if (state === 'error' || !suivi) {
    return (
      <div style={box}>
        <p style={{ fontSize: 12, color: '#6b6862' }}>Le suivi de la classe n'a pas pu être chargé. Réessaie plus tard.</p>
      </div>
    );
  }

  const { students, items, cells, summary, hardest } = suivi;
  const nItems = items.length;
  // Lien vers l'exercice d'une question ratée (même ordre que la liste du TD).
  const displayIdOf = (objectId: number) => {
    const idx = items.findIndex(it => it.object_id === objectId);
    const item = idx >= 0 ? td.items[idx] : undefined;
    return item && item.content_title === items[idx].title ? item.content_display_id : null;
  };

  return (
    <div style={box}>
      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-2">
        <h4 style={{ ...sectionTitle, marginBottom: 0 }}>Suivi de la classe</h4>
        {summary.total > 0 && nItems > 0 && (
          <span style={{ fontSize: 13, fontWeight: 700, color: summary.finished === summary.total ? '#15803d' : '#1a1a1a' }}>
            {finishedLabel(summary.finished, summary.total)}
          </span>
        )}
      </div>

      {students.length === 0 ? (
        <p style={{ fontSize: 12, color: '#6b6862' }}>Aucun élève n'a encore rejoint la classe : partage-leur le code.</p>
      ) : nItems === 0 ? (
        <p style={{ fontSize: 12, color: '#6b6862' }}>Ajoute des exercices pour suivre qui les a faits.</p>
      ) : (
        <>
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch', margin: '0 -4px' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 12 }}>
              <thead>
                <tr>
                  <th
                    scope="col"
                    style={{
                      position: 'sticky', left: 0, zIndex: 1, background: '#fff',
                      textAlign: 'left', padding: '4px 8px 6px 4px', fontSize: 10, color: '#6b6862',
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em',
                    }}
                  >
                    Élève
                  </th>
                  {items.map((it, i) => (
                    <th
                      key={it.object_id}
                      scope="col"
                      title={it.title}
                      style={{ padding: '4px 0 6px', minWidth: 38, textAlign: 'center', fontFamily: 'DM Mono', fontWeight: 800, color: '#1a1a1a' }}
                    >
                      {i + 1}
                    </th>
                  ))}
                  <th scope="col" style={{ padding: '4px 6px 6px 10px', fontSize: 10, color: '#6b6862', fontWeight: 700, textTransform: 'uppercase' }}>
                    Réussis
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => {
                  const name = s.full_name || s.username;
                  const row = cells[String(s.id)] || {};
                  const done = items.filter(it => row[String(it.object_id)]?.status === 'success').length;
                  return (
                    <tr key={s.id}>
                      <th
                        scope="row"
                        style={{
                          position: 'sticky', left: 0, zIndex: 1, background: '#fff',
                          textAlign: 'left', padding: '2px 8px 2px 4px', fontWeight: 600, color: '#1a1a1a',
                          borderTop: '1px solid #f2f1ee',
                        }}
                      >
                        <span className="block truncate" style={{ maxWidth: 140 }} title={s.full_name ? `${s.full_name} (${s.username})` : s.username}>
                          {name}
                        </span>
                      </th>
                      {items.map((it, i) => {
                        const c = row[String(it.object_id)] || EMPTY_CELL;
                        const kind = cellKind(c);
                        const text = `${name} · Ex. ${i + 1} : ${cellText(c)}`;
                        return (
                          <td key={it.object_id} style={{ padding: 0, textAlign: 'center', borderTop: '1px solid #f2f1ee' }}>
                            <button
                              type="button"
                              title={text}
                              aria-label={text}
                              onClick={() => setPicked({ student: name, n: i + 1, title: it.title, cell: c })}
                              className="inline-flex items-center justify-center"
                              style={{ width: 38, height: 38, background: 'transparent', border: 'none', cursor: 'pointer' }}
                            >
                              <Pastille kind={kind} />
                            </button>
                          </td>
                        );
                      })}
                      <td
                        style={{
                          padding: '2px 6px 2px 10px', textAlign: 'center', fontFamily: 'DM Mono', fontWeight: 700,
                          color: done === nItems ? '#15803d' : '#1a1a1a', borderTop: '1px solid #f2f1ee',
                        }}
                      >
                        {done}/{nItems}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Détail de la case touchée (au doigt, pas d'infobulle) */}
          {picked && (
            <p style={{ fontSize: 12, color: '#33302b', marginTop: 8 }}>
              <strong>{picked.student}</strong> · Ex. {picked.n} « {picked.title} » : {cellText(picked.cell)}
            </p>
          )}

          <div className="flex items-center gap-x-4 gap-y-1 flex-wrap mt-3" style={{ fontSize: 11, color: '#6b6862' }}>
            {(['success', 'review', 'started', 'none'] as CellKind[]).map(k => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <Pastille kind={k} size={16} /> {CELL_STYLE[k].label}
              </span>
            ))}
          </div>
        </>
      )}

      {hardest.length > 0 && (
        <div className="mt-4">
          <h5 style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a', marginBottom: 6 }}>Questions les plus ratées</h5>
          <ul className="flex flex-col gap-1.5">
            {hardest.map(h => {
              const n = items.findIndex(it => it.object_id === h.object_id) + 1;
              const displayId = displayIdOf(h.object_id);
              const body = (
                <>
                  <span
                    className="flex-shrink-0"
                    style={{
                      fontFamily: 'DM Mono', fontSize: 11, fontWeight: 800, color: '#b45309',
                      background: '#fef3c7', borderRadius: 6, padding: '2px 7px',
                    }}
                  >
                    {n > 0 ? `Ex. ${n} · ` : ''}{h.label}
                  </span>
                  <span className="flex-1 min-w-0 truncate" style={{ color: '#33302b' }}>{h.title}</span>
                  <span className="flex-shrink-0" style={{ color: '#6b6862' }}>
                    {h.review_count} {plural(h.review_count, 'élève', 'élèves')}
                  </span>
                </>
              );
              return (
                <li key={`${h.object_id}-${h.question_path}`} style={{ fontSize: 12 }}>
                  {displayId ? (
                    <Link to={`/exercises/${displayId}`} className="flex items-center gap-2" style={{ textDecoration: 'none', minHeight: 32 }}>
                      {body}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2" style={{ minHeight: 32 }}>{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function CreateTDModal({ classroomId, subjects, onClose, onCreated }: {
  classroomId: number;
  subjects: { id: string; name: string }[];
  onClose: () => void; onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      setBusy(true); setErr('');
      await createTDList(classroomId, {
        title: title.trim(),
        description: description.trim(),
        subject_id: subjectId ? Number(subjectId) : null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
      });
      onCreated();
    } catch (e) {
      setErr(classroomError(e, "Impossible de créer le TD."));
    } finally { setBusy(false); }
  };

  return (
    <Modal label="Nouveau TD" maxWidth={480} onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a' }}>Nouveau TD</h3>
        <CloseButton onClick={onClose} />
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Titre">
          <input value={title} onChange={e => setTitle(e.target.value)} required autoFocus
                 placeholder="Ex. Révisions chapitre 3" style={inputStyle} />
        </Field>
        <Field label="Description (facultatif)">
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }} />
        </Field>
        <Field label="Matière">
          <select value={subjectId} onChange={e => setSubjectId(e.target.value)} style={inputStyle}>
            <option value="">Toutes matières</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Échéance (facultatif)">
          <input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inputStyle} />
        </Field>
        {err && <p style={{ fontSize: 12, color: '#b91c1c' }}>{err}</p>}
        <div className="flex justify-end gap-2 mt-2">
          <button type="button" className="fd-btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" className="fd-btn-primary" disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Créer
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ─────────────────── Subjects + members tab ─────────────────── */
function SubjectsTab({ classroom, allSubjects, onChanged, isOwner, members, onRemoveMember }: {
  classroom: Classroom;
  allSubjects: SubjectModel[];
  onChanged: () => Promise<void> | void;
  isOwner: boolean;
  members: ClassroomMember[];
  onRemoveMember: (sid: number) => void;
}) {
  const [newSubjectId, setNewSubjectId] = useState('');
  const availableSubjects = allSubjects.filter(s => !classroom.subjects.some(cs => cs.subject_name === s.name));

  const addS = async () => {
    if (!newSubjectId) return;
    try { await addSubject(classroom.id, { subject_id: Number(newSubjectId) }); setNewSubjectId(''); await onChanged(); }
    catch (e) { alert(classroomError(e, "Impossible d'ajouter cette matière.")); }
  };

  return (
    // La liste des élèves (et leurs e-mails) est réservée au prof.
    <div className={isOwner ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : 'max-w-xl'}>
      <div className="fd-card p-5">
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 }}>Matières</h3>
        {classroom.subjects.length === 0 ? (
          <p style={{ fontSize: 12, color: '#6b6862', fontStyle: 'italic' }}>Aucune matière.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {classroom.subjects.map(cs => (
              <div key={cs.id}
                   className="flex items-center justify-between"
                   style={{ background: '#f9f8ff', border: '1px solid #e7e3dc', borderRadius: 10, padding: '8px 12px' }}>
                <div className="flex items-center gap-2 min-w-0">
                  <BookOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#000000' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{cs.subject_name}</span>
                  <span className="truncate" style={{ fontSize: 11, color: '#6b6862' }}>· {cs.teacher_username}</span>
                </div>
                {isOwner && (
                  <button onClick={async () => { await removeSubject(classroom.id, cs.id); await onChanged(); }}
                          aria-label="Retirer la matière"
                          className="inline-flex items-center justify-center flex-shrink-0"
                          style={{ width: 36, height: 36, background: 'transparent', border: 'none', cursor: 'pointer', color: '#b91c1c' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {isOwner && availableSubjects.length > 0 && (
          <div className="flex items-center gap-2 mt-3">
            <select value={newSubjectId} onChange={e => setNewSubjectId(e.target.value)} style={{ ...inputStyle, padding: '8px 10px', flex: 1 }}>
              <option value="">Ajouter une matière…</option>
              {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button onClick={addS} className="fd-btn-primary" disabled={!newSubjectId}>
              <Plus className="w-3 h-3" /> Ajouter
            </button>
          </div>
        )}
      </div>

      {isOwner && (
        <div className="fd-card p-5">
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 }}>
            Élèves ({members.length})
          </h3>
          {members.length === 0 ? (
            <p style={{ fontSize: 12, color: '#6b6862', fontStyle: 'italic' }}>Aucun élève n'a rejoint.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
              {members.map(m => (
                <div key={m.id}
                     className="flex items-center gap-3"
                     style={{ background: '#f9f8ff', border: '1px solid #e7e3dc', borderRadius: 10, padding: '8px 12px' }}>
                  <Avatar user={m.student} size={28} />
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{m.student.username}</div>
                    {m.student.email && <div className="truncate" style={{ fontSize: 10, color: '#6b6862' }}>{m.student.email}</div>}
                  </div>
                  <button onClick={() => onRemoveMember(m.student.id)}
                          aria-label={`Retirer ${m.student.username}`}
                          className="inline-flex items-center justify-center flex-shrink-0"
                          style={{ width: 36, height: 36, background: 'transparent', border: 'none', cursor: 'pointer', color: '#b91c1c' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────── shared ─────────────────── */
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid #e7e3dc',
  borderRadius: 10,
  fontSize: 13,
  fontFamily: 'DM Sans',
  color: '#1a1a1a',
  background: '#f9f8ff',
  outline: 'none',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, color: '#6b6862', fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
}

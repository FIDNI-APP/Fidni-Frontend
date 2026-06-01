import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Users, Hash, Copy, Check, RefreshCw, BookOpen, Plus,
  Trash2, Loader2, X, ClipboardList, GraduationCap, Calendar,
  ChevronRight, FileText,
} from 'lucide-react';
import { SEO } from '@/components/layout/SEO';
import {
  getClassroom, regenerateJoinCode, getMembers, removeMember,
  addSubject, removeSubject,
  listTDLists, createTDList, deleteTDList, addTDListItem, removeTDListItem,
  getRosterStats, getStudentStats,
  type Classroom, type ClassroomMember, type TDList,
  type RosterStudentCard, type StudentSkillStats, type SkillAxes,
} from '@/lib/api/classroomApi';
import { getSubjects } from '@/lib/api/hierarchyApi';
import { getExercises } from '@/lib/api';
import type { SubjectModel, Content as ContentT } from '@/types';

type Tab = 'students' | 'tdlists' | 'subjects';

const AXIS_LABELS: { key: keyof SkillAxes; label: string; short: string }[] = [
  { key: 'precision',    label: 'Précision',    short: 'PRÉ' },
  { key: 'regularite',   label: 'Régularité',   short: 'RÉG' },
  { key: 'vitesse',      label: 'Vitesse',      short: 'VIT' },
  { key: 'difficulte',   label: 'Difficulté',   short: 'DIF' },
  { key: 'perseverance', label: 'Persévérance', short: 'PER' },
  { key: 'engagement',   label: 'Engagement',   short: 'ENG' },
];

export default function ClassroomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('students');

  // tab data
  const [members, setMembers] = useState<ClassroomMember[]>([]);
  const [tdLists, setTdLists] = useState<TDList[]>([]);
  const [allSubjects, setAllSubjects] = useState<SubjectModel[]>([]);
  const [roster, setRoster] = useState<RosterStudentCard[]>([]);
  const [activeSubjectId, setActiveSubjectId] = useState<number | null>(null);

  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showCreateTD, setShowCreateTD] = useState(false);
  const [activeStudent, setActiveStudent] = useState<RosterStudentCard | null>(null);

  const refresh = async () => {
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
    } catch (e: any) {
      console.error(e);
      setError("Impossible de charger la classe.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [id]);

  // Refresh roster when active subject changes (or tab=students)
  useEffect(() => {
    if (!id || tab !== 'students') return;
    (async () => {
      try {
        const r = await getRosterStats(id, activeSubjectId);
        setRoster(r.students);
      } catch (e) { console.error(e); }
    })();
  }, [id, tab, activeSubjectId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0effe' }} className="flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#4f46e5' }} />
      </div>
    );
  }
  if (!classroom) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0effe' }} className="flex items-center justify-center">
        <div className="fd-card p-8 text-center">
          <p style={{ color: '#7068a8', fontSize: 14 }}>{error || 'Classe introuvable.'}</p>
          <Link to="/classrooms" className="fd-btn-primary mt-4 inline-flex"><ArrowLeft className="w-4 h-4" /> Retour</Link>
        </div>
      </div>
    );
  }

  const isOwner = classroom.is_owner;
  const classroomSubjectOptions = classroom.subjects.map(cs => ({
    id: allSubjects.find(s => s.name === cs.subject_name)?.id,
    name: cs.subject_name,
  })).filter(s => s.id) as { id: string; name: string }[];

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

  return (
    <div style={{ minHeight: '100vh', background: '#f0effe' }}>
      <SEO title={`${classroom.name} - Fidni`} description="Détails de la classe" />

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* Header */}
        <div className="mb-5">
          <button onClick={() => navigate('/classrooms')} className="fd-btn-ghost mb-3"
                  style={{ padding: '5px 10px', fontSize: 12 }}>
            <ArrowLeft className="w-3 h-3" /> Mes classes
          </button>

          <div className="fd-card p-5 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div
                className="inline-flex items-center justify-center"
                style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: 'linear-gradient(135deg,#4f46e5,#818cf8)', color: '#fff',
                  boxShadow: '0 8px 24px rgba(79,70,229,.25)',
                }}
              >
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.02em' }}>
                  {classroom.name}
                </h1>
                <div className="flex items-center gap-3 mt-1" style={{ fontSize: 12, color: '#7068a8' }}>
                  {classroom.class_level_name && <span>{classroom.class_level_name}</span>}
                  <span>·</span>
                  <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" /> {classroom.student_count}</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1"><BookOpen className="w-3 h-3" /> {classroom.subjects.length}</span>
                </div>
              </div>
            </div>

            <div
              className="flex items-center gap-3"
              style={{
                background: 'linear-gradient(135deg,#eef2ff,#f0effe)',
                border: '1px solid #e4e2f5', borderRadius: 12, padding: '10px 14px',
              }}
            >
              <Hash className="w-4 h-4" style={{ color: '#4338ca' }} />
              <span style={{ fontFamily: 'DM Mono', fontSize: 18, fontWeight: 800, color: '#4338ca', letterSpacing: '.12em' }}>
                {code}
              </span>
              <button onClick={copyCode} className="fd-btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }}>
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
              {isOwner && (
                <button onClick={regenerate} className="fd-btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }} disabled={busy}>
                  <RefreshCw className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 flex-wrap mb-5">
          <TabButton active={tab === 'students'} onClick={() => setTab('students')} icon={<Users className="w-3 h-3" />}>
            Élèves
          </TabButton>
          <TabButton active={tab === 'tdlists'} onClick={() => setTab('tdlists')} icon={<ClipboardList className="w-3 h-3" />}>
            TD listes
          </TabButton>
          <TabButton active={tab === 'subjects'} onClick={() => setTab('subjects')} icon={<BookOpen className="w-3 h-3" />}>
            Matières
          </TabButton>
        </div>

        {/* Subject filter (visible on Students + TDs tabs) */}
        {tab !== 'subjects' && classroomSubjectOptions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span style={{ fontSize: 11, color: '#9391b8', fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' }}>
              Matière :
            </span>
            <button
              className={`fd-pill ${activeSubjectId === null ? 'is-active' : ''}`}
              onClick={() => setActiveSubjectId(null)}
            >
              Toutes
            </button>
            {classroomSubjectOptions.map(s => (
              <button
                key={s.id}
                className={`fd-pill ${activeSubjectId === Number(s.id) ? 'is-active' : ''}`}
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
            onOpen={(s) => setActiveStudent(s)}
            isOwner={isOwner}
          />
        )}
        {tab === 'tdlists' && (
          <TDListsTab
            classroomId={classroom.id}
            isOwner={isOwner}
            tdLists={tdLists}
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
          subjectOptions={classroomSubjectOptions}
          initialSubjectId={activeSubjectId}
          onClose={() => setActiveStudent(null)}
        />
      )}
    </div>
  );
}

/* ─────────────────── Tabs ─────────────────── */
function TabButton({ active, onClick, icon, children }: any) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '8px 16px', borderRadius: 99, border: 'none',
        background: active ? '#4f46e5' : '#fff',
        color: active ? '#fff' : '#7068a8',
        fontSize: 12, fontWeight: active ? 700 : 500,
        fontFamily: 'DM Sans', cursor: 'pointer',
        boxShadow: active ? '0 6px 20px rgba(79,70,229,.25)' : '0 2px 6px rgba(90,70,200,.05)',
        transition: 'all .18s',
      }}
    >
      {icon} {children}
    </button>
  );
}

/* ─────────────────── Students tab ─────────────────── */
function StudentsTab({ roster, onOpen, isOwner }: {
  roster: RosterStudentCard[];
  onOpen: (s: RosterStudentCard) => void;
  isOwner: boolean;
}) {
  if (roster.length === 0) {
    return (
      <div className="fd-card text-center" style={{ padding: 48 }}>
        <Users className="w-10 h-10 mx-auto mb-3" style={{ color: '#b0adcd' }} />
        <p style={{ fontSize: 13, color: '#7068a8' }}>
          {isOwner ? "Partage le code de la classe pour que tes élèves la rejoignent." : "Aucun élève dans cette classe."}
        </p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {roster.map(card => (
        <FifaCard key={card.student.id} card={card} onClick={() => onOpen(card)} />
      ))}
    </div>
  );
}

/* ─────────────────── FIFA card ─────────────────── */
function tierFor(score: number) {
  if (score >= 85) return { label: 'OR', from: '#fbbf24', to: '#f59e0b', text: '#78350f' };
  if (score >= 65) return { label: 'ARGENT', from: '#cbd5e1', to: '#94a3b8', text: '#334155' };
  return { label: 'BRONZE', from: '#fb923c', to: '#c2410c', text: '#7c2d12' };
}

function FifaCard({ card, onClick }: { card: RosterStudentCard; onClick: () => void }) {
  const tier = tierFor(card.overall);
  return (
    <button
      onClick={onClick}
      className="fd-card text-left"
      style={{
        cursor: 'pointer', padding: 0, overflow: 'hidden',
        border: 'none', background: 'transparent',
      }}
    >
      <div
        style={{
          background: `linear-gradient(160deg, ${tier.from}, ${tier.to})`,
          padding: '16px 16px 12px',
          color: tier.text,
          position: 'relative',
        }}
      >
        {/* Overall + tier */}
        <div className="flex items-start justify-between">
          <div>
            <div style={{ fontSize: 38, fontWeight: 900, fontFamily: 'DM Mono', lineHeight: 1, letterSpacing: '-0.04em' }}>
              {card.overall}
            </div>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.12em', marginTop: 2 }}>
              {tier.label}
            </div>
          </div>
          {card.student.avatar ? (
            <img src={card.student.avatar} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,.6)' }} />
          ) : (
            <div
              className="inline-flex items-center justify-center"
              style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(255,255,255,.3)',
                color: tier.text, fontSize: 20, fontWeight: 800,
                border: '2px solid rgba(255,255,255,.6)',
              }}
            >
              {card.student.username[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, marginTop: 10, letterSpacing: '-0.01em' }}>
          {card.student.username}
        </div>
      </div>
      {/* Axes */}
      <div style={{ background: '#fff', padding: '12px 14px' }}>
        <div className="grid grid-cols-3 gap-y-2 gap-x-3">
          {AXIS_LABELS.map(a => (
            <div key={a.key} className="flex items-center gap-1.5">
              <span style={{ fontSize: 11, fontWeight: 800, fontFamily: 'DM Mono', color: '#1e1b4b', minWidth: 18 }}>
                {card.axes[a.key]}
              </span>
              <span style={{ fontSize: 9, color: '#9391b8', fontWeight: 600, letterSpacing: '.04em' }}>{a.short}</span>
            </div>
          ))}
        </div>
      </div>
    </button>
  );
}

/* ─────────────────── Student stats modal (radar) ─────────────────── */
function StudentStatsModal({ classroomId, student, subjectOptions, initialSubjectId, onClose }: {
  classroomId: number; student: RosterStudentCard;
  subjectOptions: { id: string; name: string }[];
  initialSubjectId: number | null; onClose: () => void;
}) {
  const [subjectId, setSubjectId] = useState<number | null>(initialSubjectId);
  const [data, setData] = useState<StudentSkillStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const d = await getStudentStats(classroomId, { studentId: student.student.id, subjectId });
        setData(d);
      } finally { setLoading(false); }
    })();
  }, [classroomId, student.student.id, subjectId]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(30,27,75,.45)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        animation: 'fadeIn .15s ease',
      }}
      onClick={onClose}
    >
      <div
        className="fd-card animate-fade-up"
        style={{ width: '100%', maxWidth: 540, padding: 22, maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {student.student.avatar ? (
              <img src={student.student.avatar} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div
                className="inline-flex items-center justify-center"
                style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#4f46e5,#818cf8)',
                  color: '#fff', fontSize: 14, fontWeight: 700,
                }}
              >
                {student.student.username[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1e1b4b' }}>{student.student.username}</h3>
              <p style={{ fontSize: 11, color: '#7068a8' }}>Statistiques de compétences</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#7068a8' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subject pills */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <button
            className={`fd-pill ${subjectId === null ? 'is-active' : ''}`}
            onClick={() => setSubjectId(null)}
          >
            Toutes matières
          </button>
          {subjectOptions.map(s => (
            <button
              key={s.id}
              className={`fd-pill ${subjectId === Number(s.id) ? 'is-active' : ''}`}
              onClick={() => setSubjectId(Number(s.id))}
            >
              {s.name}
            </button>
          ))}
        </div>

        {loading || !data ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#4f46e5' }} />
          </div>
        ) : (
          <>
            <div
              className="text-center mb-4"
              style={{
                background: 'linear-gradient(135deg,#eef2ff,#f0effe)',
                borderRadius: 14, border: '1px solid #e4e2f5', padding: 14,
              }}
            >
              <div style={{ fontSize: 11, color: '#7068a8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Note globale {data.subject ? `· ${data.subject.name}` : ''}
              </div>
              <div style={{ fontSize: 44, fontWeight: 900, fontFamily: 'DM Mono', color: '#4338ca', letterSpacing: '-0.04em', lineHeight: 1, marginTop: 4 }}>
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
                    background: '#f9f8ff', border: '1px solid #ede9fe',
                    borderRadius: 10, padding: '8px 12px',
                  }}
                >
                  <span style={{ fontSize: 12, color: '#4b4880', fontWeight: 600 }}>{a.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, fontFamily: 'DM Mono', color: '#4338ca' }}>
                    {data.axes[a.key]}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
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
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', height: 'auto' }}>
      <defs>
        <radialGradient id="radarFill">
          <stop offset="0%" stopColor="#818cf8" stopOpacity=".5" />
          <stop offset="100%" stopColor="#4f46e5" stopOpacity=".15" />
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
            stroke="#ede9fe" strokeWidth="1"
          />
        );
      })}
      <path d={polygon} fill="url(#radarFill)" stroke="#4f46e5" strokeWidth="2" strokeLinejoin="round" />
      {AXIS_LABELS.map((label, i) => {
        const [x, y] = point(i, axes[label.key]);
        return <circle key={label.key} cx={x} cy={y} r="3.5" fill="#4f46e5" stroke="#fff" strokeWidth="2" />;
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
            fontSize="10" fontWeight="700" fontFamily="DM Sans" fill="#4b4880"
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
  classroomId, isOwner, tdLists, onCreateClick, onChanged,
}: {
  classroomId: number; isOwner: boolean;
  tdLists: TDList[]; onCreateClick: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const active = tdLists.find(t => t.id === activeId) || null;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e1b4b' }}>
            TD listes <span style={{ color: '#9391b8', fontFamily: 'DM Mono', fontSize: 14, fontWeight: 500, marginLeft: 6 }}>· {tdLists.length}</span>
          </h2>
          <p style={{ fontSize: 12, color: '#7068a8' }}>Listes d'exercices à compléter</p>
        </div>
        {isOwner && (
          <button onClick={onCreateClick} className="fd-btn-primary">
            <Plus className="w-4 h-4" /> Nouveau TD
          </button>
        )}
      </div>

      {tdLists.length === 0 ? (
        <div className="fd-card text-center" style={{ padding: 48 }}>
          <ClipboardList className="w-10 h-10 mx-auto mb-3" style={{ color: '#b0adcd' }} />
          <p style={{ fontSize: 13, color: '#7068a8' }}>
            {isOwner ? "Crée un TD pour assigner des exercices à tes élèves." : "Aucun TD pour le moment."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tdLists.map(td => (
            <TDListCard key={td.id} td={td} onOpen={() => setActiveId(td.id)} />
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

function TDListCard({ td, onOpen }: { td: TDList; onOpen: () => void }) {
  const pct = td.progress && td.progress.total > 0
    ? Math.round((td.progress.completed * 100) / td.progress.total)
    : 0;
  const due = td.due_date ? new Date(td.due_date) : null;
  return (
    <button
      onClick={onOpen}
      className="fd-card text-left"
      style={{ padding: 18, cursor: 'pointer', border: 'none', background: '#fff' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="inline-flex items-center justify-center"
            style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'linear-gradient(135deg,#4f46e5,#818cf8)', color: '#fff',
            }}
          >
            <ClipboardList className="w-4 h-4" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b', letterSpacing: '-0.01em' }}>{td.title}</div>
            {td.subject_name && (
              <div style={{ fontSize: 10, color: '#9391b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                {td.subject_name}
              </div>
            )}
          </div>
        </div>
        <ChevronRight className="w-4 h-4" style={{ color: '#b0adcd' }} />
      </div>

      <div className="flex items-center gap-3 mt-3" style={{ fontSize: 11, color: '#7068a8' }}>
        <span className="inline-flex items-center gap-1"><FileText className="w-3 h-3" />{td.item_count} ex.</span>
        {due && <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{due.toLocaleDateString('fr-FR')}</span>}
      </div>

      {td.progress && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1" style={{ fontSize: 11, color: '#7068a8' }}>
            <span>Progression</span>
            <span style={{ fontFamily: 'DM Mono', fontWeight: 700, color: pct === 100 ? '#15803d' : '#4338ca' }}>
              {td.progress.completed}/{td.progress.total}
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: '#f0effe', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${pct}%`,
                background: pct === 100 ? 'linear-gradient(90deg,#16a34a,#34d399)' : 'linear-gradient(90deg,#4f46e5,#818cf8)',
                transition: 'width .4s ease',
              }}
            />
          </div>
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
    catch (e: any) { alert(e?.response?.data?.detail || 'Erreur'); }
    finally { setBusy(false); }
  };

  const remove = async (itemId: number) => {
    if (!window.confirm('Retirer cet exercice du TD ?')) return;
    setBusy(true);
    try { await removeTDListItem(classroomId, td.id, itemId); await onChanged(); }
    finally { setBusy(false); }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(30,27,75,.45)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="fd-card animate-fade-up"
        style={{ width: '100%', maxWidth: 640, padding: 22, maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.02em' }}>
              {td.title}
            </h3>
            {td.description && <p style={{ fontSize: 12, color: '#7068a8', marginTop: 4 }}>{td.description}</p>}
            <div className="flex items-center gap-2 mt-2" style={{ fontSize: 11, color: '#9391b8' }}>
              {td.subject_name && <span>{td.subject_name}</span>}
              {td.due_date && <><span>·</span><span>échéance {new Date(td.due_date).toLocaleDateString('fr-FR')}</span></>}
              {td.created_by_username && <><span>·</span><span>par {td.created_by_username}</span></>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOwner && (
              <button
                onClick={async () => {
                  if (window.confirm('Supprimer ce TD ?')) {
                    await deleteTDList(classroomId, td.id);
                    onClose();
                    await onChanged();
                  }
                }}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#b91c1c' }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#7068a8' }}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="mb-4 mt-4">
          <h4 style={{ fontSize: 12, fontWeight: 700, color: '#9391b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
            Exercices ({td.items.length})
          </h4>
          {td.items.length === 0 ? (
            <p style={{ fontSize: 12, color: '#9391b8', fontStyle: 'italic' }}>Aucun exercice.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {td.items.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between"
                  style={{
                    background: '#f9f8ff', border: '1px solid #ede9fe',
                    borderRadius: 10, padding: '10px 12px',
                  }}
                >
                  <Link
                    to={`/exercises/${item.content_display_id}`}
                    className="flex-1 min-w-0"
                    style={{ textDecoration: 'none' }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1e1b4b' }} className="truncate">
                      {item.content_title}
                    </div>
                    <div style={{ fontSize: 10, color: '#9391b8', marginTop: 2 }}>
                      #{item.content_display_id}{item.content_subject ? ` · ${item.content_subject}` : ''}
                      {item.content_difficulty ? ` · ${item.content_difficulty}` : ''}
                    </div>
                  </Link>
                  {isOwner && (
                    <button
                      onClick={() => remove(item.id)}
                      disabled={busy}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#b91c1c', padding: 4 }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add exercises (owner only) */}
        {isOwner && (
          <div>
            <h4 style={{ fontSize: 12, fontWeight: 700, color: '#9391b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
              Ajouter un exercice
            </h4>
            <input
              value={search}
              onChange={e => doSearch(e.target.value)}
              placeholder="Rechercher un exercice…"
              style={{
                width: '100%', padding: '10px 12px',
                border: '1.5px solid #e4e2f5', borderRadius: 10,
                fontSize: 13, fontFamily: 'DM Sans', color: '#1e1b4b',
                background: '#f9f8ff', outline: 'none',
              }}
            />
            {searching && <p style={{ fontSize: 11, color: '#9391b8', marginTop: 6 }}>Recherche…</p>}
            {results.length > 0 && (
              <div className="flex flex-col gap-1 mt-3">
                {results.map(r => {
                  const already = td.items.some(i => i.content_id === r.id || i.content_display_id === (r as any).display_id);
                  return (
                    <button
                      key={r.id}
                      onClick={() => !already && add(r.id)}
                      disabled={already || busy}
                      style={{
                        background: already ? '#f0fdf4' : '#fff',
                        border: '1px solid ' + (already ? '#bbf7d0' : '#ede9fe'),
                        borderRadius: 10, padding: '8px 12px', cursor: already ? 'default' : 'pointer',
                        textAlign: 'left',
                        opacity: already ? .7 : 1,
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1e1b4b' }} className="truncate">
                        {r.title}
                        {already && <span style={{ marginLeft: 8, fontSize: 10, color: '#15803d' }}>· déjà ajouté</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
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
    } catch (e: any) {
      setErr(e?.response?.data?.detail || 'Erreur');
    } finally { setBusy(false); }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(30,27,75,.45)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onClose}
    >
      <div className="fd-card animate-fade-up" style={{ width: '100%', maxWidth: 480, padding: 22 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e1b4b' }}>Nouveau TD</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#7068a8' }}><X className="w-5 h-5" /></button>
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
      </div>
    </div>
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
    catch (e: any) { alert(e?.response?.data?.detail || 'Erreur'); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="fd-card p-5">
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b', marginBottom: 10 }}>Matières</h3>
        {classroom.subjects.length === 0 ? (
          <p style={{ fontSize: 12, color: '#9391b8', fontStyle: 'italic' }}>Aucune matière.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {classroom.subjects.map(cs => (
              <div key={cs.id}
                   className="flex items-center justify-between"
                   style={{ background: '#f9f8ff', border: '1px solid #ede9fe', borderRadius: 10, padding: '8px 12px' }}>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5" style={{ color: '#4338ca' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1e1b4b' }}>{cs.subject_name}</span>
                  <span style={{ fontSize: 11, color: '#9391b8' }}>· {cs.teacher_username}</span>
                </div>
                {isOwner && (
                  <button onClick={async () => { await removeSubject(classroom.id, cs.id); await onChanged(); }}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#b91c1c' }}>
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

      <div className="fd-card p-5">
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b', marginBottom: 10 }}>
          Élèves ({members.length})
        </h3>
        {members.length === 0 ? (
          <p style={{ fontSize: 12, color: '#9391b8', fontStyle: 'italic' }}>Aucun élève n'a rejoint.</p>
        ) : (
          <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
            {members.map(m => (
              <div key={m.id}
                   className="flex items-center gap-3"
                   style={{ background: '#f9f8ff', border: '1px solid #ede9fe', borderRadius: 10, padding: '8px 12px' }}>
                {m.student.avatar ? (
                  <img src={m.student.avatar} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div className="inline-flex items-center justify-center"
                       style={{
                         width: 28, height: 28, borderRadius: '50%',
                         background: 'linear-gradient(135deg,#4f46e5,#818cf8)', color: '#fff',
                         fontSize: 11, fontWeight: 700,
                       }}>
                    {m.student.username[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1e1b4b' }}>{m.student.username}</div>
                  {m.student.email && <div className="truncate" style={{ fontSize: 10, color: '#9391b8' }}>{m.student.email}</div>}
                </div>
                {isOwner && (
                  <button onClick={() => onRemoveMember(m.student.id)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#b91c1c' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────── shared ─────────────────── */
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid #e4e2f5',
  borderRadius: 10,
  fontSize: 13,
  fontFamily: 'DM Sans',
  color: '#1e1b4b',
  background: '#f9f8ff',
  outline: 'none',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, color: '#7068a8', fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
}

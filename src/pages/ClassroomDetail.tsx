import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Users, Copy, Check, RefreshCw, BookOpen, Plus,
  Trash2, Loader2, X, ClipboardList, GraduationCap, Calendar,
  ChevronRight, FileText, Flag, Sparkles, RotateCcw, SearchX, type LucideIcon,
} from 'lucide-react';
import { SEO } from '@/components/layout/SEO';
import { Page, PageHeader, Section, EmptyState, Segmented, CardsSkeleton } from '@/components/space/Page';
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

/** Pictogramme d'onglet affiché à partir de la largeur d'une tablette seulement. */
const wideOnly = (I: LucideIcon) => {
  const Wide = ({ className = '' }: { className?: string }) => <I className={`hidden sm:block ${className}`} aria-hidden />;
  return Wide;
};
const TabIcons = {
  students: wideOnly(Users), tdlists: wideOnly(ClipboardList), subjects: wideOnly(BookOpen), skills: wideOnly(Sparkles),
};

export default function ClassroomDetailPage() {
  const { id } = useParams<{ id: string }>();
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

  // Squelette au premier chargement seulement : un rafraîchissement (TD modifié…)
  // ne doit pas démonter la page ni fermer la fenêtre ouverte.
  if (loading && !classroom) {
    return (
      <Page width="wide">
        <div className="mb-8 animate-pulse" aria-hidden>
          <div className="h-4 w-24 rounded bg-[#efece6]" />
          <div className="mt-5 h-8 w-56 rounded bg-[#efece6]" />
          <div className="mt-3 h-4 w-40 rounded bg-[#f2f1ee]" />
        </div>
        <CardsSkeleton n={3} className="sm:grid-cols-2 lg:grid-cols-3" />
      </Page>
    );
  }
  if (!classroom) {
    return (
      <Page width="wide">
        <PageHeader back={{ to: '/classrooms', label: 'Mes classes' }} title={error ? 'Classe indisponible' : 'Classe introuvable'} />
        {/* Classe supprimée, quittée, ou chargement raté (réseau) : on propose les deux issues. */}
        <EmptyState icon={GraduationCap} tone="ink" title="Cette classe n’est pas accessible"
          text="Elle a peut-être été supprimée, ou tu n’en fais plus partie. Si ta connexion a coupé, réessaie."
          action={<Link to="/classrooms" className="fd-btn-primary min-h-10">Mes classes</Link>}
          secondary={<button type="button" onClick={refresh} className="fd-btn-ghost min-h-10"><RotateCcw className="h-4 w-4" /> Réessayer</button>} />
      </Page>
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
    } catch (e) {
      alert(classroomError(e, 'Impossible de régénérer le code.'));
    } finally { setBusy(false); }
  };

  // Pictogrammes masqués sur téléphone (et pas de compteur côté élève) : les onglets tiennent sur l'écran.
  const tabs: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = isOwner
    ? [
      { key: 'students', label: 'Élèves', icon: TabIcons.students, count: classroom.student_count },
      { key: 'tdlists', label: 'TD listes', icon: TabIcons.tdlists, count: tdLists.length },
      { key: 'subjects', label: 'Matières', icon: TabIcons.subjects },
    ]
    : [
      { key: 'tdlists', label: 'TD listes', icon: TabIcons.tdlists },
      { key: 'students', label: 'Mes compétences', icon: TabIcons.skills },
      { key: 'subjects', label: 'Matières', icon: TabIcons.subjects },
    ];

  const copyButton = (
    <button type="button" onClick={copyCode} aria-label={copied ? 'Code copié' : 'Copier le code'}
      className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-[12.5px] font-semibold text-brand-hover transition-colors hover:bg-brand-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      <span aria-live="polite">{copied ? 'Copié' : 'Copier'}</span>
    </button>
  );

  const chip = (active: boolean) => `inline-flex min-h-10 items-center rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${
    active ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-faint hover:border-[#cfc9bf] hover:text-ink'}`;

  return (
    <Page width="wide">
      <SEO title={`${classroom.name} - Fidni`} description="Détails de la classe" />

      <PageHeader
        back={{ to: '/classrooms', label: 'Mes classes' }}
        eyebrow={classroom.class_level_name || 'Classe'}
        title={classroom.name}
        subtitle={(
          <>
            <span className="fd-nums">{classroom.student_count}</span> {plural(classroom.student_count, 'élève', 'élèves')}
            {/* « 0 matière » ne dit rien : seulement s'il y en a. */}
            {classroom.subjects.length > 0 && <>{' · '}<span className="fd-nums">{classroom.subjects.length}</span> {plural(classroom.subjects.length, 'matière', 'matières')}</>}
            {!isOwner && <> · Prof : <b className="font-semibold text-ink-soft">{classroom.owner.username}</b></>}
          </>
        )}
        actions={(
          <div data-tour="classe-code" className="flex max-w-full items-center gap-1 rounded-2xl border border-line bg-white py-1 pl-4 pr-1">
            <span className="text-[11px] font-semibold uppercase tracking-[.08em] text-ink-faint">Code</span>
            <span className="ml-1.5 truncate font-mono text-[18px] font-bold tracking-[.14em] text-ink">{code}</span>
            {copyButton}
            {isOwner && (
              <button type="button" onClick={regenerate} disabled={busy} aria-label="Régénérer le code" title="Régénérer le code"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-faint transition-colors hover:bg-[#f2f1ee] hover:text-ink disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </button>
            )}
          </div>
        )}
      >
        <div className="mt-6" data-tour="classe-onglets">
          <Segmented<Tab> label="Vues de la classe" value={tab} onChange={setTab} options={tabs} />
        </div>
      </PageHeader>

      {/* Matière (onglets Élèves et TD) */}
      {tab !== 'subjects' && classroomSubjectOptions.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2" role="group" aria-label="Matière">
          <span className="mr-1 text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint">Matière</span>
          <button type="button" aria-pressed={activeSubjectId === null} className={chip(activeSubjectId === null)} onClick={() => setActiveSubjectId(null)}>
            Toutes
          </button>
          {classroomSubjectOptions.map(s => (
            <button key={s.id} type="button" aria-pressed={activeSubjectId === Number(s.id)} className={chip(activeSubjectId === Number(s.id))}
              onClick={() => setActiveSubjectId(Number(s.id))}>
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Contenu de l'onglet */}
      {tab === 'students' && (
        <StudentsTab
          roster={roster}
          state={rosterState}
          onOpen={(s) => setActiveStudent(s)}
          isOwner={isOwner}
          meId={user ? String(user.id) : null}
          shareAction={(
            <button type="button" onClick={copyCode} className="fd-btn-primary min-h-10">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span aria-live="polite">{copied ? 'Code copié' : <>Copier le code <span className="font-mono tracking-[.08em]">{code}</span></>}</span>
            </button>
          )}
        />
      )}
      {tab === 'tdlists' && (
        <TDListsTab
          classroomId={classroom.id}
          isOwner={isOwner}
          tdLists={tdLists}
          activeSubject={activeSubject ? { id: Number(activeSubject.id), name: activeSubject.name } : null}
          onClearSubject={() => setActiveSubjectId(null)}
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
            if (!window.confirm('Retirer cet élève de la classe ?')) return;
            try { await removeMember(classroom.id, sid); await refresh(); }
            catch (e) { alert(classroomError(e, "Impossible de retirer cet élève.")); }
          }}
        />
      )}

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
    </Page>
  );
}

/* ─────────────────── shared bits ─────────────────── */
function Avatar({ user, size }: { user: { username: string; avatar?: string | null }; size: number }) {
  // Photo introuvable (lien mort, service d'avatars bloqué) : l'initiale, comme sans photo.
  const [broken, setBroken] = useState(false);
  if (user.avatar && !broken) {
    return <img src={user.avatar} alt="" onError={() => setBroken(true)} className="shrink-0 rounded-full bg-[#f2f1ee] object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span aria-hidden className="inline-flex shrink-0 items-center justify-center rounded-full bg-ink font-bold text-white"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}>
      {user.username[0]?.toUpperCase()}
    </span>
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
function StudentsTab({ roster, state, onOpen, isOwner, meId, shareAction }: {
  roster: RosterStudentCard[];
  state: LoadState;
  onOpen: (s: RosterStudentCard) => void;
  isOwner: boolean;
  meId: string | null;
  /** Bouton « Copier le code » de l'état vide du prof. */
  shareAction?: React.ReactNode;
}) {
  if (state === 'loading') {
    return <CardsSkeleton n={isOwner ? 4 : 1} className={isOwner ? 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'max-w-md'} />;
  }
  if (state === 'error') {
    return (
      <div role="alert" className="rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-4 py-3">
        <p className="text-[13.5px] font-medium text-[#a23b34]">Les compétences n’ont pas pu se charger. Réessaie dans un moment.</p>
      </div>
    );
  }

  // L'élève ne voit que sa propre carte : jamais celles de ses camarades.
  if (!isOwner) {
    const mine = roster.find(c => String(c.student.id) === meId) || null;
    return (
      <Section id="mes-competences" title="Mes compétences" className="max-w-md"
        hint="Calculées à partir de ton travail sur Fidni. Tes camarades ne les voient pas.">
        {mine ? (
          <SkillCard card={mine} onClick={() => onOpen(mine)} />
        ) : (
          <EmptyState compact icon={Sparkles} title="Ta carte apparaît après quelques exercices"
            text="Précision, régularité, persévérance… elles se calculent à partir de ce que tu fais sur Fidni."
            action={<Link to="/exercises" className="fd-btn-ghost min-h-10">Faire des exercices</Link>} />
        )}
      </Section>
    );
  }

  if (roster.length === 0) {
    return (
      <EmptyState icon={Users} title="Aucun élève pour l’instant"
        text="Envoie le code de la classe à tes élèves : ils l’entrent dans « Mes classes » pour la rejoindre."
        action={shareAction} />
    );
  }
  // Sans aucune activité, un élève n'est pas « à suivre » : il n'a simplement pas encore commencé.
  const idle = roster.filter(isIdle).length;
  const toWatch = roster.filter(c => !isIdle(c) && c.overall < WATCH_BELOW).length;
  return (
    <>
      <p className="mb-3 text-[13px] leading-relaxed text-ink-faint">
        <span className="fd-nums">{roster.length}</span> {plural(roster.length, 'élève', 'élèves')}
        {toWatch > 0 && <> · <strong className="font-semibold text-gold-strong">{toWatch} à suivre</strong> (score global sous {WATCH_BELOW})</>}
        {idle > 0 && <> · <span className="fd-nums">{idle}</span> sans activité pour l’instant</>}
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
/** Aucune activité mesurée : score et six axes à zéro. */
const isIdle = (c: RosterStudentCard) => c.overall === 0 && AXIS_LABELS.every(a => !c.axes[a.key]);

function SkillCard({ card, onClick, watch = false }: {
  card: RosterStudentCard; onClick: () => void;
  /** Vue du prof : repère « À suivre » sous WATCH_BELOW. */
  watch?: boolean;
}) {
  const idle = isIdle(card);
  const flagged = watch && !idle && card.overall < WATCH_BELOW;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full overflow-hidden rounded-2xl border border-line bg-white text-left transition-[border-color,box-shadow] hover:border-[#cfc9bf] hover:shadow-[0_6px_16px_rgba(20,18,16,.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        <Avatar user={card.student} size={40} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14.5px] font-semibold text-ink group-hover:underline">{card.student.username}</div>
          {flagged ? (
            <span className="mt-0.5 inline-flex items-center gap-1 text-[12px] font-semibold text-gold-strong">
              <Flag className="h-3 w-3" aria-hidden /> À suivre
            </span>
          ) : (
            <div className="mt-0.5 text-[12px] text-ink-faint">{idle ? 'Pas encore d’activité' : 'Score global'}</div>
          )}
        </div>
        {!idle && (
          <div className="shrink-0 text-right">
            <span className="fd-nums text-[26px] font-bold leading-none text-ink">{card.overall}</span>
            <span className="fd-nums ml-0.5 text-[11px] text-ink-faint">/100</span>
          </div>
        )}
      </div>
      {/* Les six axes en toutes lettres (avant : « PRÉ », « RÉG »… illisibles), chacun avec sa petite jauge. */}
      {!idle && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[#efece6] px-4 py-3">
          {AXIS_LABELS.map(a => {
            const v = Math.max(0, Math.min(100, card.axes[a.key] ?? 0));
            return (
              <div key={a.key} className="min-w-0">
                <div className="flex items-baseline justify-between gap-2 text-[11.5px]">
                  <span className="truncate text-ink-faint">{a.label}</span>
                  <span className="fd-nums font-semibold text-ink-soft">{card.axes[a.key]}</span>
                </div>
                <span className="mt-1 block h-1 overflow-hidden rounded-full bg-[#f2f1ee]" aria-hidden>
                  <span className="block h-full rounded-full bg-ink-soft/70" style={{ width: `${v}%` }} />
                </span>
              </div>
            );
          })}
        </div>
      )}
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
            <div style={{ fontSize: 44, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: '#1a1a1a', letterSpacing: '-0.04em', lineHeight: 1, marginTop: 4 }}>
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
                  background: '#fcfbf9', border: '1px solid #e7e3dc',
                  borderRadius: 10, padding: '8px 12px',
                }}
              >
                <span style={{ fontSize: 12, color: '#33302b', fontWeight: 600 }}>{a.label}</span>
                <span style={{ fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: '#1a1a1a' }}>
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
        <path key={idx} d={ringPath(f)} fill="none" stroke="#e7e3dc" strokeWidth="1" strokeDasharray={idx === 3 ? undefined : '3,4'} />
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
  classroomId, isOwner, tdLists, activeSubject, onClearSubject, onCreateClick, onChanged,
}: {
  classroomId: number; isOwner: boolean;
  tdLists: TDList[];
  /** Matière choisie dans les pastilles « Matière » (null = toutes). */
  activeSubject: { id: number; name: string } | null;
  onClearSubject: () => void;
  onCreateClick: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const active = tdLists.find(t => t.id === activeId) || null;

  // Un TD sans matière vaut pour toutes : il reste affiché quel que soit le filtre. L'id de la pastille
  // vient d'une correspondance par nom avec /subjects/ : on accepte l'id OU le nom de la matière.
  const shown = activeSubject
    ? tdLists.filter(td => (td.subject == null && !td.subject_name)
      || td.subject === activeSubject.id || td.subject_name === activeSubject.name)
    : tdLists;

  const newTD = (
    <button type="button" onClick={onCreateClick} className="fd-btn-primary min-h-10">
      <Plus className="w-4 h-4" /> Nouveau TD
    </button>
  );

  return (
    <>
      <Section id="td" title="TD listes" count={shown.length}
        hint={tdLists.length ? (isOwner ? 'Les exercices que tu donnes à ta classe.' : 'Les exercices donnés par ton prof.') : undefined}
        action={isOwner && tdLists.length > 0 ? newTD : undefined}>
        {shown.length === 0 ? (
          tdLists.length > 0 && activeSubject ? (
            <EmptyState compact icon={SearchX} tone="ink" title={`Aucun TD en ${activeSubject.name}`}
              action={<button type="button" onClick={onClearSubject} className="fd-btn-ghost min-h-10">Toutes les matières</button>} />
          ) : isOwner ? (
            <EmptyState icon={ClipboardList} title="Pas encore de TD"
              text="Un TD, c’est une liste d’exercices de Fidni que tu donnes à ta classe, avec une date de rendu. Tu vois ensuite qui l’a fini."
              action={newTD} />
          ) : (
            <EmptyState icon={ClipboardList} tone="ink" title="Pas encore de TD"
              text="Quand ton prof donnera un TD à la classe, il apparaîtra ici avec ta progression."
              action={<Link to="/reviser" className="fd-btn-ghost min-h-10">Réviser en attendant</Link>} />
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {shown.map(td => (
              <TDListCard key={td.id} td={td} isOwner={isOwner} onOpen={() => setActiveId(td.id)} />
            ))}
          </div>
        )}
      </Section>

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
          background: '#1a7a4a',
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
      type="button"
      onClick={onOpen}
      className="group w-full rounded-2xl border border-line bg-white p-4 text-left transition-[border-color,box-shadow] hover:border-[#cfc9bf] hover:shadow-[0_6px_16px_rgba(20,18,16,.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f2f1ee] text-ink-soft" aria-hidden>
          <ClipboardList className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold leading-snug text-ink group-hover:underline">{td.title}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-ink-faint">
            {td.subject_name && <span>{td.subject_name}</span>}
            <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" aria-hidden />{td.item_count} ex.</span>
            {due && <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" aria-hidden />à rendre le {due.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span>}
          </div>
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
      </div>

      {cls && (
        <div className="mt-3.5">
          <div className="mb-1.5 flex items-center justify-between text-[12px] text-ink-faint">
            <span>{cls.total === 0 ? 'Aucun élève dans la classe' : finishedLabel(cls.finished, cls.total)}</span>
            {cls.total > 0 && (
              <span className={`fd-nums font-semibold ${pct === 100 ? 'text-brand-hover' : 'text-ink-soft'}`}>{pct} %</span>
            )}
          </div>
          <ProgressBar pct={pct} />
        </div>
      )}
      {mine && (
        <div className="mt-3.5">
          <div className="mb-1.5 flex items-center justify-between text-[12px] text-ink-faint">
            <span>Ma progression</span>
            <span className={`fd-nums font-semibold ${pct === 100 ? 'text-brand-hover' : 'text-ink-soft'}`}>
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
  const searchSeq = useRef(0);

  const doSearch = async (q: string) => {
    setSearch(q);
    // Frappe rapide : seule la réponse de la dernière recherche s'affiche.
    const seq = ++searchSeq.current;
    if (!q.trim()) { setResults([]); setSearching(false); return; }
    try {
      setSearching(true);
      const r = await getExercises({ search: q, per_page: 8 });
      if (seq === searchSeq.current) setResults(r.results || []);
    } catch (e) {
      console.error(e);
      if (seq === searchSeq.current) setResults([]);
    } finally {
      if (seq === searchSeq.current) setSearching(false);
    }
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
    catch (e) { alert(classroomError(e, "Impossible de retirer cet exercice.")); }
    finally { setBusy(false); }
  };

  const destroy = async () => {
    if (!window.confirm('Supprimer ce TD ?')) return;
    setBusy(true);
    try { await deleteTDList(classroomId, td.id); onClose(); await onChanged(); }
    catch (e) { alert(classroomError(e, 'Impossible de supprimer ce TD.')); setBusy(false); }
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
              onClick={destroy}
              disabled={busy}
              aria-label="Supprimer le TD"
              title="Supprimer le TD"
              className="inline-flex items-center justify-center"
              style={{ width: 36, height: 36, background: 'transparent', border: 'none', cursor: 'pointer', color: '#a23b34' }}
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
                    background: '#fcfbf9', border: '1px solid #e7e3dc',
                    borderRadius: 10, padding: '10px 12px',
                  }}
                >
                  <span
                    className="inline-flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 24, height: 24, borderRadius: 7, background: '#fff', border: '1px solid #e7e3dc',
                      fontSize: 11, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: '#1a1a1a',
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
                      style={{ width: 36, height: 36, background: 'transparent', border: 'none', cursor: 'pointer', color: '#a23b34' }}
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
            type="search"
            value={search}
            onChange={e => doSearch(e.target.value)}
            placeholder="Rechercher un exercice…"
            aria-label="Rechercher un exercice à ajouter"
            style={inputStyle}
          />
          {searching && <p style={{ fontSize: 11, color: '#6b6862', marginTop: 6 }}>Recherche…</p>}
          {!searching && search.trim() && results.length === 0 && (
            <p style={{ fontSize: 11, color: '#6b6862', marginTop: 6 }}>Aucun exercice trouvé.</p>
          )}
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
                      background: already ? '#eaf3ed' : '#fff',
                      border: '1px solid ' + (already ? '#cfe6d8' : '#e7e3dc'),
                      borderRadius: 10, padding: '8px 12px', cursor: already ? 'default' : 'pointer',
                      textAlign: 'left', minHeight: 40,
                      opacity: already ? .7 : 1,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }} className="truncate">
                      {r.title}
                      {already && <span style={{ marginLeft: 8, fontSize: 10, color: '#15633c' }}>· déjà ajouté</span>}
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
  success: { label: 'Réussi', bg: '#eaf3ed', border: '#8fc4a6', color: '#15633c', mark: '✓' },
  review:  { label: 'À revoir', bg: '#faf3e2', border: '#e0c48a', color: '#9a6e1c', mark: '!' },
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
          <span style={{ fontSize: 13, fontWeight: 700, color: summary.finished === summary.total ? '#15633c' : '#1a1a1a' }}>
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
                      style={{ padding: '4px 0 6px', minWidth: 38, textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: '#1a1a1a' }}
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
                          padding: '2px 6px 2px 10px', textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontWeight: 700,
                          color: done === nItems ? '#15633c' : '#1a1a1a', borderTop: '1px solid #f2f1ee',
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
                      fontVariantNumeric: 'tabular-nums', fontSize: 11, fontWeight: 800, color: '#9a6e1c',
                      background: '#faf3e2', borderRadius: 6, padding: '2px 7px',
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
        {err && <p style={{ fontSize: 12, color: '#a23b34' }}>{err}</p>}
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

  const removeS = async (id: number, name: string) => {
    if (!window.confirm(`Retirer ${name} de la classe ?`)) return;
    try { await removeSubject(classroom.id, id); await onChanged(); }
    catch (e) { alert(classroomError(e, 'Impossible de retirer cette matière.')); }
  };

  return (
    // La liste des élèves (et leurs e-mails) est réservée au prof.
    <div className={isOwner ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : 'max-w-xl'}>
      <div className="fd-card p-5">
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 }}>Matières</h3>
        {classroom.subjects.length === 0 ? (
          <p className="text-[13px] text-ink-faint">
            {isOwner ? 'Pas encore de matière : ajoute celles que tu enseignes à cette classe.' : 'Pas encore de matière dans cette classe.'}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {classroom.subjects.map(cs => (
              <div key={cs.id}
                   className="flex items-center justify-between"
                   style={{ background: '#fcfbf9', border: '1px solid #e7e3dc', borderRadius: 10, padding: '8px 12px' }}>
                <div className="flex items-center gap-2 min-w-0">
                  <BookOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#1a1a1a' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{cs.subject_name}</span>
                  <span className="truncate" style={{ fontSize: 11, color: '#6b6862' }}>· {cs.teacher_username}</span>
                </div>
                {isOwner && (
                  <button onClick={() => removeS(cs.id, cs.subject_name)}
                          aria-label={`Retirer ${cs.subject_name}`}
                          className="inline-flex items-center justify-center flex-shrink-0"
                          style={{ width: 36, height: 36, background: 'transparent', border: 'none', cursor: 'pointer', color: '#a23b34' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {isOwner && availableSubjects.length > 0 && (
          <div className="flex items-center gap-2 mt-3">
            <select value={newSubjectId} onChange={e => setNewSubjectId(e.target.value)} aria-label="Matière à ajouter"
                    style={{ ...inputStyle, padding: '8px 10px', flex: 1, minWidth: 0 }}>
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
            <p className="text-[13px] text-ink-faint">Aucun élève pour l’instant : envoie-leur le code de la classe.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
              {members.map(m => (
                <div key={m.id}
                     className="flex items-center gap-3"
                     style={{ background: '#fcfbf9', border: '1px solid #e7e3dc', borderRadius: 10, padding: '8px 12px' }}>
                  <Avatar user={m.student} size={28} />
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{m.student.username}</div>
                    {m.student.email && <div className="truncate" style={{ fontSize: 10, color: '#6b6862' }}>{m.student.email}</div>}
                  </div>
                  <button onClick={() => onRemoveMember(m.student.id)}
                          aria-label={`Retirer ${m.student.username}`}
                          className="inline-flex items-center justify-center flex-shrink-0"
                          style={{ width: 36, height: 36, background: 'transparent', border: 'none', cursor: 'pointer', color: '#a23b34' }}>
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
  background: '#fcfbf9',
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

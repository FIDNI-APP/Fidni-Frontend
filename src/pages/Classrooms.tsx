import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Users, Trash2, BookOpen,
  LogIn, X, Loader2, Sparkles, GraduationCap, Hash,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { SEO } from '@/components/layout/SEO';
import {
  listClassrooms,
  createClassroom,
  deleteClassroom,
  joinClassroom,
  leaveClassroom,
  type Classroom,
} from '@/lib/api/classroomApi';

export function ClassroomsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isTeacher = user?.profile?.user_type === 'teacher';

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const refresh = async () => {
    try {
      setLoading(true);
      const data = await listClassrooms();
      setClassrooms(data);
    } catch (e: any) {
      console.error(e);
      setError("Impossible de charger les classes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0effe' }} className="flex items-center justify-center">
        <div className="fd-card p-8 text-center">
          <p style={{ color: '#7068a8', fontSize: 14 }}>Connecte-toi pour voir tes classes.</p>
        </div>
      </div>
    );
  }

  const owned = classrooms.filter(c => c.is_owner);
  const joined = classrooms.filter(c => !c.is_owner);

  return (
    <div style={{ minHeight: '100vh', background: '#f0effe' }}>
      <SEO title="Mes classes - Fidni" description="Gérer mes classes et collaborer avec mes camarades." />

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* Header */}
        <div className="mb-6 flex items-end justify-between flex-wrap gap-3">
          <div>
            <span
              className="inline-flex items-center gap-1.5"
              style={{
                background: '#eef2ff', color: '#4338ca',
                padding: '4px 12px', borderRadius: 99,
                fontSize: 11, fontWeight: 700, letterSpacing: '.04em',
              }}
            >
              <GraduationCap className="w-3 h-3" /> CLASSES
            </span>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.03em', marginTop: 10 }}>
              Mes classes
            </h1>
            <p style={{ fontSize: 13, color: '#7068a8', marginTop: 4 }}>
              {isTeacher
                ? 'Crée une classe, ajoute des matières et invite tes élèves avec un code.'
                : 'Rejoins une classe avec un code donné par ton enseignant·e.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isTeacher && (
              <button className="fd-btn-primary" onClick={() => setShowJoin(true)}>
                <LogIn className="w-4 h-4" /> Rejoindre une classe
              </button>
            )}
            {isTeacher && (
              <>
                <button className="fd-btn-ghost" onClick={() => setShowJoin(true)}>
                  <LogIn className="w-3 h-3" /> Rejoindre
                </button>
                <button className="fd-btn-primary" onClick={() => setShowCreate(true)}>
                  <Plus className="w-4 h-4" /> Nouvelle classe
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div
            className="fd-card mb-4"
            style={{ padding: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 13 }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#4f46e5' }} />
          </div>
        ) : (
          <>
            {/* Owned classrooms (teacher) */}
            {owned.length > 0 && (
              <Section title="Classes que je gère" subtitle="Enseignement">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {owned.map(c => (
                    <ClassroomCard
                      key={c.id}
                      classroom={c}
                      onOpen={() => navigate(`/classrooms/${c.id}`)}
                      onDelete={async () => {
                        if (window.confirm(`Supprimer la classe "${c.name}" ?`)) {
                          await deleteClassroom(c.id);
                          refresh();
                        }
                      }}
                    />
                  ))}
                </div>
              </Section>
            )}

            {/* Joined classrooms */}
            {joined.length > 0 && (
              <Section title="Classes auxquelles je participe" subtitle="Apprentissage">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {joined.map(c => (
                    <ClassroomCard
                      key={c.id}
                      classroom={c}
                      onOpen={() => navigate(`/classrooms/${c.id}`)}
                      onLeave={async () => {
                        if (window.confirm(`Quitter la classe "${c.name}" ?`)) {
                          await leaveClassroom(c.id);
                          refresh();
                        }
                      }}
                    />
                  ))}
                </div>
              </Section>
            )}

            {classrooms.length === 0 && (
              <div className="fd-card text-center" style={{ padding: 60 }}>
                <div
                  className="inline-flex items-center justify-center mx-auto mb-4"
                  style={{
                    width: 72, height: 72, borderRadius: 18,
                    background: 'linear-gradient(135deg,#eef2ff,#f0effe)', color: '#7068a8',
                  }}
                >
                  <GraduationCap className="w-8 h-8" />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e1b4b' }}>
                  {isTeacher ? "Crée ta première classe" : "Tu n'es dans aucune classe"}
                </h3>
                <p style={{ fontSize: 13, color: '#7068a8', marginTop: 8, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>
                  {isTeacher
                    ? "Une classe te permet de regrouper tes élèves, d'y associer des matières et de suivre leurs progrès."
                    : "Demande un code de classe à ton enseignant·e pour rejoindre une classe."}
                </p>
                <button
                  className="fd-btn-primary"
                  style={{ marginTop: 18 }}
                  onClick={() => isTeacher ? setShowCreate(true) : setShowJoin(true)}
                >
                  {isTeacher ? <><Plus className="w-4 h-4" /> Créer une classe</> : <><LogIn className="w-4 h-4" /> Entrer un code</>}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateClassroomModal
          onClose={() => setShowCreate(false)}
          onCreated={async (c) => {
            setShowCreate(false);
            await refresh();
            navigate(`/classrooms/${c.id}`);
          }}
        />
      )}

      {showJoin && (
        <JoinClassroomModal
          onClose={() => setShowJoin(false)}
          onJoined={async () => {
            setShowJoin(false);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

/* ───────── Section header ───────── */
function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <div className="mb-3">
        <span style={{ fontSize: 10, color: '#9391b8', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>
          {subtitle}
        </span>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.02em', marginTop: 2 }}>
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

/* ───────── Classroom card ───────── */
function ClassroomCard({
  classroom,
  onOpen,
  onDelete,
  onLeave,
}: {
  classroom: Classroom;
  onOpen: () => void;
  onDelete?: () => void;
  onLeave?: () => void;
}) {
  return (
    <div className="fd-card p-5 cursor-pointer" onClick={onOpen}>
      <div className="flex items-start justify-between mb-3">
        <div
          className="inline-flex items-center justify-center"
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg,#4f46e5,#818cf8)', color: '#fff',
          }}
        >
          <Users className="w-4 h-4" />
        </div>
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#b91c1c', padding: 4 }}
            aria-label="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        {onLeave && (
          <button
            onClick={(e) => { e.stopPropagation(); onLeave(); }}
            className="fd-btn-ghost"
            style={{ padding: '4px 10px', fontSize: 11 }}
          >
            Quitter
          </button>
        )}
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e1b4b', letterSpacing: '-0.01em' }}>
        {classroom.name}
      </h3>
      {classroom.class_level_name && (
        <p style={{ fontSize: 11, color: '#9391b8', marginTop: 2 }}>{classroom.class_level_name}</p>
      )}

      <div className="flex items-center gap-3 mt-4 text-xs">
        <span className="inline-flex items-center gap-1" style={{ color: '#7068a8' }}>
          <Users className="w-3 h-3" /> {classroom.student_count} élève{classroom.student_count > 1 ? 's' : ''}
        </span>
        <span className="inline-flex items-center gap-1" style={{ color: '#7068a8' }}>
          <BookOpen className="w-3 h-3" /> {classroom.subjects.length} matière{classroom.subjects.length > 1 ? 's' : ''}
        </span>
      </div>

      <div
        className="flex items-center justify-between mt-4 pt-3"
        style={{ borderTop: '1px dashed #ede9fe' }}
      >
        <div className="inline-flex items-center gap-1.5">
          <Hash className="w-3 h-3" style={{ color: '#9391b8' }} />
          <span
            style={{
              fontFamily: 'DM Mono', fontSize: 13, fontWeight: 700,
              color: '#4338ca', letterSpacing: '.06em',
            }}
          >
            {classroom.join_code}
          </span>
        </div>
        <span style={{ fontSize: 10, color: '#9391b8' }}>
          {classroom.is_owner ? 'Propriétaire' : `par ${classroom.owner.username}`}
        </span>
      </div>
    </div>
  );
}

/* ───────── Modals ───────── */
function ModalShell({ title, onClose, children, width = 480 }: { title: string; onClose: () => void; children: React.ReactNode; width?: number }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(30,27,75,.4)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        animation: 'fadeIn .15s ease',
      }}
      onClick={onClose}
    >
      <div
        className="fd-card animate-fade-up"
        style={{ width: '100%', maxWidth: width, padding: 22, maxHeight: '88vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.02em' }}>{title}</h3>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#7068a8', padding: 4 }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CreateClassroomModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: Classroom) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setBusy(true); setErr('');
      const c = await createClassroom({ name: name.trim(), description: description.trim() });
      onCreated(c);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || 'Erreur lors de la création.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell title="Nouvelle classe" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Nom de la classe">
          <input
            value={name} onChange={e => setName(e.target.value)} required autoFocus
            placeholder="Ex. 2ème Bac SM A"
            style={inputStyle}
          />
        </Field>
        <Field label="Description (facultatif)">
          <textarea
            value={description} onChange={e => setDescription(e.target.value)}
            rows={3} placeholder="Ex. Classe de mathématiques avancées"
            style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }}
          />
        </Field>
        {err && <p style={{ fontSize: 12, color: '#b91c1c' }}>{err}</p>}
        <div className="flex justify-end gap-2 mt-2">
          <button type="button" className="fd-btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" className="fd-btn-primary" disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Créer
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function JoinClassroomModal({ onClose, onJoined }: { onClose: () => void; onJoined: () => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    try {
      setBusy(true); setErr('');
      await joinClassroom(code);
      onJoined();
    } catch (e: any) {
      setErr(e?.response?.data?.detail || 'Code invalide.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell title="Rejoindre une classe" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Code de la classe">
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            required autoFocus maxLength={12}
            placeholder="ABCDEF"
            style={{
              ...inputStyle,
              fontFamily: 'DM Mono',
              fontSize: 18, fontWeight: 700, letterSpacing: '.12em',
              textAlign: 'center',
            }}
          />
        </Field>
        <p style={{ fontSize: 11, color: '#9391b8' }}>
          Le code te sera donné par ton enseignant·e.
        </p>
        {err && <p style={{ fontSize: 12, color: '#b91c1c' }}>{err}</p>}
        <div className="flex justify-end gap-2 mt-2">
          <button type="button" className="fd-btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" className="fd-btn-primary" disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            Rejoindre
          </button>
        </div>
      </form>
    </ModalShell>
  );
}


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

export default ClassroomsPage;

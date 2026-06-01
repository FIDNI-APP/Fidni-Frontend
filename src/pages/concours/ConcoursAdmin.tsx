/**
 * Superuser-only admin UI for concours exams + tips.
 *
 * Two tabs:
 *  - Exams: CRUD on exams + JSON-based question editor (statement/options/correct/explanation/metadata)
 *  - Tips:  CRUD on tips + video URL or uploaded file via existing FileUpload
 */
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Edit, Trash2, Loader2, Check, X, ListChecks, Lightbulb, Upload, BarChart3,
} from 'lucide-react';
import {
  CONCOURS_TYPES,
  listConcoursExams, createConcoursExam, updateConcoursExam, deleteConcoursExam,
  listConcoursTips, createConcoursTip, updateConcoursTip, deleteConcoursTip,
  type ConcoursType, type ConcoursExamListItem, type ConcoursTip,
} from '@/lib/api/concoursApi';
import { useAuth } from '@/contexts/AuthContext';
import { SEO } from '@/components/layout/SEO';
import { FileUpload } from '@/components/common/FileUpload';
import CompactTipTapEditor from '@/components/editor/CompactTipTapEditor';
import { TaxonomyPicker, MultiChapterPicker } from './TaxonomyPicker';
import StatsAdmin from './ConcoursStatsAdmin';

export default function ConcoursAdminPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<'exams' | 'tips' | 'stats'>('exams');

  if (!user?.is_superuser) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0effe' }} className="flex items-center justify-center">
        <div className="fd-card p-8 text-center max-w-md">
          <p style={{ color: '#7068a8' }}>Accès réservé aux administrateurs.</p>
          <Link to="/concours" className="fd-btn-primary mt-4 inline-flex">Retour</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0effe' }}>
      <SEO title="Admin Concours - Fidni" description="" />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <button onClick={() => navigate('/concours')} className="fd-btn-ghost mb-3"
                style={{ padding: '5px 10px', fontSize: 12 }}>
          <ArrowLeft className="w-3 h-3" /> Concours
        </button>

        <div className="mb-5">
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.03em' }}>
            Administration des concours
          </h1>
          <p style={{ fontSize: 13, color: '#7068a8', marginTop: 4 }}>
            Gère les annales, les questions, et les astuces.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-5">
          <button onClick={() => setTab('exams')}
                  className={`fd-pill ${tab === 'exams' ? 'is-active' : ''}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ListChecks className="w-3 h-3" /> Examens
          </button>
          <button onClick={() => setTab('tips')}
                  className={`fd-pill ${tab === 'tips' ? 'is-active' : ''}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Lightbulb className="w-3 h-3" /> Astuces
          </button>
          <button onClick={() => setTab('stats')}
                  className={`fd-pill ${tab === 'stats' ? 'is-active' : ''}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <BarChart3 className="w-3 h-3" /> Statistiques
          </button>
        </div>

        {tab === 'exams' ? <ExamsAdmin /> : tab === 'tips' ? <TipsAdmin /> : <StatsAdmin />}
      </div>
    </div>
  );
}

/* ─────────────────── Exams admin ─────────────────── */

function ExamsAdmin() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<ConcoursExamListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMeta, setEditingMeta] = useState<ConcoursExamListItem | 'new' | null>(null);

  const refresh = async () => {
    try { setLoading(true); setExams(await listConcoursExams()); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);

  const onDelete = async (e: ConcoursExamListItem) => {
    if (!window.confirm(`Supprimer "${e.title}" ? Tous les résultats associés seront détachés.`)) return;
    await deleteConcoursExam(e.id);
    await refresh();
  };

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e1b4b' }}>
          Examens <span style={{ color: '#9391b8', fontSize: 13, fontWeight: 500, fontFamily: 'DM Mono' }}>· {exams.length}</span>
        </h2>
        <button className="fd-btn-primary" onClick={() => setEditingMeta('new')}>
          <Plus className="w-4 h-4" /> Nouvel examen
        </button>
      </div>

      {loading ? (
        <div className="text-center" style={{ padding: 40 }}>
          <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: '#4f46e5' }} />
        </div>
      ) : exams.length === 0 ? (
        <div className="fd-card text-center" style={{ padding: 40 }}>
          <p style={{ color: '#7068a8' }}>Aucun examen.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {exams.map(e => (
            <div key={e.id} className="fd-card flex items-center gap-3" style={{ padding: '12px 16px' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{
                    background: '#eef2ff', color: '#4338ca',
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                    letterSpacing: '.04em',
                  }}>
                    {e.concours_type_display.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b' }}>
                    {e.title}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1" style={{ fontSize: 11, color: '#9391b8' }}>
                  <span>{e.question_count} questions</span>
                  <span>·</span>
                  <span>{e.duration_minutes} min</span>
                </div>
              </div>
              <button className="fd-btn-ghost" onClick={() => navigate(`/concours/admin/exams/${e.id}/questions`)}>
                <ListChecks className="w-3.5 h-3.5" /> Questions
              </button>
              <button className="fd-btn-ghost" onClick={() => setEditingMeta(e)}>
                <Edit className="w-3.5 h-3.5" /> Modifier
              </button>
              <button className="fd-btn-ghost" style={{ color: '#b91c1c' }} onClick={() => onDelete(e)}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {editingMeta && (
        <ExamMetaModal
          exam={editingMeta === 'new' ? null : editingMeta}
          onClose={() => setEditingMeta(null)}
          onSaved={async () => { setEditingMeta(null); await refresh(); }}
        />
      )}
    </>
  );
}

function ExamMetaModal({ exam, onClose, onSaved }: {
  exam: ConcoursExamListItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [concoursType, setConcoursType] = useState<ConcoursType>(exam?.concours_type ?? 'ensa');
  const [year, setYear] = useState<number>(exam?.year ?? new Date().getFullYear());
  const [title, setTitle] = useState(exam?.title ?? '');
  const [description, setDescription] = useState(exam?.description ?? '');
  const [duration, setDuration] = useState<number>(exam?.duration_minutes ?? 180);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    try {
      setBusy(true); setErr('');
      const payload = { concours_type: concoursType, year, title, description, duration_minutes: duration };
      if (exam) await updateConcoursExam(exam.id, payload);
      else      await createConcoursExam(payload);
      onSaved();
    } catch (e: any) {
      setErr(e?.response?.data?.detail || JSON.stringify(e?.response?.data) || 'Erreur');
    } finally { setBusy(false); }
  };

  return (
    <Modal onClose={onClose} title={exam ? 'Modifier l\'examen' : 'Nouvel examen'}>
      <Field label="Concours">
        <select value={concoursType} onChange={(e) => setConcoursType(e.target.value as ConcoursType)} style={inputStyle}>
          {CONCOURS_TYPES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </Field>
      <Field label="Année">
        <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} style={inputStyle} />
      </Field>
      <Field label="Titre (optionnel)">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${CONCOURS_TYPES.find(c => c.id === concoursType)?.label} ${year}`} style={inputStyle} />
      </Field>
      <Field label="Description">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }} />
      </Field>
      <Field label="Durée (minutes)">
        <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} style={inputStyle} />
      </Field>
      {err && <p style={{ fontSize: 12, color: '#b91c1c' }}>{err}</p>}
      <div className="flex justify-end gap-2 mt-4">
        <button className="fd-btn-ghost" onClick={onClose}>Annuler</button>
        <button className="fd-btn-primary" onClick={save} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Enregistrer
        </button>
      </div>
    </Modal>
  );
}

/* ─────────────────── Tips admin ─────────────────── */

function TipsAdmin() {
  const [tips, setTips] = useState<ConcoursTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ConcoursTip | 'new' | null>(null);

  const refresh = async () => {
    try { setLoading(true); setTips(await listConcoursTips()); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);

  const onDelete = async (t: ConcoursTip) => {
    if (!window.confirm(`Supprimer "${t.title}" ?`)) return;
    await deleteConcoursTip(t.id);
    await refresh();
  };

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e1b4b' }}>
          Astuces <span style={{ color: '#9391b8', fontSize: 13, fontWeight: 500, fontFamily: 'DM Mono' }}>· {tips.length}</span>
        </h2>
        <button className="fd-btn-primary" onClick={() => setEditing('new')}>
          <Plus className="w-4 h-4" /> Nouvelle astuce
        </button>
      </div>

      {loading ? (
        <div className="text-center" style={{ padding: 40 }}>
          <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: '#4f46e5' }} />
        </div>
      ) : tips.length === 0 ? (
        <div className="fd-card text-center" style={{ padding: 40 }}>
          <p style={{ color: '#7068a8' }}>Aucune astuce.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tips.map(t => (
            <div key={t.id} className="fd-card flex items-start gap-3" style={{ padding: '14px 16px' }}>
              <div
                className="inline-flex items-center justify-center flex-shrink-0"
                style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', color: '#fff',
                }}
              >
                <Lightbulb className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b' }}>{t.title}</div>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  {t.subject_name && <span style={{ fontSize: 10, color: '#4338ca', background: '#eef2ff', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>{t.subject_name}</span>}
                  {t.subfield_name && <span style={{ fontSize: 10, color: '#7068a8', background: '#f5f4ff', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>{t.subfield_name}</span>}
                  {(t.video_url || t.video_file) && <span style={{ fontSize: 10, color: '#a16207', background: '#fef3c7', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>VIDÉO</span>}
                </div>
              </div>
              <button className="fd-btn-ghost" onClick={() => setEditing(t)}>
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button className="fd-btn-ghost" style={{ color: '#b91c1c' }} onClick={() => onDelete(t)}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <TipModal
          tip={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await refresh(); }}
        />
      )}
    </>
  );
}

function TipModal({ tip, onClose, onSaved }: {
  tip: ConcoursTip | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(tip?.title ?? '');
  const [description, setDescription] = useState(tip?.description ?? '');
  const [concoursTypes, setConcoursTypes] = useState<ConcoursType[]>(tip?.concours_types ?? []);
  const [subjectId, setSubjectId] = useState<number | null>(tip?.subject_id ?? tip?.subject ?? null);
  const [subfieldId, setSubfieldId] = useState<number | null>(tip?.subfield_id ?? tip?.subfield ?? null);
  const [chapterIds, setChapterIds] = useState<number[]>(tip?.chapter_ids ?? tip?.chapters ?? []);
  const [videoUrl, setVideoUrl] = useState(tip?.video_url ?? '');
  const [videoFileId, setVideoFileId] = useState<string | null>(tip?.video_file?.id ?? null);
  const [videoFileName, setVideoFileName] = useState<string | null>(tip?.video_file?.file_name ?? null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const toggleConcours = (c: ConcoursType) => {
    setConcoursTypes(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  const save = async () => {
    if (!title.trim()) { setErr('Titre requis.'); return; }
    try {
      setBusy(true); setErr('');
      const payload: any = {
        title, description, concours_types: concoursTypes,
        subject_id: subjectId || null,
        subfield_id: subfieldId || null,
        chapter_ids: chapterIds,
        video_url: videoUrl,
        video_file_id: videoFileId,
      };
      if (tip) await updateConcoursTip(tip.id, payload);
      else     await createConcoursTip(payload);
      onSaved();
    } catch (e: any) {
      setErr(e?.response?.data?.detail || JSON.stringify(e?.response?.data) || 'Erreur');
    } finally { setBusy(false); }
  };

  return (
    <Modal onClose={onClose} title={tip ? 'Modifier l\'astuce' : 'Nouvelle astuce'} wide>
      <Field label="Titre">
        <input value={title} onChange={(e) => setTitle(e.target.value)} required style={inputStyle} />
      </Field>
      <Field label="Description">
        <CompactTipTapEditor
          content={description}
          onChange={setDescription}
          placeholder="Décris l'astuce…"
          minHeight="120px"
        />
      </Field>

      <Field label="Concours (un ou plusieurs)">
        <div className="flex items-center gap-2 flex-wrap">
          {CONCOURS_TYPES.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleConcours(c.id)}
              className={`fd-pill ${concoursTypes.includes(c.id) ? 'is-active' : ''}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </Field>

      {/* Cascading subject → subfield (single-chapter select hidden — multi-chapter below) */}
      <TaxonomyPicker
        value={{ subjectId, subfieldId, chapterId: null, tipId: null }}
        onChange={(v) => {
          setSubjectId(v.subjectId);
          setSubfieldId(v.subfieldId);
        }}
        showChapter={false}
        showTip={false}
        layout="grid"
      />

      <Field label="Chapitres (multi-sélection)">
        <MultiChapterPicker
          subjectId={subjectId}
          subfieldId={subfieldId}
          chapterIds={chapterIds}
          onChange={setChapterIds}
        />
      </Field>

      <Field label="URL vidéo (YouTube, Vimeo, ...)">
        <input
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          style={inputStyle}
        />
      </Field>

      <Field label="OU vidéo uploadée">
        {videoFileId ? (
          <div className="flex items-center gap-2" style={{ background: '#f9f8ff', border: '1px solid #ede9fe', padding: 10, borderRadius: 10 }}>
            <Upload className="w-4 h-4" style={{ color: '#4338ca' }} />
            <span style={{ fontSize: 13, color: '#1e1b4b', flex: 1 }}>{videoFileName || videoFileId}</span>
            <button
              onClick={() => { setVideoFileId(null); setVideoFileName(null); }}
              className="fd-btn-ghost"
              style={{ padding: 4, color: '#b91c1c' }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <FileUpload
            accept="video/*"
            maxSizeMB={500}
            onUploadComplete={(file) => {
              setVideoFileId(String(file.id));
              setVideoFileName(file.file_name);
            }}
            onUploadError={(e) => setErr(e)}
          />
        )}
      </Field>

      {err && <p style={{ fontSize: 12, color: '#b91c1c' }}>{err}</p>}

      <div className="flex justify-end gap-2 mt-4">
        <button className="fd-btn-ghost" onClick={onClose}>Annuler</button>
        <button className="fd-btn-primary" onClick={save} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Enregistrer
        </button>
      </div>
    </Modal>
  );
}

/* ───── shared modal helpers ───── */

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
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
      <span style={{ fontSize: 11, color: '#7068a8', fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
}

function Modal({ onClose, title, children, wide }: {
  onClose: () => void; title: string; children: React.ReactNode; wide?: boolean;
}) {
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
        style={{
          width: '100%',
          maxWidth: wide ? 880 : 540,
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: 22,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e1b4b' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#7068a8' }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

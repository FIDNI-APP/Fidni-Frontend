/**
 * Tips browser (list) and detail view with video player.
 * Routes:
 *   /concours/tips         → list with filters
 *   /concours/tips/:id     → detail
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConcoursHero } from './ConcoursHero';
import {
  ArrowLeft, Lightbulb, Loader2, Search, Bookmark, ThumbsUp, ThumbsDown,
  Eye, MessageSquare, Trash2, Play,
} from 'lucide-react';
import {
  CONCOURS_TYPES, listConcoursTips, getConcoursTip, toggleSaveTip, voteTip,
  listTipComments, postTipComment, deleteConcoursComment,
  type ConcoursType, type ConcoursTip, type ConcoursComment,
} from '@/lib/api/concoursApi';
import { getSubjects } from '@/lib/api/hierarchyApi';
import { useAuth } from '@/contexts/AuthContext';
import { SEO } from '@/components/layout/SEO';
import type { SubjectModel } from '@/types';

/* ───────────────── List page ───────────────── */

export function ConcoursTipsListPage() {
  const [tips, setTips] = useState<ConcoursTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<ConcoursType | null>(null);
  const [filterSubjectId, setFilterSubjectId] = useState<number | null>(null);
  const [subjects, setSubjects] = useState<SubjectModel[]>([]);

  useEffect(() => {
    (async () => {
      try { setSubjects(await getSubjects()); } catch (e) { console.error(e); }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const params: any = {};
        if (filterType) params.concours_type = filterType;
        if (filterSubjectId) params.subject = filterSubjectId;
        if (search.trim()) params.search = search.trim();
        const data = await listConcoursTips(params);
        setTips(data);
      } finally { setLoading(false); }
    })();
  }, [filterType, filterSubjectId, search]);

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7ff' }}>
      <SEO title="Astuces - Concours - Fidni" description="Astuces et techniques pour les concours" />
      <style>{`
        .tip-card:hover { transform: translateY(-3px); box-shadow: 0 14px 34px rgba(90,70,200,.14) !important; }
      `}</style>

      <ConcoursHero
        icon={Lightbulb}
        badge="ASTUCES"
        title="Astuces & techniques"
        subtitle="Maîtrise les techniques clés pour répondre vite et juste le jour J."
      />

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap mb-6">
          {/* Search */}
          <div className="flex items-center gap-2" style={{
            background: '#fff', border: '1.5px solid #e4e2f5',
            borderRadius: 10, padding: '7px 14px', minWidth: 200,
          }}>
            <Search className="w-3.5 h-3.5" style={{ color: '#9391b8', flexShrink: 0 }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              style={{
                flex: 1, border: 'none', outline: 'none',
                background: 'transparent', fontSize: 13, color: '#1e1b4b',
              }}
            />
          </div>
          {/* Concours filter */}
          <button className={`fd-pill ${!filterType ? 'is-active' : ''}`} onClick={() => setFilterType(null)}>
            Tous
          </button>
          {CONCOURS_TYPES.map(c => (
            <button
              key={c.id}
              className={`fd-pill ${filterType === c.id ? 'is-active' : ''}`}
              onClick={() => setFilterType(c.id)}
            >
              {c.label}
            </button>
          ))}
          {/* Subject select */}
          <select
            value={filterSubjectId ?? ''}
            onChange={(e) => setFilterSubjectId(e.target.value ? Number(e.target.value) : null)}
            style={{
              padding: '7px 14px', borderRadius: 10,
              border: '1.5px solid #e4e2f5', background: '#fff',
              fontSize: 12, color: '#7068a8', outline: 'none',
            }}
          >
            <option value="">Toutes matières</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {/* Count */}
        {!loading && tips.length > 0 && (
          <p style={{ fontSize: 12, color: '#9391b8', marginBottom: 16, fontFamily: 'DM Mono' }}>
            {tips.length} astuce{tips.length !== 1 ? 's' : ''}
          </p>
        )}

        {/* List */}
        {loading ? (
          <div className="flex justify-center" style={{ padding: '80px 0' }}>
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#4f46e5' }} />
          </div>
        ) : tips.length === 0 ? (
          <div className="fd-card text-center" style={{ padding: 56 }}>
            <Lightbulb className="w-9 h-9 mx-auto mb-3" style={{ color: '#c4c0e8' }} />
            <p style={{ fontSize: 14, color: '#7068a8' }}>Aucune astuce trouvée.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tips.map(t => (
              <Link
                key={t.id}
                to={`/concours/tips/${t.id}`}
                className="tip-card animate-fade-up"
                style={{
                  overflow: 'hidden', textDecoration: 'none', display: 'flex', flexDirection: 'column',
                  background: '#fff', borderRadius: 18, border: '1px solid #ece9fb',
                  boxShadow: '0 2px 10px rgba(90,70,200,.05)',
                  transition: 'transform .2s, box-shadow .2s',
                }}
              >
                {/* Amber banner */}
                <div style={{
                  position: 'relative', overflow: 'hidden', padding: '16px 18px',
                  background: 'linear-gradient(120deg,#fbbf24,#f59e0b)',
                }}>
                  <div style={{
                    position: 'absolute', right: -24, top: -24, width: 96, height: 96,
                    borderRadius: '50%', background: 'rgba(255,255,255,.16)',
                  }} />
                  <div className="relative flex items-center justify-between">
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                      background: 'rgba(255,255,255,.92)', color: '#d97706',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,.1)',
                    }}>
                      <Lightbulb className="w-5 h-5" />
                    </div>
                    {(t.video_url || t.video_file) && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        background: 'rgba(30,27,75,.85)', color: '#fff',
                        fontSize: 9, fontWeight: 700, padding: '4px 9px', borderRadius: 99,
                        letterSpacing: '.06em', flexShrink: 0, backdropFilter: 'blur(4px)',
                      }}>
                        <Play className="w-2 h-2" /> VIDÉO
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 flex flex-col gap-2 flex-1">
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b', lineHeight: 1.35, letterSpacing: '-0.01em' }}>
                    {t.title}
                  </h3>
                  {t.description && (
                    <p style={{ fontSize: 12, color: '#7068a8', lineHeight: 1.5 }} className="line-clamp-2">
                      {t.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 flex-wrap mt-auto pt-3" style={{ borderTop: '1px solid #f0effe' }}>
                    {t.subject_name && (
                      <span style={{ background: '#eef2ff', color: '#4338ca', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>
                        {t.subject_name}
                      </span>
                    )}
                    <div className="flex items-center gap-2 ml-auto" style={{ fontSize: 11, color: '#9391b8' }}>
                      <span className="inline-flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" /> {t.vote_count}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {t.view_count}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────── Detail page ───────────────── */

function getEmbedUrl(url: string): string | null {
  // YouTube
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  // Vimeo
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

export function ConcoursTipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tip, setTip] = useState<ConcoursTip | null>(null);
  const [loading, setLoading] = useState(true);
  const [busySave, setBusySave] = useState(false);
  const [busyVote, setBusyVote] = useState(false);

  const refresh = async () => {
    if (!id) return;
    try { setLoading(true); setTip(await getConcoursTip(id)); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, [id]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f7ff' }} className="flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#4f46e5' }} />
      </div>
    );
  }
  if (!tip) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f7ff' }} className="flex items-center justify-center">
        <div className="fd-card p-8 text-center">
          <p style={{ color: '#7068a8' }}>Astuce introuvable.</p>
          <Link to="/concours/tips" className="fd-btn-primary mt-4 inline-flex">Retour</Link>
        </div>
      </div>
    );
  }

  const onSave = async () => {
    if (busySave) return;
    setBusySave(true);
    try { const r = await toggleSaveTip(tip.id); setTip({ ...tip, is_saved: r.is_saved }); }
    finally { setBusySave(false); }
  };

  const onVote = async (delta: 1 | -1) => {
    if (busyVote) return;
    const newValue = tip.user_vote === delta ? 0 : delta;
    setBusyVote(true);
    try {
      const r = await voteTip(tip.id, newValue as 1 | 0 | -1);
      setTip({ ...tip, vote_count: r.vote_count, user_vote: r.user_vote });
    } finally { setBusyVote(false); }
  };

  const embedUrl = tip.video_url ? getEmbedUrl(tip.video_url) : null;
  const directVideoSrc = tip.video_file?.url || (tip.video_url && !embedUrl ? tip.video_url : null);

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7ff' }}>
      <SEO title={`${tip.title} - Astuces - Fidni`} description={tip.description} />

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
        <button onClick={() => navigate('/concours/tips')} className="fd-btn-ghost mb-3"
                style={{ padding: '5px 10px', fontSize: 12 }}>
          <ArrowLeft className="w-3 h-3" /> Astuces
        </button>

        <div className="fd-card overflow-hidden mb-5 animate-fade-up">
          {/* Video */}
          {embedUrl ? (
            <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000' }}>
              <iframe
                src={embedUrl}
                title={tip.title}
                frameBorder={0}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
              />
            </div>
          ) : directVideoSrc ? (
            <video
              src={directVideoSrc}
              controls
              style={{ width: '100%', display: 'block', background: '#000', maxHeight: 480 }}
            />
          ) : (
            <div
              style={{
                background: 'linear-gradient(135deg,#fbbf24,#f59e0b)',
                padding: 60, textAlign: 'center', color: '#fff',
              }}
            >
              <Lightbulb className="w-12 h-12 mx-auto mb-2" />
              <p style={{ fontSize: 13, opacity: .9 }}>Pas de vidéo disponible pour cette astuce.</p>
            </div>
          )}

          {/* Body */}
          <div className="p-6">
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.03em' }}>
              {tip.title}
            </h1>
            <div className="flex items-center gap-2 flex-wrap mt-3">
              {tip.subject_name && (
                <span style={{ background: '#eef2ff', color: '#4338ca', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99 }}>
                  {tip.subject_name}
                </span>
              )}
              {tip.subfield_name && (
                <span style={{ background: '#f5f4ff', color: '#7068a8', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99 }}>
                  {tip.subfield_name}
                </span>
              )}
              {tip.chapter_names?.map(n => (
                <span key={n} style={{ background: '#fef3c7', color: '#a16207', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99 }}>
                  {n}
                </span>
              ))}
            </div>
            {tip.description && (
              <div
                style={{ fontSize: 14, color: '#4b4880', lineHeight: 1.7, marginTop: 14, whiteSpace: 'pre-wrap' }}
              >
                {tip.description}
              </div>
            )}

            {/* Action bar */}
            <div className="flex items-center gap-2 mt-5 pt-4" style={{ borderTop: '1px solid #f0effe' }}>
              <div
                className="inline-flex items-center"
                style={{
                  background: '#f5f4ff', border: '1px solid #ede9fe',
                  borderRadius: 99, padding: 2,
                }}
              >
                <button
                  onClick={() => onVote(1)}
                  disabled={busyVote}
                  style={{
                    padding: '5px 9px', borderRadius: 99, border: 'none', cursor: 'pointer',
                    background: tip.user_vote === 1 ? '#4f46e5' : 'transparent',
                    color: tip.user_vote === 1 ? '#fff' : '#7068a8',
                  }}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'DM Mono', minWidth: 30, textAlign: 'center', color: '#1e1b4b' }}>
                  {tip.vote_count}
                </span>
                <button
                  onClick={() => onVote(-1)}
                  disabled={busyVote}
                  style={{
                    padding: '5px 9px', borderRadius: 99, border: 'none', cursor: 'pointer',
                    background: tip.user_vote === -1 ? '#dc2626' : 'transparent',
                    color: tip.user_vote === -1 ? '#fff' : '#7068a8',
                  }}
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
              </div>
              <button onClick={onSave} className="fd-btn-ghost"
                      style={{
                        background: tip.is_saved ? '#fef3c7' : '#fff',
                        color: tip.is_saved ? '#a16207' : '#7068a8',
                        borderColor: tip.is_saved ? '#fde68a' : '#e4e2f5',
                      }}>
                {busySave ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Bookmark className="w-3.5 h-3.5" fill={tip.is_saved ? 'currentColor' : 'none'} />}
                {tip.is_saved ? 'Sauvegardée' : 'Sauvegarder'}
              </button>
              <span style={{ fontSize: 11, color: '#9391b8', marginLeft: 'auto' }}>
                <Eye className="inline w-3 h-3 mr-1" />
                {tip.view_count}
              </span>
            </div>
          </div>
        </div>

        {/* Comments */}
        <div className="fd-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4" style={{ color: '#4338ca' }} />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b' }}>Commentaires</h3>
          </div>
          <TipCommentsBlock tipId={tip.id} currentUserId={user?.id} />
        </div>
      </div>
    </div>
  );
}

function TipCommentsBlock({ tipId, currentUserId }: { tipId: number; currentUserId?: number | string }) {
  const [comments, setComments] = useState<ConcoursComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  const refresh = async () => {
    try { setLoading(true); setComments(await listTipComments(tipId)); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, [tipId]);

  const post = async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    try { await postTipComment(tipId, text.trim()); setText(''); await refresh(); }
    finally { setPosting(false); }
  };

  const remove = async (cid: number) => {
    if (!window.confirm('Supprimer ce commentaire ?')) return;
    await deleteConcoursComment(cid); await refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ton commentaire…"
          rows={2}
          style={{
            flex: 1, padding: '10px 12px', borderRadius: 10,
            border: '1.5px solid #e4e2f5', background: '#f9f8ff',
            fontSize: 13, fontFamily: 'DM Sans', color: '#1e1b4b',
            outline: 'none', resize: 'vertical', minHeight: 60,
          }}
        />
        <button onClick={post} disabled={!text.trim() || posting} className="fd-btn-primary"
                style={{ alignSelf: 'flex-end' }}>
          {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publier'}
        </button>
      </div>
      {loading ? (
        <div className="text-center" style={{ padding: 12 }}>
          <Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: '#4f46e5' }} />
        </div>
      ) : comments.length === 0 ? (
        <p style={{ fontSize: 12, color: '#9391b8', fontStyle: 'italic' }}>Aucun commentaire.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {comments.map(c => (
            <div key={c.id} className="flex gap-3" style={{
              background: '#f9f8ff', border: '1px solid #ede9fe',
              borderRadius: 10, padding: 12,
            }}>
              {c.author.avatar
                ? <img src={c.author.avatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                : <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#4f46e5,#818cf8)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                  }}>{c.author.username[0]?.toUpperCase()}</div>}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1e1b4b' }}>{c.author.username}</span>
                  <span style={{ fontSize: 10, color: '#9391b8' }}>{new Date(c.created_at).toLocaleString('fr-FR')}</span>
                </div>
                <p style={{ fontSize: 13, color: '#4b4880', marginTop: 4, whiteSpace: 'pre-wrap' }}>{c.content}</p>
              </div>
              {(currentUserId !== undefined && Number(currentUserId) === c.author.id) && (
                <button onClick={() => remove(c.id)}
                        style={{ background: 'transparent', border: 'none', color: '#b91c1c', cursor: 'pointer' }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

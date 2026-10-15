/**
 * Astuces des concours : liste (avec filtres) et page d'une astuce (vidéo, votes, commentaires).
 * Routes :
 *   /concours/tips         → liste
 *   /concours/tips/:id     → détail
 * Refonte du 11/10/2026 : en-tête commun des concours, cartes sobres (plus de bandeau ambre),
 * filtres montrés seulement quand il y a des astuces, états vides utiles.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useScrollToHash } from '@/hooks/useScrollToHash';
import {
  Bookmark, Eye, Landmark, Lightbulb, Loader2, MessageSquare, Play, Search, SearchX, ThumbsDown, ThumbsUp, Trash2,
} from 'lucide-react';
import {
  CONCOURS_TYPES, listConcoursTips, getConcoursTip, toggleSaveTip, voteTip,
  listTipComments, postTipComment, deleteConcoursComment,
  type ConcoursType, type ConcoursTip, type ConcoursComment,
} from '@/lib/api/concoursApi';
import { getSubjects } from '@/lib/api/hierarchyApi';
import { useAuth } from '@/contexts/AuthContext';
import { isModerator } from '@/lib/features';
import { SEO } from '@/components/layout/SEO';
import { Page, PageHeader, Section, EmptyState, CardLink, CardsSkeleton } from '@/components/space/Page';
import type { SubjectModel } from '@/types';
import { ConcoursHeader } from './ConcoursHeader';
import { t, dateLocale } from '@/i18n';

/* ───────────────── Liste ───────────────── */

const TipCard: React.FC<{ tip: ConcoursTip }> = ({ tip }) => (
  <li>
    <CardLink to={`/concours/tips/${tip.id}`} className="h-full">
      <span className="flex h-full flex-col">
        <span className="flex items-center justify-between gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-soft text-gold-strong" aria-hidden>
            <Lightbulb className="h-4 w-4" />
          </span>
          {(tip.video_url || tip.video_file) && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#f2f1ee] px-2 py-0.5 text-[11.5px] font-semibold text-ink-soft">
              <Play className="h-3 w-3" aria-hidden /> {t('Vidéo')}
            </span>
          )}
        </span>
        <span className="mt-3 block text-[14.5px] font-semibold leading-snug text-ink line-clamp-2">{tip.title}</span>
        {tip.description && <span className="mt-1 block text-[12.5px] leading-relaxed text-ink-faint line-clamp-2">{tip.description}</span>}
        <span className="mt-auto flex items-center gap-2 pt-3 text-[12px] text-ink-faint">
          {tip.subject_name && <span className="truncate rounded-full bg-[#f2f1ee] px-2 py-0.5 text-[11.5px] text-ink-soft">{tip.subject_name}</span>}
          <span className="ms-auto inline-flex shrink-0 items-center gap-1"><ThumbsUp className="h-3 w-3" aria-hidden /> {tip.vote_count}<span className="sr-only"> {t('votes')}</span></span>
          <span className="inline-flex shrink-0 items-center gap-1"><Eye className="h-3 w-3" aria-hidden /> {tip.view_count}<span className="sr-only"> {t('vues')}</span></span>
        </span>
      </span>
    </CardLink>
  </li>
);

export function ConcoursTipsListPage() {
  const [tips, setTips] = useState<ConcoursTip[] | null>(null);
  /** Nombre d'astuces sans filtre (premier chargement) : sans astuce, pas de filtres à montrer. */
  const [total, setTotal] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<ConcoursType | null>(null);
  const [filterSubjectId, setFilterSubjectId] = useState<number | null>(null);
  const [subjects, setSubjects] = useState<SubjectModel[]>([]);

  useEffect(() => {
    getSubjects().then(setSubjects).catch((e) => console.error(e));
  }, []);

  // La recherche part quand on s'arrête de taper (plus une requête par lettre).
  useEffect(() => {
    const t = window.setTimeout(() => setQuery(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let alive = true;
    setTips(null);
    const params: { concours_type?: ConcoursType; subject?: number; search?: string } = {};
    if (filterType) params.concours_type = filterType;
    if (filterSubjectId) params.subject = filterSubjectId;
    if (query) params.search = query;
    listConcoursTips(params)
      .then((data) => {
        if (!alive) return;
        setTips(data);
        if (!filterType && !filterSubjectId && !query) setTotal(data.length);
      })
      .catch((e) => { console.error(e); if (alive) setTips([]); });
    return () => { alive = false; };
  }, [filterType, filterSubjectId, query]);

  const filtered = !!(filterType || filterSubjectId || query);
  const clear = () => { setSearch(''); setQuery(''); setFilterType(null); setFilterSubjectId(null); };
  const chip = (active: boolean) => `inline-flex min-h-10 items-center rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${
    active ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-faint hover:border-[#cfc9bf] hover:text-ink'}`;

  return (
    <Page>
      <SEO title={t('Astuces - Concours - Fidni')} description={t('Astuces et techniques pour les concours')} noindex={tips !== null && !total && !filtered} />
      <ConcoursHeader />

      <Section id="astuces" title={t('Astuces')} count={tips?.length}
        hint={total ? t('Les techniques pour répondre vite et juste le jour J.') : undefined}>
        {(!!total || filtered) && (
          <div className="mb-5 flex flex-col gap-3">
            <label className="flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-3.5 focus-within:border-ink-faint sm:max-w-sm">
              <Search className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
              <span className="sr-only">{t('Rechercher une astuce')}</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('Rechercher une astuce…')}
                className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-faint" />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('Filtrer par concours')}>
                <button type="button" aria-pressed={!filterType} className={chip(!filterType)} onClick={() => setFilterType(null)}>{t('Tous')}</button>
                {CONCOURS_TYPES.map((c) => (
                  <button key={c.id} type="button" aria-pressed={filterType === c.id} className={chip(filterType === c.id)} onClick={() => setFilterType(c.id)}>
                    {t(c.label)}
                  </button>
                ))}
              </div>
              <select value={filterSubjectId ?? ''} aria-label={t('Matière')}
                onChange={(e) => setFilterSubjectId(e.target.value ? Number(e.target.value) : null)}
                className="min-h-10 rounded-full border border-line bg-white px-3.5 text-[13px] text-ink-soft focus:border-ink-faint focus:outline-none">
                <option value="">{t('Toutes les matières')}</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        )}

        {tips === null ? <CardsSkeleton n={3} className="sm:grid-cols-2 lg:grid-cols-3" />
          : tips.length === 0 ? (
            filtered ? (
              <EmptyState compact icon={SearchX} tone="ink" title={t('Aucune astuce ne correspond')}
                text={t('Essaie un autre mot ou retire un filtre.')}
                action={<button type="button" className="fd-btn-ghost min-h-10" onClick={clear}>{t('Effacer les filtres')}</button>} />
            ) : (
              <EmptyState icon={Lightbulb} tone="gold" title={t('Les astuces arrivent bientôt')}
                text={t('Des techniques courtes, souvent en vidéo, pour gagner du temps le jour du concours. En attendant, entraîne-toi sur le Bac national.')}
                action={(
                  <Link to="/exams/nationaux" className="fd-btn-primary min-h-11">
                    <Landmark className="h-4 w-4" /> {t('Réviser le Bac national')}
                  </Link>
                )} />
            )
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tips.map((t) => <TipCard key={t.id} tip={t} />)}
            </ul>
          )}
      </Section>
    </Page>
  );
}

/* ───────────────── Détail ───────────────── */

function getEmbedUrl(url: string): string | null {
  // YouTube
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]+)/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;  // sans cookie publicitaire (RGPD)
  // Vimeo
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

export function ConcoursTipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [tip, setTip] = useState<ConcoursTip | null>(null);
  useScrollToHash(!!tip);  // « #commentaires » : lien d'une notification
  const [loading, setLoading] = useState(true);
  const [busySave, setBusySave] = useState(false);
  const [busyVote, setBusyVote] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);
    getConcoursTip(id)
      .then((t) => { if (alive) setTip(t); })
      .catch((e) => { console.error(e); if (alive) setTip(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  if (loading) {
    return (
      <Page width="narrow">
        <CardsSkeleton n={2} />
      </Page>
    );
  }
  if (!tip) {
    return (
      <Page width="narrow">
        <PageHeader back={{ to: '/concours/tips', label: t('Astuces') }} title={t('Astuce introuvable')} />
        <EmptyState icon={SearchX} tone="ink" title={t('Cette astuce n’existe plus')}
          text={t('Elle a peut-être été retirée. Les autres t’attendent dans la liste.')}
          action={<Link to="/concours/tips" className="fd-btn-primary min-h-10">{t('Voir les astuces')}</Link>} />
      </Page>
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
    <Page width="narrow">
      <SEO title={t('{title} - Astuces - Fidni', { title: tip.title })} description={tip.description} />
      <PageHeader back={{ to: '/concours/tips', label: t('Astuces') }} eyebrow={t('Astuce')} icon={Lightbulb} title={tip.title} />

      <div className="flex flex-col gap-10">
        <article className="overflow-hidden rounded-3xl border border-line bg-white">
          {embedUrl ? (
            <div className="relative bg-black pb-[56.25%]">
              <iframe
                src={embedUrl}
                title={tip.title}
                frameBorder={0}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>
          ) : directVideoSrc ? (
            <video src={directVideoSrc} controls className="block max-h-[480px] w-full bg-black" />
          ) : (
            <div className="flex items-center gap-3 border-b border-line bg-gold-soft px-5 py-4 text-gold-strong">
              <Lightbulb className="h-5 w-5 shrink-0" aria-hidden />
              <p className="text-[13px] font-medium">{t('Pas de vidéo pour cette astuce : tout est dans le texte.')}</p>
            </div>
          )}

          <div className="p-5 sm:p-6">
            {(tip.subject_name || tip.subfield_name || !!tip.chapter_names?.length) && (
              <ul className="mb-4 flex flex-wrap gap-1.5" aria-label={t('Programme')}>
                {tip.subject_name && <li className="rounded-full bg-[#f2f1ee] px-2.5 py-1 text-[12px] font-semibold text-ink-soft">{tip.subject_name}</li>}
                {tip.subfield_name && <li className="rounded-full bg-[#f7f6f3] px-2.5 py-1 text-[12px] text-ink-faint">{tip.subfield_name}</li>}
                {tip.chapter_names?.map((n) => (
                  <li key={n} className="rounded-full bg-gold-soft px-2.5 py-1 text-[12px] font-medium text-gold-strong">{n}</li>
                ))}
              </ul>
            )}
            {tip.description && (
              <div className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-ink-soft">{tip.description}</div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <div className="inline-flex items-center rounded-full border border-line bg-[#f7f6f3] p-0.5" role="group" aria-label={t('Voter')}>
                <button type="button" onClick={() => onVote(1)} disabled={busyVote} aria-pressed={tip.user_vote === 1} aria-label={t('Utile')}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors ${tip.user_vote === 1 ? 'bg-ink text-white' : 'text-ink-faint hover:text-ink'}`}>
                  <ThumbsUp className="h-4 w-4" />
                </button>
                <span className="fd-nums min-w-[30px] text-center text-[13px] font-bold text-ink">{tip.vote_count}</span>
                <button type="button" onClick={() => onVote(-1)} disabled={busyVote} aria-pressed={tip.user_vote === -1} aria-label={t('Pas utile')}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors ${tip.user_vote === -1 ? 'bg-[#a23b34] text-white' : 'text-ink-faint hover:text-ink'}`}>
                  <ThumbsDown className="h-4 w-4" />
                </button>
              </div>
              <button type="button" onClick={onSave} aria-pressed={tip.is_saved}
                className={`fd-btn-ghost min-h-10 ${tip.is_saved ? '!border-gold-line !bg-gold-soft !text-gold-strong' : ''}`}>
                {busySave ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Bookmark className="h-4 w-4" fill={tip.is_saved ? 'currentColor' : 'none'} />}
                {tip.is_saved ? t('Enregistrée') : t('Enregistrer')}
              </button>
              <span className="ms-auto inline-flex items-center gap-1 text-[12px] text-ink-faint">
                <Eye className="h-3.5 w-3.5" aria-hidden /> {tip.view_count}<span className="sr-only"> {t('vues')}</span>
              </span>
            </div>
          </div>
        </article>

        <section id="commentaires" aria-labelledby="commentaires-titre" className="scroll-mt-20">
          <h2 id="commentaires-titre" className="fd-display mb-3 flex items-center gap-2 text-[20px] leading-tight text-ink">
            <MessageSquare className="h-4 w-4 text-ink-faint" aria-hidden /> {t('Commentaires')}
          </h2>
          <TipCommentsBlock tipId={tip.id} currentUserId={user?.id} canModerate={isModerator(user)} />
        </section>
      </div>
    </Page>
  );
}

function TipCommentsBlock({ tipId, currentUserId, canModerate = false }: { tipId: number; currentUserId?: number | string; canModerate?: boolean }) {
  const [comments, setComments] = useState<ConcoursComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  const refresh = useCallback(async () => {
    try { setLoading(true); setComments(await listTipComments(tipId)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [tipId]);
  useEffect(() => { refresh(); }, [refresh]);

  const post = async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    try { await postTipComment(tipId, text.trim()); setText(''); await refresh(); }
    finally { setPosting(false); }
  };

  const remove = async (cid: number) => {
    if (!window.confirm(t('Supprimer ce commentaire ?'))) return;
    await deleteConcoursComment(cid); await refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('Ton commentaire…')}
          aria-label={t('Ton commentaire')}
          rows={2}
          className="min-h-[60px] flex-1 resize-y rounded-xl border border-line bg-white px-3 py-2.5 text-[13.5px] text-ink outline-none focus:border-ink-faint"
        />
        <button type="button" onClick={post} disabled={!text.trim() || posting} className="fd-btn-primary min-h-10 justify-center self-end disabled:opacity-60">
          {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Publier')}
        </button>
      </div>
      {loading ? (
        <CardsSkeleton n={1} />
      ) : comments.length === 0 ? (
        <p className="text-[13px] text-ink-faint">{t('Pas encore de commentaire : pose ta question ou partage ton astuce.')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3 rounded-xl border border-line bg-[#fcfbf9] p-3">
              {c.author.avatar
                ? <img src={c.author.avatar} alt="" className="h-8 w-8 shrink-0 rounded-full" />
                : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-soft text-[12px] font-bold text-white" aria-hidden>
                    {c.author.username[0]?.toUpperCase()}
                  </span>}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12.5px] font-semibold text-ink">{c.author.username}</span>
                  <span className="text-[11px] text-ink-faint">{new Date(c.created_at).toLocaleString(dateLocale())}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-[13.5px] text-ink-soft">{c.content}</p>
              </div>
              {(canModerate || (currentUserId !== undefined && Number(currentUserId) === c.author.id)) && (
                <button type="button" onClick={() => remove(c.id)} aria-label={t('Supprimer ce commentaire')}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-faint hover:bg-[#f2f1ee] hover:text-[#a23b34]">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// /discussions/:id (08/11/2026) : une discussion du forum. Le message d'origine (contenus tagués en cartes, photos, « utile »,
// suivre, partager), les réponses dans l'ordre (« en réponse à @x », « utile », répondre, modifier, supprimer), la zone
// de réponse en bas. Une notification ouvre « #reponse-<id> » : la réponse est mise en valeur. À droite : contenus
// tagués, participants, autres discussions sur le même contenu. Un commentaire n'a pas de page : ses anciens liens mènent à
// l'onglet de son contenu.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Bell, BellOff, ChevronLeft, CornerDownRight, FileIcon, Loader2, Pencil, Share2, Trash2 } from 'lucide-react';
import { Page } from '@/components/space/Page';
import { SEO } from '@/components/layout/SEO';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import { MathText } from '@/components/skilliq/MathText';
import { confirmer } from '@/lib/confirmer';
import { shareLink, publicUrl } from '@/lib/native';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/auth/AuthController';
import {
  deleteDiscussion, deleteReply, getDiscussion, getDiscussions, replyToDiscussion, toggleFollow, updateReply,
  type DiscussionCardData, type DiscussionDetail, type DiscussionReply,
} from '@/lib/api/discussionsApi';
import type { FileAttachment } from '@/types/fileAttachment';
import { MessageComposer } from '@/components/discussions/MessageComposer';
import {
  AuthorName, Avatar, ContentTagCard, RoleBadge, SalonChip, UtileButton, fullDate, timeAgo,
} from '@/components/discussions/parts';
import { t } from '@/i18n';
import { nomAffiche } from '@/lib/nomAffiche';

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Messages repris des anciens commentaires : parfois du texte brut ; les autres sont déjà en HTML. */
const asHtml = (text: string) => (/<(p|ul|ol|br|strong|em|a|span|div)[\s>/]/i.test(text)
  ? text
  : text.split(/\n{2,}/).map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join(''));

const Files: React.FC<{ files: FileAttachment[] }> = ({ files }) => (
  files.length ? (
    <div className="mt-3 flex flex-wrap gap-2">
      {files.map((f) => {
        const href = f.download_url || f.url;
        return f.file_type === 'image' ? (
          <a key={f.id} href={href} target="_blank" rel="noopener noreferrer" title={f.file_name}
            className="block max-w-full overflow-hidden rounded-xl border border-line bg-[#faf9f7] hover:border-[#d8d4cc]">
            <img src={href} alt={f.file_name} loading="lazy" className="block max-h-64 max-w-[min(280px,100%)] object-contain" />
          </a>
        ) : (
          <a key={f.id} href={href} target="_blank" rel="noopener noreferrer"
            className="flex max-w-full items-center gap-2 break-all rounded-lg border border-line bg-[#faf9f7] px-3 py-2 text-[13px] text-ink-soft hover:bg-[#f2f1ee]">
            <FileIcon className="h-4 w-4 text-ink-faint" /> {f.file_name}
          </a>
        );
      })}
    </div>
  ) : null
);

export const DiscussionThread: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { openModal } = useAuthModal();
  const [d, setD] = useState<DiscussionDetail | null>(null);
  const [error, setError] = useState<'404' | 'erreur' | null>(null);
  const [replyTo, setReplyTo] = useState<DiscussionReply | null>(null);
  const [composeRequested, setComposeRequested] = useState(false);
  const composer = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [related, setRelated] = useState<DiscussionCardData[]>([]);
  const [shared, setShared] = useState(false);

  const load = () => getDiscussion(id!)
    .then((x) => { setD(x); setError(null); })
    .catch((e) => setError(e?.response?.status === 404 ? '404' : 'erreur'));

  useEffect(() => {
    setD(null);
    setReplyTo(null);
    setEditing(null);
    setComposeRequested(false);
    load();
  }, [id]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Autres discussions du forum sur le premier contenu tagué.
  useEffect(() => {
    const first = d?.tags[0];
    if (!first || d.genre === 'commentaire') { setRelated([]); return; }
    getDiscussions({ genre: 'forum', contenu: first.id, niveau: 'tous' })
      .then((r) => setRelated(r.results.filter((x) => x.id !== d!.id).slice(0, 4)))
      .catch(() => {});
  }, [d?.id]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Arrivée depuis une notification : la réponse visée.
  useEffect(() => {
    const m = hash.match(/^#reponse-(\d+)$/);
    if (!d || !m) return;
    const rid = Number(m[1]);
    setHighlight(rid);
    const t1 = window.setTimeout(() => document.getElementById(`reponse-${rid}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
    const t2 = window.setTimeout(() => setHighlight(null), 3500);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [d, hash]);

  const participants = useMemo(() => {
    if (!d) return [];
    const seen = new Map<number, DiscussionDetail['author']>();
    [d.author, ...d.replies.map((r) => r.author)].forEach((a) => { if (!a.is_deleted && !seen.has(a.id)) seen.set(a.id, a); });
    return [...seen.values()];
  }, [d]);

  if (error) {
    return (
      <Page width="narrow">
        <div className="mx-auto max-w-md rounded-2xl border border-line bg-white p-8 text-center" role="alert">
          <p className="fd-display text-[20px] text-ink">{error === '404' ? t('Cette discussion n’existe pas ou a été supprimée.') : t('La discussion n’a pas pu être chargée.')}</p>
          <Link to="/discussions" className="fd-btn-primary mt-6 inline-flex min-h-10">{t('Toutes les discussions')}</Link>
        </div>
      </Page>
    );
  }
  if (!d) {
    return <Page width="wide"><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-ink-faint" aria-label={t('Chargement')} /></div></Page>;
  }
  if (d.genre === 'commentaire' && d.tags.length > 0) {
    return <Navigate to={/^#reponse-\d+$/.test(hash) ? `${d.url}${hash}` : d.url} replace />;
  }

  const own = !!user && String(user.id) === String(d.author.id);
  const action = 'inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium text-ink-soft transition-colors hover:bg-[#f2f1ee] hover:text-ink';

  const follow = async () => {
    if (!isAuthenticated) { openModal('discussion'); return; }
    const r = await toggleFollow(d.id).catch(() => null);
    if (r) setD({ ...d, followed: r.followed, followers: r.followers });
  };
  const share = async () => {
    const res = await shareLink({ title: d.title, url: publicUrl(`/discussions/${d.id}`) }).catch(() => 'cancelled' as const);
    if (res !== 'copied') return;
    setShared(true);
    window.setTimeout(() => setShared(false), 2000);
  };
  const remove = async () => {
    if (!await confirmer(t('Supprimer cette discussion et ses réponses ?'), { action: t('Supprimer'), danger: true })) return;
    await deleteDiscussion(d.id).catch(() => {});
    navigate('/discussions');
  };
  const startReply = (r: DiscussionReply | null) => {
    if (!isAuthenticated) { openModal('discussion'); return; }
    setReplyTo(r);
    setComposeRequested(true);
    composer.current?.querySelector<HTMLElement>('[contenteditable="true"]')?.focus({ preventScroll: true });
    composer.current?.scrollIntoView({ block: 'center' });
  };
  const removeReply = async (r: DiscussionReply) => {
    if (!await confirmer(t('Supprimer cette réponse ?'), { action: t('Supprimer'), danger: true })) return;
    await deleteReply(r.id).catch(() => {});
    load();
  };

  return (
    <Page width="wide">
      <SEO title={`${d.title} – Discussions | Fidni`} canonicalUrl={`/discussions/${d.id}`}
        description={d.excerpt || d.title} />
      <Link to={`/discussions?salon=${d.salon}`}
        className="mb-3 inline-flex min-h-10 items-center gap-1 rounded-lg pe-2 text-[13px] font-medium text-ink-faint transition-colors hover:text-ink">
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" /> {t('Discussions')}
      </Link>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_230px] xl:gap-10">
        <div className="min-w-0">
          {/* Message d'origine */}
          <article className="border-t-2 border-ink pt-4 sm:pt-6">
            <div className="flex flex-wrap items-center gap-1.5">
              <SalonChip salon={d.salon} to={`/discussions?salon=${d.salon}`} />
              {d.class_level && <span className="text-[12.5px] text-ink-faint">{d.class_level.name}</span>}
            </div>
            <h1 dir="auto" className="fd-display mt-3 max-w-[34ch] break-words text-balance text-[27px] leading-tight text-ink sm:text-4xl">
              <MathText text={d.title} />
            </h1>
            <div className="mt-3 flex items-center gap-2.5">
              <Avatar user={d.author} size={36} />
              <div className="min-w-0 leading-tight">
                <span className="flex flex-wrap items-center gap-1.5 text-[14px]"><AuthorName author={d.author} /> <RoleBadge author={d.author} /></span>
                <time dateTime={d.created_at} title={fullDate(d.created_at)} className="text-[12.5px] text-ink-faint">
                  {timeAgo(d.created_at)}{d.edited_at ? ` · ${t('modifiée')}` : ''}
                </time>
              </div>
            </div>
            {d.body && <div dir="auto"><TipTapRenderer content={asHtml(d.body)} className="fd-comment-body mt-5 max-w-[68ch] break-words text-base leading-relaxed text-ink" /></div>}
            <Files files={d.files} />
            {d.tags.length > 0 && (
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {d.tags.map((tag) => <ContentTagCard key={tag.id} tag={tag} />)}
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-x-1 gap-y-2 border-y border-line py-2.5">
              <button type="button" onClick={() => startReply(null)} className="fd-btn-primary me-1 inline-flex min-h-10 items-center gap-1.5 px-3 text-sm">
                <CornerDownRight className="h-3.5 w-3.5" /> {t('Répondre')}
              </button>
              <UtileButton kind="discussion" id={d.id} count={d.utile} active={d.user_utile} own={own} />
              <button type="button" onClick={follow} aria-pressed={d.followed} className={`${action} ${d.followed ? '!text-brand-hover' : ''}`}>
                {d.followed ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                {d.followed ? t('Ne plus suivre') : t('Suivre')}
              </button>
              <button type="button" onClick={share} className={action} aria-label={shared ? t('Lien copié') : t('Partager')}
                title={shared ? t('Lien copié') : t('Partager')}>
                <Share2 className="h-4 w-4" aria-hidden />
                <span className={shared ? '' : 'hidden sm:inline'}>{shared ? t('Lien copié') : t('Partager')}</span>
              </button>
              {d.can_edit && (
                <span className="ms-auto flex items-center gap-1">
                  <Link to={`/discussions/${d.id}/modifier`} className={action}><Pencil className="h-3.5 w-3.5" /> {t('Modifier')}</Link>
                  <button type="button" onClick={remove} className={`${action} hover:!bg-[#fbecea] hover:!text-[#a23b34]`}>
                    <Trash2 className="h-3.5 w-3.5" /> {t('Supprimer')}
                  </button>
                </span>
              )}
            </div>
          </article>

          {/* Réponses */}
          <h2 className="fd-display mb-3 mt-7 flex items-baseline gap-2 text-[20px] text-ink">
            {d.replies.length > 1 ? t('{n} réponses', { n: d.replies.length }) : d.replies.length === 1 ? t('1 réponse') : t('Réponses')}
          </h2>
          {d.replies.length === 0 && (
            <p className="mb-4 border-s-2 border-line py-2 ps-4 text-sm text-ink-soft">
              {t('Personne n’a encore répondu.')}
            </p>
          )}
          <ol className="divide-y divide-line">
            {d.replies.map((r) => {
              const mine = !!user && String(user.id) === String(r.author.id);
              return (
                <li key={r.id} id={`reponse-${r.id}`}
                  className={`scroll-mt-24 border-s-2 py-4 ps-3 pe-1 transition-colors motion-reduce:transition-none sm:ps-4 ${highlight === r.id ? 'border-s-brand bg-brand-soft' : 'border-s-line'}`}>
                  <div className="flex gap-3">
                    <Avatar user={r.author} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[13.5px]">
                        <AuthorName author={r.author} /> <RoleBadge author={r.author} />
                        {r.reply_to && (
                          <a href={`#reponse-${r.reply_to.id}`} className="inline-flex items-center gap-0.5 text-[12px] text-ink-faint hover:text-ink">
                            <CornerDownRight className="h-3 w-3" /> {t('à {nom}', { nom: nomAffiche(r.reply_to) })}
                          </a>
                        )}
                        <time dateTime={r.created_at} title={fullDate(r.created_at)} className="text-[12px] text-ink-faint">
                          {timeAgo(r.created_at)}{r.edited_at ? ` · ${t('modifiée')}` : ''}
                        </time>
                      </div>
                      {editing === r.id ? (
                        <div className="mt-2">
                          <MessageComposer initial={asHtml(r.body)} autoFocus attachments={false} placeholder={t('Ta réponse…')} submitLabel={t('Enregistrer')}
                            onCancel={() => setEditing(null)}
                            onSubmit={async (html) => { await updateReply(r.id, html); setEditing(null); await load(); }} />
                        </div>
                      ) : (
                        <>
                          <div dir="auto"><TipTapRenderer content={asHtml(r.body)} className="fd-comment-body mt-1.5 max-w-[65ch] break-words text-[15.5px] leading-relaxed text-ink" /></div>
                          <Files files={r.attachments} />
                          <div className="-ms-2 mt-1.5 flex flex-wrap items-center gap-0.5">
                            <UtileButton kind="reponse" id={r.id} count={r.utile} active={r.user_utile} own={mine} />
                            <button type="button" onClick={() => startReply(r)} className={action}>
                              <CornerDownRight className="h-3.5 w-3.5" /> {t('Répondre')}
                            </button>
                            {r.can_edit && (
                              <>
                                {mine && (
                                  <button type="button" onClick={() => setEditing(r.id)} className={action} aria-label={t('Modifier')}>
                                    <Pencil className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t('Modifier')}</span>
                                  </button>
                                )}
                                <button type="button" onClick={() => removeReply(r)} aria-label={t('Supprimer')}
                                  className={`${action} hover:!bg-[#fbecea] hover:!text-[#a23b34]`}>
                                  <Trash2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t('Supprimer')}</span>
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Répondre */}
          <div ref={composer} id="repondre" className="mt-5 scroll-mt-24 rounded-2xl border border-line bg-white p-4">
            {isAuthenticated ? (
              <>
                {replyTo && (
                  <p className="mb-2 flex items-center gap-1 text-[12.5px] text-ink-faint">
                    <CornerDownRight className="h-3.5 w-3.5" /> {t('Réponse à')} <b className="font-semibold text-ink-soft">{nomAffiche(replyTo.author)}</b>
                    <button type="button" onClick={() => setReplyTo(null)} className="ms-1 font-semibold text-brand-hover hover:underline">{t('Annuler')}</button>
                  </p>
                )}
                <MessageComposer deferred={!composeRequested} autoFocus={composeRequested} placeholder={t('Ta réponse… (@pseudo pour mentionner quelqu’un)')} submitLabel={t('Répondre')}
                  onSubmit={async (html, fileIds) => {
                    await replyToDiscussion(d.id, html, replyTo?.id, fileIds);
                    setReplyTo(null);
                    await load();
                  }} />
              </>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[14px] text-ink-soft">{t('Connecte-toi pour répondre.')}</p>
                <button type="button" onClick={() => openModal('discussion')} className="fd-btn-primary inline-flex min-h-10">{t('Se connecter')}</button>
              </div>
            )}
          </div>
        </div>

        {/* Colonne */}
        <aside className="space-y-4 lg:sticky lg:top-[84px]">
          {participants.length > 0 && (
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="mb-2.5 text-[13px] font-semibold text-ink">
                {t('Participants')} <span className="font-medium text-ink-faint fd-nums">· {participants.length}</span>
              </p>
              <ul className="space-y-2">
                {participants.slice(0, 8).map((a) => (
                  <li key={a.id} className="flex items-center gap-2">
                    <Avatar user={a} size={26} />
                    <AuthorName author={a} className="truncate text-[13px]" />
                    <RoleBadge author={a} />
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[12px] text-ink-faint fd-nums">
                {d.followers > 1 ? t('{n} membres suivent cette discussion', { n: d.followers }) : t('{n} membre suit cette discussion', { n: d.followers })}
              </p>
            </div>
          )}
          {related.length > 0 && (
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="mb-2.5 text-[13px] font-semibold text-ink">{t('Sur le même contenu')}</p>
              <ul className="space-y-2.5">
                {related.map((x) => (
                  <li key={x.id}>
                    <Link to={`/discussions/${x.id}`} className="block text-[13.5px] font-semibold leading-snug text-ink hover:underline">
                      <MathText text={x.title} />
                    </Link>
                    <span className="text-[12px] text-ink-faint fd-nums">
                      {x.reply_count > 1 ? t('{n} réponses', { n: x.reply_count }) : x.reply_count === 1 ? t('1 réponse') : t('aucune réponse')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </Page>
  );
};

export default DiscussionThread;

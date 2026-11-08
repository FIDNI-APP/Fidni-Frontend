// Onglet « Discussions » d'un exercice, d'une leçon ou d'un examen (08/11/2026). Refait le même soir (Natsu : « ça doit
// ressembler à l'interface de commentaires précédente, pas créer un topic juste pour un commentaire ») : même
// présentation que l'ancienne discussion du bas de page — on écrit directement, les réponses s'affichent dessous
// (« à @x », repliées au-delà de 5), « utile », modifier, supprimer. Les messages sont ceux de l'espace Discussions :
// un message écrit ici devient une discussion qui tague ce contenu (titre = sa première phrase, jamais demandé), ses
// réponses sont les réponses de la discussion ; ils apparaissent donc aussi dans /discussions.
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ChevronDown, CornerDownRight, FileIcon, Pencil, Trash2 } from 'lucide-react';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import { confirmer } from '@/lib/confirmer';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/auth/AuthController';
import { isModerator } from '@/lib/features';
import {
  createDiscussion, deleteDiscussion, deleteReply, getDiscussion, replyToDiscussion, updateDiscussion, updateReply,
  type DiscussionAuthor, type DiscussionDetail, type DiscussionPage, type DiscussionReply,
} from '@/lib/api/discussionsApi';
import type { FileAttachment } from '@/types/fileAttachment';
import { MessageComposer } from './MessageComposer';
import { AuthorName, Avatar, RoleBadge, UtileButton, fullDate, timeAgo, titleFromMessage, titleIsFirstSentence } from './parts';
import { t } from '@/i18n';

type Sort = 'utiles' | 'recents' | 'anciens';
const SORTS: { key: Sort; label: string }[] = [
  { key: 'utiles', label: 'Les plus utiles' },
  { key: 'recents', label: 'Plus récents' },
  { key: 'anciens', label: 'Plus anciens' },
];
const SORT_KEY = 'fidni:discussion-contenu:tri';
const FOLD_AFTER = 5;   // réponses affichées sans repli
const FOLDED_SHOWN = 3; // repliées : les dernières restent visibles

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Messages repris des anciens commentaires : parfois du texte brut ; les autres sont déjà en HTML. */
const asHtml = (text: string) => (/<(p|ul|ol|br|strong|em|a|span|div)[\s>/]/i.test(text)
  ? text
  : text.split(/\n{2,}/).map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join(''));

const Files: React.FC<{ files: FileAttachment[] }> = ({ files }) => (
  files.length ? (
    <div className="mt-2 flex flex-wrap gap-2">
      {files.map((f) => {
        const href = f.download_url || f.url;
        return f.file_type === 'image' ? (
          <a key={f.id} href={href} target="_blank" rel="noopener noreferrer" title={f.file_name}
            className="block overflow-hidden rounded-xl border border-line bg-[#faf9f7] hover:border-[#d8d4cc]">
            <img src={href} alt={f.file_name} loading="lazy" className="block max-h-56 max-w-[260px] object-contain" />
          </a>
        ) : (
          <a key={f.id} href={href} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-line bg-[#faf9f7] px-3 py-2 text-[13px] text-ink-soft hover:bg-[#f2f1ee]">
            <FileIcon className="h-4 w-4 text-ink-faint" /> {f.file_name}
          </a>
        );
      })}
    </div>
  ) : null
);

/** Messages d'un contenu (racines + réponses) : pour la pastille de l'onglet. */
export const messageCount = (page: DiscussionPage | null) =>
  (page ? page.results.reduce((n, d) => n + 1 + d.reply_count, 0) : 0);

export const ContentDiscussions: React.FC<{
  contentId: number;
  contentTitle: string;
  /** Niveau du contenu : celui des messages écrits ici (les filtres de l'espace Discussions le suivent). */
  levelId: number | null;
  page: DiscussionPage | null;
  /** Un message écrit, modifié ou supprimé : la page relit la liste (pastille de l'onglet). */
  onChanged: () => void;
}> = ({ contentId, contentTitle, levelId, page, onChanged }) => {
  const { user, isAuthenticated } = useAuth();
  const { openModal } = useAuthModal();
  const moderator = isModerator(user as { is_superuser?: boolean; is_staff?: boolean } | null);
  const [threads, setThreads] = useState<DiscussionDetail[] | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);   // « d12 » (message) ou « r40 » (réponse)
  const [editing, setEditing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const [sort, setSort] = useState<Sort>(() => {
    try {
      const saved = localStorage.getItem(SORT_KEY);
      return SORTS.some((s) => s.key === saved) ? (saved as Sort) : 'utiles';
    } catch { return 'utiles'; }
  });

  // Chaque discussion du contenu avec ses réponses (la liste n'a que les cartes).
  useEffect(() => {
    if (!page) { setThreads(null); return; }
    let alive = true;
    Promise.all(page.results.map((d) => getDiscussion(d.id).catch(() => null)))
      .then((all) => { if (alive) setThreads(all.filter((x): x is DiscussionDetail => !!x)); });
    return () => { alive = false; };
  }, [page]);

  const reload = async (id?: number) => {
    if (id) {
      const fresh = await getDiscussion(id).catch(() => null);
      setThreads((prev) => (prev ?? []).map((x) => (x.id === id && fresh ? fresh : x)));
    }
    onChanged();
  };

  const roots = useMemo(() => {
    const list = [...(threads ?? [])];
    const time = (iso: string) => new Date(iso).getTime();
    if (sort === 'recents') return list.sort((a, b) => time(b.created_at) - time(a.created_at));
    if (sort === 'anciens') return list.sort((a, b) => time(a.created_at) - time(b.created_at));
    return list.sort((a, b) => (b.utile - a.utile) || (time(b.last_activity_at) - time(a.last_activity_at)));
  }, [threads, sort]);
  const total = (threads ?? []).reduce((n, d) => n + 1 + d.replies.length, 0);

  const changeSort = (next: Sort) => {
    setSort(next);
    try { localStorage.setItem(SORT_KEY, next); } catch { /* navigation privée */ }
  };

  const mine = (a: DiscussionAuthor) => !!user && String(user.id) === String(a.id);
  const startReply = (key: string) => {
    if (!isAuthenticated) { openModal('discussion'); return; }
    setEditing(null);
    setReplyingTo(key);
  };

  const removeRoot = async (d: DiscussionDetail) => {
    const n = d.replies.length;
    const question = n ? (n > 1 ? t('Supprimer ce message et ses {n} réponses ?', { n }) : t('Supprimer ce message et sa réponse ?'))
      : t('Supprimer ce message ?');
    if (!await confirmer(question, { action: t('Supprimer'), danger: true })) return;
    await deleteDiscussion(d.id).catch(() => {});
    setThreads((prev) => (prev ?? []).filter((x) => x.id !== d.id));
    onChanged();
  };
  const removeReply = async (d: DiscussionDetail, r: DiscussionReply) => {
    if (!await confirmer(t('Supprimer cette réponse ?'), { action: t('Supprimer'), danger: true })) return;
    await deleteReply(r.id).catch(() => {});
    await reload(d.id);
  };

  const replyForm = (d: DiscussionDetail, target: DiscussionReply | null) => (
    <div className="pb-3 pt-1">
      <p className="mb-1.5 flex items-center gap-1 text-[12.5px] text-ink-faint">
        <CornerDownRight className="h-3.5 w-3.5" /> {t('Réponse à')} <b className="font-semibold text-ink-soft">@{(target ?? d).author.username}</b>
      </p>
      <MessageComposer autoFocus placeholder={t('Ta réponse…')} submitLabel={t('Répondre')}
        onCancel={() => setReplyingTo(null)}
        onSubmit={async (html, fileIds) => {
          await replyToDiscussion(d.id, html, target?.id ?? null, fileIds);
          setReplyingTo(null);
          await reload(d.id);
        }} />
    </div>
  );

  const action = 'inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[12.5px] font-semibold text-ink-faint transition-colors hover:bg-[#f2f1ee] hover:text-ink';

  /** Un message (racine) ou une réponse, présenté comme les anciens commentaires. */
  const card = (d: DiscussionDetail, r: DiscussionReply | null) => {
    const key = r ? `r${r.id}` : `d${d.id}`;
    const author = r ? r.author : d.author;
    const own = mine(author);
    const body = r ? r.body : d.body;
    const canEdit = r ? r.can_edit : d.can_edit;
    // Discussion lancée depuis l'espace Discussions (titre écrit à part) : son titre en tête du message.
    const showTitle = !r && !titleIsFirstSentence(d.title, d.body);
    return (
      <article key={key} id={r ? `reponse-${r.id}` : `discussion-${d.id}`}
        className={`-mx-2 scroll-mt-24 rounded-xl px-2 ${r ? 'py-2' : 'py-2.5'}`}>
        <div className="flex gap-3">
          <Avatar user={author} size={r ? 28 : 36} />
          <div className="min-w-0 flex-1">
            <header className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 leading-tight">
              <AuthorName author={author} className="text-[13.5px]" />
              <RoleBadge author={author} />
              {r?.reply_to && (
                <span className="inline-flex items-center gap-0.5 text-[12px] text-ink-faint">
                  <CornerDownRight className="h-3 w-3" /> {t('à @{nom}', { nom: r.reply_to.username })}
                </span>
              )}
              <time dateTime={r ? r.created_at : d.created_at} title={fullDate(r ? r.created_at : d.created_at)} className="text-[12px] text-ink-faint">
                {timeAgo(r ? r.created_at : d.created_at)}{(r ? r.edited_at : d.edited_at) ? ` · ${t('modifié')}` : ''}
              </time>
            </header>

            {editing === key ? (
              <div className="mt-2">
                <MessageComposer autoFocus attachments={false} initial={asHtml(body)} placeholder={t('Ton message…')} submitLabel={t('Enregistrer')}
                  onCancel={() => setEditing(null)}
                  onSubmit={async (html) => {
                    if (r) await updateReply(r.id, html);
                    else await updateDiscussion(d.id, titleIsFirstSentence(d.title, d.body)
                      ? { body: html, title: titleFromMessage(html, contentTitle) } : { body: html });
                    setEditing(null);
                    await reload(d.id);
                  }} />
              </div>
            ) : (
              <>
                {showTitle && <p dir="auto" className="mt-1 text-[15px] font-semibold text-ink">{d.title}</p>}
                {body && <div dir="auto"><TipTapRenderer content={asHtml(body)} className="fd-comment-body mt-1 text-[14.5px] leading-relaxed text-ink-soft" /></div>}
                <Files files={r ? r.attachments : d.files} />
                <div className="-ms-2 mt-1 flex flex-wrap items-center gap-0.5">
                  <UtileButton kind={r ? 'reponse' : 'discussion'} id={r ? r.id : d.id} count={r ? r.utile : d.utile}
                    active={r ? r.user_utile : d.user_utile} own={own} />
                  <button type="button" onClick={() => startReply(key)} aria-expanded={replyingTo === key} className={action}>
                    <CornerDownRight className="h-3.5 w-3.5" /> {t('Répondre')}
                  </button>
                  {own && (
                    <button type="button" onClick={() => { setReplyingTo(null); setEditing(key); }} className={action} aria-label={t('Modifier')}>
                      <Pencil className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t('Modifier')}</span>
                    </button>
                  )}
                  {(canEdit || moderator) && (
                    <button type="button" onClick={() => (r ? removeReply(d, r) : removeRoot(d))} aria-label={t('Supprimer')}
                      className={`${action} hover:!bg-[#fbecea] hover:!text-[#a23b34]`}>
                      <Trash2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t('Supprimer')}</span>
                    </button>
                  )}
                  {!r && (
                    <Link to={`/discussions/${d.id}`} title={t('Ouvrir dans l’espace Discussions')} aria-label={t('Ouvrir dans l’espace Discussions')}
                      className={`${action} ms-auto`}>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </article>
    );
  };

  const thread = (d: DiscussionDetail) => {
    const folded = d.replies.length > FOLD_AFTER && !expanded.has(d.id) ? d.replies.length - FOLDED_SHOWN : 0;
    const shown = folded ? d.replies.slice(-FOLDED_SHOWN) : d.replies;
    const open = d.replies.length > 0 || replyingTo === `d${d.id}`;
    return (
      <li key={d.id} className="py-3 first:pt-0 last:pb-0">
        {card(d, null)}
        {open && (
          // Le fil : un trait sous l'avatar du message d'origine, les réponses au même retrait.
          <div className="ms-[17px] border-s-2 border-[#efece6] ps-4 sm:ps-5">
            {replyingTo === `d${d.id}` && replyForm(d, null)}
            {folded > 0 && (
              <button type="button" onClick={() => setExpanded((prev) => new Set(prev).add(d.id))}
                className="my-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12.5px] font-semibold text-brand-hover hover:bg-brand-soft">
                <ChevronDown className="h-3.5 w-3.5" /> {t('Voir les {n} réponses précédentes', { n: folded })}
              </button>
            )}
            {shown.map((r) => (
              <React.Fragment key={r.id}>
                {card(d, r)}
                {replyingTo === `r${r.id}` && replyForm(d, r)}
              </React.Fragment>
            ))}
          </div>
        )}
      </li>
    );
  };

  return (
    <section id="discussion" className="scroll-mt-20 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
        <h2 className="fd-display flex items-baseline gap-2 text-[20px] leading-tight text-ink">
          {t('Discussion')}
          {total > 0 && <span className="font-sans text-[13px] font-semibold text-ink-faint fd-nums">{total}</span>}
        </h2>
        {roots.length > 1 && (
          <label className="relative flex items-center gap-2 text-[13px] text-ink-faint">
            {t('Trier :')}
            <select value={sort} onChange={(e) => changeSort(e.target.value as Sort)}
              className="min-h-10 appearance-none rounded-lg border border-line bg-white py-1.5 ps-3 pe-8 text-[13px] font-medium text-ink hover:border-[#cfcdc8] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20">
              {SORTS.map((s) => <option key={s.key} value={s.key}>{t(s.label)}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute end-2.5 h-4 w-4 text-ink-faint" />
          </label>
        )}
      </div>

      {isAuthenticated ? (
        <div className={roots.length > 0 ? 'mb-6' : ''}>
          <MessageComposer deferred placeholder={t('Écris un message…')} submitLabel={t('Publier')}
            onSubmit={async (html, fileIds) => {
              const d = await createDiscussion({
                title: titleFromMessage(html, contentTitle), body: html, salon: 'entraide',
                content_ids: [contentId], file_ids: fileIds, ...(levelId ? { class_level: levelId } : {}),
              });
              setThreads((prev) => [d, ...(prev ?? [])]);
              onChanged();
            }} />
          <p className="mt-1.5 text-[12px] text-ink-faint">
            {t('Les maths s’écrivent entre')} <code className="rounded bg-[#f2f1ee] px-1 font-mono text-[11.5px]">$ $</code>
            {t(', par exemple')} <code className="rounded bg-[#f2f1ee] px-1 font-mono text-[11.5px]">$f'(x) = 2x$</code>
            {t(', ou avec le bouton Formule.')}
          </p>
        </div>
      ) : (
        <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-[#faf9f7] px-4 py-3 ${roots.length > 0 ? 'mb-6' : ''}`}>
          <p className="text-[13.5px] text-ink-soft">{t('Connecte-toi pour écrire un message ou répondre.')}</p>
          <button type="button" onClick={() => openModal('discussion')}
            className="inline-flex min-h-10 items-center rounded-xl bg-brand px-4 text-[13px] font-semibold text-white hover:bg-brand-hover">
            {t('Se connecter')}
          </button>
        </div>
      )}

      {threads === null && page !== null && page.results.length > 0 && (
        <div className="space-y-3" aria-busy="true">
          {[0, 1].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-[#f7f6f3]" />)}
        </div>
      )}
      {roots.length > 0 && <ul className="divide-y divide-line">{roots.map(thread)}</ul>}
      {page && page.count > page.results.length && (
        <Link to={`/discussions?contenu=${contentId}&niveau=tous`} className="mt-3 inline-flex min-h-10 items-center font-semibold text-brand-hover hover:underline">
          {t('Voir les {n} discussions', { n: page.count })}
        </Link>
      )}
    </section>
  );
};

export default ContentDiscussions;

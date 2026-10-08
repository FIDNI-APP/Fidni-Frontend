/**
 * Discussion sous un contenu (réécrite le 08/10/2026).
 *
 * - Réponses imbriquées : sous chaque commentaire, toutes ses réponses (réponses aux réponses
 *   comprises, avec « à @X »), dans l'ordre où elles ont été écrites. Un seul retrait : une longue
 *   conversation reste lisible sur téléphone. Au-delà de 5 réponses, les plus anciennes se replient.
 * - Écriture avec l'éditeur des solutions (variante commentaire) : formules `$…$` ou bouton
 *   « Formule », gras, listes ; Ctrl/Cmd + Entrée publie. Les anciens commentaires (texte brut)
 *   s'affichent toujours, formules comprises.
 * - Arrivée depuis une notification (« ?commentaire=… ») : le commentaire est mis en valeur et le
 *   champ de réponse est ouvert juste dessous.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, CornerDownRight, FileIcon, Image as ImageIcon, Loader2, MessageSquare, Paperclip, Pencil, Send, Trash2, X } from 'lucide-react';
import type { Comment, VoteValue } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/auth/AuthController';
import { isModerator } from '@/lib/features';
import { VoteButtons } from '@/components/interactions/VoteButtons';
import { FileUpload } from '@/components/common/FileUpload';
import { fileAPI } from '@/lib/api/contentItemApi';
import type { FileUploadResponse } from '@/types/fileAttachment';
import CompactTipTapEditor from '@/components/editor/CompactTipTapEditor';
import TipTapRenderer from '@/components/editor/TipTapRenderer';

interface CommentSectionProps {
  comments: Comment[];
  onAddComment: (content: string, parentId?: string, fileIds?: string[]) => Promise<void>;
  onVoteComment: (commentId: string, type: VoteValue) => Promise<void>;
  onEditComment: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  /** Arrivée depuis une notification (« ?commentaire=… ») : ce commentaire est montré, réponse prête. */
  focusCommentId?: string | null;
}

type Sort = 'mostUpvoted' | 'recent' | 'oldest';
const SORTS: { key: Sort; label: string }[] = [
  { key: 'mostUpvoted', label: 'Les plus utiles' },
  { key: 'recent', label: 'Plus récents' },
  { key: 'oldest', label: 'Plus anciens' },
];
const SORT_KEY = 'sortOption';
const FOLD_AFTER = 5;   // réponses affichées sans repli
const FOLDED_SHOWN = 3; // repliées : les dernières restent visibles

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Anciens commentaires (zone de texte) : texte brut → paragraphes. Les nouveaux sont déjà en HTML. */
const commentHtml = (text: string) => (/<(p|ul|ol|br|strong|em|a|span|div)[\s>/]/i.test(text)
  ? text
  : text.split(/\n{2,}/).map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join(''));
const isBlank = (html: string) => !html.replace(/<[^>]*>/g, '').replace(/&nbsp;| /g, ' ').trim();

const timeAgo = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'à l’instant';
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  if (d === 1) return 'hier';
  if (d < 30) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
};
const fullDate = (iso: string) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });

interface Reply { comment: Comment; parent: Comment }
/** Toutes les réponses d'un fil, à plat, de la plus ancienne à la plus récente. */
function flatten(root: Comment): Reply[] {
  const out: Reply[] = [];
  const walk = (c: Comment) => (c.replies ?? []).forEach((r) => { out.push({ comment: r, parent: c }); walk(r); });
  walk(root);
  return out.sort((a, b) => (+new Date(a.comment.created_at) - +new Date(b.comment.created_at)) || (Number(a.comment.id) - Number(b.comment.id)));
}
const countAll = (list: Comment[]): number => list.reduce((n, c) => n + 1 + countAll(c.replies ?? []), 0);

const Avatar: React.FC<{ author: Comment['author']; small?: boolean }> = ({ author, small }) => {
  const [broken, setBroken] = useState(false);  // image introuvable : l'initiale à la place
  const src = (author as { avatar?: string | null }).avatar;
  const dim = small ? 'h-7 w-7 text-[11.5px]' : 'h-9 w-9 text-[13px]';
  return src && !broken
    ? <img src={src} alt="" onError={() => setBroken(true)} className={`${dim} shrink-0 rounded-full object-cover`} />
    : (
      <span aria-hidden className={`${dim} inline-flex shrink-0 items-center justify-center rounded-full bg-[#f2f1ee] font-bold uppercase text-ink-soft`}>
        {author.username?.[0] ?? '?'}
      </span>
    );
};

// ============================================
// Zone d'écriture : nouveau commentaire, réponse ou modification
// ============================================
const Composer: React.FC<{
  initial?: string;
  placeholder: string;
  submitLabel: string;
  onSubmit: (html: string, fileIds: string[]) => Promise<void>;
  onCancel?: () => void;
  autoFocus?: boolean;
  /** Joindre des images ou des fichiers (nouveau commentaire seulement). */
  attachments?: boolean;
  hint?: React.ReactNode;
}> = ({ initial = '', placeholder, submitLabel, onSubmit, onCancel, autoFocus, attachments, hint }) => {
  const [html, setHtml] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<FileUploadResponse[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const blank = isBlank(html);

  const submit = async () => {
    if (blank || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(html, files.map((f) => f.id));
      setHtml('');
      setFiles([]);
      setShowUpload(false);
    } catch {
      setError('Ça n’est pas parti : vérifie ta connexion et réessaie (ton texte est gardé).');
    } finally {
      setBusy(false);
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    fileAPI.delete(id).catch(() => {});
  };

  return (
    <div>
      <CompactTipTapEditor
        variant="comment"
        content={html}
        onChange={setHtml}
        placeholder={placeholder}
        ariaLabel={placeholder}
        minHeight="60px"
        autoFocus={autoFocus}
        onSubmit={submit}
        footer={(
          <>
            {attachments && (
              <button type="button" onClick={() => setShowUpload((v) => !v)} aria-pressed={showUpload}
                title="Joindre une photo ou un fichier"
                className={`inline-flex h-8 items-center gap-1 rounded-md px-2 text-[12.5px] font-semibold transition-colors ${
                  showUpload ? 'bg-brand-soft text-brand-hover' : 'text-ink-soft hover:bg-[#f2f1ee] hover:text-ink'}`}>
                <Paperclip className="h-4 w-4" /><span className="hidden sm:inline">Photo</span>
              </button>
            )}
            {onCancel && (
              <button type="button" onClick={onCancel}
                className="inline-flex h-8 items-center rounded-lg px-2.5 text-[12.5px] font-semibold text-ink-soft hover:bg-[#f2f1ee]">
                Annuler
              </button>
            )}
            <button type="button" onClick={submit} disabled={blank || busy} title="Ctrl + Entrée"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand px-3 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-40">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {submitLabel}
            </button>
          </>
        )}
      />
      {files.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-1.5 rounded-lg border border-line bg-[#faf9f7] py-1 pl-2.5 pr-1 text-[12.5px] text-ink-soft">
              {f.file_type === 'image' ? <ImageIcon className="h-3.5 w-3.5" /> : <FileIcon className="h-3.5 w-3.5" />}
              <span className="max-w-[180px] truncate">{f.file_name}</span>
              <button type="button" onClick={() => removeFile(f.id)} aria-label={`Retirer ${f.file_name}`}
                className="rounded p-0.5 text-ink-faint hover:bg-[#f2f1ee] hover:text-ink"><X className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      )}
      {showUpload && (
        <div className="mt-2">
          <FileUpload
            onUploadComplete={(f) => { setFiles((prev) => [...prev, f]); setShowUpload(false); }}
            onUploadError={() => setError('Le fichier n’a pas pu être envoyé.')}
            accept="image/*,.pdf,.doc,.docx,.txt,.md"
            maxSizeMB={10}
          />
        </div>
      )}
      {error && <p role="alert" className="mt-1.5 text-[12.5px] font-medium text-[#a23b34]">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-[12px] text-ink-faint">{hint}</p>}
    </div>
  );
};

// ============================================
// Discussion
// ============================================
export function CommentSection({
  comments,
  onAddComment,
  onVoteComment,
  onEditComment,
  onDeleteComment,
  focusCommentId,
}: CommentSectionProps) {
  const { isAuthenticated, user } = useAuth();
  const { openModal } = useAuthModal();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [highlight, setHighlight] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>(() => {
    try {
      const saved = localStorage.getItem(SORT_KEY);
      return SORTS.some((s) => s.key === saved) ? (saved as Sort) : 'mostUpvoted';
    } catch {
      return 'mostUpvoted';
    }
  });

  const roots = useMemo(() => {
    const copy = [...comments];
    const time = (c: Comment) => new Date(c.created_at).getTime();
    if (sort === 'recent') return copy.sort((a, b) => time(b) - time(a));
    if (sort === 'oldest') return copy.sort((a, b) => time(a) - time(b));
    return copy.sort((a, b) => (b.vote_count - a.vote_count) || (time(b) - time(a)));
  }, [comments, sort]);
  const total = useMemo(() => countAll(comments), [comments]);

  const changeSort = (next: Sort) => {
    setSort(next);
    try { localStorage.setItem(SORT_KEY, next); } catch { /* navigation privée */ }
  };

  const startReply = (c: Comment) => {
    if (!isAuthenticated) { openModal(); return; }
    setEditing(null);
    setReplyingTo(String(c.id));
  };

  // Arrivée depuis une notification : défiler jusqu'au commentaire, le mettre en valeur quelques
  // secondes et ouvrir la réponse juste dessous (c'est tout l'intérêt de la notification).
  const focusedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!focusCommentId || focusedRef.current === focusCommentId) return;
    const thread = comments.find((root) => String(root.id) === focusCommentId
      || flatten(root).some((r) => String(r.comment.id) === focusCommentId));
    if (!thread) return;
    focusedRef.current = focusCommentId;
    setExpanded((prev) => new Set(prev).add(String(thread.id)));
    if (isAuthenticated) setReplyingTo(focusCommentId);
    setHighlight(focusCommentId);
    const t1 = window.setTimeout(() => {
      document.getElementById(`comment-${focusCommentId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
    const t2 = window.setTimeout(() => setHighlight(null), 3500);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [focusCommentId, comments, isAuthenticated]);

  const remove = async (c: Comment) => {
    const replies = flatten(c).length;
    const question = replies
      ? `Supprimer ce commentaire et ${replies > 1 ? `ses ${replies} réponses` : 'sa réponse'} ?`
      : 'Supprimer ce commentaire ?';
    if (!window.confirm(question)) return;
    await onDeleteComment(String(c.id)).catch(() => {});
  };

  const replyForm = (target: Comment) => (
    <div className="pb-3 pt-1">
      <p className="mb-1.5 flex items-center gap-1 text-[12.5px] text-ink-faint">
        <CornerDownRight className="h-3.5 w-3.5" /> Réponse à <b className="font-semibold text-ink-soft">@{target.author.username}</b>
      </p>
      <Composer
        key={`reply-${target.id}`}
        autoFocus
        placeholder="Ta réponse…"
        submitLabel="Répondre"
        onCancel={() => setReplyingTo(null)}
        onSubmit={async (html) => {
          await onAddComment(html, String(target.id));
          setReplyingTo(null);
        }}
      />
    </div>
  );

  const card = (c: Comment, inReplyTo: Comment | null, reply: boolean) => {
    const id = String(c.id);
    const mine = !!user && String(user.id) === String(c.author.id);
    const canDelete = mine || isModerator(user as { is_superuser?: boolean; is_staff?: boolean } | null);
    const deleted = (c.author as { is_deleted?: boolean }).is_deleted;
    const action = 'inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[12.5px] font-semibold text-ink-faint transition-colors hover:bg-[#f2f1ee] hover:text-ink';
    return (
      <article id={`comment-${id}`}
        className={`-mx-2 scroll-mt-24 rounded-xl px-2 transition-colors duration-700 ${reply ? 'py-2' : 'py-2.5'} ${
          highlight === id ? 'bg-brand-soft/60 ring-2 ring-brand/30' : ''}`}>
        <div className="flex gap-3">
          <Avatar author={c.author} small={reply} />
          <div className="min-w-0 flex-1">
            <header className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 leading-tight">
              {deleted
                ? <span className="text-[13.5px] font-semibold italic text-ink-faint">Compte supprimé</span>
                : <Link to={`/profile/${c.author.username}`} className="text-[13.5px] font-semibold text-ink hover:underline">{c.author.username}</Link>}
              {inReplyTo && (
                <span className="inline-flex items-center gap-0.5 text-[12px] text-ink-faint">
                  <CornerDownRight className="h-3 w-3" /> à @{inReplyTo.author.username}
                </span>
              )}
              <time dateTime={c.created_at} title={fullDate(c.created_at)} className="text-[12px] text-ink-faint">{timeAgo(c.created_at)}</time>
            </header>

            {editing === id ? (
              <div className="mt-2">
                <Composer
                  autoFocus
                  initial={commentHtml(c.content)}
                  placeholder="Ton commentaire…"
                  submitLabel="Enregistrer"
                  onCancel={() => setEditing(null)}
                  onSubmit={async (html) => {
                    await onEditComment(id, html);
                    setEditing(null);
                  }}
                />
              </div>
            ) : (
              <>
                <TipTapRenderer content={commentHtml(c.content)} className="fd-comment-body mt-1 text-[14.5px] leading-relaxed text-ink-soft" />
                {!!c.attachments?.length && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {c.attachments.map((file) => {
                      // URL stable (redirige vers une URL S3 fraîche) : l'URL signée expire.
                      const href = (file as { download_url?: string }).download_url || file.url;
                      return file.file_type === 'image' ? (
                        <a key={file.id} href={href} target="_blank" rel="noopener noreferrer" title={file.file_name}
                          className="block overflow-hidden rounded-xl border border-line bg-[#faf9f7] hover:border-[#d8d4cc]">
                          <img src={href} alt={file.file_name} loading="lazy" className="block max-h-56 max-w-[260px] object-contain" />
                        </a>
                      ) : (
                        <a key={file.id} href={href} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-lg border border-line bg-[#faf9f7] px-3 py-2 text-[13px] text-ink-soft hover:bg-[#f2f1ee]">
                          <FileIcon className="h-4 w-4 text-ink-faint" /> {file.file_name}
                        </a>
                      );
                    })}
                  </div>
                )}
                <div className="-ml-2 mt-1 flex flex-wrap items-center gap-0.5">
                  <VoteButtons
                    likes={c.like_count}
                    dislikes={c.dislike_count}
                    initialVotes={c.vote_count}
                    onVote={(v) => onVoteComment(id, v)}
                    userVote={(c.user_vote ?? 0) as 1 | -1 | 0}
                    size="sm"
                    showBadge={false}
                  />
                  <button type="button" onClick={() => startReply(c)} aria-expanded={replyingTo === id} className={action}>
                    <CornerDownRight className="h-3.5 w-3.5" /> Répondre
                  </button>
                  {mine && (
                    <button type="button" onClick={() => { setReplyingTo(null); setEditing(id); }} className={action} aria-label="Modifier">
                      <Pencil className="h-3.5 w-3.5" /><span className="hidden sm:inline">Modifier</span>
                    </button>
                  )}
                  {canDelete && (
                    <button type="button" onClick={() => remove(c)} aria-label="Supprimer"
                      className={`${action} hover:!bg-[#fbecea] hover:!text-[#a23b34]`}>
                      <Trash2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">Supprimer</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </article>
    );
  };

  const thread = (root: Comment) => {
    const rootId = String(root.id);
    const replies = flatten(root);
    const folded = replies.length > FOLD_AFTER && !expanded.has(rootId) ? replies.length - FOLDED_SHOWN : 0;
    const shown = folded ? replies.slice(-FOLDED_SHOWN) : replies;
    const open = replies.length > 0 || replyingTo === rootId;
    return (
      <li key={rootId} className="py-3 first:pt-0 last:pb-0">
        {card(root, null, false)}
        {open && (
          // Le fil : un trait sous l'avatar du commentaire d'origine, les réponses au même retrait.
          <div className="ml-[17px] border-l-2 border-[#efece6] pl-4 sm:pl-5">
            {replyingTo === rootId && replyForm(root)}
            {folded > 0 && (
              <button type="button" onClick={() => setExpanded((prev) => new Set(prev).add(rootId))}
                className="my-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12.5px] font-semibold text-brand-hover hover:bg-brand-soft">
                <ChevronDown className="h-3.5 w-3.5" /> Voir les {folded} réponses précédentes
              </button>
            )}
            {shown.map(({ comment, parent }) => (
              <React.Fragment key={comment.id}>
                {card(comment, String(parent.id) === rootId ? null : parent, true)}
                {replyingTo === String(comment.id) && replyForm(comment)}
              </React.Fragment>
            ))}
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="relative">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="fd-display flex items-center text-ink" style={{ fontSize: 22 }}>
          Questions et discussion
          {total > 0 && (
            <span className="fd-nums ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-sm font-semibold text-brand-hover">{total}</span>
          )}
        </h2>
        {comments.length > 1 && (
          <label className="relative flex items-center gap-2 text-[13px] text-ink-faint">
            Trier :
            <select value={sort} onChange={(e) => changeSort(e.target.value as Sort)}
              className="appearance-none rounded-lg border border-line bg-white py-1.5 pl-3 pr-8 text-[13px] font-medium text-ink hover:border-[#cfcdc8] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20">
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4 text-ink-faint" />
          </label>
        )}
      </div>

      {isAuthenticated ? (
        <div className="mb-6">
          <Composer
            placeholder="Pose une question ou partage une astuce…"
            submitLabel="Publier"
            attachments
            onSubmit={(html, fileIds) => onAddComment(html, undefined, fileIds)}
            hint={<>Les maths s’écrivent entre <code className="rounded bg-[#f2f1ee] px-1 font-mono text-[11.5px]">$ $</code>, par exemple <code className="rounded bg-[#f2f1ee] px-1 font-mono text-[11.5px]">$f'(x) = 2x$</code>, ou avec le bouton Formule.</>}
          />
        </div>
      ) : (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-[#faf9f7] px-4 py-3.5">
          <p className="text-[13.5px] text-ink-soft">Connecte-toi pour poser une question ou répondre à un camarade.</p>
          <button type="button" onClick={openModal}
            className="rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-hover">
            Se connecter
          </button>
        </div>
      )}

      {roots.length > 0 ? (
        <ul className="divide-y divide-line">{roots.map(thread)}</ul>
      ) : (
        <div className="rounded-xl border border-dashed border-line bg-[#faf9f7] px-5 py-8 text-center">
          <MessageSquare className="mx-auto mb-3 h-8 w-8 text-[#cfcdc8]" />
          <p className="text-[15px] font-semibold text-ink">Pas encore de question</p>
          <p className="mt-1 text-[13.5px] text-ink-faint">Bloqué sur une question ? Demande ici : un camarade ou un prof te répondra.</p>
        </div>
      )}
    </div>
  );
}

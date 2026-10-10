// Onglet « Solutions » : les élèves partagent leur démarche, rédigée dans l'éditeur
// (maths en $…$) et/ou en photos de leur copie. Les autres votent ; l'auteur peut modifier
// ou supprimer la sienne. La correction officielle reste dans l'onglet « Exercice ».
// L'éditeur (lourd) n'est téléchargé qu'à l'ouverture de « Proposer ma solution ».
import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isModerator } from '@/lib/features';
import { Camera, Edit3, ImagePlus, Loader2, PenLine, Trash2, X, Lightbulb } from 'lucide-react';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import { VoteButtons } from '@/components/interactions/VoteButtons';
import { fileAPI } from '@/lib/api/contentItemApi';
import {
  compressImage, createProposedSolution, deleteProposedSolution, updateProposedSolution, voteProposedSolution,
  type ProposedSolution, type SolutionAttachment,
} from '@/lib/api/proposedSolutionsApi';

// Éditeur chargé à la demande (survol ou clic sur « Proposer ma solution »).
const loadEditor = () => import('@/components/editor/CompactTipTapEditor');
const CompactTipTapEditor = lazy(loadEditor);

const MAX_PHOTOS = 6;

const timeAgo = (iso: string) => {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days} jour${days > 1 ? 's' : ''}`;
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
};

/** Le corps de l'éditeur est-il vide (paragraphes vides, espaces) ? */
const isBlank = (html: string) => !html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

// ────────────────────────────────────────────────────────────── Rédaction

interface PendingPhoto { key: string; file: File; preview: string }

const Composer: React.FC<{
  contentId: string;
  editing?: ProposedSolution | null;
  onDone: () => void;
  onCancel: () => void;
}> = ({ contentId, editing, onDone, onCancel }) => {
  const [body, setBody] = useState(editing?.body || '');
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [kept, setKept] = useState<SolutionAttachment[]>(editing?.attachments || []);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.preview)), [photos]);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const room = MAX_PHOTOS - photos.length - kept.length;
    const picked = Array.from(files).filter((f) => f.type.startsWith('image/') || f.type === 'application/pdf').slice(0, room);
    if (files.length > picked.length) setError(`${MAX_PHOTOS} photos au maximum.`);
    setPhotos((prev) => [...prev, ...picked.map((file) => ({
      key: `${file.name}-${file.size}-${Math.random()}`, file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
    }))]);
  };

  const submit = async () => {
    setError(null);
    if (isBlank(body) && photos.length === 0 && kept.length === 0) {
      setError('Rédige ta solution ou ajoute au moins une photo de ta copie.');
      return;
    }
    try {
      // 1. Photos : réduites puis envoyées une à une.
      const fileIds: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        setStatus(`Envoi des photos ${i + 1}/${photos.length}…`);
        const uploaded = await fileAPI.upload(await compressImage(photos[i].file));
        fileIds.push(uploaded.id);
      }
      setStatus('Publication…');
      if (editing) {
        // Photos retirées pendant la modification : supprimées pour de bon.
        const removed = editing.attachments.filter((a) => !kept.some((k) => k.id === a.id));
        await Promise.all(removed.map((a) => fileAPI.delete(a.id).catch(() => undefined)));
        await updateProposedSolution(editing.id, { body: isBlank(body) ? '' : body, file_ids: fileIds });
      } else {
        await createProposedSolution({ content: contentId, body: isBlank(body) ? '' : body, file_ids: fileIds });
      }
      onDone();
    } catch (err: any) {
      const data = err?.response?.data;
      const message = data && typeof data === 'object'
        ? (data.detail || data.non_field_errors?.[0] || data.body?.[0] || data.file?.[0] || Object.values(data)[0])
        : null;
      setError(err?.response?.status === 429
        ? 'Tu as publié beaucoup de solutions : réessaie dans un moment.'
        : (typeof message === 'string' ? message : 'La publication a échoué. Réessaie.'));
    } finally {
      setStatus(null);
    }
  };

  const total = photos.length + kept.length;
  return (
    <div className="fd-card p-5 sm:p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-ink">{editing ? 'Modifier ma solution' : 'Ma solution'}</h3>
        <button onClick={onCancel} className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-[#f2f1ee]" aria-label="Fermer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <Suspense fallback={(
        <div aria-busy="true" className="rounded-xl border border-line bg-white px-3.5 py-3 text-[15px] text-ink-faint" style={{ minHeight: 150 }}>
          Rédige ta démarche…
        </div>
      )}>
        <CompactTipTapEditor
          content={body}
          onChange={setBody}
          placeholder="Rédige ta démarche… Les maths s'écrivent entre $ $, par exemple $f'(x) = 2x$."
          minHeight="150px"
          autoFocus
        />
      </Suspense>

      {/* Photos de la copie */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-ink-soft">Photos de ta copie <span className="text-ink-faint font-normal">(facultatif)</span></span>
          <span className="text-xs text-ink-faint fd-nums">{total}/{MAX_PHOTOS}</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {kept.map((a) => (
            <div key={a.id} className="relative aspect-square rounded-xl overflow-hidden border border-line bg-[#faf9f7]">
              <img src={a.download_url} alt={a.file_name} className="w-full h-full object-cover" />
              <button onClick={() => setKept((prev) => prev.filter((k) => k.id !== a.id))}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/95 border border-line flex items-center justify-center text-ink-soft hover:text-[#a23b34]"
                aria-label="Retirer la photo"><X className="w-3.5 h-3.5" /></button>
            </div>
          ))}
          {photos.map((p) => (
            <div key={p.key} className="relative aspect-square rounded-xl overflow-hidden border border-line bg-[#faf9f7]">
              {p.preview
                ? <img src={p.preview} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-xs text-ink-faint p-2 text-center">{p.file.name}</div>}
              <button onClick={() => setPhotos((prev) => prev.filter((x) => x.key !== p.key))}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/95 border border-line flex items-center justify-center text-ink-soft hover:text-[#a23b34]"
                aria-label="Retirer la photo"><X className="w-3.5 h-3.5" /></button>
            </div>
          ))}
          {total < MAX_PHOTOS && (
            <button type="button" onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-[#d8d4cc] hover:border-[#1a7a4a] hover:bg-[#eaf3ed] text-ink-faint hover:text-[#15633c] flex flex-col items-center justify-center gap-1 transition-colors">
              <ImagePlus className="w-5 h-5" />
              <span className="text-[11px] font-medium">Ajouter</span>
            </button>
          )}
        </div>
        {/* accept image/* : sur téléphone, propose directement l'appareil photo. */}
        <input ref={inputRef} type="file" accept="image/*,application/pdf" multiple className="hidden"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
      </div>

      {error && <p className="mt-3 text-sm text-[#a23b34]">{error}</p>}

      <div className="flex items-center justify-end gap-2 mt-5">
        <button onClick={onCancel} className="fd-btn-ghost" disabled={!!status}>Annuler</button>
        <button onClick={submit} className="fd-btn-primary" disabled={!!status}>
          {status ? <><Loader2 className="w-4 h-4 animate-spin" /> {status}</> : (editing ? 'Enregistrer' : 'Publier ma solution')}
        </button>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────── Affichage

const Lightbox: React.FC<{ src: string; onClose: () => void }> = ({ src, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 overflow-y-auto [align-items:safe_center] z-[200] bg-black/80 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
      <img src={src} alt="" className="max-w-full max-h-full rounded-lg shadow-2xl bg-white" />
      <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center" aria-label="Fermer">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};

const SolutionCard: React.FC<{
  solution: ProposedSolution;
  onEdit: () => void;
  onDeleted: () => void;
  onOpenImage: (src: string) => void;
}> = ({ solution, onEdit, onDeleted, onOpenImage }) => {
  const [deleting, setDeleting] = useState(false);
  const { user } = useAuth();
  const canDelete = solution.is_mine || isModerator(user);
  const edited = new Date(solution.updated_at).getTime() - new Date(solution.created_at).getTime() > 60000;
  const images = solution.attachments.filter((a) => a.file_type === 'image');
  const documents = solution.attachments.filter((a) => a.file_type !== 'image');

  const remove = async () => {
    if (!confirm(solution.is_mine
      ? 'Supprimer ta solution ? Ses photos seront supprimées aussi.'
      : `Supprimer la solution de ${solution.author.username} ? Ses photos seront supprimées aussi.`)) return;
    setDeleting(true);
    try { await deleteProposedSolution(solution.id); onDeleted(); } finally { setDeleting(false); }
  };

  return (
    <article className="fd-card p-5 sm:p-6">
      <header className="flex items-start justify-between gap-3 mb-3">
        <Link to={solution.author.is_deleted ? '#' : `/profile/${solution.author.username}`}
          onClick={(e) => { if (solution.author.is_deleted) e.preventDefault(); }}
          className={`flex items-center gap-2.5 min-w-0 group ${solution.author.is_deleted ? 'pointer-events-none' : ''}`}>
          {solution.author.avatar
            ? <img src={solution.author.avatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
            : <span className="w-8 h-8 rounded-full bg-[#f2f1ee] text-ink-soft flex items-center justify-center text-sm font-semibold flex-shrink-0">
                {solution.author.username.slice(0, 1).toUpperCase()}
              </span>}
          <span className="min-w-0">
            <span className={`block text-sm font-semibold truncate ${solution.author.is_deleted ? 'text-ink-faint italic' : 'text-ink group-hover:underline'}`}>
              {solution.author.username}{solution.is_mine && <span className="text-ink-faint font-normal"> (toi)</span>}
            </span>
            <span className="block text-xs text-ink-faint">{timeAgo(solution.created_at)}{edited ? ' · modifiée' : ''}</span>
          </span>
        </Link>
      </header>

      {solution.body && (
        <div className="text-ink-soft">
          <TipTapRenderer content={solution.body} />
        </div>
      )}

      {images.length > 0 && (
        <div className={`grid gap-2 mt-3 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}>
          {images.map((img) => (
            <button key={img.id} type="button" onClick={() => onOpenImage(img.download_url)}
              className={`rounded-xl overflow-hidden border border-line bg-[#faf9f7] ${images.length === 1 ? 'max-w-md' : 'aspect-[4/3]'}`}>
              <img src={img.download_url} alt={img.file_name} loading="lazy"
                className={images.length === 1 ? 'w-full h-auto' : 'w-full h-full object-cover'} />
            </button>
          ))}
        </div>
      )}
      {documents.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {documents.map((d) => (
            <a key={d.id} href={d.download_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-sm text-ink-soft hover:border-ink">
              {d.file_name}
            </a>
          ))}
        </div>
      )}

      {/* Votes en bas à gauche, comme sur Reddit, puis les actions de l'auteur. */}
      <footer className="flex items-center gap-1 mt-4 pt-3 border-t border-line">
        <VoteButtons
          likes={solution.like_count}
          dislikes={solution.dislike_count}
          initialVotes={solution.vote_count}
          showBadge={false}
          userVote={(solution.user_vote ?? 0) as 1 | -1 | 0}
          onVote={(v) => { if (v === 1 || v === -1) voteProposedSolution(solution.id, v).catch(() => undefined); }}
          vertical={false}
          size="sm"
        />
        {canDelete && (
          <span className="ml-2 flex items-center gap-1">
            {solution.is_mine && <button onClick={onEdit} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-ink-soft hover:bg-[#f2f1ee]">
              <Edit3 className="w-3.5 h-3.5" /> Modifier
            </button>}
            <button onClick={remove} disabled={deleting}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-[#a23b34] hover:bg-[#fbecea] disabled:opacity-50">
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Supprimer
            </button>
          </span>
        )}
      </footer>
    </article>
  );
};

// ────────────────────────────────────────────────────────────── Onglet

export const ProposedSolutions: React.FC<{
  contentId: string;
  solutions: ProposedSolution[] | null;
  isAuthenticated: boolean;
  onRequireLogin: () => void;
  onChanged: () => void;
}> = ({ contentId, solutions, isAuthenticated, onRequireLogin, onChanged }) => {
  const [composing, setComposing] = useState(false);
  const [editing, setEditing] = useState<ProposedSolution | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const mine = solutions?.find((s) => s.is_mine);

  const start = () => {
    if (!isAuthenticated) { onRequireLogin(); return; }
    setEditing(null);
    setComposing(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="fd-display text-ink" style={{ fontSize: 22 }}>Solutions des élèves</h2>
          <p className="text-sm text-ink-faint mt-1 max-w-xl">
            Compare ta démarche avec celle des autres. La correction officielle reste dans l'onglet « Exercice ».
          </p>
        </div>
        {!composing && !editing && (
          <button onClick={start} onPointerEnter={() => { if (isAuthenticated) loadEditor().catch(() => {}); }} className="fd-btn-primary">
            <PenLine className="w-4 h-4" /> {mine ? 'Proposer une autre solution' : 'Proposer ma solution'}
          </button>
        )}
      </div>

      {(composing || editing) && (
        <Composer
          key={editing?.id ?? 'new'}
          contentId={contentId}
          editing={editing}
          onCancel={() => { setComposing(false); setEditing(null); }}
          onDone={() => { setComposing(false); setEditing(null); onChanged(); }}
        />
      )}

      {solutions === null ? (
        <div className="fd-card p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-ink-faint" /></div>
      ) : solutions.length === 0 ? (
        !composing && (
          <div className="fd-card p-8 sm:p-10 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#f2f1ee] text-ink-faint flex items-center justify-center mx-auto mb-3">
              <Lightbulb className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-ink">Aucune solution proposée pour l'instant</h3>
            <p className="text-sm text-ink-faint mt-1.5 max-w-md mx-auto">
              Sois le premier à partager ta méthode : rédige-la avec l'éditeur, ou prends simplement ta copie en photo.
            </p>
            <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
              <button onClick={start} className="fd-btn-primary"><PenLine className="w-4 h-4" /> Rédiger ma solution</button>
              <button onClick={start} className="fd-btn-ghost"><Camera className="w-4 h-4" /> Envoyer une photo</button>
            </div>
          </div>
        )
      ) : (
        solutions.map((s) => (
          editing?.id === s.id ? null : (
            <SolutionCard key={s.id} solution={s}
              onEdit={() => { setComposing(false); setEditing(s); }}
              onDeleted={onChanged}
              onOpenImage={setLightbox} />
          )
        ))
      )}

      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
};

export default ProposedSolutions;

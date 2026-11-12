// Zone d'écriture de l'espace Discussions : l'éditeur du site (formules $…$, gras, listes ; Ctrl/Cmd + Entrée
// publie), photos jointes. L'éditeur (lourd) n'est chargé qu'au premier toucher : un faux champ à sa place.
import React, { Suspense, lazy, useState } from 'react';
import { FileIcon, Image as ImageIcon, Loader2, Paperclip, Send, X } from 'lucide-react';
import { FileUpload } from '@/components/common/FileUpload';
import { fileAPI } from '@/lib/api/contentItemApi';
import type { FileUploadResponse } from '@/types/fileAttachment';
import { t } from '@/i18n';

const loadEditor = () => import('@/components/editor/CompactTipTapEditor');
const CompactTipTapEditor = lazy(loadEditor);
const preload = () => { loadEditor().catch(() => {}); };

// Espaces insécables (`&nbsp;` ou le caractère lui-même, code 160) : un message qui n'en contient pas d'autre est vide.
const NBSP = new RegExp(`&nbsp;|${String.fromCharCode(160)}`, 'g');
export const isBlankHtml = (html: string) => !html.replace(/<[^>]*>/g, '').replace(NBSP, ' ').trim();

const FakeField: React.FC<{ placeholder: string; onActivate?: () => void; minHeight: string }> = ({ placeholder, onActivate, minHeight }) => (
  <button type="button" onClick={onActivate} onFocus={preload} onPointerEnter={preload} onPointerDown={preload}
    disabled={!onActivate} aria-label={placeholder}
    className="block w-full rounded-xl border border-line bg-white px-3.5 py-3 text-start text-[15px] text-ink-faint transition-colors hover:border-[#cfcdc8] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:cursor-wait"
    style={{ minHeight }}>
    {placeholder}
  </button>
);

export const MessageComposer: React.FC<{
  placeholder: string;
  submitLabel: string;
  /** Envoi ; une erreur garde le texte et affiche l'échec. Sans `onSubmit` : le texte est remonté par `onChange`. */
  onSubmit?: (html: string, fileIds: string[]) => Promise<void>;
  onChange?: (html: string) => void;
  onFilesChange?: (fileIds: string[]) => void;
  onCancel?: () => void;
  initial?: string;
  autoFocus?: boolean;
  deferred?: boolean;
  attachments?: boolean;
  minHeight?: string;
  /** Envoi impossible pour une autre raison (formulaire incomplet). */
  disabled?: boolean;
}> = ({
  placeholder, submitLabel, onSubmit, onChange, onFilesChange, onCancel, initial = '', autoFocus, deferred, attachments = true,
  minHeight = '72px', disabled = false,
}) => {
  const [active, setActive] = useState(!deferred);
  const [html, setHtml] = useState(initial);
  const [files, setFiles] = useState<FileUploadResponse[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blank = isBlankHtml(html) && files.length === 0;

  const change = (next: string) => { setHtml(next); onChange?.(next); };
  const setFileList = (next: FileUploadResponse[]) => { setFiles(next); onFilesChange?.(next.map((f) => f.id)); };

  const submit = async () => {
    if (!onSubmit || blank || busy || disabled) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(html, files.map((f) => f.id));
      change('');
      setFileList([]);
      setShowUpload(false);
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      setError(status === 429
        ? t('Beaucoup de messages d’un coup : réessaie dans un moment (ton texte est gardé).')
        : t('Ça n’est pas parti : vérifie ta connexion et réessaie (ton texte est gardé).'));
    } finally {
      setBusy(false);
    }
  };

  const removeFile = (id: string) => {
    setFileList(files.filter((f) => f.id !== id));
    fileAPI.delete(id).catch(() => {});
  };

  if (deferred && !active) return <FakeField placeholder={placeholder} onActivate={() => setActive(true)} minHeight={minHeight} />;

  return (
    <div>
      <Suspense fallback={<FakeField placeholder={placeholder} minHeight={minHeight} />}>
        <CompactTipTapEditor
          variant="comment"
          content={html}
          onChange={change}
          placeholder={placeholder}
          ariaLabel={placeholder}
          minHeight={minHeight}
          autoFocus={autoFocus || deferred}
          onSubmit={onSubmit ? submit : undefined}
          footer={(
            <>
              {attachments && (
                <button type="button" onClick={() => setShowUpload((v) => !v)} aria-pressed={showUpload} title={t('Joindre une photo')}
                  className={`inline-flex h-8 items-center gap-1 rounded-md px-2 text-[12.5px] font-semibold transition-colors ${
                    showUpload ? 'bg-brand-soft text-brand-hover' : 'text-ink-soft hover:bg-[#f2f1ee] hover:text-ink'}`}>
                  <Paperclip className="h-4 w-4" /><span className="hidden sm:inline">{t('Photo')}</span>
                </button>
              )}
              {onCancel && (
                <button type="button" onClick={onCancel}
                  className="inline-flex h-8 items-center rounded-lg px-2.5 text-[12.5px] font-semibold text-ink-soft hover:bg-[#f2f1ee]">
                  {t('Annuler')}
                </button>
              )}
              {onSubmit && (
                <button type="button" onClick={submit} disabled={blank || busy || disabled} title="Ctrl + Entrée"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand px-3 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-40">
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {submitLabel}
                </button>
              )}
            </>
          )}
        />
      </Suspense>
      {files.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-1.5 rounded-lg border border-line bg-[#faf9f7] py-1 ps-2.5 pe-1 text-[12.5px] text-ink-soft">
              {f.file_type === 'image' ? <ImageIcon className="h-3.5 w-3.5" /> : <FileIcon className="h-3.5 w-3.5" />}
              <span className="max-w-[180px] truncate">{f.file_name}</span>
              <button type="button" onClick={() => removeFile(f.id)} aria-label={t('Retirer {nom}', { nom: f.file_name })}
                className="rounded p-0.5 text-ink-faint hover:bg-[#f2f1ee] hover:text-ink"><X className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      )}
      {showUpload && (
        <div className="mt-2">
          <FileUpload accept="image/*,.pdf" maxSizeMB={10}
            onUploadComplete={(f) => { setFileList([...files, f]); setShowUpload(false); }}
            onUploadError={() => setError(t('Le fichier n’a pas pu être envoyé.'))} />
        </div>
      )}
      {error && <p role="alert" className="mt-1.5 text-[12.5px] font-medium text-[#a23b34]">{error}</p>}
    </div>
  );
};

export default MessageComposer;

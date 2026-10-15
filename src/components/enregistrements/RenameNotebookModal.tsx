// « Renommer » un cahier (menu ⋯ de sa couverture) : un champ, le refus d'un nom déjà pris s'affiche ici.
import React, { useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { t } from '@/i18n';
import { ModalShell, FormError, fieldCls } from './ModalShell';
import type { NbNotebook } from '@/components/notebook/notebookModel';

export const RenameNotebookModal: React.FC<{
  notebook: NbNotebook | null;
  onClose: () => void;
  rename: (title: string) => Promise<void>;
}> = ({ notebook, onClose, rename }) => {
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!notebook) return;
    setTitle(notebook.title);
    setError(null);
    const id = window.setTimeout(() => inputRef.current?.select(), 60);
    return () => window.clearTimeout(id);
  }, [notebook]);

  const submit = async () => {
    if (!notebook || busy) return;
    if (title.trim() === notebook.title) { onClose(); return; }
    setBusy(true);
    setError(null);
    try {
      await rename(title);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell open={!!notebook} onClose={onClose} labelId="renommer-cahier-titre" onSubmit={submit} title={t('Renommer le cahier')}>
      <label className="mt-5 block">
        <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-soft">{t('Nom du cahier')}</span>
        <input ref={inputRef} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} className={fieldCls} />
      </label>
      {error && <FormError>{error}</FormError>}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className="fd-btn-ghost min-h-11 justify-center sm:min-h-10">{t('Annuler')}</button>
        <button type="submit" disabled={busy || !title.trim()}
          className="fd-btn-primary min-h-11 justify-center disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-10">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {t('Enregistrer')}
        </button>
      </div>
    </ModalShell>
  );
};

export default RenameNotebookModal;

// « Nouvelle liste » de révision : nom (avec idées), description facultative, étiquettes. Une fois créée,
// on ouvre la liste. Utilisé par la page Réviser (pages/reviser/Reviser.tsx).
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Loader2 } from 'lucide-react';
import { t } from '@/i18n';
import { createRevisionList, type RevisionList } from '@/lib/api/revisionListApi';
import { RevisionLabelPicker, EMPTY_LABELS, labelsToPayload, type RevisionLabels } from '@/components/revision/RevisionLabelPicker';

const NAME_IDEAS = ['Limites — DS 1', 'Avant le bac blanc', 'Exercices ratés'];

export const CreateListModal: React.FC<{ open: boolean; onClose: () => void; onCreated?: (list: RevisionList) => void }> = ({
  open, onClose, onCreated,
}) => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [labels, setLabels] = useState<RevisionLabels>(EMPTY_LABELS);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setName(''); setDescription(''); setLabels(EMPTY_LABELS); setError(null);
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim() || creating) return;
    try {
      setCreating(true);
      const list = await createRevisionList({ name: name.trim(), description: description.trim(), ...labelsToPayload(labels) });
      onCreated?.(list);
      close();
      navigate(`/profile/revision-lists/${list.id}`);
    } catch (err) {
      setError((err as { response?: { data?: { name?: string[] } } })?.response?.data?.name?.[0] || t('La liste n’a pas pu être créée.'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-[rgba(20,18,16,.4)] p-4 backdrop-blur-[2px] [align-items:safe_center]" onClick={close}>
          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.16 }}
            className="w-full max-w-lg rounded-2xl border border-line bg-white p-6 shadow-[0_20px_50px_rgba(20,18,16,.22)]"
            onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-labelledby="new-list-title"
          >
            <h2 id="new-list-title" className="fd-display text-[22px] text-ink">{t('Nouvelle liste')}</h2>
            <p className="mt-1 text-[13px] text-ink-soft">{t('Regroupe des exercices à refaire ensemble. Tu pourras la renommer à tout moment.')}</p>

            <label className="mt-5 block">
              <span className="mb-1.5 block text-sm font-medium text-ink-soft">{t('Nom')}</span>
              <input type="text" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} autoFocus
                className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                placeholder={t('Ex. : Limites — DS 1')} />
            </label>
            {!name && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {NAME_IDEAS.map((idea) => (
                  <button key={idea} type="button" onClick={() => setName(t(idea))}
                    className="min-h-8 rounded-full border border-line px-3 py-1 text-[12px] text-ink-soft hover:border-ink-faint hover:text-ink">
                    {t(idea)}
                  </button>
                ))}
              </div>
            )}

            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-medium text-ink-soft">
                {t('Description')} <span className="font-normal text-ink-faint">{t('(facultatif)')}</span>
              </span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                className="w-full resize-none rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                placeholder={t('Pour le devoir du 12 novembre…')} />
            </label>

            <div className="mt-4"><RevisionLabelPicker value={labels} onChange={setLabels} /></div>

            {error && (
              <p role="alert" className="mt-3 flex items-center gap-2 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-3 py-2.5 text-[13px] text-[#a23b34]">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </p>
            )}

            <div className="mt-6 flex items-center gap-3">
              <button type="button" className="fd-btn-ghost min-h-10 flex-1 justify-center" onClick={close}>{t('Annuler')}</button>
              <button type="submit" className="fd-btn-primary min-h-10 flex-1 justify-center disabled:cursor-not-allowed disabled:opacity-50"
                disabled={creating || !name.trim()}>
                {creating ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('Création…')}</> : t('Créer la liste')}
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateListModal;

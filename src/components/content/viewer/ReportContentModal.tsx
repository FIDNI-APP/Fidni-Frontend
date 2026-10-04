// Fenêtre « Signaler une erreur » : raison, question concernée (facultatif), précision (facultatif).
// Les signalements arrivent dans Pilotage, où les administrateurs les traitent.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Flag, Loader2, X } from 'lucide-react';
import { reportContent, type ReportReason } from '@/lib/api/reportApi';
import { reportTargets, targetLabel } from '@/lib/reportTargets';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contentId: number | string;
  contentTitle: string;
  contentType: 'exercise' | 'exam' | 'lesson';
  structure: unknown;
  /** Question pré-sélectionnée (drapeau à côté d'une question). */
  initialPath?: string;
}

const MAX = 1000;

function reasonsFor(type: Props['contentType']): { value: ReportReason; label: string; hint: string }[] {
  const list: { value: ReportReason; label: string; hint: string }[] = [
    { value: 'statement', label: type === 'lesson' ? 'Erreur dans le cours' : 'Erreur dans l’énoncé',
      hint: type === 'lesson' ? 'Une définition, un théorème ou un exemple faux' : 'Une donnée fausse, une question impossible' },
  ];
  if (type !== 'lesson') list.push({ value: 'solution', label: 'Erreur dans la solution', hint: 'Un calcul ou un résultat faux' });
  if (type === 'exam') list.push({ value: 'scale', label: 'Barème incorrect', hint: 'Les points ne tombent pas juste' });
  list.push(
    { value: 'typo', label: 'Faute de frappe', hint: 'Orthographe, mot manquant' },
    { value: 'display', label: 'Affichage', hint: 'Formule ou figure mal affichée' },
    { value: 'other', label: 'Autre', hint: 'Dis-nous en quelques mots' },
  );
  return list;
}

const PLACEHOLDER: Record<ReportReason, string> = {
  statement: 'Ex. : la fonction n’est pas définie en 0, la question 2 est donc impossible.',
  solution: 'Ex. : à la fin, la limite vaut −∞ et non +∞.',
  scale: 'Ex. : l’exercice 2 est noté sur 5 mais ses questions font 6 points.',
  typo: 'Ex. : « dérivable » est mal écrit à la question 1.',
  display: 'Ex. : la fraction de la question 3 s’affiche en code.',
  other: 'Explique ce qui ne va pas.',
};

export const ReportContentModal: React.FC<Props> = ({ isOpen, onClose, contentId, contentTitle, contentType, structure, initialPath = '' }) => {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [path, setPath] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const reasons = useMemo(() => reasonsFor(contentType), [contentType]);
  const groups = useMemo(() => reportTargets(contentType, structure), [contentType, structure]);

  // Repartir de zéro à chaque ouverture.
  useEffect(() => {
    if (!isOpen) return;
    setReason(null); setPath(initialPath); setDescription(''); setError(null); setSent(false); setSending(false);
    const t = window.setTimeout(() => dialogRef.current?.querySelector<HTMLElement>('input[name="report-reason"]')?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || sending) return;
    setSending(true);
    setError(null);
    try {
      await reportContent(contentId, {
        reason,
        item_path: path || undefined,
        item_label: path ? targetLabel(groups, path) : undefined,
        description: description.trim() || undefined,
      });
      setSent(true);
    } catch (err: any) {
      const status = err?.response?.status;
      setError(status === 429
        ? 'Tu as envoyé beaucoup de signalements d’un coup. Réessaie un peu plus tard.'
        : 'Le signalement n’a pas pu être envoyé. Vérifie ta connexion et réessaie.');
    } finally {
      setSending(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-[rgba(20,18,16,.45)] p-0 sm:p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="report-title"
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl border border-line shadow-xl">
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-line">
          <div className="min-w-0">
            <h2 id="report-title" className="fd-display text-[20px] text-ink flex items-center gap-2">
              <Flag className="w-[18px] h-[18px] text-ink-soft" /> Signaler une erreur
            </h2>
            <p className="mt-0.5 text-[13px] text-ink-faint truncate">{contentTitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer"
            className="p-1.5 -mr-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-[#f7f6f3] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {sent ? (
          <div className="px-6 py-9 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-brand-soft flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-brand-hover" />
            </div>
            <p className="fd-display text-[19px] text-ink">Merci pour ton signalement</p>
            <p className="mt-1.5 text-sm text-ink-soft max-w-sm mx-auto">
              On vérifie et on corrige au plus vite. Grâce à toi, ce contenu sera juste pour tout le monde.
            </p>
            <button type="button" onClick={onClose} className="fd-btn-primary inline-flex mt-6">Fermer</button>
          </div>
        ) : (
          <form onSubmit={submit} className="px-6 py-5 space-y-5">
            <fieldset>
              <legend className="text-sm font-semibold text-ink mb-2.5">Quel est le problème ?</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {reasons.map((r) => {
                  const active = reason === r.value;
                  return (
                    <label key={r.value}
                      className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                        active ? 'border-brand bg-brand-soft' : 'border-line hover:border-[#cfcac1]'}`}>
                      <input type="radio" name="report-reason" value={r.value} checked={active}
                        onChange={() => setReason(r.value)} className="mt-[3px] accent-[#1a7a4a]" />
                      <span className="min-w-0">
                        <span className={`block text-[13.5px] font-medium ${active ? 'text-brand-hover' : 'text-ink'}`}>{r.label}</span>
                        <span className="block text-[12px] leading-snug text-ink-faint">{r.hint}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {groups.length > 0 && (
              <div>
                <label htmlFor="report-where" className="text-sm font-semibold text-ink">
                  {contentType === 'lesson' ? 'Partie concernée' : 'Question concernée'} <span className="font-normal text-ink-faint">(facultatif)</span>
                </label>
                <select id="report-where" value={path} onChange={(e) => setPath(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30">
                  <option value="">Tout le contenu / je ne sais pas</option>
                  {groups.map((g, gi) => g.title ? (
                    <optgroup key={gi} label={g.title}>
                      {g.items.map((it) => <option key={it.path} value={it.path}>{it.label}</option>)}
                    </optgroup>
                  ) : g.items.map((it) => <option key={it.path} value={it.path}>{it.label}</option>))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="report-text" className="text-sm font-semibold text-ink">
                Précise si tu veux <span className="font-normal text-ink-faint">(facultatif)</span>
              </label>
              <textarea id="report-text" value={description} maxLength={MAX} rows={3}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={reason ? PLACEHOLDER[reason] : 'Ce qui ne va pas, et ce qu’il faudrait selon toi.'}
                className="mt-1.5 w-full resize-y rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30" />
              <p className="mt-1 text-right text-[11.5px] text-ink-faint fd-nums">{description.length} / {MAX}</p>
            </div>

            {error && <p role="alert" className="rounded-xl border border-[#f0d4cf] bg-[#fbf1ef] px-3 py-2.5 text-[13px] text-[#9c3b2e]">{error}</p>}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="fd-btn-ghost">Annuler</button>
              <button type="submit" disabled={!reason || sending} className="fd-btn-primary inline-flex disabled:opacity-50 disabled:cursor-not-allowed">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                Envoyer
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default ReportContentModal;

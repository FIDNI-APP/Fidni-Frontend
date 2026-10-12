/**
 * « Publier sur FIDNI » : le prof choisit ce que devient son document (exercice, devoir, leçon), voit le
 * découpage trouvé, puis continue dans « Ajouter un contenu » prérempli (niveau, chapitre, vérification).
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { WizardContentType } from '@/lib/api/contentWriteApi';
import { describePrefill, documentToPrefill } from './publishDraft';

const TYPES: { key: WizardContentType; label: string; hint: string; base: string }[] = [
  { key: 'exam', label: 'Devoir ou examen', hint: 'Chaque titre (« Exercice 1 »…) ouvre une partie.', base: '/exams' },
  { key: 'exercise', label: 'Exercice', hint: 'Une liste numérotée = une question par élément.', base: '/exercises' },
  { key: 'lesson', label: 'Leçon', hint: 'Chaque titre ouvre une partie du cours.', base: '/lessons' },
];

export const PublishDialog: React.FC<{
  html: string; title: string; entete?: Record<string, unknown>; onClose: () => void; beforeLeave: () => Promise<void>;
}> = ({ html, title, entete, onClose, beforeLeave }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Un devoir s'il a un en-tête de devoir, sinon un exercice.
  const [type, setType] = useState<WizardContentType>(entete?.actif ? 'exam' : 'exercise');
  const prefill = useMemo(() => documentToPrefill(html, type, title, entete?.duree), [html, type, title, entete?.duree]);
  const empty = !html.replace(/<[^>]*>/g, '').trim();

  const go = async () => {
    // Un brouillon de contenu en cours (un seul par compte) serait remplacé : on demande.
    try {
      if (user && localStorage.getItem(`fidni:brouillon-contenu:${user.id}`)
        && !window.confirm('Un brouillon de contenu non publié est en cours dans « Ajouter un contenu ». Le remplacer par ce document ?')) return;
    } catch { /* stockage bloqué */ }
    await beforeLeave();
    navigate(`${TYPES.find((t) => t.key === type)?.base ?? '/exercises'}/new`, { state: { prefill } });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-4" role="dialog" aria-modal="true" aria-labelledby="pub-title"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div className="w-full max-w-[460px] rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 id="pub-title" className="text-[16px] font-semibold text-ink">Publier sur FIDNI</h2>
            <p className="mt-0.5 text-[13px] text-ink-soft">Le document reste dans « Mes documents » ; une copie devient un contenu du site.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-lg p-1 text-ink-faint hover:bg-[#f2f1ee] hover:text-ink"><X className="h-4 w-4" /></button>
        </div>
        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-[13px] font-semibold text-ink">Ce document est…</legend>
          {TYPES.map((t) => (
            <label key={t.key} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 ${type === t.key ? 'border-brand bg-brand-soft' : 'border-line hover:border-ink/30'}`}>
              <input type="radio" name="pub-type" className="mt-1 accent-[#1f7a4d]" checked={type === t.key} onChange={() => setType(t.key)} />
              <span>
                <span className="block text-[14px] font-medium text-ink">{t.label}</span>
                <span className="block text-[12.5px] text-ink-faint">{t.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <p className="mt-3 text-[13px] text-ink-soft" role="status">
          {empty ? 'Le document est vide.' : <>Découpage trouvé : <strong className="text-ink">{describePrefill(prefill)}</strong>. Tu pourras le corriger.</>}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="fd-btn-ghost min-h-10">Annuler</button>
          <button type="button" onClick={() => { void go(); }} disabled={empty} className="fd-btn-primary min-h-10 disabled:opacity-50">
            <Send className="h-4 w-4" /> Continuer
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublishDialog;

/**
 * « Publier sur FIDNI » : le prof choisit ce que devient son document (exercice, devoir, leçon), voit le
 * découpage trouvé, puis continue dans « Ajouter un contenu » prérempli (niveau, chapitre, vérification).
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, X } from 'lucide-react';
import { t } from '@/i18n';
import { useAuth } from '@/contexts/AuthContext';
import type { WizardContentType } from '@/lib/api/contentWriteApi';
import { describePrefill, documentToPrefill, plainText, serieToPrefills, splitExercises } from './publishDraft';
import { startSerie } from './serie';
import { Excerpt } from './Excerpt';

type PublishType = WizardContentType | 'serie';
const TYPES: { key: PublishType; label: string; hint: string; base: string }[] = [
  { key: 'serie', label: 'Série d’exercices (TD)', hint: 'Chaque exercice devient un contenu à part ; tu valides ses informations une à une.', base: '/exercises' },
  { key: 'exam', label: 'Devoir ou examen', hint: 'Chaque titre (« Exercice 1 »…) ouvre une partie.', base: '/exams' },
  { key: 'exercise', label: 'Exercice', hint: 'Une liste numérotée = une question par élément.', base: '/exercises' },
  { key: 'lesson', label: 'Leçon', hint: 'Chaque titre ouvre une partie du cours.', base: '/lessons' },
];

export const PublishDialog: React.FC<{
  html: string; title: string; entete?: Record<string, unknown>; onClose: () => void; beforeLeave: () => Promise<void>;
  documentId?: number | string;
}> = ({ html, title, entete, onClose, beforeLeave, documentId }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const exercises = useMemo(() => splitExercises(html).exercises, [html]);
  // Plusieurs « Exercice N » sans en-tête de devoir : une série de TD ; un en-tête : un devoir ; sinon un exercice.
  const [type, setType] = useState<PublishType>(entete?.actif ? 'exam' : exercises.length >= 2 ? 'serie' : 'exercise');
  const [keep, setKeep] = useState<number[]>(() => exercises.map((_, i) => i));
  const prefill = useMemo(() => documentToPrefill(html, type === 'serie' ? 'exercise' : type, title, entete?.duree), [html, type, title, entete?.duree]);
  const empty = !html.replace(/<[^>]*>/g, '').trim();
  const serieEmpty = type === 'serie' && !keep.length;

  const go = async () => {
    // Un brouillon de contenu en cours (un seul par compte) serait remplacé : on demande.
    try {
      if (user && localStorage.getItem(`fidni:brouillon-contenu:${user.id}`)
        && !window.confirm(t('Un brouillon de contenu non publié est en cours dans « Ajouter un contenu ». Le remplacer par ce document ?'))) return;
    } catch { /* stockage bloqué */ }
    await beforeLeave();
    if (type === 'serie') {
      startSerie(navigate, title, serieToPrefills(html, title, keep), documentId);
      return;
    }
    navigate(`${TYPES.find((ty) => ty.key === type)?.base ?? '/exercises'}/new`, { state: { prefill } });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-4" role="dialog" aria-modal="true" aria-labelledby="pub-title"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div className="max-h-[92vh] w-full max-w-[500px] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 id="pub-title" className="text-[16px] font-semibold text-ink">{t('Publier sur FIDNI')}</h2>
            <p className="mt-0.5 text-[13px] text-ink-soft">{t('Le document reste dans « Mes documents » ; une copie devient un contenu du site.')}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('Fermer')} className="rounded-lg p-1 text-ink-faint hover:bg-[#f2f1ee] hover:text-ink"><X className="h-4 w-4" /></button>
        </div>
        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-[13px] font-semibold text-ink">{t('Ce document est…')}</legend>
          {TYPES.map((ty) => (
            <label key={ty.key} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 ${type === ty.key ? 'border-brand bg-brand-soft' : 'border-line hover:border-ink/30'}`}>
              <input type="radio" name="pub-type" className="mt-1 accent-[#1f7a4d]" checked={type === ty.key} onChange={() => setType(ty.key)} />
              <span>
                <span className="block text-[14px] font-medium text-ink">{t(ty.label)}</span>
                <span className="block text-[12.5px] text-ink-faint">{t(ty.hint)}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {type === 'serie' ? (
          <div className="mt-3" role="status">
            {exercises.length ? (
              <>
                <p className="mb-1.5 text-[13px] text-ink-soft">
                  <strong className="text-ink">{exercises.length > 1 ? t('{n} exercices', { n: exercises.length }) : t('{n} exercice', { n: exercises.length })}</strong> {exercises.length > 1 ? t('trouvés : coche ceux à publier.') : t('trouvé : coche ceux à publier.')}
                </p>
                <ul className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-line p-1.5">
                  {exercises.map((ex, i) => (
                    <li key={i}>
                      <label className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-[#f7f6f3]">
                        <input type="checkbox" className="mt-0.5 accent-[#1f7a4d]" checked={keep.includes(i)}
                          onChange={(e) => setKeep((k) => (e.target.checked ? [...k, i].sort((a, b) => a - b) : k.filter((x) => x !== i)))} />
                        <span className="min-w-0">
                          <span className="block text-[13px] font-medium text-ink">{ex.title}</span>
                          <span className="line-clamp-2 block text-[12px] leading-snug text-ink-faint">{plainText(ex.html) ? <Excerpt text={plainText(ex.html).slice(0, 160)} /> : t('(vide)')}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-[13px] text-ink-soft">{t('Aucun « Exercice 1 », « Exercice 2 »… trouvé dans le document : choisis plutôt « Exercice ».')}</p>
            )}
          </div>
        ) : (
          <p className="mt-3 text-[13px] text-ink-soft" role="status">
            {empty ? t('Le document est vide.') : <>{t('Découpage trouvé :')} <strong className="text-ink">{describePrefill(prefill)}</strong>. {t('Tu pourras le corriger.')}</>}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="fd-btn-ghost min-h-10">{t('Annuler')}</button>
          <button type="button" onClick={() => { void go(); }} disabled={empty || serieEmpty || (type === 'serie' && !exercises.length)} className="fd-btn-primary min-h-10 disabled:opacity-50">
            <Send className="h-4 w-4" /> {type === 'serie' && keep.length ? (keep.length > 1 ? t('Publier {n} exercices', { n: keep.length }) : t('Publier {n} exercice', { n: keep.length })) : t('Continuer')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublishDialog;

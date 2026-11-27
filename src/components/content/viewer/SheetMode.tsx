/**
 * Feuille et plein écran (27/11/2026, Natsu : « la carte d'un examen comme le rendu final de l'impression PDF […] on
 * n'arrive pas à voir tout d'un seul coup […] peut-être un mode plein écran »).
 *
 * - `useVueSujet` : « Feuille » (serrée, comme le PDF) ou « Détaillée » (l'ancienne lecture aérée), retenue sur
 *   l'appareil. La feuille est le choix par défaut.
 * - `PleinEcran` : le sujet seul sur fond gris, la feuille au centre, une barre en haut (titre, actions, Quitter).
 *   Demande le vrai plein écran du navigateur quand il existe (pas sur iPhone : la superposition suffit). Échap ou
 *   « Quitter » referme.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { trackAction } from '@/lib/usage';
import { t } from '@/i18n';

export type VueSujet = 'feuille' | 'detaillee';
const CLE = 'fidni:vue-sujet';

export function useVueSujet(): [VueSujet, (v: VueSujet) => void] {
  const [vue, setVue] = useState<VueSujet>(() => {
    try { return localStorage.getItem(CLE) === 'detaillee' ? 'detaillee' : 'feuille'; } catch { return 'feuille'; }
  });
  const choisir = (v: VueSujet) => {
    setVue(v);
    trackAction(v === 'feuille' ? 'vue-sujet-feuille' : 'vue-sujet-detaillee');
    try { localStorage.setItem(CLE, v); } catch { /* stockage indisponible */ }
  };
  return [vue, choisir];
}

/** Choix de la vue + bouton « Plein écran », au-dessus de la feuille. */
export const BarreFeuille: React.FC<{ vue: VueSujet; onVue: (v: VueSujet) => void; onPleinEcran: () => void; children?: React.ReactNode }> = ({
  vue, onVue, onPleinEcran, children,
}) => (
  <div className="mb-3 flex flex-wrap items-center gap-2" data-tour="vue-sujet">
    <div role="radiogroup" aria-label={t('Affichage du sujet')} className="inline-flex rounded-full bg-[#f2f1ee] p-0.5">
      {(['feuille', 'detaillee'] as VueSujet[]).map((v) => (
        <button key={v} type="button" role="radio" aria-checked={vue === v} onClick={() => onVue(v)}
          className={`h-8 rounded-full px-3.5 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
            vue === v ? 'bg-white text-ink shadow-sm' : 'text-ink-faint hover:text-ink'}`}>
          {v === 'feuille' ? t('Feuille') : t('Détaillée')}
        </button>
      ))}
    </div>
    {children}
    <button type="button" onClick={onPleinEcran}
      className="ms-auto inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-[13px] font-medium text-ink-soft transition-colors hover:border-[#cfc9bf] hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
      <Maximize2 className="h-3.5 w-3.5" aria-hidden /> {t('Plein écran')}
    </button>
  </div>
);

export const PleinEcran: React.FC<{ open: boolean; onClose: () => void; titre: string; actions?: React.ReactNode; children: React.ReactNode }> = ({
  open, onClose, titre, actions, children,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    trackAction('plein-ecran');
    // Toute la page en plein écran (pas seulement la superposition) : les fenêtres de confirmation, ouvertes
    // ailleurs dans la page (« Terminer l'épreuve ? »), restent visibles.
    const root = document.documentElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    let natif = false;
    if (root.requestFullscreen && !document.fullscreenElement) {
      root.requestFullscreen().then(() => { natif = true; }).catch(() => { /* refusé : la superposition suffit */ });
    }
    // Sortie du plein écran par le navigateur (Échap) : on referme aussi la superposition.
    const onChange = () => { if (natif && !document.fullscreenElement) closeRef.current(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.fullscreenElement) closeRef.current(); };
    document.addEventListener('fullscreenchange', onChange);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={titre} className="fixed inset-0 z-[120] overflow-y-auto bg-[#e9e6e0] outline-none">
      <div className="sticky top-0 z-10 border-b border-line bg-[#f7f5f1]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[960px] items-center gap-2 px-3 py-2 sm:px-5">
          <p className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">{titre}</p>
          {actions}
          <button type="button" onClick={onClose}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[13px] font-semibold text-white hover:bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
            <Minimize2 className="hidden h-3.5 w-3.5 sm:block" aria-hidden />
            <X className="h-3.5 w-3.5 sm:hidden" aria-hidden />
            <span>{t('Quitter')}</span>
          </button>
        </div>
      </div>
      <div className="mx-auto max-w-[900px] px-2 py-4 sm:px-5 sm:py-8">
        <div className="shadow-[0_10px_40px_rgba(20,18,16,.12)] rounded-2xl sm:rounded-3xl">{children}</div>
      </div>
    </div>,
    document.body,
  );
};

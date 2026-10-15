// Vue secondaire (13/10/2026, « Ma progression ») : tiroir à droite sur ordinateur, feuille du bas sur téléphone.
// Voile, Échap, clic dehors, défilement de la page bloqué ; le focus entre dans la feuille, Tab y tourne, et revient
// au bouton d'origine à la fermeture. Cartes simples (pas de .fd-card ni de dégradé : pièges de index.css).
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { t } from '@/i18n';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const Sheet: React.FC<{
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  /** Sous le titre (état, raison…). */
  subtitle?: React.ReactNode;
  labelId: string;
  /** Pied collé en bas (actions). */
  footer?: React.ReactNode;
  children: React.ReactNode;
}> = ({ open, onClose, title, subtitle, labelId, footer, children }) => {
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const raf = requestAnimationFrame(() => panel.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closeRef.current(); return; }
      const box = panel.current;
      if (e.key !== 'Tab' || !box) return;
      const items = Array.from(box.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const inside = box.contains(document.activeElement);
      if (e.shiftKey && (!inside || document.activeElement === first || document.activeElement === box)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (!inside || document.activeElement === last)) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      if (before?.isConnected) before.focus();
    };
  }, [open]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] print:hidden">
          <motion.div className="absolute inset-0 bg-[rgba(20,18,16,.38)]" onClick={onClose} aria-hidden
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }} />
          <motion.div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={labelId}
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} transition={{ duration: 0.18 }}
            className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-3xl border-t border-line bg-white shadow-[0_-16px_40px_rgba(20,18,16,.18)] outline-none lg:inset-y-0 lg:start-auto lg:end-0 lg:max-h-none lg:w-[min(480px,100vw)] lg:rounded-none lg:rounded-s-3xl lg:border-s lg:border-t-0">
            <div aria-hidden className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[#dcd8d0] lg:hidden" />
            <div className="flex shrink-0 items-start gap-3 border-b border-line px-5 pb-4 pt-3 lg:pt-6">
              <div className="min-w-0 flex-1">
                <h2 id={labelId} className="fd-display text-[22px] leading-tight text-ink">{title}</h2>
                {subtitle && <div className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">{subtitle}</div>}
              </div>
              <button type="button" onClick={onClose} aria-label={t('Fermer')}
                className="-me-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-faint transition-colors hover:bg-[#f2f1ee] hover:text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
            {footer && <div className="shrink-0 border-t border-line bg-white px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

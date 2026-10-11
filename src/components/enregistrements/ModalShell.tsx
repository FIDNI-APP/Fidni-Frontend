// Petite fenêtre (création, renommage d'un cahier) : voile, Échap, clic dehors, titre serif.
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export const ModalShell: React.FC<{
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  labelId: string;
  onSubmit?: (e: React.FormEvent) => void;
  children: React.ReactNode;
}> = ({ open, onClose, title, subtitle, labelId, onSubmit, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex justify-center overflow-y-auto bg-[rgba(20,18,16,.4)] p-4 backdrop-blur-[2px] [align-items:safe_center]"
          onClick={onClose}>
          <motion.form
            onSubmit={(e) => { e.preventDefault(); onSubmit?.(e); }}
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.16 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-labelledby={labelId}
            className="relative w-full max-w-md rounded-2xl border border-line bg-white p-5 shadow-[0_20px_50px_rgba(20,18,16,.22)] sm:p-6"
          >
            <button type="button" onClick={onClose} aria-label="Fermer"
              className="absolute right-2.5 top-2.5 inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink-faint transition-colors hover:bg-[#f2f1ee] hover:text-ink">
              <X className="h-5 w-5" />
            </button>
            <h2 id={labelId} className="fd-display pr-10 text-[22px] leading-tight text-ink">{title}</h2>
            {subtitle && <p className="mt-1 pr-6 text-[13px] leading-relaxed text-ink-faint">{subtitle}</p>}
            {children}
          </motion.form>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

/** Champ de formulaire des petites fenêtres. */
export const fieldCls = 'w-full min-h-11 rounded-xl border border-line bg-white px-3.5 text-[14px] text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25';

export const FormError: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p role="alert" className="mt-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-3 py-2.5 text-[13px] font-medium text-[#a23b34]">{children}</p>
);

// La fenêtre de lib/confirmer.ts, montée une fois dans App. Sous le routeur : changer de page annule la question.
import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { declarerHote, repondreConfirmation, useConfirmation, type DemandeConfirmation } from '@/lib/confirmer';
import { t } from '@/i18n';

// « Supprimer ce DS ? Tes résultats restent sur Fidni. » : la question en titre, la précision dessous.
const decouper = (message: string) => {
  const m = /^([\s\S]+?[?؟])\s+([\s\S]+)$/.exec(message);
  return m ? { titre: m[1], detail: m[2] } : { titre: message, detail: null };
};

const Fenetre: React.FC<{ demande: DemandeConfirmation }> = ({ demande }) => {
  const id = useId();
  const annuler = useRef<HTMLButtonElement>(null);
  const valider = useRef<HTMLButtonElement>(null);
  const { titre, detail } = decouper(demande.message);

  useEffect(() => {
    const avant = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    (demande.danger ? annuler : valider).current?.focus({ preventScroll: true });
    // En capture : Échap ferme cette question, pas la fenêtre ouverte dessous.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); repondreConfirmation(false); return; }
      if (e.key !== 'Tab') return;
      e.preventDefault();
      (document.activeElement === annuler.current ? valider : annuler).current?.focus();
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      if (avant?.isConnected) avant.focus({ preventScroll: true });
    };
  }, [demande.danger]);

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 print:hidden">
      <motion.div aria-hidden className="absolute inset-0 bg-[rgba(20,18,16,.42)]" onClick={() => repondreConfirmation(false)}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }} />
      <motion.div role="alertdialog" aria-modal="true" aria-labelledby={`${id}-titre`} aria-describedby={detail ? `${id}-detail` : undefined}
        initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
        transition={{ type: 'spring', bounce: 0.28, duration: 0.34 }}
        className="fd-verre relative w-full max-w-[400px] rounded-2xl border border-line p-5 shadow-[0_24px_60px_rgba(20,18,16,.28)]">
        <h2 id={`${id}-titre`} className="text-[17px] font-semibold leading-snug text-ink">{titre}</h2>
        {detail && <p id={`${id}-detail`} className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">{detail}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button ref={annuler} type="button" variant="outline" className="min-h-11 flex-1 sm:flex-none" onClick={() => repondreConfirmation(false)}>
            {t('Annuler')}
          </Button>
          <Button ref={valider} type="button" variant={demande.danger ? 'destructive' : 'primary'} className="min-h-11 flex-1 sm:flex-none" onClick={() => repondreConfirmation(true)}>
            {demande.action ?? t('Confirmer')}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export const ConfirmerHote: React.FC = () => {
  const demande = useConfirmation();
  const { pathname } = useLocation();
  const page = useRef(pathname);

  useEffect(() => {
    declarerHote(true);
    return () => declarerHote(false);
  }, []);
  useEffect(() => {
    if (page.current !== pathname) repondreConfirmation(false);
    page.current = pathname;
  }, [pathname]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>{demande && <Fenetre key={demande.id} demande={demande} />}</AnimatePresence>,
    document.body,
  );
};

export default ConfirmerHote;

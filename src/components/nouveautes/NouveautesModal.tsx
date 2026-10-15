/**
 * Fenêtre « Nouveautés » (14/10/2026), façon annonce de produit : une scène animée en haut (les vrais éléments de la
 * page, components/nouveautes/scene), un titre, deux lignes, des points d'étape, « Suivant » puis le bouton de la
 * nouveauté. Flèches, balayage au doigt sur la scène, Échap ; le focus reste dans la fenêtre. Chargée à la demande.
 */
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import type { Nouveaute, SceneId } from './registre';
import SceneApercu from './scene/SceneApercu';
import SceneFaibles from './scene/SceneFaibles';
import SceneChapitres from './scene/SceneChapitres';
import SceneTemps from './scene/SceneTemps';
import SceneSombreBascule from './scene/SceneSombreBascule';
import SceneSombreContenu from './scene/SceneSombreContenu';
import SceneSombreReglage from './scene/SceneSombreReglage';

const SCENES: Record<SceneId, React.FC> = {
  apercu: SceneApercu, faibles: SceneFaibles, chapitres: SceneChapitres, temps: SceneTemps,
  'sombre-bascule': SceneSombreBascule, 'sombre-contenu': SceneSombreContenu, 'sombre-reglage': SceneSombreReglage,
};

export type Fin = 'cta' | 'fermee';

const glisse = {
  entre: (sens: number) => ({ x: sens * 48, opacity: 0 }),
  la: { x: 0, opacity: 1 },
  sort: (sens: number) => ({ x: sens * -48, opacity: 0 }),
};

const NouveautesModal: React.FC<{ nouveaute: Nouveaute; ctaLabel: string; onFinie: () => void; onClose: (fin: Fin) => void }> = ({
  nouveaute, ctaLabel, onFinie, onClose,
}) => {
  const n = nouveaute.etapes.length;
  const [[etape, sens], setEtape] = useState<[number, number]>([0, 1]);
  const boite = useRef<HTMLDivElement>(null);
  const principal = useRef<HTMLButtonElement>(null);
  const titreId = useId();
  const texteId = useId();
  const derniere = etape === n - 1;
  const e = nouveaute.etapes[etape];
  const Scene = SCENES[e.scene];

  const aller = useCallback((i: number) => {
    setEtape(([cur]) => {
      const next = Math.max(0, Math.min(n - 1, i));
      return next === cur ? [cur, 1] : [next, next > cur ? 1 : -1];
    });
  }, [n]);

  // Dernière étape atteinte : une fois.
  const finie = useRef(false);
  useEffect(() => {
    if (derniere && !finie.current) { finie.current = true; onFinie(); }
  }, [derniere, onFinie]);

  // Clavier (Échap, flèches, Tab gardé dans la fenêtre), défilement bloqué, focus rendu en partant.
  const etat = useRef({ etape, onClose, aller });
  etat.current = { etape, onClose, aller };
  useEffect(() => {
    const avant = document.activeElement as HTMLElement | null;
    principal.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (ev: KeyboardEvent) => {
      const s = etat.current;
      if (ev.key === 'Escape') { ev.preventDefault(); s.onClose('fermee'); return; }
      if (ev.key === 'ArrowRight') { ev.preventDefault(); s.aller(s.etape + 1); return; }
      if (ev.key === 'ArrowLeft') { ev.preventDefault(); s.aller(s.etape - 1); return; }
      if (ev.key !== 'Tab' || !boite.current) return;
      const f = Array.from(boite.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]'));
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
      else if (!boite.current.contains(document.activeElement)) { ev.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      avant?.focus?.();
    };
  }, []);

  const balayer = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -50 || info.velocity.x < -400) aller(etape + 1);
    else if (info.offset.x > 50 || info.velocity.x > 400) aller(etape - 1);
  };

  return createPortal(
    <motion.div className="fixed inset-0 z-[95] flex items-center justify-center bg-[rgba(20,18,16,.45)] p-3 backdrop-blur-[3px] sm:p-6"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
      onMouseDown={(ev) => { if (ev.target === ev.currentTarget) onClose('fermee'); }}>
      <motion.div ref={boite} role="dialog" aria-modal="true" aria-labelledby={titreId} aria-describedby={texteId} data-nouveautes
        className="relative flex max-h-[calc(100dvh-24px)] w-full max-w-[520px] flex-col overflow-hidden rounded-[22px] bg-white shadow-[0_30px_80px_rgba(20,18,16,.30)]"
        initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 360, damping: 32 }}>

        {/* La scène : fond crème pointillé, la « capture » animée ; balayer pour changer d'étape. */}
        <div className="relative h-[282px] shrink-0 overflow-hidden border-b border-line sm:h-[300px]"
          style={{ background: '#f3f0e9', backgroundImage: 'radial-gradient(rgba(26,26,26,.075) 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
          <AnimatePresence initial={false} custom={sens} mode="popLayout">
            <motion.div key={etape} custom={sens} variants={glisse} initial="entre" animate="la" exit="sort"
              transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
              className="absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing"
              drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.16} onDragEnd={balayer}>
              <Scene />
            </motion.div>
          </AnimatePresence>
          <button type="button" onClick={() => onClose('fermee')} aria-label="Fermer"
            className="absolute right-2.5 top-2.5 z-30 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-ink-soft shadow-[0_2px_8px_rgba(20,18,16,.15)] hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="min-h-[132px] overflow-y-auto px-5 pt-4 sm:px-7 sm:pt-5">
          <p className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 text-[11px] font-bold uppercase tracking-[.08em] text-gold-strong">
              <Sparkles className="h-3 w-3" aria-hidden /> Nouveau
            </span>
            <span className="text-[12.5px] font-semibold text-ink-faint">{nouveaute.sujet}</span>
          </p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={etape} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
              <h2 id={titreId} className="fd-display mt-2.5 text-[21px] leading-tight text-ink sm:text-[24px]">{e.titre}</h2>
              <p id={texteId} className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">{e.texte}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-3 px-5 pb-5 pt-4 sm:px-7 sm:pb-6">
          <div role="group" aria-label="Étapes" className="flex items-center">
            {nouveaute.etapes.map((x, i) => (
              <button key={x.titre} type="button" onClick={() => aller(i)} aria-label={`Étape ${i + 1} sur ${n} : ${x.titre}`}
                aria-current={i === etape ? 'step' : undefined}
                className="group flex h-8 items-center px-[3px] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded">
                <motion.span className={`block h-1.5 rounded-full ${i === etape ? 'bg-brand' : 'bg-[#dcd7cc] group-hover:bg-[#c5bfb2]'}`}
                  animate={{ width: i === etape ? 20 : 6 }} transition={{ duration: 0.25 }} />
              </button>
            ))}
          </div>
          <span className="flex-1" />
          {/* Téléphone, dernière étape : la croix suffit, le bouton de la nouveauté garde toute la place. */}
          <button type="button" onClick={() => onClose('fermee')}
            className={`${derniere ? 'hidden sm:inline-flex sm:items-center' : ''} min-h-11 rounded-xl px-3 text-[13.5px] font-semibold text-ink-faint hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40`}>
            {derniere ? 'Plus tard' : 'Passer'}
          </button>
          <button ref={principal} type="button" onClick={() => (derniere ? onClose('cta') : aller(etape + 1))} className="fd-btn-primary min-h-11">
            {derniere ? ctaLabel : 'Suivant'} <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
};

export default NouveautesModal;

/**
 * Pilotage — pastille « En direct » de l'en-tête (12/10/2026) : point vert qui pulse (immobile si l'appareil
 * demande moins d'animations), « mis à jour il y a 12 s » qui avance tout seul, « Hors ligne » après un échec.
 */
import React from 'react';
import { agoShort, useNow, type LiveStatus } from './livePilotage';

export const LivePill: React.FC<{ status: LiveStatus; updatedAt: number | null }> = ({ status, updatedAt }) => {
  const now = useNow(5000);
  const exact = updatedAt ? new Date(updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : null;
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-[#f0d4cf] bg-[#fbecea] px-3 py-1 text-[12px] font-medium text-[#a23b34]"
        title={exact ? `Dernière mise à jour réussie à ${exact}` : 'Le direct ne répond pas'}>
        <span className="h-2 w-2 shrink-0 rounded-full bg-[#a23b34]" aria-hidden />
        Hors ligne · réessai…
      </span>
    );
  }
  if (status === 'loading' || !updatedAt) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-[12px] text-ink-faint">
        <span className="h-2 w-2 shrink-0 rounded-full bg-[#cfcdc8]" aria-hidden />
        Connexion au direct…
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-white px-3 py-1 text-[12px] text-ink-soft"
      title={`Relu toutes les 30 s tant que la page est affichée · dernière mise à jour à ${exact}`}>
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60 motion-reduce:hidden motion-reduce:animate-none" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
      </span>
      <span><b className="font-semibold text-brand-hover">En direct</b><span className="text-ink-faint"> · mis à jour {agoShort(updatedAt, now)}</span></span>
    </span>
  );
};

export default LivePill;

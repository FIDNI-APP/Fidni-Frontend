/** Appel entrant (13/11/2026) : une carte en haut de l'écran, sur toutes les pages, avec la sonnerie. */
import React from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useMessagerieFacultative } from '@/contexts/MessagerieContext';
import { Avatar } from '@/components/discussions/parts';
import { t } from '@/i18n';

export const AppelEntrant: React.FC = () => {
  const m = useMessagerieFacultative();
  const e = m?.entrant;
  if (!m || !e) return null;
  const qui = e.de?.username;
  return (
    <div role="alertdialog" aria-live="assertive" aria-label={t('Appel entrant')}
      className="fd-fixe fixed inset-x-3 top-[max(12px,env(safe-area-inset-top))] z-[85] mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-[#171614] p-3 text-white shadow-[0_18px_44px_rgba(0,0,0,.32)] sm:inset-x-auto sm:end-5 sm:top-5">
      {e.de ? <Avatar user={{ username: e.de.username, avatar: e.de.avatar ?? null }} size={44} /> : <span className="h-11 w-11 shrink-0 rounded-full bg-white/10" />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-semibold">{qui || e.titre || t('Appel')}</p>
        <p className="truncate text-[12.5px] text-white/65">
          {e.appel.video ? t('t’appelle en vidéo') : t('t’appelle')}
          {e.titre && qui && e.titre !== qui ? ` · ${e.titre}` : ''}
        </p>
      </div>
      <button type="button" onClick={m.refuser} aria-label={t('Refuser')} title={t('Refuser')}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#c2453b] hover:bg-[#a83a31]">
        <PhoneOff className="h-5 w-5" />
      </button>
      {e.appel.video && (
        <button type="button" onClick={() => void m.repondre(true)} aria-label={t('Répondre en vidéo')} title={t('Répondre en vidéo')}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2f8f62] hover:bg-[#287a54]">
          <Video className="h-5 w-5" />
        </button>
      )}
      <button type="button" onClick={() => void m.repondre(false)} aria-label={t('Répondre')} title={e.appel.video ? t('Répondre sans caméra') : t('Répondre')}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2f8f62] hover:bg-[#287a54]">
        <Phone className="h-5 w-5" />
      </button>
    </div>
  );
};

export default AppelEntrant;

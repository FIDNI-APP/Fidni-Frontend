/**
 * Fenêtre de l'appel en cours (13/11/2026), montée une fois pour tout le site (AppShell) : l'appel continue quand
 * on change de page. Deux tailles :
 *  - grande : les participants en mosaïque (vidéo, ou leur photo quand la caméra est coupée), la barre des boutons ;
 *  - réduite : une pastille en bas, pour travailler sur le site en parlant (salle de travail).
 * Fond sombre fixe (.fd-fixe : le mode sombre ne le transforme pas) : c'est l'usage des visios, la vidéo y ressort.
 * Rien n'est enregistré : le son et l'image vont directement d'un navigateur à l'autre.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Mic, MicOff, Minimize2, MonitorUp, PhoneOff, Video, VideoOff } from 'lucide-react';
import { useMessagerieFacultative, type AppelActif } from '@/contexts/MessagerieContext';
import type { Membre } from '@/lib/api/messagerieApi';
import type { EtatMedia } from '@/lib/appels/maillage';
import { Avatar } from '@/components/discussions/parts';
import { t } from '@/i18n';

function duree(depuis: number) {
  const s = Math.max(0, Math.floor((Date.now() - depuis) / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function useHorloge(actif: boolean) {
  const [, setTic] = useState(0);
  useEffect(() => {
    if (!actif) return;
    const i = window.setInterval(() => setTic((n) => n + 1), 1000);
    return () => window.clearInterval(i);
  }, [actif]);
}

/** Qui parle : niveau du son d'un flux (analyseur du navigateur), pour souligner sa vignette. */
function useParle(flux: MediaStream | null, actif: boolean) {
  const [parle, setParle] = useState(false);
  useEffect(() => {
    if (!flux || !actif || !flux.getAudioTracks().length) { setParle(false); return; }
    let ctx: AudioContext | null = null;
    let raf = 0;
    try {
      ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(flux);
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      src.connect(an);
      const buf = new Uint8Array(an.fftSize);
      let dernier = 0;
      const lire = (ts: number) => {
        raf = requestAnimationFrame(lire);
        if (ts - dernier < 150) return;
        dernier = ts;
        an.getByteTimeDomainData(buf);
        let somme = 0;
        for (const v of buf) somme += (v - 128) * (v - 128);
        setParle(Math.sqrt(somme / buf.length) > 6);
      };
      raf = requestAnimationFrame(lire);
    } catch { /* pas d'analyse : pas de soulignement */ }
    return () => { cancelAnimationFrame(raf); ctx?.close().catch(() => {}); };
  }, [flux, actif]);
  return parle;
}

const Vignette: React.FC<{
  flux: MediaStream | null; membre?: Membre; nom: string; media: EtatMedia; moi?: boolean; connexion?: string; grande?: boolean;
}> = ({ flux, membre, nom, media, moi, connexion }) => {
  const video = useRef<HTMLVideoElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const voitVideo = media.camera || media.ecran;
  const parle = useParle(flux, media.micro);
  useEffect(() => {
    if (video.current && video.current.srcObject !== flux) video.current.srcObject = flux;
    if (audio.current && audio.current.srcObject !== flux) audio.current.srcObject = flux;
  }, [flux, voitVideo]);
  return (
    <div className={`relative flex min-h-0 items-center justify-center overflow-hidden rounded-2xl bg-[#26241f] ring-2 transition-shadow ${parle ? 'ring-[#3fb27f]' : 'ring-transparent'}`}>
      {voitVideo && flux ? (
        <video ref={video} autoPlay playsInline muted
          className={`h-full w-full ${media.ecran ? 'object-contain' : 'object-cover'} ${moi && !media.ecran ? '-scale-x-100' : ''}`} />
      ) : (
        <Avatar user={{ username: nom, avatar: membre?.avatar ?? null }} size={72} />
      )}
      {/* Le son des autres (le sien, jamais : pas d'écho). */}
      {!moi && <audio ref={audio} autoPlay />}
      <span className="absolute bottom-2 start-2 inline-flex max-w-[80%] items-center gap-1.5 rounded-lg bg-black/55 px-2 py-1 text-[12.5px] font-medium text-white">
        {!media.micro && <MicOff className="h-3.5 w-3.5 shrink-0 text-[#ffb4ab]" aria-label={t('Micro coupé')} />}
        <span className="truncate">{moi ? t('Toi') : nom}</span>
        {media.ecran && <span className="shrink-0 text-white/70">· {t('écran')}</span>}
      </span>
      {connexion && connexion !== 'connected' && !moi && (
        <span className="absolute inset-x-0 top-2 mx-auto w-max rounded-lg bg-black/55 px-2 py-1 text-[12px] text-white/85">
          {connexion === 'failed' || connexion === 'disconnected' ? t('Connexion instable…') : t('Connexion…')}
        </span>
      )}
    </div>
  );
};

const Bouton: React.FC<{ onClick: () => void; label: string; actif?: boolean; danger?: boolean; children: React.ReactNode }> = ({
  onClick, label, actif = true, danger, children,
}) => (
  <button type="button" onClick={onClick} aria-label={label} title={label} aria-pressed={danger ? undefined : actif}
    className={`inline-flex h-12 w-12 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
      danger ? 'bg-[#c2453b] text-white hover:bg-[#a83a31]' : actif ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-[#1f1d1a] hover:bg-white/90'}`}>
    {children}
  </button>
);

const COLONNES: Record<number, string> = {
  1: 'grid-cols-1', 2: 'grid-cols-1 sm:grid-cols-2', 3: 'grid-cols-2', 4: 'grid-cols-2',
  5: 'grid-cols-2 lg:grid-cols-3', 6: 'grid-cols-2 lg:grid-cols-3',
};

const Grande: React.FC<{ a: AppelActif }> = ({ a }) => {
  const m = useMessagerieFacultative()!;
  const n = a.pairs.length + 1;
  const ecranPossible = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia;
  const fermer = useRef<HTMLButtonElement>(null);
  useEffect(() => { fermer.current?.focus(); }, []);
  return (
    <div role="dialog" aria-modal="true" aria-label={t('Appel : {titre}', { titre: a.titre })}
      className="fd-fixe fixed inset-0 z-[80] flex flex-col bg-[#171614] text-white">
      <div className="flex items-center gap-3 px-4 pb-2 pt-[max(12px,env(safe-area-inset-top))] sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{a.titre}</p>
          <p className="fd-nums text-[12.5px] text-white/60">
            {a.etat === 'connexion' ? t('Connexion…') : a.pairs.length === 0 ? t('En attente des autres…') : duree(a.debut)}
            <span className="hidden sm:inline"> · {t('chiffré, jamais enregistré')}</span>
          </p>
        </div>
        <button ref={fermer} type="button" onClick={() => m.reduire(true)} aria-label={t('Réduire l’appel')} title={t('Réduire : continuer sur le site')}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-[13px] font-medium hover:bg-white/20">
          <Minimize2 className="h-4 w-4" /> <span className="hidden sm:inline">{t('Réduire')}</span>
        </button>
      </div>
      <div className={`grid min-h-0 flex-1 auto-rows-fr gap-2 p-2 sm:gap-3 sm:p-4 ${COLONNES[n] ?? 'grid-cols-3'}`}>
        <Vignette flux={a.local} nom={t('Toi')} media={a.media} moi />
        {a.pairs.map((p) => (
          <Vignette key={p.id} flux={p.flux} membre={a.membres[p.user]} nom={a.membres[p.user]?.username ?? '…'} media={p.media}
            connexion={p.connexion} />
        ))}
      </div>
      <div className="flex items-center justify-center gap-3 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-2">
        <Bouton onClick={m.basculerMicro} label={a.media.micro ? t('Couper le micro') : t('Activer le micro')} actif={a.media.micro}>
          {a.media.micro ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Bouton>
        <Bouton onClick={() => void m.basculerCamera()} label={a.media.camera ? t('Couper la caméra') : t('Activer la caméra')} actif={a.media.camera}>
          {a.media.camera ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </Bouton>
        {ecranPossible && (
          <Bouton onClick={() => void m.partagerEcran()} label={a.media.ecran ? t('Arrêter le partage d’écran') : t('Partager mon écran')} actif={!a.media.ecran}>
            <MonitorUp className="h-5 w-5" />
          </Bouton>
        )}
        <Bouton onClick={m.raccrocher} label={t('Raccrocher')} danger><PhoneOff className="h-5 w-5" /></Bouton>
      </div>
    </div>
  );
};

/** Appel réduit : une pastille en bas de l'écran, au-dessus de la barre du téléphone. */
const Reduite: React.FC<{ a: AppelActif }> = ({ a }) => {
  const m = useMessagerieFacultative()!;
  // Le son des autres continue : les lecteurs restent montés, invisibles.
  return (
    <div className="fd-fixe fixed bottom-[calc(76px+env(safe-area-inset-bottom))] end-3 z-[70] flex items-center gap-2 rounded-2xl bg-[#171614] p-1.5 ps-3 text-white shadow-[0_12px_32px_rgba(0,0,0,.28)] lg:bottom-5 lg:end-5">
      {a.pairs.map((p) => <AudioCache key={p.id} flux={p.flux} />)}
      <span className="relative flex h-2.5 w-2.5" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3fb27f] opacity-60 motion-reduce:animate-none" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#3fb27f]" />
      </span>
      <button type="button" onClick={() => m.reduire(false)} className="min-w-0 max-w-[40vw] text-start sm:max-w-[220px]" title={t('Agrandir l’appel')}>
        <span className="block truncate text-[13px] font-semibold">{a.titre}</span>
        <span className="fd-nums block text-[11.5px] text-white/60">{a.pairs.length ? duree(a.debut) : t('En attente…')}</span>
      </button>
      <button type="button" onClick={m.basculerMicro} aria-label={a.media.micro ? t('Couper le micro') : t('Activer le micro')}
        className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${a.media.micro ? 'bg-white/10 hover:bg-white/20' : 'bg-white text-[#1f1d1a]'}`}>
        {a.media.micro ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
      </button>
      <button type="button" onClick={() => m.reduire(false)} aria-label={t('Agrandir l’appel')}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
        <Maximize2 className="h-4 w-4" />
      </button>
      <button type="button" onClick={m.raccrocher} aria-label={t('Raccrocher')}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#c2453b] hover:bg-[#a83a31]">
        <PhoneOff className="h-4 w-4" />
      </button>
    </div>
  );
};

const AudioCache: React.FC<{ flux: MediaStream }> = ({ flux }) => {
  const r = useRef<HTMLAudioElement>(null);
  useEffect(() => { if (r.current && r.current.srcObject !== flux) r.current.srcObject = flux; }, [flux]);
  return <audio ref={r} autoPlay className="hidden" />;
};

export const FenetreAppel: React.FC = () => {
  const m = useMessagerieFacultative();
  const a = m?.appel ?? null;
  useHorloge(!!a);
  if (!a) return null;
  return a.reduit ? <Reduite a={a} /> : <Grande a={a} />;
};

export default FenetreAppel;

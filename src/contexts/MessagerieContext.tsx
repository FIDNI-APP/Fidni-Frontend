/**
 * Messagerie et appels, pour tout le site (13/11/2026) :
 *  - ouvre la connexion temps réel quand un membre est connecté (lib/tempsReel) et la ferme à la déconnexion ;
 *  - tient le nombre de conversations non lues (menu « Messages ») ;
 *  - gère l'appel en cours, qui continue quand on change de page (fenêtre réduite), et la sonnerie d'un appel entrant.
 * Les pages (Messages, salle de travail) lisent leurs données elles-mêmes et écoutent tempsReel.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { tempsReel, type Evenement } from '@/lib/tempsReel';
import { messagerieApi, type EtatAppel, type Membre } from '@/lib/api/messagerieApi';
import { Maillage, type EtatMedia, type Pair } from '@/lib/appels/maillage';
import { arreterSonnerie, sonner } from '@/lib/appels/sonnerie';
import { t } from '@/i18n';

export interface AppelActif {
  conversation: number;
  titre: string;
  membres: Record<number, Membre>;
  appel: number | null;
  moi: number | null;
  local: MediaStream | null;
  media: EtatMedia;
  pairs: Pair[];
  debut: number;
  reduit: boolean;
  etat: 'connexion' | 'en-cours';
}

export interface AppelEntrant {
  conversation: number;
  appel: EtatAppel;
  titre: string;
  de: Membre | null;
}

interface Valeur {
  nonLus: number;
  rafraichirNonLus: () => void;
  /** Conversation affichée à l'écran : ses nouveaux messages ne comptent pas comme non lus. */
  setOuverte: (id: number | null) => void;
  appel: AppelActif | null;
  entrant: AppelEntrant | null;
  lancer: (conversation: number, video: boolean) => Promise<void>;
  repondre: (video: boolean) => Promise<void>;
  refuser: () => void;
  raccrocher: () => void;
  basculerMicro: () => void;
  basculerCamera: () => Promise<void>;
  partagerEcran: () => Promise<void>;
  reduire: (r: boolean) => void;
}

const Ctx = createContext<Valeur | null>(null);

export const useMessagerie = (): Valeur => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useMessagerie hors de MessagerieProvider');
  return v;
};

/** Hors du fournisseur (pages publiques rendues à part) : rien, sans erreur. */
export const useMessagerieFacultative = (): Valeur | null => useContext(Ctx);

const VIDEO: MediaTrackConstraints = { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 24, max: 30 } };
const AUDIO: MediaTrackConstraints = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };

async function ouvrirMedia(video: boolean): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error(t('Ton navigateur ne permet pas les appels.'));
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: AUDIO, video: video ? VIDEO : false });
  } catch (e) {
    // Pas de caméra (ou refusée) : l'appel se fait en audio.
    if (video) {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: AUDIO, video: false });
        toast(t('Caméra indisponible : appel en audio.'));
        return s;
      } catch { /* on tombe sur l'erreur du micro */ }
    }
    const nom = (e as DOMException)?.name;
    throw new Error(nom === 'NotAllowedError'
      ? t('Autorise l’accès au micro dans ton navigateur pour appeler.')
      : t('Micro introuvable ou déjà utilisé.'));
  }
}

function titreDe(c: { titre: string }) { return c.titre; }

export const MessagerieProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const moiUser = user ? Number(user.id) : null;
  const [nonLus, setNonLus] = useState(0);
  const ouverte = useRef<number | null>(null);
  const [appel, setAppel] = useState<AppelActif | null>(null);
  const [entrant, setEntrant] = useState<AppelEntrant | null>(null);
  const appelRef = useRef<AppelActif | null>(null);
  const maillage = useRef<Maillage | null>(null);
  const camera = useRef<MediaStreamTrack | null>(null);
  const ecran = useRef<MediaStreamTrack | null>(null);
  const refuses = useRef<Set<number>>(new Set());
  const ice = useRef<RTCIceServer[] | null>(null);

  const maj = useCallback((f: (a: AppelActif) => AppelActif) => {
    setAppel((a) => {
      const n = a ? f(a) : a;
      appelRef.current = n;
      return n;
    });
  }, []);

  // ── Connexion temps réel et non-lus ────────────────────────────────────────────────────────────────────────────
  const rafraichirNonLus = useCallback(() => {
    if (!isAuthenticated) return;
    messagerieApi.nonLus().then(setNonLus).catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      tempsReel.arreter();
      setNonLus(0);
      return;
    }
    tempsReel.demarrer();
    rafraichirNonLus();
    const offs = [
      tempsReel.on('message.nouveau', (e) => {
        const m = e.message as { auteur: number | null; conversation: number };
        if (m.auteur !== moiUser && m.conversation !== ouverte.current) rafraichirNonLus();
      }),
      tempsReel.on('conversation.maj', rafraichirNonLus),
      tempsReel.on('reconnecte', rafraichirNonLus),
    ];
    return () => { offs.forEach((o) => o()); };
  }, [isAuthenticated, moiUser, rafraichirNonLus]);

  useEffect(() => () => tempsReel.arreter(), []);

  const setOuverte = useCallback((id: number | null) => { ouverte.current = id; }, []);

  // ── Appels ─────────────────────────────────────────────────────────────────────────────────────────────────────
  const fermerMedia = () => {
    appelRef.current?.local?.getTracks().forEach((tr) => tr.stop());
    ecran.current?.stop();
    camera.current = ecran.current = null;
  };

  const terminer = useCallback((message?: string) => {
    maillage.current?.fermer();
    maillage.current = null;
    fermerMedia();
    appelRef.current = null;
    setAppel(null);
    if (message) toast(message);
  }, []);

  const rejoindre = useCallback(async (conversation: number, video: boolean) => {
    const local = appelRef.current?.local;
    if (!local) return;
    if (!ice.current) ice.current = await messagerieApi.ice().catch(() => []);
    const r = await new Promise<Evenement>((ok, ko) => {
      const fin = () => { offA(); offB(); window.clearTimeout(minut); };
      const offA = tempsReel.on('appel.rejoint', (e) => { if (e.conversation === conversation) { fin(); ok(e); } });
      const offB = tempsReel.on('appel.erreur', (e) => { if (e.conversation === conversation) { fin(); ko(new Error(String(e.detail))); } });
      const minut = window.setTimeout(() => { fin(); ko(new Error(t('Connexion impossible. Vérifie ta connexion.'))); }, 15000);
      tempsReel.envoyer({ type: 'appel.rejoindre', conversation, video });
    });
    const appelId = r.appel as number;
    const moi = r.moi as number;
    maillage.current?.fermer();
    const m = new Maillage(moi, ice.current || [], local,
      (vers, donnees) => tempsReel.envoyer({ type: 'appel.signal', appel: appelId, vers, donnees }),
      () => maj((a) => ({ ...a, pairs: maillage.current?.pairs() ?? [] })),
      appelRef.current!.media, ecran.current ?? camera.current);
    maillage.current = m;
    maj((a) => ({ ...a, appel: appelId, moi, etat: 'en-cours' }));
    for (const p of (r.pairs as { id: number; user: number }[])) m.ajouter(p.id, p.user);
  }, [maj]);

  const demarrer = useCallback(async (conversation: number, video: boolean) => {
    if (appelRef.current) {
      if (appelRef.current.conversation === conversation) { maj((a) => ({ ...a, reduit: false })); return; }
      toast.error(t('Tu es déjà en appel. Raccroche d’abord.'));
      return;
    }
    let local: MediaStream;
    let infos: { titre: string; membres: Membre[] };
    try {
      [local, infos] = await Promise.all([ouvrirMedia(video), messagerieApi.conversation(conversation)]);
    } catch (e) {
      toast.error((e as Error).message || t('Appel impossible pour le moment.'));
      return;
    }
    camera.current = local.getVideoTracks()[0] ?? null;
    const a: AppelActif = {
      conversation, titre: titreDe(infos), membres: Object.fromEntries(infos.membres.map((x) => [x.id, x])),
      appel: null, moi: null, local, pairs: [], debut: Date.now(), reduit: false, etat: 'connexion',
      media: { micro: true, camera: !!camera.current, ecran: false },
    };
    appelRef.current = a;
    setAppel(a);
    try {
      await rejoindre(conversation, video);
    } catch (e) {
      terminer();
      toast.error((e as Error).message || t('Appel impossible pour le moment.'));
    }
  }, [maj, rejoindre, terminer]);

  const lancer = useCallback((conversation: number, video: boolean) => demarrer(conversation, video), [demarrer]);

  const repondre = useCallback(async (video: boolean) => {
    const e = entrant;
    arreterSonnerie();
    setEntrant(null);
    if (e) await demarrer(e.conversation, video);
  }, [entrant, demarrer]);

  const refuser = useCallback(() => {
    if (!entrant) return;
    arreterSonnerie();
    refuses.current.add(entrant.appel.id);
    tempsReel.envoyer({ type: 'appel.refuser', conversation: entrant.conversation });
    setEntrant(null);
  }, [entrant]);

  const raccrocher = useCallback(() => {
    const a = appelRef.current;
    if (a?.appel) tempsReel.envoyer({ type: 'appel.quitter', appel: a.appel });
    terminer();
  }, [terminer]);

  const annoncer = (media: EtatMedia) => {
    maj((a) => ({ ...a, media }));
    maillage.current?.annoncer(media);
  };

  const basculerMicro = useCallback(() => {
    const a = appelRef.current;
    if (!a?.local) return;
    const on = !a.media.micro;
    a.local.getAudioTracks().forEach((tr) => { tr.enabled = on; });
    annoncer({ ...a.media, micro: on });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const basculerCamera = useCallback(async () => {
    const a = appelRef.current;
    if (!a?.local) return;
    if (a.media.camera) {
      camera.current?.stop();
      if (camera.current) a.local.removeTrack(camera.current);
      camera.current = null;
      if (!a.media.ecran) await maillage.current?.remplacerVideo(null);
      annoncer({ ...a.media, camera: false });
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: VIDEO });
      const piste = s.getVideoTracks()[0];
      camera.current = piste;
      a.local.addTrack(piste);
      if (!a.media.ecran) await maillage.current?.remplacerVideo(piste);
      annoncer({ ...a.media, camera: true });
    } catch {
      toast.error(t('Caméra indisponible.'));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const partagerEcran = useCallback(async () => {
    const a = appelRef.current;
    if (!a) return;
    if (a.media.ecran) {
      ecran.current?.stop();
      ecran.current = null;
      await maillage.current?.remplacerVideo(camera.current);
      annoncer({ ...a.media, ecran: false });
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      toast.error(t('Le partage d’écran n’est pas possible sur cet appareil.'));
      return;
    }
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 10, max: 15 } }, audio: false });
      const piste = s.getVideoTracks()[0];
      piste.contentHint = 'detail';
      ecran.current = piste;
      // Arrêt depuis la barre du navigateur (« Arrêter le partage ») : on revient à la caméra.
      piste.onended = () => {
        if (ecran.current !== piste) return;
        ecran.current = null;
        void maillage.current?.remplacerVideo(camera.current);
        const cur = appelRef.current;
        if (cur) annoncer({ ...cur.media, ecran: false });
      };
      await maillage.current?.remplacerVideo(piste);
      annoncer({ ...a.media, ecran: true });
    } catch { /* partage annulé */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reduire = useCallback((r: boolean) => maj((a) => ({ ...a, reduit: r })), [maj]);

  // Événements des appels : arrivées, signaux, état (fin d'appel, départs), sonnerie.
  useEffect(() => {
    if (!isAuthenticated) return;
    const offs = [
      tempsReel.on('appel.arrivee', (e) => {
        const a = appelRef.current;
        const p = e.pair as { id: number; user: number };
        if (a && e.appel === a.appel) maillage.current?.ajouter(p.id, p.user);
      }),
      tempsReel.on('appel.signal', (e) => {
        const a = appelRef.current;
        if (a && e.appel === a.appel) void maillage.current?.signal(e.de as number, e.user as number, e.donnees as never);
      }),
      tempsReel.on('appel.refus', (e) => {
        const a = appelRef.current;
        if (a && e.conversation === a.conversation && a.pairs.length === 0) {
          const qui = a.membres[e.user as number]?.username;
          toast(qui ? t('{name} n’est pas disponible.', { name: qui }) : t('Appel refusé.'));
        }
      }),
      tempsReel.on('appel.maj', (e) => {
        const etat = e.appel as EtatAppel | null;
        const conv = e.conversation as number;
        const a = appelRef.current;
        if (a && a.conversation === conv && a.appel) {
          if (!etat || etat.id !== a.appel) { terminer(t('Appel terminé.')); return; }
          const ids = etat.presences.map((p) => p.id);
          if (a.moi && !ids.includes(a.moi)) { void rejoindre(conv, a.media.camera).catch(() => terminer(t('Appel interrompu.'))); return; }
          maillage.current?.garder(ids.filter((i) => i !== a.moi));
        }
        // Sonnerie : un appel commence dans une de mes conversations, sans moi.
        setEntrant((cur) => {
          if (!etat || etat.presences.some((p) => p.user === moiUser) || refuses.current.has(etat.id)
            || (a && a.conversation === conv) || Date.now() - Date.parse(etat.debut) > 60000) {
            if (cur && cur.conversation === conv) arreterSonnerie();
            return cur && cur.conversation === conv ? null : cur;
          }
          if (cur && cur.appel.id === etat.id) return { ...cur, appel: etat };
          if (cur || a) return cur;   // déjà une sonnerie, ou déjà en appel : la nouvelle attend dans la conversation
          messagerieApi.conversation(conv).then((c) => {
            setEntrant((x) => (x && x.appel.id === etat.id
              ? { ...x, titre: c.titre, de: c.membres.find((m) => m.id === etat.lance_par) ?? null } : x));
          }).catch(() => {});
          sonner();
          return { conversation: conv, appel: etat, titre: '', de: null };
        });
      }),
      tempsReel.on('reconnecte', () => {
        const a = appelRef.current;
        if (a?.appel) void rejoindre(a.conversation, a.media.camera).catch(() => terminer(t('Appel interrompu.')));
      }),
    ];
    return () => { offs.forEach((o) => o()); };
  }, [isAuthenticated, moiUser, rejoindre, terminer]);

  // Sonnerie sans réponse : 45 s, puis on arrête de sonner (l'appel reste visible dans la conversation).
  useEffect(() => {
    if (!entrant) return;
    const m = window.setTimeout(() => { arreterSonnerie(); setEntrant(null); }, 45000);
    return () => window.clearTimeout(m);
  }, [entrant?.appel.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Déconnexion du compte pendant un appel.
  useEffect(() => {
    if (!isAuthenticated && appelRef.current) terminer();
    if (!isAuthenticated) { arreterSonnerie(); setEntrant(null); }
  }, [isAuthenticated, terminer]);

  const valeur = useMemo<Valeur>(() => ({
    nonLus, rafraichirNonLus, setOuverte, appel, entrant, lancer, repondre, refuser, raccrocher,
    basculerMicro, basculerCamera, partagerEcran, reduire,
  }), [nonLus, rafraichirNonLus, setOuverte, appel, entrant, lancer, repondre, refuser, raccrocher, basculerMicro,
    basculerCamera, partagerEcran, reduire]);

  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>;
};

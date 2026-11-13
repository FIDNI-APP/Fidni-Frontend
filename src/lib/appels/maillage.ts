/**
 * Appels en maillage (13/11/2026) : chaque participant est relié directement à chacun des autres (WebRTC), 6 au plus.
 * Le serveur ne fait que la mise en relation (WebSocket, apps/messagerie/consumers.py) ; le son et l'image vont
 * d'un navigateur à l'autre, chiffrés (DTLS-SRTP), ou par le relais TURN de Fidni (coturn) si le réseau l'impose.
 *
 * Négociation « parfaite » (modèle du W3C) : chaque côté peut proposer une offre à tout moment (arrivée, caméra
 * allumée, partage d'écran) ; en cas de collision, le côté « poli » (la présence au plus grand numéro) cède.
 * Pour une classe entière, il faudra un serveur relais (SFU) : cette classe est la seule à remplacer.
 */

export interface EtatMedia { micro: boolean; camera: boolean; ecran: boolean }

export interface Pair {
  id: number;           // présence (une connexion, un appareil)
  user: number;
  flux: MediaStream;
  connexion: RTCPeerConnectionState | 'nouveau';
  media: EtatMedia;
}

interface Lien {
  pc: RTCPeerConnection;
  poli: boolean;
  offreEnCours: boolean;
  ignorerOffre: boolean;
  enAttente: RTCIceCandidateInit[];
  pair: Pair;
  relance: number | null;
}

type Signal = { description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit | null; etat?: EtatMedia };

export class Maillage {
  private liens = new Map<number, Lien>();
  private fermee = false;
  /** Piste vidéo envoyée à tous : caméra, écran partagé, ou rien. */
  private video: MediaStreamTrack | null;

  constructor(
    private readonly moi: number,
    private readonly ice: RTCIceServer[],
    private local: MediaStream,
    private readonly envoyer: (vers: number, donnees: Signal) => void,
    private readonly onChange: () => void,
    private media: EtatMedia,
    video: MediaStreamTrack | null,
  ) {
    this.video = video;
  }

  pairs(): Pair[] {
    return [...this.liens.values()].map((l) => l.pair);
  }

  /** Nouveau pair : le nouveau venu ajoute ses pistes tout de suite, ce qui déclenche son offre. */
  ajouter(id: number, user: number) {
    if (this.fermee || this.liens.has(id) || id === this.moi) return;
    const pc = new RTCPeerConnection({ iceServers: this.ice, bundlePolicy: 'max-bundle' });
    const lien: Lien = {
      pc, poli: this.moi > id, offreEnCours: false, ignorerOffre: false, enAttente: [], relance: null,
      pair: { id, user, flux: new MediaStream(), connexion: 'nouveau', media: { micro: true, camera: false, ecran: false } },
    };
    this.liens.set(id, lien);
    this.local.getAudioTracks().forEach((t) => pc.addTrack(t, this.local));
    // Toujours une voie vidéo (même en appel audio) : allumer la caméra ou partager l'écran ne fait qu'y changer la
    // piste, sans renégocier ; un nouveau venu reçoit aussi l'écran partagé.
    const voie = pc.addTransceiver('video', { direction: 'sendrecv', streams: [this.local] });
    if (this.video) void voie.sender.replaceTrack(this.video);

    pc.ontrack = ({ track }) => {
      const flux = lien.pair.flux;
      flux.getTracks().filter((t) => t.kind === track.kind).forEach((t) => flux.removeTrack(t));
      flux.addTrack(track);
      lien.pair = { ...lien.pair, flux: new MediaStream(flux.getTracks()) };
      this.onChange();
    };
    pc.onicecandidate = ({ candidate }) => this.envoyer(id, { candidate: candidate ? candidate.toJSON() : null });
    pc.onnegotiationneeded = async () => {
      try {
        lien.offreEnCours = true;
        await pc.setLocalDescription();
        if (pc.localDescription) this.envoyer(id, { description: pc.localDescription.toJSON() });
      } catch { /* collision : la négociation reprendra */ } finally {
        lien.offreEnCours = false;
      }
    };
    pc.onconnectionstatechange = () => {
      lien.pair = { ...lien.pair, connexion: pc.connectionState };
      // Coupure passagère (changement de réseau) : on relance la recherche de chemin une fois.
      if (pc.connectionState === 'failed') pc.restartIce();
      this.onChange();
    };
    this.envoyer(id, { etat: this.media });
    this.ajusterDebit();
    this.onChange();
  }

  async signal(de: number, user: number, d: Signal) {
    if (this.fermee) return;
    if (!this.liens.has(de)) this.ajouter(de, user);
    const lien = this.liens.get(de);
    if (!lien) return;
    const { pc } = lien;
    try {
      if (d.etat) {
        lien.pair = { ...lien.pair, media: { micro: !!d.etat.micro, camera: !!d.etat.camera, ecran: !!d.etat.ecran } };
        this.onChange();
      }
      if (d.description) {
        const collision = d.description.type === 'offer' && (lien.offreEnCours || pc.signalingState !== 'stable');
        lien.ignorerOffre = !lien.poli && collision;
        if (lien.ignorerOffre) return;
        await pc.setRemoteDescription(d.description);
        for (const c of lien.enAttente.splice(0)) await pc.addIceCandidate(c).catch(() => {});
        if (d.description.type === 'offer') {
          await pc.setLocalDescription();
          if (pc.localDescription) this.envoyer(de, { description: pc.localDescription.toJSON() });
        }
      } else if (d.candidate !== undefined) {
        if (!pc.remoteDescription) {
          if (d.candidate) lien.enAttente.push(d.candidate);
          return;
        }
        await pc.addIceCandidate(d.candidate ?? undefined).catch((e) => { if (!lien.ignorerOffre) throw e; });
      }
    } catch {
      /* signal hors d'ordre : la négociation suivante remettra les choses d'aplomb */
    }
  }

  retirer(id: number) {
    const lien = this.liens.get(id);
    if (!lien) return;
    lien.pc.close();
    this.liens.delete(id);
    this.ajusterDebit();
    this.onChange();
  }

  /** Garde seulement ces présences (état de l'appel envoyé par le serveur). */
  garder(ids: number[]) {
    [...this.liens.keys()].filter((id) => !ids.includes(id)).forEach((id) => this.retirer(id));
  }

  /** Change la piste vidéo envoyée (caméra, écran, ou rien) sans renégocier. */
  async remplacerVideo(piste: MediaStreamTrack | null) {
    this.video = piste;
    for (const { pc } of this.liens.values()) {
      const tr = pc.getTransceivers().find((t) => t.receiver.track?.kind === 'video');
      if (tr) await tr.sender.replaceTrack(piste).catch(() => {});
    }
    this.ajusterDebit();
  }

  annoncer(media: EtatMedia) {
    this.media = media;
    for (const id of this.liens.keys()) this.envoyer(id, { etat: media });
  }

  /** Débit vidéo envoyé à chacun : plus il y a de monde, plus il est bas (la connexion montante est partagée). */
  private ajusterDebit() {
    const n = this.liens.size;
    const max = n <= 1 ? 1_200_000 : n <= 3 ? 600_000 : 350_000;
    for (const { pc } of this.liens.values()) {
      for (const s of pc.getSenders()) {
        if (s.track?.kind !== 'video') continue;
        const p = s.getParameters();
        if (!p.encodings || !p.encodings.length) continue;
        p.encodings[0].maxBitrate = max;
        s.setParameters(p).catch(() => {});
      }
    }
  }

  fermer() {
    this.fermee = true;
    for (const { pc } of this.liens.values()) pc.close();
    this.liens.clear();
  }
}

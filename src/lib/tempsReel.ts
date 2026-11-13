/**
 * Temps réel (13/11/2026) : UNE connexion WebSocket par onglet, ouverte tant qu'un membre est connecté
 * (MessagerieProvider). Elle reçoit les événements de ses conversations (nouveau message, lu, « écrit… », appels) et
 * porte la mise en relation des appels (offres, réponses, candidats ICE).
 *
 * Adresse : celle de l'API, en ws(s), sur /ws/ (https://api.fidni.fr/api → wss://api.fidni.fr/ws/). On l'ouvre avec
 * un ticket de 60 s (POST /messagerie/ticket/) : le jeton de connexion ne passe jamais dans une adresse.
 * Coupure (réseau, serveur redémarré) : reconnexion avec un délai croissant (1 s → 30 s), et un événement « reconnecte »
 * pour que les pages relisent ce qu'elles ont pu manquer.
 */
import { api } from './api/apiClient';
import { messagerieApi } from './api/messagerieApi';

export type Evenement = { type: string; [cle: string]: unknown };
type Ecouteur = (e: Evenement) => void;

export function adresseWs(): string {
  const base = (api.defaults.baseURL || 'https://api.fidni.fr/api').replace(/\/+$/, '');
  const racine = base.replace(/\/api$/, '');
  const url = new URL(racine.startsWith('http') ? racine : window.location.origin + racine);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = url.pathname.replace(/\/+$/, '') + '/ws/';
  return url.toString();
}

class TempsReel {
  private ws: WebSocket | null = null;
  private ecouteurs = new Map<string, Set<Ecouteur>>();
  private actif = false;
  private essais = 0;
  private minuterie: number | null = null;
  private ping: number | null = null;
  private file: Evenement[] = [];
  /** Numéro de la connexion voulue : une ouverture commencée avant un arrêt/redémarrage est abandonnée (sinon deux
   *  sockets par onglet, et une reconnexion fantôme qui faisait rejoindre l'appel une fois de plus). */
  private generation = 0;
  connecte = false;

  demarrer() {
    if (this.actif) return;
    this.actif = true;
    this.generation += 1;
    void this.ouvrir(this.generation);
  }

  arreter() {
    this.actif = false;
    this.generation += 1;
    if (this.minuterie) window.clearTimeout(this.minuterie);
    if (this.ping) window.clearInterval(this.ping);
    this.minuterie = this.ping = null;
    this.file = [];
    const ws = this.ws;
    this.ws = null;
    this.connecte = false;
    ws?.close(1000);
  }

  /** S'abonner à un type d'événement (« * » : tous). Renvoie la fonction de désabonnement. */
  on(type: string, f: Ecouteur): () => void {
    if (!this.ecouteurs.has(type)) this.ecouteurs.set(type, new Set());
    this.ecouteurs.get(type)!.add(f);
    return () => { this.ecouteurs.get(type)?.delete(f); };
  }

  /** Envoie au serveur ; si la connexion est coupée, en attente jusqu'à la reconnexion (sauf « tape », sans intérêt). */
  envoyer(e: Evenement) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(e));
    else if (e.type !== 'tape' && e.type !== 'ping') this.file.push(e);
  }

  private emettre(e: Evenement) {
    this.ecouteurs.get(e.type)?.forEach((f) => { try { f(e); } catch { /* un écouteur fautif ne bloque pas les autres */ } });
    this.ecouteurs.get('*')?.forEach((f) => { try { f(e); } catch { /* idem */ } });
  }

  private async ouvrir(gen: number) {
    if (!this.actif || gen !== this.generation || this.ws) return;
    let ticket: string;
    try {
      ticket = await messagerieApi.ticket();
    } catch {
      this.relancer(gen);
      return;
    }
    if (!this.actif || gen !== this.generation || this.ws) return;
    const ws = new WebSocket(`${adresseWs()}?ticket=${encodeURIComponent(ticket)}`);
    this.ws = ws;
    ws.onopen = () => {
      if (this.ws !== ws) { ws.close(1000); return; }
      const reprise = this.essais > 0;
      this.essais = 0;
      this.connecte = true;
      if (this.ping) window.clearInterval(this.ping);
      // Signe de vie : le serveur garde ainsi la présence dans un appel (retirée après 75 s de silence).
      this.ping = window.setInterval(() => this.envoyer({ type: 'ping' }), 20000);
      const file = this.file.splice(0);
      file.forEach((e) => ws.send(JSON.stringify(e)));
      this.emettre({ type: reprise ? 'reconnecte' : 'connecte' });
    };
    ws.onmessage = (m) => {
      try { this.emettre(JSON.parse(m.data)); } catch { /* message illisible : ignoré */ }
    };
    ws.onclose = (ev) => {
      // Une ancienne socket qui se ferme ne touche pas à la connexion en cours.
      if (this.ws !== ws) return;
      if (this.ping) window.clearInterval(this.ping);
      this.ping = null;
      const etait = this.connecte;
      this.connecte = false;
      this.ws = null;
      if (etait) this.emettre({ type: 'deconnecte' });
      // 4401 : ticket refusé (session expirée) ; on retente quand même, le ticket suivant passera par le renouvellement.
      if (this.actif && ev.code !== 1000) this.relancer(gen);
    };
  }

  private relancer(gen: number) {
    if (!this.actif || gen !== this.generation || this.minuterie) return;
    this.essais += 1;
    // Au moins 2 s entre deux essais, même juste après une ouverture réussie qui s'est refermée aussitôt.
    const delai = Math.min(30000, 2000 * 2 ** Math.min(this.essais - 1, 4)) * (0.75 + Math.random() * 0.5);
    this.minuterie = window.setTimeout(() => { this.minuterie = null; void this.ouvrir(gen); }, delai);
  }
}

export const tempsReel = new TempsReel();

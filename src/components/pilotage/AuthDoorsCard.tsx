/**
 * Pilotage › Usage › « Portes d'inscription » (10/10/2026) : d'où s'ouvre la fenêtre de connexion / inscription
 * (un vote, un favori, le bandeau du bas…). Mesuré dans le navigateur (lib/usage.ts trackAuthOpen), visiteurs
 * compris. Backend : `auth_doors` de GET /api/pilotage/ (UsageDaily « auth:porte:<source> »).
 */
import React from 'react';
import { DoorOpen } from 'lucide-react';

export interface AuthDoor { source: string; count: number; visits?: number; anon?: number }

// Sources envoyées par le site → libellé (useOpenSignup(source) et openModal(source), relevées le 10/10/2026).
// Une source inconnue (ajoutée depuis) s'affiche brute, tirets remplacés par des espaces.
const DOOR_LABEL: Record<string, string> = {
  // Gestes d'un contenu (pages/content/ContentDetail, ContentList, cartes, recherche, accueil)
  vote: 'Vote « J’aime »', favori: 'Favori', solution: 'Voir la solution', commentaire: 'Commentaire',
  evaluer: 'S’évaluer (page d’un contenu)', 'auto-evaluation': 'S’évaluer (dans une liste)',
  statut: 'Réussi / à revoir (dans une liste)', 'liste-revision': 'Ajouter à une liste de révision',
  chrono: 'Enregistrer le chrono', publier: 'Publier un contenu', signaler: 'Signaler une erreur',
  'filtre-statut': 'Filtre « Réussis / À revoir »',
  // Invitations (components/auth/SignupPrompt, layout, Landing)
  bandeau: 'Bandeau en bas de page', carte: 'Carte « Crée ton compte »', sidebar: 'Menu latéral',
  'barre-haut': 'Bouton « Connexion » (barre du haut)', hero: 'Accueil : haut de page', cta: 'Accueil : bas de page',
  autre: 'Autre (non précisé)',
};
// hasOwn : une source envoyée par n'importe quel visiteur (« constructor »…) ne doit pas lire le prototype.
const doorLabel = (s: string) => (Object.prototype.hasOwnProperty.call(DOOR_LABEL, s) ? DOOR_LABEL[s] : s.replace(/-/g, ' '));

export const AuthDoorsCard: React.FC<{ doors: AuthDoor[]; days: number }> = ({ doors, days }) => {
  // Déjà triées par le serveur ; retriées ici au cas où (la plus utilisée en tête).
  const sorted = [...doors].sort((a, b) => b.count - a.count);
  const total = doors.reduce((n, d) => n + (d.count ?? 0), 0);
  const max = Math.max(1, ...doors.map((d) => d.count));
  return (
    <section className="fd-card p-5" aria-labelledby="pilotage-portes">
      <h2 id="pilotage-portes" className="fd-display flex items-center gap-2 text-[16px] text-ink">
        <DoorOpen className="h-4 w-4 text-ink-soft" /> Portes d’inscription
      </h2>
      <p className="mt-0.5 text-[12px] text-ink-faint">
        Ce qui ouvre la fenêtre de connexion / inscription, sur {days} j, visiteurs compris
        {total > 0 && <> : <b className="fd-nums text-ink-soft">{total.toLocaleString('fr-FR')}</b> ouvertures</>}.
        Mesuré depuis le 10 octobre.
      </p>
      {doors.length === 0 ? (
        <p className="mt-4 text-[13px] text-ink-faint">Aucune ouverture enregistrée sur la période.</p>
      ) : (
        <ol className="mt-4 flex flex-col gap-2.5">
          {sorted.map((d) => (
            <li key={d.source} title={d.anon ? `dont ${d.anon} par des visiteurs non connectés` : undefined}>
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="min-w-0 truncate text-ink">{doorLabel(d.source)}</span>
                <span className="fd-nums shrink-0 text-ink-faint">
                  <b className="text-ink">{(d.count ?? 0).toLocaleString('fr-FR')}</b> · {Math.round((d.count / Math.max(total, 1)) * 100)} %
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-[#f2f1ee]">
                <div className="h-full rounded-full bg-brand/70" style={{ width: `${Math.max((d.count / max) * 100, 2)}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

export default AuthDoorsCard;

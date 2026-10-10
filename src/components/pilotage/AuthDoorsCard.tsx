/**
 * Pilotage › Usage › « Portes d'inscription » (10/10/2026) : d'où s'ouvre la fenêtre de connexion / inscription
 * (un vote, un favori, le bandeau du bas…). Mesuré dans le navigateur (lib/usage.ts trackAuthOpen), visiteurs
 * compris. Backend : `auth_doors` de GET /api/pilotage/ (UsageDaily « auth:porte:<source> »).
 */
import React from 'react';
import { DoorOpen } from 'lucide-react';

export interface AuthDoor { source: string; count: number; visits?: number; anon?: number }

// Sources envoyées par le site (openModal / useOpenSignup) → libellé. Une source inconnue s'affiche telle quelle.
const DOOR_LABEL: Record<string, string> = {
  vote: 'Vote (j’aime)', favori: 'Favori', solution: 'Voir la solution', evaluer: 'Évaluer une question',
  'auto-evaluation': 'Auto-évaluation', statut: 'Statut réussi / à revoir', commentaire: 'Commentaire',
  liste: 'Liste de révision', 'liste-revision': 'Liste de révision', cahier: 'Cahier', chrono: 'Chrono',
  publier: 'Publier un contenu', signaler: 'Signaler une erreur', 'filtre-statut': 'Filtre « Réussis / À revoir »',
  bandeau: 'Bandeau en bas de page', carte: 'Carte d’invitation', sidebar: 'Barre latérale',
  'barre-haut': 'Bouton de la barre du haut', 'barre-mobile': 'Barre d’onglets (téléphone)',
  hero: 'Accueil : haut de page', cta: 'Accueil : bas de page', 'cta-final': 'Accueil : bas de page',
  autre: 'Autre (non précisé)',
};
const doorLabel = (s: string) => DOOR_LABEL[s] ?? s.replace(/-/g, ' ');

export const AuthDoorsCard: React.FC<{ doors: AuthDoor[]; days: number }> = ({ doors, days }) => {
  const total = doors.reduce((n, d) => n + d.count, 0);
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
          {doors.map((d) => (
            <li key={d.source} title={d.anon ? `dont ${d.anon} par des visiteurs non connectés` : undefined}>
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="min-w-0 truncate text-ink">{doorLabel(d.source)}</span>
                <span className="fd-nums shrink-0 text-ink-faint">
                  <b className="text-ink">{d.count.toLocaleString('fr-FR')}</b> · {Math.round((d.count / Math.max(total, 1)) * 100)} %
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

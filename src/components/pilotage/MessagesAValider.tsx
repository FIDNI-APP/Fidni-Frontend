// Pilotage › À traiter › Messages à valider (20/11/2026, backend apps/discussions/pilotage_views.py) : les 3 premiers
// messages d'un nouveau compte (forum, commentaires, réponses) restent invisibles tant que l'équipe ne les a pas
// acceptés. Accepter : le message apparaît et les notifications partent. Refuser : il est supprimé.
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Loader2, ShieldCheck, X } from 'lucide-react';
import { api } from '@/lib/api/apiClient';
import TipTapRenderer from '@/components/editor/TipTapRenderer';

interface Ligne {
  type: 'discussion' | 'reponse';
  id: number;
  genre: 'forum' | 'commentaire';
  titre: string;
  html: string;
  cree_le: string;
  url: string;
  contexte: string;
  fichiers: number;
  auteur: { id: number; username: string; nom: string; inscrit_le: string; niveau: string | null; valides: number };
}

function depuis(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `il y a ${Math.max(1, Math.floor(s / 60))} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}

const NATURE: Record<string, string> = { discussion: 'Discussion du forum', commentaire: 'Commentaire', reponse: 'Réponse' };

export const MessagesAValider: React.FC<{ onCountChange?: (n: number) => void }> = ({ onCountChange }) => {
  const [lignes, setLignes] = useState<Ligne[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const charger = useCallback(() => {
    api.get('/pilotage/messages-a-valider/')
      .then((r) => { setLignes(r.data.results ?? []); setErreur(false); })
      .catch(() => setErreur(true));
  }, []);
  useEffect(() => { charger(); }, [charger]);
  useEffect(() => { if (lignes) onCountChange?.(lignes.length); }, [lignes, onCountChange]);

  const agir = async (l: Ligne, action: 'accepter' | 'refuser') => {
    const cle = `${l.type}-${l.id}`;
    setBusy(cle);
    try {
      await api.post(`/pilotage/messages-a-valider/${l.type}/${l.id}/${action}/`);
      setLignes((prev) => (prev ?? []).filter((x) => `${x.type}-${x.id}` !== cle));
    } catch {
      charger();
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="fd-card mb-5 p-5" aria-labelledby="pilotage-messages-a-valider">
      <h2 id="pilotage-messages-a-valider" className="fd-display flex items-center gap-2 text-[16px] text-ink">
        <ShieldCheck className="h-4 w-4 text-ink-soft" /> Messages à valider
        {!!lignes?.length && <span className="fd-nums rounded-full bg-gold-soft px-1.5 text-[11.5px] font-semibold text-gold-strong">{lignes.length}</span>}
      </h2>
      <p className="mt-0.5 text-[12px] text-ink-faint">
        Les 3 premiers messages d’un nouveau compte restent cachés jusqu’à ta validation. Refuser supprime le message.
      </p>
      {erreur ? (
        <p className="mt-4 text-[13px] text-[#a23b34]">Chargement impossible.</p>
      ) : lignes === null ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-ink-faint" /></div>
      ) : lignes.length === 0 ? (
        <p className="mt-4 text-[13px] text-ink-faint">Aucun message en attente.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {lignes.map((l) => {
            const cle = `${l.type}-${l.id}`;
            const nature = NATURE[l.type === 'reponse' ? 'reponse' : l.genre === 'commentaire' ? 'commentaire' : 'discussion'];
            return (
              <li key={cle} className="rounded-xl border border-line bg-white p-4">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[12.5px] text-ink-faint">
                  <span className="font-semibold text-ink">{l.auteur.nom || l.auteur.username}</span>
                  <Link to={`/profile/${l.auteur.username}`} className="hover:underline">@{l.auteur.username}</Link>
                  <span>· inscrit {depuis(l.auteur.inscrit_le)}</span>
                  {l.auteur.niveau && <span>· {l.auteur.niveau}</span>}
                  <span>· {l.auteur.valides} message{l.auteur.valides > 1 ? 's' : ''} validé{l.auteur.valides > 1 ? 's' : ''}</span>
                </div>
                <p className="mt-1.5 text-[12.5px] text-ink-soft">
                  {nature} {depuis(l.cree_le)}
                  {l.titre && <> · <b className="text-ink">{l.titre}</b></>}
                  {l.contexte && <> · en réponse à « {l.contexte.slice(0, 80)}{l.contexte.length > 80 ? '…' : ''} »</>}
                  {l.fichiers > 0 && <> · {l.fichiers} fichier{l.fichiers > 1 ? 's' : ''}</>}
                  {' · '}<a href={l.url} target="_blank" rel="noreferrer" className="text-brand-hover hover:underline">voir en place</a>
                </p>
                <div className="mt-2 rounded-lg bg-[#faf9f7] px-3 py-2 text-[13.5px]">
                  <TipTapRenderer content={l.html} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={busy === cle} onClick={() => agir(l, 'accepter')}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-brand px-3.5 text-[13px] font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
                    <Check className="h-4 w-4" /> Accepter
                  </button>
                  <button type="button" disabled={busy === cle} onClick={() => agir(l, 'refuser')}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 text-[13px] font-semibold text-ink-soft hover:border-[#a23b34] hover:text-[#a23b34] disabled:opacity-50">
                    <X className="h-4 w-4" /> Refuser
                  </button>
                  <Link to={`/profile/${l.auteur.username}`}
                    className="inline-flex min-h-9 items-center rounded-xl px-2 text-[12.5px] text-ink-faint hover:text-ink">
                    Bannir depuis son profil
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default MessagesAValider;

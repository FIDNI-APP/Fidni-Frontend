// Pilotage › IA : qui peut faire corriger sa copie par l'IA (fonction cachée, 20/10/2026) et combien de fois.
// Les administrateurs y ont droit sans limite ; les autres seulement s'ils sont dans cette liste, avec leur limite.
import React, { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { copiesError } from '@/lib/api/copiesApi';
import {
  changerAcces, donnerAcces, listAcces, retirerAcces, type LigneAcces,
} from '@/lib/api/correctionIaApi';

export const CorrectionAccesPanel: React.FC = () => {
  const [lignes, setLignes] = useState<LigneAcces[] | null>(null);
  const [defaut, setDefaut] = useState(5);
  const [nom, setNom] = useState('');
  const [limite, setLimite] = useState('5');
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState(false);

  const charger = useCallback(() => {
    listAcces().then((r) => { setLignes(r.acces); setDefaut(r.defaut); setLimite(String(r.defaut)); })
      .catch((e) => setErreur(copiesError(e, 'Chargement impossible.')));
  }, []);
  useEffect(charger, [charger]);

  const agir = async (fn: () => Promise<unknown>) => {
    setOccupe(true);
    setErreur('');
    try { await fn(); charger(); } catch (e) { setErreur(copiesError(e, 'Action impossible.')); }
    setOccupe(false);
  };

  const ajouter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;
    agir(async () => { await donnerAcces(nom.trim(), Number(limite) || 0); setNom(''); });
  };

  return (
    <section className="fd-card mt-4 p-5" aria-labelledby="corr-acces">
      <h2 id="corr-acces" className="fd-display text-[16px] text-ink">Correction de copies par l’IA (élèves)</h2>
      <p className="mt-1 text-[12.5px] leading-snug text-ink-faint">
        Fonction cachée : le bouton « Corriger ma copie » apparaît en bas à droite de la page d’un examen, seulement pour les
        administrateurs (sans limite) et pour les personnes ci-dessous. Chaque correction coûte quelques centimes (Haiku 5.5) ;
        une correction qui échoue n’est pas décomptée.
      </p>

      <form onSubmit={ajouter} className="mt-3 flex flex-wrap items-end gap-2">
        <label className="flex min-w-40 flex-1 flex-col gap-1 text-[12px] font-semibold text-ink-soft">
          Nom d’utilisateur
          <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="ex. sara_k" autoComplete="off"
            className="min-h-10 rounded-lg border border-line px-3 text-[13.5px] font-normal text-ink" />
        </label>
        <label className="flex w-28 flex-col gap-1 text-[12px] font-semibold text-ink-soft">
          Corrections
          <input type="number" min={0} max={10000} value={limite} onChange={(e) => setLimite(e.target.value)}
            className="min-h-10 rounded-lg border border-line px-3 text-[13.5px] font-normal text-ink" />
        </label>
        <button type="submit" disabled={occupe || !nom.trim()} className="fd-btn-primary min-h-10 disabled:opacity-50">
          <Plus className="h-4 w-4" aria-hidden /> Donner l’accès
        </button>
      </form>
      <p className="mt-1 text-[11.5px] text-ink-faint">Par défaut {defaut} corrections. Redonner l’accès à quelqu’un change sa limite.</p>
      {erreur && <p role="alert" className="mt-2 text-[13px] text-[#a23b34]">{erreur}</p>}

      {!lignes ? <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-ink-faint" /></div>
        : lignes.length === 0 ? <p className="mt-3 text-[13px] text-ink-faint">Personne pour l’instant (à part les administrateurs).</p> : (
          <ul className="mt-3 divide-y divide-[#f2f1ee]">
            {lignes.map((l) => (
              <li key={l.user.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-ink">
                    {l.user.username}{!l.actif && <span className="ms-2 rounded-full bg-[#f2f1ee] px-2 py-0.5 text-[11px] font-semibold text-ink-faint">suspendu</span>}
                  </p>
                  <p className="fd-nums text-[12px] text-ink-faint">{l.utilisees} utilisée(s) sur {l.limite} · reste {l.restant}</p>
                </div>
                <label className="flex items-center gap-1.5 text-[12px] text-ink-soft">
                  Limite
                  <input type="number" min={0} max={10000} defaultValue={l.limite} key={`${l.user.id}-${l.limite}`}
                    onBlur={(e) => { const v = Number(e.target.value); if (v !== l.limite && v >= 0) agir(() => changerAcces(l.user.id, { limite: v })); }}
                    className="min-h-9 w-20 rounded-lg border border-line px-2 text-[13px] text-ink" />
                </label>
                <button type="button" disabled={occupe} title="Remettre le compteur à zéro"
                  onClick={() => agir(() => changerAcces(l.user.id, { remettre_a_zero: true }))}
                  className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-[12px] font-semibold text-ink-soft hover:bg-[#f2f1ee]">
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Remise à zéro
                </button>
                <button type="button" disabled={occupe} onClick={() => agir(() => changerAcces(l.user.id, { actif: !l.actif }))}
                  className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-[12px] font-semibold text-ink-soft hover:bg-[#f2f1ee]">
                  <Check className="h-3.5 w-3.5" aria-hidden /> {l.actif ? 'Suspendre' : 'Réactiver'}
                </button>
                <button type="button" disabled={occupe} aria-label={`Retirer l’accès de ${l.user.username}`}
                  onClick={() => { if (window.confirm(`Retirer l’accès de ${l.user.username} ?`)) agir(() => retirerAcces(l.user.id)); }}
                  className="inline-flex min-h-9 items-center rounded-lg px-2 text-[#a23b34] hover:bg-[#fbecea]">
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
    </section>
  );
};

export default CorrectionAccesPanel;

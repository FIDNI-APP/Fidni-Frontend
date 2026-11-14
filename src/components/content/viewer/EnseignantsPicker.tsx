// Page d'un contenu, équipe seulement (14/11/2026) : choisir ses enseignants parmi ceux du Pilotage, ou en créer un.
// Backend : PUT /api/pilotage/contenus/<id>/enseignants/ (things/enseignants_views.py).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Loader2, Pencil, Plus, Search } from 'lucide-react';
import { FloatingPanel } from '@/components/ui/FloatingPanel';
import { enseignantsApi, type EnseignantAdmin } from '@/lib/api/enseignantsApi';
import type { ContentEnseignant } from '@/types/content';

const sansAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** « M. Khalid Haddar » → {civilite, prenom, nom} pour créer depuis la recherche. */
const decouper = (texte: string) => {
  const mots = texte.trim().split(/\s+/);
  let civilite = '';
  if (/^(m\.?|mr\.?|monsieur)$/i.test(mots[0] ?? '')) { civilite = 'M.'; mots.shift(); }
  else if (/^(mme\.?|madame|mlle\.?)$/i.test(mots[0] ?? '')) { civilite = 'Mme'; mots.shift(); }
  return mots.length > 1 ? { civilite, prenom: mots[0], nom: mots.slice(1).join(' ') } : { civilite, prenom: '', nom: mots[0] ?? '' };
};

export const EnseignantsPicker: React.FC<{
  contentId: number | string;
  value: ContentEnseignant[];
  onChange: (next: ContentEnseignant[]) => void;
}> = ({ contentId, value, onChange }) => {
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState<EnseignantAdmin[] | null>(null);
  const [chosen, setChosen] = useState<number[]>(value.map((e) => e.id));
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setChosen(value.map((e) => e.id));
    setError(null);
    if (all === null) enseignantsApi.list().then(setAll).catch(() => setError('Liste indisponible.'));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = useMemo(() => {
    const s = sansAccents(q.trim());
    const rows = (all ?? []).filter((e) => !s || sansAccents(e.nom_affiche).includes(s));
    // Les choisis d'abord, puis les plus fournis.
    return rows.sort((a, b) => Number(chosen.includes(b.id)) - Number(chosen.includes(a.id)) || b.contenus - a.contenus).slice(0, 40);
  }, [all, q, chosen]);

  const toggle = (id: number) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const create = async () => {
    const d = decouper(q);
    if (!d.nom) return;
    try {
      const e = await enseignantsApi.create(d);
      setAll((prev) => [...(prev ?? []), e]);
      setChosen((c) => [...c, e.id]);
      setQ('');
    } catch (err) {
      setError(enseignantsApi.erreur(err, 'Création impossible.'));
    }
  };
  const save = async () => {
    setBusy(true);
    try {
      onChange(await enseignantsApi.setForContent(contentId, chosen));
      setOpen(false);
    } catch (err) {
      setError(enseignantsApi.erreur(err, 'Enregistrement impossible.'));
    } finally {
      setBusy(false);
    }
  };
  const exact = (all ?? []).some((e) => sansAccents(e.nom_affiche) === sansAccents(q.trim()));

  return (
    <>
      <button ref={anchor} type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        title="Enseignants de ce contenu (équipe)"
        className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[12.5px] font-medium text-ink-faint hover:bg-[#f2f1ee] hover:text-ink print:hidden">
        <Pencil className="h-3.5 w-3.5" />{value.length ? 'Enseignants' : 'Ajouter un enseignant'}
      </button>
      <FloatingPanel anchorRef={anchor} open={open} onClose={() => setOpen(false)} placement="bottom-start"
        className="w-[320px] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_16px_40px_rgba(20,18,16,.14)]">
        <div className="border-b border-line p-2.5">
          <label className="relative block">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher ou créer (M. Khalid Haddar)"
              className="h-9 w-full rounded-lg border border-line ps-8 pe-2.5 text-[13.5px] focus:border-brand focus:outline-none" />
          </label>
        </div>
        <ul className="max-h-64 overflow-y-auto py-1">
          {all === null && !error && <li className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-ink-faint" /></li>}
          {shown.map((e) => {
            const on = chosen.includes(e.id);
            return (
              <li key={e.id}>
                <button type="button" onClick={() => toggle(e.id)} aria-pressed={on}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-start text-[13.5px] hover:bg-[#faf9f7]">
                  <span className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border ${on ? 'border-brand bg-brand text-white' : 'border-[#cfc9bf]'}`}>
                    {on && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-ink">{e.nom_affiche}</span>
                  <span className="fd-nums text-[12px] text-ink-faint">{e.contenus}</span>
                </button>
              </li>
            );
          })}
          {q.trim() && !exact && (
            <li>
              <button type="button" onClick={create} className="flex w-full items-center gap-2 px-3 py-2 text-start text-[13.5px] font-medium text-brand-hover hover:bg-[#faf9f7]">
                <Plus className="h-4 w-4" />Créer « {q.trim()} »
              </button>
            </li>
          )}
        </ul>
        {error && <p className="px-3 pb-2 text-[12.5px] text-[#a23b34]">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-line p-2.5">
          <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-lg px-3 text-[13.5px] font-medium text-ink-muted hover:bg-[#f2f1ee]">Annuler</button>
          <button type="button" onClick={save} disabled={busy}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13.5px] font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}Enregistrer
          </button>
        </div>
      </FloatingPanel>
    </>
  );
};

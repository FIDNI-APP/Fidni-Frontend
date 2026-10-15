/**
 * Pilotage › Membres › « Comptes bannis » (11/10/2026). Un compte supprimé par la modération avec « Bannir aussi »
 * ne peut plus être recréé : son adresse e-mail et son compte Google à vie, ses adresses IP pendant 30 jours
 * (seulement pour CRÉER un compte : les membres qui partagent l'IP ne sont pas gênés). Ici : la liste, débannir,
 * et bannir à la main une adresse ou une IP (par exemple celle d'un compte déjà supprimé, retrouvée dans les
 * journaux d'envoi des e-mails). Backend : /api/pilotage/bannis/ (apps/users/bans.py, bans_views.py).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Ban, ChevronDown, Loader2, Undo2 } from 'lucide-react';
import { api } from '@/lib/api/apiClient';

interface BanRow {
  id: number; kind: 'email' | 'google' | 'ip'; value: string; username: string; motif: string;
  created_at: string; expires_at: string | null; created_by: string | null;
}

const KIND: Record<BanRow['kind'], string> = { email: 'Adresse e-mail', google: 'Compte Google', ip: 'Adresse IP' };
const day = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

export const BansCard: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<BanRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<'email' | 'ip'>('email');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await api.get('/pilotage/bannis/');
      setRows(r.data.results ?? []);
    } catch {
      setError('La liste n’a pas pu être chargée.');
    }
  }, []);
  useEffect(() => { if (open && rows === null) load(); }, [open, rows, load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.post('/pilotage/bannis/', { kind, value: value.trim(), motif: 'Ajout manuel' });
      setValue('');
      await load();
    } catch (err) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Le bannissement a échoué.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: BanRow) => {
    if (!window.confirm(`Débannir ${KIND[row.kind].toLowerCase()} « ${row.value} » ?`)) return;
    try {
      await api.delete(`/pilotage/bannis/${row.id}/`);
      setRows((rs) => (rs ?? []).filter((r) => r.id !== row.id));
    } catch {
      setError('Le débannissement a échoué.');
    }
  };

  return (
    <section className="fd-card mb-4 overflow-hidden">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-start hover:bg-[#faf9f7]">
        <Ban className="h-4 w-4 shrink-0 text-ink-soft" />
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-ink">Comptes bannis</span>
          <span className="block text-[12px] text-ink-faint">Adresses e-mail, comptes Google et IP (30 jours) qui ne peuvent plus créer de compte.</span>
        </span>
        {rows && rows.length > 0 && <span className="fd-nums rounded-full bg-[#f2f1ee] px-2 text-[12px] font-semibold text-ink-soft">{rows.length}</span>}
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-faint transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-line px-5 py-4">
          <form onSubmit={add} className="flex flex-wrap items-center gap-2">
            <select value={kind} onChange={(e) => setKind(e.target.value as 'email' | 'ip')} aria-label="Type"
              className="h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink focus:border-brand focus:outline-none">
              <option value="email">Adresse e-mail</option>
              <option value="ip">Adresse IP (30 jours)</option>
            </select>
            <input value={value} onChange={(e) => setValue(e.target.value)} aria-label="Valeur à bannir"
              placeholder={kind === 'email' ? 'adresse@exemple.fr' : '41.250.12.34'}
              className="h-11 min-w-[200px] flex-1 rounded-xl border border-line bg-white px-3.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30" />
            <button type="submit" disabled={busy || !value.trim()}
              className="inline-flex h-11 items-center gap-1.5 rounded-[10px] bg-[#a23b34] px-4 text-[13px] font-semibold text-white hover:bg-[#8a312b] disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />} Bannir
            </button>
          </form>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-faint">
            Gmail : les variantes de la même boîte (points, « +… ») sont bannies ensemble. Une IP mobile est souvent partagée :
            elle n’empêche que la création de compte, et seulement 30 jours.
          </p>
          {error && <p role="alert" className="mt-3 text-[13px] text-[#9c3b2e]">{error}</p>}

          {rows === null ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-ink-faint" /></div>
          ) : rows.length === 0 ? (
            <p className="mt-4 text-[13px] text-ink-faint">Aucun bannissement en cours.</p>
          ) : (
            <ul className="mt-4 divide-y divide-[#f2f1ee] rounded-xl border border-line">
              {rows.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5">
                  <span className="w-[118px] shrink-0 text-[12px] font-semibold uppercase tracking-[.05em] text-ink-faint">{KIND[r.kind]}</span>
                  <span className="min-w-0 flex-1 break-all text-[13.5px] font-medium text-ink">{r.value}</span>
                  <span className="text-[12px] text-ink-faint">
                    {r.username ? <>« {r.username} » · </> : null}{day(r.created_at)}
                    {r.expires_at ? <> · jusqu’au {day(r.expires_at)}</> : null}
                  </span>
                  <button type="button" onClick={() => remove(r)}
                    className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-[12.5px] font-medium text-ink-soft hover:bg-[#f2f1ee] hover:text-ink">
                    <Undo2 className="h-3.5 w-3.5" /> Débannir
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
};

export default BansCard;

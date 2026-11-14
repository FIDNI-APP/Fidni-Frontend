/**
 * Pilotage › Enseignants (14/11/2026). Un enseignant est un NOM posé sur des contenus (« M. Khalid Haddar »), distinct
 * des comptes : il peut ne pas être inscrit. Ici : le renommer (civilité, prénom, nom), le relier au compte d'un
 * professeur inscrit (pseudo), fusionner deux orthographes de la même personne (Naoufel / Naoufal), le supprimer.
 * Ils sont créés à l'import (crédit des fiches) ou ici. Backend : things/enseignants_views.py.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, GitMerge, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { confirmer } from '@/lib/confirmer';
import { enseignantsApi, type EnseignantAdmin, type EnseignantPatch } from '@/lib/api/enseignantsApi';
import { SchoolPicker, type SchoolValue } from '@/components/common/SchoolPicker';

const KIND_PATH = { exercise: '/exercises', exam: '/exams', lesson: '/lessons' } as const;
const input = 'h-9 rounded-lg border border-line bg-white px-2.5 text-[13.5px] text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';
const sansAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Formulaire d'un enseignant (création ou modification). */
const Fiche: React.FC<{
  value?: EnseignantAdmin;
  onSave: (data: EnseignantPatch) => Promise<string | null>;
  onCancel?: () => void;
}> = ({ value, onSave, onCancel }) => {
  const [civilite, setCivilite] = useState(value?.civilite ?? 'M.');
  const [prenom, setPrenom] = useState(value?.prenom ?? '');
  const [nom, setNom] = useState(value?.nom ?? '');
  const [compte, setCompte] = useState(value?.compte?.username ?? '');
  const [school, setSchool] = useState<SchoolValue>({ id: value?.school?.id ?? null, name: value?.school?.name ?? '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apercu = [civilite, prenom.trim(), nom.trim()].filter(Boolean).join(' ');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(await onSave({ civilite, prenom, nom, compte, school: school.id ?? null }));
    setBusy(false);
  };
  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-line bg-[#faf9f7] p-4 sm:grid-cols-[110px_1fr_1fr]">
      <label className="flex flex-col gap-1 text-[12.5px] text-ink-muted">Civilité
        <select value={civilite} onChange={(e) => setCivilite(e.target.value as EnseignantAdmin['civilite'])} className={input}>
          <option value="M.">M.</option><option value="Mme">Mme</option><option value="">Aucune</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[12.5px] text-ink-muted">Prénom
        <input value={prenom} onChange={(e) => setPrenom(e.target.value)} maxLength={60} className={input} placeholder="Khalid" />
      </label>
      <label className="flex flex-col gap-1 text-[12.5px] text-ink-muted">Nom
        <input value={nom} onChange={(e) => setNom(e.target.value)} maxLength={80} required className={input} placeholder="Haddar" />
      </label>
      <label className="flex flex-col gap-1 text-[12.5px] text-ink-muted sm:col-span-1">Compte Fidni (pseudo)
        <input value={compte} onChange={(e) => setCompte(e.target.value)} className={input} placeholder="facultatif" />
      </label>
      <div className="flex flex-col gap-1 text-[12.5px] text-ink-muted sm:col-span-2">Établissement
        <SchoolPicker value={school} onChange={setSchool} />
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
        <p className="me-auto text-[13px] text-ink-muted">Affiché : <span className="font-semibold text-ink">{apercu || '—'}</span></p>
        {error && <p className="w-full text-[13px] text-[#a23b34] sm:w-auto">{error}</p>}
        {onCancel && <button type="button" onClick={onCancel} className="h-9 rounded-lg px-3 text-[13.5px] font-medium text-ink-muted hover:bg-[#f2f1ee]">Annuler</button>}
        <button type="submit" disabled={busy || !nom.trim()} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13.5px] font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}Enregistrer
        </button>
      </div>
    </form>
  );
};

/** Une ligne : nom, compte relié, nombre de contenus ; dépliée : fiche, contenus, fusion, suppression. */
const Ligne: React.FC<{
  e: EnseignantAdmin;
  tous: EnseignantAdmin[];
  onChange: (next: EnseignantAdmin | null, removedId?: number) => void;
}> = ({ e, tous, onChange }) => {
  const [open, setOpen] = useState(false);
  const [contenus, setContenus] = useState<Awaited<ReturnType<typeof enseignantsApi.contenus>> | null>(null);
  const [dans, setDans] = useState('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open && contenus === null) enseignantsApi.contenus(e.id).then(setContenus).catch(() => setContenus([]));
  }, [open, contenus, e.id]);

  const save = async (data: EnseignantPatch) => {
    try {
      onChange(await enseignantsApi.update(e.id, data));
      return null;
    } catch (err) {
      return enseignantsApi.erreur(err, 'Enregistrement impossible.');
    }
  };
  const merge = async () => {
    const cible = tous.find((x) => String(x.id) === dans);
    if (!cible || !await confirmer(`Fusionner « ${e.nom_affiche} » dans « ${cible.nom_affiche} » ? Ses ${e.contenus} contenus passent à « ${cible.nom_affiche} ».`, { action: 'Fusionner' })) return;
    try {
      const merged = await enseignantsApi.merge(e.id, cible.id);
      onChange(merged, e.id);
    } catch (err) {
      setError(enseignantsApi.erreur(err, 'Fusion impossible.'));
    }
  };
  const remove = async () => {
    if (!await confirmer(`Supprimer « ${e.nom_affiche} » ? Ses ${e.contenus} contenus restent en ligne, sans ce nom.`, { action: 'Supprimer', danger: true })) return;
    try {
      await enseignantsApi.remove(e.id);
      onChange(null, e.id);
    } catch (err) {
      setError(enseignantsApi.erreur(err, 'Suppression impossible.'));
    }
  };

  return (
    <li className="border-b border-line last:border-b-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-start hover:bg-[#faf9f7]">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14.5px] font-semibold text-ink">{e.nom_affiche}</span>
          <span className="block truncate text-[12.5px] text-ink-faint">
            {[e.compte ? `@${e.compte.username}` : 'Pas de compte relié', e.school?.name].filter(Boolean).join(' · ')}
          </span>
        </span>
        <span className="fd-nums text-[13px] text-ink-muted">{e.contenus} {e.contenus > 1 ? 'contenus' : 'contenu'}</span>
        <ChevronDown className={`h-4 w-4 text-ink-faint transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="flex flex-col gap-4 px-4 pb-4">
          <Fiche value={e} onSave={save} />
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink">Contenus</p>
            {contenus === null ? <Loader2 className="h-4 w-4 animate-spin text-ink-faint" />
              : contenus.length === 0 ? <p className="text-[13px] text-ink-faint">Aucun contenu.</p>
              : (
                <ul className="max-h-56 overflow-y-auto rounded-lg border border-line bg-white text-[13px]">
                  {contenus.map((c) => (
                    <li key={c.id} className="border-b border-line/70 px-3 py-1.5 last:border-b-0">
                      <Link to={`${KIND_PATH[c.type]}/${c.id}`} className="text-ink-soft hover:text-ink hover:underline">{c.title}</Link>
                    </li>
                  ))}
                </ul>
              )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <GitMerge className="h-4 w-4 text-ink-faint" aria-hidden />
            <span className="text-[13px] text-ink-muted">Même personne que</span>
            <select value={dans} onChange={(ev) => setDans(ev.target.value)} className={`${input} max-w-[16rem]`}>
              <option value="">choisir…</option>
              {tous.filter((x) => x.id !== e.id).map((x) => <option key={x.id} value={x.id}>{x.nom_affiche}</option>)}
            </select>
            <button type="button" disabled={!dans} onClick={merge}
              className="h-9 rounded-lg border border-line bg-white px-3 text-[13.5px] font-medium text-ink hover:border-ink disabled:opacity-40">Fusionner</button>
            <button type="button" onClick={remove}
              className="ms-auto inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13.5px] font-medium text-[#a23b34] hover:bg-[#fbecea]">
              <Trash2 className="h-4 w-4" />Supprimer
            </button>
          </div>
          {error && <p className="text-[13px] text-[#a23b34]">{error}</p>}
        </div>
      )}
    </li>
  );
};

export const EnseignantsTab: React.FC = () => {
  const [rows, setRows] = useState<EnseignantAdmin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    enseignantsApi.list().then(setRows).catch(() => setError('La liste n’a pas pu être chargée.'));
  }, []);

  const shown = useMemo(() => {
    const s = sansAccents(q.trim());
    return (rows ?? []).filter((e) => !s || sansAccents(`${e.nom_affiche} ${e.compte?.username ?? ''}`).includes(s));
  }, [rows, q]);

  const onChange = (next: EnseignantAdmin | null, removedId?: number) => setRows((prev) => {
    let list = (prev ?? []).filter((x) => x.id !== removedId);
    if (next) list = list.some((x) => x.id === next.id) ? list.map((x) => (x.id === next.id ? next : x)) : [...list, next];
    return list.sort((a, b) => a.nom.localeCompare(b.nom, 'fr') || a.prenom.localeCompare(b.prenom, 'fr'));
  });

  const create = async (data: EnseignantPatch) => {
    try {
      onChange(await enseignantsApi.create(data));
      setCreating(false);
      return null;
    } catch (err) {
      return enseignantsApi.erreur(err, 'Création impossible.');
    }
  };

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="fd-display text-[22px] font-semibold text-ink">Enseignants</h2>
        <p className="mt-1 max-w-2xl text-[14px] text-ink-muted">
          Les noms posés sur les contenus (« Proposé par … », filtre « Enseignant » des listes). Un enseignant n’a pas
          besoin d’être inscrit ; s’il l’est, relie-le à son compte : les membres connectés iront de son nom à son profil.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un nom ou un pseudo" aria-label="Chercher un enseignant"
            className={`${input} w-full ps-8`} />
        </label>
        <button type="button" onClick={() => setCreating((c) => !c)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#f2f1ee] px-3.5 text-[13.5px] font-semibold text-ink hover:bg-[#e9e6e0]">
          <Plus className="h-4 w-4" />Ajouter un enseignant
        </button>
      </div>
      {creating && <Fiche onSave={create} onCancel={() => setCreating(false)} />}
      {error && <p className="text-[14px] text-[#a23b34]">{error}</p>}
      {rows === null && !error ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-ink-faint" /></div> : (
        <ul className="overflow-hidden rounded-2xl border border-line bg-white">
          {shown.length === 0 && <li className="px-4 py-6 text-center text-[14px] text-ink-faint">Aucun enseignant.</li>}
          {shown.map((e) => <Ligne key={e.id} e={e} tous={rows ?? []} onChange={onChange} />)}
        </ul>
      )}
    </section>
  );
};

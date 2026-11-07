// Pilotage › Défis (07/11/2026) : relire, corriger et valider les défis du jour rédigés par Claude. Un défi non validé reste
// invisible ; un jour sans défi validé, l'accueil n'affiche simplement rien (d'où l'alerte « plus que N jours »).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, CheckCheck, ChevronDown, ChevronRight, Loader2, Plus, Trash2, TriangleAlert, X } from 'lucide-react';
import { MathText } from '@/components/skilliq/MathText';
import { DifficultyBars } from '@/components/common/DifficultyBars';
import { NIVEAU, THEME, dateDefi } from '@/components/defi/DefiPanel';
import { api } from '@/lib/api/apiClient';
import { confirmer } from '@/lib/confirmer';
import type { DefiDifficulte, DefiIndice, DefiTheme } from '@/lib/api/defiApi';

interface Ligne {
  id: number; cle: string; date: string; titre: string; theme: DefiTheme; difficulte: DefiDifficulte; enonce: string; consigne: string;
  reponse: string; indices: DefiIndice[]; solution: string; source: string; valide: boolean;
  participants: number; trouves: number; indices_moyens: number;
}
interface Donnees { aujourdhui: string; jours_couverts: number; a_valider: number; results: Ligne[] }

const ALERTE_JOURS = 7;
const ENTREE = 'w-full min-w-0 rounded-lg border border-line bg-white px-3 py-2 text-[13.5px] text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25';
const TITRE = 'mb-1 block text-[12px] font-semibold text-ink-soft';

const Paragraphes: React.FC<{ texte: string }> = ({ texte }) => (
  <div className="flex flex-col gap-1.5">{texte.split(/\n\s*\n/).map((p, i) => <p key={i} className="overflow-x-auto"><MathText text={p} /></p>)}</div>
);

const Fiche: React.FC<{ d: Ligne; onChange: () => void }> = ({ d, onChange }) => {
  const [edition, setEdition] = useState(false);
  const [f, setF] = useState(d);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  useEffect(() => { setF(d); }, [d]);
  const joue = d.participants > 0;

  const envoyer = async (corps: Partial<Ligne>) => {
    setEnvoi(true);
    setErreurs({});
    try {
      await api.patch(`/pilotage/defis/${d.id}/`, corps);
      setEdition(false);
      onChange();
    } catch (e) {
      const data = (e as { response?: { data?: Record<string, string> } }).response?.data;
      setErreurs(data && typeof data === 'object' ? data : { general: 'L’enregistrement a échoué.' });
    } finally {
      setEnvoi(false);
    }
  };
  const supprimer = async () => {
    if (!(await confirmer(`Supprimer définitivement le défi « ${d.titre} » ?`, { action: 'Supprimer', danger: true }))) return;
    try { await api.delete(`/pilotage/defis/${d.id}/`); onChange(); } catch { setErreurs({ general: 'La suppression a échoué : des élèves y ont peut-être déjà répondu.' }); }
  };
  const erreur = (c: string) => (erreurs[c] ? <p className="mt-1 text-[12px] text-[#a23b34]">{erreurs[c]}</p> : null);

  if (edition) {
    const indice = (i: number, champ: keyof DefiIndice, v: string) => setF({ ...f, indices: f.indices.map((x, j) => (j === i ? { ...x, [champ]: v } : x)) });
    return (
      <div className="flex flex-col gap-3 border-t border-line p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label><span className={TITRE}>Titre</span><input className={ENTREE} value={f.titre} onChange={(e) => setF({ ...f, titre: e.target.value })} />{erreur('titre')}</label>
          <label><span className={TITRE}>Date</span><input type="date" className={ENTREE} value={f.date} disabled={joue} onChange={(e) => setF({ ...f, date: e.target.value })} />{erreur('date')}</label>
          <label><span className={TITRE}>Difficulté</span>
            <select className={ENTREE} value={f.difficulte} onChange={(e) => setF({ ...f, difficulte: e.target.value as DefiDifficulte })}>
              {Object.entries(NIVEAU).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select></label>
          <label><span className={TITRE}>Thème</span>
            <select className={ENTREE} value={f.theme} onChange={(e) => setF({ ...f, theme: e.target.value as DefiTheme })}>
              {Object.entries(THEME).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></label>
        </div>
        <label><span className={TITRE}>Énoncé (formules entre $, ligne vide = nouveau paragraphe)</span><textarea rows={5} className={ENTREE} value={f.enonce} onChange={(e) => setF({ ...f, enonce: e.target.value })} />{erreur('enonce')}</label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label><span className={TITRE}>Consigne</span><input className={ENTREE} value={f.consigne} onChange={(e) => setF({ ...f, consigne: e.target.value })} />{erreur('consigne')}</label>
          <label><span className={TITRE}>Réponse (12, -3, 0,5 ou 3/4)</span><input className={ENTREE} value={f.reponse} onChange={(e) => setF({ ...f, reponse: e.target.value })} />{erreur('reponse')}</label>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className={TITRE}>Indices, du plus léger au plus précis</legend>
          {f.indices.map((x, i) => (
            <div key={i} className="flex flex-col gap-1.5 rounded-lg bg-paper p-2.5">
              <div className="flex gap-2">
                <input aria-label={`Titre de l’indice ${i + 1}`} className={ENTREE} value={x.titre} onChange={(e) => indice(i, 'titre', e.target.value)} />
                <button type="button" aria-label={`Retirer l’indice ${i + 1}`} className="fd-btn-ghost min-h-9 shrink-0" onClick={() => setF({ ...f, indices: f.indices.filter((_, j) => j !== i) })}><X className="h-4 w-4" /></button>
              </div>
              <textarea aria-label={`Texte de l’indice ${i + 1}`} rows={2} className={ENTREE} value={x.texte} onChange={(e) => indice(i, 'texte', e.target.value)} />
            </div>
          ))}
          <button type="button" className="fd-btn-ghost min-h-9 self-start" onClick={() => setF({ ...f, indices: [...f.indices, { titre: '', texte: '' }] })}><Plus className="h-4 w-4" /> Ajouter un indice</button>
          {erreur('indices')}
        </fieldset>
        <label><span className={TITRE}>Solution</span><textarea rows={7} className={ENTREE} value={f.solution} onChange={(e) => setF({ ...f, solution: e.target.value })} />{erreur('solution')}</label>
        {erreur('general')}
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={envoi} className="fd-btn-primary min-h-10 disabled:opacity-50"
            onClick={() => envoyer({ titre: f.titre, date: f.date, difficulte: f.difficulte, theme: f.theme, enonce: f.enonce, consigne: f.consigne, reponse: f.reponse, indices: f.indices, solution: f.solution })}>
            {envoi && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
          </button>
          <button type="button" className="fd-btn-ghost min-h-10" onClick={() => { setEdition(false); setF(d); setErreurs({}); }}>Annuler</button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 border-t border-line p-4 text-[14px] leading-relaxed text-ink">
      <Paragraphes texte={d.enonce} />
      <p className="text-[13px] text-ink-soft">{d.consigne} <strong className="fd-nums text-ink">Réponse attendue : {d.reponse}</strong></p>
      <ol className="flex flex-col gap-1.5">
        {d.indices.map((x, i) => (
          <li key={i} className="rounded-lg bg-gold-soft px-3 py-2 text-[13.5px]"><p className="text-[12px] font-semibold text-gold-strong">Indice {i + 1} · {x.titre}</p><Paragraphes texte={x.texte} /></li>
        ))}
      </ol>
      <div><p className="text-[12px] font-semibold text-gold-strong">Solution</p><Paragraphes texte={d.solution} /></div>
      {d.source && <p className="text-[12px] text-ink-faint">{d.source}</p>}
      {erreur('general')}
      <div className="flex flex-wrap gap-2">
        {d.valide
          ? <button type="button" disabled={envoi} className="fd-btn-ghost min-h-10" onClick={() => envoyer({ valide: false })}>Retirer la validation</button>
          : <button type="button" disabled={envoi} className="fd-btn-primary min-h-10" onClick={() => envoyer({ valide: true })}><Check className="h-4 w-4" /> Valider</button>}
        <button type="button" className="fd-btn-ghost min-h-10" onClick={() => setEdition(true)}>Modifier</button>
        {!joue && <button type="button" className="fd-btn-ghost min-h-10" onClick={supprimer}><Trash2 className="h-4 w-4" /> Supprimer</button>}
      </div>
    </div>
  );
};

export const DefisAdminTab: React.FC = () => {
  const [data, setData] = useState<Donnees | null>(null);
  const [echec, setEchec] = useState(false);
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [tout, setTout] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(() => {
    setEchec(false);
    api.get('/pilotage/defis/').then((r) => setData(r.data)).catch(() => setEchec(true));
  }, []);
  useEffect(() => { charger(); }, [charger]);

  const lignes = useMemo(() => (data?.results ?? []).filter((d) => tout || d.date >= data!.aujourdhui), [data, tout]);
  const aValider = useMemo(() => (data?.results ?? []).filter((d) => !d.valide && d.date >= data!.aujourdhui), [data]);

  const toutValider = async () => {
    if (!(await confirmer(`Tu confirmes avoir relu ces ${aValider.length} défis ? Ils apparaîtront chacun à leur date.`, { action: 'Tout valider' }))) return;
    setEnvoi(true);
    try { await api.post('/pilotage/defis/valider/', { ids: aValider.map((d) => d.id) }); charger(); } catch { setEchec(true); } finally { setEnvoi(false); }
  };

  if (echec) return <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-4 py-3"><p className="flex-1 text-[13.5px] font-medium text-[#a23b34]">Les défis n’ont pas pu se charger.</p><button type="button" className="fd-btn-ghost min-h-10" onClick={charger}>Réessayer</button></div>;
  if (!data) return <div className="flex justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-ink-faint" /></div>;

  const couverts = data.jours_couverts;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="fd-nums text-[14px] text-ink-soft">
          <strong className="text-ink">{couverts} {couverts > 1 ? 'jours couverts' : 'jour couvert'}</strong> à partir d’aujourd’hui · {data.a_valider} à valider
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-1.5 text-[13px] text-ink-soft"><input type="checkbox" checked={tout} onChange={(e) => setTout(e.target.checked)} /> Voir les défis passés</label>
          {aValider.length > 0 && <button type="button" disabled={envoi} className="fd-btn-ghost min-h-10" onClick={toutValider}><CheckCheck className="h-4 w-4" /> Tout valider ({aValider.length})</button>}
        </div>
      </div>
      {couverts < ALERTE_JOURS && (
        <p className="flex items-start gap-2 rounded-xl border border-gold-line bg-gold-soft px-3.5 py-2.5 text-[13.5px] text-ink">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-gold-strong" aria-hidden />
          {couverts === 0 ? 'Pas de défi validé aujourd’hui : l’accueil n’en affiche aucun.' : `Plus que ${couverts} ${couverts > 1 ? 'jours' : 'jour'} de défis validés. Passé ce délai, l’accueil n’en affichera plus. Demande un nouveau lot à Claude.`}
        </p>
      )}
      {lignes.length === 0 ? <p className="rounded-2xl border border-line bg-white p-5 text-[14px] text-ink-soft">Aucun défi prévu. Demande un nouveau lot à Claude.</p> : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
          {lignes.map((d) => (
            <li key={d.id}>
              <button type="button" aria-expanded={ouvert === d.id} onClick={() => setOuvert(ouvert === d.id ? null : d.id)}
                className="flex min-h-[60px] w-full items-center gap-3 px-4 py-2.5 text-start hover:bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-ink">{d.titre}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[12.5px] text-ink-faint">
                    <span>{dateDefi(d.date)}</span> ·
                    <DifficultyBars level={NIVEAU[d.difficulte].level} total={4} size="0.85em" /> {NIVEAU[d.difficulte].label} · {THEME[d.theme]}
                    {d.participants > 0 && <span className="fd-nums"> · {d.trouves}/{d.participants} ont trouvé · {d.indices_moyens} indice(s) en moyenne</span>}
                  </span>
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold ${d.valide ? 'bg-brand-soft text-brand' : 'bg-gold-soft text-gold-strong'}`}>{d.valide ? 'Validé' : 'À valider'}</span>
                {ouvert === d.id ? <ChevronDown className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden /> : <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />}
              </button>
              {ouvert === d.id && <Fiche d={d} onChange={charger} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DefisAdminTab;

/**
 * Éditeur d'une astuce (équipe, 27/11/2026 — Natsu : « qu'on puisse modifier chaque astuce, comme les contenus »).
 *
 * Même éditeur de texte que les contenus (CompactTipTapEditor : formules KaTeX, gras, listes). Les listes (« Quand y
 * penser », « La méthode ») ont une ligne par élément, qu'on ajoute, retire ou déplace. « Sur Fidni » : le numéro du
 * contenu (ou son adresse collée) et le numéro de la question tel qu'affiché (« 3.1 », et la partie pour un devoir).
 * Une fois enregistrée, l'astuce n'est plus jamais remplacée par le fichier du dépôt (le site fait foi).
 */
import React, { useState } from 'react';
import { ArrowDown, ArrowUp, EyeOff, Loader2, Plus, Trash2, X } from 'lucide-react';
import CompactTipTapEditor from '@/components/editor/CompactTipTapEditor';
import type { AstuceEquipe, AstuceReference, AstuceSaisie } from '@/lib/api/astucesApi';
import { confirmer } from '@/lib/confirmer';
import { t } from '@/i18n';

/** « <p>texte</p> » seul → « texte » (titres, éléments de liste : rendus dans la ligne). */
export function sansParagraphe(html: string): string {
  const s = (html || '').trim();
  const m = /^<p>([\s\S]*)<\/p>$/.exec(s);
  if (m && !/<p[\s>]/.test(m[1])) return m[1].trim();
  return s === '<p></p>' ? '' : s;
}

export function saisieDepuis(a?: AstuceEquipe | null, chapitre = ''): AstuceSaisie {
  return {
    chapitre: a?.chapitre || chapitre,
    titre: a?.titre || '',
    resume: a?.resume || '',
    type_question: a?.type_question || '',
    technique: a?.technique || '',
    signaux: a?.signaux?.length ? [...a.signaux] : [''],
    pourquoi: a?.pourquoi || '',
    methode: a?.methode?.length ? [...a.methode] : [''],
    exemple_enonce: a?.exemple.enonce || '',
    exemple_solution: a?.exemple.solution || '',
    piege: a?.piege || '',
    sur_le_site: (a?.references ?? []).map((r) => ({ ...r })),
    publie: a?.publie ?? true,
  };
}

const champ = 'h-10 w-full rounded-xl border border-line bg-white px-3 text-[14px] text-ink focus:border-brand focus:outline-none';

const Bloc: React.FC<{ titre: string; aide?: string; children: React.ReactNode }> = ({ titre, aide, children }) => (
  <div>
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <span className="text-[12.5px] font-semibold text-ink-soft">{titre}</span>
      {aide && <span className="text-[12px] text-ink-faint">{aide}</span>}
    </div>
    {children}
  </div>
);

/** Texte riche (formules) : l'éditeur des contenus. */
const Riche: React.FC<{ valeur: string; onChange: (v: string) => void; placeholder: string; court?: boolean }> = ({ valeur, onChange, placeholder, court }) => (
  <div className="rounded-xl border border-line bg-white focus-within:border-brand">
    <CompactTipTapEditor content={valeur} onChange={(h) => onChange(court ? sansParagraphe(h) : h)} placeholder={placeholder}
      minHeight={court ? '44px' : '90px'} variant={court ? 'comment' : 'full'} ariaLabel={placeholder} />
  </div>
);

/** Liste d'éléments riches : ajouter, retirer, monter, descendre. */
const Liste: React.FC<{ items: string[]; onChange: (v: string[]) => void; placeholder: string; numerote?: boolean }> = ({ items, onChange, placeholder, numerote }) => {
  // Clés stables : l'éditeur garde son état quand on déplace une ligne.
  const [cles, setCles] = useState(() => items.map((_, i) => i));
  const [suivante, setSuivante] = useState(items.length);
  const maj = (nv: string[], nc: number[]) => { onChange(nv); setCles(nc); };
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={cles[i]} className="flex items-start gap-1.5">
          <span className="mt-3 w-5 shrink-0 text-center text-[12.5px] font-semibold text-ink-faint fd-nums">{numerote ? `${i + 1}.` : '•'}</span>
          <div className="min-w-0 flex-1"><Riche court valeur={it} placeholder={placeholder} onChange={(v) => { const nv = [...items]; nv[i] = v; onChange(nv); }} /></div>
          <div className="mt-1 flex shrink-0 flex-col">
            <button type="button" disabled={i === 0} aria-label={t('Monter')} onClick={() => {
              const nv = [...items], nc = [...cles];
              [nv[i - 1], nv[i]] = [nv[i], nv[i - 1]]; [nc[i - 1], nc[i]] = [nc[i], nc[i - 1]]; maj(nv, nc);
            }} className="rounded p-1 text-ink-faint hover:text-ink disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
            <button type="button" disabled={i === items.length - 1} aria-label={t('Descendre')} onClick={() => {
              const nv = [...items], nc = [...cles];
              [nv[i + 1], nv[i]] = [nv[i], nv[i + 1]]; [nc[i + 1], nc[i]] = [nc[i], nc[i + 1]]; maj(nv, nc);
            }} className="rounded p-1 text-ink-faint hover:text-ink disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
          </div>
          <button type="button" aria-label={t('Retirer')} onClick={() => maj(items.filter((_, k) => k !== i), cles.filter((_, k) => k !== i))}
            className="mt-2 rounded-full p-1.5 text-ink-faint hover:bg-[#fbecea] hover:text-[#a23b34]"><X className="h-3.5 w-3.5" /></button>
        </div>
      ))}
      <button type="button" onClick={() => { maj([...items, ''], [...cles, suivante]); setSuivante(suivante + 1); }}
        className="ms-6 inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium text-brand-hover hover:bg-brand-soft">
        <Plus className="h-3.5 w-3.5" /> {t('Ajouter une ligne')}
      </button>
    </div>
  );
};

export const AstuceEditeur: React.FC<{
  astuce?: AstuceEquipe | null;
  chapitres: string[];
  types: string[];
  techniques: string[];
  chapitreParDefaut?: string;
  onEnregistrer: (saisie: AstuceSaisie) => Promise<void>;
  onAnnuler: () => void;
  onRetirer?: () => Promise<void>;
}> = ({ astuce, chapitres, types, techniques, chapitreParDefaut = '', onEnregistrer, onAnnuler, onRetirer }) => {
  const [s, setS] = useState<AstuceSaisie>(() => saisieDepuis(astuce, chapitreParDefaut || chapitres[0] || ''));
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const maj = <K extends keyof AstuceSaisie>(k: K, v: AstuceSaisie[K]) => setS((x) => ({ ...x, [k]: v }));
  const majRef = (i: number, r: Partial<AstuceReference>) => maj('sur_le_site', s.sur_le_site.map((x, k) => (k === i ? { ...x, ...r, introuvable: false } : x)));

  const enregistrer = async () => {
    setErreur('');
    if (!s.titre.trim()) { setErreur(t('Le titre est obligatoire.')); return; }
    if (!s.type_question.trim() || !s.technique.trim()) { setErreur(t('Le type de question et la technique sont obligatoires.')); return; }
    setEnvoi(true);
    try {
      await onEnregistrer({
        ...s,
        signaux: s.signaux.map(sansParagraphe).filter(Boolean),
        methode: s.methode.map(sansParagraphe).filter(Boolean),
        // Une adresse collée (« fidni.fr/exams/1345#… ») : on garde le numéro du contenu.
        sur_le_site: s.sur_le_site.filter((r) => String(r.id).trim()).map((r) => ({
          ...r, id: (String(r.id).match(/(\d+)(?!.*\/\d)/) || [])[1] || String(r.id),
        })),
      });
    } catch (e) {
      setErreur((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || t('L’enregistrement a échoué. Réessaie.'));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="space-y-5 border-t border-line bg-[#fcfbf9] px-4 pb-5 pt-4 sm:px-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Bloc titre={t('Chapitre')}>
          <select value={s.chapitre} onChange={(e) => maj('chapitre', e.target.value)} className={champ}>
            {chapitres.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Bloc>
        <Bloc titre={t('Type de question')}>
          <input list="fd-astuce-types" value={s.type_question} onChange={(e) => maj('type_question', e.target.value)} className={champ}
            placeholder={t('Limite d’une suite…')} />
          <datalist id="fd-astuce-types">{types.map((x) => <option key={x} value={x} />)}</datalist>
        </Bloc>
        <Bloc titre={t('Technique')}>
          <input list="fd-astuce-techniques" value={s.technique} onChange={(e) => maj('technique', e.target.value)} className={champ}
            placeholder={t('Raisonnement par l’absurde…')} />
          <datalist id="fd-astuce-techniques">{techniques.map((x) => <option key={x} value={x} />)}</datalist>
        </Bloc>
      </div>

      <Bloc titre={t('Titre')} aide={t('formules entre $ $')}><Riche court valeur={s.titre} onChange={(v) => maj('titre', v)} placeholder={t('Titre de l’astuce')} /></Bloc>
      <Bloc titre={t('Résumé')} aide={t('une phrase')}><Riche court valeur={s.resume} onChange={(v) => maj('resume', v)} placeholder={t('L’idée en une phrase')} /></Bloc>
      <Bloc titre={t('Quand y penser')}><Liste items={s.signaux} onChange={(v) => maj('signaux', v)} placeholder={t('Un indice dans l’énoncé')} /></Bloc>
      <Bloc titre={t('Pourquoi ça marche')}><Riche valeur={s.pourquoi} onChange={(v) => maj('pourquoi', v)} placeholder={t('Pourquoi cette technique, et pas une autre')} /></Bloc>
      <Bloc titre={t('La méthode')}><Liste numerote items={s.methode} onChange={(v) => maj('methode', v)} placeholder={t('Une étape')} /></Bloc>
      <div className="grid gap-3 sm:grid-cols-2">
        <Bloc titre={t('Exemple : énoncé')}><Riche valeur={s.exemple_enonce} onChange={(v) => maj('exemple_enonce', v)} placeholder={t('Énoncé court')} /></Bloc>
        <Bloc titre={t('Exemple : solution')}><Riche valeur={s.exemple_solution} onChange={(v) => maj('exemple_solution', v)} placeholder={t('Solution rédigée')} /></Bloc>
      </div>
      <Bloc titre={t('Le piège')}><Riche court valeur={s.piege} onChange={(v) => maj('piege', v)} placeholder={t('L’erreur que font les élèves')} /></Bloc>

      <Bloc titre={t('Sur Fidni')} aide={t('numéro du contenu (ou son adresse) et numéro de la question')}>
        <div className="space-y-2">
          {s.sur_le_site.map((r, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,.6fr)_minmax(0,.6fr)_minmax(0,1.5fr)_auto] items-center gap-1.5">
              <input value={String(r.id ?? '')} onChange={(e) => majRef(i, { id: e.target.value })} placeholder={t('n° ou adresse')} aria-label={t('Contenu')} className={champ} />
              <input value={r.partie ?? ''} onChange={(e) => majRef(i, { partie: e.target.value ? Number(e.target.value) || null : null })} placeholder={t('partie')} aria-label={t('Partie')} className={champ} />
              <input value={r.question ?? ''} onChange={(e) => majRef(i, { question: e.target.value })} placeholder={t('question')} aria-label={t('Question')} className={champ} />
              <input value={r.note ?? ''} onChange={(e) => majRef(i, { note: e.target.value })} placeholder={t('note (facultatif)')} aria-label={t('Note')} className={champ} />
              <button type="button" aria-label={t('Retirer')} onClick={() => maj('sur_le_site', s.sur_le_site.filter((_, k) => k !== i))}
                className="rounded-full p-1.5 text-ink-faint hover:bg-[#fbecea] hover:text-[#a23b34]"><X className="h-3.5 w-3.5" /></button>
              {(r.titre || r.introuvable) && (
                <span className={`col-span-5 -mt-1 ps-1 text-[12px] ${r.introuvable ? 'text-[#a23b34]' : 'text-ink-faint'}`}>
                  {r.introuvable ? t('Contenu introuvable : vérifie le numéro.') : r.titre}
                </span>
              )}
            </div>
          ))}
          <button type="button" onClick={() => maj('sur_le_site', [...s.sur_le_site, { id: '', question: '' }])}
            className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium text-brand-hover hover:bg-brand-soft">
            <Plus className="h-3.5 w-3.5" /> {t('Ajouter un lien')}
          </button>
        </div>
      </Bloc>

      <label className="flex items-center gap-2 text-[14px] text-ink">
        <input type="checkbox" checked={s.publie} onChange={(e) => maj('publie', e.target.checked)} className="h-4 w-4 accent-[#1a7a4a]" />
        {t('Visible dans la liste')}
      </label>

      {erreur && <p role="alert" className="rounded-xl bg-[#fbecea] px-3 py-2 text-[13.5px] text-[#a23b34]">{erreur}</p>}
      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <button type="button" onClick={enregistrer} disabled={envoi} className="fd-btn-primary min-h-10 px-4">
          {envoi && <Loader2 className="h-4 w-4 animate-spin" />} {t('Enregistrer')}
        </button>
        <button type="button" onClick={onAnnuler} className="fd-btn-ghost min-h-10">{t('Annuler')}</button>
        {onRetirer && astuce && (
          <button type="button" onClick={async () => {
            const msg = astuce.source === 'admin' ? t('Supprimer cette astuce ?') : t('Masquer cette astuce ? Tu pourras la rendre visible plus tard.');
            if (await confirmer(msg, { action: astuce.source === 'admin' ? t('Supprimer') : t('Masquer') })) await onRetirer();
          }} className="ms-auto inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-[13.5px] font-medium text-[#a23b34] hover:bg-[#fbecea]">
            {astuce.source === 'admin' ? <Trash2 className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {astuce.source === 'admin' ? t('Supprimer') : t('Masquer')}
          </button>
        )}
      </div>
    </div>
  );
};

export default AstuceEditeur;

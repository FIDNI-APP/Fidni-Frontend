/**
 * Une évaluation d'une classe, côté professeur (15/10/2026) : onglets Copies (dépôt par élève ou PDF de la classe,
 * correction par l'IA, publication), Sujet et barème (points, arrondi, consignes de correction, sujet privé) et Bilan
 * (notes de la classe, réussite par question, théorèmes à retravailler, export des notes).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, ChevronRight, Download, FileUp, Loader2, Merge, Plus, Printer, Scissors, Send, Sparkles, Trash2,
  Upload, UserPlus,
} from 'lucide-react';
import { ModalShell, FormError, fieldCls } from '@/components/enregistrements/ModalShell';
import { t, dateLocale } from '@/i18n';
import { SEO } from '@/components/layout/SEO';
import { Page, PageHeader, Segmented, CardsSkeleton, StatTile } from '@/components/space/Page';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import { QuestionsEditor } from '@/components/content/wizard/QuestionsEditor';
import type { ExerciseBlock } from '@/components/content/editor/FlexibleExerciseEditor';
import {
  confirmerLot, copiesError, corriger, deleteEvaluation, deleteLot, envoyerLot, enTraitement, exporterNotes, fmt,
  getEvaluation, getLot, getRapport, importSujet, listCopies, publier, updateEvaluation, urlApi, addPages,
  addPagesCopie, creerCopieSansCompte, deleteCopie,
  type EvaluationDetail, type LigneCopie, type Lot, type Rapport, type StatutCopie,
} from '@/lib/api/copiesApi';

type Onglet = 'copies' | 'sujet' | 'bilan';

export const STATUT_LABEL: Record<StatutCopie, string> = {
  vide: 'Pas de copie', deposee: 'Déposée', en_attente: 'En attente', en_cours: 'Correction…',
  corrigee: 'À vérifier', validee: 'Validée', erreur: 'Erreur',
};
export const STATUT_CLS: Record<StatutCopie, string> = {
  vide: 'bg-[#f2f1ee] text-ink-faint', deposee: 'bg-[#f2f1ee] text-ink-soft', en_attente: 'bg-brand-soft text-brand-hover',
  en_cours: 'bg-brand-soft text-brand-hover', corrigee: 'bg-gold-soft text-gold-strong', validee: 'bg-brand-soft text-brand-hover',
  erreur: 'bg-[#fbecea] text-[#a23b34]',
};

export default function EvaluationPage() {
  const { id = '', eid = '' } = useParams<{ id: string; eid: string }>();
  const [params, setParams] = useSearchParams();
  const onglet = (['copies', 'sujet', 'bilan'].includes(params.get('onglet') || '') ? params.get('onglet') : 'copies') as Onglet;
  const [ev, setEv] = useState<EvaluationDetail | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const recharger = useCallback(() => getEvaluation(id, eid).then(setEv)
    .catch((e) => setError(copiesError(e, t('Évaluation introuvable.')))), [id, eid]);
  useEffect(() => { recharger(); }, [recharger]);

  // Sujet privé en cours de lecture : on relit jusqu'à la fin.
  useEffect(() => {
    if (ev?.sujet_statut !== 'en_cours') return;
    const timer = setInterval(recharger, 4000);
    return () => clearInterval(timer);
  }, [ev?.sujet_statut, recharger]);

  if (error) {
    return (
      <Page width="wide">
        <PageHeader back={{ to: `/classrooms/${id}?onglet=evaluations`, label: t('La classe') }} title={t('Évaluation indisponible')} />
        <p className="text-[13.5px] text-ink-faint">{error}</p>
      </Page>
    );
  }
  if (!ev) return <Page width="wide"><CardsSkeleton n={3} /></Page>;

  const supprimer = async () => {
    if (!window.confirm(t('Supprimer cette évaluation, ses copies et leurs notes ? Les élèves ne les verront plus.'))) return;
    await deleteEvaluation(id, eid);
    navigate(`/classrooms/${id}?onglet=evaluations`);
  };

  return (
    <Page width="wide">
      <SEO title={`${ev.titre} - Fidni`} description={t('Copies de l’évaluation')} />
      <PageHeader
        back={{ to: `/classrooms/${id}?onglet=evaluations`, label: t('La classe') }}
        eyebrow={t('Évaluation')}
        title={ev.titre}
        subtitle={[
          ev.date ? new Date(`${ev.date}T12:00:00`).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long', year: 'numeric' }) : '',
          t('{n} questions', { n: ev.questions.length }), t('barème sur {n} points', { n: fmt(ev.total_max) }),
          t('note sur {n}', { n: ev.note_sur }),
        ].filter(Boolean).join(' · ')}
        actions={(
          <button type="button" onClick={supprimer} className="fd-btn-ghost min-h-10 text-[#a23b34]">
            <Trash2 className="h-4 w-4" /> {t('Supprimer')}
          </button>
        )}
      >
        <div className="mt-6">
          <Segmented<Onglet> label={t('Vues de l’évaluation')} value={onglet}
            onChange={(o) => setParams(o === 'copies' ? {} : { onglet: o }, { replace: true })}
            options={[{ key: 'copies', label: t('Copies') }, { key: 'sujet', label: t('Sujet et barème') },
              { key: 'bilan', label: t('Bilan') }]} />
        </div>
      </PageHeader>

      {ev.sujet_statut === 'a_verifier' && onglet !== 'sujet' && (
        <Bandeau ton="or">
          {t('Le sujet a été lu par l’IA : vérifie-le, ainsi que les solutions qu’elle a rédigées, avant de corriger les copies.')}{' '}
          <button type="button" className="font-semibold underline" onClick={() => setParams({ onglet: 'sujet' })}>{t('Vérifier le sujet')}</button>
        </Bandeau>
      )}
      {onglet === 'copies' && <OngletCopies ev={ev} />}
      {onglet === 'sujet' && <OngletSujet ev={ev} onChange={setEv} />}
      {onglet === 'bilan' && <OngletBilan ev={ev} />}
    </Page>
  );
}

function Bandeau({ ton, children }: { ton: 'or' | 'rouge' | 'vert'; children: React.ReactNode }) {
  const cls = ton === 'or' ? 'border-gold-line bg-gold-soft text-gold-strong'
    : ton === 'rouge' ? 'border-[#f0d5d1] bg-[#fbecea] text-[#a23b34]' : 'border-brand-line bg-brand-soft text-brand-hover';
  return <div className={`mb-4 rounded-xl border px-4 py-3 text-[13.5px] leading-relaxed ${cls}`}>{children}</div>;
}

/* ───────────────────────────── Copies */

function OngletCopies({ ev }: { ev: EvaluationDetail }) {
  const { id = '' } = useParams<{ id: string }>();
  const [lignes, setLignes] = useState<LigneCopie[] | null>(null);
  const [quota, setQuota] = useState<number | null>(null);
  const [envois, setEnvois] = useState<Record<string, string>>({});
  // Fenêtre « Déposer une copie » (fichiers déjà lâchés sur la page, s'il y en a).
  const [depot, setDepot] = useState<File[] | null>(null);
  const [message, setMessage] = useState<{ ton: 'vert' | 'rouge'; texte: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [lot, setLot] = useState<Lot | null>(ev.lot);

  const charger = useCallback(() => listCopies(id, ev.id).then((r) => { setLignes(r.copies); setQuota(r.quota_restant); })
    .catch(() => undefined), [id, ev.id]);
  useEffect(() => { charger(); }, [charger]);

  const actives = (lignes || []).some((l) => enTraitement(l.copie?.statut));
  useEffect(() => {
    if (!actives) return;
    const timer = setInterval(charger, 4000);
    return () => clearInterval(timer);
  }, [actives, charger]);

  // Un fichier lâché ailleurs que sur une ligne : Chrome l'ouvrirait ; on ouvre plutôt « Déposer une copie ».
  useEffect(() => {
    const sur = (e: DragEvent) => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); };
    const lache = (e: DragEvent) => {
      if (!e.dataTransfer?.files.length) return;
      e.preventDefault();
      setDepot(Array.from(e.dataTransfer.files));
    };
    window.addEventListener('dragover', sur);
    window.addEventListener('drop', lache);
    return () => { window.removeEventListener('dragover', sur); window.removeEventListener('drop', lache); };
  }, []);

  /** Envoie des fichiers sur la copie d'un élève (membre) ou sur une copie existante (élève sans compte). */
  const deposer = async (cible: Cible, fichiers: FileList | File[]) => {
    const liste = Array.from(fichiers);
    const cle = cleCible(cible);
    let ok = true;
    for (let i = 0; i < liste.length; i++) {
      setEnvois((e) => ({ ...e, [cle]: liste.length > 1 ? t('Envoi {i}/{n}…', { i: i + 1, n: liste.length }) : t('Envoi…') }));
      try {
        if (cible.copie) await addPagesCopie(id, ev.id, cible.copie, liste[i]);
        else await addPages(id, ev.id, cible.eleve as number, liste[i]);
      } catch (e) {
        setMessage({ ton: 'rouge', texte: `${liste[i].name} : ${copiesError(e, t('envoi impossible.'))}` });
        ok = false;
        break;
      }
    }
    setEnvois((e) => { const n = { ...e }; delete n[cle]; return n; });
    charger();
    return ok;
  };

  const supprimer = async (copieId: number, nom: string) => {
    if (!window.confirm(t('Supprimer la copie de {nom} (pages et notes) ?', { nom }))) return;
    try { await deleteCopie(id, ev.id, copieId); charger(); }
    catch (e) { setMessage({ ton: 'rouge', texte: copiesError(e, t('Suppression impossible.')) }); }
  };

  const aCorriger = (lignes || []).filter((l) => l.copie && l.copie.nb_pages > 0
    && (l.copie.statut === 'deposee' || l.copie.statut === 'erreur')).length;
  const aPublier = (lignes || []).filter((l) => l.copie?.statut === 'validee' && !l.copie.publiee).length;
  const aImprimer = (lignes || []).filter((l) => aUneCorrection(l.copie)).length;

  const lancer = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const r = await corriger(id, ev.id, 'toutes');
      setMessage({ ton: 'vert', texte: t('{n} copies envoyées à la correction. Tu peux quitter la page : la correction continue.', { n: r.lancees }) });
      charger();
    } catch (e) {
      setMessage({ ton: 'rouge', texte: copiesError(e, t('Impossible de lancer la correction.')) });
    } finally { setBusy(false); }
  };

  const publierTout = async () => {
    if (!window.confirm(t('Publier les copies validées ? Chaque élève verra sa copie corrigée et recevra une notification.'))) return;
    setBusy(true);
    try {
      const r = await publier(id, ev.id, 'validees');
      setMessage({ ton: 'vert', texte: r.sans_compte
        ? t('{n} copies publiées. Les {k} copies d’élèves sans compte restent visibles de toi seul.', { n: r.publiees, k: r.sans_compte })
        : t('{n} copies publiées.', { n: r.publiees }) });
      charger();
    } catch (e) {
      setMessage({ ton: 'rouge', texte: copiesError(e, t('Impossible de publier.')) });
    } finally { setBusy(false); }
  };

  if (!lignes) return <CardsSkeleton n={3} />;
  const sujetPret = ev.questions.length > 0 && ev.sujet_statut !== 'en_cours';

  return (
    <div>
      {!sujetPret && (
        <Bandeau ton="or">{t('Le sujet n’a pas encore de questions : prépare-le dans l’onglet « Sujet et barème » avant de faire corriger les copies.')}</Bandeau>
      )}
      {message && <Bandeau ton={message.ton}>{message.texte}</Bandeau>}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" className="fd-btn-primary min-h-10" onClick={() => setDepot([])}>
          <Plus className="h-4 w-4" /> {t('Déposer une copie')}
        </button>
        <button type="button" className="fd-btn-ghost min-h-10" disabled={busy || !aCorriger || !sujetPret} onClick={lancer}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {aCorriger ? t('Corriger avec l’IA ({n})', { n: aCorriger }) : t('Corriger avec l’IA')}
        </button>
        <button type="button" className="fd-btn-ghost min-h-10" disabled={busy || !aPublier} onClick={publierTout}>
          <Send className="h-4 w-4" /> {aPublier ? t('Publier les copies validées ({n})', { n: aPublier }) : t('Publier les copies validées')}
        </button>
        <LotBouton evId={ev.id} classeId={id} onLot={setLot} />
        {aImprimer > 0 && (
          <Link to={`/classrooms/${id}/evaluations/${ev.id}/corrections/pdf`} className="fd-btn-ghost min-h-10"
            title={t('Une feuille de correction par élève, à rendre à la classe')}>
            <Printer className="h-4 w-4" /> {t('Imprimer toutes les corrections ({n})', { n: aImprimer })}
          </Link>
        )}
        {quota !== null && <span className="ms-auto text-[12px] text-ink-faint">{t('Corrections restantes ce mois-ci : {n}', { n: quota })}</span>}
      </div>

      {lot && <LotPanneau classeId={id} evId={ev.id} lot={lot} onLot={setLot} onFini={() => { setLot(null); charger(); }} />}

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <table className="w-full text-[13.5px]">
          <thead className="bg-[#faf9f7] text-[11.5px] uppercase tracking-[.06em] text-ink-faint">
            <tr>
              <th className="px-4 py-2.5 text-start font-semibold">{t('Élève')}</th>
              <th className="px-3 py-2.5 text-start font-semibold">{t('Copie')}</th>
              <th className="hidden px-3 py-2.5 text-end font-semibold sm:table-cell">{t('Note')}</th>
              <th className="px-3 py-2.5 text-end font-semibold"><span className="sr-only">{t('Actions')}</span></th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => {
              const cible = cibleDe(l);
              return <LigneEleve key={cleCible(cible)} l={l} evId={ev.id} classeId={id} envoi={envois[cleCible(cible)]}
                onDeposer={(f) => deposer(cible, f)} onSupprimer={supprimer} />;
            })}
            {lignes.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[13.5px] text-ink-faint">
                {t('Aucune copie pour l’instant. Clique sur « Déposer une copie » (ou lâche un fichier sur la page) : tu peux taper le nom d’un élève qui n’a pas de compte Fidni.')}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-ink-faint">
        {t('Photos (JPEG, PNG) ou PDF, 25 Mo au plus par fichier. Glisse les fichiers sur la ligne de l’élève, ou envoie en une fois le PDF de toutes les copies scannées.')}
      </p>
      {depot && (
        <DepotCopie lignes={lignes} fichiers={depot} classeId={id} evId={ev.id} onClose={() => setDepot(null)}
          onDeposer={deposer} onCree={charger} />
      )}
    </div>
  );
}

/** Copie notée (par l'IA ou le professeur) : sa feuille de correction peut s'imprimer. */
const aUneCorrection = (c: LigneCopie['copie']): c is NonNullable<LigneCopie['copie']> => !!c && (c.statut === 'corrigee' || c.statut === 'validee');

type Cible = { eleve?: number; copie?: number };
const cibleDe = (l: LigneCopie): Cible => (l.eleve.id ? { eleve: l.eleve.id } : { copie: l.copie?.id });
const cleCible = (c: Cible) => (c.eleve ? `e${c.eleve}` : `c${c.copie}`);

function LigneEleve({ l, evId, classeId, envoi, onDeposer, onSupprimer }: {
  l: LigneCopie; evId: number; classeId: string; envoi?: string; onDeposer: (f: FileList | File[]) => void;
  onSupprimer: (copieId: number, nom: string) => void;
}) {
  const peutDeposer = l.membre || !!l.sans_compte;
  const input = useRef<HTMLInputElement>(null);
  const [survol, setSurvol] = useState(false);
  const c = l.copie;
  const statut: StatutCopie = c?.statut ?? 'vide';
  const ouverte = c && c.nb_pages > 0;
  return (
    <tr className={`border-t border-line ${survol ? 'bg-brand-soft/50' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setSurvol(true); }} onDragLeave={() => setSurvol(false)}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setSurvol(false); if (e.dataTransfer.files.length && peutDeposer) onDeposer(e.dataTransfer.files); }}>
      <td className="px-4 py-2.5">
        <span className="font-semibold text-ink">{l.eleve.username}</span>
        {l.sans_compte
          ? <span className="ms-2 rounded-full bg-[#f2f1ee] px-2 py-0.5 text-[11px] font-semibold text-ink-faint">{t('sans compte')}</span>
          : !l.membre && <span className="ms-2 text-[11.5px] text-ink-faint">{t('a quitté la classe')}</span>}
      </td>
      <td className="px-3 py-2.5">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${STATUT_CLS[statut]}`}>
          {statut === 'en_cours' && <Loader2 className="h-3 w-3 animate-spin" />}
          {t(STATUT_LABEL[statut])}
        </span>
        {c?.publiee && <span className="ms-1.5 inline-flex items-center gap-1 text-[12px] font-semibold text-brand-hover"><CheckCircle2 className="h-3.5 w-3.5" /> {t('Publiée')}</span>}
        {!!c?.drapeaux && statut === 'corrigee' && <span className="ms-1.5 inline-flex items-center gap-1 text-[12px] text-gold-strong"><AlertTriangle className="h-3.5 w-3.5" /> {c.drapeaux}</span>}
        {c && c.nb_pages > 0 && <span className="ms-1.5 text-[12px] text-ink-faint">{c.nb_pages > 1 ? t('{n} pages', { n: c.nb_pages }) : t('1 page')}</span>}
        {statut === 'erreur' && c?.error && <p className="mt-1 text-[12px] text-[#a23b34]">{c.error}</p>}
      </td>
      <td className="hidden px-3 py-2.5 text-end sm:table-cell">
        {c?.note !== null && c?.note !== undefined
          ? <span dir="ltr" className="fd-nums font-semibold text-ink">{fmt(c.note)}<span className="text-ink-faint"> / {c.note_sur}</span></span>
          : <span className="text-ink-faint">—</span>}
      </td>
      <td className="px-3 py-2 text-end">
        <div className="flex items-center justify-end gap-1">
          {envoi ? <span className="inline-flex items-center gap-1 text-[12px] text-ink-faint"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {envoi}</span> : peutDeposer && (
            <>
              <input ref={input} type="file" multiple hidden accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => { if (e.target.files?.length) onDeposer(e.target.files); e.target.value = ''; }} />
              <button type="button" onClick={() => input.current?.click()} title={t('Ajouter des pages')}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-[12.5px] font-semibold text-ink-soft hover:bg-[#f2f1ee]">
                <Upload className="h-4 w-4" /> <span className="hidden md:inline">{c?.nb_pages ? t('Ajouter') : t('Déposer')}</span>
              </button>
            </>
          )}
          {ouverte && (
            <Link to={`/classrooms/${classeId}/evaluations/${evId}/copies/${c.id}`}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-[12.5px] font-semibold text-brand-hover hover:bg-brand-soft">
              {statut === 'corrigee' ? t('Vérifier') : t('Ouvrir')} <ChevronRight className="h-4 w-4" />
            </Link>
          )}
          {aUneCorrection(c) && (
            <Link to={`/classrooms/${classeId}/evaluations/${evId}/copies/${c.id}/pdf`} title={t('Imprimer la correction')}
              aria-label={t('Imprimer la correction')}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft hover:bg-[#f2f1ee] hover:text-ink">
              <Printer className="h-4 w-4" />
            </Link>
          )}
          {c && !envoi && statut !== 'en_cours' && (l.sans_compte || c.nb_pages > 0) && (
            <button type="button" onClick={() => onSupprimer(c.id, l.eleve.username)} title={t('Supprimer la copie')}
              aria-label={t('Supprimer la copie')}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-faint hover:bg-[#fbecea] hover:text-[#a23b34]">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

/* ───────────────────────────── Déposer une copie (élève de la classe, ou élève sans compte) */

function DepotCopie({ lignes, fichiers, classeId, evId, onClose, onDeposer, onCree }: {
  lignes: LigneCopie[]; fichiers: File[]; classeId: string; evId: number; onClose: () => void;
  onDeposer: (cible: Cible, f: File[]) => Promise<boolean>; onCree: () => void;
}) {
  const membres = lignes.filter((l) => l.membre && l.eleve.id);
  const sansCompte = lignes.filter((l) => l.sans_compte && l.copie);
  const [choix, setChoix] = useState<string>(membres.length ? '' : '__nouveau__');
  const [nom, setNom] = useState('');
  const [liste, setListe] = useState<File[]>(fichiers);
  const [survol, setSurvol] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const input = useRef<HTMLInputElement>(null);

  const ajouter = (f: FileList | File[]) => setListe((l) => [...l, ...Array.from(f)]);
  const pret = !busy && liste.length > 0 && (choix === '__nouveau__' ? !!nom.trim() : !!choix);

  const envoyer = async () => {
    if (!pret) return;
    setBusy(true);
    setErr('');
    try {
      let cible: Cible;
      if (choix === '__nouveau__') {
        const l = await creerCopieSansCompte(classeId, evId, nom.trim());
        cible = { copie: l.copie?.id };
        onCree();
      } else if (choix.startsWith('c')) {
        cible = { copie: Number(choix.slice(1)) };
      } else {
        cible = { eleve: Number(choix.slice(1)) };
      }
      if (await onDeposer(cible, liste)) onClose();
    } catch (e) {
      setErr(copiesError(e, t('Impossible de créer la copie.')));
    } finally { setBusy(false); }
  };

  return (
    <ModalShell open onClose={onClose} labelId="depot-copie-titre" onSubmit={envoyer} title={t('Déposer une copie')}
      subtitle={t('Photos ou PDF de la copie d’un élève : l’IA la lira quand tu lanceras la correction.')}>
      <label className="mt-4 block text-[12px] font-semibold text-ink-faint" htmlFor="depot-eleve">{t('Élève')}</label>
      <select id="depot-eleve" value={choix} onChange={(e) => setChoix(e.target.value)} className={fieldCls}>
        {membres.length > 0 && <option value="">{t('— Choisir l’élève —')}</option>}
        {membres.map((l) => <option key={l.eleve.id} value={`e${l.eleve.id}`}>{l.eleve.username}</option>)}
        {sansCompte.map((l) => <option key={l.copie!.id} value={`c${l.copie!.id}`}>{l.eleve.username} ({t('sans compte')})</option>)}
        <option value="__nouveau__">{t('Élève sans compte Fidni (taper son nom)')}</option>
      </select>
      {choix === '__nouveau__' && (
        <>
          <label className="mt-3 block text-[12px] font-semibold text-ink-faint" htmlFor="depot-nom">{t('Nom de l’élève')}</label>
          <input id="depot-nom" className={fieldCls} value={nom} onChange={(e) => setNom(e.target.value)} maxLength={120}
            placeholder={t('Ex. Amine Benali')} autoComplete="off" />
          <p className="mt-1 text-[11.5px] leading-snug text-ink-faint">{t('Sa copie est corrigée, notée et exportée comme les autres ; lui ne la voit pas sur Fidni (il n’a pas de compte).')}</p>
        </>
      )}
      <div role="button" tabIndex={0} onClick={() => input.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setSurvol(true); }} onDragLeave={() => setSurvol(false)}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setSurvol(false); if (e.dataTransfer.files.length) ajouter(e.dataTransfer.files); }}
        className={`mt-4 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
          survol ? 'border-brand bg-brand-soft/60' : 'border-line bg-[#faf9f7] hover:border-[#cfc9bf]'}`}>
        <Upload className="h-6 w-6 text-ink-faint" />
        <span className="text-[13.5px] font-semibold text-ink">{t('Glisse les fichiers ici, ou clique pour les choisir')}</span>
        <span className="text-[12px] text-ink-faint">{t('Photos (JPEG, PNG) ou PDF, 25 Mo au plus par fichier')}</span>
        <input ref={input} type="file" multiple hidden accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(e) => { if (e.target.files?.length) ajouter(e.target.files); e.target.value = ''; }} />
      </div>
      {liste.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {liste.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 rounded-lg bg-[#f7f6f3] px-3 py-1.5 text-[12.5px]">
              <span className="min-w-0 truncate text-ink-soft">{f.name}</span>
              <button type="button" onClick={() => setListe((l) => l.filter((_, j) => j !== i))} aria-label={t('Retirer')}
                className="shrink-0 text-ink-faint hover:text-[#a23b34]"><Trash2 className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      )}
      {err && <FormError>{err}</FormError>}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="fd-btn-ghost min-h-10" onClick={onClose}>{t('Annuler')}</button>
        <button type="submit" className="fd-btn-primary min-h-10" disabled={!pret}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} {t('Déposer')}
        </button>
      </div>
    </ModalShell>
  );
}

/* ───────────────────────────── PDF de toute la classe */

function LotBouton({ evId, classeId, onLot }: { evId: number; classeId: string; onLot: (l: Lot) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [ppc, setPpc] = useState<string>('');
  const [ouvert, setOuvert] = useState(false);
  const envoyer = async (f: File) => {
    setBusy(true);
    try { onLot(await envoyerLot(classeId, evId, f, ppc ? Number(ppc) : null)); setOuvert(false); }
    catch (e) { alert(copiesError(e, t('Envoi impossible.'))); }
    finally { setBusy(false); }
  };
  return (
    <div className="relative">
      <button type="button" className="fd-btn-ghost min-h-10" onClick={() => setOuvert((o) => !o)} aria-expanded={ouvert}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />} {t('PDF de toute la classe')}
      </button>
      {ouvert && (
        <div className="absolute start-0 top-full z-20 mt-1.5 w-80 rounded-2xl border border-line bg-white p-4 shadow-[0_14px_40px_rgba(20,18,16,.16)]">
          <p className="text-[12.5px] leading-relaxed text-ink-soft">
            {t('Scanne toutes les copies à la suite dans un seul PDF : l’IA lit le nom en haut de chaque page et range les pages par élève. Tu vérifies avant de valider.')}
          </p>
          <label className="mt-3 block text-[12px] font-semibold text-ink-faint" htmlFor="lot-ppc">{t('Toutes les copies ont le même nombre de pages ? (facultatif)')}</label>
          <input id="lot-ppc" type="number" min={1} max={12} value={ppc} onChange={(e) => setPpc(e.target.value)}
            placeholder={t('Ex. 2 : découpage sans IA')} className="mt-1 w-full min-h-10 rounded-xl border border-line px-3 text-[13.5px]" />
          <input ref={input} type="file" accept="application/pdf" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) envoyer(f); e.target.value = ''; }} />
          <button type="button" className="fd-btn-primary mt-3 min-h-10 w-full justify-center" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {t('Choisir le PDF')}
          </button>
        </div>
      )}
    </div>
  );
}

type Groupe = { pages: number[]; eleve_id: number | null; nom_lu: string; nom?: string };

function LotPanneau({ classeId, evId, lot, onLot, onFini }: {
  classeId: string; evId: number; lot: Lot; onLot: (l: Lot) => void; onFini: () => void;
}) {
  const [groupes, setGroupes] = useState<Groupe[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (lot.statut !== 'en_attente' && lot.statut !== 'en_cours') return;
    const timer = setInterval(() => getLot(classeId, evId, lot.id).then(onLot).catch(() => undefined), 3000);
    return () => clearInterval(timer);
  }, [lot.statut, lot.id, classeId, evId, onLot]);
  useEffect(() => {
    if (lot.statut === 'pret') setGroupes(lot.proposition.map((g) => ({ pages: g.pages, eleve_id: g.eleve_id, nom_lu: g.nom_lu })));
  }, [lot.statut, lot.proposition]);

  const pris = useMemo(() => new Set(groupes.map((g) => g.eleve_id).filter(Boolean)), [groupes]);

  if (lot.statut === 'en_attente' || lot.statut === 'en_cours') {
    return <Bandeau ton="vert"><Loader2 className="me-1.5 inline h-4 w-4 animate-spin" />{lot.etape || t('Lecture des noms sur les copies…')}</Bandeau>;
  }
  if (lot.statut === 'erreur') {
    return <Bandeau ton="rouge">{lot.error || t('La lecture du PDF a échoué.')} <button type="button" className="font-semibold underline" onClick={async () => { await deleteLot(classeId, evId, lot.id); onFini(); }}>{t('Fermer')}</button></Bandeau>;
  }
  if (lot.statut !== 'pret') return null;

  const fusionner = (i: number) => setGroupes((gs) => gs.flatMap((g, j) => (j === i - 1 ? [{ ...g, pages: [...g.pages, ...gs[i].pages] }] : j === i ? [] : [g])));
  const couper = (i: number, k: number) => setGroupes((gs) => gs.flatMap((g, j) => (j === i
    ? [{ ...g, pages: g.pages.slice(0, k) }, { pages: g.pages.slice(k), eleve_id: null, nom_lu: '' }] : [g])));

  const confirmer = async () => {
    setBusy(true);
    setErr('');
    try {
      await confirmerLot(classeId, evId, lot.id, groupes.map((g) => ({ pages: g.pages, eleve_id: g.eleve_id, nom: g.nom })));
      onFini();
    } catch (e) {
      setErr(copiesError(e, t('Impossible de créer les copies.')));
    } finally { setBusy(false); }
  };

  return (
    <div className="mb-5 rounded-2xl border border-brand-line bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[15px] font-semibold text-ink">{t('Découpage du PDF : vérifie chaque copie')}</h3>
        <p className="text-[12.5px] text-ink-faint">{t('{n} pages, {k} copies trouvées', { n: lot.nb_pages, k: groupes.length })}</p>
      </div>
      <ol className="flex flex-col gap-3">
        {groupes.map((g, i) => (
          <li key={`${i}-${g.pages[0]}`} className="rounded-xl border border-line p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span dir="ltr" className="fd-nums text-[12px] font-bold text-ink-faint">{i + 1}.</span>
              <select value={g.eleve_id ?? (g.nom !== undefined ? '__nom__' : '')} aria-label={t('Élève de cette copie')}
                onChange={(e) => {
                  const v = e.target.value;
                  setGroupes((gs) => gs.map((x, j) => (j !== i ? x : v === '__nom__'
                    ? { ...x, eleve_id: null, nom: x.nom ?? x.nom_lu ?? '' }
                    : { ...x, eleve_id: v ? Number(v) : null, nom: undefined })));
                }}
                className={`min-h-9 rounded-lg border px-2 text-[13px] ${g.eleve_id || g.nom ? 'border-line' : 'border-gold-line bg-gold-soft'}`}>
                <option value="">{t('— Choisir l’élève (ou laisser de côté) —')}</option>
                <option value="__nom__">{t('Élève sans compte (taper son nom)')}</option>
                {lot.eleves.map((u) => (
                  <option key={u.id} value={u.id} disabled={pris.has(u.id) && g.eleve_id !== u.id}>{u.username}</option>
                ))}
              </select>
              {g.nom !== undefined && (
                <input value={g.nom} placeholder={t('Nom de l’élève')} aria-label={t('Nom de l’élève')} maxLength={120}
                  onChange={(e) => setGroupes((gs) => gs.map((x, j) => (j === i ? { ...x, nom: e.target.value } : x)))}
                  className="min-h-9 w-48 rounded-lg border border-line px-2 text-[13px]" />
              )}
              {g.nom_lu && <span className="text-[12px] text-ink-faint">{t('Nom lu : « {nom} »', { nom: g.nom_lu })}</span>}
              {i > 0 && (
                <button type="button" onClick={() => fusionner(i)} className="ms-auto inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-[12px] font-semibold text-ink-soft hover:bg-[#f2f1ee]">
                  <Merge className="h-3.5 w-3.5" /> {t('Rattacher à la copie précédente')}
                </button>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              {g.pages.map((p, k) => (
                <React.Fragment key={p}>
                  {k > 0 && (
                    <button type="button" onClick={() => couper(i, k)} title={t('Nouvelle copie à partir de cette page')}
                      className="mb-8 inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-faint hover:bg-[#f2f1ee] hover:text-ink">
                      <Scissors className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <figure className="w-24">
                    <img src={urlApi(lot.pages[p - 1])} alt={t('Page {n}', { n: p })} loading="lazy"
                      className="h-32 w-24 rounded-md border border-line bg-white object-cover object-top" />
                    <figcaption className="mt-0.5 text-center text-[11px] text-ink-faint">{t('Page {n}', { n: p })}</figcaption>
                  </figure>
                </React.Fragment>
              ))}
            </div>
          </li>
        ))}
      </ol>
      {err && <p className="mt-3 text-[13px] text-[#a23b34]">{err}</p>}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button type="button" className="fd-btn-ghost min-h-10" onClick={async () => { await deleteLot(classeId, evId, lot.id); onFini(); }}>{t('Annuler')}</button>
        <button type="button" className="fd-btn-primary min-h-10" disabled={busy || !groupes.some((g) => g.eleve_id || g.nom?.trim())} onClick={confirmer}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} {t('Créer les copies')}
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────────── Sujet et barème */

function OngletSujet({ ev, onChange }: { ev: EvaluationDetail; onChange: (e: EvaluationDetail) => void }) {
  const { id = '' } = useParams<{ id: string }>();
  const [maxima, setMaxima] = useState<Record<string, string>>({});
  const [pas, setPas] = useState(ev.pas);
  const [noteSur, setNoteSur] = useState(ev.note_sur);
  const [consignes, setConsignes] = useState(ev.consignes);
  const [blocs, setBlocs] = useState<ExerciseBlock[]>(ev.sujet.blocks || []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ton: 'vert' | 'rouge'; texte: string } | null>(null);
  const [fichiers, setFichiers] = useState<File[]>([]);

  useEffect(() => {
    setMaxima(Object.fromEntries(ev.questions.map((q) => [q.chemin, String(q.max).replace('.', ',')])));
    setBlocs(ev.sujet.blocks || []);
  }, [ev]);

  const prive = ev.source === 'prive';
  const vide = !ev.questions.length;

  const enregistrer = async (avecSujet: boolean) => {
    setBusy(true);
    setMsg(null);
    try {
      const m: Record<string, number> = {};
      for (const q of ev.questions) {
        const v = Number(String(maxima[q.chemin] ?? q.max).replace(',', '.'));
        if (!Number.isNaN(v) && v !== q.max) m[q.chemin] = v;
      }
      const r = await updateEvaluation(id, ev.id, {
        pas, note_sur: noteSur, consignes, maxima: { ...ev.maxima, ...m },
        ...(avecSujet ? { sujet: { ...ev.sujet, blocks: blocs }, sujet_verifie: true } : {}),
      });
      onChange(r);
      setMsg({ ton: 'vert', texte: t('Enregistré.') });
    } catch (e) {
      setMsg({ ton: 'rouge', texte: copiesError(e, t('Impossible d’enregistrer.')) });
    } finally { setBusy(false); }
  };

  const importer = async () => {
    if (!fichiers.length) return;
    setBusy(true);
    try { onChange(await importSujet(id, ev.id, fichiers)); setFichiers([]); }
    catch (e) { setMsg({ ton: 'rouge', texte: copiesError(e, t('Impossible d’envoyer le sujet.')) }); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">
        {msg && <Bandeau ton={msg.ton}>{msg.texte}</Bandeau>}
        {ev.content && (
          <p className="mb-4 text-[13.5px] text-ink-soft">
            {t('Sujet repris de')}{' '}
            <Link className="font-semibold text-brand-hover hover:underline" to={`/${ev.content.type === 'exam' ? 'exams' : 'exercises'}/${ev.content.id}`}>{ev.content.title}</Link>
            {' '}{t('(copie figée : une modification du devoir sur le site ne change pas cette évaluation).')}
          </p>
        )}

        {prive && (vide || ev.sujet_statut === 'erreur' || ev.sujet_statut === 'en_cours') && (
          <div className="mb-6 rounded-2xl border border-line bg-white p-5">
            <h3 className="text-[15px] font-semibold text-ink">{t('Importer ton sujet')}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-faint">
              {t('Envoie le sujet en PDF ou en photos, et son corrigé si tu l’as : l’IA en fait une liste de questions avec leur barème. Sans corrigé, elle rédige les solutions : vérifie-les avant de corriger les copies.')}
            </p>
            {ev.sujet_statut === 'en_cours' ? (
              <p className="mt-4 inline-flex items-center gap-2 text-[13.5px] text-brand-hover"><Loader2 className="h-4 w-4 animate-spin" /> {ev.etape || t('Lecture du sujet…')}</p>
            ) : (
              <>
                {ev.sujet_statut === 'erreur' && ev.error && <p className="mt-3 text-[13px] text-[#a23b34]">{ev.error}</p>}
                <input type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" className="mt-3 block text-[13px]"
                  onChange={(e) => setFichiers(Array.from(e.target.files || []).slice(0, 4))} />
                <button type="button" className="fd-btn-primary mt-3 min-h-10" disabled={busy || !fichiers.length} onClick={importer}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {t('Lire le sujet avec l’IA')}
                </button>
              </>
            )}
          </div>
        )}

        {prive && ev.sujet_statut !== 'en_cours' && (!vide || blocs.length > 0) && (
          <div className="mb-6">
            {ev.sujet_statut === 'a_verifier' && (
              <Bandeau ton="or">{t('Relis l’énoncé, les points et surtout les solutions rédigées par l’IA, corrige-les si besoin, puis enregistre.')}</Bandeau>
            )}
            {!ev.modifiable && <Bandeau ton="or">{t('Des copies sont déjà corrigées : tu peux changer les textes et les points, pas ajouter, retirer ou déplacer des questions.')}</Bandeau>}
            <QuestionsEditor blocks={blocs} onChange={setBlocs} isExam />
            <button type="button" className="fd-btn-primary mt-3 min-h-10" disabled={busy} onClick={() => enregistrer(true)}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} {t('Enregistrer le sujet vérifié')}
            </button>
          </div>
        )}

        {!vide && (
          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            <table className="w-full text-[13.5px]">
              <thead className="bg-[#faf9f7] text-[11.5px] uppercase tracking-[.06em] text-ink-faint">
                <tr>
                  <th className="w-44 px-4 py-2.5 text-start font-semibold">{t('Question')}</th>
                  <th className="hidden px-3 py-2.5 text-start font-semibold md:table-cell">{t('Énoncé')}</th>
                  <th className="w-28 px-3 py-2.5 text-end font-semibold">{t('Points')}</th>
                </tr>
              </thead>
              <tbody>
                {ev.questions.map((q) => (
                  <tr key={q.chemin} className="border-t border-line align-top">
                    <td className="px-4 py-2.5 font-semibold text-ink">{q.label}</td>
                    <td className="hidden max-w-0 px-3 py-2.5 md:table-cell">
                      <div className="fd-card-preview line-clamp-2 text-[12.5px] text-ink-soft"><TipTapRenderer content={q.enonce_html} /></div>
                    </td>
                    <td className="px-3 py-2 text-end">
                      <input inputMode="decimal" aria-label={t('Points de la question {q}', { q: q.label })} value={maxima[q.chemin] ?? ''}
                        onChange={(e) => setMaxima((m) => ({ ...m, [q.chemin]: e.target.value }))}
                        dir="ltr" className="fd-nums w-20 rounded-lg border border-line px-2 py-1.5 text-end" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <aside className="flex flex-col gap-4">
        <div className="rounded-2xl border border-line bg-white p-4">
          <h3 className="text-[14px] font-semibold text-ink">{t('Notation')}</h3>
          <label className="mt-3 block text-[12px] font-semibold text-ink-faint" htmlFor="ev-pas">{t('Arrondi des points')}</label>
          <select id="ev-pas" value={pas} onChange={(e) => setPas(Number(e.target.value))} className="mt-1 w-full min-h-10 rounded-xl border border-line px-3 text-[13.5px]">
            <option value={0.25}>{t('Au quart de point')}</option>
            <option value={0.5}>{t('Au demi-point')}</option>
            <option value={1}>{t('Au point')}</option>
          </select>
          <label className="mt-3 block text-[12px] font-semibold text-ink-faint" htmlFor="ev-sur2">{t('Note sur')}</label>
          <input id="ev-sur2" type="number" min={1} max={100} value={noteSur} onChange={(e) => setNoteSur(Number(e.target.value) || 20)}
            className="mt-1 w-full min-h-10 rounded-xl border border-line px-3 text-[13.5px]" />
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <h3 className="text-[14px] font-semibold text-ink">{t('Consignes de correction')}</h3>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-faint">{t('Ce que l’IA doit appliquer en proposant les notes (rédaction, unités, méthode exigée…).')}</p>
          <textarea value={consignes} onChange={(e) => setConsignes(e.target.value)} rows={5} maxLength={2000}
            placeholder={t('Ex. Enlever 0,5 point si la conclusion manque. Accepter toute méthode au programme.')}
            className="mt-2 w-full rounded-xl border border-line p-3 text-[13px]" />
        </div>
        <button type="button" className="fd-btn-primary min-h-10 justify-center" disabled={busy} onClick={() => enregistrer(false)}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} {t('Enregistrer le barème')}
        </button>
      </aside>
    </div>
  );
}

/* ───────────────────────────── Bilan */

function OngletBilan({ ev }: { ev: EvaluationDetail }) {
  const { id = '' } = useParams<{ id: string }>();
  const [r, setR] = useState<Rapport | null>(null);
  useEffect(() => { getRapport(id, ev.id).then(setR).catch(() => undefined); }, [id, ev.id]);
  if (!r) return <CardsSkeleton n={3} />;
  const nom = `notes-${ev.titre}`.replace(/[\\/:*?"<>|]/g, '-').slice(0, 60);
  const maxRep = Math.max(1, ...r.repartition.map((x) => x.n));
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13.5px] text-ink-faint">
          {t('Calculé sur les copies validées : {n} sur {total}.', { n: r.copies_validees, total: r.copies_total })}
        </p>
        <div className="flex gap-2">
          <button type="button" className="fd-btn-ghost min-h-10" onClick={() => exporterNotes(id, ev.id, 'xlsx', nom)}><Download className="h-4 w-4" /> {t('Excel')}</button>
          <button type="button" className="fd-btn-ghost min-h-10" onClick={() => exporterNotes(id, ev.id, 'csv', nom)}><Download className="h-4 w-4" /> {t('CSV')}</button>
        </div>
      </div>
      {!r.resume ? (
        <p className="rounded-2xl border border-line bg-white p-6 text-center text-[13.5px] text-ink-faint">{t('Valide au moins une copie pour voir le bilan de la classe.')}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label={t('Moyenne')} value={<span dir="ltr" className="fd-nums">{fmt(r.resume.moyenne)}<span className="text-[14px] text-ink-faint"> / {r.note_sur}</span></span>} />
            <StatTile label={t('Médiane')} value={<span dir="ltr" className="fd-nums">{fmt(r.resume.mediane)}</span>} />
            <StatTile label={t('Plus basse / plus haute')} value={<span dir="ltr" className="fd-nums">{fmt(r.resume.min)} – {fmt(r.resume.max)}</span>} />
            <StatTile label={t('Moyenne atteinte')} value={<span dir="ltr" className="fd-nums">{r.resume.au_dessus_moyenne} / {r.copies_validees}</span>} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-line bg-white p-4">
              <h3 className="text-[14px] font-semibold text-ink">{t('Répartition des notes')}</h3>
              <div className="fd-ltr mt-4 flex h-40 items-end gap-1.5">
                {r.repartition.map((x) => (
                  <div key={x.de} className="flex flex-1 flex-col items-center gap-1">
                    <span dir="ltr" className="fd-nums text-[11px] text-ink-faint">{x.n || ''}</span>
                    <div className="w-full rounded-t-md bg-brand" style={{ height: `${(x.n / maxRep) * 120}px`, minHeight: x.n ? 4 : 0 }} />
                  </div>
                ))}
              </div>
              <div className="fd-ltr mt-1 flex gap-1.5 text-[10.5px] text-ink-faint">
                {r.repartition.map((x) => <span key={x.de} dir="ltr" className="fd-nums flex-1 text-center">{fmt(x.de)}</span>)}
              </div>
            </section>
            <section className="rounded-2xl border border-line bg-white p-4">
              <h3 className="text-[14px] font-semibold text-ink">{t('Théorèmes les moins réussis')}</h3>
              {r.theoremes_faibles.length === 0 ? <p className="mt-3 text-[13px] text-ink-faint">{t('Les questions de ce sujet ne sont pas rattachées à des théorèmes.')}</p> : (
                <ul className="mt-3 flex flex-col gap-2.5">
                  {r.theoremes_faibles.map((th) => (
                    <li key={th.theoreme}>
                      <div className="flex items-baseline justify-between gap-2 text-[13px]">
                        <span className="min-w-0 truncate font-medium text-ink">{th.theoreme}</span>
                        <span dir="ltr" className="fd-nums shrink-0 text-ink-faint">{th.taux} %</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#f2f1ee]"><div className="h-full rounded-full bg-gold" style={{ width: `${th.taux}%` }} /></div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="mt-6 rounded-2xl border border-line bg-white p-4">
            <h3 className="text-[14px] font-semibold text-ink">{t('Réussite question par question')}</h3>
            <ul className="mt-3 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
              {r.questions.map((q) => (
                <li key={q.chemin}>
                  <div className="flex items-baseline justify-between gap-2 text-[13px]">
                    <span className="font-medium text-ink">{q.label} <span className="text-ink-faint">({fmt(q.max)} pt)</span></span>
                    <span dir="ltr" className="fd-nums text-ink-faint">{q.reussite === null ? '—' : `${q.reussite} %`}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#f2f1ee]">
                    <div className={`h-full rounded-full ${(q.reussite ?? 0) >= 50 ? 'bg-brand' : 'bg-gold'}`} style={{ width: `${q.reussite ?? 0}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

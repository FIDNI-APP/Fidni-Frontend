// Pilotage › À valider : les exercices, cours et devoirs préparés par Claude (backend apps/ia/depot.py), à part de
// l'onglet IA (Natsu, 14/10/2026 : « un espace complètement optimisé pour cette tâche, avec des cards »).
// Cartes regroupées par document → relecture au rendu du site, avec les commentaires de Claude
// → « Valider et publier », « Modifier » (l'IA du site applique la demande) ou « Rejeter ». Rien n'est en ligne avant.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList,
  ExternalLink, FileText, Image as ImageIcon, Inbox, Lightbulb, Loader2, MessageSquare, PenLine, Printer, RefreshCw,
  Send, X,
} from 'lucide-react';
import ExerciseRenderer from '@/components/content/viewer/ExerciseRenderer';
import { LessonRenderer } from '@/components/content/viewer/LessonRenderer';
import type { FlexibleExerciseStructure } from '@/components/content/editor/FlexibleExerciseEditor';
import type { FlexibleLessonStructure } from '@/components/content/editor/FlexibleLessonEditor';
import { MathText } from '@/components/skilliq/MathText';
import {
  apiError, askCorrection, getJob, isRunning, listBrouillons, publishJob, rejectJob,
  type Brouillon, type BrouillonDetail, type BrouillonStatut,
} from '@/lib/api/iaApi';
import { checkStructureMath } from '@/lib/mathCheck';

const TYPE: Record<string, { label: string; icon: typeof PenLine }> = {
  exercice: { label: 'Exercice', icon: PenLine }, examen: { label: 'Devoir', icon: ClipboardList },
  lecon: { label: 'Leçon', icon: BookOpen },
};
const SECTION_URL: Record<string, string> = { exercise: 'exercises', exam: 'exams', lesson: 'lessons' };
const DIFF: Record<string, { label: string; n: number }> = {
  facile: { label: 'Facile', n: 1 }, moyen: { label: 'Moyen', n: 2 }, difficile: { label: 'Difficile', n: 3 },
};
const STATUTS: { key: BrouillonStatut; label: string }[] = [
  { key: 'a_valider', label: 'À valider' }, { key: 'publies', label: 'Publiés' }, { key: 'rejetes', label: 'Rejetés' },
];

// Niveaux abrégés sur les cartes (le nom complet est dans la relecture).
const COURT: Record<string, string> = {
  'Tronc commun Sciences': 'TC Sciences', '1ère Bac SM': '1re Bac SM', '2ème Bac SM': '2e Bac SM', '2ème Bac PC/SVT': '2e Bac PC/SVT',
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

function ago(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'à l’instant';
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

const contentUrl = (c: { id: number; type: string }) => `/${SECTION_URL[c.type] ?? 'exercises'}/${c.id}`;

const DiffBars: React.FC<{ value: string | null }> = ({ value }) => {
  const d = value ? DIFF[value] : undefined;
  if (!d) return null;
  return (
    <span className="inline-flex items-center gap-1.5" title={`Difficulté : ${d.label}`}>
      <span className="inline-flex items-end gap-[2px]" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={`w-[3px] rounded-sm ${i <= d.n ? 'bg-ink-soft' : 'bg-line'}`} style={{ height: 4 + i * 3 }} />
        ))}
      </span>
      <span>{d.label}</span>
    </span>
  );
};

/** État d'un brouillon en un mot, couleur comprise : ce qui décide si on peut publier tout de suite. */
const Etat: React.FC<{ b: Brouillon }> = ({ b }) => {
  if (isRunning(b.status)) {
    return <span className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-hover"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Modification en cours</span>;
  }
  if (b.status === 'erreur') return <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#a23b34]"><AlertTriangle className="h-3.5 w-3.5" /> Modification échouée</span>;
  if (b.status === 'publie') return <span className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-hover"><CheckCircle2 className="h-3.5 w-3.5" /> En ligne</span>;
  if (b.status === 'rejete') return <span className="text-[12px] font-medium text-ink-faint">Rejeté</span>;
  if (b.erreurs) return <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#a23b34]"><AlertTriangle className="h-3.5 w-3.5" /> {plural(b.erreurs, 'erreur')}</span>;
  if (b.doublons) return <span className="inline-flex items-center gap-1 text-[12px] font-medium text-gold-strong"><AlertTriangle className="h-3.5 w-3.5" /> Doublon possible</span>;
  return <span className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-hover"><Check className="h-3.5 w-3.5" /> Prêt à publier</span>;
};

const Stat: React.FC<{ icon: typeof PenLine; children: React.ReactNode; warn?: boolean }> = ({ icon: Icon, children, warn }) => (
  <span className={`inline-flex items-center gap-1 ${warn ? 'text-gold-strong' : ''}`}><Icon className="h-3.5 w-3.5" />{children}</span>
);

/* ───────────────────────────── Carte ───────────────────────────── */

const Carte: React.FC<{ b: Brouillon; onOpen: () => void }> = ({ b, onOpen }) => {
  const t = TYPE[b.type ?? ''] ?? TYPE.exercice;
  const leaves = b.type === 'lecon' ? 0 : b.questions;
  return (
    <article className="group flex flex-col rounded-2xl border border-line bg-white transition-shadow hover:border-ink-faint hover:shadow-[0_2px_12px_rgba(20,20,20,.06)]">
      <button type="button" onClick={onOpen} className="flex flex-1 flex-col p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-2xl">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.07em] text-ink-faint">
            <t.icon className="h-3.5 w-3.5 shrink-0" /> <span className="truncate" title={b.niveaux.join(', ')}>{t.label} · {b.niveaux.map((n) => COURT[n] ?? n).join(', ')}</span>
          </span>
          <span className="shrink-0 whitespace-nowrap"><Etat b={b} /></span>
        </div>
        <h3 className="fd-display mt-2 line-clamp-2 text-[17px] leading-snug text-ink">{b.titre}</h3>
        {b.chapitres.length > 0 && <p className="mt-0.5 truncate text-[12px] text-ink-faint">{b.chapitres.join(' · ')}</p>}
        {b.extrait && (
          <p className="mt-3 line-clamp-3 rounded-xl bg-[#faf9f7] px-3 py-2 font-serif text-[13.5px] leading-relaxed text-ink-soft">
            <MathText text={b.extrait} />
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-soft">
          {b.type === 'lecon' && b.sections > 0 && <Stat icon={BookOpen}>{plural(b.sections, 'partie')}</Stat>}
          {b.type === 'examen' && b.parties > 0 && <Stat icon={ClipboardList}>{plural(b.parties, 'exercice')}</Stat>}
          {leaves > 0 && <Stat icon={PenLine}>{plural(leaves, 'question')}</Stat>}
          {leaves > 0 && <Stat icon={Check} warn={b.solutions < leaves}>{b.solutions}/{leaves} solutions</Stat>}
          {b.indications > 0 && <Stat icon={Lightbulb}>{plural(b.indications, 'indication')}</Stat>}
          {b.figures > 0 && <Stat icon={ImageIcon}>{plural(b.figures, 'figure')}</Stat>}
          <DiffBars value={b.difficulte} />
        </div>
        {(b.remplace || b.commentaires > 0 || b.edite) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {b.edite && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f2f1ee] px-2 py-0.5 text-[11.5px] font-medium text-ink-soft">
                <PenLine className="h-3 w-3" /> Modifié à la main
              </span>
            )}
            {b.remplace && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#eef3f8] px-2 py-0.5 text-[11.5px] font-medium text-[#35577a]">
                <RefreshCw className="h-3 w-3" /> Mise à jour d’un contenu en ligne
              </span>
            )}
            {b.commentaires > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 text-[11.5px] font-medium text-gold-strong">
                <MessageSquare className="h-3 w-3" /> {plural(b.commentaires, 'commentaire')}
              </span>
            )}
          </div>
        )}
      </button>
      <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-2.5 text-[11.5px] text-ink-faint">
        <span className="min-w-0 truncate">{[b.credit.replace(/, professeurs? de mathématiques$/, ''), b.ecole].filter(Boolean).join(' · ') || b.document}</span>
        {b.publie ? (
          <Link to={contentUrl(b.publie)} className="inline-flex shrink-0 items-center gap-1 font-medium text-brand-hover hover:underline">Voir en ligne <ExternalLink className="h-3 w-3" /></Link>
        ) : (
          <button type="button" onClick={onOpen} className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-ink group-hover:text-brand-hover">
            {b.status === 'rejete' ? 'Revoir' : 'Relire'} <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </article>
  );
};

/* ───────────────────────────── Relecture ───────────────────────────── */

const Point: React.FC<{ tone: 'red' | 'gold' | 'gray'; children: React.ReactNode }> = ({ tone, children }) => (
  <li className="flex gap-2 text-[13px] leading-snug">
    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${tone === 'red' ? 'bg-[#a23b34]' : tone === 'gold' ? 'bg-gold' : 'bg-ink-faint'}`} />
    <span className="min-w-0 text-ink-soft">{children}</span>
  </li>
);

const Relecture: React.FC<{
  id: number; ids: number[]; iaConfiguree: boolean; onSelect: (id: number | null) => void; onChanged: () => void;
}> = ({ id, ids, iaConfiguree, onSelect, onChanged }) => {
  const [job, setJob] = useState<BrouillonDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [solutions, setSolutions] = useState(true);
  const [modifier, setModifier] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [aVerifier, setAVerifier] = useState(true);
  const [doublonOk, setDoublonOk] = useState(false);
  const pos = ids.indexOf(id);
  const prev = pos > 0 ? ids[pos - 1] : null;
  const next = pos >= 0 && pos < ids.length - 1 ? ids[pos + 1] : null;
  // Le suivant au moment de l'action : la liste se recharge ensuite sans ce brouillon.
  const [suivant, setSuivant] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const j = (await getJob(id)) as BrouillonDetail;
      setJob(j);
      setError(null);
      return j;
    } catch (e) {
      setError(apiError(e, 'Impossible de charger ce brouillon.'));
      return null;
    }
  }, [id]);

  useEffect(() => {
    setJob(null); setModifier(false); setInstruction(''); setDoublonOk(false); setSuivant(null);
    load().then((j) => { if (j) setAVerifier(j.carte?.a_verifier ?? true); });
    window.scrollTo({ top: 0 });
  }, [load]);
  useEffect(() => {
    if (!job || !isRunning(job.status)) return undefined;
    const t = window.setInterval(async () => { const j = await load(); if (j && !isRunning(j.status)) onChanged(); }, 4000);
    return () => window.clearInterval(t);
  }, [job, load, onChanged]);

  const apercu = job?.apercus?.[0];
  const math = useMemo(() => (apercu?.structure ? checkStructureMath(apercu.structure) : []), [apercu?.structure]);

  const act = async (fn: () => Promise<unknown>, fallback: string) => {
    setBusy(true);
    setError(null);
    setSuivant(next);
    try { await fn(); await load(); onChanged(); return true; } catch (e) { setError(apiError(e, fallback)); return false; } finally { setBusy(false); }
  };

  if (!job) {
    return error ? <p role="alert" className="text-[13px] text-[#9c3b2e]">{error}</p>
      : <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-ink-faint" /></div>;
  }

  const c = job.carte;
  const t = TYPE[c?.type ?? ''] ?? TYPE.exercice;
  const controles = job.controles ?? [];
  const erreurs = [...(job.erreurs_figures ?? []), ...controles.flatMap((x) => x.erreurs)];
  const doublons = controles.flatMap((x) => x.doublons);
  const avert = [...(job.avertissements ?? []), ...controles.flatMap((x) => x.avertissements)];
  const commentaires = [...(job.doutes ?? []), ...(job.problemes ?? []).map((p) => (p.ou ? `${p.ou} : ${p.description}` : p.description))];
  const bloque = erreurs.length > 0 || math.length > 0;
  const pret = job.status === 'pret';
  const maj = job.remplace ?? c?.remplace ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={() => onSelect(null)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] text-ink-soft hover:bg-[#f2f1ee] hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Tous les contenus
        </button>
        {pos >= 0 && ids.length > 1 && (
          <div className="flex items-center gap-1">
            <button type="button" disabled={!prev} onClick={() => prev && onSelect(prev)} aria-label="Contenu précédent"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-ink-soft hover:border-ink hover:text-ink disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <span className="fd-nums px-1.5 text-[12.5px] text-ink-faint">{pos + 1} / {ids.length}</span>
            <button type="button" disabled={!next} onClick={() => next && onSelect(next)} aria-label="Contenu suivant"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-ink-soft hover:border-ink hover:text-ink disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        )}
      </div>

      <header className="fd-card p-5">
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] font-bold uppercase tracking-[.07em] text-ink-faint">
          <span className="inline-flex items-center gap-1.5"><t.icon className="h-3.5 w-3.5" />{t.label}</span>
          {c?.niveaux.length ? <span>· {c.niveaux.join(', ')}</span> : null}
          {c?.difficulte && <span className="normal-case tracking-normal font-medium text-[12px]">· <DiffBars value={c.difficulte} /></span>}
        </p>
        <h2 className="fd-display mt-1.5 text-[24px] leading-tight text-ink md:text-[26px]">{c?.titre ?? job.document}</h2>
        {c?.chapitres.length ? <p className="mt-1 text-[13px] text-ink-soft">{c.chapitres.join(' · ')}</p> : null}
        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px]">
          {c?.credit && <div><dt className="inline text-ink-faint">Proposé par </dt><dd className="inline text-ink">{c.credit}</dd></div>}
          {c?.ecole && <div><dt className="inline text-ink-faint">Donné au </dt><dd className="inline text-ink">{c.ecole}</dd></div>}
          {job.document && <div className="inline-flex items-center gap-1 text-ink-faint"><FileText className="h-3.5 w-3.5" /> {job.document}</div>}
          <div className="text-ink-faint">Déposé {ago(job.created_at)}</div>
        </dl>
        {maj && (
          <p className="mt-3 flex flex-wrap items-center gap-1.5 rounded-xl bg-[#eef3f8] px-3 py-2 text-[12.5px] text-[#35577a]">
            <RefreshCw className="h-3.5 w-3.5 shrink-0" /> Remplace le contenu en ligne
            <Link to={contentUrl(maj)} className="font-semibold underline-offset-2 hover:underline">« {maj.titre} »</Link>
            — même lien, progression des élèves conservée.
          </p>
        )}
      </header>

      {error && <p role="alert" className="whitespace-pre-line rounded-xl border border-[#f0d4cf] bg-[#fbf1ef] px-4 py-3 text-[13px] text-[#9c3b2e]">{error}</p>}
      {isRunning(job.status) && (
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-[#faf9f7] px-4 py-4">
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-brand" />
          <div>
            <p className="text-[13.5px] font-medium text-ink">{job.etape || 'Modification en attente'}</p>
            <p className="text-[12px] text-ink-faint">Tu peux passer au contenu suivant : la modification continue sur le serveur.</p>
          </div>
        </div>
      )}
      {job.status === 'erreur' && job.error && (
        <p className="whitespace-pre-line rounded-2xl border border-[#f0d4cf] bg-[#fbf1ef] px-4 py-3 text-[13px] text-[#9c3b2e]">{job.error}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            {apercu?.type !== 'lesson' ? (
              <div role="radiogroup" aria-label="Affichage" className="inline-flex rounded-xl border border-line bg-[#faf9f7] p-0.5">
                {[{ v: true, l: 'Avec les solutions' }, { v: false, l: 'Vue élève' }].map((o) => (
                  <button key={o.l} type="button" role="radio" aria-checked={solutions === o.v} onClick={() => setSolutions(o.v)}
                    className={`rounded-[10px] px-3 py-1.5 text-[12.5px] font-medium transition-colors ${solutions === o.v ? 'bg-white text-ink shadow-sm' : 'text-ink-faint hover:text-ink'}`}>
                    {o.l}
                  </button>
                ))}
              </div>
            ) : <span />}
            {!!apercu?.structure && !apercu.erreur && (
              <Link to={`/pilotage/ia/${job.id}/pdf?fiche=${encodeURIComponent(apercu.cle)}`}
                className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1.5 text-[12.5px] font-medium text-ink hover:border-ink">
                <Printer className="h-3.5 w-3.5" /> Feuille PDF
              </Link>
            )}
          </div>
          <article className="rounded-2xl border border-line bg-white p-5 sm:p-7">
            {!apercu ? <p className="text-[13px] text-ink-faint">Aucun aperçu.</p>
              : apercu.erreur || !apercu.structure ? (
                <p className="text-[13px] text-[#9c3b2e]">Aperçu impossible : {apercu.erreur}</p>
              ) : apercu.type === 'lesson' ? (
                <LessonRenderer structure={apercu.structure as FlexibleLessonStructure} />
              ) : (
                <ExerciseRenderer key={String(solutions)} structure={apercu.structure as FlexibleExerciseStructure}
                  showAllSolutions={solutions} interactive={false} compact={false} />
              )}
          </article>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          {job.status === 'publie' ? (
            <section className="rounded-2xl border border-brand-line bg-brand-soft p-4">
              <p className="flex items-center gap-1.5 text-[14px] font-semibold text-brand-hover"><CheckCircle2 className="h-4 w-4" /> {maj ? 'Mis à jour' : 'Publié'}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(job.publies ?? []).map((p) => (
                  <Link key={p.id} to={contentUrl(p)} className="inline-flex items-center gap-1 rounded-lg border border-brand-line bg-white px-3 py-1.5 text-[12.5px] font-medium text-ink hover:border-ink">
                    Voir en ligne <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                ))}
                {suivant && (
                  <button type="button" onClick={() => onSelect(suivant)} className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-brand-hover">
                    Contenu suivant <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </section>
          ) : job.status === 'rejete' ? (
            <section className="fd-card p-4"><p className="text-[13.5px] font-semibold text-ink-soft">Rejeté — rien n’a été publié.</p></section>
          ) : (pret || job.status === 'erreur') && (
            <section className={`rounded-2xl border bg-white p-4 ${bloque ? 'border-[#f0d4cf]' : 'border-brand-line'}`} aria-labelledby="val-decision">
              <h3 id="val-decision" className="text-[14px] font-semibold text-ink">Décision</h3>
              <p className={`mt-1.5 flex items-start gap-1.5 text-[12.5px] ${bloque ? 'text-[#a23b34]' : 'text-brand-hover'}`}>
                {bloque ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                {bloque ? `${plural(erreurs.length + math.length, 'erreur')} à corriger avant de publier (voir plus bas).` : 'Contrôle automatique : aucune erreur.'}
              </p>
              {pret && (
                <>
                  <label className="mt-3 flex gap-2 text-[12.5px] text-ink-soft">
                    <input type="checkbox" className="mt-0.5 accent-[#1a7a4a]" checked={aVerifier} onChange={(e) => setAVerifier(e.target.checked)} />
                    <span>Bandeau « correction en cours de vérification » <span className="text-ink-faint">(solutions rédigées par Claude, pas encore relues)</span></span>
                  </label>
                  {doublons.length > 0 && (
                    <label className="mt-2 flex gap-2 text-[12.5px] text-ink-soft">
                      <input type="checkbox" className="mt-0.5 accent-[#1a7a4a]" checked={doublonOk} onChange={(e) => setDoublonOk(e.target.checked)} />
                      <span>C’est bien un nouveau contenu, pas un doublon</span>
                    </label>
                  )}
                  <button type="button" disabled={busy || bloque || (doublons.length > 0 && !doublonOk)}
                    onClick={() => act(() => publishJob(job.id, { a_verifier: aVerifier, doublon_ok: doublonOk }), 'La publication a échoué.')}
                    className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {maj ? 'Valider et mettre à jour' : 'Valider et publier'}
                  </button>
                </>
              )}
              <div className="mt-2 grid grid-cols-2 gap-2">
                {/* Modifier soi-même dans l'éditeur du site (15/10/2026) ; l'IA reste en option, en dessous. */}
                {pret && !busy ? (
                  <Link to={`/pilotage/brouillons/${job.id}/modifier${apercu?.cle ? `?fiche=${encodeURIComponent(apercu.cle)}` : ''}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-[13px] font-medium text-ink hover:border-ink">
                    <PenLine className="h-3.5 w-3.5" /> Modifier
                  </Link>
                ) : (
                  <span className="inline-flex cursor-not-allowed items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-[13px] font-medium text-ink opacity-50">
                    <PenLine className="h-3.5 w-3.5" /> Modifier
                  </span>
                )}
                <button type="button" disabled={busy}
                  onClick={async () => {
                    if (!window.confirm('Rejeter ce brouillon ? Rien ne sera publié.')) return;
                    const n = next;
                    if (await act(() => rejectJob(job.id), 'Le rejet a échoué.')) onSelect(n);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-[13px] font-medium text-ink-soft hover:border-[#a23b34] hover:text-[#a23b34]">
                  <X className="h-3.5 w-3.5" /> Rejeter
                </button>
              </div>
              {pret && !c?.edite && (
                <button type="button" onClick={() => setModifier((m) => !m)} aria-expanded={modifier}
                  className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-medium text-ink-faint hover:text-ink">
                  <Send className="h-3.5 w-3.5" /> {modifier ? 'Fermer' : 'Ou demander une modification à l’IA'}
                </button>
              )}
              {c?.edite && <p className="mt-2.5 text-[12px] text-ink-faint">Modifié dans l’éditeur : c’est cette version qui sera publiée.</p>}
              {modifier && pret && !c?.edite && (
                <div className="mt-3 border-t border-line pt-3">
                  <label htmlFor="val-modif" className="text-[12.5px] font-semibold text-ink">Ce qu’il faut changer</label>
                  <textarea id="val-modif" value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={4} maxLength={4000} autoFocus
                    placeholder="Ex. Question 2 : c’est x³ et non x². Détaille la limite en +∞ dans la solution."
                    className="mt-1 block w-full resize-y rounded-xl border border-line bg-white px-3 py-2 text-[13px] focus:border-brand focus:outline-none" />
                  {!iaConfiguree && <p className="mt-1.5 text-[12px] text-[#9c3b2e]">L’IA du site n’est pas configurée : dis-moi la modification dans la conversation.</p>}
                  <button type="button" disabled={busy || !instruction.trim() || !iaConfiguree}
                    onClick={async () => { if (await act(() => askCorrection(job.id, instruction.trim()), 'La demande a échoué.')) { setInstruction(''); setModifier(false); } }}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-[12.5px] font-semibold text-white hover:opacity-90 disabled:opacity-50">
                    <Send className="h-3.5 w-3.5" /> Appliquer la modification
                  </button>
                  <p className="mt-2 text-[11.5px] leading-snug text-ink-faint">L’IA du site corrige ce brouillon, document source à l’appui, en quelques minutes. Tu peux aussi me le demander dans la conversation : je dépose une version corrigée à la place de celle-ci.</p>
                </div>
              )}
            </section>
          )}

          <section className="fd-card p-4" aria-labelledby="val-commentaires">
            <h3 id="val-commentaires" className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
              <MessageSquare className="h-4 w-4 text-gold-strong" /> Commentaires de Claude
              {commentaires.length > 0 && <span className="fd-nums ml-auto text-[12px] font-normal text-ink-faint">{commentaires.length}</span>}
            </h3>
            {commentaires.length === 0 ? <p className="mt-2 text-[12.5px] text-ink-faint">Rien de particulier : transcription sans hésitation.</p> : (
              <ol className="mt-2.5 space-y-2.5">
                {commentaires.map((d, i) => (
                  <li key={i} className="flex gap-2.5 text-[13px] leading-snug text-ink-soft">
                    <span className="fd-nums mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-soft text-[11px] font-semibold text-gold-strong">{i + 1}</span>
                    <span className="min-w-0"><MathText text={d} /></span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {(erreurs.length + math.length + doublons.length + avert.length) > 0 && (
            <section className="fd-card p-4" aria-labelledby="val-controle">
              <h3 id="val-controle" className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
                <AlertTriangle className="h-4 w-4 text-ink-faint" /> Contrôle automatique
              </h3>
              <ul className="mt-2.5 space-y-2">
                {erreurs.map((e) => <Point key={e} tone="red">{e}</Point>)}
                {math.map((m, i) => <Point key={`m${i}`} tone="red">{m.where} : formule invalide <code className="break-all text-[11.5px]">{m.tex}</code> — {m.message}</Point>)}
                {doublons.map((e) => <Point key={e} tone="gold">{e}</Point>)}
                {avert.map((a) => <Point key={a} tone="gray">{a}</Point>)}
              </ul>
            </section>
          )}

          {c && c.theoremes.length > 0 && (
            <section className="px-1">
              <h3 className="text-[12px] font-semibold uppercase tracking-[.06em] text-ink-faint">Théorèmes travaillés</h3>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {c.theoremes.map((th) => <span key={th} className="rounded-full border border-line bg-white px-2 py-0.5 text-[11.5px] text-ink-soft">{th}</span>)}
                {c.nb_theoremes > c.theoremes.length && <span className="px-1 text-[11.5px] text-ink-faint">+{c.nb_theoremes - c.theoremes.length}</span>}
              </div>
            </section>
          )}

          {job.history.length > 0 && (
            <details className="px-1">
              <summary className="cursor-pointer text-[12px] font-semibold uppercase tracking-[.06em] text-ink-faint">Historique</summary>
              <ul className="mt-1.5 space-y-1 text-[12px] text-ink-soft">
                {job.history.map((h, i) => <li key={i}><span className="text-ink-faint">{ago(h.date)} · {h.qui === 'ia' ? 'IA du site' : h.qui} :</span> {h.texte}</li>)}
              </ul>
            </details>
          )}
        </aside>
      </div>
    </div>
  );
};

/* ───────────────────────────── Onglet ───────────────────────────── */

const Chip: React.FC<{ on: boolean; onClick: () => void; children: React.ReactNode }> = ({ on, onClick, children }) => (
  <button type="button" aria-pressed={on} onClick={onClick}
    className={`rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors ${on ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-soft hover:border-ink-faint hover:text-ink'}`}>
    {children}
  </button>
);

export const ValidationTab: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const selected = Number(params.get('brouillon')) || null;
  const statut = (STATUTS.some((s) => s.key === params.get('statut')) ? params.get('statut') : 'a_valider') as BrouillonStatut;
  const [items, setItems] = useState<Brouillon[] | null>(null);
  const [compte, setCompte] = useState<Record<BrouillonStatut, number> | null>(null);
  const [iaConfiguree, setIaConfiguree] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [niveau, setNiveau] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);

  const setParam = (key: string, value: string | null) => setParams((p) => {
    const n = new URLSearchParams(p);
    if (value) n.set(key, value); else n.delete(key);
    return n;
  });
  const select = useCallback((id: number | null) => setParams((p) => {
    const n = new URLSearchParams(p);
    if (id) n.set('brouillon', String(id)); else n.delete('brouillon');
    return n;
  }), [setParams]);

  const load = useCallback(async () => {
    try {
      const r = await listBrouillons(statut);
      setItems(r.results);
      setCompte(r.compte);
      setIaConfiguree(r.ia_configuree);
      setError(null);
    } catch {
      setError('Impossible de charger les contenus à valider.');
    }
  }, [statut]);

  useEffect(() => { setItems(null); setNiveau(null); setType(null); load(); }, [load]);
  useEffect(() => {
    if (!items?.some((b) => isRunning(b.status)) || selected) return undefined;
    const t = window.setInterval(load, 5000);
    return () => window.clearInterval(t);
  }, [items, load, selected]);

  const niveaux = useMemo(() => [...new Set((items ?? []).flatMap((b) => b.niveaux))], [items]);
  const types = useMemo(() => [...new Set((items ?? []).map((b) => b.type ?? 'exercice'))], [items]);
  const visibles = useMemo(() => (items ?? []).filter((b) => (!niveau || b.niveaux.includes(niveau)) && (!type || (b.type ?? 'exercice') === type)), [items, niveau, type]);
  // Regroupés par document d'origine : une série se relit d'un bout à l'autre.
  const groupes = useMemo(() => {
    const m = new Map<string, Brouillon[]>();
    visibles.forEach((b) => { const k = b.document || b.titre; m.set(k, [...(m.get(k) ?? []), b]); });
    return [...m.entries()];
  }, [visibles]);
  const ids = useMemo(() => groupes.flatMap(([, l]) => l.map((b) => b.id)), [groupes]);

  if (selected) {
    return <Relecture id={selected} ids={ids} iaConfiguree={iaConfiguree} onSelect={select} onChanged={load} />;
  }

  const prets = (items ?? []).filter((b) => b.status === 'pret' && !b.erreurs).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="fd-display flex items-center gap-2 text-[20px] text-ink"><Inbox className="h-5 w-5 text-ink-soft" /> Contenus à valider</h2>
          <p className="mt-0.5 text-[13px] text-ink-faint">Exercices, cours et devoirs préparés par Claude à partir de tes documents. Rien n’est en ligne avant ton feu vert.</p>
        </div>
        <div role="radiogroup" aria-label="Statut" className="inline-flex rounded-xl border border-line bg-[#faf9f7] p-0.5">
          {STATUTS.map((s) => (
            <button key={s.key} type="button" role="radio" aria-checked={statut === s.key} onClick={() => setParam('statut', s.key === 'a_valider' ? null : s.key)}
              className={`inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[12.5px] font-medium transition-colors ${statut === s.key ? 'bg-white text-ink shadow-sm' : 'text-ink-faint hover:text-ink'}`}>
              {s.label}
              {compte && <span className={`fd-nums text-[11.5px] ${statut === s.key && s.key === 'a_valider' && compte[s.key] ? 'rounded-full bg-gold-soft px-1.5 font-semibold text-gold-strong' : 'text-ink-faint'}`}>{compte[s.key]}</span>}
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="rounded-xl border border-[#f0d4cf] bg-[#fbf1ef] px-4 py-3 text-[13px] text-[#9c3b2e]">{error}</p>}

      {items && items.length > 0 && (niveaux.length > 1 || types.length > 1) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {niveaux.length > 1 && niveaux.map((n) => <Chip key={n} on={niveau === n} onClick={() => setNiveau(niveau === n ? null : n)}>{n}</Chip>)}
          {niveaux.length > 1 && types.length > 1 && <span className="mx-1 h-4 w-px bg-line" />}
          {types.length > 1 && types.map((k) => <Chip key={k} on={type === k} onClick={() => setType(type === k ? null : k)}>{TYPE[k]?.label ?? k}</Chip>)}
        </div>
      )}

      {!items ? (
        error ? null : <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-ink-faint" /></div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-[#faf9f7] px-6 py-14 text-center">
          <Inbox className="h-7 w-7 text-ink-faint" />
          <p className="mt-3 text-[14px] font-medium text-ink">
            {statut === 'a_valider' ? 'Rien à valider pour l’instant' : statut === 'publies' ? 'Aucun contenu publié depuis cet espace' : 'Aucun brouillon rejeté'}
          </p>
          {statut === 'a_valider' && <p className="mt-1 max-w-md text-[12.5px] text-ink-faint">Donne-moi un document (PDF ou Word) : je le prépare et il apparaît ici, prêt à relire.</p>}
        </div>
      ) : (
        <>
          {statut === 'a_valider' && (
            <p className="text-[12.5px] text-ink-soft">
              {plural(items.length, 'contenu')} en attente{prets > 0 && prets < items.length ? `, dont ${prets} sans erreur` : prets === items.length ? ', tous sans erreur' : ''}.
            </p>
          )}
          {groupes.map(([doc, liste]) => (
            <section key={doc} aria-label={doc}>
              {groupes.length > 1 || liste.length > 1 ? (
                <h3 className="mb-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-soft">
                  <FileText className="h-3.5 w-3.5 text-ink-faint" /> <span className="truncate">{doc}</span>
                  <span className="fd-nums font-normal text-ink-faint">· {liste.length}</span>
                </h3>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {liste.map((b) => <Carte key={b.id} b={b} onOpen={() => select(b.id)} />)}
              </div>
            </section>
          ))}
          {visibles.length === 0 && <p className="text-[13px] text-ink-faint">Aucun contenu avec ces filtres.</p>}
        </>
      )}
    </div>
  );
};

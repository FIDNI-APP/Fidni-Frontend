// Pilotage › IA : envoyer un document (PDF, Word, photos), l'IA prépare les fiches, l'administrateur relit
// l'aperçu (rendu du site, solutions ouvertes), demande des corrections, puis publie ou rejette.
// Même circuit que l'import fait à la main : contrôle automatique, points à vérifier, bandeau « à vérifier ».
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, Check, CheckCircle2, ChevronRight, FileText, Image as ImageIcon, Loader2, RotateCcw,
  Send, Sparkles, Upload, X,
} from 'lucide-react';
import ExerciseRenderer from '@/components/content/viewer/ExerciseRenderer';
import { LessonRenderer } from '@/components/content/viewer/LessonRenderer';
import type { FlexibleExerciseStructure } from '@/components/content/editor/FlexibleExerciseEditor';
import type { FlexibleLessonStructure } from '@/components/content/editor/FlexibleLessonEditor';
import {
  apiError, askCorrection, getJob, isRunning, listJobs, publishJob, rejectJob, retryJob, startImport,
  type IAJobDetail, type IAJobSummary, type IAStatus, type Origine,
} from '@/lib/api/iaApi';
import { checkStructureMath } from '@/lib/mathCheck';

const NIVEAUX = ['Tronc commun Sciences', '1ère Bac SM', '2ème Bac SM', '2ème Bac PC'];
const HADDAR = 'M. Haddar, professeur de mathématiques';
const DROITS: { key: string; label: string; hint: string; origine: Origine; credit?: string }[] = [
  { key: 'haddar', label: 'Document de M. Haddar', hint: 'Publié avec son accord, « Proposé par M. Haddar ».', origine: 'autorise', credit: HADDAR },
  { key: 'officiel', label: 'Sujet officiel', hint: 'Examen national, document public du ministère.', origine: 'officiel' },
  { key: 'autre', label: 'Autre auteur, avec son accord', hint: 'Son nom apparaîtra sur le contenu.', origine: 'autorise', credit: '' },
  { key: 'original', label: 'Rédigé pour Fidni', hint: 'Contenu original, sans auteur extérieur.', origine: 'original' },
];
const TYPE_LABEL: Record<string, string> = { exercice: 'Exercice', examen: 'Examen', lecon: 'Leçon', exercise: 'Exercice', exam: 'Examen', lesson: 'Leçon' };
const DIFF_LABEL: Record<string, string> = { facile: 'Facile', moyen: 'Moyen', difficile: 'Difficile' };
const STATUS: Record<IAStatus, { label: string; cls: string }> = {
  en_attente: { label: 'En attente', cls: 'bg-[#f2f1ee] text-ink-soft' },
  en_cours: { label: 'L’IA travaille', cls: 'bg-[#f2f1ee] text-ink-soft' },
  pret: { label: 'À relire', cls: 'bg-gold-soft text-gold-strong' },
  erreur: { label: 'Erreur', cls: 'bg-[#fbecea] text-[#a23b34]' },
  publie: { label: 'Publié', cls: 'bg-brand-soft text-brand-hover' },
  applique: { label: 'Appliqué', cls: 'bg-brand-soft text-brand-hover' },
  rejete: { label: 'Rejeté', cls: 'bg-[#f2f1ee] text-ink-faint' },
};
const SECTION_URL: Record<string, string> = { exercise: 'exercises', exam: 'exams', lesson: 'lessons' };
const ACCEPT = '.pdf,.docx,.png,.jpg,.jpeg,.webp';

function ago(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'à l’instant';
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export const StatusPill: React.FC<{ status: IAStatus }> = ({ status }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${STATUS[status].cls}`}>
    {isRunning(status) && <Loader2 className="h-3 w-3 animate-spin" />}{STATUS[status].label}
  </span>
);

/* ───────────────────────────── Envoi ───────────────────────────── */

const NewImport: React.FC<{ onStarted: (id: number) => void }> = ({ onStarted }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [droits, setDroits] = useState('haddar');
  const [credit, setCredit] = useState('');
  const [niveau, setNiveau] = useState('');
  const [type, setType] = useState('');
  const [consignes, setConsignes] = useState('');
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const d = DROITS.find((x) => x.key === droits)!;

  const add = (list: FileList | null) => {
    if (!list) return;
    const picked = Array.from(list);
    const doc = picked.find((f) => /\.(pdf|docx)$/i.test(f.name));
    setFiles(doc ? [doc] : [...files.filter((f) => !/\.(pdf|docx)$/i.test(f.name)), ...picked].slice(0, 10));
    setError(null);
  };

  const submit = async () => {
    if (!files.length) { setError('Choisir un document.'); return; }
    if (d.key === 'autre' && !credit.trim()) { setError('Indiquer le nom de l’auteur.'); return; }
    const form = new FormData();
    files.forEach((f) => form.append('fichiers', f));
    form.append('origine', d.origine);
    form.append('credit', d.key === 'autre' ? credit.trim() : d.credit ?? '');
    form.append('niveau', niveau);
    form.append('type', type);
    form.append('consignes', consignes);
    setBusy(true);
    setError(null);
    try {
      const job = await startImport(form);
      setFiles([]); setConsignes('');
      onStarted(job.id);
    } catch (e) {
      setError(apiError(e, 'L’envoi a échoué.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="fd-card p-5" aria-labelledby="ia-nouveau">
      <h2 id="ia-nouveau" className="fd-display flex items-center gap-2 text-[16px] text-ink"><Sparkles className="h-4 w-4 text-ink-soft" /> Nouveau document</h2>
      <p className="mt-0.5 text-[12.5px] text-ink-faint">L’IA recopie l’énoncé, rédige les solutions et prépare les fiches. Rien n’est publié avant ta relecture.</p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
        onClick={() => input.current?.click()} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current?.click(); } }}
        className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-7 text-center transition-colors ${drag ? 'border-brand bg-brand-soft' : 'border-line bg-[#faf9f7] hover:border-ink-faint'}`}>
        <Upload className="h-6 w-6 text-ink-faint" />
        <p className="mt-2 text-[13.5px] font-medium text-ink">Dépose le document ici, ou clique pour le choisir</p>
        <p className="mt-0.5 text-[12px] text-ink-faint">Un PDF ou un Word (.docx), ou jusqu’à 10 photos dans l’ordre des pages</p>
        <input ref={input} type="file" accept={ACCEPT} multiple className="hidden" onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      </div>
      {files.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <li key={f.name + i} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1 text-[12.5px] text-ink">
              {/\.(pdf|docx)$/i.test(f.name) ? <FileText className="h-3.5 w-3.5 text-ink-faint" /> : <ImageIcon className="h-3.5 w-3.5 text-ink-faint" />}
              <span className="max-w-[16rem] truncate">{f.name}</span>
              <span className="fd-nums text-ink-faint">{(f.size / 1024 / 1024).toFixed(1)} Mo</span>
              <button type="button" aria-label={`Retirer ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-ink-faint hover:text-ink"><X className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      )}

      <fieldset className="mt-5">
        <legend className="text-[12.5px] font-semibold text-ink">D’où vient ce document ?</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {DROITS.map((x) => (
            <label key={x.key} className={`flex cursor-pointer gap-2.5 rounded-xl border px-3 py-2.5 transition-colors ${droits === x.key ? 'border-brand bg-brand-soft/60' : 'border-line bg-white hover:border-ink-faint'}`}>
              <input type="radio" name="droits" className="mt-0.5 accent-[#1a7a4a]" checked={droits === x.key} onChange={() => setDroits(x.key)} />
              <span><span className="block text-[13px] font-medium text-ink">{x.label}</span><span className="block text-[11.5px] text-ink-faint">{x.hint}</span></span>
            </label>
          ))}
        </div>
        {droits === 'autre' && (
          <input value={credit} onChange={(e) => setCredit(e.target.value)} maxLength={120} placeholder="Ex. M. Hafidi, professeur de mathématiques"
            className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-2 text-[13px] focus:border-brand focus:outline-none" aria-label="Auteur du document" />
        )}
      </fieldset>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-[12.5px] font-semibold text-ink">Niveau
          <select value={niveau} onChange={(e) => setNiveau(e.target.value)} className="mt-1 block w-full rounded-xl border border-line bg-white px-3 py-2 text-[13px] font-normal">
            <option value="">Lu dans le document</option>
            {NIVEAUX.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="text-[12.5px] font-semibold text-ink">Type
          <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 block w-full rounded-xl border border-line bg-white px-3 py-2 text-[13px] font-normal">
            <option value="">Déduit du document</option>
            <option value="exercice">Série d’exercices (une fiche par exercice)</option>
            <option value="examen">Devoir ou examen (une seule fiche)</option>
            <option value="lecon">Cours (une fiche par chapitre)</option>
          </select>
        </label>
      </div>
      <label className="mt-3 block text-[12.5px] font-semibold text-ink">Consignes pour l’IA <span className="font-normal text-ink-faint">(facultatif)</span>
        <textarea value={consignes} onChange={(e) => setConsignes(e.target.value)} rows={2} maxLength={4000}
          placeholder="Ex. Ne garder que les exercices 2 et 3. Le corrigé est à la fin du document."
          className="mt-1 block w-full resize-y rounded-xl border border-line bg-white px-3 py-2 text-[13px] font-normal focus:border-brand focus:outline-none" />
      </label>

      {error && <p role="alert" className="mt-3 text-[13px] text-[#9c3b2e]">{error}</p>}
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[11.5px] text-ink-faint">Compter quelques minutes : lecture, rédaction, contrôle, relecture.</p>
        <button type="button" onClick={submit} disabled={busy || !files.length}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-[13.5px] font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Lancer l’IA
        </button>
      </div>
    </section>
  );
};

/* ───────────────────────────── Relecture d'un brouillon ───────────────────────────── */

const Note: React.FC<{ tone: 'red' | 'gold' | 'gray'; children: React.ReactNode }> = ({ tone, children }) => (
  <li className="flex gap-2 text-[13px] leading-snug">
    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${tone === 'red' ? 'bg-[#a23b34]' : tone === 'gold' ? 'bg-gold' : 'bg-ink-faint'}`} />
    <span className="min-w-0 text-ink-soft">{children}</span>
  </li>
);

export const Running: React.FC<{ job: IAJobSummary }> = ({ job }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-line bg-[#faf9f7] px-4 py-4">
    <Loader2 className="h-5 w-5 shrink-0 animate-spin text-brand" />
    <div>
      <p className="text-[13.5px] font-medium text-ink">{job.etape || 'En attente'}</p>
      <p className="text-[12px] text-ink-faint">Tu peux quitter la page : le travail continue sur le serveur.</p>
    </div>
  </div>
);

const JobDetail: React.FC<{ id: number; onBack: () => void; onChanged: () => void }> = ({ id, onBack, onChanged }) => {
  const [job, setJob] = useState<IAJobDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [aVerifier, setAVerifier] = useState(true);
  const [doublonOk, setDoublonOk] = useState(false);
  const [shown, setShown] = useState(0);

  const load = useCallback(async () => {
    try {
      const j = await getJob(id);
      setJob(j);
      setError(null);
      return j;
    } catch (e) {
      setError(apiError(e, 'Impossible de charger ce travail.'));
      return null;
    }
  }, [id]);

  useEffect(() => { load().then((j) => { if (j) setAVerifier(!(j.solutions_du_document && j.options.credit === HADDAR)); }); }, [load]);
  useEffect(() => {
    if (!job || !isRunning(job.status)) return undefined;
    const t = window.setInterval(async () => { const j = await load(); if (j && !isRunning(j.status)) onChanged(); }, 4000);
    return () => window.clearInterval(t);
  }, [job, load, onChanged]);

  const math = useMemo(() => (job?.apercus ?? []).map((a) => checkStructureMath(a.structure)), [job?.apercus]);

  const act = async (fn: () => Promise<unknown>, fallback: string) => {
    setBusy(true);
    setError(null);
    try { await fn(); await load(); onChanged(); } catch (e) { setError(apiError(e, fallback)); } finally { setBusy(false); }
  };

  if (!job) {
    return error ? <p role="alert" className="text-[13px] text-[#9c3b2e]">{error}</p>
      : <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-ink-faint" /></div>;
  }

  const controles = job.controles ?? [];
  const erreurs = [...(job.erreurs_figures ?? []), ...controles.flatMap((c, i) => c.erreurs.map((e) => (controles.length > 1 ? `Fiche ${i + 1} — ${e}` : e)))];
  const doublons = controles.flatMap((c) => c.doublons);
  const mathErrors = math.flat();
  const avert = [...(job.avertissements ?? []), ...controles.flatMap((c) => c.avertissements)];
  const problemes = job.problemes ?? [];
  const doutes = job.doutes ?? [];
  const nbPoints = erreurs.length + mathErrors.length + doublons.length + problemes.length + doutes.length + avert.length;
  const bloque = erreurs.length > 0 || mathErrors.length > 0;
  const apercu = job.apercus?.[Math.min(shown, (job.apercus?.length ?? 1) - 1)];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] text-ink-soft hover:bg-[#f2f1ee] hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Tous les documents
        </button>
        <span className="text-ink-faint">·</span>
        <span className="min-w-0 truncate text-[13.5px] font-semibold text-ink">{job.document || `Travail ${job.id}`}</span>
        <StatusPill status={job.status} />
      </div>

      {error && <p role="alert" className="rounded-xl border border-[#f0d4cf] bg-[#fbf1ef] px-4 py-3 text-[13px] text-[#9c3b2e] whitespace-pre-line">{error}</p>}
      {isRunning(job.status) && <Running job={job} />}
      {job.error && (
        <div className="rounded-2xl border border-[#f0d4cf] bg-[#fbf1ef] px-4 py-3">
          <p className="text-[13px] text-[#9c3b2e] whitespace-pre-line">{job.error}</p>
          {job.status === 'erreur' && (
            <div className="mt-3 flex gap-2">
              <button type="button" disabled={busy} onClick={() => act(() => retryJob(job.id), 'La relance a échoué.')}
                className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1.5 text-[12.5px] font-medium text-ink hover:border-ink"><RotateCcw className="h-3.5 w-3.5" /> Relancer</button>
              <button type="button" disabled={busy} onClick={() => act(() => rejectJob(job.id), 'Échec.')}
                className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1.5 text-[12.5px] font-medium text-ink-soft hover:border-ink"><X className="h-3.5 w-3.5" /> Abandonner</button>
            </div>
          )}
        </div>
      )}

      {job.status === 'publie' && (
        <div className="rounded-2xl border border-brand-line bg-brand-soft px-4 py-3">
          <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-brand-hover"><CheckCircle2 className="h-4 w-4" /> Publié</p>
          <ul className="mt-1.5 space-y-1">
            {(job.publies ?? []).map((p) => (
              <li key={p.id}><Link to={`/${SECTION_URL[p.type] ?? 'exercises'}/${p.id}`} className="text-[13px] text-ink underline-offset-2 hover:underline">{p.titre}</Link></li>
            ))}
          </ul>
        </div>
      )}

      {(job.apercus?.length ?? 0) > 0 && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-3">
            {(job.apercus?.length ?? 0) > 1 && (
              <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Fiches">
                {job.apercus!.map((a, i) => (
                  <button key={a.cle} type="button" role="tab" aria-selected={shown === i} onClick={() => setShown(i)}
                    className={`max-w-[15rem] truncate rounded-lg border px-2.5 py-1 text-[12.5px] ${shown === i ? 'border-ink bg-white text-ink' : 'border-line bg-[#faf9f7] text-ink-soft hover:text-ink'}`}>
                    {i + 1}. {a.titre}{math[i]?.length || controles[i]?.erreurs.length ? ' ⚠' : ''}
                  </button>
                ))}
              </div>
            )}
            {apercu && (
              <article className="rounded-2xl border border-line bg-white p-5 sm:p-6">
                <p className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint">
                  {TYPE_LABEL[apercu.type ?? ''] ?? 'Fiche'} · {(apercu.niveaux ?? []).join(', ')}{apercu.difficulte ? ` · ${DIFF_LABEL[apercu.difficulte] ?? apercu.difficulte}` : ''}
                  {apercu.examen?.duree_minutes ? ` · ${apercu.examen.duree_minutes} min` : ''}
                </p>
                <h3 className="fd-display mt-1 text-[22px] leading-tight text-ink">{apercu.titre}</h3>
                <p className="mt-1 text-[12px] text-ink-faint">
                  {(apercu.chapitres ?? []).join(' · ')}{apercu.theoremes?.length ? ` — ${apercu.theoremes.join(', ')}` : ''}
                  <span className="ml-1 font-mono text-[11px]">({apercu.cle})</span>
                </p>
                <div className="mt-5">
                  {apercu.erreur || !apercu.structure ? (
                    <p className="text-[13px] text-[#9c3b2e]">Aperçu impossible : {apercu.erreur}</p>
                  ) : apercu.type === 'lesson' ? (
                    <LessonRenderer structure={apercu.structure as FlexibleLessonStructure} />
                  ) : (
                    <ExerciseRenderer structure={apercu.structure as FlexibleExerciseStructure} showAllSolutions interactive={false} compact={false} />
                  )}
                </div>
              </article>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <section className="fd-card p-4" aria-labelledby="ia-points">
              <h3 id="ia-points" className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink">
                <AlertTriangle className="h-4 w-4 text-gold-strong" /> Points à vérifier
                <span className="fd-nums ml-auto text-[12px] font-normal text-ink-faint">{nbPoints}</span>
              </h3>
              {nbPoints === 0 ? <p className="mt-2 text-[12.5px] text-ink-faint">Rien de signalé. Relis quand même l’énoncé face au document.</p> : (
                <ul className="mt-2.5 space-y-2">
                  {erreurs.map((e) => <Note key={e} tone="red">{e}</Note>)}
                  {mathErrors.map((m, i) => <Note key={`m${i}`} tone="red">{m.where} : formule invalide <code className="break-all text-[11.5px]">{m.tex}</code> — {m.message}</Note>)}
                  {doublons.map((e) => <Note key={e} tone="gold">{e}</Note>)}
                  {problemes.map((p, i) => <Note key={`p${i}`} tone={p.gravite === 'a_verifier' ? 'gold' : 'gray'}>{p.ou ? <strong className="font-medium text-ink">{p.ou} : </strong> : null}{p.gravite === 'corrige' ? 'corrigé à la relecture — ' : ''}{p.description}</Note>)}
                  {doutes.map((d, i) => <Note key={`d${i}`} tone="gold">{d}</Note>)}
                  {avert.map((a) => <Note key={a} tone="gray">{a}</Note>)}
                </ul>
              )}
            </section>

            {job.status === 'pret' && (
              <>
                <section className="fd-card p-4">
                  <h3 className="text-[13.5px] font-semibold text-ink">Demander une correction</h3>
                  <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={3} maxLength={4000}
                    placeholder="Ex. Question 2 : c’est x³ et non x². Détaille davantage la limite en +∞."
                    className="mt-2 block w-full resize-y rounded-xl border border-line bg-white px-3 py-2 text-[13px] focus:border-brand focus:outline-none" />
                  <button type="button" disabled={busy || !instruction.trim()}
                    onClick={() => act(async () => { await askCorrection(job.id, instruction.trim()); setInstruction(''); }, 'La demande a échoué.')}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-[12.5px] font-medium text-ink hover:border-ink disabled:opacity-50">
                    <Send className="h-3.5 w-3.5" /> Envoyer à l’IA
                  </button>
                </section>

                <section className="fd-card p-4">
                  <h3 className="text-[13.5px] font-semibold text-ink">Publier</h3>
                  <label className="mt-2 flex gap-2 text-[12.5px] text-ink-soft">
                    <input type="checkbox" className="mt-0.5 accent-[#1a7a4a]" checked={aVerifier} onChange={(e) => setAVerifier(e.target.checked)} />
                    <span>Bandeau « correction en cours de vérification » <span className="text-ink-faint">(à retirer après relecture des solutions)</span></span>
                  </label>
                  {doublons.length > 0 && (
                    <label className="mt-2 flex gap-2 text-[12.5px] text-ink-soft">
                      <input type="checkbox" className="mt-0.5 accent-[#1a7a4a]" checked={doublonOk} onChange={(e) => setDoublonOk(e.target.checked)} />
                      <span>C’est bien un nouveau contenu, pas un doublon</span>
                    </label>
                  )}
                  {bloque && <p className="mt-2 text-[12px] text-[#9c3b2e]">Corriger d’abord les erreurs en rouge (demande à l’IA).</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" disabled={busy || bloque || (doublons.length > 0 && !doublonOk)}
                      onClick={() => act(() => publishJob(job.id, { a_verifier: aVerifier, doublon_ok: doublonOk }), 'La publication a échoué.')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
                      <Check className="h-4 w-4" /> Publier {(job.apercus?.length ?? 0) > 1 ? `les ${job.apercus!.length} fiches` : ''}
                    </button>
                    <button type="button" disabled={busy} onClick={() => { if (window.confirm('Rejeter ce brouillon ? Le document envoyé sera effacé.')) act(() => rejectJob(job.id), 'Échec.'); }}
                      className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1.5 text-[12.5px] font-medium text-ink-soft hover:border-ink">
                      <X className="h-3.5 w-3.5" /> Rejeter
                    </button>
                  </div>
                </section>
              </>
            )}

            {job.history.length > 0 && (
              <section className="px-1">
                <h3 className="text-[12px] font-semibold uppercase tracking-[.06em] text-ink-faint">Historique</h3>
                <ul className="mt-1.5 space-y-1 text-[12px] text-ink-soft">
                  {job.history.map((h, i) => <li key={i}><span className="text-ink-faint">{ago(h.date)} · {h.qui === 'ia' ? 'IA' : h.qui} :</span> {h.texte}</li>)}
                </ul>
              </section>
            )}
          </aside>
        </div>
      )}
    </div>
  );
};

/* ───────────────────────────── Onglet ───────────────────────────── */

export const IATab: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const selected = Number(params.get('travail')) || null;
  const [jobs, setJobs] = useState<IAJobSummary[] | null>(null);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const select = (id: number | null) => setParams((p) => {
    const n = new URLSearchParams(p);
    if (id) n.set('travail', String(id)); else n.delete('travail');
    return n;
  });

  const load = useCallback(async () => {
    try {
      const r = await listJobs('import');
      setJobs(r.results);
      setConfigured(r.configuree);
      setError(null);
    } catch {
      setError('Impossible de charger les travaux de l’IA.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!jobs?.some((j) => isRunning(j.status)) || selected) return undefined;
    const t = window.setInterval(load, 5000);
    return () => window.clearInterval(t);
  }, [jobs, selected, load]);

  if (selected) return <JobDetail id={selected} onBack={() => select(null)} onChanged={load} />;

  const active = (jobs ?? []).filter((j) => ['en_attente', 'en_cours', 'pret', 'erreur'].includes(j.status));
  const done = (jobs ?? []).filter((j) => !active.includes(j));

  return (
    <div className="space-y-4">
      {!configured && (
        <p className="rounded-xl border border-gold-line bg-gold-soft px-4 py-3 text-[13px] text-gold-strong">
          L’IA n’est pas configurée sur le serveur (clé de l’API Anthropic absente).
        </p>
      )}
      {error && <p role="alert" className="text-[13px] text-[#9c3b2e]">{error}</p>}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <NewImport onStarted={(id) => { load(); select(id); }} />
        <section className="fd-card p-5" aria-labelledby="ia-travaux">
          <h2 id="ia-travaux" className="fd-display text-[16px] text-ink">Documents envoyés</h2>
          {!jobs ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-ink-faint" /></div>
            : jobs.length === 0 ? <p className="mt-2 text-[13px] text-ink-faint">Aucun document pour l’instant.</p> : (
              <>
                {[{ title: 'En cours', list: active }, { title: 'Terminés', list: done }].filter((g) => g.list.length).map((g) => (
                  <div key={g.title} className="mt-3">
                    <h3 className="text-[11.5px] font-semibold uppercase tracking-[.06em] text-ink-faint">{g.title}</h3>
                    <ul className="mt-1 divide-y divide-[#f2f1ee]">
                      {g.list.map((j) => (
                        <li key={j.id}>
                          <button type="button" onClick={() => select(j.id)} className="group flex w-full items-center gap-3 py-2.5 text-left">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13.5px] font-medium text-ink group-hover:text-brand">
                                {j.fiches?.length ? j.fiches.map((f) => f.titre).join(' · ') : j.document || `Travail ${j.id}`}
                              </p>
                              <p className="truncate text-[11.5px] text-ink-faint">
                                {j.document} · {ago(j.created_at)}{j.status === 'pret' && j.nb_doutes ? ` · ${j.nb_doutes} point${j.nb_doutes > 1 ? 's' : ''} à vérifier` : ''}
                                {isRunning(j.status) && j.etape ? ` · ${j.etape}` : ''}
                              </p>
                            </div>
                            <StatusPill status={j.status} />
                            <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </>
            )}
        </section>
      </div>
    </div>
  );
};

export default IATab;

// Pilotage › Signalements › « Corriger avec l'IA » : l'IA vérifie le signalement et propose la correction
// minimale (avant / après, rendue comme sur le site). Rien ne change sur le site avant « Appliquer ».
// 18/10/2026 : « Prévenir l'élève avec l'explication de l'IA » (coché par défaut) — la correction et la réponse
// partent en une seule action (POST …/appliquer/ {prevenir, reponse}).
import React, { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import { MathText } from '@/components/skilliq/MathText';
import {
  apiError, applyJob, fixReport, getJob, isRunning, lastReportJob, rejectJob, type IAJobDetail,
} from '@/lib/api/iaApi';
import { checkHtmlMath } from '@/lib/mathCheck';
import { texteDepuisHtml } from '@/lib/texteMath';
import { Running, StatusPill } from './IATab';

const VERDICT = {
  oui: { label: 'Erreur confirmée', cls: 'bg-[#fbecea] text-[#a23b34]' },
  non: { label: 'Pas d’erreur selon l’IA', cls: 'bg-brand-soft text-brand-hover' },
  incertain: { label: 'À trancher', cls: 'bg-gold-soft text-gold-strong' },
} as const;
const CHAMP = { content: 'Énoncé', solution: 'Solution' } as const;

export const IAReportFix: React.FC<{
  reportId: number;
  /** L'élève existe encore (compte non supprimé) : on peut le prévenir. */
  canNotify?: boolean;
  /** Message envoyé à l'élève à partir de l'explication de l'IA (bonjour, explication, formule de fin). */
  replyFromAi?: (explication: string) => string;
  /** notified : l'élève a déjà reçu la réponse avec la correction. */
  onDone: (dismiss?: boolean, notified?: boolean) => void;
}> = ({ reportId, canNotify = false, replyFromAi, onDone }) => {
  const [job, setJob] = useState<IAJobDetail | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instruction, setInstruction] = useState('');
  const [notify, setNotify] = useState(true);

  const refresh = useCallback(async (id?: number) => {
    const j = id ? await getJob(id) : await lastReportJob(reportId);
    setJob(j);
    return j;
  }, [reportId]);

  // Ouverture : reprendre la dernière proposition, sinon en demander une.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const last = await lastReportJob(reportId);
        if (!alive) return;
        if (last && !['rejete', 'applique'].includes(last.status)) { setJob(last); return; }
        const started = await fixReport(reportId);
        if (alive) await refresh(started.id);
      } catch (e) {
        if (alive) { setError(apiError(e, 'L’IA n’a pas pu être lancée.')); setJob(null); }
      }
    })();
    return () => { alive = false; };
  }, [reportId, refresh]);

  useEffect(() => {
    if (!job || !isRunning(job.status)) return undefined;
    const t = window.setInterval(() => { refresh(job.id).catch(() => undefined); }, 4000);
    return () => window.clearInterval(t);
  }, [job, refresh]);

  const act = async (fn: () => Promise<unknown>, fallback: string) => {
    setBusy(true);
    setError(null);
    try { await fn(); } catch (e) { setError(apiError(e, fallback)); } finally { setBusy(false); }
  };

  const again = () => act(async () => {
    if (job?.status === 'pret') await rejectJob(job.id); // l'ancienne proposition est remplacée
    const started = await fixReport(reportId, instruction.trim() || undefined);
    setInstruction('');
    await refresh(started.id);
  }, 'L’IA n’a pas pu être relancée.');

  if (job === undefined) {
    return <div className="flex items-center gap-2 py-3 text-[12.5px] text-ink-faint"><Loader2 className="h-4 w-4 animate-spin" /> Lancement de l’IA…</div>;
  }

  const modifs = job?.modifications ?? [];
  const mathErrors = modifs.flatMap((m) => checkHtmlMath(m.apres, m.ou || m.bloc));
  const explication = job?.explication?.trim() ?? '';
  const sendAi = canNotify && notify && !!explication;
  const message = explication ? (replyFromAi ? replyFromAi(explication) : texteDepuisHtml(explication)) : '';

  const apply = () => act(async () => {
    if (!job) return;
    const done = await applyJob(job.id, sendAi ? { prevenir: true, reponse: message } : undefined);
    onDone(false, sendAi && !!done.notified);
  }, 'L’application a échoué.');

  return (
    <div className="mt-3 rounded-2xl border border-line bg-[#faf9f7] p-4">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-ink-soft" />
        <span className="text-[13px] font-semibold text-ink">Correction proposée par l’IA</span>
        {job && <StatusPill status={job.status} />}
        <button type="button" onClick={() => onDone()} aria-label="Fermer" className="ms-auto text-ink-faint hover:text-ink"><X className="h-4 w-4" /></button>
      </div>

      {error && <p role="alert" className="mb-2 text-[12.5px] text-[#9c3b2e] whitespace-pre-line">{error}</p>}
      {job && isRunning(job.status) && <Running job={job} />}
      {job?.status === 'erreur' && <p className="text-[12.5px] text-[#9c3b2e]">{job.error}</p>}

      {job?.status === 'pret' && (
        <div className="space-y-3">
          <div>
            {job.fonde && <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${VERDICT[job.fonde].cls}`}>{VERDICT[job.fonde].label}</span>}
            {explication && <MathText text={texteDepuisHtml(explication)} className="mt-1.5 block whitespace-pre-line break-words text-[13px] leading-relaxed text-ink-soft" />}
            {(job.doutes ?? []).map((d, i) => <p key={i} className="mt-1 text-[12.5px] text-gold-strong">⚠ {d}</p>)}
            {(job.erreurs ?? []).map((d, i) => <p key={`e${i}`} className="mt-1 text-[12.5px] text-[#9c3b2e]">{d}</p>)}
            {mathErrors.map((m, i) => <p key={`m${i}`} className="mt-1 text-[12.5px] text-[#9c3b2e]">{m.where} : formule invalide <code>{m.tex}</code> — {m.message}</p>)}
          </div>

          {modifs.map((m, i) => (
            <div key={i}>
              <p className="text-[12px] font-semibold text-ink">{m.ou || m.bloc} · {CHAMP[m.champ]}</p>
              <div className="mt-1.5 grid gap-2 md:grid-cols-2">
                <div className="min-w-0 rounded-xl border border-line bg-white p-3">
                  <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[.08em] text-ink-faint">Avant</p>
                  {m.avant ? <TipTapRenderer content={m.avant} className="text-[13.5px]" /> : <p className="text-[12.5px] italic text-ink-faint">(vide)</p>}
                </div>
                <div className="min-w-0 rounded-xl border border-brand-line bg-white p-3">
                  <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[.08em] text-brand-hover">Après</p>
                  <TipTapRenderer content={m.apres} className="text-[13.5px]" />
                </div>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
            {modifs.length > 0 ? (
              <>
                {canNotify && explication && (
                  <div className="w-full">
                    <label className="flex items-center gap-2 text-[12.5px] text-ink">
                      <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4 accent-[#1a7a4a]" />
                      Prévenir l’élève avec l’explication de l’IA
                    </label>
                    {notify && (
                      <details className="mt-1 ps-6 text-[12px] text-ink-faint">
                        <summary className="cursor-pointer hover:text-ink">Voir le message envoyé</summary>
                        <MathText text={message} className="mt-1 block max-h-60 overflow-y-auto whitespace-pre-line break-words rounded-xl border-s-2 border-brand bg-white px-3 py-2 text-[12.5px] leading-relaxed text-ink" />
                      </details>
                    )}
                  </div>
                )}
                <button type="button" disabled={busy || mathErrors.length > 0 || (job.erreurs ?? []).length > 0}
                  onClick={apply}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
                  <Check className="h-3.5 w-3.5" /> {sendAi ? 'Appliquer, classer « Corrigé » et prévenir' : 'Appliquer et classer « Corrigé »'}
                </button>
              </>
            ) : job.fonde === 'non' ? (
              <button type="button" disabled={busy} onClick={() => act(async () => { await rejectJob(job.id); onDone(true); }, 'Échec.')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-[12.5px] font-medium text-ink hover:border-ink">
                <Check className="h-3.5 w-3.5" /> Classer sans suite
              </button>
            ) : null}
            <button type="button" disabled={busy} onClick={() => act(async () => { await rejectJob(job.id); onDone(); }, 'Échec.')}
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1.5 text-[12.5px] font-medium text-ink-soft hover:border-ink">
              <X className="h-3.5 w-3.5" /> Rejeter la proposition
            </button>
          </div>
        </div>
      )}

      {job && !isRunning(job.status) && (
        <div className="mt-3 flex gap-2">
          <input value={instruction} onChange={(e) => setInstruction(e.target.value)} maxLength={4000}
            placeholder={job.status === 'pret' ? 'Pas d’accord ? Précise à l’IA ce qui ne va pas…' : 'Consigne pour l’IA (facultatif)'}
            className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-1.5 text-[12.5px] focus:border-brand focus:outline-none" />
          <button type="button" disabled={busy} onClick={again}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line bg-white px-3 py-1.5 text-[12.5px] font-medium text-ink hover:border-ink disabled:opacity-50">
            {instruction.trim() ? <Send className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />} Redemander
          </button>
        </div>
      )}
    </div>
  );
};

export default IAReportFix;

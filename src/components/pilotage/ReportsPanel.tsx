// Pilotage › Signalements : les erreurs signalées par les élèves, à corriger puis classer ; en classant, on peut
// répondre à l'élève (texte libre, prérempli) : la réponse arrive dans sa cloche (11/10/2026).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Flag, Loader2, MessageSquareReply, RotateCcw, Sparkles, X } from 'lucide-react';
import { listReports, updateReport, type ContentReportRow, type ReportStatus } from '@/lib/api/reportApi';
import { IAReportFix } from './IAReportFix';

const TABS: { value: ReportStatus; label: string }[] = [
  { value: 'open', label: 'À traiter' },
  { value: 'resolved', label: 'Corrigés' },
  { value: 'dismissed', label: 'Sans suite' },
];
const TYPE_LABEL: Record<string, string> = { exercise: 'Exercice', exam: 'Examen', lesson: 'Leçon' };

function ago(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `il y a ${Math.max(1, Math.floor(s / 60))} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  if (d < 31) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Réponse proposée, modifiable avant l'envoi. */
const template = (r: ContentReportRow, status: ReportStatus) => {
  const hello = r.user ? `Bonjour ${r.user} !` : 'Bonjour !';
  return status === 'resolved'
    ? `${hello} Merci pour ton signalement sur « ${r.content.title} » : c’est corrigé. Bonne révision !`
    : `${hello} Merci pour ton signalement sur « ${r.content.title} ». Après vérification, `;
};

/** Classer un signalement et répondre à l'élève (notification de la cloche). */
const ReplyModal: React.FC<{
  row: ContentReportRow; status: ReportStatus; onClose: () => void;
  onSubmit: (status: ReportStatus, reply: { reponse: string; prevenir: boolean }) => Promise<void>;
}> = ({ row, status: initial, onClose, onSubmit }) => {
  const [status, setStatus] = useState<ReportStatus>(initial);
  const [text, setText] = useState(() => row.response || template(row, initial));
  const [notify, setNotify] = useState(!!row.user);
  const [sending, setSending] = useState(false);
  const edited = useRef(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const choose = (next: ReportStatus) => {
    setStatus(next);
    if (!edited.current) setText(template(row, next));
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try { await onSubmit(status, { reponse: notify ? text.trim() : '', prevenir: notify }); } finally { setSending(false); }
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(20,18,16,.4)] p-4 [align-items:safe_center]" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="reply-title"
        className="w-full max-w-lg rounded-2xl border border-line bg-white p-5 shadow-[0_20px_50px_rgba(20,18,16,.22)]">
        <h3 id="reply-title" className="fd-display text-[19px] text-ink">Classer et répondre</h3>
        <p className="mt-1 text-[12.5px] text-ink-faint">
          {reasonLabel(row)} · « {row.content.title} » · {row.user ?? 'compte supprimé'}
        </p>
        {row.description && <p className="mt-2 rounded-xl bg-[#f7f6f3] px-3 py-2 text-[12.5px] text-ink-soft whitespace-pre-line">{row.description}</p>}
        <div className="mt-4 inline-flex rounded-xl border border-line bg-[#faf9f7] p-0.5" role="radiogroup" aria-label="Statut">
          {(['resolved', 'dismissed'] as const).map((s) => (
            <button key={s} type="button" role="radio" aria-checked={status === s} onClick={() => choose(s)}
              className={`rounded-[10px] px-3 py-1.5 text-[12.5px] font-medium transition-colors ${status === s ? 'bg-white text-ink shadow-sm' : 'text-ink-faint hover:text-ink'}`}>
              {s === 'resolved' ? 'Corrigé' : 'Sans suite'}
            </button>
          ))}
        </div>
        <label className="mt-4 flex items-center gap-2 text-[13px] text-ink">
          <input type="checkbox" checked={notify} disabled={!row.user} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4 accent-[#1a7a4a]" />
          Prévenir l’élève avec ce message (notification)
        </label>
        <textarea value={text} onChange={(e) => { edited.current = true; setText(e.target.value); }} disabled={!notify}
          rows={5} maxLength={2000} aria-label="Réponse à l’élève"
          className="mt-2 w-full resize-y rounded-xl border border-line bg-white px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:bg-[#f7f6f3] disabled:text-ink-faint" />
        <p className="mt-1 text-right text-[11px] text-ink-faint fd-nums">{text.length} / 2000</p>
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="fd-btn-ghost min-h-10">Annuler</button>
          <button type="submit" disabled={sending || (notify && !text.trim())} className="fd-btn-primary min-h-10 disabled:opacity-50">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : notify ? 'Classer et envoyer' : 'Classer sans prévenir'}
          </button>
        </div>
      </form>
    </div>
  );
};

const reasonLabel = (r: ContentReportRow) =>
  r.reason === 'statement' && r.content.type === 'lesson' ? 'Erreur dans le cours' : r.reason_label;

export const ReportsPanel: React.FC<{ onOpenCountChange?: (open: number) => void }> = ({ onOpenCountChange }) => {
  const [tab, setTab] = useState<ReportStatus>('open');
  const [rows, setRows] = useState<ContentReportRow[] | null>(null);
  const [counts, setCounts] = useState<Record<ReportStatus, number> | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiFor, setAiFor] = useState<number | null>(null);
  const [replyFor, setReplyFor] = useState<{ row: ContentReportRow; status: ReportStatus } | null>(null);

  const load = useCallback(async (status: ReportStatus) => {
    setError(null);
    try {
      const data = await listReports(status);
      setRows(data.results);
      setCounts(data.counts);
      onOpenCountChange?.(data.counts.open);
    } catch {
      setError('Impossible de charger les signalements.');
    }
  }, [onOpenCountChange]);

  useEffect(() => { setRows(null); load(tab); }, [tab, load]);

  const move = async (id: number, status: ReportStatus) => {
    setBusy(id);
    try {
      await updateReport(id, status);
      await load(tab);
    } catch {
      setError('La mise à jour a échoué.');
    } finally {
      setBusy(null);
    }
  };

  const reply = async (status: ReportStatus, payload: { reponse: string; prevenir: boolean }) => {
    if (!replyFor) return;
    const id = replyFor.row.id;
    setBusy(id);
    try {
      await updateReport(id, status, payload);
      setReplyFor(null);
      await load(tab);
    } catch {
      setError('L’envoi a échoué.');
    } finally {
      setBusy(null);
    }
  };

  const open = counts?.open ?? 0;

  return (
    <section className="fd-card p-5 mb-4" aria-labelledby="pilotage-signalements">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="pilotage-signalements" className="fd-display text-[16px] text-ink flex items-center gap-2">
            <Flag className="h-4 w-4 text-ink-soft" /> Signalements d’erreurs
            {open > 0 && <span className="fd-nums rounded-full bg-gold-soft px-2 py-0.5 text-[12px] font-semibold text-gold-strong">{open} à traiter</span>}
          </h2>
          <p className="mt-0.5 text-[12px] text-ink-faint">Envoyés par les élèves depuis « Une erreur ? Signale-la ». Corrige le contenu, puis classe le signalement.</p>
        </div>
        <div role="tablist" className="inline-flex rounded-xl border border-line bg-[#faf9f7] p-0.5">
          {TABS.map((t) => (
            <button key={t.value} role="tab" aria-selected={tab === t.value} type="button" onClick={() => setTab(t.value)}
              className={`rounded-[10px] px-3 py-1.5 text-[12.5px] font-medium transition-colors ${tab === t.value ? 'bg-white text-ink shadow-sm' : 'text-ink-faint hover:text-ink'}`}>
              {t.label}{counts ? <span className="fd-nums ml-1 text-ink-faint">{counts[t.value]}</span> : null}
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="mb-3 text-[13px] text-[#9c3b2e]">{error}</p>}

      {!rows ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-ink-faint" /></div>
      ) : rows.length === 0 ? (
        <p className="py-4 text-[13px] text-ink-faint">
          {tab === 'open' ? 'Aucun signalement à traiter. Tout est en ordre.' : 'Rien ici pour l’instant.'}
        </p>
      ) : (
        <ul className="divide-y divide-[#f2f1ee]">
          {rows.map((r) => (
            <li key={r.id} className={`py-3 ${busy === r.id ? 'opacity-50' : ''}`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-[#fbecea] px-2 py-0.5 text-[11.5px] font-semibold text-[#a23b34]">{reasonLabel(r)}</span>
                  <span className="rounded-full bg-[#f2f1ee] px-2 py-0.5 text-[11px] text-ink-soft">{TYPE_LABEL[r.content.type] ?? r.content.type}</span>
                  <Link to={r.content.url} className="min-w-0 truncate text-[13.5px] font-semibold text-ink hover:text-brand">{r.content.title}</Link>
                </div>
                <p className="mt-1 text-[13px] text-ink-soft">
                  <span className="font-medium text-ink">{r.item_label || 'Tout le contenu'}</span>
                  {r.description && <> — <span className="whitespace-pre-line">{r.description}</span></>}
                </p>
                <p className="mt-0.5 text-[11.5px] text-ink-faint">
                  {r.user ? <Link to={`/profile/${r.user}`} className="hover:text-ink">{r.user}</Link> : 'Compte supprimé'} · {ago(r.created_at)}
                  {r.handled_at && <> · {r.status === 'resolved' ? 'corrigé' : 'classé'} {ago(r.handled_at)}{r.handled_by ? ` par ${r.handled_by}` : ''}</>}
                </p>
                {r.response_sent_at && (
                  <p className="mt-1.5 rounded-xl border-l-2 border-brand bg-[#f7f6f3] px-3 py-1.5 text-[12.5px] text-ink-soft whitespace-pre-line">
                    <span className="font-semibold text-ink">Réponse envoyée {ago(r.response_sent_at)} :</span> {r.response}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-1.5">
                {r.status === 'open' ? (
                  <>
                    {aiFor !== r.id && (
                      <button type="button" disabled={busy === r.id} onClick={() => setAiFor(r.id)}
                        title="L’IA vérifie le signalement et propose une correction ; rien ne change sans ton accord."
                        className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-ink hover:border-ink">
                        <Sparkles className="h-3.5 w-3.5" /> Corriger avec l’IA
                      </button>
                    )}
                    <button type="button" disabled={busy === r.id} onClick={() => setReplyFor({ row: r, status: 'resolved' })}
                      className="inline-flex items-center gap-1 rounded-lg border border-brand-line bg-brand-soft px-2.5 py-1.5 text-[12.5px] font-medium text-brand-hover hover:bg-[#dcefe3]">
                      <Check className="h-3.5 w-3.5" /> Corrigé
                    </button>
                    <button type="button" disabled={busy === r.id} onClick={() => setReplyFor({ row: r, status: 'dismissed' })}
                      className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-ink-soft hover:border-ink">
                      <X className="h-3.5 w-3.5" /> Sans suite
                    </button>
                  </>
                ) : (
                  <>
                  {!r.response_sent_at && r.user && (
                    <button type="button" disabled={busy === r.id} onClick={() => setReplyFor({ row: r, status: r.status })}
                      className="inline-flex items-center gap-1 rounded-lg border border-brand-line bg-brand-soft px-2.5 py-1.5 text-[12.5px] font-medium text-brand-hover hover:bg-[#dcefe3]">
                      <MessageSquareReply className="h-3.5 w-3.5" /> Répondre
                    </button>
                  )}
                  <button type="button" disabled={busy === r.id} onClick={() => move(r.id, 'open')}
                    className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-ink-soft hover:border-ink">
                    <RotateCcw className="h-3.5 w-3.5" /> Rouvrir
                  </button>
                  </>
                )}
              </div>
            </div>
            {aiFor === r.id && (
              <IAReportFix reportId={r.id} onDone={(dismiss) => {
                setAiFor(null);
                // Correction appliquée (corrigé) ou signalement non fondé : on propose la réponse à l'élève.
                setReplyFor({ row: r, status: dismiss ? 'dismissed' : 'resolved' });
                if (!dismiss) load(tab);
              }} />
            )}
            </li>
          ))}
        </ul>
      )}
      {replyFor && <ReplyModal row={replyFor.row} status={replyFor.status} onClose={() => setReplyFor(null)} onSubmit={reply} />}
    </section>
  );
};

export default ReportsPanel;

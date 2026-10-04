// Pilotage › Signalements : les erreurs signalées par les élèves, à corriger puis classer.
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Flag, Loader2, RotateCcw, X } from 'lucide-react';
import { listReports, updateReport, type ContentReportRow, type ReportStatus } from '@/lib/api/reportApi';

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

const reasonLabel = (r: ContentReportRow) =>
  r.reason === 'statement' && r.content.type === 'lesson' ? 'Erreur dans le cours' : r.reason_label;

export const ReportsPanel: React.FC = () => {
  const [tab, setTab] = useState<ReportStatus>('open');
  const [rows, setRows] = useState<ContentReportRow[] | null>(null);
  const [counts, setCounts] = useState<Record<ReportStatus, number> | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (status: ReportStatus) => {
    setError(null);
    try {
      const data = await listReports(status);
      setRows(data.results);
      setCounts(data.counts);
    } catch {
      setError('Impossible de charger les signalements.');
    }
  }, []);

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
            <li key={r.id} className={`flex flex-col gap-2 py-3 sm:flex-row sm:items-start ${busy === r.id ? 'opacity-50' : ''}`}>
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
              </div>
              <div className="flex shrink-0 gap-1.5">
                {r.status === 'open' ? (
                  <>
                    <button type="button" disabled={busy === r.id} onClick={() => move(r.id, 'resolved')}
                      className="inline-flex items-center gap-1 rounded-lg border border-brand-line bg-brand-soft px-2.5 py-1.5 text-[12.5px] font-medium text-brand-hover hover:bg-[#dcefe3]">
                      <Check className="h-3.5 w-3.5" /> Corrigé
                    </button>
                    <button type="button" disabled={busy === r.id} onClick={() => move(r.id, 'dismissed')}
                      className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-ink-soft hover:border-ink">
                      <X className="h-3.5 w-3.5" /> Sans suite
                    </button>
                  </>
                ) : (
                  <button type="button" disabled={busy === r.id} onClick={() => move(r.id, 'open')}
                    className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-ink-soft hover:border-ink">
                    <RotateCcw className="h-3.5 w-3.5" /> Rouvrir
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default ReportsPanel;

// « Ce jour-là » (13/10/2026) : ce que l'élève a fait un jour choisi dans le grand graphique, contenu par contenu
// (temps, questions réussies / en partie / à revoir). GET /api/stats/tableau/jour/?date=
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ClipboardList, FileText, Loader2, X } from 'lucide-react';
import { getTableauJour, type JourContenu } from '@/lib/api/tableauApi';
import { duration, longDate } from '@/pages/progression/format';
import { COULEUR } from './chart';

const ICONE = { exercise: FileText, exam: ClipboardList, lesson: BookOpen } as const;

export const Pastilles: React.FC<{ r: { reussies: number; partielles: number; ratees: number } }> = ({ r }) => (
  <span className="fd-nums inline-flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12px] text-ink-soft">
    {r.reussies > 0 && <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: COULEUR.reussies }} aria-hidden />{r.reussies} réussie{r.reussies > 1 ? 's' : ''}</span>}
    {r.partielles > 0 && <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: COULEUR.partielles }} aria-hidden />{r.partielles} en partie</span>}
    {r.ratees > 0 && <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: COULEUR.ratees }} aria-hidden />{r.ratees} à revoir</span>}
  </span>
);

export const DayPanel: React.FC<{ date: string; onClose: () => void }> = ({ date, onClose }) => {
  const [rows, setRows] = useState<JourContenu[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    setRows(null);
    setFailed(false);
    getTableauJour(date).then((r) => { if (alive) setRows(r.contenus); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [date]);

  return (
    <section aria-label={`Ce que tu as fait le ${longDate(date)}`} className="mt-5 rounded-xl border border-line bg-[#fcfbf9] p-3.5 sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-[14px] font-semibold text-ink first-letter:uppercase">{longDate(date)}</h3>
        <button type="button" onClick={onClose} aria-label="Fermer le détail du jour"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-faint hover:bg-[#f2f1ee] hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      </div>
      {failed ? <p className="text-[13px] text-ink-faint">Le détail n’a pas pu se charger.</p>
        : rows === null ? <Loader2 className="h-4 w-4 animate-spin text-ink-faint" aria-label="Chargement" />
          : rows.length === 0 ? <p className="text-[13px] text-ink-faint">Rien d’enregistré ce jour-là.</p> : (
            <ul className="divide-y divide-line">
              {rows.map((r) => {
                const Icon = ICONE[r.type] ?? FileText;
                return (
                  <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                    <Icon className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <Link to={r.url} className="block truncate text-[13.5px] font-semibold text-ink hover:underline">{r.titre}</Link>
                      {r.chapitre && <span className="block truncate text-[12px] text-ink-faint">{r.chapitre}</span>}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-7 sm:pl-0">
                      <Pastilles r={r} />
                      {r.secondes > 0 && <span className="fd-nums text-[12px] text-ink-faint">{duration(r.secondes)}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
    </section>
  );
};

export default DayPanel;

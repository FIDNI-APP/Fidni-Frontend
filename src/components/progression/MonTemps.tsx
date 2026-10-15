/**
 * « Mon temps » (13/10/2026) : où passe le temps de travail, à creuser en cliquant. Tout › un chapitre › un contenu
 * (ses jours). Le temps d'un contenu de plusieurs chapitres est partagé entre eux (rien n'est compté deux fois) :
 * c'est dit à côté du contenu. Un fil d'Ariane ramène en arrière.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BookOpen, ChevronRight, ClipboardList, FileText } from 'lucide-react';
import type { Tableau, TempsChapitre, TempsContenu } from '@/lib/api/tableauApi';
import { duration } from '@/pages/progression/format';
import { trackAction } from '@/lib/usage';
import { COULEUR, remplir } from './chart';
import { DayBars } from './DayBars';
import { t } from '@/i18n';

const ICONE = { exercise: FileText, exam: ClipboardList, lesson: BookOpen } as const;
const TYPE = { exercise: 'Exercice', exam: 'Examen', lesson: 'Leçon' } as const;

/** Une barre de temps cliquable (aussi montrée, animée, dans la fenêtre « Nouveautés » : `anime`, `delai` en ms). */
export const Barre: React.FC<{ label: React.ReactNode; sub?: React.ReactNode; secondes: number; max: number; onClick: () => void; icon?: React.ReactNode; anime?: boolean; delai?: number }> = ({
  label, sub, secondes, max, onClick, icon, anime = false, delai = 0,
}) => (
  <li>
    <button type="button" onClick={onClick} className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-start hover:bg-[#faf9f7] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
      {icon}
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="truncate text-[13.5px] font-semibold text-ink group-hover:underline">{label}</span>
          <span className="fd-nums shrink-0 text-[12.5px] font-semibold text-ink-soft">{duration(secondes)}</span>
        </span>
        <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-[#f2f1ee]">
          <span className={`block h-full rounded-full ${anime ? 'origin-left animate-etirer' : ''}`}
            style={{ width: `${Math.max(2, (secondes / max) * 100)}%`, background: COULEUR.temps, animationDelay: anime ? `${delai}ms` : undefined }} />
        </span>
        {sub && <span className="mt-1 block text-[11.5px] text-ink-faint">{sub}</span>}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
    </button>
  </li>
);

export const MonTemps: React.FC<{ data: Tableau }> = ({ data }) => {
  const [chapitreId, setChapitreId] = useState<number | null | undefined>(undefined);
  const [contenuId, setContenuId] = useState<number | null>(null);
  const chapitre: TempsChapitre | undefined = chapitreId === undefined ? undefined : data.temps.find((t) => t.id === chapitreId);
  const contenu: TempsContenu | undefined = chapitre?.contenus.find((c) => c.id === contenuId);
  const total = data.temps.reduce((s, t) => s + t.secondes, 0);
  const go = (ch: number | null | undefined, ct: number | null = null) => {
    if (ch !== undefined) trackAction('prog-temps-detail');
    setChapitreId(ch);
    setContenuId(ct);
  };

  if (!total) {
    return <p className="rounded-2xl border border-line bg-white px-5 py-6 text-[13.5px] text-ink-faint">{t('Pas de temps de travail enregistré sur cette période.')}</p>;
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <nav aria-label={t('Niveau de détail')} className="mb-3 flex flex-wrap items-center gap-1 text-[13px]">
        <button type="button" onClick={() => go(undefined)} className={`rounded-md px-1 font-semibold ${chapitre ? 'text-brand-hover hover:underline' : 'text-ink'}`}>
          {t('Tout · {duree}', { duree: duration(total) })}
        </button>
        {chapitre && <>
          <ChevronRight className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
          <button type="button" onClick={() => go(chapitre.id)} className={`max-w-[60vw] truncate rounded-md px-1 font-semibold sm:max-w-none ${contenu ? 'text-brand-hover hover:underline' : 'text-ink'}`}>
            {chapitre.nom}
          </button>
        </>}
        {contenu && <>
          <ChevronRight className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
          <span className="max-w-[60vw] truncate px-1 font-semibold text-ink sm:max-w-none">{contenu.titre}</span>
        </>}
      </nav>

      {!chapitre ? (
        <ul className="flex flex-col">
          {data.temps.map((tc) => (
            <Barre key={tc.id ?? 'autres'} label={tc.nom} secondes={tc.secondes} max={data.temps[0].secondes}
              sub={tc.contenus.length > 1
                ? t('{n} contenus · {pct} % de ton temps', { n: tc.contenus.length, pct: Math.round((tc.secondes / total) * 100) })
                : t('{n} contenu · {pct} % de ton temps', { n: tc.contenus.length, pct: Math.round((tc.secondes / total) * 100) })}
              onClick={() => go(tc.id)} />
          ))}
        </ul>
      ) : !contenu ? (
        <ul className="flex flex-col">
          {chapitre.contenus.map((c) => {
            const Icon = ICONE[c.type] ?? FileText;
            return (
              <Barre key={c.id} label={c.titre} secondes={c.secondes} max={chapitre.contenus[0].secondes}
                icon={<Icon className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />}
                sub={`${t(TYPE[c.type] ?? 'Contenu')}${c.partage > 1 ? ` · ${t('temps partagé entre {n} chapitres', { n: c.partage })}` : ''}`}
                onClick={() => go(chapitre.id, c.id)} />
            );
          })}
        </ul>
      ) : (
        <div>
          <DayBars rows={remplir(contenu.jours.map((j) => ({ date: j.date, minutes: Math.round(j.secondes / 60) })),
            data.periode.debut, data.periode.fin, data.periode.pas, ['minutes'])}
            series={[{ key: 'minutes', label: 'Minutes', color: COULEUR.temps }]} pas={data.periode.pas}
            describe={(r) => (Number(r.minutes) ? `${duration(Number(r.minutes) * 60)}` : t('Pas de travail'))}
            headline={<>{duration(contenu.jours.reduce((s, j) => s + j.secondes, 0))} <span className="text-[14px] font-semibold text-ink-faint">{t('sur ce contenu')}</span></>}
            tick={(v) => `${v}`} height={150} />
          <Link to={contenu.url} className="fd-btn-ghost mt-4 min-h-10">
            {contenu.type === 'lesson' ? t('Ouvrir la leçon') : contenu.type === 'exam' ? t('Ouvrir l’examen') : t('Ouvrir l’exercice')} <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
};

export default MonTemps;

/**
 * Page d'un chapitre : « Au programme officiel » — période, volume horaire, contenus, ce qu'il faut savoir
 * faire, théorèmes, hors programme (backend hubs.programme_public, même texte que la page pré-remplie).
 * Contenu propre à chaque chapitre : utile à l'élève, et ce qui distingue une page de chapitre d'une simple
 * liste de liens pour les moteurs de recherche.
 */
import React from 'react';
import { CalendarDays } from 'lucide-react';
import type { HubProgramme } from '@/lib/api/hubApi';
import { t } from '@/i18n';

const LISTS: [keyof HubProgramme, string][] = [
  ['contenus', 'Contenus'],
  ['capacites', 'Ce qu’il faut savoir faire'],
  ['reperes', 'Repères habituels (indicatifs)'],
  ['theoremes', 'Théorèmes et propriétés'],
  ['hors_programme', 'Hors programme'],
];

export const ChapterProgramme: React.FC<{ programme: HubProgramme; chapter: string; level: string }> = ({ programme, chapter, level }) => {
  const when = [programme.periode, programme.heures ? t('{n} h', { n: programme.heures }) : null].filter(Boolean).join(' · ');
  const lists = LISTS.filter(([key]) => (programme[key] as string[] | null)?.length);
  if (!lists.length) return null;
  return (
    <section className="mt-12 rounded-2xl border border-line bg-white p-5 sm:p-7" aria-labelledby="au-programme">
      <p className="text-[11px] font-bold uppercase tracking-[.1em] text-gold-strong">{t('Au programme officiel')}</p>
      <h2 id="au-programme" className="fd-display mt-1.5 text-[21px] leading-snug text-ink">{chapter} – {level}</h2>
      {when && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-ink-faint fd-nums">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden /> {when}
        </p>
      )}
      {programme.reperes.length > 0 && (
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-faint">
          {t('Le programme officiel de ce niveau ne donne que le titre des chapitres : voici les repères habituels de ce chapitre.')}
        </p>
      )}
      <div className="mt-5 grid gap-x-10 gap-y-6 md:grid-cols-2">
        {lists.map(([key, label]) => (
          <div key={key} className="min-w-0">
            <h3 className={`text-[13.5px] font-semibold ${key === 'hors_programme' ? 'text-[#a23b34]' : 'text-ink'}`}>{t(label)}</h3>
            <ul className="mt-2 space-y-1.5 text-[14px] leading-relaxed text-ink-soft">
              {(programme[key] as string[]).map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className={`mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full ${key === 'hors_programme' ? 'bg-[#d9a29d]' : 'bg-gold'}`} />
                  <span className="min-w-0">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ChapterProgramme;

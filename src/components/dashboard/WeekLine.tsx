// Ta semaine en une ligne (accueil, refonte du 11/10/2026) : série, questions des 7 derniers jours (écart avec
// la semaine d'avant), réussite, 7 petites cases d'activité ; un clic ouvre Ma progression pour le détail.
// Que des chiffres enregistrés (GET /api/dashboard/overview/).
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, ChevronRight, Flame, ListChecks, Target } from 'lucide-react';
import type { DashboardOverview as Overview } from '@/lib/api/dashboardApi';

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const DAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
// Une seule teinte (magnitude) : papier → vert. 0 = case vide.
const HEAT = ['#f0eee9', '#cfe6d8', '#9fcdb1', '#55a57a', '#1a7a4a'];
const heatStep = (n: number) => (n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 10 ? 3 : 4);
const s = (n: number) => (n > 1 ? 's' : '');

/** Écart avec les 7 jours précédents : flèche + chiffre (jamais la couleur seule). */
function Delta({ now, before }: { now: number; before: number }) {
  const d = now - before;
  if (d === 0) return null;
  const up = d > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 text-[12px] font-semibold ${up ? 'bg-brand-soft text-brand-hover' : 'bg-[#f2f1ee] text-ink-soft'}`}>
      {up ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> : <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />}
      <span className="fd-nums">{up ? '+' : '−'}{Math.abs(d)}</span>
      <span className="sr-only"> par rapport à la semaine d’avant</span>
    </span>
  );
}

const Item: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <span className="inline-flex min-h-7 items-center gap-1.5 whitespace-nowrap">{icon}<span>{children}</span></span>
);

export const WeekLine: React.FC<{ data: Overview }> = ({ data }) => {
  const w = data.week;
  const streak = data.streak;
  const last7 = data.calendar.slice(-7).map((d) => ({ ...d, day: new Date(`${d.date}T12:00:00`) }));
  return (
    // Toute la ligne mène à Ma progression (le détail) ; sur téléphone, deux lignes courtes et une flèche.
    <Link to="/progression" data-tour="home-stats" aria-label="Ta semaine : voir le détail dans Ma progression"
      className="group mt-5 flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-2 text-[13.5px] text-ink-soft transition-[border-color,box-shadow] hover:border-[#cfc9bf] hover:shadow-[0_6px_16px_rgba(20,18,16,.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:px-5">
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-0.5 sm:gap-x-6">
        <Item icon={<Flame className="h-4 w-4 text-gold" aria-hidden />}>
          {streak.current > 0
            ? <><b className="fd-nums text-ink">{streak.current}</b> jour{s(streak.current)} de suite</>
            : streak.best > 0 ? <>Série à relancer <span className="text-ink-faint">(record {streak.best} j)</span></>
              : 'Un exercice lance ta série'}
        </Item>
        <Item icon={<ListChecks className="h-4 w-4 text-ink-faint" aria-hidden />}>
          <b className="fd-nums text-ink">{w.questions}</b> question{s(w.questions)}<span className="hidden sm:inline"> en 7 jours</span>{' '}
          <Delta now={w.questions} before={data.previous_week.questions} />
        </Item>
        {w.success_rate !== null && (
          <Item icon={<Target className="h-4 w-4 text-ink-faint" aria-hidden />}>
            <b className="fd-nums text-ink">{w.success_rate} %</b> réussies
          </Item>
        )}
        <span className="inline-flex min-h-7 items-center gap-1" role="img"
          aria-label={`${w.active_days} jour${s(w.active_days)} actif${s(w.active_days)} sur les 7 derniers jours`}>
          {last7.map((d) => (
            <span key={d.date} className="h-3.5 w-3.5 rounded-[4px]"
              title={`${DAY_LETTERS[d.day.getDay()]} ${d.day.getDate()} ${MONTHS[d.day.getMonth()]} : ${d.count ? `${d.count} activité${s(d.count)}` : 'aucune activité'}`}
              style={{ background: HEAT[heatStep(d.count)], boxShadow: d.count ? 'none' : 'inset 0 0 0 1px #e7e3dc' }} />
          ))}
        </span>
      </span>
      <span className="inline-flex min-h-10 shrink-0 items-center gap-0.5 font-semibold text-brand-hover group-hover:underline">
        <span className="hidden sm:inline">Ma progression</span> <ChevronRight className="h-4 w-4" aria-hidden />
      </span>
    </Link>
  );
};

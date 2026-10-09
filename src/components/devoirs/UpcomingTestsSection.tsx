// « Mes DS » en haut de la page Révisions (refait le 08/10/2026, plus sobre) : une ligne par DS à venir
// (date, chapitres, « Prêt à … % »), puis les notes des DS passés. Sans DS : une phrase et un bouton.
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarCheck, ChevronRight, Pencil, Plus } from 'lucide-react';
import { devoirsApi, testTitle, type UpcomingTest } from '@/lib/api/devoirsApi';
import { TestFormModal } from './TestFormModal';
import { GradeForm } from './GradeForm';
import { Countdown, DateTile, GradeBadge, Readiness } from './ui';

const PAST_SHOWN = 3;

export const UpcomingTestsSection: React.FC = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState<UpcomingTest[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [modal, setModal] = useState<{ test: UpcomingTest | null } | null>(null);
  const [allPast, setAllPast] = useState(false);

  const load = () => devoirsApi.list().then((t) => { setTests(t); setFailed(false); }).catch(() => { setFailed(true); setTests((cur) => cur ?? []); });
  useEffect(() => { load(); }, []);

  const upcoming = (tests ?? []).filter((t) => t.days_left >= 0);
  const past = (tests ?? []).filter((t) => t.days_left < 0);
  const add = () => setModal({ test: null });

  const saved = (t: UpcomingTest) => {
    const isNew = !modal?.test;
    setModal(null);
    if (isNew && t.days_left >= 0) navigate(`/revisions/ds/${t.id}`);
    else load();
  };

  return (
    <section aria-labelledby="mes-ds" className="mb-8" data-tour="revisions-ds">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 id="mes-ds" className="fd-display text-[21px] leading-tight text-ink">Mes DS</h2>
        {upcoming.length > 0 && (
          <button type="button" onClick={add} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13.5px] font-semibold text-brand-hover hover:bg-brand-soft">
            <Plus className="h-4 w-4" /> Ajouter un DS
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {tests === null ? (
          <div className="h-[84px] animate-pulse bg-white" aria-busy />
        ) : upcoming.length === 0 ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-hover">
              <CalendarCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-ink">Un DS bientôt ?</p>
              <p className="text-[13px] text-ink-faint">
                {failed ? 'Tes DS n’ont pas pu être chargés.' : 'Ajoute-le : Fidni te prépare une révision ciblée, et te le rappelle sur l’accueil.'}
              </p>
            </div>
            <button type="button" className="fd-btn-primary" onClick={add}><Plus className="h-4 w-4" /> Ajouter mon DS</button>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {upcoming.map((t, i) => (
              <li key={t.id}>
                <Link to={`/revisions/ds/${t.id}`} className="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-[#faf9f7] sm:px-5">
                  <DateTile date={t.date} size="sm" urgent={t.days_left <= 1} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[15px] font-semibold text-ink">{testTitle(t)}</span>
                      <Countdown days={t.days_left} />
                    </p>
                    <p className="mt-0.5 truncate text-[12.5px] text-ink-faint">{t.chapters.map((c) => c.name).join(' · ')}</p>
                  </div>
                  <div className="hidden w-36 shrink-0 md:block"><Readiness value={t.readiness} compact /></div>
                  {i === 0
                    ? <span className="hidden shrink-0 sm:inline-flex"><span className="fd-btn-primary">Préparer</span></span>
                    : <ChevronRight className="h-5 w-5 shrink-0 text-[#cfcdc8] group-hover:text-ink-faint" />}
                  {i === 0 && <ChevronRight className="h-5 w-5 shrink-0 text-ink-faint sm:hidden" />}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {past.length > 0 && (
          <div className="border-t border-line bg-[#fcfbf9] px-4 py-3 sm:px-5">
            <p className="text-[11.5px] font-bold uppercase tracking-[.07em] text-ink-faint">Mes notes</p>
            <ul className="mt-1 divide-y divide-line">
              {(allPast ? past : past.slice(0, PAST_SHOWN)).map((t) => (
                <PastRow key={t.id} test={t} onEdit={() => setModal({ test: t })}
                  onChange={(next) => setTests((cur) => cur?.map((x) => (x.id === next.id ? { ...x, ...next } : x)) ?? cur)} />
              ))}
            </ul>
            {past.length > PAST_SHOWN && (
              <button type="button" onClick={() => setAllPast((v) => !v)} className="mt-1 text-[12.5px] font-semibold text-brand-hover hover:underline">
                {allPast ? 'Voir moins' : `Voir les ${past.length} DS passés`}
              </button>
            )}
          </div>
        )}
      </div>

      <TestFormModal open={!!modal} test={modal?.test} onClose={() => setModal(null)} onSaved={saved}
        onDeleted={(id) => { setModal(null); setTests((cur) => cur?.filter((x) => x.id !== id) ?? cur); }} />
    </section>
  );
};

/** Un DS passé : sa note (un clic pour la changer), ou le champ pour la noter. */
function PastRow({ test: t, onChange, onEdit }: { test: UpcomingTest; onChange: (t: UpcomingTest) => void; onEdit: () => void }) {
  const [editing, setEditing] = useState(false);
  const day = new Date(`${t.date}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2">
      <Link to={`/revisions/ds/${t.id}`} className="min-w-0 flex-1 truncate text-[13.5px] text-ink-soft hover:underline">
        <b className="font-semibold text-ink">{testTitle(t)}</b> <span className="text-ink-faint">· {day}</span>
      </Link>
      {t.grade !== null && !editing ? (
        <button type="button" onClick={() => setEditing(true)} title="Changer ma note" className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
          <GradeBadge grade={t.grade} />
        </button>
      ) : (
        <GradeForm test={t} autoFocus={editing} onSaved={(next) => { onChange(next); setEditing(false); }} />
      )}
      <button type="button" onClick={onEdit} aria-label="Modifier ce DS" className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-ink-faint hover:bg-[#f2f1ee] hover:text-ink">
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

export default UpcomingTestsSection;

// Onglet « Mes DS » de la page Révisions (séparé des listes le 09/10/2026) : un résumé (prochain DS,
// préparation, moyenne des notes), une ligne par DS à venir (date, chapitres, « Prêt à … % »), puis les
// notes des DS passés. Sans DS : comment ça marche, en trois étapes, et un bouton.
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarCheck, ChevronRight, ClipboardCheck, Pencil, Plus, Target, Timer } from 'lucide-react';
import { devoirsApi, testTitle, whenLabel, type UpcomingTest } from '@/lib/api/devoirsApi';
import { TestFormModal } from './TestFormModal';
import { GradeForm } from './GradeForm';
import { Countdown, DateTile, GradeBadge, Readiness } from './ui';

const PAST_SHOWN = 5;

const STEPS: { icon: React.ElementType; title: string; text: string }[] = [
  { icon: CalendarCheck, title: 'Annonce ton DS', text: 'Sa date et ses chapitres : il s’affiche sur ton accueil jusqu’au jour J.' },
  { icon: Target, title: 'Révise ce qui compte', text: 'Fidni mesure ta préparation chapitre par chapitre et te propose des exercices, tes points faibles d’abord.' },
  { icon: Timer, title: 'Fais un DS blanc', text: 'Un sujet chronométré tiré de tes chapitres, puis note ta vraie note après le DS pour suivre tes progrès.' },
];

export const HowItWorks: React.FC<{ steps: typeof STEPS }> = ({ steps }) => (
  <ol className="grid gap-3 border-t border-line bg-[#fcfbf9] px-4 py-4 sm:grid-cols-3 sm:px-5">
    {steps.map((s, i) => (
      <li key={s.title} className="flex gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-ink-soft ring-1 ring-line">
          <s.icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-ink"><span className="fd-nums text-ink-faint">{i + 1}.</span> {s.title}</p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-ink-faint">{s.text}</p>
        </div>
      </li>
    ))}
  </ol>
);

export const UpcomingTestsSection: React.FC<{ onTests?: (tests: UpcomingTest[]) => void }> = ({ onTests }) => {
  const navigate = useNavigate();
  const [tests, setTests] = useState<UpcomingTest[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [modal, setModal] = useState<{ test: UpcomingTest | null } | null>(null);
  const [allPast, setAllPast] = useState(false);

  const load = () => devoirsApi.list().then((t) => { setTests(t); setFailed(false); }).catch(() => { setFailed(true); setTests((cur) => cur ?? []); });
  useEffect(() => { load(); }, []);
  useEffect(() => { if (tests) onTests?.(tests); }, [tests, onTests]);

  const upcoming = (tests ?? []).filter((t) => t.days_left >= 0);
  const past = (tests ?? []).filter((t) => t.days_left < 0);
  const graded = past.filter((t) => t.grade !== null);
  const average = graded.length ? graded.reduce((n, t) => n + (t.grade ?? 0), 0) / graded.length : null;
  const next = upcoming[0];
  const add = () => setModal({ test: null });

  const saved = (t: UpcomingTest) => {
    const isNew = !modal?.test;
    setModal(null);
    if (isNew && t.days_left >= 0) navigate(`/revisions/ds/${t.id}`);
    else load();
  };

  return (
    <section aria-label="Mes DS" data-tour="revisions-ds">
      {/* En une ligne : ce qui arrive, et où j'en suis. */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 text-[13.5px] text-ink-soft">
          {tests === null ? '\u00a0' : next ? (
            <>Prochain : <b className="font-semibold text-ink">{testTitle(next)}</b> {whenLabel(next.days_left)}
              {upcoming.length > 1 && <> · {upcoming.length} DS à venir</>}
              {average !== null && <> · moyenne de tes notes <b className="fd-nums font-semibold text-ink">{average.toFixed(1).replace('.', ',')} / 20</b></>}</>
          ) : average !== null ? (
            <>Aucun DS à venir · moyenne de tes notes <b className="fd-nums font-semibold text-ink">{average.toFixed(1).replace('.', ',')} / 20</b></>
          ) : 'Prépare chaque devoir surveillé avec une révision ciblée.'}
        </p>
        {upcoming.length > 0 && (
          <button type="button" onClick={add} className="fd-btn-ghost">
            <Plus className="h-4 w-4" /> Ajouter un DS
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {tests === null ? (
          <div className="h-[84px] animate-pulse bg-white" aria-busy />
        ) : upcoming.length === 0 ? (
          <>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-hover">
                <CalendarCheck className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-ink">{past.length ? 'Un nouveau DS bientôt ?' : 'Un DS bientôt ?'}</p>
                <p className="text-[13px] text-ink-faint">
                  {failed ? 'Tes DS n’ont pas pu être chargés.' : 'Ajoute-le : Fidni te prépare une révision ciblée sur ses chapitres.'}
                </p>
              </div>
              <button type="button" className="fd-btn-primary" onClick={add}><Plus className="h-4 w-4" /> Ajouter mon DS</button>
            </div>
            {!failed && <HowItWorks steps={STEPS} />}
          </>
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
                      {t.mock_done_at && (
                        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-hover">
                          <ClipboardCheck className="h-3.5 w-3.5" /> DS blanc fait
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-[12.5px] text-ink-faint">{t.chapters.map((c) => c.name).join(' · ')}</p>
                    {!!t.weak_chapters?.length && (
                      <p className="mt-0.5 truncate text-[12px] text-[#8a6318]">À renforcer : {t.weak_chapters.join(', ')}</p>
                    )}
                    <div className="mt-2 md:hidden"><Readiness value={t.readiness} compact /></div>
                  </div>
                  <div className="hidden w-40 shrink-0 md:block"><Readiness value={t.readiness} compact /></div>
                  {i === 0
                    ? <span className="hidden shrink-0 sm:inline-flex"><span className="fd-btn-primary">Préparer</span></span>
                    : <ChevronRight className="h-5 w-5 shrink-0 text-[#cfcdc8] group-hover:text-ink-faint" />}
                  {i === 0 && <ChevronRight className="h-5 w-5 shrink-0 text-ink-faint sm:hidden" />}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {past.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h3 className="text-[15px] font-semibold text-ink">Mes DS passés</h3>
            {graded.length < past.length && (
              <span className="text-[12.5px] text-ink-faint">Note-les pour suivre tes progrès</span>
            )}
          </div>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white px-4 sm:px-5">
            {(allPast ? past : past.slice(0, PAST_SHOWN)).map((t) => (
              <PastRow key={t.id} test={t} onEdit={() => setModal({ test: t })}
                onChange={(n) => setTests((cur) => cur?.map((x) => (x.id === n.id ? { ...x, ...n } : x)) ?? cur)} />
            ))}
          </ul>
          {past.length > PAST_SHOWN && (
            <button type="button" onClick={() => setAllPast((v) => !v)} className="mt-2 text-[12.5px] font-semibold text-brand-hover hover:underline">
              {allPast ? 'Voir moins' : `Voir les ${past.length} DS passés`}
            </button>
          )}
        </div>
      )}

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
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5">
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

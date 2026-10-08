// « Mes DS » en haut de la page Révisions (08/10/2026) : le prochain DS en grand (date, chapitres,
// préparation, « Préparer ce DS »), les suivants en cartes, les DS passés avec leur note.
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarCheck, ChevronDown, Dumbbell, Pencil, Plus, Target, Timer } from 'lucide-react';
import { devoirsApi, longDate, plural, testTitle, whenLabel, type UpcomingTest } from '@/lib/api/devoirsApi';
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
  const [first, ...others] = upcoming;

  const saved = (t: UpcomingTest) => {
    const isNew = !modal?.test;
    setModal(null);
    if (isNew && t.days_left >= 0) navigate(`/revisions/ds/${t.id}`);
    else load();
  };

  return (
    <section aria-labelledby="mes-ds" className="mb-10" data-tour="revisions-ds">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id="mes-ds" className="fd-display text-[21px] leading-tight text-ink">Mes DS</h2>
          <p className="mt-1 text-[13px] text-ink-soft">Annonce ton prochain devoir : Fidni te prépare une révision ciblée.</p>
        </div>
        {upcoming.length > 0 && (
          <button type="button" className="fd-btn-primary shrink-0" onClick={() => setModal({ test: null })}>
            <Plus className="h-4 w-4" /> Ajouter un DS
          </button>
        )}
      </div>

      {tests === null ? (
        <div className="h-[184px] animate-pulse rounded-2xl border border-line bg-white" aria-busy />
      ) : upcoming.length === 0 ? (
        <EmptyState onAdd={() => setModal({ test: null })} failed={failed} />
      ) : (
        <div className="flex flex-col gap-3">
          <NextTestCard test={first} onEdit={() => setModal({ test: first })} />
          {others.length > 0 && (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((t) => (
                <li key={t.id}>
                  <Link to={`/revisions/ds/${t.id}`}
                    className="group flex h-full gap-3 rounded-2xl border border-line bg-white p-4 transition-shadow hover:shadow-[0_10px_30px_rgba(20,18,16,.08)]">
                    <DateTile date={t.date} size="sm" urgent={t.days_left <= 1} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-semibold text-ink">{testTitle(t)}</p>
                      <p className="mt-0.5 truncate text-[12px] text-ink-faint">
                        {whenLabel(t.days_left)} · {plural(t.chapters.length, 'chapitre', 'chapitres')}
                      </p>
                      <div className="mt-2"><Readiness value={t.readiness} compact /></div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {past.length > 0 && (
        <div className="mt-5 rounded-2xl border border-line bg-white px-4 py-3 sm:px-5">
          <h3 className="flex items-center justify-between py-1 text-[13px] font-bold uppercase tracking-[.07em] text-ink-faint">
            DS passés <span className="fd-nums normal-case tracking-normal">{past.length}</span>
          </h3>
          <ul className="divide-y divide-line">
            {(allPast ? past : past.slice(0, PAST_SHOWN)).map((t) => (
              <PastRow key={t.id} test={t} onChange={(next) => setTests((cur) => cur?.map((x) => (x.id === next.id ? { ...x, ...next } : x)) ?? cur)}
                onEdit={() => setModal({ test: t })} />
            ))}
          </ul>
          {past.length > PAST_SHOWN && (
            <button type="button" onClick={() => setAllPast((v) => !v)}
              className="mt-1 inline-flex items-center gap-1 py-1.5 text-[13px] font-semibold text-brand-hover hover:underline">
              <ChevronDown className={`h-4 w-4 transition-transform ${allPast ? 'rotate-180' : ''}`} />
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

/** Le prochain DS, en grand. */
function NextTestCard({ test: t, onEdit }: { test: UpcomingTest; onEdit: () => void }) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-line bg-white p-5 sm:p-6">
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-brand" />
      <div className="flex gap-4 sm:gap-5">
        <DateTile date={t.date} size="lg" urgent={t.days_left <= 1} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Countdown days={t.days_left} />
            <span className="text-[12.5px] text-ink-faint">{longDate(t.date)}</span>
            <button type="button" onClick={onEdit} aria-label="Modifier ce DS" title="Modifier"
              className="ml-auto -mr-1 -mt-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint hover:bg-[#f2f1ee] hover:text-ink">
              <Pencil className="h-4 w-4" />
            </button>
          </div>
          <h3 className="fd-display mt-1 text-[22px] leading-tight text-ink sm:text-[24px]">{testTitle(t)}</h3>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {t.chapters.map((c) => (
              <span key={c.id} className="max-w-full truncate rounded-full bg-[#f2f1ee] px-2.5 py-1 text-[12.5px] text-ink-soft">{c.name}</span>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="max-w-sm">
              <Readiness value={t.readiness} />
              {!!t.weak_chapters?.length && (
                <p className="mt-1.5 truncate text-[12.5px] text-ink-faint">
                  <Target className="mr-1 inline h-3.5 w-3.5 text-[#8a6318]" />À renforcer : {t.weak_chapters.join(', ')}
                </p>
              )}
            </div>
            <Link to={`/revisions/ds/${t.id}`} className="fd-btn-primary justify-center">
              Préparer ce DS <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

/** Aucun DS à venir : ce que Fidni prépare, et le bouton pour commencer. */
function EmptyState({ onAdd, failed }: { onAdd: () => void; failed: boolean }) {
  const steps = [
    { icon: Target, title: 'Tes chapitres fragiles d’abord', text: 'Ce que tu maîtrises le moins passe en premier.' },
    { icon: Dumbbell, title: 'Des exercices choisis pour toi', text: 'Dans les chapitres du DS, et le quiz de chacun.' },
    { icon: Timer, title: 'Un DS blanc chronométré', text: '2 ou 3 exercices en conditions réelles, puis ta correction.' },
  ];
  return (
    <div className="rounded-2xl border border-line bg-white p-5 sm:p-7">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:gap-8">
        <div className="min-w-0 md:max-w-xs">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand-hover">
            <CalendarCheck className="h-5 w-5" />
          </span>
          <h3 className="fd-display mt-3 text-[20px] leading-tight text-ink">Un DS bientôt ?</h3>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">
            Indique sa date et ses chapitres : ta révision est prête en un clic, et un rappel t’attend sur l’accueil.
          </p>
          <button type="button" className="fd-btn-primary mt-4" onClick={onAdd}>
            <Plus className="h-4 w-4" /> Ajouter mon prochain DS
          </button>
          {failed && <p className="mt-2 text-[12px] text-[#a23b34]">Tes DS n’ont pas pu être chargés.</p>}
        </div>
        <ol className="grid flex-1 gap-2.5 sm:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="rounded-xl border border-line bg-paper p-4">
              <div className="flex items-center gap-2">
                <span className="fd-nums inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[11.5px] font-bold text-white">{i + 1}</span>
                <Icon className="h-4 w-4 text-brand" aria-hidden />
              </div>
              <p className="mt-2.5 text-[14px] font-semibold leading-snug text-ink">{title}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-faint">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/** Un DS passé : sa note (un clic pour la modifier), ou le champ pour la noter. */
function PastRow({ test: t, onChange, onEdit }: { test: UpcomingTest; onChange: (t: UpcomingTest) => void; onEdit: () => void }) {
  const [editing, setEditing] = useState(false);
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
      <DateTile date={t.date} size="sm" />
      <div className="min-w-0 flex-1">
        <Link to={`/revisions/ds/${t.id}`} className="block truncate text-[14px] font-semibold text-ink hover:underline">{testTitle(t)}</Link>
        <p className="truncate text-[12px] text-ink-faint">{t.chapters.map((c) => c.name).join(' · ')}</p>
      </div>
      {t.grade !== null && !editing ? (
        <button type="button" onClick={() => setEditing(true)} title="Modifier ma note" className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
          <GradeBadge grade={t.grade} />
        </button>
      ) : (
        <GradeForm test={t} autoFocus={editing} onSaved={(next) => { onChange(next); setEditing(false); }} />
      )}
      <button type="button" onClick={onEdit} aria-label="Modifier ce DS" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint hover:bg-[#f2f1ee] hover:text-ink">
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

export default UpcomingTestsSection;

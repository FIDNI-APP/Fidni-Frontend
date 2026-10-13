// « Ma progression » en tableau de bord (refonte du 13/10/2026 : « trop dur, plein d'infos, même pour moi »). Des
// faits datés, à creuser en cliquant, dans l'esprit de Pilotage. En onglets (« ?onglet= » : apercu, faibles,
// chapitres, temps) : chaque vue tient sur un écran, rien à chercher en bas de page. La période vaut pour tous :
//   - la période (7 j · 30 j · 3 mois · Tout) ;
//   - quatre tuiles (questions réussies, note moyenne aux examens, temps, jours actifs) : chacune choisit le grand
//     graphique, avec l'écart à la période d'avant ;
//   - le grand graphique : barres réussies / en partie / à revoir par jour, notes d'examens (/20) dans le temps,
//     minutes par jour, calendrier des jours actifs ; un clic sur un jour montre ce qu'il a fait ;
//   - Mes points faibles : les théorèmes les moins réussis, les questions ratées à refaire (les théorèmes sont montrés à
//     l'élève depuis cette refonte) ;
//   - Mes chapitres : note aux examens (moyenne, min, max, évolution), questions, temps ; un clic ouvre le détail ;
//   - Mon temps : tout › chapitre › contenu.
// L'objectif et les états de maîtrise ne sont plus sur cette page (l'accueil garde « Où j'en suis »).
// « ?chapitre=12 » (quiz, profil, plan de DS) ouvre le détail de ce chapitre.
// Données : GET /api/stats/tableau/?jours= (apps/users/tableau.py).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Clock, GraduationCap, RotateCcw, TrendingUp, Trophy, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { SEO } from '@/components/layout/SEO';
import { exercisesHome } from '@/components/layout/nav';
import { Page, PageHeader, EmptyState, Segmented } from '@/components/space/Page';
import { trackAction } from '@/lib/usage';
import type { Periode, Tableau } from '@/lib/api/tableauApi';
import { COULEUR, SERIES_QUESTIONS, ecart } from '@/components/progression/chart';
import { Tuile } from '@/components/progression/Tuile';
import { DayBars } from '@/components/progression/DayBars';
import { NotesChart } from '@/components/progression/NotesChart';
import { ActiveCalendar } from '@/components/progression/ActiveCalendar';
import { DayPanel } from '@/components/progression/DayPanel';
import { Chapitres } from '@/components/progression/Chapitres';
import { ChapitrePanel } from '@/components/progression/ChapitrePanel';
import { MonTemps } from '@/components/progression/MonTemps';
import { PointsFaibles } from '@/components/progression/PointsFaibles';
import { decimal, duration } from './format';
import { useTableau } from './useTableau';

type Vue = 'questions' | 'note' | 'temps' | 'jours';
type Onglet = 'apercu' | 'faibles' | 'chapitres' | 'temps';
// `court` : sur téléphone, pour que les quatre onglets tiennent sur la largeur.
const ONGLETS: { key: Onglet; label: string; court?: string }[] = [
  { key: 'apercu', label: 'Vue d’ensemble', court: 'Aperçu' }, { key: 'faibles', label: 'Points faibles' },
  { key: 'chapitres', label: 'Chapitres' }, { key: 'temps', label: 'Temps' },
];
const PERIODES: { key: string; label: string }[] = [
  { key: '7', label: '7 j' }, { key: '30', label: '30 j' }, { key: '90', label: '3 mois' }, { key: '0', label: 'Tout' },
];
const PERIODE_CLE = 'fidni:progression:periode';
const lirePeriode = (): Periode => {
  try {
    const brut = localStorage.getItem(PERIODE_CLE);
    const v = Number(brut);
    // Rien de mémorisé : 30 jours (Number(null) vaut 0, qui serait « Tout »).
    return brut !== null && ([7, 30, 90, 0] as const).includes(v as Periode) ? (v as Periode) : 30;
  } catch { return 30; }
};

const AIDE: Record<Vue, string> = {
  questions: 'Chaque question compte une fois par jour, avec ce que tu as coché en dernier. Touche un jour pour voir ce que tu as fait.',
  note: 'La note d’un examen vient de ce que tu as coché sur ta copie (réussi, en partie, à revoir), selon le barème, dès que la moitié est corrigée.',
  temps: 'Le temps passé sur les exercices, les leçons et les examens. Touche un jour pour le détail.',
  jours: 'Un jour compte dès qu’il y a du temps de travail ou une question évaluée. Plus la case est foncée, plus tu as travaillé.',
};

export function ProgressionPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [jours, setJours] = useState<Periode>(lirePeriode);
  const { data, failed, reload } = useTableau(isAuthenticated && user ? String(user.id) : null, jours);
  const [vue, setVue] = useState<Vue>('questions');
  const [jour, setJour] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();
  const [ouvert, setOuvert] = useState<number | null>(() => Number(params.get('chapitre')) || null);
  const onglet: Onglet = (ONGLETS.some((o) => o.key === params.get('onglet')) ? params.get('onglet') : 'apercu') as Onglet;
  const changerOnglet = (k: Onglet) => {
    const p = new URLSearchParams(params);
    if (k === 'apercu') p.delete('onglet'); else p.set('onglet', k);
    setParams(p, { replace: true });
    trackAction('prog-onglet');
  };

  useEffect(() => { setJour(null); }, [jours, vue]);
  const changerPeriode = (k: string) => {
    const v = Number(k) as Periode;
    setJours(v);
    trackAction('prog-periode');
    try { localStorage.setItem(PERIODE_CLE, String(v)); } catch { /* stockage indisponible */ }
  };
  const choisir = (v: Vue) => { setVue(v); trackAction('prog-tuile'); };
  const ouvrirJour = (d: string) => { setJour(d); trackAction('prog-jour'); };
  const ouvrir = (id: number) => { setOuvert(id); trackAction('prog-chapitre'); };
  const fermer = useCallback(() => {
    setOuvert(null);
    if (params.get('chapitre')) { params.delete('chapitre'); setParams(params, { replace: true }); }
  }, [params, setParams]);
  const chapitre = useMemo(() => data?.chapitres.find((c) => c.id === ouvert) ?? null, [data, ouvert]);

  if (!authLoading && !isAuthenticated) return <Navigate to="/" replace />;

  const isTeacher = user?.profile?.user_type === 'teacher';
  const levelLink = user ? `/profile/${user.username}/edit#scolarite` : '/complete-profile';
  const rien = !!data && !data.kpis.questions.reussies && !data.kpis.questions.partielles && !data.kpis.questions.ratees
    && !data.kpis.secondes.total && !data.kpis.note.n;

  return (
    <Page>
      <SEO title="Ma progression | Fidni" description="Tes questions réussies, tes notes aux examens et ton temps de travail, jour par jour." noindex />
      <PageHeader eyebrow={data?.level ? `Mon suivi · ${data.level.name}` : 'Mon suivi'} icon={TrendingUp} title="Ma progression"
        actions={<div data-tour="prog-periode"><Segmented label="Période" value={String(jours)} onChange={changerPeriode} options={PERIODES} /></div>} />

      {failed && !data && (
        <div role="alert" className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-4 py-3">
          <p className="flex-1 text-[13.5px] font-medium text-[#a23b34]">Ta progression n’a pas pu se charger. Vérifie ta connexion.</p>
          <button type="button" onClick={reload} className="fd-btn-ghost min-h-10"><RotateCcw className="h-4 w-4" /> Réessayer</button>
        </div>
      )}
      {!data && !failed && <Squelette />}

      {data && (isTeacher && rien && jours === 0 ? (
        <EmptyState icon={Users} tone="ink" title="Cette page suit le travail d’un élève"
          text="Tes élèves y voient leurs questions réussies, leurs notes aux examens et leur temps de travail. Leur travail se suit depuis tes classes."
          action={<Link to="/classrooms" className="fd-btn-primary min-h-10">Voir mes classes</Link>} />
      ) : rien && jours === 0 ? (
        <EmptyState icon={TrendingUp} title="Ta progression commence ici"
          text="Fais un exercice, puis dis pour chaque question si tu l’as réussie : tes réussites, tes notes et ton temps s’afficheront ici."
          action={<Link to={exercisesHome(user)} className="fd-btn-primary min-h-10">Commencer un exercice</Link>} />
      ) : (
        <div className="flex flex-col gap-6">
          {!data.level && (
            <p className="flex flex-wrap items-center gap-2 rounded-xl border border-gold-line bg-gold-soft px-4 py-3 text-[13px] text-ink-soft">
              <GraduationCap className="h-4 w-4 text-gold-strong" aria-hidden /> Indique ta classe pour voir tous les chapitres de ton programme.
              <Link to={levelLink} className="font-semibold text-brand-hover hover:underline">Indiquer ma classe</Link>
            </p>
          )}
          {rien && (
            <p className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-[13px] text-ink-soft">
              Rien d’enregistré sur cette période.
              <button type="button" onClick={() => changerPeriode('0')} className="font-semibold text-brand-hover hover:underline">Voir depuis le début</button>
            </p>
          )}

          {/* Onglets : une vue à la fois, son nombre en badge (comme Réviser). */}
          <div role="tablist" aria-label="Ma progression" data-tour="prog-onglets" className="-mt-2 flex gap-1 overflow-x-auto border-b border-line">
            {ONGLETS.map((o) => {
              const n = o.key === 'faibles' ? data.points_faibles.length : o.key === 'chapitres' ? data.chapitres.filter((c) => c.actif).length : 0;
              const on = onglet === o.key;
              return (
                <button key={o.key} type="button" role="tab" id={`onglet-${o.key}`} aria-selected={on} aria-controls={`panneau-${o.key}`}
                  onClick={() => changerOnglet(o.key)}
                  className={`-mb-px inline-flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 px-1.5 text-[13px] font-semibold transition-colors sm:gap-2 sm:px-3 sm:text-[14px] ${
                    on ? 'border-ink text-ink' : 'border-transparent text-ink-faint hover:text-ink'}`}>
                  {o.court ? <><span className="sm:hidden">{o.court}</span><span className="hidden sm:inline">{o.label}</span></> : o.label}
                  {!!n && <span className={`fd-nums rounded-full px-1.5 text-[11.5px] ${o.key === 'chapitres' ? 'hidden sm:inline' : ''} ${on ? 'bg-ink text-white' : o.key === 'faibles' ? 'bg-gold-soft text-gold-strong' : 'bg-[#f2f1ee] text-ink-soft'}`}>{n}</span>}
                </button>
              );
            })}
          </div>

          <div role="tabpanel" id={`panneau-${onglet}`} aria-labelledby={`onglet-${onglet}`}>
            {onglet === 'apercu' && (
              <div className="flex flex-col gap-5">
                <Tuiles data={data} vue={vue} onVue={choisir} />
                <section aria-label="Graphique" data-tour="prog-graphique" className="rounded-2xl border border-line bg-white p-4 sm:p-6">
                  <Graphique data={data} vue={vue} jour={jour} onJour={ouvrirJour} />
                  {jour && (vue === 'questions' || vue === 'temps' || vue === 'jours') && <DayPanel date={jour} onClose={() => setJour(null)} />}
                  <p className="mt-4 text-[12px] leading-relaxed text-ink-faint">{AIDE[vue]}</p>
                </section>
              </div>
            )}
            {onglet === 'faibles' && (
              <div className="flex flex-col gap-3">
                <p className="text-[13px] text-ink-faint">Les théorèmes de tes questions ratées sur la période, les moins réussis d’abord : c’est là qu’il faut te concentrer.</p>
                <PointsFaibles points={data.points_faibles} />
              </div>
            )}
            {onglet === 'chapitres' && (
              <div className="flex flex-col gap-3">
                <p className="text-[13px] text-ink-faint">Ta note aux examens, tes questions et ton temps, chapitre par chapitre. Touche un chapitre pour le détail.</p>
                <Chapitres chapitres={data.chapitres} onOpen={ouvrir} />
              </div>
            )}
            {onglet === 'temps' && (
              <div className="flex flex-col gap-3">
                <p className="text-[13px] text-ink-faint">Où passe ton temps de travail : touche un chapitre, puis un contenu.</p>
                <MonTemps data={data} />
              </div>
            )}
          </div>
        </div>
      ))}

      {data && chapitre && <ChapitrePanel chapitre={chapitre} data={data} onClose={fermer} />}
    </Page>
  );
}

function Tuiles({ data, vue, onVue }: { data: Tableau; vue: Vue; onVue: (v: Vue) => void }) {
  const k = data.kpis;
  const avantJours = data.periode.jours || null;
  const q = k.questions;
  const evaluees = q.reussies + q.partielles + q.ratees;
  const taux = evaluees ? Math.round((q.reussies + q.partielles / 2) * 100 / evaluees) : null;
  const dates = data.jours.map((j) => j.date);
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-tour="prog-tuiles">
      <Tuile icon={CheckCircle2} label="Questions réussies" accent={COULEUR.reussies} selected={vue === 'questions'} onClick={() => onVue('questions')}
        value={q.reussies.toLocaleString('fr-FR')} ecart={ecart(q.reussies, q.avant ? q.avant.reussies : null)} jours={avantJours}
        sub={evaluees ? `sur ${evaluees} évaluée${evaluees > 1 ? 's' : ''} · ${taux} %` : 'aucune évaluée'}
        spark={{ values: data.jours.map((j) => j.reussies), dates, color: COULEUR.reussies, label: 'Questions réussies par jour', format: (v) => `${v} réussie${v > 1 ? 's' : ''}` }} />
      <Tuile icon={Trophy} label="Note moyenne aux examens" accent={COULEUR.note} selected={vue === 'note'} onClick={() => onVue('note')}
        value={k.note.moyenne !== null ? decimal(k.note.moyenne) : '—'} unit={k.note.moyenne !== null ? '/ 20' : undefined}
        ecart={k.note.moyenne !== null ? ecart(k.note.moyenne, k.note.avant, 'abs', (n) => decimal(n)) : undefined} jours={avantJours}
        sub={k.note.n ? `${k.note.n} examen${k.note.n > 1 ? 's' : ''} noté${k.note.n > 1 ? 's' : ''}` : 'pas d’examen corrigé'}
        spark={data.notes.length > 1 ? { values: data.notes.map((n) => n.note), dates: data.notes.map((n) => n.date), color: COULEUR.note, label: 'Notes aux examens', format: (v) => `${decimal(v)} / 20` } : undefined}
        footer={data.notes.length <= 1 ? <span className="text-[12px] text-ink-faint">{data.notes.length ? '' : 'Corrige un DS pour avoir une note'}</span> : undefined} />
      <Tuile icon={Clock} label="Temps de travail" accent={COULEUR.temps} selected={vue === 'temps'} onClick={() => onVue('temps')}
        value={duration(k.secondes.total)} ecart={ecart(k.secondes.total, k.secondes.avant)} jours={avantJours}
        sub={data.periode.nb_jours > 1 ? `${duration(Math.round(k.secondes.total / data.periode.nb_jours))} par jour en moyenne` : undefined}
        spark={{ values: data.jours.map((j) => Math.round(j.secondes / 60)), dates, color: COULEUR.temps, label: 'Minutes par jour', format: (v) => `${v} min` }} />
      <Tuile icon={CalendarDays} label="Jours actifs" accent="#4f9f72" selected={vue === 'jours'} onClick={() => onVue('jours')}
        value={k.jours_actifs.n} unit={`/ ${k.jours_actifs.sur}`} ecart={ecart(k.jours_actifs.n, k.jours_actifs.avant, 'abs')} jours={avantJours}
        footer={(
          <span className="flex w-full items-end gap-[2px]" aria-hidden>
            {data.jours.slice(-28).map((j) => (
              <span key={j.date} className="h-2.5 min-w-0 flex-1 rounded-[2px]" style={{ background: j.actifs ? '#4f9f72' : '#f2f1ee' }} />
            ))}
          </span>
        )} />
    </div>
  );
}

function Graphique({ data, vue, jour, onJour }: { data: Tableau; vue: Vue; jour: string | null; onJour: (d: string) => void }) {
  const p = data.periode;
  const parJour = p.pas === 'jour';
  if (vue === 'note') {
    const k = data.kpis.note;
    return (
      <>
        <h2 className="mb-3 text-[15px] font-semibold text-ink">Mes notes aux examens</h2>
        <NotesChart points={data.notes.map((n) => ({ date: n.date, note: n.note, titre: n.titre, url: n.url }))} debut={p.debut} fin={p.fin}
          headline={k.moyenne !== null ? <>{decimal(k.moyenne)} <span className="text-[14px] font-semibold text-ink-faint">/ 20 en moyenne · {k.n} examen{k.n > 1 ? 's' : ''}</span></> : 'Pas encore de note'}
          emptyText={<>Pas encore d’examen corrigé sur cette période. <Link to="/exams" className="font-semibold text-brand-hover hover:underline">Faire un DS</Link></>} />
      </>
    );
  }
  if (vue === 'jours') {
    return (
      <>
        <h2 className="mb-3 text-[15px] font-semibold text-ink">Mes jours de travail</h2>
        <ActiveCalendar rows={data.jours} pas={p.pas} selected={jour} onPick={parJour ? onJour : undefined}
          headline={<>{data.kpis.jours_actifs.n} <span className="text-[14px] font-semibold text-ink-faint">jour{data.kpis.jours_actifs.n > 1 ? 's' : ''} actif{data.kpis.jours_actifs.n > 1 ? 's' : ''} sur {data.kpis.jours_actifs.sur}</span></>} />
      </>
    );
  }
  if (vue === 'temps') {
    return (
      <>
        <h2 className="mb-3 text-[15px] font-semibold text-ink">Mon temps de travail</h2>
        <DayBars rows={data.jours.map((j) => ({ date: j.date, minutes: Math.round(j.secondes / 60) }))}
          series={[{ key: 'minutes', label: 'Minutes', color: COULEUR.temps }]} pas={p.pas} selected={jour} onPick={parJour ? onJour : undefined}
          describe={(r) => (Number(r.minutes) ? duration(Number(r.minutes) * 60) : 'Pas de travail')}
          headline={<>{duration(data.kpis.secondes.total)} <span className="text-[14px] font-semibold text-ink-faint">de travail</span></>}
          tick={(v) => (v >= 60 && v % 60 === 0 ? `${v / 60} h` : `${v}`)} emptyText="Pas de temps de travail sur cette période." />
      </>
    );
  }
  const q = data.kpis.questions;
  return (
    <>
      <h2 className="mb-3 text-[15px] font-semibold text-ink">Mes questions, réussies et à revoir</h2>
      <DayBars rows={data.jours} series={SERIES_QUESTIONS} pas={p.pas} selected={jour} onPick={parJour ? onJour : undefined}
        describe={(r) => {
          const t = Number(r.reussies) + Number(r.partielles) + Number(r.ratees);
          if (!t) return 'Aucune question';
          return [`${r.reussies} réussie${Number(r.reussies) > 1 ? 's' : ''}`, Number(r.partielles) ? `${r.partielles} en partie` : '', `${r.ratees} à revoir`].filter(Boolean).join(' · ');
        }}
        headline={q.reussies + q.partielles + q.ratees ? <Total r={q} /> : 'Aucune question évaluée'}
        emptyText="Aucune question évaluée sur cette période." />
    </>
  );
}

/** « 20 réussies · 1 en partie · 7 à revoir », le premier chiffre en grand. */
export function Total({ r }: { r: { reussies: number; partielles: number; ratees: number } }) {
  return (
    <>{r.reussies} <span className="text-[14px] font-semibold text-ink-faint">
      réussie{r.reussies > 1 ? 's' : ''}{r.partielles ? ` · ${r.partielles} en partie` : ''} · {r.ratees} à revoir
    </span></>
  );
}

function Squelette() {
  return (
    <div className="flex flex-col gap-8" role="status" aria-label="Chargement">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-[150px] animate-pulse rounded-2xl border border-line bg-white" />)}
      </div>
      <div className="h-[320px] animate-pulse rounded-2xl border border-line bg-white" />
      <div className="h-[260px] animate-pulse rounded-2xl border border-line bg-white" />
    </div>
  );
}

export default ProgressionPage;

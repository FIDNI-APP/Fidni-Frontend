/**
 * Concours (/concours), refonte du 11/10/2026 : trois écoles (ENSA, ENSAM, médecine) et leurs annales.
 * Tant qu'aucune annale n'est en ligne, la page le dit simplement (« Bientôt ») et propose le Bac national
 * à la place, au lieu de cartes « 0 annale », d'un tableau vide et d'une simulation qui ne menait à rien.
 * Les annales sont chargées en une fois : le nombre par école ne dépend plus du filtre choisi, et les
 * filtres (école, années) s'appliquent ici, gardés dans l'adresse (?concours=ensa&year_min=2018).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight, Calendar, Check, Clock, Cog, Hourglass, Landmark, Lightbulb, ListChecks, Loader2,
  RotateCcw, SearchX, Shuffle, Stethoscope, Wrench, X,
} from 'lucide-react';
import {
  CONCOURS_TYPES, listConcoursExams, listConcoursTips, startSimulation,
  type ConcoursType, type ConcoursExamListItem, type SimulationMode,
} from '@/lib/api/concoursApi';
import { useAuth } from '@/contexts/AuthContext';
import { SEO } from '@/components/layout/SEO';
import { Page, Section, EmptyState, CardLink, CardsSkeleton } from '@/components/space/Page';
import { ConcoursHeader } from './ConcoursHeader';
import { t } from '@/i18n';

type Icon = React.ComponentType<{ className?: string }>;

/** Les écoles : nom complet et pictogramme (plus d'emoji ni de bandeau en dégradé). */
const SCHOOLS: Record<ConcoursType, { full: string; icon: Icon }> = {
  ensa: { full: 'École nationale des sciences appliquées', icon: Cog },
  ensam: { full: 'École nationale supérieure d’arts et métiers', icon: Wrench },
  medecine: { full: 'Concours commun des facultés de médecine', icon: Stethoscope },
};

const schoolLabel = (id: ConcoursType | null) => t(CONCOURS_TYPES.find((c) => c.id === id)?.label ?? '');

/* ───────────────────────── Carte d'une école ───────────────────────── */

const SchoolHead: React.FC<{ id: ConcoursType; label: string; status: React.ReactNode }> = ({ id, label, status }) => {
  const s = SCHOOLS[id];
  const I = s.icon;
  return (
    <>
      {/* Téléphone : une ligne (pictogramme, nom, état) ; ordinateur : pictogramme et état en haut, nom dessous. */}
      <span className="flex shrink-0 items-center justify-between gap-3 md:w-full">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f2f1ee] text-ink-soft" aria-hidden>
          <I className="h-5 w-5" />
        </span>
        <span className="hidden md:inline-flex">{status}</span>
      </span>
      <span className="min-w-0 flex-1 md:w-full">
        <span className="fd-display block text-[20px] leading-tight text-ink">{t(label)}</span>
        <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-faint">{t(s.full)}</span>
      </span>
      <span className="shrink-0 md:hidden">{status}</span>
    </>
  );
};

const SchoolCard: React.FC<{
  id: ConcoursType;
  label: string;
  /** null : pas encore chargé (ou chargement raté). */
  count: number | null;
  active: boolean;
  onFilter: () => void;
  onSimulate: () => void;
}> = ({ id, label, count, active, onFilter, onSimulate }) => {
  const layout = 'flex items-center gap-3 p-4 text-start md:flex-col md:items-start md:gap-4 md:p-5';

  // Pas (encore) d'annale : une carte calme, sans bouton qui ne mène nulle part.
  if (!count) {
    const status = count === 0 ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2.5 py-1 text-[12px] font-semibold text-gold-strong ring-1 ring-gold-line">
        <Hourglass className="h-3.5 w-3.5" aria-hidden /> {t('Bientôt')}<span className="sr-only"> {t(': annales en préparation')}</span>
      </span>
    ) : null;
    return (
      <li className={`rounded-2xl border border-line bg-white ${layout}`}>
        <SchoolHead id={id} label={label} status={status} />
      </li>
    );
  }

  const status = (
    <span className="fd-nums inline-flex items-center rounded-full bg-[#f2f1ee] px-2.5 py-1 text-[12px] font-semibold text-ink-soft">
      {count > 1 ? t('{n} annales', { n: count }) : t('{n} annale', { n: count })}
    </span>
  );
  return (
    <li className={`flex flex-col overflow-hidden rounded-2xl border bg-white transition-[border-color,box-shadow] ${
      active ? 'border-ink' : 'border-line hover:border-[#cfc9bf] hover:shadow-[0_6px_16px_rgba(20,18,16,.06)]'}`}>
      <button type="button" onClick={onFilter} aria-pressed={active}
        aria-label={active ? t('Retirer le filtre {label}', { label }) : t('Voir les annales {label}', { label })}
        className={`${layout} flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40`}>
        <SchoolHead id={id} label={label} status={status} />
        <span className={`hidden items-center gap-1 text-[12.5px] font-semibold md:inline-flex ${active ? 'text-ink' : 'text-brand-hover'}`}>
          {active ? <><Check className="h-3.5 w-3.5" /> {t('Filtre actif')}</> : <>{t('Voir les annales')} <ArrowRight className="h-3.5 w-3.5" /></>}
        </span>
      </button>
      <button type="button" onClick={onSimulate} data-tour="concours-simulation"
        className="flex min-h-11 items-center justify-center gap-2 border-t border-line bg-[#fcfbf9] text-[13px] font-semibold text-ink-soft transition-colors hover:bg-[#f7f6f3] hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40">
        <Shuffle className="h-4 w-4" /> {t('Lancer une simulation')}
      </button>
    </li>
  );
};

/* ───────────────────────── Carte d'une annale ───────────────────────── */

const ExamCard: React.FC<{ exam: ConcoursExamListItem }> = ({ exam: e }) => (
  <li>
    <CardLink to={`/concours/exams/${e.id}`} className="h-full">
      <span className="flex h-full flex-col">
        <span className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-[#f2f1ee] px-2.5 py-0.5 text-[11.5px] font-semibold text-ink-soft">{e.concours_type_display}</span>
          <span className="fd-display fd-nums text-[22px] leading-none text-ink">{e.year}</span>
        </span>
        <span className="mt-3 block text-[14.5px] font-semibold leading-snug text-ink line-clamp-2">{e.title}</span>
        {e.description && <span className="mt-1 block text-[12.5px] leading-relaxed text-ink-faint line-clamp-2">{e.description}</span>}
        <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-[12px] text-ink-faint">
          <span className="inline-flex items-center gap-1"><ListChecks className="h-3.5 w-3.5" aria-hidden /> {t('{n} questions', { n: e.question_count })}</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden /> {e.duration_minutes} {t('min')}</span>
          <span className="ms-auto inline-flex items-center gap-1 font-semibold text-brand-hover group-hover:underline">
            {t('Réviser')} <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </span>
      </span>
    </CardLink>
  </li>
);

/* ───────────────────────── Page ───────────────────────── */

export default function ConcoursListPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const raw = searchParams.get('concours');
  const school = CONCOURS_TYPES.some((c) => c.id === raw) ? (raw as ConcoursType) : null;
  const yearMin = searchParams.get('year_min') || '';
  const yearMax = searchParams.get('year_max') || '';

  const [exams, setExams] = useState<ConcoursExamListItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [hasTips, setHasTips] = useState(false);
  const [showSimModal, setShowSimModal] = useState<ConcoursType | null>(null);

  const load = useCallback(() => {
    setFailed(false);
    listConcoursExams()
      .then((data) => {
        setExams(data);
        // Sans annale, les astuces (s'il y en a) valent une action dans l'état vide.
        if (data.length === 0) listConcoursTips().then((tips) => setHasTips(tips.length > 0)).catch(() => undefined);
      })
      .catch((e) => { console.error('listConcoursExams failed', e); setFailed(true); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const setFilter = (changes: Record<string, string | null>, replace = false) => {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(changes)) { if (v) next.set(k, v); else next.delete(k); }
    setSearchParams(next, { replace });
  };

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of exams ?? []) m[e.concours_type] = (m[e.concours_type] ?? 0) + 1;
    return m;
  }, [exams]);

  const years = useMemo(() => {
    const set = new Set((exams ?? []).filter((e) => !school || e.concours_type === school).map((e) => e.year));
    for (const y of [yearMin, yearMax]) if (y && !Number.isNaN(Number(y))) set.add(Number(y));
    return Array.from(set).sort((a, b) => b - a);
  }, [exams, school, yearMin, yearMax]);

  const shown = useMemo(() => (exams ?? []).filter((e) => (!school || e.concours_type === school)
    && (!yearMin || e.year >= Number(yearMin))
    && (!yearMax || e.year <= Number(yearMax))), [exams, school, yearMin, yearMax]);

  const total = exams?.length ?? 0;
  const empty = exams !== null && total === 0 && !failed;
  const filtered = !!(school || yearMin || yearMax);
  const clearAll = () => setFilter({ concours: null, year_min: null, year_max: null });

  const yearSelect = (key: 'year_min' | 'year_max', value: string, label: string) => (
    <label className="inline-flex items-center gap-2 text-[12.5px] text-ink-faint">
      {label}
      <select value={value} onChange={(ev) => setFilter({ [key]: ev.target.value || null }, true)}
        className="fd-nums min-h-10 rounded-xl border border-line bg-white px-3 text-[13px] text-ink focus:border-ink-faint focus:outline-none">
        <option value="">{t('toutes')}</option>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </label>
  );

  return (
    <Page>
      {/* Rien en ligne : page « arrivent bientôt », pas à indexer. */}
      <SEO title={t('Concours - Fidni')} description={t("Préparation aux concours d'entrée de l'ENSA, de l'ENSAM et de médecine.")} noindex={empty} />
      <ConcoursHeader />

      {failed && (
        <div role="alert" className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-4 py-3">
          <p className="flex-1 text-[13.5px] font-medium text-[#a23b34]">{t('Les annales n’ont pas pu se charger. Vérifie ta connexion.')}</p>
          <button type="button" onClick={load} className="fd-btn-ghost min-h-9"><RotateCcw className="h-4 w-4" /> {t('Réessayer')}</button>
        </div>
      )}

      <div className="flex flex-col gap-10">
        {/* Aucune annale en ligne : le message d'abord (avec une vraie piste), les écoles ensuite. */}
        {empty && (
          <EmptyState icon={Hourglass} tone="gold" title={t('Les annales arrivent bientôt')}
            text={t('On prépare les sujets de l’ENSA, de l’ENSAM et de médecine, avec leurs corrigés et des simulations chronométrées. En attendant, le Bac national est le meilleur entraînement.')}
            action={(
              <Link to="/exams/nationaux" className="fd-btn-primary min-h-11">
                <Landmark className="h-4 w-4" /> {t('Réviser le Bac national')}
              </Link>
            )}
            secondary={hasTips ? (
              <Link to="/concours/tips" className="fd-btn-ghost min-h-11">
                <Lightbulb className="h-4 w-4" /> {t('En attendant : les astuces')}
              </Link>
            ) : undefined} />
        )}

        <Section id="ecoles" title={t('Les écoles')}>
          <ul className="grid gap-3 md:grid-cols-3" data-tour="concours-types">
            {CONCOURS_TYPES.map((c) => (
              <SchoolCard key={c.id} id={c.id} label={t(c.label)}
                count={exams === null ? null : counts[c.id] ?? 0}
                active={school === c.id}
                onFilter={() => setFilter({ concours: school === c.id ? null : c.id })}
                onSimulate={() => (isAuthenticated ? setShowSimModal(c.id) : navigate('/login'))} />
            ))}
          </ul>
        </Section>

        {exams === null ? (
          !failed && <CardsSkeleton n={3} className="sm:grid-cols-2 lg:grid-cols-3" />
        ) : total === 0 ? null : (
          <Section id="annales" title={school ? t('Annales {school}', { school: schoolLabel(school) }) : t('Annales')} count={shown.length}
            hint={t('Ouvre un sujet pour le réviser question par question, avec la correction.')}>
            {(years.length > 1 || filtered) && (
              <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2" data-tour="concours-filtres">
                {years.length > 1 || yearMin || yearMax ? (
                  <>
                    {yearSelect('year_min', yearMin, t('Depuis'))}
                    {yearSelect('year_max', yearMax, t('Jusqu’à'))}
                  </>
                ) : null}
                {filtered && shown.length > 0 && (
                  <button type="button" onClick={clearAll} className="inline-flex min-h-10 items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-ink">
                    <X className="h-4 w-4" /> {t('Effacer les filtres')}
                  </button>
                )}
              </div>
            )}
            {shown.length === 0 ? (
              <EmptyState compact icon={SearchX} tone="ink" title={t('Aucune annale pour ce filtre')}
                text={t('Élargis les années ou choisis une autre école.')}
                action={<button type="button" onClick={clearAll} className="fd-btn-ghost min-h-10">{t('Effacer les filtres')}</button>} />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-tour="concours-annales">
                {shown.map((e) => <ExamCard key={e.id} exam={e} />)}
              </ul>
            )}
          </Section>
        )}
      </div>

      {showSimModal && (
        <SimulationModal
          concoursType={showSimModal}
          onClose={() => setShowSimModal(null)}
          onStarted={(sessionId) => navigate(`/concours/simulate/${sessionId}`)}
        />
      )}
    </Page>
  );
}

/* ───────────── Fenêtre « Lancer une simulation » ───────────── */

const MODES: { id: SimulationMode; icon: Icon; label: string; desc: string }[] = [
  { id: 'random_year', icon: Calendar, label: 'Annale aléatoire', desc: 'Une année tirée au hasard.' },
  { id: 'random_mix', icon: Shuffle, label: 'Mix aléatoire', desc: 'Des questions piochées dans toutes les années.' },
];

function SimulationModal({ concoursType, onClose, onStarted }: {
  concoursType: ConcoursType;
  onClose: () => void;
  onStarted: (sessionId: string) => void;
}) {
  const [mode, setMode] = useState<SimulationMode>('random_year');
  const [nQuestions, setNQuestions] = useState(30);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const SchoolIcon = SCHOOLS[concoursType].icon;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const start = async () => {
    try {
      setBusy(true); setErr('');
      const r = await startSimulation({
        mode,
        concours_type: concoursType,
        ...(mode === 'random_mix' ? { n_questions: nQuestions } : {}),
      });
      onStarted(r.session_id);
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setErr(typeof detail === 'string' ? detail : t('Impossible de lancer la simulation.'));
    } finally { setBusy(false); }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="simulation-titre"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(20,18,16,.4)] p-4 backdrop-blur-[4px]"
      onClick={onClose}>
      <div className="fd-card animate-fade-up max-h-[90vh] w-full max-w-[480px] overflow-y-auto p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f2f1ee] text-ink-soft" aria-hidden>
            <SchoolIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 id="simulation-titre" className="fd-display text-[20px] leading-tight text-ink">{t('Lancer une simulation')}</h3>
            <p className="text-[12.5px] text-ink-faint">{t('{school} · chronométrée, corrigés masqués pendant l’épreuve', { school: schoolLabel(concoursType) })}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('Fermer')}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-faint hover:bg-[#f2f1ee] hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div role="radiogroup" aria-label={t('Type de simulation')} className="flex flex-col gap-2">
          {MODES.map(({ id, icon: I, label, desc }) => {
            const on = mode === id;
            return (
              <button key={id} type="button" role="radio" aria-checked={on} onClick={() => setMode(id)}
                className={`flex min-h-14 items-center gap-3 rounded-xl border px-4 py-3 text-start transition-colors ${
                  on ? 'border-brand bg-brand-soft ring-1 ring-brand-line' : 'border-line bg-white hover:border-[#cfc9bf]'}`}>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${on ? 'bg-brand text-white' : 'bg-[#f2f1ee] text-ink-faint'}`} aria-hidden>
                  <I className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold text-ink">{t(label)}</span>
                  <span className="mt-0.5 block text-[12px] text-ink-faint">{t(desc)}</span>
                </span>
                {on && <Check className="h-4 w-4 shrink-0 text-brand" aria-hidden />}
              </button>
            );
          })}
        </div>

        {mode === 'random_mix' && (
          <div className="mt-4 rounded-xl bg-[#fcfbf9] px-4 py-3.5 ring-1 ring-line">
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="simulation-n" className="text-[12.5px] font-semibold text-ink-soft">{t('Nombre de questions')}</label>
              <span className="fd-nums text-[14px] font-bold text-ink">{nQuestions}</span>
            </div>
            <input id="simulation-n" type="range" min={5} max={200} step={5} value={nQuestions}
              onChange={(e) => setNQuestions(Number(e.target.value))} className="w-full accent-[#1a7a4a]" />
            <div className="mt-1 flex items-center justify-between text-[11px] text-ink-faint">
              <span>{t('{n} q', { n: 5 })}</span>
              <span>{t('~{n} min estimées', { n: Math.round(nQuestions * 1.5) })}</span>
              <span>{t('{n} q', { n: 200 })}</span>
            </div>
          </div>
        )}

        {err && <p role="alert" className="mt-3 text-[12.5px] font-medium text-[#a23b34]">{err}</p>}

        <div className="mt-6 flex gap-2">
          <button type="button" className="fd-btn-ghost min-h-11 flex-1 justify-center" onClick={onClose}>{t('Annuler')}</button>
          <button type="button" className="fd-btn-primary min-h-11 flex-1 justify-center disabled:opacity-60" onClick={start} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4" />}
            {t('Lancer')}
          </button>
        </div>
      </div>
    </div>
  );
}

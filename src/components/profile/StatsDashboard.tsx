// src/components/profile/StatsDashboard.tsx
// Onglet « Statistiques » du profil : le bilan au LONG COURS (l'accueil montre la semaine en
// cours). Une seule page lisible au lieu de quatre sous-onglets ; uniquement des chiffres
// enregistrés — l'ancien « score d'impact » (formule inventée) est retiré.
import React, { useEffect, useMemo, useState } from 'react';
import { Clock, BookOpen, PenTool, FileCheck, CheckCircle2, Bookmark, Eye, MessageSquare, ThumbsUp, Layers, Search } from 'lucide-react';
import { api } from '@/lib/api/apiClient';
import { getTaxonomyTimeStats, type TaxonomyTimeItem } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface TimeTrackingData {
  exercise_stats: { total_time_seconds: number; total_time_formatted: string; unique_content_studied: number };
  lesson_stats: { total_time_seconds: number; total_time_formatted: string; unique_content_studied: number };
  exam_stats: { total_time_seconds: number; total_time_formatted: string; unique_content_studied: number };
  overall_stats: { total_time_seconds: number; total_time_formatted: string; current_study_streak: number };
}

interface StatsDashboardProps {
  username: string;
  contributionStats?: {
    exercises: number; solutions: number; comments: number; total_contributions: number;
    upvotes_received: number; view_count: number;
  };
  learningStats?: {
    exercises_completed: number; exercises_in_review: number; exercises_saved: number;
    subjects_studied: string[]; total_viewed: number;
  };
}

type Tax = 'chapter' | 'subfield' | 'theorem';
const TAX_LABEL: Record<Tax, string> = { chapter: 'Chapitres', subfield: 'Sous-domaines', theorem: 'Théorèmes' };

const fmt = (s: number) => {
  if (!s) return '0 min';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h} h ${String(m).padStart(2, '0')}` : m ? `${m} min` : `${s} s`;
};

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ username, contributionStats, learningStats }) => {
  const { user } = useAuth();
  const isOwner = user?.username === username;
  const [time, setTime] = useState<TimeTrackingData | null>(null);
  const [timeState, setTimeState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [tax, setTax] = useState<Tax>('chapter');
  const [taxData, setTaxData] = useState<Record<Tax, TaxonomyTimeItem[] | undefined>>({ chapter: undefined, subfield: undefined, theorem: undefined });
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setTimeState('loading');
    api.get(`/users/${username}/study-stats/`)
      .then((r) => { setTime(r.data); setTimeState('ok'); })
      .catch(() => setTimeState('error'));
  }, [username]);

  // Temps par thème : données de l'utilisateur CONNECTÉ, donc seulement sur son propre profil.
  useEffect(() => {
    if (!isOwner || taxData[tax]) return;
    getTaxonomyTimeStats({ taxonomy_type: tax })
      .then((r) => setTaxData((d) => ({ ...d, [tax]: r.results || [] })))
      .catch(() => setTaxData((d) => ({ ...d, [tax]: [] })));
  }, [tax, isOwner, taxData]);

  const done = learningStats?.exercises_completed ?? 0;
  const failed = learningStats?.exercises_in_review ?? 0;
  const finished = done + failed;

  const taxRows = useMemo(() => {
    const rows = (taxData[tax] ?? []).filter((r) => r.total_time_seconds > 0)
      .filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.total_time_seconds - a.total_time_seconds);
    return rows;
  }, [taxData, tax, search]);
  const taxMax = Math.max(1, ...taxRows.map((r) => r.total_time_seconds));

  const byType = time ? [
    { label: 'Exercices', icon: PenTool, s: time.exercise_stats.total_time_seconds, n: time.exercise_stats.unique_content_studied },
    { label: 'Leçons', icon: BookOpen, s: time.lesson_stats.total_time_seconds, n: time.lesson_stats.unique_content_studied },
    { label: 'Examens', icon: FileCheck, s: time.exam_stats.total_time_seconds, n: time.exam_stats.unique_content_studied },
  ] : [];
  const typeTotal = byType.reduce((t, r) => t + r.s, 0);

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* ── Vue d'ensemble ── */}
      <section aria-label="Vue d’ensemble" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile icon={<Clock className="w-4 h-4" />} label="Temps d’étude" loading={timeState === 'loading'}
          value={time ? fmt(time.overall_stats.total_time_seconds) : '—'} note="mesuré sur les pages de contenu" />
        <Tile icon={<Layers className="w-4 h-4" />} label="Contenus travaillés" loading={timeState === 'loading'}
          value={time ? byType.reduce((t, r) => t + r.n, 0) : '—'} note="exercices, leçons et examens" />
        <Tile icon={<CheckCircle2 className="w-4 h-4" />} label="Exercices validés"
          value={done} note={finished ? `sur ${finished} terminé${finished > 1 ? 's' : ''} (${Math.round((done / finished) * 100)} %)` : 'aucun terminé pour l’instant'} />
        <Tile icon={<Eye className="w-4 h-4" />} label="Contenus consultés"
          value={learningStats?.total_viewed ?? 0} note="pages d’exercices, leçons et examens ouvertes" />
      </section>

      {timeState === 'error' && (
        <p className="rounded-xl border border-line bg-white px-4 py-3 text-[13px] text-ink-faint">
          Le temps d’étude n’a pas pu être chargé. Recharge la page dans un instant.
        </p>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Où va le temps ── */}
        <Panel title="Où va ton temps" subtitle="Temps cumulé par type de contenu, depuis ton inscription.">
          {time && typeTotal > 0 ? (
            <ul className="flex flex-col gap-4">
              {byType.map((r) => {
                const Icon = r.icon;
                const share = Math.round((r.s / typeTotal) * 100);
                return (
                  <li key={r.label}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="inline-flex items-center gap-2 text-[13.5px] font-medium text-ink"><Icon className="w-4 h-4 text-ink-faint" />{r.label}</span>
                      <span className="text-[12.5px] text-ink-faint fd-nums"><b className="text-ink">{fmt(r.s)}</b> · {share} % · {r.n} contenu{r.n > 1 ? 's' : ''}</span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-[#f2f1ee] overflow-hidden">
                      <div className="h-full rounded-full bg-ink" style={{ width: `${Math.max(share, r.s ? 2 : 0)}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyNote text={timeState === 'loading' ? 'Chargement…' : 'Aucun temps d’étude enregistré pour l’instant : il se mesure quand tu travailles sur un exercice, une leçon ou un examen.'} />
          )}
        </Panel>

        {/* ── Bilan des exercices ── */}
        <Panel title="Bilan des exercices" subtitle="Ce que tu as marqué en terminant un exercice.">
          {finished > 0 ? (
            <>
              <div className="flex h-3 rounded-full overflow-hidden gap-[2px] bg-white" role="img"
                aria-label={`${done} validé${done > 1 ? 's' : ''}, ${failed} échoué${failed > 1 ? 's' : ''}`}>
                {done > 0 && <div className="bg-brand" style={{ width: `${(done / finished) * 100}%` }} />}
                {failed > 0 && <div className="bg-gold" style={{ width: `${(failed / finished) * 100}%` }} />}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-ink-faint">
                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-brand" />Validés <b className="text-ink fd-nums">{done}</b></span>
                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-gold" />Échoués, à revoir <b className="text-ink fd-nums">{failed}</b></span>
              </div>
            </>
          ) : (
            <EmptyNote text="Aucun exercice terminé. Quand tu finis un exercice, marque-le « Validé » ou « Échoué » avec le bouton Terminer." />
          )}
          <dl className="mt-5 pt-4 border-t border-line grid grid-cols-2 gap-3">
            <Mini icon={<Bookmark className="w-3.5 h-3.5" />} label="Enregistrés" value={learningStats?.exercises_saved ?? 0} />
          </dl>
        </Panel>
      </div>

      {/* ── Temps par thème (propre profil) ── */}
      {isOwner && (
        <Panel title="Temps par thème" subtitle="Les chapitres, sous-domaines et théorèmes sur lesquels tu as passé le plus de temps.">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div role="tablist" aria-label="Type de thème" className="inline-flex p-1 rounded-xl bg-[#f2f1ee]">
              {(Object.keys(TAX_LABEL) as Tax[]).map((k) => (
                <button key={k} role="tab" aria-selected={tax === k} type="button" onClick={() => { setTax(k); setShowAll(false); }}
                  className={`min-h-[34px] px-3.5 rounded-lg text-[13px] font-semibold transition-colors ${tax === k ? 'bg-white text-ink shadow-sm' : 'text-ink-faint hover:text-ink'}`}>
                  {TAX_LABEL[k]}
                </button>
              ))}
            </div>
            {(taxData[tax]?.length ?? 0) > 8 && (
              <label className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" aria-hidden />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" aria-label="Rechercher un thème"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-line bg-white text-[13px] outline-none focus:border-brand" />
              </label>
            )}
          </div>
          {taxData[tax] === undefined ? (
            <EmptyNote text="Chargement…" />
          ) : taxRows.length === 0 ? (
            <EmptyNote text={search ? 'Aucun résultat.' : `Pas encore de temps enregistré par ${TAX_LABEL[tax].toLowerCase()}.`} />
          ) : (
            <>
              <ul className="flex flex-col gap-3">
                {(showAll ? taxRows : taxRows.slice(0, 8)).map((r) => (
                  <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 items-baseline">
                    <span className="text-[13.5px] font-medium text-ink truncate" title={r.name}>{r.name}</span>
                    <span className="text-[12.5px] font-semibold text-ink fd-nums">{fmt(r.total_time_seconds)}</span>
                    <div className="col-span-2 h-1.5 rounded-full bg-[#f2f1ee] overflow-hidden">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max((r.total_time_seconds / taxMax) * 100, 2)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
              {taxRows.length > 8 && (
                <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-4 text-[13px] font-semibold text-brand-hover hover:underline">
                  {showAll ? 'Voir moins' : `Voir les ${taxRows.length}`}
                </button>
              )}
            </>
          )}
        </Panel>
      )}

      {/* ── Contributions ── */}
      <Panel title="Contributions" subtitle="Ce que tu as apporté à la communauté Fidni.">
        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Mini icon={<PenTool className="w-3.5 h-3.5" />} label="Contenus publiés" value={contributionStats?.exercises ?? 0} big />
          <Mini icon={<MessageSquare className="w-3.5 h-3.5" />} label="Commentaires" value={contributionStats?.comments ?? 0} big />
          <Mini icon={<ThumbsUp className="w-3.5 h-3.5" />} label="Votes reçus" value={contributionStats?.upvotes_received ?? 0} big />
          <Mini icon={<Eye className="w-3.5 h-3.5" />} label="Vues de tes contenus" value={contributionStats?.view_count ?? 0} big />
        </dl>
      </Panel>

      {learningStats?.subjects_studied && learningStats.subjects_studied.length > 0 && (
        <p className="text-[12.5px] text-ink-faint">
          Matières étudiées : {[...new Set(learningStats.subjects_studied)].join(', ')}.
        </p>
      )}
    </div>
  );
};

function Tile({ icon, label, value, note, loading }: { icon: React.ReactNode; label: string; value: React.ReactNode; note?: string; loading?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-white px-4 py-4 min-w-0">
      <div className="flex items-center gap-2 text-ink-faint">
        {icon}<span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-3 text-[26px] font-bold text-ink leading-none fd-nums" style={{ fontFamily: "'DM Mono', ui-monospace, monospace", letterSpacing: '-0.02em' }}>
        {loading ? <span className="inline-block h-6 w-16 rounded bg-[#f2f1ee] animate-pulse align-middle" /> : value}
      </div>
      {note && <p className="mt-2 text-[12px] text-ink-faint leading-snug">{note}</p>}
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 className="text-[15.5px] font-bold text-ink tracking-tight">{title}</h2>
      {subtitle && <p className="text-[12.5px] text-ink-faint mt-1 mb-4 leading-relaxed">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </section>
  );
}

function Mini({ icon, label, value, big }: { icon: React.ReactNode; label: string; value: number; big?: boolean }) {
  return (
    <div className={big ? 'rounded-xl bg-[#faf9f7] px-3.5 py-3' : ''}>
      <dt className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-faint">{icon}{label}</dt>
      <dd className={`mt-1 font-bold text-ink fd-nums ${big ? 'text-[22px]' : 'text-[18px]'}`}>{value.toLocaleString('fr-FR')}</dd>
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <p className="rounded-xl bg-[#faf9f7] border border-dashed border-line px-4 py-4 text-[13px] text-ink-faint leading-relaxed">{text}</p>;
}

export default StatsDashboard;

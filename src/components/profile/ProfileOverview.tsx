// Onglet « Profil » (propriétaire) : qui je suis, pas comment je progresse.
// Parcours (niveau, établissement, matières, ancienneté), objectifs, publications, et un petit
// résumé chiffré avec un lien vers la page Statistiques — qui garde tout le détail.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Pencil } from 'lucide-react';
import { api } from '@/lib/api/apiClient';
import { GoalsCard, PublicationsCard } from './ProfileBilanSection';

interface Props {
  profile: any;
  userType: string;
  school?: string;
  goals?: { subject: number | string; subject_name?: string; min_grade: number | string; max_grade: number | string }[];
  editUrl: string;
  contributions: any[];
}

interface Summary {
  results: { count: number; average: number | null };
  questions: { count: number; success_rate: number | null };
  time: { seconds: number };
  filters: { subjects: { id: number; name: string }[]; levels: { id: number; name: string }[] };
}

const fmtTime = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
};

export const ProfileOverview: React.FC<Props> = ({ profile, userType, school, goals, editUrl, contributions }) => {
  const [summary, setSummary] = useState<Summary | null>(null);
  useEffect(() => {
    api.get('/stats/me/', { params: { period: '30' } }).then((r) => setSummary(r.data)).catch(() => {});
  }, []);

  const since = profile?.joined_at
    ? new Date(profile.joined_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : null;
  const subjects = summary?.filters.subjects.map((s) => s.name) ?? [];
  const levels = summary?.filters.levels.map((l) => l.name) ?? [];

  return (
    <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
      <div className="flex flex-col gap-4 md:col-span-2">
        {/* ── Mon parcours */}
        <section className="fd-card p-5 md:p-6" data-tour="profil-parcours">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="fd-display text-[17px] text-ink">Mon parcours</h2>
            <Link to={editUrl} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-hover hover:underline">
              <Pencil className="h-3.5 w-3.5" /> Modifier
            </Link>
          </div>
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <Fact label="Niveau actuel" value={profile?.class_level_name || <Link to={`${editUrl}#scolarite`} className="font-semibold text-gold-strong hover:underline">À renseigner</Link>} />
            <Fact label="Statut" value={userType === 'teacher' ? 'Enseignant' : 'Élève'} />
            {school && <Fact label="Établissement" value={school} />}
            {since && <Fact label="Sur Fidni depuis" value={since.charAt(0).toUpperCase() + since.slice(1)} />}
            <Fact label="Matières travaillées" value={subjects.length ? subjects.join(', ') : <span className="text-ink-faint">Pas encore</span>} />
            {levels.length > 1 && <Fact label="Niveaux travaillés" value={levels.join(', ')} />}
          </dl>
        </section>

        <PublicationsCard items={contributions.slice(0, 5)} isOwner total={contributions.length} />
      </div>

      <div className="flex flex-col gap-4">
        {/* ── Résumé de progression → page Statistiques */}
        <section className="fd-card p-5 md:p-6" data-tour="profil-resume">
          <h2 className="fd-display text-[17px] text-ink">Ma progression</h2>
          <p className="mt-0.5 text-[12px] text-ink-faint">Sur les 30 derniers jours</p>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
            <Figure label="Moyenne aux examens" value={summary?.results.average != null ? `${String(summary.results.average).replace('.', ',')} / 20` : '—'} />
            <Figure label="Examens réalisés" value={summary ? String(summary.results.count) : '—'} />
            <Figure label="Réussite aux questions" value={summary?.questions.success_rate != null ? `${summary.questions.success_rate} %` : '—'} />
            <Figure label="Temps d’étude" value={summary ? fmtTime(summary.time.seconds) : '—'} />
          </dl>
          <Link to="/statistiques" className="fd-btn-primary mt-5 w-full justify-center">
            <BarChart3 className="h-4 w-4" /> Voir toutes mes statistiques <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        {goals && <GoalsCard goals={goals} editUrl={editUrl} />}
      </div>
    </div>
  );
};

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11.5px] font-semibold uppercase tracking-[.06em] text-ink-faint">{label}</dt>
      <dd className="mt-1 text-[14.5px] font-medium text-ink">{value}</dd>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11.5px] text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-[18px] font-bold text-ink fd-nums">{value}</dd>
    </div>
  );
}

export default ProfileOverview;

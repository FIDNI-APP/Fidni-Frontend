/**
 * Pilotage › Usage › « Appareils » (14/11/2026) : téléphone, tablette ou ordinateur, d'après le navigateur annoncé.
 * Personnes distinctes chaque jour, additionnées sur la période (une personne venue 3 jours = 3 visites), membres et
 * visiteurs non connectés à part. Backend : `appareils` de GET /api/pilotage/ (users/admin_dashboard._appareils).
 */
import React from 'react';
import { Monitor, Smartphone, Tablet, type LucideIcon } from 'lucide-react';

export type AppareilKey = 'telephone' | 'tablette' | 'ordinateur';
export interface AppareilTotaux { visits: number; members: number; anon: number; pages: number }
export interface AppareilsStats {
  since: string;
  current: Record<AppareilKey, AppareilTotaux>;
  previous: Record<AppareilKey, AppareilTotaux> | null;
}

const APPAREILS: { key: AppareilKey; label: string; icon: LucideIcon; bar: string }[] = [
  { key: 'telephone', label: 'Téléphone', icon: Smartphone, bar: 'bg-brand' },
  { key: 'ordinateur', label: 'Ordinateur', icon: Monitor, bar: 'bg-ink/70' },
  { key: 'tablette', label: 'Tablette', icon: Tablet, bar: 'bg-gold' },
];

const fmt = (n: number) => n.toLocaleString('fr-FR');
const pluriel = (n: number, un: string, plusieurs: string) => `${fmt(n)} ${n > 1 ? plusieurs : un}`;

const Ecart: React.FC<{ now: number; before: number | null }> = ({ now, before }) => {
  if (before === null || (now === 0 && before === 0)) return null;
  if (before === 0) return <span className="text-brand">nouveau</span>;
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return <span className="text-ink-faint">stable</span>;
  return <span className={pct > 0 ? 'text-brand' : 'text-[#a23b34]'}>{pct > 0 ? '↑' : '↓'} {Math.abs(pct)} %</span>;
};

export const AppareilsCard: React.FC<{ data: AppareilsStats; days: number }> = ({ data, days }) => {
  const total = APPAREILS.reduce((n, a) => n + data.current[a.key].visits, 0);
  const part = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const debut = new Date(`${data.since}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  // Classés du plus utilisé au moins utilisé (le téléphone d'abord à égalité).
  const lignes = [...APPAREILS].sort((a, b) => data.current[b.key].visits - data.current[a.key].visits);

  return (
    <section className="fd-card p-5" aria-labelledby="pilotage-appareils">
      <h2 id="pilotage-appareils" className="fd-display flex items-center gap-2 text-[16px] text-ink">
        <Smartphone className="h-4 w-4 text-ink-soft" /> Appareils
      </h2>
      <p className="mt-0.5 text-[12px] text-ink-faint">
        Personnes distinctes chaque jour, additionnées sur {days} j, membres et visiteurs. Mesuré depuis le {debut}.
      </p>

      {total === 0 ? (
        <p className="mt-4 text-[13px] text-ink-faint">Pas encore de visite enregistrée : les chiffres arrivent avec les prochaines visites.</p>
      ) : (
        <>
          <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-[#f2f1ee]" role="img"
            aria-label={lignes.map((a) => `${a.label} ${part(data.current[a.key].visits)} %`).join(', ')}>
            {lignes.map((a) => {
              const v = data.current[a.key].visits;
              return v ? <div key={a.key} className={`${a.bar} h-full transition-[width] duration-500`} style={{ width: `${(v / total) * 100}%` }} /> : null;
            })}
          </div>
          <ul className="mt-4 flex flex-col gap-3">
            {lignes.map((a) => {
              const c = data.current[a.key];
              const Icon = a.icon;
              return (
                <li key={a.key} className={c.visits ? '' : 'opacity-60'}>
                  <div className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="inline-flex min-w-0 items-center gap-2 text-ink">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${a.bar}`} aria-hidden />
                      <Icon className="h-3.5 w-3.5 shrink-0 self-center text-ink-faint" aria-hidden />
                      {a.label}
                    </span>
                    <span className="fd-nums shrink-0 text-ink-faint">
                      <b className="text-ink">{part(c.visits)} %</b> · {pluriel(c.visits, 'visite', 'visites')}
                      <span className="ms-2 text-[11.5px]"><Ecart now={c.visits} before={data.previous ? data.previous[a.key].visits : null} /></span>
                    </span>
                  </div>
                  <p className="ms-[34px] mt-0.5 text-[12px] text-ink-faint">
                    {pluriel(c.members, 'membre', 'membres')} · {pluriel(c.anon, 'visiteur', 'visiteurs')} · {pluriel(c.pages, 'page vue', 'pages vues')}
                  </p>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-[11.5px] text-ink-faint">
            Une personne passée du téléphone à l’ordinateur le même jour compte dans les deux. Un iPad récent s’annonce comme un Mac : il compte en ordinateur.
          </p>
        </>
      )}
    </section>
  );
};

export default AppareilsCard;

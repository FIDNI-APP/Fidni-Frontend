// « Mon activité » (13/10/2026, au second plan de « Ma progression ») : les 28 derniers jours, le temps de la semaine,
// les exercices finis, la série et l'objectif quotidien (réglable). Le temps montre l'activité, pas ce qu'on a appris.
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Pencil } from 'lucide-react';
import { api } from '@/lib/api/apiClient';
import { Sheet } from '@/components/space/Sheet';
import { duration, longDate, plural } from './format';
import type { Regularite } from './types';

const GOALS = [10, 15, 20, 30, 45, 60, 90, 120];

export function RegulariteSheet({ open, onClose, regularite, onGoalSaved }: {
  open: boolean; onClose: () => void; regularite: Regularite; onGoalSaved: (minutes: number) => void;
}) {
  const r = regularite;
  const [goal, setGoal] = useState(r.objectif_minutes);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setGoal(r.objectif_minutes); }, [r.objectif_minutes]);
  const diff = Math.round((r.semaine_secondes - r.semaine_precedente) / 60);

  const changeGoal = (minutes: number) => {
    setPicking(false);
    if (minutes === goal) return;
    const before = goal;
    setGoal(minutes);
    setSaving(true);
    api.patch('/settings/', { daily_goal_minutes: minutes })
      .then(() => onGoalSaved(minutes))
      .catch(() => { setGoal(before); toast.error('Ton objectif n’a pas pu être enregistré.'); })
      .finally(() => setSaving(false));
  };

  return (
    <Sheet open={open} onClose={onClose} labelId="activite-titre" title="Mon activité"
      subtitle="Ta régularité sur 4 semaines. Le temps passé montre ton activité, pas ce que tu as appris : c’est ta maîtrise qui le dit.">
      <div className="grid grid-cols-7 gap-1.5" role="img" aria-label={`${r.jours_actifs} jours actifs sur ${r.sur}`}>
        {r.jours.map((j) => (
          <span key={j.date} title={`${longDate(j.date)} : ${j.actif ? `${duration(j.secondes)}${j.evaluations ? `, ${plural(j.evaluations, 'évaluation', 'évaluations')}` : ''}` : 'pas d’activité'}`}
            className={`aspect-square rounded-md ${j.actif ? (j.secondes >= goal * 60 ? 'bg-brand' : 'bg-brand/45') : 'bg-[#efece6]'}`} />
        ))}
      </div>
      <p className="mt-2 text-[12px] text-ink-faint">Vert foncé : objectif du jour atteint. Clair : actif. Gris : pas d’activité.</p>

      <dl className="mt-5 grid grid-cols-2 gap-3">
        <Fact label="Jours actifs" value={`${r.jours_actifs}/${r.sur}`} />
        <Fact label="Série" value={plural(r.serie.actuelle, 'jour', 'jours')} hint={`record : ${plural(r.serie.meilleure, 'jour', 'jours')}`} />
        <Fact label="Cette semaine" value={duration(r.semaine_secondes)}
          hint={r.semaine_precedente ? (diff > 0 ? `${duration(diff * 60)} de plus que la semaine passée` : diff < 0 ? `semaine passée : ${duration(r.semaine_precedente)}` : 'autant que la semaine passée') : undefined} />
        <Fact label="Exercices finis (7 j)" value={String(r.exercices_finis_semaine)} />
      </dl>

      <div className="mt-5">
        <button type="button" onClick={() => setPicking((v) => !v)} aria-expanded={picking} disabled={saving}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-white px-3.5 text-[13px] text-ink-soft transition-colors hover:border-[#cfc9bf] hover:text-ink disabled:opacity-60">
          Objectif : <b className="fd-nums font-semibold text-ink">{goal} min</b> / jour <Pencil className="h-3.5 w-3.5 text-ink-faint" />
        </button>
        {picking && (
          <div role="radiogroup" aria-label="Objectif quotidien" className="mt-3 flex flex-wrap gap-2">
            {[...new Set([...GOALS, goal])].sort((a, b) => a - b).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={m === goal} onClick={() => changeGoal(m)}
                className={`fd-nums min-h-10 min-w-[64px] rounded-full px-3.5 text-[13px] font-semibold transition-colors ${
                  m === goal ? 'bg-ink text-white' : 'border border-line bg-white text-ink-soft hover:border-[#cfc9bf] hover:text-ink'}`}>
                {m} min
              </button>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}

function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-line px-3.5 py-3">
      <dt className="text-[12px] text-ink-faint">{label}</dt>
      <dd className="fd-nums mt-0.5 text-[20px] font-bold text-ink">{value}</dd>
      {hint && <dd className="mt-0.5 text-[11.5px] leading-snug text-ink-faint">{hint}</dd>}
    </div>
  );
}

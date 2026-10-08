// Rappel de l'accueil (« Mon prochain DS », 08/10/2026) : « DS de mathématiques demain : Limites,
// Dérivation », avec le bouton pour réviser. Seulement s'il y a un DS dans les deux semaines.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { devoirsApi, testTitle, whenLabel, type UpcomingTest } from '@/lib/api/devoirsApi';
import { DateTile } from './ui';

export const NextTestReminder: React.FC = () => {
  const [test, setTest] = useState<UpcomingTest | null>(null);
  useEffect(() => {
    let alive = true;
    devoirsApi.next().then((t) => { if (alive) setTest(t); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  if (!test) return null;

  const soon = test.days_left <= 1;
  const names = test.chapters.map((c) => c.name);
  return (
    <section aria-label="Prochain DS"
      className={`flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border px-4 py-3.5 sm:px-5 ${soon ? 'border-[#f0d4cf] bg-[#fdf6f4]' : 'border-line bg-white'}`}>
      <DateTile date={test.date} size="sm" urgent={soon} />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold leading-snug text-ink">
          {testTitle(test)} <span className={soon ? 'text-[#a23b34]' : 'text-ink-soft'}>{whenLabel(test.days_left)}</span>
        </p>
        <p className="mt-0.5 line-clamp-1 text-[13px] text-ink-faint">
          {names.slice(0, 3).join(', ')}{names.length > 3 ? ` et ${names.length - 3} autre${names.length > 4 ? 's' : ''}` : ''}
        </p>
      </div>
      <Link to={`/revisions/ds/${test.id}`} className="fd-btn-primary shrink-0">
        Réviser <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
};

export default NextTestReminder;

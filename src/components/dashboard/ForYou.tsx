// « Pour toi » sur l'accueil (refonte du 11/10/2026) : 3 cartes compactes classées comme les listes
// (GET /api/dashboard/recommended/, things/for_you.py), chacune avec sa raison (« Au programme de ton DS »,
// « À retravailler »…). Onglets Exercices / Leçons / Examens seulement s'il y a des leçons ou des examens.
// Les votes et l'aperçu de l'énoncé sont sur la page du contenu.
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, Sparkles } from 'lucide-react';
import type { RecommendedContent, RecommendedItem } from '@/lib/api/dashboardApi';
import type { Felt } from '@/types/content';
import { CardsSkeleton, EmptyState, Section, SectionLink, Segmented } from '@/components/space/Page';
import { BookmarkButton, DifficultyChip, NationalTag, ProgressPill } from '@/components/content/listing/ListingParts';
import { BASE_PATH, TYPE_LABEL, progressOf, questionProgress, useBookmark, type ListItem, type ListKind } from '@/components/content/listing/listingUtils';
import { trackAction } from '@/lib/usage';
import { t } from '@/i18n';
import { reasonLabel } from './home';

const SHOWN = 3;
const TABS: { key: ListKind; label: string; link: string }[] = [
  { key: 'exercise', label: 'Exercices', link: '/exercises' },
  { key: 'lesson', label: 'Leçons', link: '/lessons' },
  { key: 'exam', label: 'Examens', link: '/exams' },
];

/** Or = à retravailler ; vert = la suite de ton travail ou ton DS ; neutre sinon. */
const reasonTone = (reason: string) => (reason === 'À retravailler' ? 'bg-gold-soft text-gold-strong'
  : reason.startsWith('Suite de ton travail') || reason.includes('DS') ? 'bg-brand-soft text-brand-hover'
    : 'bg-[#f2f1ee] text-ink-soft');

const RecCard: React.FC<{ item: RecommendedItem; kind: ListKind }> = ({ item, kind }) => {
  const listItem = item as unknown as ListItem;
  const { saved, busy, toggle } = useBookmark(listItem, kind);
  const chapter = item.chapters?.[0]?.name;
  const progress = questionProgress(listItem);
  const felt = (item as RecommendedItem & { felt?: Felt | null }).felt ?? null;
  return (
    <li className="relative">
      <Link to={`${BASE_PATH[kind]}/${item.id}`} onClick={() => trackAction('accueil-pour-toi')}
        className="group flex h-full flex-col rounded-2xl border border-line bg-white p-4 pe-12 transition-[border-color,box-shadow] hover:border-[#cfc9bf] hover:shadow-[0_6px_16px_rgba(20,18,16,.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
        <span className="truncate text-[11.5px] font-semibold uppercase tracking-[.06em] text-ink-faint">
          {t(TYPE_LABEL[kind])}{chapter ? ` · ${chapter}` : ''}
        </span>
        <span className="mt-1.5 line-clamp-2 text-[15px] font-semibold leading-snug text-ink group-hover:underline">{item.title}</span>
        <span className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {kind !== 'lesson' && <DifficultyChip difficulty={item.difficulty} felt={felt} />}
          {item.is_national_exam && <NationalTag year={item.national_year} />}
          <ProgressPill progress={progressOf(listItem)} />
          {progress && !progressOf(listItem) && (
            <span className="fd-nums text-[12px] text-ink-faint">{t('{a}/{n} questions', { a: progress.assessed, n: progress.total })}</span>
          )}
        </span>
        {item.reason && (
          <span className="mt-auto pt-3">
            <span className={`inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-[12px] font-semibold ${reasonTone(item.reason)}`}>
              <span className="truncate">{reasonLabel(item.reason)}</span>
            </span>
          </span>
        )}
      </Link>
      <div className="absolute end-2 top-2">
        <BookmarkButton saved={saved} busy={busy} onClick={toggle} />
      </div>
    </li>
  );
};

export const ForYou: React.FC<{
  recs: RecommendedContent | null;
  failed: boolean;
  onRetry: () => void;
  /** Exercices du niveau de l'élève (état vide). */
  exercisesHub: string;
  /** Un prof : pas de « ce que tu as travaillé ». */
  teacher?: boolean;
  /** Déjà montrés juste au-dessus (« À refaire ») : « exercise-12 », « exam-3 » — pas deux fois la même carte. */
  shownAbove?: Set<string>;
}> = ({ recs, failed, onRetry, exercisesHub, teacher = false, shownAbove }) => {
  const [tab, setTab] = useState<ListKind>('exercise');
  const fresh = (kind: ListKind, list: RecommendedItem[] | undefined) =>
    (list ?? []).filter((x) => !shownAbove?.has(`${kind}-${x.id}`));
  const byKind: Record<ListKind, RecommendedItem[]> = {
    exercise: fresh('exercise', recs?.exercises), lesson: recs?.lessons ?? [], exam: fresh('exam', recs?.exams),
  };
  const tabs = TABS.filter((x) => x.key === 'exercise' || byKind[x.key].length > 0);
  const items = byKind[tab].slice(0, SHOWN);
  // Sujets du bac national : « Tout voir » mène à leur page (la liste des examens ne les montre pas).
  const link = tab === 'exam' && items.length && items.every((c) => c.is_national_exam)
    ? '/exams/nationaux' : TABS.find((x) => x.key === tab)!.link;
  const hint = teacher
    ? (recs?.level ? t('Des contenus du niveau {niveau}, à donner à tes élèves.', { niveau: recs.level }) : t('Des contenus de Fidni, à donner à tes élèves.'))
    : (recs?.level ? t('D’après ton niveau ({niveau}) et ce que tu as travaillé.', { niveau: recs.level }) : t('D’après ton niveau et ce que tu as travaillé.'));

  return (
    <div data-tour="home-reco">
      <Section id="pour-toi" title={t('Pour toi')} hint={recs && !failed ? hint : undefined}
        action={recs && items.length > 0 ? <SectionLink to={link}>{t('Tout voir')}</SectionLink> : undefined}>
        {tabs.length > 1 && (
          <div className="mb-3">
            <Segmented label={t('Type de contenu')} value={tab} onChange={setTab}
              options={tabs.map((x) => ({ key: x.key, label: t(x.label) }))} />
          </div>
        )}
        {failed ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-4 py-3">
            <p className="flex-1 text-[13.5px] font-medium text-[#a23b34]">{t('Les contenus choisis pour toi n’ont pas pu se charger.')}</p>
            <button type="button" onClick={onRetry} className="fd-btn-ghost min-h-10"><RotateCcw className="h-4 w-4" /> {t('Réessayer')}</button>
          </div>
        ) : !recs ? (
          <CardsSkeleton n={SHOWN} className="md:grid-cols-3" />
        ) : items.length === 0 ? (
          <EmptyState compact tone="ink" icon={Sparkles} title={t('Rien à te proposer pour l’instant')}
            text={t('Les nouveaux contenus de ton niveau arriveront ici, choisis d’après ton travail.')}
            action={<Link to={exercisesHub} className="fd-btn-ghost min-h-10 text-[13px] font-semibold">{t('Voir les exercices')}</Link>} />
        ) : (
          <ul className="grid gap-3 md:grid-cols-3">
            {items.map((item) => <RecCard key={`${tab}-${item.id}`} item={item} kind={tab} />)}
          </ul>
        )}
      </Section>
    </div>
  );
};

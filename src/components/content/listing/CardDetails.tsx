// Repères des cartes ajoutés le 14/11/2026 (Natsu : « plus stylées et plus informatives ») : type du devoir,
// enseignants, théorèmes utilisés, résultat de l'élève, DS à venir. Calmes : encre et gris, vert pour ce qui est
// réussi ou utile, or pour « à revoir » (direction « cahier et stylo vert », voir fidni-unslop).
import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, School, Sigma } from 'lucide-react';
import type { ContentEnseignant, DevoirInfo, UserProgress } from '@/types/content';
import type { UpcomingTest } from '@/lib/api/devoirsApi';
import { BASE_PATH, type ListKind } from './listingUtils';
import { dateLocale, t } from '@/i18n';
import { trackEnseignantClick } from '@/lib/usage';

// Libellés courts : l'étiquette tient sur une ligne même dans une carte étroite (le titre dit le reste).
const GENRE: Record<NonNullable<DevoirInfo['genre']>, string> = {
  ds: 'DS', controle: 'Contrôle', synthese: 'Synthèse', dm: 'DM', table: 'Sur table', blanc: 'Examen blanc',
};

/** « DS n° 2 », « Devoir maison n° 1 », « Contrôle » (null : rien à dire). */
export const devoirLabel = (d?: DevoirInfo | null): string | null => {
  if (!d?.genre) return null;
  return d.numero ? t('{genre} n° {n}', { genre: t(GENRE[d.genre]), n: d.numero }) : t(GENRE[d.genre]);
};

/** Type du devoir et année scolaire : « DS n° 2 · rattrapage · 2024-2025 ». */
export const DevoirTag: React.FC<{ devoir?: DevoirInfo | null }> = ({ devoir }) => {
  const label = devoirLabel(devoir);
  if (!devoir || (!label && !devoir.annee_scolaire)) return null;
  return (
    <span className="inline-flex max-w-full shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-line bg-white px-2 py-0.5 text-[12px] font-medium text-ink-soft">
      {label && <span className="font-semibold text-ink">{label}</span>}
      {devoir.rattrapage && <><span aria-hidden className="text-ink-faint">·</span>{t('rattrapage')}</>}
      {devoir.annee_scolaire && (
        <>
          {label && <span aria-hidden className="text-ink-faint">·</span>}
          <span className="fd-nums" title={t('Année scolaire {an}', { an: devoir.annee_scolaire })}>{devoir.annee_scolaire.replace(/^(\d{4})-\d{2}(\d{2})$/, '$1-$2')}</span>
        </>
      )}
    </span>
  );
};

/** Initiales d'un nom affiché, sans la civilité : « M. Khalid Haddar » → « KH ». */
const initiales = (nom: string) => nom.replace(/^(M\.|Mme)\s+/, '').split(/[\s-]+/).filter(Boolean)
  .slice(0, 2).map((m) => m[0]).join('').toUpperCase();

/** Liste « tous ses contenus » d'un enseignant (filtre de la liste générale du même type). */
export const enseignantHref = (kind: ListKind, id: number) => `${BASE_PATH[kind]}?enseignants=${id}`;

/**
 * Ligne d'informations sous le titre, comme avant le 14/11 mais avec la signature : enseignants (lien vers tous leurs
 * contenus du même type), établissement, puis questions, durée… Une seule ligne quand la place le permet.
 */
export const MetaLine: React.FC<{
  enseignants?: ContentEnseignant[];
  school?: { name: string; city?: string | null } | null;
  kind: ListKind;
  infos: string[];
  dim?: string;
  title?: string;
}> = ({ enseignants = [], school, kind, infos, dim = '', title }) => {
  const schoolTitle = school
    ? (school.city ? t('Donné au {school} ({city})', { school: school.name, city: school.city }) : t('Donné au {school}', { school: school.name }))
    : undefined;
  const items: React.ReactNode[] = [];
  if (enseignants.length) {
    items.push(
      <span key="ens" title={schoolTitle} className="inline-flex min-w-[6rem] max-w-full shrink items-center gap-1.5">
        <span aria-hidden className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#f2f1ee] text-[8.5px] font-bold tracking-[.02em] text-ink-muted">
          {initiales(enseignants[0].nom)}
        </span>
        <span className="min-w-0 truncate">
          {enseignants.map((e, i) => (
            <React.Fragment key={e.id}>
              {i > 0 && (i === enseignants.length - 1 ? ` ${t('et')} ` : ', ')}
              <Link to={enseignantHref(kind, e.id)} onClick={() => trackEnseignantClick(kind, e.id, 'carte')}
                title={kind === 'exam' ? t('Tous les devoirs de {nom}', { nom: e.nom }) : kind === 'lesson' ? t('Tous les cours de {nom}', { nom: e.nom }) : t('Tous les exercices de {nom}', { nom: e.nom })}
                className="relative z-10 font-medium text-ink-muted underline-offset-[3px] transition-colors hover:text-ink hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
                {e.nom}
              </Link>
            </React.Fragment>
          ))}
        </span>
      </span>,
    );
  }
  if (school && !enseignants.length) {
    items.push(
      <span key="ecole" title={schoolTitle} className="inline-flex min-w-[3rem] max-w-[13rem] shrink-[3] items-center gap-1">
        <School className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate">{school.name}</span>
      </span>,
    );
  }
  infos.forEach((info) => items.push(<span key={info} className="shrink-0 whitespace-nowrap">{info}</span>));
  if (!items.length) return null;
  return (
    <div className={`mt-1.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12.5px] text-ink-faint fd-nums sm:flex-nowrap sm:overflow-hidden ${dim}`} title={title}>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span aria-hidden className="shrink-0">·</span>}
          {it}
        </React.Fragment>
      ))}
    </div>
  );
};

/** Nom court d'un théorème sur une carte : son sigle quand il en a un (« … (TVI) » → « TVI »), sinon sans « Théorème ». */
export const theoremeCourt = (name: string) => {
  const sigle = name.match(/\(([A-ZÀ-Ý]{2,6})\)\s*$/);
  if (sigle) return sigle[1];
  const court = name.replace(/^Théorème\s+(des|du|de la|de l’|de l'|de)\s+/i, '');
  return court === name ? name : court.charAt(0).toUpperCase() + court.slice(1);
};

/** Petite étiquette d'un théorème (nom court, nom entier au survol). */
const TheoremTag: React.FC<{ name: string }> = ({ name }) => (
  <li title={name} className="min-w-0 truncate rounded-md border border-line bg-white px-1.5 py-[1px] text-[11.5px] font-medium text-ink-muted">
    {theoremeCourt(name)}
  </li>
);

/** Théorèmes utilisés (Natsu, 14/11/2026 : montrés sur les cartes), en étiquettes au bas de la carte, juste au-dessus
 *  des « j'aime » (séparés de l'aperçu) : deux, les plus caractéristiques (le serveur les classe), puis « +3 ». */
export const TheoremChips: React.FC<{ theorems?: { id: number; name: string }[]; dim?: string }> = ({ theorems = [], dim = '' }) => {
  if (!theorems.length) return null;
  const rest = theorems.length - 2;
  return (
    <div className={`flex min-w-0 items-center gap-1.5 ${dim}`} title={theorems.map((th) => th.name).join('\n')}>
      <Sigma className="h-3.5 w-3.5 shrink-0 text-ink-faint" aria-label={t('Théorèmes utilisés')} />
      <ul className="flex min-w-0 items-center gap-1.5">
        {theorems.slice(0, 2).map((th) => <TheoremTag key={th.id} name={th.name} />)}
      </ul>
      {rest > 0 && <span className="shrink-0 text-[11.5px] font-medium text-ink-faint fd-nums">+{rest}</span>}
    </div>
  );
};

/** « 4 réussies · 1 à revoir » : barre en segments (réussies, en partie, à revoir, pas encore évaluées). */
export const ResultatEleve: React.FC<{ progress: UserProgress }> = ({ progress }) => {
  const { total, success } = progress;
  const partial = progress.partial ?? 0;
  const review = progress.review ?? Math.max(0, progress.assessed - success - partial);
  const rest = Math.max(0, total - success - partial - review);
  const parts = [
    success ? (success > 1 ? t('{n} réussies', { n: success }) : t('{n} réussie', { n: success })) : null,
    partial ? t('{n} en partie', { n: partial }) : null,
    review ? t('{n} à revoir', { n: review }) : null,
    rest ? t('{n} à faire', { n: rest }) : null,
  ].filter(Boolean) as string[];
  const seg = (n: number, cls: string) => (n > 0 ? <span className={cls} style={{ flexGrow: n }} /> : null);
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span role="img" aria-label={parts.join(', ')}
        className="flex h-1.5 w-[88px] shrink-0 gap-[2px] overflow-hidden rounded-full">
        {seg(success, 'bg-brand')}
        {seg(partial, 'bg-[#8cc3a2]')}
        {seg(review, 'bg-gold')}
        {seg(rest, 'bg-[#efece6]')}
      </span>
      <span className="min-w-0 truncate text-[12.5px] font-medium text-ink-soft fd-nums">{parts.join(' · ')}</span>
    </div>
  );
};

const dateCourte = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long' });

const QUOI: Record<UpcomingTest['kind'], string> = { ds: 'DS', controle: 'contrôle', blanc: 'examen blanc' };
const QUOI_COURT: Record<UpcomingTest['kind'], string> = { ds: 'DS', controle: 'Contrôle', blanc: 'Examen blanc' };
const dateCourteMois = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' });

/** Repère compact « DS · 19 nov. » (en haut de la carte), « Utile pour ton DS du 19 novembre » en infobulle ; mène au
 *  plan de révision de ce DS. */
export const DsChip: React.FC<{ test: UpcomingTest }> = ({ test }) => {
  const quoi = t(QUOI[test.kind] ?? 'DS');
  const long = test.days_left === 0
    ? t('Utile pour ton {quoi} d’aujourd’hui', { quoi })
    : test.days_left === 1
      ? t('Utile pour ton {quoi} de demain', { quoi })
      : t('Utile pour ton {quoi} du {date}', { quoi, date: dateCourte(test.date) });
  const quand = test.days_left === 0 ? t('aujourd’hui') : test.days_left === 1 ? t('demain') : dateCourteMois(test.date);
  return (
    <Link to={`/revisions/ds/${test.id}`} title={long} aria-label={long}
      className="relative z-10 inline-flex items-center gap-1 rounded-md border border-brand-line/80 px-1.5 py-0.5 text-[12px] font-medium text-brand-hover transition-colors hover:border-brand hover:bg-brand-soft/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand before:absolute before:-inset-y-2 before:inset-x-0 before:content-['']">
      <CalendarClock className="h-3 w-3 shrink-0" aria-hidden />
      <span className="whitespace-nowrap">{t(QUOI_COURT[test.kind] ?? 'DS')} · {quand}</span>
    </Link>
  );
};

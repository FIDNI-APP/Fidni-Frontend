/**
 * Corps du profil (09/11/2026), le même pour le propriétaire et les visiteurs : badges, chapitres maîtrisés, activité
 * dans les discussions, publications ; à côté, le défi du jour, les abonnés, ce qu'enseigne un professeur. Le
 * propriétaire voit en plus, à lui seul, le résumé de « Ma progression » et ses objectifs de notes.
 * Les blocs masqués par leur propriétaire arrivent vides du serveur (null) : ils ne s'affichent pas.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, CornerDownRight, Dumbbell, Flame, GraduationCap, HandHeart, Lock, MessageCircle, MessagesSquare, PenLine, School,
} from 'lucide-react';
import { CardLink, EmptyState, Section, SectionLink } from '@/components/space/Page';
import { OuJenSuis } from '@/components/dashboard/OuJenSuis';
import { useApercu } from '@/components/dashboard/useApercu';
import { MathText } from '@/components/skilliq/MathText';
import { timeAgo } from '@/components/discussions/parts';
import { hubPath, profileLevel } from '@/lib/api/hubApi';
import { useAuth } from '@/contexts/AuthContext';
import { canCreateContent } from '@/lib/features';
import type { Badge, ProfilPublic } from '@/lib/api/communauteApi';
import { Medaille, nomPalier } from '@/components/communaute/art';
import { CalendrierDefi } from '@/components/communaute/CalendrierDefi';
import { GoalsList, PublicationsList, type Goal, type PublishedItem } from './ProfileBilanSection';
import { dateLocale, t } from '@/i18n';

type LevelProfile = {
  user_type?: string;
  class_level?: number | string | { id: string | number; name: string } | null;
  class_level_name?: string | null;
} | null | undefined;

/** Résumé de « Ma progression » (propriétaire) : le même bloc « Où j'en suis » que l'accueil. */
const ProgressSummary: React.FC<{ viewerId: string | null; profile: LevelProfile; editUrl: string }> = ({ viewerId, profile, editUrl }) => {
  const { data, failed, reload } = useApercu(viewerId);
  const level = profileLevel({ profile });
  const startUrl = level ? hubPath('exercises', level.slug) : '/exercises';
  if (data && !data.level) {
    return (
      <EmptyState compact icon={GraduationCap} tone="gold" title={t('Indique ton niveau')}
        text={t('Fidni te montre alors ton programme chapitre par chapitre, ce que tu maîtrises et quoi travailler ensuite.')}
        action={<Link to={`${editUrl}#scolarite`} className="fd-btn-primary min-h-10">{t('Indiquer mon niveau')}</Link>} />
    );
  }
  if (data && !data.apercu.commence) {
    return (
      <EmptyState compact icon={Dumbbell} title={t('Ta progression se construit toute seule')}
        text={t('Fais un exercice et dis pour chaque question si tu l’as réussie : tu verras ici où tu en es.')}
        action={<Link to={startUrl} className="fd-btn-primary min-h-10">{t('S’entraîner')} <ArrowRight className="h-4 w-4" /></Link>} />
    );
  }
  return <OuJenSuis data={data} failed={failed} onRetry={reload} variant="profile" />;
};

const Prive: React.FC = () => (
  <span className="inline-flex items-center gap-1 font-sans text-[11.5px] font-medium text-ink-faint">
    <Lock className="h-3 w-3" aria-hidden /> {t('visible de toi seul')}
  </span>
);

/** Ce que dit le palier d'un badge : « Argent · 7 jours d’affilée », « Bronze · 1 publication », « Inscrit avant 2027 ». */
export const textePalier = (b: Pick<Badge, 'id' | 'palier' | 'paliers' | 'unite' | 'un'>) => {
  if (b.id === 'fondateur') return t('Inscrit avant 2027');
  if (!b.palier) return t('À gagner');
  const seuil = b.paliers[b.palier - 1];
  return `${nomPalier(b.palier)} · ${seuil} ${t(seuil === 1 ? b.un : b.unite)}`;
};

const TuileBadge: React.FC<{ badge: Badge; proprietaire: boolean }> = ({ badge: b, proprietaire }) => {
  const prochain = b.paliers[b.palier];
  const progres = proprietaire && b.valeur != null && prochain ? Math.min(1, b.valeur / prochain) : null;
  return (
    <li className={`flex items-center gap-3 rounded-2xl border bg-white p-3 ${b.palier ? 'border-line' : 'border-dashed border-[#d8d4cc]'}`}>
      <Medaille badge={b.id} palier={b.palier} taille={56} />
      <div className="min-w-0 flex-1">
        <p className={`line-clamp-2 text-[14px] font-semibold leading-snug ${b.palier ? 'text-ink' : 'text-ink-soft'}`}>{t(b.nom)}</p>
        <p className="truncate text-[12px] text-ink-faint">{textePalier(b)}</p>
        {progres != null && (
          <div className="mt-1.5">
            <span className="block h-1.5 overflow-hidden rounded-full bg-[#f2f1ee]" aria-hidden>
              <span className="block h-full rounded-full bg-gold" style={{ width: `${Math.round(progres * 100)}%` }} />
            </span>
            <span className="fd-nums mt-1 block text-[11.5px] text-ink-faint">
              {t('{v} / {n} pour le palier {palier}', { v: b.valeur ?? 0, n: prochain, palier: nomPalier(b.palier + 1) })}
            </span>
          </div>
        )}
      </div>
    </li>
  );
};

const Activite: React.FC<{ items: NonNullable<ProfilPublic['activite']>; proprietaire: boolean }> = ({ items, proprietaire }) => {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[#d8d4cc] bg-white p-4 text-[13.5px] text-ink-faint">
        {proprietaire ? (
          <>{t('Aucune discussion pour l’instant.')} <Link to="/discussions" className="font-semibold text-brand-hover hover:underline">{t('Voir les discussions')}</Link></>
        ) : t('Aucune discussion pour l’instant.')}
      </div>
    );
  }
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
      {items.map((a) => (
        <li key={`${a.type}-${a.id}`}>
          <Link to={a.url} className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[#fcfbf9]">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f2f1ee] text-ink-soft" aria-hidden>
              {a.type === 'discussion' ? <MessagesSquare className="h-4 w-4" /> : a.type === 'commentaire' ? <MessageCircle className="h-4 w-4" /> : <CornerDownRight className="h-4 w-4" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] text-ink-faint">
                {a.type === 'discussion' ? t('A lancé une discussion') : a.type === 'commentaire' ? t('A commenté') : t('A répondu')} · {timeAgo(a.date)}
              </span>
              {/* Titre écrit par un membre (souvent en français) : son propre sens d'écriture, même en arabe. */}
              <span dir="auto" className="block text-start">
                <MathText text={a.titre} className="line-clamp-2 text-[14px] font-semibold text-ink group-hover:underline" />
              </span>
            </span>
            {a.utiles > 0 && (
              <span className="fd-nums mt-1 inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[12px] font-semibold text-brand-hover"
                title={t('« Utile »')}>
                <HandHeart className="h-3.5 w-3.5" aria-hidden /> {a.utiles}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
};

const Carte: React.FC<{ titre: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }> = ({ titre, action, children }) => (
  <section className="rounded-2xl border border-line bg-white p-4 sm:p-5">
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="fd-display text-[17px] leading-tight text-ink">{titre}</h2>
      {action}
    </div>
    {children}
  </section>
);

export const ProfilContenu: React.FC<{
  pub: ProfilPublic;
  proprietaire: boolean;
  userType: 'student' | 'teacher';
  profile: LevelProfile;
  goals?: Goal[];
  editUrl: string;
  contributions: PublishedItem[];
  onOuvrirListe: (sens: 'abonnes' | 'abonnements') => void;
}> = ({ pub, proprietaire, userType, profile, goals, editUrl, contributions, onOuvrirListe }) => {
  const { user: viewer } = useAuth();
  const eleve = userType !== 'teacher' && pub.role === 'eleve';
  const badges = pub.badges;
  const obtenus = badges?.filter((b) => b.palier > 0).length ?? 0;
  const montrerPublications = !eleve || contributions.length > 0;

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="flex min-w-0 flex-col gap-10">
        {badges && (badges.length > 0 || proprietaire) && (
          <Section id="badges" title={t('Badges')} count={obtenus}>
            {badges.length === 0 ? (
              <p className="text-[13.5px] text-ink-faint">{t('Aucun badge pour l’instant.')}</p>
            ) : (
              <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {badges.map((b) => <TuileBadge key={b.id} badge={b} proprietaire={proprietaire} />)}
              </ul>
            )}
          </Section>
        )}

        {proprietaire && eleve && (
          <Section id="ma-progression" title={<>{t('Ma progression')} <Prive /></>} action={<SectionLink to="/progression">{t('Tout voir ›')}</SectionLink>}>
            <div data-tour="profil-resume">
              <ProgressSummary viewerId={viewer ? String(viewer.id) : null} profile={profile} editUrl={editUrl} />
            </div>
          </Section>
        )}

        {eleve && pub.chapitres && (pub.chapitres.length > 0 || proprietaire) && (
          <Section id="chapitres" title={t('Chapitres maîtrisés')} count={pub.chapitres.length}>
            {pub.chapitres.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d8d4cc] bg-white p-4 text-[13.5px] text-ink-faint">
                {t('Aucun chapitre maîtrisé pour l’instant.')}{' '}
                <Link to="/progression" className="font-semibold text-brand-hover hover:underline">{t('Ma progression')}</Link>
              </div>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {pub.chapitres.map((c) => (
                  <li key={c.id} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-brand-line bg-brand-soft px-3 text-[13px] font-semibold text-brand-hover">
                    <GraduationCap className="h-4 w-4" aria-hidden /> {c.name}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}

        {pub.activite && (
          <Section id="activite" title={t('Dans les discussions')}>
            <Activite items={pub.activite} proprietaire={proprietaire} />
          </Section>
        )}

        {montrerPublications && (
          <Section id="publications" title={proprietaire ? t('Mes publications') : t('Publications')} count={contributions.length}>
            <PublicationsList items={contributions} isOwner={proprietaire} />
          </Section>
        )}
      </div>

      <aside className="flex flex-col gap-5">
        {/* Pour les autres, seulement s'il y a déjà un défi trouvé (« 0 jour » n'apprend rien à personne). */}
        {pub.defi && (proprietaire || pub.defi.trouves > 0) && (
          <Carte titre={t('Défi du jour')} action={<SectionLink to="/defis">{proprietaire ? t('Faire le défi ›') : t('Voir ›')}</SectionLink>}>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-soft" aria-hidden>
                <Flame className="h-7 w-7 text-[#e07a1f]" />
              </span>
              <div className="min-w-0">
                <p className="fd-nums text-[26px] font-semibold leading-none text-ink">
                  {pub.defi.serie} <span className="text-[13px] font-semibold text-ink-faint">{pub.defi.serie > 1 ? t('jours d’affilée') : t('jour d’affilée')}</span>
                </p>
                <p className="fd-nums mt-1 text-[12.5px] text-ink-faint">
                  {t('Record {r}', { r: pub.defi.record })} · {pub.defi.trouves > 1 ? t('{n} défis trouvés', { n: pub.defi.trouves }) : t('{n} défi trouvé', { n: pub.defi.trouves })}
                </p>
              </div>
            </div>
            <CalendrierDefi debut={pub.defi.debut} jours={pub.defi.jours} />
          </Carte>
        )}

        <Carte titre={t('Abonnés')} action={pub.listes_visibles && pub.abonnes > 0 ? (
          <button type="button" onClick={() => onOuvrirListe('abonnes')} className="inline-flex min-h-10 items-center text-[13px] font-semibold text-brand-hover hover:underline">{t('Tout voir ›')}</button>
        ) : undefined}>
          {!pub.listes_visibles ? (
            <p className="flex items-start gap-2 text-[13px] leading-snug text-ink-faint">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {t('Ce membre valide ses abonnés : sa liste est privée.')}
            </p>
          ) : pub.abonnes === 0 ? (
            <p className="text-[13px] text-ink-faint">{t('Personne pour l’instant.')}</p>
          ) : (
            <button type="button" onClick={() => onOuvrirListe('abonnes')} className="flex items-center gap-3 text-start">
              <span className="flex -space-x-2 rtl:space-x-reverse">
                {pub.apercu_abonnes.slice(0, 6).map((a) => (
                  <span key={a.username} className="inline-flex h-9 w-9 overflow-hidden rounded-full bg-ink text-[13px] font-semibold text-white ring-2 ring-white">
                    {a.avatar ? <img src={a.avatar} alt="" className="h-full w-full object-cover" />
                      : <span className="m-auto">{a.username.charAt(0).toUpperCase()}</span>}
                  </span>
                ))}
              </span>
              <span className="fd-nums text-[13px] text-ink-soft">
                {pub.abonnes > 1 ? t('{n} abonnés', { n: pub.abonnes.toLocaleString(dateLocale()) }) : t('{n} abonné', { n: pub.abonnes })}
              </span>
            </button>
          )}
        </Carte>

        {pub.enseigne && (pub.enseigne.matieres.length > 0 || pub.enseigne.niveaux.length > 0) && (
          <Carte titre={t('Enseigne')}>
            <ul className="flex flex-wrap gap-1.5">
              {pub.enseigne.matieres.map((m) => <li key={m} className="rounded-full bg-gold-soft px-2.5 py-1 text-[12.5px] font-semibold text-gold-strong">{m}</li>)}
              {pub.enseigne.niveaux.map((n) => <li key={n} className="rounded-full border border-line px-2.5 py-1 text-[12.5px] font-medium text-ink-soft">{n}</li>)}
            </ul>
          </Carte>
        )}

        {proprietaire && userType === 'teacher' && (
          <div className="grid gap-3">
            <CardLink to="/classrooms">
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f2f1ee] text-ink-soft" aria-hidden><School className="h-4 w-4" /></span>
                <span className="text-[14px] font-semibold text-ink group-hover:underline">{t('Mes classes')}</span>
              </span>
            </CardLink>
            {canCreateContent(viewer) && (
              <CardLink to="/exercises/new">
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f2f1ee] text-ink-soft" aria-hidden><PenLine className="h-4 w-4" /></span>
                  <span className="text-[14px] font-semibold text-ink group-hover:underline">{t('Proposer un exercice')}</span>
                </span>
              </CardLink>
            )}
          </div>
        )}

        {proprietaire && goals && (
          <Section id="objectifs" title={<>{t('Mes objectifs')} <Prive /></>}
            action={goals.length ? <SectionLink to={`${editUrl}#objectifs`}>{t('Modifier')}</SectionLink> : undefined}>
            <GoalsList goals={goals} editUrl={editUrl} />
          </Section>
        )}
      </aside>
    </div>
  );
};

export default ProfilContenu;

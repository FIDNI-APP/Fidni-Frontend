/**
 * Membres (/membres, menu Communauté). Refonte du 09/11/2026 : trouver quelqu'un d'abord. Trois onglets gardés dans
 * l'adresse (?onglet=) :
 *  - Découvrir : la recherche, puis des visages, comme dans un trombinoscope (ta classe, les professeurs, les élèves de ton
 *    niveau : une rangée chacun et « Tout voir »), et en bas les deux classements ;
 *  - Mon fil : ce que font ceux que tu suis (discussions lancées, badges gagnés, publications) ;
 *  - Abonnés : les demandes à valider, puis tes abonnés.
 * Réservé aux membres connectés (les profils restent publics, la recherche non).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useOpenSignup } from '@/components/auth/SignupPrompt';
import { SEO } from '@/components/layout/SEO';
import { CardsSkeleton, Page, PageHeader, QuietMenu, Section, UnderlineTabs } from '@/components/space/Page';
import { getClassLevels } from '@/lib/api';
import {
  communauteApi, type CarteMembre as Membre, type Decouvrir, type ElementFil, type PageMembres,
} from '@/lib/api/communauteApi';
import { CarteMembre, LigneMembre, profilUrl } from '@/components/communaute/CarteMembre';
import { BoutonSuivre } from '@/components/communaute/BoutonSuivre';
import { ListeMembres } from '@/components/communaute/ListeMembres';
import { useDemandes } from '@/components/communaute/useDemandes';
import { Medaille, libelleBadge } from '@/components/communaute/art';
import { MathText } from '@/components/skilliq/MathText';
import { Avatar, timeAgo } from '@/components/discussions/parts';
import { confirmer } from '@/lib/confirmer';
import { t } from '@/i18n';
import { nomAffiche } from '@/lib/nomAffiche';

type Onglet = 'decouvrir' | 'abonnements' | 'abonnes';
const ONGLETS: Onglet[] = ['decouvrir', 'abonnements', 'abonnes'];

const GRILLE = 'grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
// Une seule rangée par section : ce qui dépasse attend « Tout voir ».
const UNE_RANGEE = 'max-sm:[&>*:nth-child(n+5)]:hidden sm:max-lg:[&>*:nth-child(n+4)]:hidden lg:max-xl:[&>*:nth-child(n+5)]:hidden xl:[&>*:nth-child(n+6)]:hidden';

const Vide: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="py-14 text-center text-[16px] text-ink-soft">{children}</div>
);

/** Le temps du chargement : la forme de ce qui arrive (des visages), pour que rien ne saute ensuite. */
const VisagesSkeleton: React.FC = () => (
  <div className={`${GRILLE} ${UNE_RANGEE} animate-pulse motion-reduce:animate-none`} role="status" aria-busy="true" aria-label={t('Chargement')}>
    {[0, 1, 2, 3, 4].map((i) => (
      <div key={i}>
        <span className="block h-[88px] w-[88px] rounded-full bg-[#efece6]" />
        <span className="mt-3 block h-4 w-24 rounded bg-[#efece6]" />
        <span className="mt-2 block h-3 w-20 rounded bg-[#f2f1ee]" />
      </div>
    ))}
  </div>
);

const Visages: React.FC<{
  titre: string;
  membres: Membre[];
  /** Mène à la liste complète (recherche filtrée). Sans lui : la section se déplie sur place. */
  onVoirTout?: () => void;
}> = ({ titre, membres, onVoirTout }) => {
  const [tout, setTout] = useState(false);
  // Hauteur de doigt, le texte en bas : il s'aligne sur la ligne du titre de la section.
  const lien = 'inline-flex min-h-10 items-end pb-0.5 font-semibold text-brand-hover hover:underline';
  const action = onVoirTout ? <button type="button" onClick={onVoirTout} className={lien}>{t('Tout voir ›')}</button>
    : membres.length > 5 ? <button type="button" onClick={() => setTout((v) => !v)} className={lien}>{tout ? t('Voir moins') : t('Tout voir ›')}</button>
      : undefined;
  return (
    <Section title={t(titre)} action={action}>
      <div className={`${GRILLE} mt-2 ${tout ? '' : UNE_RANGEE}`}>
        {membres.map((m) => <CarteMembre key={m.id} membre={m} />)}
      </div>
    </Section>
  );
};

const Classement: React.FC<{ titre: React.ReactNode; lignes: { membre: Membre; n: number }[]; unite: (n: number) => string }> = ({ titre, lignes, unite }) => (
  <section className="min-w-0">
    <h2 className="fd-display text-[20px] leading-tight text-ink">{titre}</h2>
    <ol className="mt-2">
      {lignes.slice(0, 3).map(({ membre, n }, i) => (
        <li key={membre.id} className="flex items-center gap-3 border-b border-line last:border-0">
          <span className="fd-nums w-4 shrink-0 text-center text-[14px] font-semibold text-ink-faint">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <LigneMembre membre={membre} taille={36}
              droite={<span className="fd-nums shrink-0 text-[14px] font-medium text-ink-soft">{unite(n)}</span>} />
          </div>
        </li>
      ))}
    </ol>
  </section>
);

/* ────── Découvrir ────── */

const OngletDecouvrir: React.FC = () => {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const role = params.get('role') ?? '';
  const niveau = params.get('niveau') ?? '';
  const [saisie, setSaisie] = useState(q);
  const [niveaux, setNiveaux] = useState<{ id: string; name: string }[]>([]);
  const [decouvrir, setDecouvrir] = useState<Decouvrir | null>(null);
  const [resultats, setResultats] = useState<PageMembres | null>(null);
  const [page, setPage] = useState(1);
  const [erreur, setErreur] = useState(false);
  const recherche = !!(q || role || niveau);

  useEffect(() => { getClassLevels().then((l) => setNiveaux(l.map((x) => ({ id: String(x.id), name: x.name })))).catch(() => {}); }, []);
  useEffect(() => { setSaisie(q); }, [q]);

  // Saisie : la recherche part 300 ms après la dernière touche.
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (saisie.trim() === q) return;
      const next = new URLSearchParams(params);
      if (saisie.trim()) next.set('q', saisie.trim()); else next.delete('q');
      setParams(next, { replace: true });
    }, 300);
    return () => window.clearTimeout(id);
  }, [saisie, q, params, setParams]);

  useEffect(() => {
    if (recherche || decouvrir) return;
    communauteApi.decouvrir().then(setDecouvrir).catch(() => setErreur(true));
  }, [recherche, decouvrir]);

  useEffect(() => { setPage(1); setResultats(null); }, [q, role, niveau]);
  useEffect(() => {
    if (!recherche) return;
    let vivant = true;
    communauteApi.membres({ q: q || undefined, role: role || undefined, niveau: niveau || undefined, page })
      .then((r) => { if (vivant) setResultats((prev) => (page > 1 && prev ? { ...r, results: [...prev.results, ...r.results] } : r)); })
      .catch(() => { if (vivant) setErreur(true); });
    return () => { vivant = false; };
  }, [recherche, q, role, niveau, page]);

  const filtrer = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => { if (v) next.set(k, v); else next.delete(k); });
    setParams(next, { replace: false });
  };

  const niveauEleve = useMemo(() => {
    const c = user?.profile?.class_level;
    return c && typeof c === 'object' ? String(c.id) : c ? String(c) : '';
  }, [user]);
  const profs = useMemo(() => {
    const classe = new Set((decouvrir?.classe ?? []).map((m) => m.id));
    return (decouvrir?.profs ?? []).filter((m) => !classe.has(m.id));
  }, [decouvrir]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-11 min-w-[220px] flex-1 items-center gap-2 rounded-xl bg-[#f2f1ee] pe-1 ps-3.5 transition-colors focus-within:bg-white focus-within:ring-2 focus-within:ring-brand/25">
          <Search className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
          <input value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder={t('Chercher un membre par son nom ou son pseudo')}
            aria-label={t('Chercher un membre')} className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-faint" />
          {saisie && (
            <button type="button" onClick={() => setSaisie('')} aria-label={t('Effacer')}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-faint transition-colors hover:text-ink">
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </label>
        <QuietMenu<string> label="Afficher" value={role} onChange={(v) => filtrer({ role: v })} options={[
          { value: '', label: t('Tous') },
          { value: 'eleve', label: t('Élèves') },
          { value: 'prof', label: t('Professeurs') },
        ]} />
        <QuietMenu<string> label="Niveau" value={niveau} onChange={(v) => filtrer({ niveau: v })} options={[
          { value: '', label: t('Tous les niveaux') },
          ...niveaux.map((n) => ({ value: n.id, label: n.name })),
        ]} />
      </div>

      {erreur && <p role="alert" className="mt-6 text-[14px] text-ink-soft">{t('La page n’a pas pu se charger. Vérifie ta connexion.')}</p>}

      {recherche ? (
        <div className="mt-8">
          <button type="button" onClick={() => { setSaisie(''); setParams(new URLSearchParams(), { replace: false }); }}
            className="mb-5 inline-flex min-h-10 items-center text-[14px] font-medium text-ink-faint hover:text-ink">
            {t('‹ Découvrir')}
          </button>
          {resultats === null ? <VisagesSkeleton /> : resultats.results.length === 0 ? (
            <Vide>{t('Aucun membre trouvé')}</Vide>
          ) : (
            <>
              <div className={GRILLE}>{resultats.results.map((m) => <CarteMembre key={m.id} membre={m} />)}</div>
              {resultats.suite && (
                <div className="mt-8 flex justify-center">
                  <button type="button" onClick={() => setPage((p) => p + 1)}
                    className="inline-flex min-h-10 items-center rounded-xl px-4 text-[14px] font-semibold text-ink-soft transition-colors hover:bg-[#f2f1ee] hover:text-ink">
                    {t('Voir plus')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : decouvrir === null ? <div className="mt-10"><VisagesSkeleton /></div> : (
        <div className="mt-9 flex flex-col gap-12">
          {decouvrir.classe.length > 0 && <Visages titre="Ta classe" membres={decouvrir.classe} />}
          {/* Son professeur est déjà dans « Ta classe » : une seule fois par page. */}
          {profs.length > 0 && <Visages titre="Professeurs" membres={profs} onVoirTout={() => filtrer({ role: 'prof' })} />}
          {decouvrir.niveau.length > 0 && (
            <Visages titre="Élèves de ton niveau" membres={decouvrir.niveau}
              onVoirTout={niveauEleve ? () => filtrer({ role: 'eleve', niveau: niveauEleve }) : undefined} />
          )}
          {(decouvrir.utiles.length > 0 || decouvrir.series.length > 0) && (
            <div className="grid grid-cols-1 gap-x-12 gap-y-10 border-t border-line pt-10 md:grid-cols-2">
              {decouvrir.utiles.length > 0 && (
                <Classement titre={<>{t('Les plus utiles')} <span className="font-sans text-[13px] font-medium tracking-normal text-ink-faint">{t('30 jours')}</span></>}
                  lignes={decouvrir.utiles} unite={(n) => (n > 1 ? t('{n} « utile »', { n }) : t('1 « utile »'))} />
              )}
              {decouvrir.series.length > 0 && (
                <Classement titre={t('Meilleures séries du défi')} lignes={decouvrir.series} unite={(n) => t('{n} jours', { n })} />
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};

/* ────── Mon fil ────── */

const PUBLICATION: Record<string, string> = { exercise: 'a publié un exercice', lesson: 'a publié une leçon', exam: 'a publié un devoir' };

const LigneFil: React.FC<{ e: ElementFil }> = ({ e }) => {
  const lien = e.type === 'badge' ? null : e.objet.url;
  return (
    <li className="group relative -mx-3 flex gap-3.5 rounded-2xl px-3 transition-colors hover:bg-[#f7f6f3] sm:gap-4">
      <Link to={profilUrl(e.membre.username)} className="relative z-10 shrink-0 self-start pt-4"><Avatar user={e.membre} size={40} /></Link>
      <div className="min-w-0 flex-1 border-b border-line py-4 group-last:border-transparent">
        <p className="text-[13px] text-ink-faint">
          <Link to={profilUrl(e.membre.username)} className="relative z-10 font-medium text-ink-soft hover:underline">{e.membre.username}</Link>{' '}
          {e.type === 'discussion' ? t('a lancé une discussion') : e.type === 'commentaire' ? t('a commenté') : e.type === 'badge' ? t('a gagné un badge') : t(PUBLICATION[e.objet.type] ?? 'a publié un contenu')}
          {' · '}{timeAgo(e.date)}
        </p>
        {e.type === 'badge' ? (
          <p className="mt-1.5 flex items-center gap-2 text-[16px] font-semibold tracking-[-0.008em] text-ink">
            <Medaille badge={e.objet.id} palier={e.objet.palier} taille={30} />
            {libelleBadge(e.objet)}
          </p>
        ) : (
          <h2 dir="auto" className="mt-1 text-start text-[16px] font-semibold leading-snug tracking-[-0.008em] text-ink">
            <Link to={lien ?? ''} className="before:absolute before:inset-0 before:rounded-2xl before:content-[''] focus:outline-none focus-visible:before:ring-2 focus-visible:before:ring-brand/40">
              <MathText text={e.objet.titre} />
            </Link>
          </h2>
        )}
      </div>
    </li>
  );
};

const OngletFil: React.FC<{ username: string; versDecouvrir: () => void }> = ({ username, versDecouvrir }) => {
  const [fil, setFil] = useState<ElementFil[] | null>(null);
  const [suite, setSuite] = useState<string | null>(null);
  const [nbSuivis, setNbSuivis] = useState(0);
  const [charge, setCharge] = useState(false);
  const [liste, setListe] = useState(false);

  useEffect(() => {
    communauteApi.fil().then((r) => { setFil(r.results); setSuite(r.suite); setNbSuivis(r.suivis); }).catch(() => setFil([]));
  }, [username]);

  const plus = async () => {
    if (!suite) return;
    setCharge(true);
    try {
      const r = await communauteApi.fil(suite);
      setFil((f) => [...(f ?? []), ...r.results]);
      setSuite(r.suite);
    } finally { setCharge(false); }
  };

  if (fil === null) return <CardsSkeleton n={3} />;
  if (nbSuivis === 0) {
    return (
      <Vide>
        {t('Tu ne suis personne pour l’instant')}
        <button type="button" onClick={versDecouvrir} className="mt-3 block w-full text-[14px] font-semibold text-brand-hover hover:underline">{t('Découvrir des membres')}</button>
      </Vide>
    );
  }
  return (
    <div className="max-w-2xl">
      <button type="button" onClick={() => setListe(true)} className="mb-2 inline-flex min-h-10 items-center text-[14px] font-medium text-ink-faint hover:text-ink hover:underline">
        {nbSuivis > 1 ? t('Tu suis {n} membres', { n: nbSuivis }) : t('Tu suis 1 membre')}
      </button>
      {fil.length === 0 ? <Vide>{t('Rien de nouveau pour l’instant.')}</Vide> : (
        <>
          <ul>{fil.map((e, i) => <LigneFil key={`${e.type}-${i}-${e.date}`} e={e} />)}</ul>
          {suite && (
            <div className="mt-4 flex justify-center">
              <button type="button" onClick={plus} disabled={charge}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-[14px] font-semibold text-ink-soft transition-colors hover:bg-[#f2f1ee] hover:text-ink">
                {charge && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} {t('Voir plus')}
              </button>
            </div>
          )}
        </>
      )}
      <ListeMembres username={username} sens={liste ? 'abonnements' : null} proprietaire onClose={() => setListe(false)} />
    </div>
  );
};

/* ────── Abonnés ────── */

const OngletAbonnes: React.FC<{ username: string; onDemandes: (n: number) => void }> = ({ username, onDemandes }) => {
  const [abonnes, setAbonnes] = useState<Membre[] | null>(null);
  const relireAbonnes = useCallback(() => {
    communauteApi.abonnes(username).then((r) => setAbonnes(r.results)).catch(() => setAbonnes((a) => a ?? []));
  }, [username]);
  // Demande acceptée : le nouvel abonné entre dans la liste.
  const { demandes, repondre } = useDemandes(true, (accepte) => { if (accepte) relireAbonnes(); });

  useEffect(() => { relireAbonnes(); }, [relireAbonnes]);
  useEffect(() => { if (demandes) onDemandes(demandes.length); }, [demandes, onDemandes]);

  const retirer = async (m: Membre) => {
    if (!await confirmer(t('Retirer {name} de tes abonnés ?', { name: nomAffiche(m) }), { action: t('Retirer') })) return;
    try { await communauteApi.retirer(m.username); relireAbonnes(); } catch { toast.error(t('Action impossible pour le moment.')); }
  };

  if (demandes === null || abonnes === null) return <CardsSkeleton n={2} />;
  return (
    <div className="flex max-w-2xl flex-col gap-10">
      {demandes.length > 0 && (
        <Section id="demandes" title={t('Demandes')} count={demandes.length}>
          <ul className="divide-y divide-line">
            {demandes.map((m) => (
              <li key={m.id}>
                <LigneMembre membre={m} droite={
                  <span className="flex shrink-0 items-center gap-2">
                    <button type="button" onClick={() => repondre(m, true)} className="fd-btn-primary inline-flex min-h-10 items-center !px-4 !py-0 text-[13px]">
                      {t('Accepter')}
                    </button>
                    <button type="button" onClick={() => repondre(m, false)} className="inline-flex min-h-10 items-center rounded-xl px-3 text-[13px] font-semibold text-ink-faint transition-colors hover:text-ink">
                      {t('Refuser')}
                    </button>
                  </span>
                } />
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Section id="abonnes" title={t('Abonnés')} count={abonnes.length}>
        {abonnes.length === 0 ? <p className="py-4 text-[14px] text-ink-faint">{t('Personne pour l’instant.')}</p> : (
          <ul className="divide-y divide-line">
            {abonnes.map((m) => (
              <li key={m.id}>
                <LigneMembre membre={m} droite={
                  <span className="flex shrink-0 items-center gap-2">
                    {!m.relation.abonne && <BoutonSuivre username={m.username} abonne={null} meSuit discret />}
                    <button type="button" onClick={() => retirer(m)} className="inline-flex min-h-10 items-center rounded-xl px-3 text-[13px] font-semibold text-ink-faint transition-colors hover:text-[#a23b34]">
                      {t('Retirer')}
                    </button>
                  </span>
                } />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
};

export const Membres: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const openSignup = useOpenSignup('membres');
  const [params, setParams] = useSearchParams();
  const demande = params.get('onglet') as Onglet | null;
  const onglet: Onglet = demande && ONGLETS.includes(demande) ? demande : 'decouvrir';
  const [nbDemandes, setNbDemandes] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    communauteApi.reglages().then((r) => setNbDemandes(r.demandes)).catch(() => {});
  }, [isAuthenticated]);

  const choisir = (o: Onglet) => {
    const next = new URLSearchParams();
    if (o !== 'decouvrir') next.set('onglet', o);
    setParams(next);
  };
  const options = useMemo(() => [
    { key: 'decouvrir' as const, label: 'Découvrir' },
    { key: 'abonnements' as const, label: 'Mon fil' },
    { key: 'abonnes' as const, label: 'Abonnés', count: nbDemandes || undefined },
  ], [nbDemandes]);

  const seo = <SEO title={`${t('Membres')} – Fidni`} description={t('Les membres de Fidni : professeurs et élèves.')} noindex />;
  if (isLoading) return <Page>{seo}<CardsSkeleton n={3} /></Page>;
  if (!isAuthenticated || !user) {
    return (
      <Page width="narrow">
        {seo}
        <PageHeader title={t('Membres')} />
        <Vide>
          {t('Connecte-toi pour chercher des membres, suivre des professeurs et des élèves, et voir leur activité.')}
          <button type="button" onClick={() => openSignup('login')} className="fd-btn-primary mx-auto mt-5 flex min-h-10 items-center">{t('Connexion')}</button>
        </Vide>
      </Page>
    );
  }
  return (
    <Page>
      {seo}
      <PageHeader title={t('Membres')} />
      <UnderlineTabs<Onglet> label="Membres" value={onglet} onChange={choisir} options={options} className="mb-6" />
      {onglet === 'decouvrir' && <OngletDecouvrir />}
      {onglet === 'abonnements' && <OngletFil username={user.username} versDecouvrir={() => choisir('decouvrir')} />}
      {onglet === 'abonnes' && <OngletAbonnes username={user.username} onDemandes={setNbDemandes} />}
    </Page>
  );
};

export default Membres;

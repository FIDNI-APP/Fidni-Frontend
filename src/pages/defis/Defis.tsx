// /defis : le défi d'aujourd'hui et les défis précédents. /defis/:date : un défi passé, à retenter (il ne compte plus dans la série).
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, ChevronRight, RotateCcw } from 'lucide-react';
import { DifficultyBars } from '@/components/common/DifficultyBars';
import { DefiPanel, NIVEAU, THEME, dateDefi } from '@/components/defi/DefiPanel';
import { SEO } from '@/components/layout/SEO';
import { Page, PageHeader, Section } from '@/components/space/Page';
import { useAuth } from '@/contexts/AuthContext';
import { defiApi, type Defi, type DefiArchive } from '@/lib/api/defiApi';
import { t } from '@/i18n';

const Erreur: React.FC<{ onRetry: () => void; texte: string }> = ({ onRetry, texte }) => (
  <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-4 py-3">
    <p className="flex-1 text-[13.5px] font-medium text-[#a23b34]">{texte}</p>
    <button type="button" onClick={onRetry} className="fd-btn-ghost min-h-10"><RotateCcw className="h-4 w-4" /> {t('Réessayer')}</button>
  </div>
);

export const Defis: React.FC = () => {
  const { isLoading } = useAuth();
  const [defi, setDefi] = useState<Defi | null>(null);
  const [archives, setArchives] = useState<DefiArchive[] | null>(null);
  const [etat, setEtat] = useState<'charge' | 'pret' | 'erreur'>('charge');

  const charger = useCallback(() => {
    setEtat('charge');
    Promise.all([defiApi.duJour(), defiApi.archives()])
      .then(([d, a]) => { setDefi(d); setArchives(a); setEtat('pret'); })
      .catch(() => setEtat('erreur'));
  }, []);
  useEffect(() => { if (!isLoading) charger(); }, [isLoading, charger]);

  return (
    <Page>
      <SEO title="Défi du jour de maths | Fidni" description="Un problème de maths par jour, le même pour tous les niveaux du lycée, avec des indices et la solution." canonicalUrl="/defis" />
      <PageHeader title={t('Défi du jour')} subtitle={t('Un problème par jour, le même pour tous les niveaux. Les indices t’expliquent les outils à utiliser.')} />
      {etat === 'erreur' ? <Erreur onRetry={charger} texte={t('Les défis n’ont pas pu se charger. Vérifie ta connexion.')} />
        : etat === 'charge' ? <div className="h-64 animate-pulse rounded-2xl border border-line bg-white" role="status" aria-label={t('Chargement')} />
          : (
            <div className="flex flex-col gap-10">
              {defi ? <DefiPanel defi={defi} /> : <p className="rounded-2xl border border-line bg-white p-5 text-[14.5px] text-ink-soft">{t('Pas de défi aujourd’hui. Reviens demain.')}</p>}
              {!!archives?.length && (
                <Section title={t('Défis précédents')} count={archives.length}>
                  <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
                    {archives.map((a) => (
                      <li key={a.date}>
                        <Link to={`/defis/${a.date}`} className="group flex min-h-[60px] items-center gap-3 px-4 py-3 hover:bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand">
                          <span className="min-w-0 flex-1">
                            <span dir="auto" lang="fr" className="block truncate text-[14px] font-semibold text-ink group-hover:underline">{a.titre}</span>
                            <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[12.5px] text-ink-faint">
                              <span>{dateDefi(a.date)}</span> ·
                              <DifficultyBars level={NIVEAU[a.difficulte].level} total={4} size="0.85em" />
                              {t(NIVEAU[a.difficulte].label)} · {t(THEME[a.theme])}
                            </span>
                          </span>
                          {a.statut === 'trouve' && <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand"><Check className="h-3.5 w-3.5" aria-hidden />{t('Trouvé')}</span>}
                          {a.statut === 'rate' && <span className="text-[12.5px] text-ink-faint">{t('Solution vue')}</span>}
                          <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint rtl:rotate-180" aria-hidden />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </div>
          )}
    </Page>
  );
};

export const DefiPasse: React.FC = () => {
  const { date = '' } = useParams();
  const { isLoading } = useAuth();
  const [defi, setDefi] = useState<Defi | null>(null);
  const [etat, setEtat] = useState<'charge' | 'pret' | 'absent' | 'erreur'>('charge');

  const charger = useCallback(() => {
    setEtat('charge');
    setDefi(null);
    defiApi.detail(date).then((d) => { setDefi(d); setEtat('pret'); })
      .catch((e) => setEtat((e as { response?: { status?: number } }).response?.status === 404 ? 'absent' : 'erreur'));
  }, [date]);
  useEffect(() => { if (!isLoading) charger(); }, [isLoading, charger]);

  return (
    <Page>
      <SEO title={defi ? `${defi.titre} | Défi de maths | Fidni` : 'Défi de maths | Fidni'} description="Un problème de maths pour tous les niveaux du lycée, avec des indices et la solution." canonicalUrl={`/defis/${date}`} />
      <PageHeader back={{ to: '/defis', label: t('Défi du jour') }} title={t('Défi précédent')}
        subtitle={defi && !defi.du_jour ? t('Tu peux encore le chercher, mais il ne compte plus dans ta série.') : undefined} />
      {etat === 'erreur' ? <Erreur onRetry={charger} texte={t('Ce défi n’a pas pu se charger. Vérifie ta connexion.')} />
        : etat === 'absent' ? <p className="rounded-2xl border border-line bg-white p-5 text-[14.5px] text-ink-soft">{t('Ce défi n’existe pas.')} <Link to="/defis" className="font-semibold text-brand hover:underline">{t('Voir le défi du jour')}</Link></p>
          : defi ? <DefiPanel key={defi.date} defi={defi} /> : <div className="h-64 animate-pulse rounded-2xl border border-line bg-white" role="status" aria-label={t('Chargement')} />}
    </Page>
  );
};

export default Defis;

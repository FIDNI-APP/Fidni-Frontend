/**
 * En-tête commun des trois onglets Concours (Examens, Mon historique, Astuces), refonte du 11/10/2026 :
 * le même titre partout (il ne saute plus d'un onglet à l'autre) et des onglets en segments, comme
 * le reste de l'espace élève. Remplace ConcoursHero + ConcoursNavTabs.
 */
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, History, Lightbulb, type LucideIcon } from 'lucide-react';
import { PageHeader, Segmented } from '@/components/space/Page';
import { t } from '@/i18n';

type TabPath = '/concours' | '/concours/sessions' | '/concours/tips';

/** Pictogramme d'onglet masqué sur téléphone : les trois onglets tiennent alors sur la largeur de l'écran. */
const wideOnly = (I: LucideIcon) => {
  const Wide = ({ className = '' }: { className?: string }) => <I className={`hidden sm:block ${className}`} aria-hidden />;
  return Wide;
};

const TABS: { key: TabPath; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: '/concours', label: 'Examens', icon: wideOnly(BookOpen) },
  { key: '/concours/sessions', label: 'Mon historique', icon: wideOnly(History) },
  { key: '/concours/tips', label: 'Astuces', icon: wideOnly(Lightbulb) },
];

export function ConcoursHeader() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const value = TABS.find((tab) => tab.key !== '/concours' && pathname.startsWith(tab.key))?.key ?? '/concours';

  return (
    <PageHeader title={t('Concours')} subtitle={t('Prépare l’ENSA, l’ENSAM et la médecine.')}>
      <div className="mt-5" data-tour="concours-onglets">
        <Segmented label={t('Rubriques des concours')} value={value} onChange={(v) => navigate(v)} options={TABS.map((o) => ({ ...o, label: t(o.label) }))} />
      </div>
    </PageHeader>
  );
}

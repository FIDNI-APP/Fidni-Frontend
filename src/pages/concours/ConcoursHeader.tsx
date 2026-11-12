/** Navigation commune au catalogue, à l’historique et aux astuces des concours. */
import { NavLink } from 'react-router-dom';
import { PageHeader } from '@/components/space/Page';
import { t } from '@/i18n';

const TABS = [
  { path: '/concours', label: 'Examens' },
  { path: '/concours/sessions', label: 'Mon historique' },
  { path: '/concours/tips', label: 'Astuces' },
];

export function ConcoursHeader() {
  return (
    <PageHeader title={t('Concours')} subtitle={t('Prépare l’ENSA, l’ENSAM et la médecine.')}>
      <nav aria-label={t('Rubriques des concours')} className="mt-4 flex gap-4 overflow-x-auto border-b border-line sm:gap-6" data-tour="concours-onglets">
        {TABS.map(({ path, label }) => (
          <NavLink key={path} to={path} end={path === '/concours'} className={({ isActive }) =>
            `inline-flex min-h-11 shrink-0 items-center border-b-2 px-1 text-sm font-semibold focus-visible:outline-brand ${isActive ? 'border-brand text-ink' : 'border-transparent text-ink-soft hover:text-ink'}`}>
            {t(label)}
          </NavLink>
        ))}
      </nav>
    </PageHeader>
  );
}

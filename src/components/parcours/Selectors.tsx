/**
 * Parcours : choix du niveau scolaire et de la matière. Seuls les niveaux et matières qui ont un parcours sont
 * proposés (jamais un choix qui mène à une page vide). Matière : segments s'il y en a peu, liste sinon.
 */
import React from 'react';
import { Segmented } from '@/components/space/Page';
import { ChevronDown } from 'lucide-react';
import { t } from '@/i18n';

export interface Option { id: string; name: string }

const SELECT = 'h-11 w-full appearance-none rounded-xl border border-line bg-white ps-3 pe-9 text-[14px] font-medium text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

const Select: React.FC<{ label: string; value: string; options: Option[]; onChange: (id: string) => void }> = ({ label, value, options, onChange }) => (
  <label className="relative block min-w-[180px] flex-1 sm:flex-none">
    <span className="mb-1 block text-[12.5px] font-medium text-ink-faint">{label}</span>
    <span className="relative block">
      <select value={value} onChange={(e) => onChange(e.target.value)} className={SELECT}>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
    </span>
  </label>
);

export const LevelSelector: React.FC<{ value: string; options: Option[]; onChange: (id: string) => void }> = (p) => (
  <Select label={t('Niveau')} {...p} />
);

export const SubjectSelector: React.FC<{ value: string; options: Option[]; onChange: (id: string) => void }> = ({ value, options, onChange }) => {
  if (options.length > 4) return <Select label={t('Matière')} value={value} options={options} onChange={onChange} />;
  return (
    <div>
      <span className="mb-1 block text-[12.5px] font-medium text-ink-faint">{t('Matière')}</span>
      <Segmented label={t('Matière')} value={value} onChange={onChange}
        options={options.map((o) => ({ key: o.id, label: o.name }))} />
    </div>
  );
};

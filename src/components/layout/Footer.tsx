// src/components/layout/Footer.tsx
// Pied de page (11/10/2026) : clair et compact, il suit chaque page. Rubriques, niveaux (adresses
// indexées) et informations légales ; sur téléphone, deux colonnes courtes puis une ligne de liens légaux.
import React from 'react';
import { Link } from 'react-router-dom';
import { LEGAL } from '@/lib/legal';
import { ADS_ENABLED, openConsentBanner } from '@/lib/ads';

const SECTIONS = [
  { to: '/exercises', label: 'Exercices' },
  { to: '/lessons', label: 'Leçons' },
  { to: '/exams', label: 'Devoirs (DS)' },
  { to: '/exams/nationaux', label: 'Bac national corrigé' },
  { to: '/concours', label: 'Concours' },
];

// Pages de niveau (adresses stables, indexées : apps/caracteristics/hubs.py) — orientation et référencement.
const LEVELS = [
  { slug: 'tronc-commun-sciences', name: 'Tronc commun Sciences' },
  { slug: '1ere-bac-sm', name: '1ère Bac SM' },
  { slug: '2eme-bac-sm', name: '2ème Bac SM' },
  { slug: '2eme-bac-pc', name: '2ème Bac PC' },
];

const colLink = 'inline-flex min-h-9 items-center text-[13.5px] text-ink-soft transition-colors hover:text-brand-hover md:min-h-7';
const legalLink = 'inline-flex min-h-9 items-center text-[12.5px] text-ink-faint transition-colors hover:text-ink md:min-h-0';

const Column: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="min-w-0">
    <h2 className="mb-1.5 text-[12px] font-medium tracking-[.01em] text-ink-faint">{title}</h2>
    <ul className="flex flex-col">{children}</ul>
  </div>
);

export const Footer: React.FC = () => (
  <footer className="border-t border-line bg-white print:hidden">
    <div className="mx-auto max-w-6xl px-4 pb-6 pt-8 sm:px-6 md:pb-7 md:pt-10 lg:px-8">
      <div className="grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-[1.3fr_1fr_1fr] md:gap-x-10">
        {/* Nom + une phrase */}
        <div className="col-span-2 md:col-span-1">
          <Link to="/" className="fd-display text-[22px] leading-none text-ink">Fidni</Link>
          <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-ink-faint">
            Exercices, leçons et devoirs de maths corrigés pas à pas, du Tronc commun au Bac. Programme marocain.
          </p>
        </div>

        <Column title="Travailler">
          {SECTIONS.map((s) => (
            <li key={s.to}><Link to={s.to} className={colLink}>{s.label}</Link></li>
          ))}
        </Column>

        <Column title="Exercices par niveau">
          {LEVELS.map((l) => (
            <li key={l.slug}><Link to={`/exercises/niveau/${l.slug}`} className={colLink}>{l.name}</Link></li>
          ))}
        </Column>
      </div>

      {/* Informations légales + copyright, sur une ligne (qui passe à la ligne sur téléphone) */}
      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-0 border-t border-[#f2f1ee] pt-4 md:mt-8">
        <nav aria-label="Informations légales" className="contents">
          <Link to="/mentions-legales" className={legalLink}>Mentions légales</Link>
          <Link to="/terms-of-service" className={legalLink}>Conditions d’utilisation</Link>
          <Link to="/privacy-policy" className={legalLink}>Confidentialité</Link>
          {ADS_ENABLED && (
            <button type="button" onClick={openConsentBanner} className={legalLink}>Gérer les cookies</button>
          )}
          <a href={`mailto:${LEGAL.contactEmail}`} className={legalLink}>Contact</a>
        </nav>
        <p className="fd-nums inline-flex min-h-9 items-center text-[12.5px] text-ink-faint md:ml-auto md:min-h-0">
          &copy; {new Date().getFullYear()} Fidni
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;

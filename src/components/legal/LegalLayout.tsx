// Mise en page commune des pages juridiques : titre, date, sommaire, sections numérotées.
import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LEGAL } from '@/lib/legal';

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

const PAGES = [
  { to: '/mentions-legales', label: 'Mentions légales' },
  { to: '/terms-of-service', label: 'Conditions d’utilisation' },
  { to: '/privacy-policy', label: 'Confidentialité' },
];

export const LegalLayout: React.FC<{ title: string; intro: React.ReactNode; sections: LegalSection[] }> = ({
  title, intro, sections,
}) => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    const target = hash ? document.getElementById(hash.slice(1)) : null;
    if (target) target.scrollIntoView(); else window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <div className="bg-[#faf9f7] min-h-screen pb-16 text-[#1a1a1a]">
      <header className="border-b border-[#e7e3dc] pt-8 pb-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <Link to="/" className="inline-flex items-center text-[#6b6862] hover:text-[#1a1a1a] mb-6 text-sm transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour à Fidni
          </Link>
          <nav className="flex flex-wrap gap-1.5 mb-6" aria-label="Pages juridiques">
            {PAGES.map((p) => (
              <Link key={p.to} to={p.to}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${pathname === p.to
                  ? 'bg-[#1a1a1a] text-white' : 'bg-white border border-[#e7e3dc] text-[#4b4843] hover:border-[#1a1a1a]'}`}>
                {p.label}
              </Link>
            ))}
          </nav>
          <h1 className="fd-display text-3xl md:text-4xl mb-3">{title}</h1>
          <div className="text-[#4b4843] text-base leading-relaxed max-w-2xl">{intro}</div>
          <p className="mt-4 text-sm text-[#9a958c]">Dernière mise à jour : {LEGAL.updated}</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <nav className="bg-white rounded-2xl border border-[#e7e3dc] p-5 mb-6" aria-label="Sommaire">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#8a857d] mb-3"
            style={{ fontFamily: "'DM Mono', ui-monospace, monospace" }}>Sommaire</p>
          <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-[#4b4843] hover:text-[#1a7a4a]">
                  <span className="text-[#9a958c] mr-1.5">{i + 1}.</span>{s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="bg-white rounded-2xl border border-[#e7e3dc] divide-y divide-[#efece6]">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="p-6 md:p-8 scroll-mt-4">
              <h2 className="flex items-baseline gap-3 text-lg font-semibold mb-3">
                <span className="text-[#c0892f] text-sm" style={{ fontFamily: "'DM Mono', ui-monospace, monospace" }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                {s.title}
              </h2>
              <div className="legal-body text-[15px] leading-relaxed text-[#33302b] space-y-3">{s.body}</div>
            </section>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-[#8a857d]">
          Une question ? Écrivez à{' '}
          <a href={`mailto:${LEGAL.contactEmail}`} className="text-[#1a7a4a] underline">{LEGAL.contactEmail}</a>
        </p>
      </main>
    </div>
  );
};

/** Tableau lisible sur mobile (défilement horizontal interne, jamais celui de la page). */
export const LegalTable: React.FC<{ head: string[]; rows: React.ReactNode[][] }> = ({ head, rows }) => (
  <div className="overflow-x-auto -mx-1 px-1">
    <table className="w-full min-w-[560px] text-sm border-collapse">
      <thead>
        <tr>{head.map((h) => (
          <th key={h} className="text-left font-semibold text-[#1a1a1a] border-b border-[#e7e3dc] py-2 pr-3 align-bottom">{h}</th>
        ))}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="align-top">
            {r.map((c, j) => <td key={j} className="border-b border-[#f2efe9] py-2.5 pr-3 text-[#4b4843]">{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

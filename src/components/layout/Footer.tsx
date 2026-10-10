// src/components/Footer.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Shield, BookOpen, BookMarked, Mail, Trophy, ArrowRight, Scale, Cookie, Landmark, GraduationCap } from 'lucide-react';
import { LEGAL } from '@/lib/legal';
import { ADS_ENABLED, openConsentBanner } from '@/lib/ads';
import { LessonIcon } from '@/components/icons/LessonIcon';

// Calm, flat dark-ink footer — one solid colour (no gradient), warm light
// text, green reserved for the single action. Links hover to white.
const linkClass = 'group flex items-center gap-2 text-sm text-[#b8b4ac] hover:text-white transition-colors';
const iconClass = 'w-4 h-4 text-[#8a857d] group-hover:text-[#b8b4ac] transition-colors';
const headingClass = 'text-[#8a857d] uppercase tracking-widest mb-5 text-xs font-semibold';
const MONO = { fontFamily: "'DM Mono', ui-monospace, monospace" };

// Pages de niveau (adresses stables, indexées : apps/caracteristics/hubs.py) — orientation et référencement.
const LEVELS = [
  { slug: 'tronc-commun-sciences', name: 'Tronc commun Sciences' },
  { slug: '1ere-bac-sm', name: '1ère Bac SM' },
  { slug: '2eme-bac-sm', name: '2ème Bac SM' },
  { slug: '2eme-bac-pc', name: '2ème Bac PC' },
];

export const Footer: React.FC = () => {
  return (
    <footer className="bg-ink text-white py-14 border-t border-[#33302b]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Wordmark + description */}
          <div className="space-y-4">
            <h2 className="fd-display text-2xl" style={{ fontWeight: 600, letterSpacing: '-0.02em' }}>Fidni</h2>
            <p className="text-[#9a958c] text-sm leading-relaxed max-w-xs">
              La plateforme de maths des lycéens : exercices, leçons et examens corrigés, du Tronc commun au Bac, programme marocain.
            </p>
            <div className="pt-1">
              {/* « En savoir plus », « À propos », « Accessibilité » menaient vers /about, qui
                  n'existe pas, et les réseaux sociaux vers « # » : retirés en attendant les vraies pages. */}
              <Link
                to="/exercises"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-brand hover:bg-brand-hover text-white transition-colors"
              >
                Commencer à s’entraîner
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Liens utiles */}
          <div>
            <h3 className={headingClass} style={MONO}>
              Liens utiles
            </h3>
            <ul className="space-y-3.5">
              <li>
                <Link to="/exercises" className={linkClass}>
                  <BookOpen className={iconClass} /> Exercices
                </Link>
              </li>
              <li>
                <Link to="/lessons" className={linkClass}>
                  <LessonIcon className={iconClass} /> Leçons
                </Link>
              </li>
              <li>
                <Link to="/exams" className={linkClass}>
                  <BookMarked className={iconClass} /> Devoirs (DS)
                </Link>
              </li>
              <li>
                <Link to="/exams/nationaux" className={linkClass}>
                  <Landmark className={iconClass} /> Bac national corrigé
                </Link>
              </li>
              <li>
                <Link to="/concours" className={linkClass}>
                  <Trophy className={iconClass} /> Concours
                </Link>
              </li>
            </ul>
          </div>

          {/* Exercices par niveau */}
          <div>
            <h3 className={headingClass} style={MONO}>
              Exercices par niveau
            </h3>
            <ul className="space-y-3.5">
              {LEVELS.map((l) => (
                <li key={l.slug}>
                  <Link to={`/exercises/niveau/${l.slug}`} className={linkClass}>
                    <GraduationCap className={iconClass} /> {l.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Informations légales */}
          <div>
            <h3 className={headingClass} style={MONO}>
              Informations légales
            </h3>
            <ul className="space-y-3.5">
              <li>
                <Link to="/mentions-legales" className={linkClass}>
                  <Scale className={iconClass} /> Mentions légales
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className={linkClass}>
                  <FileText className={iconClass} /> Conditions d'utilisation
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className={linkClass}>
                  <Shield className={iconClass} /> Politique de confidentialité
                </Link>
              </li>
              {ADS_ENABLED && (
                <li>
                  <button type="button" onClick={openConsentBanner} className={linkClass}>
                    <Cookie className={iconClass} /> Gérer les cookies
                  </button>
                </li>
              )}
              <li>
                <a href={`mailto:${LEGAL.contactEmail}`} className={linkClass}>
                  <Mail className={iconClass} /> Contact
                </a>
              </li>
            </ul>

          </div>
        </div>

        <div className="mt-12 border-t border-[#33302b] pt-6 text-center">
          <p className="text-sm text-[#8a857d]">
            &copy; {new Date().getFullYear()} Fidni
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

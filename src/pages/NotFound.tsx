import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Compass } from 'lucide-react';

/** Adresse inconnue : avant, l'élève tombait sur une page blanche sans issue. */
export const NotFound: React.FC = () => (
  <div className="max-w-md mx-auto px-4 py-16 sm:py-24 text-center">
    <div className="fd-card p-8">
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#f2f1ee] flex items-center justify-center">
        <Compass className="w-6 h-6 text-ink-soft" />
      </div>
      <h1 className="fd-display text-ink" style={{ fontSize: 23, fontWeight: 600 }}>Page introuvable</h1>
      <p className="text-ink-faint text-sm mt-2 mb-6">
        Ce lien ne mène nulle part : la page a peut-être été déplacée ou supprimée.
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        <Link to="/" className="fd-btn-primary inline-flex">
          Retour à l’accueil <ArrowRight className="w-4 h-4" />
        </Link>
        <Link to="/exercises" className="fd-btn-ghost inline-flex">Voir les exercices</Link>
      </div>
    </div>
  </div>
);

export default NotFound;

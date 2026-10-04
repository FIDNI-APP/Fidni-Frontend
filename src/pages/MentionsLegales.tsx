// Mentions légales (loi n° 2004-575 du 21 juin 2004, LCEN, art. 1-1). Éditeur particulier non
// professionnel : s'il perçoit des revenus (publicité), il devient professionnel et doit publier
// son adresse (ou celle de sa structure) et, le cas échéant, son numéro SIREN.
import React from 'react';
import { Link } from 'react-router-dom';
import { LegalLayout, type LegalSection } from '@/components/legal/LegalLayout';
import { LEGAL } from '@/lib/legal';

const Mail = () => <a href={`mailto:${LEGAL.contactEmail}`} className="text-[#1a7a4a] underline">{LEGAL.contactEmail}</a>;
const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-[#faf9f7] border border-[#efece6] rounded-xl p-4 space-y-0.5">{children}</div>
);

const sections: LegalSection[] = [
  {
    id: 'editeur',
    title: 'Éditeur du site',
    body: (
      <>
        <Card>
          <p><strong>{LEGAL.publisher}</strong>, particulier, à titre non professionnel</p>
          <p>Contact : <Mail /></p>
          <p>Directeur de la publication : {LEGAL.publisher}</p>
        </Card>
        <p>
          Conformément à l’article 1-1, II de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l’économie
          numérique, l’éditeur, personne physique éditant le site à titre non professionnel, ne publie pas son adresse
          personnelle ; ses coordonnées complètes ont été communiquées à l’hébergeur.
        </p>
      </>
    ),
  },
  {
    id: 'hebergement',
    title: 'Hébergement',
    body: (
      <>
        <Card>
          <p><strong>OVH SAS</strong></p>
          <p>2 rue Kellermann, 59100 Roubaix, France</p>
          <p>Serveur, données et fichiers hébergés à Gravelines (France)</p>
          <p>
            <a href="https://www.ovhcloud.com/fr/" target="_blank" rel="noopener noreferrer" className="text-[#1a7a4a] underline">ovhcloud.com</a>
          </p>
        </Card>
        <p>
          Le serveur est administré par l’éditeur ; le site est diffusé par l’intermédiaire de :
        </p>
        <Card>
          <p><strong>Cloudflare, Inc.</strong> (acheminement du site et sécurité)</p>
          <p>101 Townsend Street, San Francisco, CA 94107, États-Unis</p>
          <p>
            <a href="https://www.cloudflare.com/fr-fr/" target="_blank" rel="noopener noreferrer" className="text-[#1a7a4a] underline">cloudflare.com</a>
          </p>
        </Card>
      </>
    ),
  },
  {
    id: 'signalement',
    title: 'Signaler un contenu',
    body: (
      <p>
        Pour signaler un contenu illicite publié sur Fidni, écrivez à <Mail /> en précisant le lien du contenu et la
        raison du signalement (voir les{' '}
        <Link to="/terms-of-service#moderation" className="text-[#1a7a4a] underline">conditions d’utilisation</Link>).
      </p>
    ),
  },
  {
    id: 'donnees',
    title: 'Données personnelles',
    body: (
      <p>
        Le traitement de vos données est décrit dans la{' '}
        <Link to="/privacy-policy" className="text-[#1a7a4a] underline">politique de confidentialité</Link>. Autorité de
        contrôle : Commission nationale de l’informatique et des libertés (CNIL), 3 place de Fontenoy, TSA 80715,
        75334 Paris Cedex 07.
      </p>
    ),
  },
  {
    id: 'credits',
    title: 'Crédits',
    body: (
      <p>
        Polices DM Sans, DM Mono et Fraunces (licence SIL Open Font License 1.1), hébergées par Fidni. Icônes Lucide
        (licence ISC). Rendu des formules mathématiques : KaTeX (licence MIT).
      </p>
    ),
  },
];

export const MentionsLegales: React.FC = () => (
  <LegalLayout
    title="Mentions légales"
    intro={<p>Qui édite Fidni, qui l’héberge, et comment nous joindre.</p>}
    sections={sections}
  />
);

export default MentionsLegales;

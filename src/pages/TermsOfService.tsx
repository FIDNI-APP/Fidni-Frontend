// Conditions générales d'utilisation. Toute modification : changer LEGAL.updated et
// TERMS_VERSION (backend) pour redemander l'accord des comptes existants.
import React from 'react';
import { Link } from 'react-router-dom';
import { LegalLayout, type LegalSection } from '@/components/legal/LegalLayout';
import { LEGAL } from '@/lib/legal';

const ul = 'list-disc pl-5 space-y-1.5';
const Mail = () => <a href={`mailto:${LEGAL.contactEmail}`} className="text-[#1a7a4a] underline">{LEGAL.contactEmail}</a>;

const sections: LegalSection[] = [
  {
    id: 'objet',
    title: 'Objet',
    body: (
      <>
        <p>
          Fidni ({LEGAL.site}) est une plateforme gratuite d’exercices, de leçons et d’annales de mathématiques, où
          élèves et enseignants peuvent aussi publier, commenter et proposer des solutions. Elle est éditée par{' '}
          {LEGAL.publisher}, particulier (voir les{' '}
          <Link to="/mentions-legales" className="text-[#1a7a4a] underline">mentions légales</Link>).
        </p>
        <p>
          Les présentes conditions encadrent l’utilisation de Fidni. En créant un compte, vous les acceptez, ainsi que
          la <Link to="/privacy-policy" className="text-[#1a7a4a] underline">politique de confidentialité</Link>.
          Consulter le site sans compte implique de respecter les règles de conduite ci-dessous.
        </p>
      </>
    ),
  },
  {
    id: 'compte',
    title: 'Compte et âge minimum',
    body: (
      <ul className={ul}>
        <li>
          Si vous avez moins de 15 ans, vous devez avoir l’accord d’un de vos parents (ou d’un représentant légal)
          pour créer un compte. Ce parent peut à tout moment demander la suppression du compte.
        </li>
        <li>Les informations de votre profil (prénom, nom, établissement) doivent être exactes.</li>
        <li>
          Votre compte est personnel. Gardez votre mot de passe secret ; si vous pensez qu’il a été utilisé par
          quelqu’un d’autre, changez-le et prévenez-nous.
        </li>
        <li>Vous pouvez supprimer votre compte à tout moment depuis vos paramètres.</li>
      </ul>
    ),
  },
  {
    id: 'service',
    title: 'Le service',
    body: (
      <p>
        Fidni est gratuit. Nous faisons de notre mieux pour qu’il soit disponible et que ses contenus soient justes,
        mais nous ne pouvons pas le garantir : le site peut être interrompu (maintenance, panne) et évoluer, et un
        exercice ou un corrigé peut contenir une erreur. Signalez-la en commentaire ou par e-mail. Fidni est un outil
        d’entraînement : il ne garantit aucun résultat à un examen ou à un concours.
      </p>
    ),
  },
  {
    id: 'conduite',
    title: 'Règles de conduite',
    body: (
      <>
        <p>Sur Fidni, il est interdit de publier ou de faire :</p>
        <ul className={ul}>
          <li>des propos injurieux, haineux, discriminatoires, violents, à caractère sexuel, ou du harcèlement ;</li>
          <li>les informations personnelles d’une autre personne (nom complet, téléphone, adresse, photo…) sans son accord ;</li>
          <li>des contenus copiés sans autorisation (manuels, sujets ou corrigés payants, travaux d’autrui) ;</li>
          <li>de la publicité, du spam, des liens trompeurs ou malveillants ;</li>
          <li>toute tentative d’accès non autorisé, de perturbation du site ou de collecte automatisée massive ;</li>
          <li>l’usurpation de l’identité d’une autre personne, élève ou enseignant.</li>
        </ul>
        <p>Plus largement, tout contenu contraire à la loi est interdit.</p>
      </>
    ),
  },
  {
    id: 'publications',
    title: 'Vos publications',
    body: (
      <>
        <p>
          Vous restez l’auteur de ce que vous publiez (exercices, solutions, commentaires, photos) et vous garantissez
          avoir le droit de le publier. En publiant, vous autorisez Fidni, gratuitement et pour le monde entier, à
          héberger, afficher, reproduire et mettre en forme votre publication sur le site, y compris dans les
          feuilles d’exercices en PDF que les membres téléchargent, pour toute la durée des droits d’auteur.
        </p>
        <p>
          Cette autorisation se poursuit si vous supprimez votre compte : vos publications restent en ligne sous le
          nom « Compte supprimé », sans lien avec vous. Pour qu’une publication disparaisse, supprimez-la avant de
          supprimer votre compte, ou écrivez-nous.
        </p>
      </>
    ),
  },
  {
    id: 'moderation',
    title: 'Signalements et modération',
    body: (
      <>
        <p>
          Fidni héberge les publications de ses membres sans les vérifier avant leur mise en ligne. Pour signaler un
          contenu illicite ou contraire à ces règles, écrivez à <Mail /> en indiquant : le lien du contenu, la raison
          du signalement et, si possible, vos nom et adresse e-mail. Nous l’examinons rapidement et vous informons de
          la suite donnée.
        </p>
        <p>
          En cas de manquement, nous pouvons retirer un contenu, suspendre un compte ou le supprimer ; la personne
          concernée est informée du motif, sauf si la loi s’y oppose, et peut le contester en répondant par e-mail.
          Un compte supprimé par la modération est effacé avec <strong>toutes</strong> ses publications.
        </p>
      </>
    ),
  },
  {
    id: 'propriete',
    title: 'Propriété intellectuelle de Fidni',
    body: (
      <p>
        Le nom Fidni, le logo, le design, le code et les contenus publiés par Fidni sont protégés. Vous pouvez les
        utiliser librement pour apprendre ou enseigner (y compris imprimer des feuilles d’exercices pour une classe),
        mais pas les reproduire massivement ni les revendre sans autorisation. Les sujets officiels d’examens restent
        la propriété de leurs auteurs.
      </p>
    ),
  },
  {
    id: 'responsabilite',
    title: 'Responsabilité',
    body: (
      <p>
        Chaque membre est responsable de ce qu’il publie. Fidni retire promptement tout contenu manifestement
        illicite qui lui est signalé. Fidni ne peut être tenu responsable d’une indisponibilité du site, de la perte
        de données non causée par sa faute, ni du contenu des sites externes vers lesquels renvoient des liens.
        Rien dans ces conditions ne limite les droits que la loi vous garantit.
      </p>
    ),
  },
  {
    id: 'modifications',
    title: 'Modifications des conditions',
    body: (
      <p>
        Ces conditions peuvent évoluer, par exemple si de nouvelles fonctions sont ajoutées. En cas de modification
        importante, votre accord vous est demandé à votre prochaine visite ; si vous refusez, vous pouvez supprimer
        votre compte.
      </p>
    ),
  },
  {
    id: 'droit',
    title: 'Droit applicable et litiges',
    body: (
      <p>
        Ces conditions sont soumises au droit français. En cas de désaccord, écrivez-nous d’abord à <Mail /> : nous
        chercherons une solution amiable. À défaut, le litige sera porté devant les tribunaux compétents selon les
        règles de droit commun ; si vous êtes consommateur, vous gardez la protection des règles impératives de votre
        pays de résidence.
      </p>
    ),
  },
];

export const TermsOfService: React.FC = () => (
  <LegalLayout
    title="Conditions d’utilisation"
    intro={<p>Les règles du jeu sur Fidni : ce que vous pouvez attendre du site, et ce que le site attend de vous.</p>}
    sections={sections}
  />
);

export default TermsOfService;

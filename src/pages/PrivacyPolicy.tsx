// Politique de confidentialité (RGPD, art. 13 et 14). Toute modification : changer LEGAL.updated
// et TERMS_VERSION (backend) pour redemander l'accord des comptes existants.
import React from 'react';
import { Link } from 'react-router-dom';
import { LegalLayout, LegalTable, type LegalSection } from '@/components/legal/LegalLayout';
import { LEGAL } from '@/lib/legal';

const ul = 'list-disc pl-5 space-y-1.5';
const Mail = () => <a href={`mailto:${LEGAL.contactEmail}`} className="text-[#1a7a4a] underline">{LEGAL.contactEmail}</a>;

const sections: LegalSection[] = [
  {
    id: 'responsable',
    title: 'Qui est responsable de vos données ?',
    body: (
      <>
        <p>
          Fidni est édité par <strong>{LEGAL.publisher}</strong>, particulier résidant en France, qui est le
          responsable du traitement de vos données personnelles au sens du Règlement général sur la protection
          des données (RGPD). Fidni n’a pas désigné de délégué à la protection des données : pour toute question,
          écrivez directement à <Mail />.
        </p>
      </>
    ),
  },
  {
    id: 'donnees',
    title: 'Données collectées, pourquoi et combien de temps',
    body: (
      <>
        <p>Nous ne collectons que ce qui sert à faire fonctionner Fidni :</p>
        <LegalTable
          head={['Données', 'À quoi elles servent', 'Base légale', 'Conservation']}
          rows={[
            ['Nom d’utilisateur, e-mail, mot de passe (chiffré, jamais lisible)',
              'Créer et sécuriser votre compte, vous envoyer les e-mails indispensables (vérification, mot de passe oublié)',
              'Exécution du contrat (CGU)', 'Jusqu’à la suppression du compte'],
            ['Prénom, nom, établissement, niveau, profil élève ou enseignant',
              'Personnaliser les feuilles d’exercices en PDF, les classes et le suivi. Visibles de vous seul, sauf des enseignants de vos classes',
              'Exécution du contrat', 'Jusqu’à la suppression du compte'],
            ['Civilité, Monsieur ou Madame (réponse facultative : « Je préfère ne pas le dire »)',
              'Uniquement la civilité (M. / Mme) sur les feuilles en PDF',
              'Consentement', 'Jusqu’à la suppression du compte ou modification'],
            ['Date de naissance',
              'Vérifier l’âge minimum (accord d’un parent avant 15 ans) et adapter les contenus au niveau. Visible de vous seul, jamais publique',
              'Exécution du contrat', 'Jusqu’à la suppression du compte'],
            ['Photo de profil, biographie, ville, matières, objectifs et notes que vous saisissez',
              'Votre profil et vos recommandations', 'Consentement (tout est facultatif)', 'Jusqu’à la suppression du compte'],
            ['Progression, réponses, temps d’étude, favoris, listes de révision, classes rejointes',
              'Le cœur du service : suivi, statistiques, révisions', 'Exécution du contrat', 'Jusqu’à la suppression du compte'],
            ['Publications : exercices, commentaires, solutions, photos jointes',
              'Les partager avec les autres membres', 'Exécution du contrat',
              'Voir « Suppression du compte » ci-dessous'],
            ['Journaux techniques : adresse IP, pages et requêtes, navigateur, erreurs',
              'Sécurité, lutte contre les abus, correction des bugs', 'Intérêt légitime', '6 mois, puis suppression automatique'],
            ['Cookies publicitaires de Google, uniquement si vous cliquez « Accepter »',
              'Afficher des annonces, éventuellement personnalisées, limiter leur répétition, lutter contre la fraude',
              'Consentement', 'Votre choix : 6 mois ; cookies Google : 13 mois maximum'],
            ['Date et version des conditions acceptées, accord sur l’âge',
              'Prouver votre accord', 'Obligation de pouvoir démontrer le consentement (RGPD, art. 7)', 'Jusqu’à la suppression du compte'],
          ]}
        />
        <p>
          <strong>Comptes inactifs :</strong> un compte sans aucune connexion pendant 3 ans est supprimé.
        </p>
        <p>
          <strong>Ce que nous ne faisons pas :</strong> nous ne vendons ni ne louons vos données, nous
          n’utilisons pas d’outil de mesure d’audience tiers et aucune décision vous concernant n’est prise de façon
          automatisée. Vos informations de compte ne sont jamais transmises aux régies publicitaires.
        </p>
      </>
    ),
  },
  {
    id: 'suppression',
    title: 'Suppression du compte',
    body: (
      <>
        <p>
          Vous pouvez supprimer votre compte à tout moment depuis <em>Profil → Paramètres → Mes données</em>. Sont alors
          effacés : votre profil, votre e-mail, votre photo, votre progression, vos favoris, vos votes et vos fichiers
          non publiés.
        </p>
        <p>
          Vos publications (exercices, commentaires, solutions) restent visibles pour ne pas priver les autres membres
          de leur contenu, mais elles sont rattachées à un compte anonyme « Compte supprimé » : plus rien ne permet de
          les relier à vous par le site. Si vous souhaitez qu’une publication soit aussi effacée, supprimez-la avant la
          suppression du compte ou écrivez-nous.
        </p>
        <p>
          Un compte supprimé par la modération (contenu inapproprié) est effacé avec toutes ses publications.
        </p>
      </>
    ),
  },
  {
    id: 'destinataires',
    title: 'Qui a accès à vos données ?',
    body: (
      <>
        <p>
          <strong>Les autres membres</strong> voient uniquement votre profil public : nom d’utilisateur, photo,
          biographie, publications et, si vous l’activez, vos statistiques. Vos prénom, nom, établissement, civilité,
          date de naissance et e-mail ne sont jamais publics. Les enseignants des classes que vous rejoignez voient votre nom et votre
          progression sur les travaux de la classe.
        </p>
        <p><strong>Nos prestataires techniques</strong> (sous-traitants), qui n’agissent que sur nos instructions :</p>
        <ul className={ul}>
          <li><strong>OVH SAS</strong> (Roubaix, France) : hébergement du site, de la base de données et des fichiers, à Gravelines (France).</li>
          <li><strong>Cloudflare, Inc.</strong> (États-Unis) : acheminement sécurisé du site et protection contre les attaques.</li>
          <li><strong>Brevo</strong> (Sendinblue SAS, France) : envoi des e-mails du compte.</li>
          <li>
            <strong>Google AdSense</strong> (Google Ireland Ltd) : affichage des publicités, uniquement si vous
            les acceptez. Google agit alors comme responsable de traitement distinct pour ses cookies :{' '}
            <a href="https://policies.google.com/technologies/partner-sites?hl=fr" target="_blank" rel="noopener noreferrer"
              className="text-[#1a7a4a] underline">comment Google utilise ces données</a>.
          </li>
          <li>
            <strong>YouTube</strong> (Google Ireland Ltd) : lecture des vidéos intégrées, en mode « sans cookie » ;
            YouTube ne reçoit des données qu’au moment où vous lancez une vidéo.
          </li>
          <li>
            <strong>OpenAI</strong> (États-Unis) : correction expérimentale de copies par intelligence artificielle,
            aujourd’hui réservée à l’administrateur. Si elle vous est un jour proposée, elle restera facultative et
            cette politique sera mise à jour avant.
          </li>
        </ul>
        <p>Vos données peuvent enfin être communiquées aux autorités si la loi l’impose.</p>
      </>
    ),
  },
  {
    id: 'transferts',
    title: 'Transferts hors de l’Union européenne',
    body: (
      <p>
        Vos données sont stockées dans l’Union européenne (Gravelines, France). Certains prestataires sont établis aux États-Unis
        (Cloudflare, Google pour les publicités si vous les acceptez, et OpenAI si la fonction d’IA est utilisée) : ces transferts sont encadrés par le cadre de
        protection des données UE–États-Unis (Data Privacy Framework) et par les clauses contractuelles types de la
        Commission européenne.
      </p>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies et stockage local',
    body: (
      <>
        <p>
          <strong>Sans votre accord</strong>, Fidni n’utilise que le stockage local de votre navigateur, pour des
          éléments strictement nécessaires ou que vous avez choisis, exemptés de consentement :
        </p>
        <ul className={ul}>
          <li>vos jetons de connexion (pour rester connecté) ;</li>
          <li>vos préférences d’affichage : thème, tri, vue en liste, réglages des feuilles en PDF ;</li>
          <li>votre choix sur les cookies publicitaires (conservé 6 mois).</li>
        </ul>
        <p>
          Cloudflare peut déposer un cookie technique de sécurité (détection des robots). Les polices de caractères
          sont hébergées par Fidni : aucune requête n’est envoyée à Google Fonts. Aucun outil de mesure d’audience
          n’est utilisé.
        </p>
        <p>
          <strong>Publicités.</strong> Fidni est gratuit et se finance par des annonces Google AdSense. Un bandeau vous
          demande votre accord à la première visite : tant que vous n’avez pas cliqué « Accepter », aucun script ni
          cookie de Google n’est chargé. Si vous refusez, vous n’avez pas de publicité et le site fonctionne de la
          même façon. Si vous acceptez, Google peut choisir les annonces selon vos centres d’intérêt, déduits de votre
          navigation sur les sites partenaires de Google (jamais de vos données de compte Fidni), et utilise des
          cookies pour limiter leur répétition, mesurer leur affichage et lutter contre la fraude. Vous pouvez aussi
          régler la personnalisation sur{' '}
          <a href="https://myadcenter.google.com/" target="_blank" rel="noopener noreferrer" className="text-[#1a7a4a] underline">myadcenter.google.com</a>. Les moins de 15 ans doivent demander à un
          parent avant d’accepter. Vous pouvez changer d’avis à tout moment avec le lien <em>Gérer les cookies</em>{' '}
          en bas de chaque page.
        </p>
      </>
    ),
  },
  {
    id: 'mineurs',
    title: 'Élèves de moins de 15 ans',
    body: (
      <p>
        Fidni s’adresse notamment à des collégiens et lycéens. Conformément à l’article 45 de la loi Informatique et
        Libertés, un élève de moins de 15 ans ne peut s’inscrire qu’avec l’accord d’un de ses parents (ou d’un
        représentant légal) : il le confirme en cochant la case prévue à l’inscription. Un parent peut exercer à tout
        moment les droits décrits ci-dessous au nom de son enfant, et demander la suppression de son compte, en
        écrivant à <Mail />.
      </p>
    ),
  },
  {
    id: 'droits',
    title: 'Vos droits',
    body: (
      <>
        <p>Vous disposez des droits suivants sur vos données :</p>
        <ul className={ul}>
          <li><strong>Accès et portabilité :</strong> téléchargez toutes vos données dans <em>Paramètres → Mes données</em>.</li>
          <li><strong>Rectification :</strong> modifiez vos informations dans <em>Paramètres</em>.</li>
          <li><strong>Effacement :</strong> supprimez votre compte dans <em>Paramètres → Mes données</em>.</li>
          <li><strong>Opposition et limitation</strong> du traitement, et <strong>retrait du consentement</strong> à tout moment.</li>
          <li><strong>Directives</strong> sur le sort de vos données après votre décès.</li>
        </ul>
        <p>
          Pour tout autre demande, écrivez à <Mail /> : nous répondons dans un délai d’un mois. Nous pourrons vous
          demander de confirmer votre identité (par exemple en écrivant depuis l’adresse de votre compte).
        </p>
        <p>
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la CNIL :{' '}
          <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer" className="text-[#1a7a4a] underline">cnil.fr/fr/plaintes</a>{' '}
          (3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07).
        </p>
      </>
    ),
  },
  {
    id: 'securite',
    title: 'Sécurité',
    body: (
      <p>
        Les échanges avec Fidni sont chiffrés (HTTPS). Les mots de passe sont stockés sous forme de hachage, jamais
        en clair. Les sessions expirent rapidement et sont révoquées lors d’un changement de mot de passe ou d’une
        suppression de compte. L’accès aux données est limité à l’administrateur du site. En cas de violation de
        données présentant un risque pour vous, la CNIL et les personnes concernées seront prévenues dans les
        délais prévus par le RGPD.
      </p>
    ),
  },
  {
    id: 'modifications',
    title: 'Modifications',
    body: (
      <p>
        En cas de modification importante de cette politique, la date ci-dessus est mise à jour et votre accord vous
        est de nouveau demandé à votre prochaine visite. Voir aussi les{' '}
        <Link to="/terms-of-service" className="text-[#1a7a4a] underline">conditions d’utilisation</Link> et les{' '}
        <Link to="/mentions-legales" className="text-[#1a7a4a] underline">mentions légales</Link>.
      </p>
    ),
  },
];

export const PrivacyPolicy: React.FC = () => (
  <LegalLayout
    title="Politique de confidentialité"
    intro={<p>Quelles données Fidni conserve, pourquoi, combien de temps, et comment garder la main dessus.</p>}
    sections={sections}
  />
);

export default PrivacyPolicy;

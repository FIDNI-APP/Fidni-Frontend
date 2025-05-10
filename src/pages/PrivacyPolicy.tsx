// src/pages/PrivacyPolicy.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Home, FileText, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const PrivacyPolicy: React.FC = () => {
  // Scrolle automatiquement vers le haut de la page lorsqu'elle est chargée
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const lastUpdated = "15 Mai 2025";

  return (
    <div className="bg-gray-50 min-h-screen pt-20 pb-16">
      {/* Hero Section avec un dégradé */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <Link to="/" className="inline-flex items-center text-white/80 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l'accueil
          </Link>
          <div className="flex items-center mb-4">
            <ShieldCheck className="w-10 h-10 mr-4" />
            <h1 className="text-3xl md:text-4xl font-bold">Politique de Confidentialité</h1>
          </div>
          <p className="text-blue-100 text-lg max-w-3xl">
            Chez Fidni, nous accordons une importance capitale à la protection de vos données personnelles. 
            Cette politique décrit les informations que nous collectons et la façon dont nous les utilisons.
          </p>
          <p className="mt-4 text-blue-200">
            Dernière mise à jour : {lastUpdated}
          </p>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-white rounded-xl shadow-md p-6 md:p-8 prose prose-blue max-w-none">
          {/* Introduction */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-8">
            <p className="text-blue-800 m-0">
              Cette politique de confidentialité s'applique à tous les utilisateurs de la plateforme Fidni. 
              Nous vous encourageons à la lire attentivement pour comprendre comment nous collectons, utilisons et protégeons vos données.
            </p>
          </div>

          <h2 className="flex items-center text-xl font-bold text-gray-900 mb-4">
            <span className="flex items-center justify-center bg-blue-100 text-blue-700 w-8 h-8 rounded-full mr-3">1</span>
            Collecte des Données
          </h2>
          <p>
            Nous collectons plusieurs types d'informations pour fournir et améliorer notre service :
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Informations d'identification :</strong> Lors de l'inscription, nous collectons votre nom d'utilisateur, adresse email et mot de passe.</li>
            <li><strong>Informations de profil :</strong> Vous pouvez choisir de fournir des informations supplémentaires comme votre niveau d'études, vos matières préférées, votre localisation ou votre photo de profil.</li>
            <li><strong>Données d'utilisation :</strong> Nous collectons des informations sur la façon dont vous interagissez avec notre plateforme, comme les exercices que vous consultez, vos réponses, et votre progression.</li>
            <li><strong>Données techniques :</strong> Nous recueillons automatiquement certaines informations techniques comme votre adresse IP, type de navigateur, appareil utilisé, et pages visitées.</li>
          </ul>

          <hr className="my-8 border-gray-200" />

          <h2 className="flex items-center text-xl font-bold text-gray-900 mb-4">
            <span className="flex items-center justify-center bg-blue-100 text-blue-700 w-8 h-8 rounded-full mr-3">2</span>
            Utilisation des Données
          </h2>
          <p>
            Nous utilisons vos données personnelles pour les finalités suivantes :
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Fournir, maintenir et améliorer notre service</li>
            <li>Personnaliser votre expérience d'apprentissage</li>
            <li>Analyser l'utilisation de notre plateforme et améliorer nos fonctionnalités</li>
            <li>Communiquer avec vous concernant votre compte, les mises à jour ou les nouvelles fonctionnalités</li>
            <li>Détecter, prévenir et résoudre les problèmes techniques et de sécurité</li>
            <li>Répondre à vos demandes et vous fournir une assistance</li>
          </ul>

          <hr className="my-8 border-gray-200" />

          <h2 className="flex items-center text-xl font-bold text-gray-900 mb-4">
            <span className="flex items-center justify-center bg-blue-100 text-blue-700 w-8 h-8 rounded-full mr-3">3</span>
            Partage des Données
          </h2>
          <p>
            Nous ne vendons pas vos données personnelles à des tiers. Nous pouvons partager vos informations dans les circonstances suivantes :
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Avec votre consentement :</strong> Nous partagerons vos informations personnelles si vous nous donnez votre consentement explicite.</li>
            <li><strong>Avec des prestataires de services :</strong> Nous pouvons partager vos informations avec des tiers qui nous aident à fournir notre service (hébergement, analyse, support client).</li>
            <li><strong>Pour des obligations légales :</strong> Nous pouvons divulguer vos informations si nous sommes légalement tenus de le faire, pour protéger nos droits ou en réponse à une procédure légale.</li>
            <li><strong>Dans le cadre d'une transaction commerciale :</strong> Si Fidni est impliqué dans une fusion, acquisition ou vente d'actifs, vos données peuvent être transférées. Nous vous informerons avant que vos données personnelles ne soient transférées.</li>
          </ul>

          <hr className="my-8 border-gray-200" />

          <h2 className="flex items-center text-xl font-bold text-gray-900 mb-4">
            <span className="flex items-center justify-center bg-blue-100 text-blue-700 w-8 h-8 rounded-full mr-3">4</span>
            Sécurité des Données
          </h2>
          <p>
            La sécurité de vos données est importante pour nous. Nous mettons en œuvre des mesures de sécurité appropriées pour protéger vos informations personnelles contre la perte, l'accès non autorisé, la divulgation, l'altération ou la destruction :
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Encryption des données sensibles</li>
            <li>Accès restreint aux informations personnelles</li>
            <li>Audits réguliers de nos pratiques de sécurité</li>
            <li>Utilisation de connexions sécurisées (HTTPS)</li>
            <li>Stockage des mots de passe sous forme hachée</li>
          </ul>

          <hr className="my-8 border-gray-200" />

          <h2 className="flex items-center text-xl font-bold text-gray-900 mb-4">
            <span className="flex items-center justify-center bg-blue-100 text-blue-700 w-8 h-8 rounded-full mr-3">5</span>
            Cookies et Technologies Similaires
          </h2>
          <p>
            Nous utilisons des cookies et des technologies similaires pour améliorer votre expérience sur notre plateforme. Les cookies sont de petits fichiers texte stockés sur votre appareil qui nous permettent de :
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Maintenir votre session utilisateur</li>
            <li>Mémoriser vos préférences</li>
            <li>Analyser l'utilisation de notre plateforme</li>
            <li>Personnaliser votre expérience</li>
          </ul>
          <p>
            Vous pouvez configurer votre navigateur pour refuser tous les cookies ou pour vous avertir lorsqu'un cookie est envoyé. Cependant, certaines fonctionnalités de notre service peuvent ne pas fonctionner correctement si les cookies sont désactivés.
          </p>

          <hr className="my-8 border-gray-200" />

          <h2 className="flex items-center text-xl font-bold text-gray-900 mb-4">
            <span className="flex items-center justify-center bg-blue-100 text-blue-700 w-8 h-8 rounded-full mr-3">6</span>
            Vos Droits
          </h2>
          <p>
            Conformément au Règlement Général sur la Protection des Données (RGPD) et à d'autres lois applicables, vous disposez de certains droits concernant vos données personnelles :
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Droit d'accès :</strong> Vous pouvez demander une copie de vos données personnelles.</li>
            <li><strong>Droit de rectification :</strong> Vous pouvez demander la correction de données inexactes.</li>
            <li><strong>Droit à l'effacement :</strong> Vous pouvez demander la suppression de vos données dans certaines circonstances.</li>
            <li><strong>Droit à la limitation du traitement :</strong> Vous pouvez demander la limitation du traitement de vos données.</li>
            <li><strong>Droit à la portabilité :</strong> Vous pouvez demander le transfert de vos données vers un autre service.</li>
            <li><strong>Droit d'opposition :</strong> Vous pouvez vous opposer au traitement de vos données dans certaines circonstances.</li>
            <li><strong>Droit de retirer votre consentement :</strong> Vous pouvez retirer votre consentement à tout moment.</li>
          </ul>
          <p>
            Pour exercer ces droits, veuillez nous contacter à l'adresse indiquée à la fin de cette politique.
          </p>

          <hr className="my-8 border-gray-200" />

          <h2 className="flex items-center text-xl font-bold text-gray-900 mb-4">
            <span className="flex items-center justify-center bg-blue-100 text-blue-700 w-8 h-8 rounded-full mr-3">7</span>
            Conservation des Données
          </h2>
          <p>
            Nous conservons vos données personnelles aussi longtemps que nécessaire pour fournir notre service et atteindre les objectifs décrits dans cette politique, sauf si une période de conservation plus longue est requise ou permise par la loi.
          </p>
          <p>
            Si vous supprimez votre compte, nous supprimerons ou anonymiserons vos informations personnelles, sauf si nous devons les conserver pour des raisons légales légitimes.
          </p>

          <hr className="my-8 border-gray-200" />

          <h2 className="flex items-center text-xl font-bold text-gray-900 mb-4">
            <span className="flex items-center justify-center bg-blue-100 text-blue-700 w-8 h-8 rounded-full mr-3">8</span>
            Protection des Données des Mineurs
          </h2>
          <p>
            Notre service peut être utilisé par des personnes de moins de 18 ans, mais les utilisateurs de moins de 16 ans doivent avoir le consentement d'un parent ou tuteur légal. Nous ne collectons pas sciemment des informations personnelles auprès d'enfants de moins de 13 ans.
          </p>
          <p>
            Si vous êtes un parent ou un tuteur et que vous pensez que votre enfant nous a fourni des informations personnelles sans votre consentement, veuillez nous contacter pour que nous puissions prendre les mesures nécessaires.
          </p>

          <hr className="my-8 border-gray-200" />

          <h2 className="flex items-center text-xl font-bold text-gray-900 mb-4">
            <span className="flex items-center justify-center bg-blue-100 text-blue-700 w-8 h-8 rounded-full mr-3">9</span>
            Modifications de cette Politique
          </h2>
          <p>
            Nous pouvons mettre à jour cette politique de confidentialité de temps à autre. Nous vous informerons de tout changement important en publiant la nouvelle politique de confidentialité sur cette page et en vous envoyant une notification.
          </p>
          <p>
            Nous vous conseillons de consulter régulièrement cette politique pour prendre connaissance de tout changement. Les modifications à cette politique de confidentialité sont effectives lorsqu'elles sont publiées sur cette page.
          </p>

          <hr className="my-8 border-gray-200" />

          <h2 className="flex items-center text-xl font-bold text-gray-900 mb-4">
            <span className="flex items-center justify-center bg-blue-100 text-blue-700 w-8 h-8 rounded-full mr-3">10</span>
            Contact
          </h2>
          <p>
            Si vous avez des questions ou des préoccupations concernant cette politique de confidentialité, veuillez nous contacter à :
          </p>
          <div className="bg-gray-50 p-4 rounded-lg my-4">
            <p className="font-medium">Délégué à la Protection des Données</p>
            <p>Fidni SAS/Oussama Hadder</p>
            <p>Email: natsuhadder01@outlook.fr</p>
          </div>
        </div>

        {/* Section liens rapides */}
        <div className="mt-10 flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 justify-between">
          <Link to="/terms-of-service">
            <Button variant="outline" className="w-full sm:w-auto justify-between px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50">
              Conditions d'Utilisation
              <FileText className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/">
            <Button className="w-full sm:w-auto justify-between px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white">
              Retour à l'accueil
              <Home className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12 py-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} Fidni SAS. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
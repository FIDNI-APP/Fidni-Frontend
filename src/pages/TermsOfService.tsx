// src/pages/TermsOfService.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Home, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const TermsOfService: React.FC = () => {
  // Scrolle automatiquement vers le haut de la page lorsqu'elle est chargée
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const lastUpdated = "15 Mai 2025";

  return (
    <div className="bg-gray-50 min-h-screen pt-20 pb-16">
      {/* Hero Section avec un dégradé */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <Link to="/" className="inline-flex items-center text-white/80 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l'accueil
          </Link>
          <div className="flex items-center mb-4">
            <FileText className="w-10 h-10 mr-4" />
            <h1 className="text-3xl md:text-4xl font-bold">Conditions d'Utilisation</h1>
          </div>
          <p className="text-indigo-100 text-lg max-w-3xl">
            Ces conditions établissent les règles d'utilisation de la plateforme éducative Fidni. 
            Veuillez les lire attentivement avant d'utiliser notre service.
          </p>
          <p className="mt-4 text-indigo-200">
            Dernière mise à jour : {lastUpdated}
          </p>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-white rounded-xl shadow-md p-6 md:p-8 prose prose-indigo max-w-none">
          <h2 className="flex items-center text-xl font-bold text-gray-900 mb-4">
            <span className="flex items-center justify-center bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full mr-3">1</span>
            Acceptation des Conditions
          </h2>
          <p>
            En accédant à la plateforme Fidni ou en l'utilisant de quelque manière que ce soit, vous acceptez d'être lié par ces Conditions d'Utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre service.
          </p>
          <p>
            Fidni se réserve le droit de modifier ces conditions à tout moment. Les utilisateurs seront informés des changements importants, mais il est de votre responsabilité de consulter régulièrement cette page pour prendre connaissance des modifications.
          </p>

          <hr className="my-8 border-gray-200" />

          <h2 className="flex items-center text-xl font-bold text-gray-900 mb-4">
            <span className="flex items-center justify-center bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full mr-3">2</span>
            Description du Service
          </h2>
          <p>
            Fidni est une plateforme éducative qui permet aux utilisateurs d'accéder à du contenu pédagogique, de créer et de partager des exercices, et de suivre leur progression d'apprentissage.
          </p>
          <p>
            Nous nous efforçons de fournir un service de qualité, mais nous ne garantissons pas que le service sera ininterrompu, sécurisé ou exempt d'erreurs.
          </p>

          <hr className="my-8 border-gray-200" />

          <h2 className="flex items-center text-xl font-bold text-gray-900 mb-4">
            <span className="flex items-center justify-center bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full mr-3">3</span>
            Inscription et Comptes Utilisateurs
          </h2>
          <p>
            Pour utiliser certaines fonctionnalités de Fidni, vous devez créer un compte. Vous êtes responsable de maintenir la confidentialité de vos identifiants et de toutes les activités qui se produisent sous votre compte.
          </p>
          <p>
            En vous inscrivant, vous vous engagez à fournir des informations exactes, actuelles et complètes. Fidni se réserve le droit de suspendre ou de résilier votre compte si des informations fausses, inexactes ou incomplètes sont fournies.
          </p>

          <hr className="my-8 border-gray-200" />

          <h2 className="flex items-center text-xl font-bold text-gray-900 mb-4">
            <span className="flex items-center justify-center bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full mr-3">4</span>
            Règles de Conduite
          </h2>
          <p>
            En utilisant Fidni, vous acceptez de ne pas :
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Publier du contenu illégal, nuisible, menaçant, abusif, harcelant, diffamatoire, vulgaire, obscène ou autrement répréhensible</li>
            <li>Usurper l'identité d'une autre personne</li>
            <li>Télécharger ou distribuer du matériel qui porte atteinte aux droits de propriété intellectuelle</li>
            <li>Utiliser le service pour envoyer des communications non sollicitées</li>
            <li>Tenter d'accéder aux comptes d'autres utilisateurs ou à des zones sécurisées de la plateforme</li>
            <li>Perturber l'infrastructure technique de Fidni</li>
          </ul>

          <hr className="my-8 border-gray-200" />

          <h2 className="flex items-center text-xl font-bold text-gray-900 mb-4">
            <span className="flex items-center justify-center bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full mr-3">5</span>
            Contenu des Utilisateurs
          </h2>
          <p>
            En publiant du contenu sur Fidni, vous accordez à Fidni une licence mondiale, non exclusive, libre de redevance pour utiliser, reproduire, modifier, adapter, publier, traduire, distribuer et afficher ce contenu sur la plateforme.
          </p>
          <p>
            Vous conservez tous les droits de propriété sur votre contenu, mais vous êtes responsable de vous assurer que vous disposez des droits nécessaires pour publier ce contenu et qu'il ne viole pas les droits d'un tiers.
          </p>
          <p>
            Fidni se réserve le droit de supprimer tout contenu qui viole ces conditions ou qui est jugé inapproprié.
          </p>

          <hr className="my-8 border-gray-200" />

          <h2 className="flex items-center text-xl font-bold text-gray-900 mb-4">
            <span className="flex items-center justify-center bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full mr-3">6</span>
            Propriété Intellectuelle
          </h2>
          <p>
            Tout le contenu fourni par Fidni, y compris les textes, graphiques, logos, icônes, images, clips audio, téléchargements numériques et compilations de données, est la propriété de Fidni ou de ses fournisseurs de contenu et est protégé par les lois françaises et internationales sur les droits d'auteur.
          </p>
          <p>
            Vous ne pouvez pas reproduire, distribuer, modifier, créer des œuvres dérivées, afficher publiquement, exécuter publiquement, republier, télécharger, stocker ou transmettre tout matériel de notre site, sauf dans les cas expressément autorisés.
          </p>

          <hr className="my-8 border-gray-200" />

          <h2 className="flex items-center text-xl font-bold text-gray-900 mb-4">
            <span className="flex items-center justify-center bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full mr-3">7</span>
            Limitation de Responsabilité
          </h2>
          <p>
            Dans toute la mesure permise par la loi applicable, Fidni ne sera pas responsable des dommages indirects, accessoires, spéciaux, consécutifs ou punitifs, ou de toute perte de profits ou de revenus, qu'ils résultent directement ou indirectement de votre utilisation ou de votre incapacité à utiliser le service.
          </p>
          <p>
            La responsabilité totale de Fidni pour toute réclamation en vertu de ces conditions est limitée au montant que vous avez payé pour utiliser le service au cours des 12 mois précédant l'événement donnant lieu à la responsabilité.
          </p>

          <hr className="my-8 border-gray-200" />

          <h2 className="flex items-center text-xl font-bold text-gray-900 mb-4">
            <span className="flex items-center justify-center bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full mr-3">8</span>
            Résiliation
          </h2>
          <p>
            Fidni peut résilier ou suspendre votre accès au service immédiatement, sans préavis ni responsabilité, pour quelque raison que ce soit, y compris, sans limitation, si vous violez ces Conditions d'Utilisation.
          </p>
          <p>
            À la résiliation, votre droit d'utiliser le service cessera immédiatement. Si vous souhaitez résilier votre compte, vous pouvez simplement cesser d'utiliser le service ou nous contacter pour demander la suppression de votre compte.
          </p>

          <hr className="my-8 border-gray-200" />

          <h2 className="flex items-center text-xl font-bold text-gray-900 mb-4">
            <span className="flex items-center justify-center bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full mr-3">9</span>
            Loi Applicable
          </h2>
          <p>
            Ces Conditions d'Utilisation sont régies et interprétées conformément aux lois françaises, sans égard aux principes de conflits de lois.
          </p>
          <p>
            Tout litige découlant de ou lié à ces Conditions d'Utilisation sera soumis à la compétence exclusive des tribunaux de Paris, France.
          </p>

          <hr className="my-8 border-gray-200" />

          <h2 className="flex items-center text-xl font-bold text-gray-900 mb-4">
            <span className="flex items-center justify-center bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full mr-3">10</span>
            Contact
          </h2>
          <p>
            Si vous avez des questions ou des préoccupations concernant ces Conditions d'Utilisation, veuillez nous contacter à :
          </p>
          <div className="bg-gray-50 p-4 rounded-lg my-4">
            <p className="font-medium">Fidni SAS</p>
            <p>Email: natsuhadder01@outlook.fr</p>
          </div>
        </div>

        {/* Section liens rapides */}
        <div className="mt-10 flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 justify-between">
          <Link to="/privacy-policy">
            <Button variant="outline" className="w-full sm:w-auto justify-between px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50">
              Politique de Confidentialité
              <FileText className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/">
            <Button className="w-full sm:w-auto justify-between px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white">
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

export default TermsOfService;
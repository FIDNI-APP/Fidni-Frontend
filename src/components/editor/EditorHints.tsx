import React from 'react';
import { Sparkles } from "lucide-react";

export const EditorHints: React.FC = () => {
  return (
    <div className="mt-2 p-3 bg-indigo-50 rounded-lg text-sm text-indigo-700 shadow-inner">
      <div className="font-medium mb-2 flex items-center">
        <Sparkles className="w-4 h-4 mr-1.5 opacity-80" />
        Astuces d'utilisation
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="font-medium text-xs uppercase tracking-wider mb-1.5 text-indigo-800">Texte</div>
          <ul className="space-y-1 text-xs list-disc list-inside">
            <li>Sélectionnez le texte pour le mettre en forme</li>
            <li>Utilisez les options de couleur pour personnaliser</li>
            <li>Structurez votre document avec des titres</li>
          </ul>
        </div>
        <div>
          <div className="font-medium text-xs uppercase tracking-wider mb-1.5 text-indigo-800">Mathématiques</div>
          <ul className="space-y-1 text-xs list-disc list-inside">
            <li>$x^2$ : Formule en ligne avec $...$</li>
            <li>Modifiez les formules avant de les insérer</li>
          </ul>
        </div>
        <div>
          <div className="font-medium text-xs uppercase tracking-wider mb-1.5 text-indigo-800">Mise en page</div>
          <ul className="space-y-1 text-xs list-disc list-inside">
            <li>Ajoutez des images depuis votre appareil</li>
            <li>Alignez votre texte à gauche, au centre ou à droite</li>
            <li>Personnalisez l'apparence avec les thèmes</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
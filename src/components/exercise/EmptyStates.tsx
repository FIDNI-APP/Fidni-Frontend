import React from 'react';
import { GitPullRequest, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const ProposalsEmptyState: React.FC = () => {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden mb-6">
      <div className="p-8 text-center py-16">
        <GitPullRequest className="w-16 h-16 text-indigo-200 mx-auto mb-6" />
        <h3 className="text-xl font-semibold text-gray-800 mb-3">Solutions alternatives</h3>
        <p className="text-gray-600 max-w-md mx-auto mb-6">
          Cette fonctionnalité sera bientôt disponible. Elle permettra aux utilisateurs de proposer leurs propres solutions à cet exercice.
        </p>
        <Button 
          className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 font-medium rounded-lg px-6"
        >
          Être notifié lorsque disponible
        </Button>
      </div>
    </div>
  );
};

export const ActivityEmptyState: React.FC = () => {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden mb-6">
      <div className="p-8 text-center py-16">
        <Activity className="w-16 h-16 text-indigo-200 mx-auto mb-6" />
        <h3 className="text-xl font-semibold text-gray-800 mb-3">Activité</h3>
        <p className="text-gray-600 max-w-md mx-auto mb-6">
          Le journal d'activité pour cet exercice sera bientôt disponible, montrant les votes, commentaires et autres interactions.
        </p>
        <Button 
          className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 font-medium rounded-lg px-6"
        >
          Explorer d'autres exercices
        </Button>
      </div>
    </div>
  );
};
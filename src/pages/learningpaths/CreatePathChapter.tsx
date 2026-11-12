import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

/** Les anciens liens d'ajout ouvrent la gestion du contenu et sa fenêtre de chapitre. */
export const CreatePathChapter: React.FC = () => {
  const { id } = useParams();
  return <Navigate to={`/parcours/${id}/contenu?ajouter=chapitre`} replace />;
};

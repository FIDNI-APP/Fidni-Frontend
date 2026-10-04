// Page par niveau ou par chapitre : la liste habituelle, déjà filtrée, avec un titre et une
// introduction qui répondent aux recherches des élèves (« exercices corrigés 2 bac sm »).
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ContentList } from './ContentList';
import { NotFound } from '@/pages/NotFound';
import { getHub, type HubInfo } from '@/lib/api/hubApi';

const SECTION = { exercise: 'exercises', lesson: 'lessons', exam: 'exams' } as const;

export const ContentHub: React.FC<{ contentType: 'exercise' | 'lesson' | 'exam' }> = ({ contentType }) => {
  const { level = '', chapter } = useParams<{ level: string; chapter?: string }>();
  const [hub, setHub] = useState<HubInfo | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHub(null);
    setMissing(false);
    getHub(SECTION[contentType], level, chapter)
      .then((data) => { if (!cancelled) setHub(data); })
      .catch(() => { if (!cancelled) setMissing(true); });
    return () => { cancelled = true; };
  }, [contentType, level, chapter]);

  if (missing) return <NotFound />;
  if (!hub) {
    return (
      <div className="flex items-center justify-center py-24" role="status" aria-label="Chargement de la page">
        <div className="h-6 w-6 rounded-full border-2 border-line border-t-brand animate-spin" />
      </div>
    );
  }
  // key : un autre niveau ou chapitre repart d'une liste neuve (filtres de la nouvelle page).
  return <ContentList key={hub.url} contentType={contentType} hub={hub} />;
};

export default ContentHub;

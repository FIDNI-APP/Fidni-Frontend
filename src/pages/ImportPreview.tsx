// Aperçu d'une fiche avant import (circuit contenus/outils) : rend la structure convertie avec les
// composants du site, solutions ouvertes. Aucune requête à l'API : la structure est injectée par le
// script d'aperçu (window.__FIDNI_APERCU), ou lue dans le stockage local (clé « fidni:apercu »).
import React from 'react';
import ExerciseRenderer from '@/components/content/viewer/ExerciseRenderer';
import { LessonRenderer } from '@/components/content/viewer/LessonRenderer';
import type { FlexibleExerciseStructure } from '@/components/content/editor/FlexibleExerciseEditor';
import type { FlexibleLessonStructure } from '@/components/content/editor/FlexibleLessonEditor';

interface Preview { type: 'exercise' | 'exam' | 'lesson'; title: string; structure: unknown }

const read = (): Preview | null => {
  const injected = (window as unknown as { __FIDNI_APERCU?: Preview }).__FIDNI_APERCU;
  if (injected) return injected;
  try { return JSON.parse(localStorage.getItem('fidni:apercu') || 'null'); } catch { return null; }
};

export const ImportPreview: React.FC = () => {
  const data = read();
  if (!data) {
    return <p className="p-10 text-center text-ink-faint">Aucun aperçu chargé.</p>;
  }
  return (
    <div className="bg-[#faf9f7] min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <p className="text-xs uppercase tracking-widest text-[#9a958c] mb-2">Aperçu avant import · {data.type}</p>
        <h1 className="fd-display text-3xl mb-6">{data.title}</h1>
        <div className="bg-white rounded-2xl border border-line p-6 sm:p-7" id="apercu-contenu">
          {data.type === 'lesson' ? (
            <LessonRenderer structure={data.structure as FlexibleLessonStructure} />
          ) : (
            <ExerciseRenderer structure={data.structure as FlexibleExerciseStructure} showAllSolutions interactive={false} compact={false} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportPreview;

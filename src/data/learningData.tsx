import type { Subject } from '@/types/learningPath';

export const mockSubjects: Subject[] = [
  {
    id: '1',
    title: 'Mathématiques - Niveau Seconde',
    description: 'Fonctions, équations et géométrie pour la classe de seconde',
    progress: 22,
    totalDuration: '12h 45m',
    chapters: [
      {
        id: '1',
        number: '1',
        title: 'Introduction aux fonctions',
        duration: '43m 16s',
        completed: true,
        videos: [
          {
            id: '1',
            title: 'Qu\'est-ce qu\'une fonction ?',
            duration: '15m',
            completed: true,
            type: 'lesson'
          },
          {
            id: '2',
            title: 'Notation et vocabulaire',
            duration: '12m',
            completed: true,
            type: 'lesson'
          },
          {
            id: '3',
            title: 'Exercices pratiques',
            duration: '16m',
            completed: false,
            type: 'lab'
          }
        ]
      },
      {
        id: '2',
        number: '2',
        title: 'Fonctions linéaires et affines',
        duration: '1h 12m',
        completed: false,
        videos: [
          {
            id: '4',
            title: 'Fonctions linéaires',
            duration: '18m',
            completed: false,
            type: 'lesson'
          },
          {
            id: '5',
            title: 'Fonctions affines',
            duration: '22m',
            completed: false,
            type: 'lesson'
          },
          {
            id: '6',
            title: 'Quiz final',
            duration: '30m',
            completed: false,
            type: 'exam'
          }
        ]
      }
    ],
    nextUp: {
      id: '2',
      number: '2',
      title: 'Fonctions linéaires et affines',
      duration: '1h 12m',
      completed: false,
      videos: [
        {
          id: '4',
          title: 'Fonctions linéaires',
          duration: '18m',
          completed: false,
          type: 'lesson'
        },
        {
          id: '5',
          title: 'Fonctions affines',
          duration: '22m',
          completed: false,
          type: 'lesson'
        }
      ]
    }
  }
];
import React from 'react';
import { BookOpen, Clock, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { APlusIcon } from '@/components/icons/APlusIcon';
import { LessonIcon } from '@/components/icons/LessonIcon';
import { TimeBreakdown, LearningInsights } from '@/lib/api/dashboardApi';

interface StudyTimeBreakdownProps {
  timeBreakdown: TimeBreakdown;
  insights?: LearningInsights;
}

interface TypeDef {
  key: 'exercises' | 'lessons' | 'exams';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  from: string;
  to: string;
  light: string;
  text: string;
}

const TYPES: TypeDef[] = [
  { key: 'exercises', label: 'Exercices', icon: BookOpen,   from: '#1a1a1a', to: '#33302b', light: '#f2f1ee', text: '#1a1a1a' },
  { key: 'lessons',   label: 'Leçons',    icon: LessonIcon, from: '#1a1a1a', to: '#33302b', light: '#f2f1ee', text: '#1a1a1a' },
  { key: 'exams',     label: 'Examens',   icon: APlusIcon,  from: '#1a1a1a', to: '#33302b', light: '#f2f1ee', text: '#1a1a1a' },
];

export const StudyTimeBreakdown: React.FC<StudyTimeBreakdownProps> = ({ timeBreakdown, insights }) => {
  const insightData = (() => {
    if (!insights) return null;
    if (insights.balanced_study) {
      return {
        icon: CheckCircle,
        message: "Excellent ! Ton temps d'étude est bien équilibré entre les différents types de contenu.",
        bg: '#f7f6f3', border: '#e7e3dc', color: '#33302b',
      };
    }
    if (insights.needs_more_lessons) {
      return {
        icon: AlertCircle,
        message: 'Conseil : passe plus de temps sur les leçons. Elles sont essentielles pour construire une base solide.',
        bg: '#f7f6f3', border: '#e7e3dc', color: '#33302b',
      };
    }
    const most = TYPES.find(t => t.key === insights.most_studied_type);
    const least = TYPES.find(t => t.key === insights.least_studied_type);
    return {
      icon: TrendingUp,
      message: `Tu passes le plus de temps sur les ${most?.label.toLowerCase()}. Pense aussi aux ${least?.label.toLowerCase()} !`,
      bg: '#f7f6f3', border: '#e7e3dc', color: '#33302b',
    };
  })();

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div
          className="inline-flex items-center justify-center"
          style={{
            width: 28, height: 28, borderRadius: 8,
            background: '#f2f1ee', color: '#1a1a1a',
          }}
        >
          <Clock className="w-3.5 h-3.5" />
        </div>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.01em' }}>
          Temps d'étude par type
        </h3>
        <span
          style={{
            marginLeft: 'auto', fontSize: 10, color: '#6b6862',
            fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
          }}
        >
          Cette semaine
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {TYPES.map(t => {
          const data = timeBreakdown[t.key];
          const hasTime = data.total_seconds > 0;
          const isMost = insights?.most_studied_type === t.key && hasTime;
          const Icon = t.icon;

          return (
            <div
              key={t.key}
              className="relative"
              style={{
                background: '#fff',
                borderRadius: 16,
                border: '1px solid #e7e3dc',
                padding: 16,
                transition: 'all .22s',
              }}
            >
              {isMost && (
                <span
                  style={{
                    position: 'absolute', top: 10, right: 10,
                    fontSize: 9, fontWeight: 700, letterSpacing: '.04em',
                    background: '#eaf3ed', color: '#15633c',
                    padding: '3px 8px', borderRadius: 99,
                  }}
                >
                  LE PLUS ÉTUDIÉ
                </span>
              )}

              <div className="flex items-center gap-2 mb-3">
                <div
                  className="inline-flex items-center justify-center"
                  style={{
                    width: 30, height: 30, borderRadius: 9,
                    background: '#f2f1ee', color: '#1a1a1a',
                  }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: t.text }}>{t.label}</span>
              </div>

              <div
                style={{
                  fontSize: 26, fontWeight: 700, fontFamily: 'DM Mono',
                  color: '#1a1a1a', letterSpacing: '.02em',
                }}
              >
                {data.formatted || '0s'}
              </div>
              <div style={{ fontSize: 11, color: '#6b6862', marginTop: 2 }}>
                {data.percentage.toFixed(1)}% du temps total
              </div>

              {/* Progress bar */}
              <div
                style={{
                  height: 6, borderRadius: 99, background: '#faf9f7',
                  marginTop: 10, overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${data.percentage}%`,
                    background: '#1a7a4a',
                    transition: 'width .5s ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Insight */}
      {insightData && (
        <div
          className="flex items-start gap-3"
          style={{
            background: insightData.bg,
            border: `1px solid ${insightData.border}`,
            borderRadius: 12,
            padding: '12px 14px',
          }}
        >
          <insightData.icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: insightData.color }} />
          <p style={{ fontSize: 12, fontWeight: 500, color: insightData.color, lineHeight: 1.5 }}>
            {insightData.message}
          </p>
        </div>
      )}

      {/* Empty state */}
      {timeBreakdown.total_seconds === 0 && (
        <div
          className="text-center"
          style={{
            background: '#f7f6f3', border: '1.5px dashed #e7e3dc',
            borderRadius: 14, padding: 24,
          }}
        >
          <Clock className="w-10 h-10 mx-auto mb-2" style={{ color: '#6b6862' }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: '#33302b' }}>Aucune donnée d'étude pour le moment</p>
          <p style={{ fontSize: 11, color: '#6b6862', marginTop: 4 }}>
            Commence un exercice, une leçon ou un examen pour voir tes statistiques.
          </p>
        </div>
      )}
    </div>
  );
};

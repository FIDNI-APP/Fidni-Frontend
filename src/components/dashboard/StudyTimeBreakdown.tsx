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
  { key: 'exercises', label: 'Exercices', icon: BookOpen,   from: '#4f46e5', to: '#818cf8', light: '#eef2ff', text: '#4338ca' },
  { key: 'lessons',   label: 'Leçons',    icon: LessonIcon, from: '#7c3aed', to: '#a78bfa', light: '#f5f3ff', text: '#5b21b6' },
  { key: 'exams',     label: 'Examens',   icon: APlusIcon,  from: '#0891b2', to: '#22d3ee', light: '#ecfeff', text: '#0e7490' },
];

export const StudyTimeBreakdown: React.FC<StudyTimeBreakdownProps> = ({ timeBreakdown, insights }) => {
  const insightData = (() => {
    if (!insights) return null;
    if (insights.balanced_study) {
      return {
        icon: CheckCircle,
        message: "Excellent ! Ton temps d'étude est bien équilibré entre les différents types de contenu.",
        bg: '#ecfdf5', border: '#bbf7d0', color: '#047857',
      };
    }
    if (insights.needs_more_lessons) {
      return {
        icon: AlertCircle,
        message: 'Conseil : passe plus de temps sur les leçons. Elles sont essentielles pour construire une base solide.',
        bg: '#fffbeb', border: '#fde68a', color: '#a16207',
      };
    }
    const most = TYPES.find(t => t.key === insights.most_studied_type);
    const least = TYPES.find(t => t.key === insights.least_studied_type);
    return {
      icon: TrendingUp,
      message: `Tu passes le plus de temps sur les ${most?.label.toLowerCase()}. Pense aussi aux ${least?.label.toLowerCase()} !`,
      bg: '#eef2ff', border: '#c7d2fe', color: '#4338ca',
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
            background: 'linear-gradient(135deg,#4f46e5,#818cf8)', color: '#fff',
          }}
        >
          <Clock className="w-3.5 h-3.5" />
        </div>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b', letterSpacing: '-0.01em' }}>
          Temps d'étude par type
        </h3>
        <span
          style={{
            marginLeft: 'auto', fontSize: 10, color: '#9391b8',
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
                border: '1px solid #ede9fe',
                padding: 16,
                transition: 'all .22s',
              }}
            >
              {isMost && (
                <span
                  style={{
                    position: 'absolute', top: 10, right: 10,
                    fontSize: 9, fontWeight: 700, letterSpacing: '.04em',
                    background: t.light, color: t.text,
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
                    background: `linear-gradient(135deg,${t.from},${t.to})`, color: '#fff',
                  }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: t.text }}>{t.label}</span>
              </div>

              <div
                style={{
                  fontSize: 26, fontWeight: 700, fontFamily: 'DM Mono',
                  color: '#1e1b4b', letterSpacing: '.02em',
                }}
              >
                {data.formatted || '0s'}
              </div>
              <div style={{ fontSize: 11, color: '#7068a8', marginTop: 2 }}>
                {data.percentage.toFixed(1)}% du temps total
              </div>

              {/* Progress bar */}
              <div
                style={{
                  height: 6, borderRadius: 99, background: '#f0effe',
                  marginTop: 10, overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${data.percentage}%`,
                    background: `linear-gradient(90deg,${t.from},${t.to})`,
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
            background: '#f9f8ff', border: '1.5px dashed #ede9fe',
            borderRadius: 14, padding: 24,
          }}
        >
          <Clock className="w-10 h-10 mx-auto mb-2" style={{ color: '#b0adcd' }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: '#4b4880' }}>Aucune donnée d'étude pour le moment</p>
          <p style={{ fontSize: 11, color: '#9391b8', marginTop: 4 }}>
            Commence un exercice, une leçon ou un examen pour voir tes statistiques.
          </p>
        </div>
      )}
    </div>
  );
};

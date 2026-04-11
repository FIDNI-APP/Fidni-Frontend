// src/components/profile/ActivityHeatmap.tsx
import React, { useState } from 'react';
import { Calendar, BookOpen, GraduationCap, FileText, Info } from 'lucide-react';
import { motion } from 'framer-motion';

interface DailyActivity {
  date: string;
  total_time_seconds: number;
  total_time_formatted: string;
  entries_count: number;
  content_types: {
    exercise?: number;
    lesson?: number;
    exam?: number;
  };
}

interface ActivityHeatmapProps {
  daily_activity: DailyActivity[];
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ daily_activity }) => {
  const [hoveredDay, setHoveredDay] = useState<DailyActivity | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  if (!daily_activity || daily_activity.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucune activité récente</h3>
          <p className="text-slate-500">Commencez à étudier pour voir votre activité ici</p>
        </div>
      </div>
    );
  }

  // Préparer les données
  const uniqueActivity = Array.from(
    new Map(daily_activity.map(day => [day.date, day])).values()
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const maxTime = Math.max(...uniqueActivity.map(d => d.total_time_seconds), 1);

  const getIntensityLevel = (seconds: number) => {
    if (seconds === 0) return 0;
    const percentage = (seconds / maxTime) * 100;
    if (percentage >= 75) return 4;
    if (percentage >= 50) return 3;
    if (percentage >= 25) return 2;
    return 1;
  };

  const getIntensityColor = (level: number) => {
    const colors = [
      'bg-slate-100',
      'bg-blue-200',
      'bg-blue-400',
      'bg-blue-500',
      'bg-blue-600'
    ];
    return colors[level];
  };

  // Créer la grille de semaines
  const dateMap = new Map(uniqueActivity.map(day => [day.date, day]));
  
  const firstDate = new Date(uniqueActivity[0].date);
  const lastDate = new Date(uniqueActivity[uniqueActivity.length - 1].date);
  
  const startDate = new Date(firstDate);
  while (startDate.getDay() !== 1) {
    startDate.setDate(startDate.getDate() - 1);
  }
  
  const endDate = new Date(lastDate);
  while (endDate.getDay() !== 0) {
    endDate.setDate(endDate.getDate() + 1);
  }

  const weeks: (DailyActivity | null)[][] = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const week: (DailyActivity | null)[] = [];
    for (let i = 0; i < 7; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      week.push(dateMap.get(dateStr) || null);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    weeks.push(week);
  }

  const dayLabels = ['Lun', '', 'Mer', '', 'Ven', '', ''];
  const monthLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

  // Stats résumées
  const totalDays = uniqueActivity.filter(d => d.total_time_seconds > 0).length;
  const totalExercises = uniqueActivity.reduce((sum, d) => sum + (d.content_types?.exercise || 0), 0);
  const totalLessons = uniqueActivity.reduce((sum, d) => sum + (d.content_types?.lesson || 0), 0);

  const handleMouseEnter = (day: DailyActivity, e: React.MouseEvent) => {
    setHoveredDay(day);
    setTooltipPosition({ x: e.clientX, y: e.clientY });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 rounded-xl">
            <Calendar className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Activité d'étude</h3>
            <p className="text-sm text-slate-500">
              {totalDays} jour{totalDays > 1 ? 's' : ''} d'activité sur les {uniqueActivity.length} derniers jours
            </p>
          </div>
        </div>

        {/* Stats rapides */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-slate-600">
            <BookOpen className="w-4 h-4 text-blue-500" />
            <span className="font-medium">{totalExercises}</span>
            <span className="text-slate-400">exercices</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <GraduationCap className="w-4 h-4 text-purple-500" />
            <span className="font-medium">{totalLessons}</span>
            <span className="text-slate-400">leçons</span>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="overflow-x-auto pb-2">
        <div className="inline-block min-w-full">
          {/* Grille */}
          <div className="flex gap-1">
            {/* Labels des jours */}
            <div className="flex flex-col gap-1 mr-2 pt-6">
              {dayLabels.map((label, idx) => (
                <div key={idx} className="h-3 flex items-center">
                  <span className="text-xs text-slate-400 w-8">{label}</span>
                </div>
              ))}
            </div>

            {/* Colonnes de semaines */}
            <div className="flex gap-1">
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-1">
                  {/* Label du mois (première semaine du mois) */}
                  <div className="h-5 text-xs text-slate-500">
                    {week[0] && new Date(week[0].date).getDate() <= 7 && (
                      monthLabels[new Date(week[0].date).getMonth()]
                    )}
                  </div>
                  
                  {week.map((day, dayIdx) => {
                    const intensity = day ? getIntensityLevel(day.total_time_seconds) : 0;
                    const date = day ? new Date(day.date) : null;

                    return (
                      <motion.div
                        key={dayIdx}
                        whileHover={{ scale: 1.2 }}
                        className={`w-3 h-3 rounded-sm cursor-pointer transition-colors ${
                          getIntensityColor(intensity)
                        } ${day ? 'hover:ring-2 hover:ring-blue-300 hover:ring-offset-1' : ''}`}
                        onMouseEnter={(e) => day && handleMouseEnter(day, e)}
                        onMouseLeave={() => setHoveredDay(null)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Légende */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Moins</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={`w-3 h-3 rounded-sm ${getIntensityColor(level)}`}
              />
            ))}
          </div>
          <span className="text-xs text-slate-500">Plus</span>
        </div>

        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Info className="w-3.5 h-3.5" />
          Survolez pour voir les détails
        </div>
      </div>

      {/* Tooltip */}
      {hoveredDay && (
        <div
          className="fixed z-50 bg-slate-900 text-white text-sm rounded-xl p-3 shadow-xl pointer-events-none"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 60,
          }}
        >
          <div className="font-semibold mb-1">
            {new Date(hoveredDay.date).toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            })}
          </div>
          <div className="text-blue-400">{hoveredDay.total_time_formatted} d'étude</div>
          <div className="text-slate-400 text-xs mt-1">{hoveredDay.entries_count} entrées</div>
        </div>
      )}
    </div>
  );
};

export default ActivityHeatmap;
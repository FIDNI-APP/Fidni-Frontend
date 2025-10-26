import React from 'react';
import {
  Calendar,
  BookOpen,
  GraduationCap,
  FileText
} from 'lucide-react';

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
  if (!daily_activity || daily_activity.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
        <div className="text-center text-gray-500 py-8">
          <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucune activité récente</p>
        </div>
      </div>
    );
  }

  // Calculate intensity levels based on time spent
  const maxTime = Math.max(...daily_activity.map(d => d.total_time_seconds), 1);

  const getIntensityLevel = (seconds: number) => {
    if (seconds === 0) return 0;
    const percentage = (seconds / maxTime) * 100;
    if (percentage >= 75) return 4; // Very high
    if (percentage >= 50) return 3; // High
    if (percentage >= 25) return 2; // Medium
    return 1; // Low
  };

  const getIntensityColor = (level: number) => {
    switch (level) {
      case 0: return 'bg-gray-100 border-gray-200';
      case 1: return 'bg-green-200 border-green-300';
      case 2: return 'bg-green-400 border-green-500';
      case 3: return 'bg-green-600 border-green-700';
      case 4: return 'bg-green-800 border-green-900';
      default: return 'bg-gray-100 border-gray-200';
    }
  };

  // Group days by week for the heatmap grid
  const monthLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const dayLabels = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  // Create a map of date -> day data for quick lookup
  const dateMap = new Map();
  daily_activity.forEach(day => {
    dateMap.set(day.date, day);
  });

  // Calculate weeks needed
  const firstDate = new Date(daily_activity[0].date);
  const lastDate = new Date(daily_activity[daily_activity.length - 1].date);

  // Find the Sunday before or on the first date
  const startDate = new Date(firstDate);
  while (startDate.getDay() !== 0) {
    startDate.setDate(startDate.getDate() - 1);
  }

  // Find the Saturday after or on the last date
  const endDate = new Date(lastDate);
  while (endDate.getDay() !== 6) {
    endDate.setDate(endDate.getDate() + 1);
  }

  // Build weeks array
  const weeks: (typeof daily_activity[0] | null)[][] = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const week: (typeof daily_activity[0] | null)[] = [];

    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayData = dateMap.get(dateStr);
      week.push(dayData || null);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    weeks.push(week);
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-purple-600" />
          Activité d'étude
        </h3>
        <p className="text-sm text-gray-600">
          {daily_activity.filter(d => d.total_time_seconds > 0).length} jours d'étude dans les {daily_activity.length} derniers jours
        </p>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Month labels */}
          <div className="relative h-5 ml-12 mb-1">
            {(() => {
              const monthPositions: { month: string; startCol: number; width: number }[] = [];
              let currentMonth: string | null = null;
              let monthStartCol = 0;

              weeks.forEach((week, weekIndex) => {
                const firstDay = week.find(d => d !== null);
                if (firstDay) {
                  const date = new Date(firstDay.date);
                  const yearMonth = `${date.getFullYear()}-${date.getMonth()}`;

                  if (currentMonth !== yearMonth) {
                    if (currentMonth && monthStartCol < weekIndex) {
                      const parts = currentMonth.split('-');
                      const monthNum = parseInt(parts[1], 10);
                      monthPositions.push({
                        month: monthLabels[monthNum],
                        startCol: monthStartCol,
                        width: weekIndex - monthStartCol
                      });
                    }
                    currentMonth = yearMonth;
                    monthStartCol = weekIndex;
                  }
                }
              });

              if (currentMonth) {
                const parts = (currentMonth as string).split('-');
                const monthNum = parseInt(parts[1], 10);
                monthPositions.push({
                  month: monthLabels[monthNum],
                  startCol: monthStartCol,
                  width: weeks.length - monthStartCol
                });
              }

              return monthPositions.map((pos, idx) => (
                <div
                  key={idx}
                  className="absolute text-xs text-gray-600 font-medium"
                  style={{
                    left: `${pos.startCol * 15}px`,
                    top: 0
                  }}
                >
                  {pos.month}
                </div>
              ));
            })()}
          </div>

          {/* Grid with day labels */}
          <div className="flex gap-1">
            {/* Day of week labels */}
            <div className="flex flex-col gap-1 mr-2">
              {dayLabels.map((label, index) => (
                <div key={index} className="h-3 flex items-center">
                  <span className="text-xs text-gray-600 w-8">{label}</span>
                </div>
              ))}
            </div>

            {/* Heatmap cells */}
            <div className="flex gap-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {week.map((day, dayIndex) => {
                    if (!day) {
                      return <div key={`empty-${weekIndex}-${dayIndex}`} className="w-3 h-3" />;
                    }

                    const intensityLevel = getIntensityLevel(day.total_time_seconds);
                    const date = new Date(day.date);

                    return (
                      <div
                        key={day.date}
                        className={`w-3 h-3 rounded-sm border cursor-pointer transition-all duration-200 hover:scale-125 hover:shadow-md ${getIntensityColor(intensityLevel)}`}
                        title={`${date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}\n${day.total_time_formatted} d'étude\n${day.entries_count} entrées`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">Moins</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map(level => (
              <div
                key={level}
                className={`w-4 h-4 rounded-sm border ${getIntensityColor(level)}`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-600">Plus</span>
        </div>

        {/* Stats summary */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-medium">{daily_activity.reduce((sum, d) => sum + (d.content_types?.exercise || 0), 0)} exercices</span>
          </div>
          <div className="flex items-center gap-1">
            <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
            <span className="font-medium">{daily_activity.reduce((sum, d) => sum + (d.content_types?.lesson || 0), 0)} leçons</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-green-600" />
            <span className="font-medium">{daily_activity.reduce((sum, d) => sum + (d.content_types?.exam || 0), 0)} examens</span>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  // Ordre des jours pour l'affichage (commençant par lundi)
  const dayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const uniqueActivity = Array.from(
  new Map(daily_activity.map(day => [day.date, day])).values()
).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Create a map of date -> day data for quick lookup
const dateMap = new Map();
uniqueActivity.forEach(day => dateMap.set(day.date, day));



  // Calculate weeks needed
  const firstDate = new Date(uniqueActivity[0].date);
  const lastDate = new Date(uniqueActivity[uniqueActivity.length - 1].date);

  // Find the Monday before or on the first date (1 = Monday in JavaScript)
  const startDate = new Date(firstDate);
  while (startDate.getDay() !== 1) { // 1 = Monday
    startDate.setDate(startDate.getDate() - 1);
  }

  // Find the Sunday after or on the last date (0 = Sunday in JavaScript)
  const endDate = new Date(lastDate);
  while (endDate.getDay() !== 0) { // 0 = Sunday
    endDate.setDate(endDate.getDate() + 1);
  }

  // Build weeks array
  const weeks: (typeof uniqueActivity[0] | null)[][] = [];
  
let currentDate = new Date(startDate);

while (currentDate < endDate) {
  const week: (typeof uniqueActivity[0] | null)[] = [];

  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    const dateStr = currentDate.toLocaleDateString('fr-CA'); // ✅ corrige le décalage UTC
    const dayData = dateMap.get(dateStr);
    week.push(dayData || null);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  weeks.push(week);
}

// Vérification
const allDates = weeks.flat().filter(Boolean).map(d => d.date);
const duplicates = allDates.filter((d, i, arr) => arr.indexOf(d) !== i);
console.log("Dates dupliquées :", duplicates);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-purple-600" />
          Activité d'étude
        </h3>
        <p className="text-sm text-gray-600">
          {uniqueActivity.filter(d => d.total_time_seconds > 0).length} jours d'étude dans les {uniqueActivity.length} derniers jours
        </p>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Month labels */}
          <div className="relative h-5 ml-12 mb-1">
            {(() => {
              const monthPositions: { month: string; startCol: number }[] = [];

              // Flatten all valid days with their week index
              const flatDays: { date: Date; weekIndex: number }[] = [];
              weeks.forEach((week, weekIndex) => {
                week.forEach(day => {
                  if (day) {
                    flatDays.push({ date: new Date(day.date), weekIndex });
                  }
                });
              });

                  // Sort by date (just to be safe)
                  flatDays.sort((a, b) => a.date.getTime() - b.date.getTime());

                  // Track first occurrence of each month
                  const seenMonths = new Set<string>();
                  flatDays.forEach(({ date, weekIndex }) => {
                    const ym = `${date.getFullYear()}-${date.getMonth()}`;
                    if (!seenMonths.has(ym)) {
                      seenMonths.add(ym);
                      monthPositions.push({
                        month: monthLabels[date.getMonth()],
                        startCol: weekIndex,
                      });
                    }
                  });

                  return monthPositions.map((pos, idx) => (
                    <div
                      key={idx}
                      className="absolute text-xs text-gray-600 font-medium"
                      style={{
                        left: `${pos.startCol * 15}px`, // adjust if your cell+gap width differs
                        top: 0,
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
                        return <div
                          key={`empty-${weekIndex}-${dayIndex}`}
                          className="w-3 h-3 rounded-sm border bg-gray-100 border-gray-200"
                        />;
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
            <span className="font-medium">{uniqueActivity.reduce((sum, d) => sum + (d.content_types?.exercise || 0), 0)} exercices</span>
          </div>
          <div className="flex items-center gap-1">
            <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
            <span className="font-medium">{uniqueActivity.reduce((sum, d) => sum + (d.content_types?.lesson || 0), 0)} leçons</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-green-600" />
            <span className="font-medium">{uniqueActivity.reduce((sum, d) => sum + (d.content_types?.exam || 0), 0)} examens</span>
          </div>
        </div>
      </div>
    </div>
  );
};

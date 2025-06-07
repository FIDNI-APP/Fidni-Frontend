// src/components/learningPath/LearningPathMap.tsx
import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  Lock, 
  PlayCircle, 
  ChevronLeft,
  Target,
  Trophy
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LearningPathMapProps {
  subject: any;
  onSelectChapter: (chapter: any) => void;
  onBack: () => void;
}

export const LearningPathMap: React.FC<LearningPathMapProps> = ({
  subject,
  onSelectChapter,
  onBack
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    // Animate the path drawing
    if (pathRef.current) {
      const length = pathRef.current.getTotalLength();
      pathRef.current.style.strokeDasharray = `${length}`;
      pathRef.current.style.strokeDashoffset = `${length}`;
      
      setTimeout(() => {
        if (pathRef.current) {
          pathRef.current.style.transition = 'stroke-dashoffset 2s ease-in-out';
          pathRef.current.style.strokeDashoffset = '0';
        }
      }, 100);
    }
  }, []);

  const getNodePosition = (index: number) => {
    const columns = 3;
    const row = Math.floor(index / columns);
    const col = index % columns;
    const isEvenRow = row % 2 === 0;
    
    const x = isEvenRow ? 150 + col * 250 : 650 - col * 250;
    const y = 150 + row * 200;
    
    return { x, y };
  };

  const generatePath = () => {
    let path = '';
    interface ChapterPosition {
        x: number;
        y: number;
    }

    interface Chapter {
        id: string;
        number: number;
        title: string;
        completed: boolean;
        locked: boolean;
        progress: number;
    }

            subject.chapters.forEach((_chapter: Chapter, index: number) => {
                const pos: ChapterPosition = getNodePosition(index);
                if (index === 0) {
                    path += `M ${pos.x} ${pos.y}`;
                } else {
                    const prevPos: ChapterPosition = getNodePosition(index - 1);
                    // Create curved path between nodes
                    const midX: number = (prevPos.x + pos.x) / 2;
                    const midY: number = (prevPos.y + pos.y) / 2;
                    const controlY: number = midY - 30;
                    path += ` Q ${midX} ${controlY}, ${pos.x} ${pos.y}`;
                }
            });
    return path;
  };

  const getChapterIcon = (chapter: any) => {
    if (chapter.completed) return CheckCircle;
    if (chapter.locked) return Lock;
    if (chapter.progress > 0) return PlayCircle;
    return Target;
  };


  return (
    <div className="relative">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Retour
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{subject.name}</h2>
              <p className="text-gray-600 mt-1">
                {subject.completedChapters} chapitres complétés sur {subject.totalChapters}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{subject.progress}%</div>
              <div className="text-sm text-gray-600">Progression</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                <Trophy className="w-8 h-8 mx-auto" />
              </div>
              <div className="text-sm text-gray-600">Niveau 3</div>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Path Visual */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="relative h-[800px] overflow-auto">
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox="0 0 900 1000"
            className="absolute inset-0"
          >
            {/* Background Grid */}
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path
                  d="M 50 0 L 0 0 0 50"
                  fill="none"
                  stroke="#f3f4f6"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Path */}
            <path
              ref={pathRef}
              d={generatePath()}
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            
            {/* Gradient Definition */}
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>

            {/* Chapter Nodes */}
            {subject.chapters.map((chapter: any, index: number) => {
              const pos = getNodePosition(index);
              const Icon = getChapterIcon(chapter);
              const isAccessible = !chapter.locked;
              
              return (
                <motion.g
                  key={chapter.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 + 0.5 }}
                  className={isAccessible ? 'cursor-pointer' : 'cursor-not-allowed'}
                  onClick={() => isAccessible && onSelectChapter(chapter)}
                >
                  {/* Node Background */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="60"
                    className="fill-white stroke-2"
                    stroke={chapter.completed ? '#10b981' : chapter.locked ? '#9ca3af' : '#6366f1'}
                  />
                  
                  {/* Progress Ring */}
                  {chapter.progress > 0 && chapter.progress < 100 && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="55"
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="4"
                      strokeDasharray={`${2 * Math.PI * 55 * chapter.progress / 100} ${2 * Math.PI * 55}`}
                      strokeLinecap="round"
                      transform={`rotate(-90 ${pos.x} ${pos.y})`}
                    />
                  )}
                  
                  {/* Chapter Number */}
                  <text
                    x={pos.x}
                    y={pos.y - 20}
                    textAnchor="middle"
                    className="fill-gray-900 font-bold text-xl"
                  >
                    {chapter.number}
                  </text>
                  
                  {/* Icon */}
                  <g transform={`translate(${pos.x - 16}, ${pos.y - 5})`}>
                    {Icon === CheckCircle && (
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    )}
                    {Icon === Lock && (
                      <Lock className="w-8 h-8 text-gray-400" />
                    )}
                    {Icon === PlayCircle && (
                      <PlayCircle className="w-8 h-8 text-amber-500" />
                    )}
                    {Icon === Target && (
                      <Target className="w-8 h-8 text-indigo-600" />
                    )}
                  </g>
                  
                  {/* Chapter Title */}
                  <foreignObject
                    x={pos.x - 80}
                    y={pos.y + 70}
                    width="160"
                    height="60"
                  >
                    <div className="text-center">
                        <p className="text-sm font-medium text-gray-900 line-clamp-2">
                       {chapter.title.split(':')[1]?.trim() || chapter.title}
                     </p>
                   </div>
                 </foreignObject>
                 
                 {/* Hover Effect */}
                 {isAccessible && (
                   <circle
                     cx={pos.x}
                     cy={pos.y}
                     r="65"
                     fill="none"
                     stroke="url(#gradient)"
                     strokeWidth="2"
                     opacity="0"
                     className="hover:opacity-100 transition-opacity"
                   />
                 )}
               </motion.g>
             );
           })}

           {/* Milestone Badges */}
           {[2, 5, 7].map((chapterIndex) => {
             const pos = getNodePosition(chapterIndex);
             return (
               <motion.g
                 key={`milestone-${chapterIndex}`}
                 initial={{ scale: 0 }}
                 animate={{ scale: 1 }}
                 transition={{ delay: chapterIndex * 0.1 + 1 }}
               >
                 <circle
                   cx={pos.x + 50}
                   cy={pos.y - 50}
                   r="20"
                   className="fill-yellow-400"
                 />
                 <g transform={`translate(${pos.x + 50 - 12}, ${pos.y - 50 - 12})`}>
                   <Trophy className="w-6 h-6 text-yellow-600" />
                 </g>
               </motion.g>
             );
           })}
         </svg>
       </div>

       {/* Legend */}
       <div className="bg-gray-50 p-4 border-t">
         <div className="flex items-center justify-center gap-8 text-sm">
           <div className="flex items-center gap-2">
             <CheckCircle className="w-5 h-5 text-green-500" />
             <span className="text-gray-600">Complété</span>
           </div>
           <div className="flex items-center gap-2">
             <PlayCircle className="w-5 h-5 text-amber-500" />
             <span className="text-gray-600">En cours</span>
           </div>
           <div className="flex items-center gap-2">
             <Target className="w-5 h-5 text-indigo-600" />
             <span className="text-gray-600">À faire</span>
           </div>
           <div className="flex items-center gap-2">
             <Lock className="w-5 h-5 text-gray-400" />
             <span className="text-gray-600">Verrouillé</span>
           </div>
         </div>
       </div>
     </div>
   </div>
 );
};
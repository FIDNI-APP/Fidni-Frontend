import React from 'react';
import { BookOpen, MessageSquare, GitPullRequest, Activity } from 'lucide-react';

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}

export const TabButton: React.FC<TabButtonProps> = ({ 
  active, 
  onClick, 
  icon, 
  label, 
  count 
}) => {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 flex items-center space-x-2 border-b-2 transition-colors whitespace-nowrap ${
        active 
          ? 'border-white text-white font-medium' 
          : 'border-transparent text-white/70 hover:text-white hover:border-white/50'
      }`}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
          active ? 'bg-white text-indigo-700' : 'bg-white/20 text-white'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
};

interface TabNavigationProps {
  activeSection: 'exercise' | 'discussions' | 'proposals' | 'activity';
  setActiveSection: (section: 'exercise' | 'discussions' | 'proposals' | 'activity') => void;
  commentsCount: number;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeSection,
  setActiveSection,
  commentsCount
}) => {
  return (
    <div className="flex overflow-x-auto border-b border-white/20 mt-2">
      <TabButton 
        active={activeSection === 'exercise'} 
        onClick={() => setActiveSection('exercise')}
        icon={<BookOpen className="w-4 h-4" />}
        label="Exercice"
      />
      
      <TabButton 
        active={activeSection === 'discussions'} 
        onClick={() => setActiveSection('discussions')}
        icon={<MessageSquare className="w-4 h-4" />}
        label="Discussions"
        count={commentsCount}
      />
      
      <TabButton 
        active={activeSection === 'proposals'} 
        onClick={() => setActiveSection('proposals')}
        icon={<GitPullRequest className="w-4 h-4" />}
        label="Solutions alternatives"
      />
      
      <TabButton 
        active={activeSection === 'activity'} 
        onClick={() => setActiveSection('activity')}
        icon={<Activity className="w-4 h-4" />}
        label="Activité"
      />
    </div>
  );
};
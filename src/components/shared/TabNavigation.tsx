/**
 * Generic Tab Navigation Component
 * Consolidated from exam/TabNavigation and exercise/TabNavigation (~95% identical)
 *
 * This component provides a flexible tab navigation system for content detail pages.
 */

import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

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
      className={`relative px-5 py-3 flex items-center space-x-2 border-b-3 transition-all duration-300 whitespace-nowrap group ${
        active
          ? 'border-white text-white font-semibold bg-white/10'
          : 'border-transparent text-white/60 hover:text-white/90 hover:bg-white/5'
      }`}
    >
      {/* Icon with color */}
      <span className={`transition-colors ${active ? 'text-yellow-300' : 'text-white/60 group-hover:text-yellow-200'}`}>
        {icon}
      </span>
      <span className="font-medium">{label}</span>
      {count !== undefined && count > 0 && (
        <span className={`ml-1.5 px-2.5 py-0.5 text-xs font-bold rounded-full transition-all ${
          active
            ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 shadow-sm'
            : 'bg-white/20 text-white group-hover:bg-white/30'
        }`}>
          {count}
        </span>
      )}
      {/* Active indicator bar */}
      {active && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 rounded-t-full"></div>
      )}
    </button>
  );
};

interface TabNavigationProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = ''
}) => {
  return (
    <div className={`flex overflow-x-auto border-b border-white/20 mt-2 ${className}`}>
      {tabs.map((tab) => (
        <TabButton
          key={tab.id}
          active={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
          icon={tab.icon}
          label={tab.label}
          count={tab.count}
        />
      ))}
    </div>
  );
};

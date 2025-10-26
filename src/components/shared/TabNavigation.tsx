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

import React from 'react';

interface EditorTheme {
  name: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
}

interface EditorSettingsProps {
  showSettings: boolean;
  editorThemes: EditorTheme[];
  currentTheme: EditorTheme;
  setCurrentTheme: (theme: EditorTheme) => void;
}

export const EditorSettings: React.FC<EditorSettingsProps> = ({
  showSettings,
  editorThemes,
  currentTheme,
  setCurrentTheme
}) => {
  if (!showSettings) return null;

  return (
    <div className="settings-container absolute right-0 mt-1 p-3 bg-white rounded-lg shadow-xl border border-gray-200 z-40 w-64">
      <div className="text-sm font-medium mb-2 text-gray-700 pb-1 border-b">Thèmes</div>
      <div className="space-y-1.5 mt-2">
        {editorThemes.map((theme, index) => (
          <button
            key={theme.name}
            onClick={() => setCurrentTheme(theme)}
            className={`w-full text-left px-2 py-1.5 text-sm hover:bg-gray-50 rounded-md flex items-center ${
              currentTheme.name === theme.name ? 'bg-indigo-50 text-indigo-700' : ''
            }`}
          >
            <div className={`w-4 h-4 rounded-full mr-2 bg-gradient-to-r ${theme.accentColor}`}></div>
            {theme.name}
          </button>
        ))}
      </div>
    </div>
  );
};
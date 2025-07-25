// src/components/learningpath/TranscriptTab.tsx
import React from 'react';

interface TranscriptTabProps {
  videoId: string;
}

export const TranscriptTab: React.FC<TranscriptTabProps> = ({ videoId }) => {
  // In a real implementation, you would fetch the transcript from an API
  // For now, we'll show a placeholder
  
  return (
    <div className="bg-white rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Video Transcript</h3>
      <div className="prose prose-sm max-w-none">
        <p className="text-gray-600 italic">
          Transcript feature coming soon. This will display the full transcript 
          of the video with timestamps, allowing you to jump to specific parts 
          of the video by clicking on the transcript text.
        </p>
      </div>
    </div>
  );
};
// src/components/profile/UserSettings.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
// Import from your preferred UI library
// Example: import { Button, Form, ToggleButton } from 'react-bootstrap';
// Or: import { Button, Switch, Select, FormControl, RadioGroup, Radio } from '@mui/material';
import { updateUserSettings } from '@/lib/api';
import { toast } from 'react-hot-toast';

// Define interfaces for the settings
interface UserSettings {
  display_email: boolean;
  display_stats: boolean;
  email_notifications: boolean;
  comment_notifications: boolean;
  solution_notifications: boolean;
}

export const UserSettings: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({
    display_email: false,
    display_stats: true,
    email_notifications: true,
    comment_notifications: true,
    solution_notifications: true
  });
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (user && user.profile) {
      setSettings({
        display_email: user.profile.display_email || false,
        display_stats: user.profile.display_stats || true,
        email_notifications: user.profile.email_notifications || true,
        comment_notifications: user.profile.comment_notifications || true,
        solution_notifications: user.profile.solution_notifications || true
      });
    }
  }, [user]);
  
  const handleChange = (name: keyof UserSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await updateUserSettings(settings);
      await refreshUser();
      toast.success('Settings updated successfully');
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Replace the JSX with components from your preferred UI library
  // This is just a placeholder structure
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">User Settings</h2>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Appearance section */}
       
          
            
            {/* Math notation - replace with your UI library's Radio component */}
           
        
        {/* Privacy section */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium border-b pb-2">Privacy</h3>
          
          <div className="space-y-4">
            {/* Display email - replace with your UI library's Switch component */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Display Email</label>
              {/* Example with a native checkbox (replace with your UI library component) */}
              <input
                type="checkbox"
                checked={settings.display_email}
                onChange={(e) => handleChange('display_email', e.target.checked)}
              />
            </div>
            
            {/* Display stats - replace with your UI library's Switch component */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Display Statistics</label>
              {/* Example with a native checkbox (replace with your UI library component) */}
              <input
                type="checkbox"
                checked={settings.display_stats}
                onChange={(e) => handleChange('display_stats', e.target.checked)}
              />
            </div>
          </div>
        </div>
        
        {/* Notifications section */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium border-b pb-2">Notifications</h3>
          
          <div className="space-y-4">
            {/* Email notifications - replace with your UI library's Switch component */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Email Notifications</label>
              {/* Example with a native checkbox (replace with your UI library component) */}
              <input
                type="checkbox"
                checked={settings.email_notifications}
                onChange={(e) => handleChange('email_notifications', e.target.checked)}
              />
            </div>
            
            {/* Comment notifications - replace with your UI library's Switch component */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Comment Notifications</label>
              {/* Example with a native checkbox (replace with your UI library component) */}
              <input
                type="checkbox"
                checked={settings.comment_notifications}
                onChange={(e) => handleChange('comment_notifications', e.target.checked)}
              />
            </div>
            
            {/* Solution notifications - replace with your UI library's Switch component */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Solution Notifications</label>
              {/* Example with a native checkbox (replace with your UI library component) */}
              <input
                type="checkbox"
                checked={settings.solution_notifications}
                onChange={(e) => handleChange('solution_notifications', e.target.checked)}
              />
            </div>
          </div>
        </div>
        
        {/* Submit button - replace with your UI library's Button component */}
        <div className="pt-4 border-t border-gray-200">
          {/* Example with a native button (replace with your UI library component) */}
          <button 
            type="submit" 
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md"
          >
            {isLoading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};
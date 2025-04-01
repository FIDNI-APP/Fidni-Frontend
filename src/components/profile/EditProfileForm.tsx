import React, { useState } from 'react';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Save, X } from 'lucide-react';

interface EditProfileFormProps {
  user: User;
  onSave: (userData: any) => Promise<void>;
  onCancel: () => void;
}

export const EditProfileForm: React.FC<EditProfileFormProps> = ({ 
  user, 
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    username: user.username,
    email: user.email,
    bio: user.profile.bio || '',
    display_email: user.profile.display_email,
    display_stats: user.profile.display_stats,
    email_notifications: user.profile.email_notifications,
    comment_notifications: user.profile.comment_notifications,
    solution_notifications: user.profile.solution_notifications,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Format the data in the structure expected by the API
      const userData = {
        username: formData.username,
        email: formData.email,
        profile: {
          bio: formData.bio,
          display_email: formData.display_email,
          display_stats: formData.display_stats,
          email_notifications: formData.email_notifications,
          comment_notifications: formData.comment_notifications,
          solution_notifications: formData.solution_notifications,
        }
      };

      await onSave(userData);
    } catch (err) {
      console.error('Failed to save profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Edit Profile</h2>
        <Button 
          variant="ghost"
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 p-1"
          aria-label="Cancel"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Your username"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Your email address"
            />
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Tell us about yourself"
            />
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Privacy Settings</h3>
            
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="display_email"
                  name="display_email"
                  checked={formData.display_email}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="display_email" className="ml-3 text-sm text-gray-700">
                  Display my email on my profile
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="display_stats"
                  name="display_stats"
                  checked={formData.display_stats}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="display_stats" className="ml-3 text-sm text-gray-700">
                  Display my statistics publicly
                </label>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Settings</h3>
            
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="email_notifications"
                  name="email_notifications"
                  checked={formData.email_notifications}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="email_notifications" className="ml-3 text-sm text-gray-700">
                  Receive email notifications
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="comment_notifications"
                  name="comment_notifications"
                  checked={formData.comment_notifications}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="comment_notifications" className="ml-3 text-sm text-gray-700">
                  Notify me about comments on my content
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="solution_notifications"
                  name="solution_notifications"
                  checked={formData.solution_notifications}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="solution_notifications" className="ml-3 text-sm text-gray-700">
                  Notify me about new solutions
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="border-gray-300 text-gray-700"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
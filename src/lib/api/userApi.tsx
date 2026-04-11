import {api} from './apiClient';
import { getCurrentUser } from './authApi';

export const updateUserProfile = async (username: string, userData: any) => {
  try {
    const response = await api.patch(`/users/${encodeURIComponent(username)}/`, userData);
    return response.data;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

export const saveUserSubjectGrades = async (userId: string, subjectGrades: any[]) => {
  try {
    const response = await api.post(`/users/${userId}/subject-grades/`, { subject_grades: subjectGrades });
    return response.data;
  } catch (error) {
    console.error("Error saving subject grades:", error);
    throw error;
  }
};

export const saveUserType = async (userId: string, userType: string) => {
  try {
    const response = await api.post(`/users/${userId}/user-type/`, { user_type: userType });
    return response.data;
  } catch (error) {
    console.error("Error saving user type:", error);
    throw error;
  }
};

export const getUserProfile = async (username: string) => {
  try {
    const response = await api.get(`/users/${username}/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
};

export const getUserStats = async (username: string) => {
  try {
    const response = await api.get(`/users/${username}/stats/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching user stats:", error);
    throw error;
  }
};

export const getUserContributions = async (username: string) => {
  try {
    const response = await api.get(`/users/${username}/contributions/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching user contributions:", error);
    throw error;
  }
};

export const getUserSavedExercises = async (username: string) => {
  try {
    const response = await api.get(`/users/${username}/saved_exercises/`);
    console.log("Saved exercises response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching saved exercises:", error);
    throw error;
  }
};

export const getUserSavedLessons = async (username: string) => {
  try {
    const response = await api.get(`/users/${username}/saved_lessons/`);
    console.log("Saved lessons response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching saved lessons:", error);
    throw error;
  }
};

export const getUserSavedExams = async (username: string) => {
  try {
    const response = await api.get(`/users/${username}/saved_exams/`);
    console.log("Saved exams response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching saved exams:", error);
    throw error;
  }
};

export const getUserProgressExercises = async (username: string, progress: string) => {
  try {
    const response = await api.get(`/users/${username}/${progress}_thing/`);
    console.log("Progress exercises response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching progress exercises:", error);
    throw error;
  }
};

export const getUserHistory = async (username: string) => {
  try {
    const response = await api.get(`/users/${username}/history/`);
    console.log("User history response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching user history:", error);
    throw error;
  }
};

export const checkOnboardingStatus = async (username: string) => {
  try {
    const response = await api.get(`/users/${username}/onboarding-status/`);
    return response.data;
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    throw error;
  }
};

export const getOnboardingData = async () => {
  try {
    const response = await api.get('/onboarding/');
    return response.data;
  } catch (error) {
    console.error("Error fetching onboarding data:", error);
    throw error;
  }
};

export const saveOnboardingProfile = async (data: {
  class_level: string;
  user_type: string;
  bio: string;
  favorite_subjects: string[];
  subject_grades: {
    subject: string;
    min_grade: number;
    max_grade: number;
  }[];
}) => {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      throw new Error('User not logged in');
    }
    
    const profileData = {
      username: currentUser.username,
      profile: {
        bio: data.bio,
        class_level: data.class_level,
        user_type: data.user_type,
        favorite_subjects: data.favorite_subjects,
        onboarding_completed: true,
        subject_grades: data.subject_grades
      }
    };
    
    const response = await api.post('/onboarding/', profileData);
    return response.data;
  } catch (error) {
    console.error('Error saving onboarding profile:', error);
    throw error;
  }
};

export const uploadAvatar = async (file: File): Promise<{ avatar_url: string }> => {
  const formData = new FormData();
  formData.append('avatar', file);
  
  const response = await api.post('/users/avatar/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Remove avatar
export const removeAvatar = async (): Promise<void> => {
  await api.delete('/users/avatar/');
};

// Change password
export const changePassword = async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
  const response = await api.post('/auth/password/change/', {
    current_password: currentPassword,
    new_password: newPassword,
  });
  return response.data;
};

// Update user info (first_name, last_name, email)
export const updateUserInfo = async (data: {
  first_name?: string;
  last_name?: string;
  email?: string;
}): Promise<any> => {
  const response = await api.patch('/auth/user/update/', data);
  return response.data;
};

// Get onboarding state
export const getOnboardingState = async () => {
  const response = await api.get('/onboarding/');
  return response.data;
};

// Update onboarding step (partial save)
export const updateOnboardingStep = async (data: any) => {
  const response = await api.patch('/onboarding/', data);
  return response.data;
};

// Complete onboarding
export const completeOnboarding = async (data: any) => {
  const response = await api.post('/onboarding/', data);
  return response.data;
};

// ============ TEACHER INVITATIONS ============

export const getTeacherStudents = async () => {
  const response = await api.get('/teacher-invitations/');
  return response.data; // { students: [], invitations: [] }
};

export const sendTeacherInvitation = async (identifier: string) => {
  const response = await api.post('/teacher-invitations/', { identifier });
  return response.data;
};

export const deleteTeacherInvitation = async (invitationId: number) => {
  await api.delete(`/teacher-invitations/${invitationId}/`);
};

export const getStudentInvitations = async () => {
  const response = await api.get('/student-invitations/');
  return response.data; // array of pending invitations
};

export const respondToInvitation = async (invitationId: number, action: 'accept' | 'decline') => {
  const response = await api.patch(`/teacher-invitations/${invitationId}/respond/`, { action });
  return response.data;
};
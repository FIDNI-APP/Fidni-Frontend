import {api, storeTokens} from './apiClient';
import { getCurrentUser } from './authApi';

export const updateUserProfile = async (_username: string, userData: any) => {
  try {
    const response = await api.patch('/users/me/', userData);
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
    return response.data;
  } catch (error) {
    console.error("Error fetching saved exercises:", error);
    throw error;
  }
};

export const getUserSavedLessons = async (username: string) => {
  try {
    const response = await api.get(`/users/${username}/saved_lessons/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching saved lessons:", error);
    throw error;
  }
};

export const getUserSavedExams = async (username: string) => {
  try {
    const response = await api.get(`/users/${username}/saved_exams/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching saved exams:", error);
    throw error;
  }
};

export const getUserProgressExercises = async (username: string, progress: string) => {
  try {
    const response = await api.get(`/users/${username}/${progress}_thing/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching progress exercises:", error);
    throw error;
  }
};

export const getUserHistory = async (username: string) => {
  try {
    const response = await api.get(`/users/${username}/history/`);
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
/**
 * Changer de mot de passe. `currentPassword` vide/absent : compte sans mot de passe (créé avec Google),
 * le serveur en définit un sans demander l'actuel.
 */
export const changePassword = async (currentPassword: string | null | undefined, newPassword: string): Promise<{ message: string }> => {
  const response = await api.post('/auth/password/change/', {
    ...(currentPassword ? { current_password: currentPassword } : {}),
    new_password: newPassword,
  });
  // Les autres appareils sont déconnectés ; le serveur renvoie de nouveaux jetons pour celui-ci.
  if (response.data?.access) storeTokens(response.data.access, response.data.refresh);
  return response.data;
};

// Update user info (first_name, last_name, email)
export const updateUserInfo = async (data: {
  first_name?: string;
  last_name?: string;
  email?: string;
  /** Obligatoire quand l'e-mail change. Compte sans mot de passe (Google) : 400 {code:'set_password_first'}. */
  current_password?: string;
  /** Établissement de la liste officielle, ou nom libre (school_id vide). */
  school_id?: number | '';
  school_name?: string;
  gender?: 'M' | 'F' | 'N';
  /** AAAA-MM-JJ */
  birth_date?: string;
  /** Acceptation des CGU et de la politique de confidentialité en vigueur. */
  accept_terms?: boolean;
}): Promise<Record<string, unknown>> => {
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
/** Télécharge toutes ses données au format JSON (RGPD : accès et portabilité). */
export const downloadMyData = async (username: string) => {
  const response = await api.get('/auth/my-data/', { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fidni-mes-donnees-${username}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/** Supprime son propre compte (mot de passe exigé s'il en a un : pas pour un compte créé avec Google).
 *  Les contributions restent sous « Compte supprimé ». */
export const deleteMyAccount = async (password?: string) => {
  await api.post('/auth/delete-account/', password ? { password } : {});
};

/** Modération (admin) : supprime un compte ET son contenu. `confirm` = nom du compte recopié. */
export const moderationDeleteAccount = async (username: string, confirm: string) => {
  const response = await api.post(`/moderation/users/${encodeURIComponent(username)}/delete/`, { confirm });
  return response.data;
};

export interface SchoolOption {
  id: number;
  name: string;
  name_ar: string;
  city: string;
  region: string;
  kind: 'lycee' | 'college' | 'cpge' | 'prive';
  kind_label: string;
}

/** Établissements marocains (listes du ministère, data.gov.ma) correspondant à la recherche. */
export const searchSchools = async (q: string, signal?: AbortSignal): Promise<SchoolOption[]> => {
  const response = await api.get('/schools/', { params: { q }, signal });
  return Array.isArray(response.data) ? response.data : [];
};

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
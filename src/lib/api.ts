import axios from 'axios';
import Cookies from 'js-cookie';
import { SortOption, ClassLevelModel, SubjectModel, ChapterModel, Solution, Difficulty, Theorem, Subfield } from '../types';


// Create an axios instance with default configuration
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add a request interceptor to handle authentication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// A


// Add response interceptor to handle token storage
// Ajoutez une logique de rafraîchissement de token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Si 401 et qu'on n'a pas déjà essayé de rafraîchir le token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await api.post('/token/refresh/', { 
            refresh: refreshToken 
          });
          
          localStorage.setItem('token', response.data.access);
          api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
          
          // Refaire la requête originale avec le nouveau token
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Si le rafraîchissement échoue, déconnexion
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Add these functions to your existing lib/api.ts file

import { User, Content } from "@/types";



// /**
//  * Get user profile by ID or username
//  * This works with your current backend but uses the current user endpoint
//  * for now since there's no specific endpoint for getting other users
//  * 
//  * @param userId - User ID or username
//  * @returns User object
//  */
// export async function getUserById(userId: string): Promise<User> {
//   try {
//     // Currently your backend doesn't have a specific endpoint to get user by ID
//     // You should use your current user endpoint for the logged-in user
//     // For other users, we'll need to add that endpoint
//     const response = await fetch('/api/auth/user');

//     if (!response.ok) {
//       throw new Error(`Failed to fetch user: ${response.statusText}`);
//     }

//     return await response.json();
//   } catch (error) {
//     console.error("Error fetching user:", error);

//     // Fallback for development - remove when backend is updated
//     return {
//       id: userId,
//       username: "user_" + userId.substring(0, 5),
//       email: `user${userId.substring(0, 5)}@example.com`,
//       isAuthenticated: false,
//       joinedAt: new Date().toISOString(),
//       profile:
//     };
//   }
// }



type VoteValue = 1 | -1 | 0;  // Matches Vote.UP, Vote.DOWN, Vote.UNVOTE


export const voteExercise = async (id: string, value: VoteValue) => {
  try {
    const response = await api.post(`/exercises/${id}/vote/`, { value });
    return response.data.item; // Return the updated exercise
  } catch (error) {
    console.error('Vote error:', error);
    throw error;
  }
};


export const voteSolution = async (id: string, value: VoteValue) => {
  try {
    const response = await api.post(`/solutions/${id}/vote/`, { value });
    return response.data.item; // Return the updated exercise
  } catch (error) {
    console.error('Vote error:', error);
    throw error;
  }
};

export const voteComment = async (id: string, value: VoteValue) => {
  try {
    const response = await api.post(`/comments/${id}/vote/`, { value });
    return response.data.item; // Return the updated exercise
  } catch (error) {
    console.error('Vote error:', error);
    throw error;
  }
};



// Auth API


export const login = async (identifier: string, password: string) => {
  try {
    console.log(`Tentative de connexion avec: ${identifier}`);
    
    // Note: Assurez-vous que vous envoyez les bons paramètres selon votre API
    // Certaines API attendent 'username' et d'autres 'email' ou 'identifier'
    // Vérifiez la documentation de votre backend ou le code source
    const response = await api.post('/token/', { 
      username: identifier, // ou identifier ou email selon votre configuration backend
      password 
    });
    
    if (response.data.access) {
      console.log('Connexion réussie, token obtenu');
      localStorage.setItem('token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
    } else {
      console.warn('Réponse de connexion sans token d\'accès:', response.data);
    }
    
    return response.data;
  } catch (error) {
    console.error('Erreur de connexion détaillée:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('Réponse d\'erreur:', error.response.data);
      console.error('Status:', error.response.status);
    }
    throw error;
  }
};

export const logout = async () => {
  const response = await api.post('/auth/logout/');
  localStorage.removeItem('token');
  return response.data;
};


export const register = async (username: string, email: string, password: string) => {
  try {
    console.log(`Tentative d'inscription avec: ${username}, ${email}`);
    
    const response = await api.post('/auth/register/', { 
      username, 
      email, 
      password 
    });
    
    console.log('Inscription réussie:', response.data);
    return response.data;
  } catch (error) {
    console.error('Erreur d\'inscription détaillée:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('Réponse d\'erreur:', error.response.data);
      console.error('Status:', error.response.status);
    }
    throw error;
  }
};


export const updateUserProfile = async (userData: any) => {
  try {
    const response = await api.patch(`/users/${encodeURIComponent(userData.username)}/`, userData);
    return response.data;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

/**
 * Enregistre les notes par matière d'un utilisateur
 * @param userId - ID de l'utilisateur
 * @param subjectGrades - Notes par matière
 * @returns Résultat de l'opération
 */
export const saveUserSubjectGrades = async (userId: string, subjectGrades: any[]) => {
  try {
    const response = await api.post(`/users/${userId}/subject-grades/`, { subject_grades: subjectGrades });
    return response.data;
  } catch (error) {
    console.error("Error saving subject grades:", error);
    throw error;
  }
};

/**
 * Enregistre le type d'utilisateur (étudiant ou enseignant)
 * @param userId - ID de l'utilisateur
 * @param userType - Type d'utilisateur ('student' ou 'teacher')
 * @returns Résultat de l'opération
 */
export const saveUserType = async (userId: string, userType: string) => {
  try {
    const response = await api.post(`/users/${userId}/user-type/`, { user_type: userType });
    return response.data;
  } catch (error) {
    console.error("Error saving user type:", error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return null; // Return null without making API call if no token exists
    }
    
    // Make sure the Authorization header is set correctly before making the request
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    const response = await api.get('/auth/user/');
    return response.data;
  } catch (error) {
    console.error('Error getting current user:', error);
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // Token is invalid or expired, try to refresh
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const refreshResponse = await api.post('/token/refresh/', { 
            refresh: refreshToken 
          });
          
          if (refreshResponse.data.access) {
            localStorage.setItem('token', refreshResponse.data.access);
            api.defaults.headers.common['Authorization'] = `Bearer ${refreshResponse.data.access}`;
            
            // Retry the original request with new token
            const retryResponse = await api.get('/auth/user/');
            return retryResponse.data;
          }
        }
      } catch (refreshError) {
        // If refresh fails, clean up tokens
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
      }
    }
    return null;
  }
};



// Content API
export const getContents = async (params: {
  classLevels?: string[];
  subjects?: string[];
  chapters?: string[];
  difficulties?: Difficulty[];
  subfields?: string[];
  theorems?: string[];
  sort?: SortOption;
  page?: number;
  type?: string;
  per_page?: number;
}) => {
  const response = await api.get('/exercises/', { 
    params: {
      class_levels: params.classLevels,
      subjects: params.subjects,
      chapters: params.chapters,
      difficulties: params.difficulties,
      subfields : params.subfields,
      theorems : params.theorems
    } 
  });
  console.log(response.data.results)
  return {
    results: response.data.results || [],
    count: response.data.count || 0,
    next: response.data.next,
    previous: response.data.previous,
  };
};

export const createContent = async (data: {
  title: string;
  content: string;
  type: string;
  class_level: string[];
  subject: string;
  chapters: string[];
  difficulty: string;
  solution_content?: string;
}) => {
  const response = await api.post('/exercises/', data);
  return response.data;
};

export const getContentById = async (id: string) => {
  const response = await api.get(`/exercises/${id}/`);
  console.log('heeelllo')
  console.log(response.data)
  return response.data;
};

export const updateContent = async (id: string, data: {
  title: string;
  content: string;
  class_levels: string;
  subject: string;
  chapters: string[];
  difficulty: string;
  solution_content?: string;
}) => {
  const response = await api.put(`/exercises/${id}/`, data);
  return response.data;
};

export const deleteContent = async (id: string) => {
  await api.delete(`/exercises/${id}/`);
};

// Solution API
export const getSolution = async (id: string) => {
  const response = await api.get(`/solutions/${id}/`);
  return response.data;
};

export const updateSolution = async (id: string, data: { content: string }) => {
  const response = await api.put(`/solutions/${id}/`, data);
  return response.data;
};

export const deleteSolution = async (id: string) => {
  await api.delete(`/solutions/${id}/`);
};



export const addSolution = async (exerciseId: string, data: { content: string }): Promise<Solution> => {
  const response = await api.post(`/exercises/${exerciseId}/solution/`, data);
  return response.data;
};

// Comment API

export const addComment = async (exerciseId: string, content: string, parentId?: string) => {
  const response = await api.post(`/exercises/${exerciseId}/comment/`, { 
    content,
    parent: parentId
  });
  return response.data;
};

export const updateComment = async (commentId: string, content: string) => {
  const response = await api.put(`/comments/${commentId}/`, { content });
  return response.data;
};

export const deleteComment = async (commentId: string) => {
  await api.delete(`/comments/${commentId}/`);
};

// Content Tracking
export const markContentViewed = async (contentId: string) => {
  const response = await api.post(`/content/${contentId}/view/`);
  return response.data;
};

export const markContentCompleted = async (contentId: string) => {
  const response = await api.post(`/content/${contentId}/complete/`);
  return response.data;
};

// Hierarchical Data API
export const getClassLevels = async (): Promise<ClassLevelModel[]> => {
  const response = await api.get('/class-levels/');
  
  // Si la réponse est directement un tableau
  if (Array.isArray(response.data)) {
    return response.data;
  }
  
  // Si la réponse est un objet avec une propriété results (pour la compatibilité)
  return response.data.results || [];
};
export const getSubjects = async (classLevelId?: string[]): Promise<SubjectModel[]> => {
  const params = classLevelId ? { class_level: classLevelId } : {};
  const response = await api.get('/subjects/', { params });
  
  // Gère les deux formats de réponse
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.results || [];
};

export const getSubfields = async (subjectId: string, classLevelIds: string[]): Promise<Subfield[]> => {
  const params = classLevelIds ? { class_level: classLevelIds, subject: subjectId } : {};
  const response = await api.get('/subfields/', { params });
  
  // Gère les deux formats de réponse
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.results || [];
};

export const getChapters = async (subjectId: string, classLevelIds: string[], subfieldId: string[]): Promise<ChapterModel[]> => {
  const params = classLevelIds ? { class_level: classLevelIds, subject: subjectId, subfields: subfieldId } : {};
  const response = await api.get('/chapters/', { params });
  
  // Gère les deux formats de réponse
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.results || [];
};

export const getTheorems = async (subjectId: string, classLevelIds: string[], subfieldId: string[], chaptersId: string[]): Promise<Theorem[]> => {
  const params = classLevelIds ? { class_level: classLevelIds, subject: subjectId, subfields: subfieldId, chapters: chaptersId } : {};
  const response = await api.get('/theorems/', { params });
  
  // Gère les deux formats de réponse
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.results || [];
};




// Image Upload
export const uploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  const response = await api.post('/upload/image/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.url;
};


/**
 * Mark exercise progress as 'success' or 'review'
 * @param exerciseId - Exercise ID
 * @param status - Status value ('success' or 'review')
 * @returns Progress object
 */
export const markExerciseProgress = async (exerciseId: string, status: 'success' | 'review') => {
  const response = await api.post(`/exercises/${exerciseId}/mark_progress/`, { status });
  return response.data;
};

/**
 * Remove progress marking from an exercise
 * @param exerciseId - Exercise ID
 */
export const removeExerciseProgress = async (exerciseId: string) => {
  await api.delete(`/exercises/${exerciseId}/remove_progress/`);
};

/**
 * Save an exercise for later
 * @param exerciseId - Exercise ID
 * @returns Save record
 */
export const saveExercise = async (exerciseId: string) => {
  const response = await api.post(`/exercises/${exerciseId}/save_exercise/`);
  return response.data;
};

/**
 * Remove exercise from saved list
 * @param exerciseId - Exercise ID
 */
export const unsaveExercise = async (exerciseId: string) => {
  await api.delete(`/exercises/${exerciseId}/unsave_exercise/`);
};

// src/lib/api.ts - Add or update functions for user profile data

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

// In your API file
export const getUserSavedExercises = async (username: string) => {
  try {
    // Get IDs first
    const response = await api.get(`/users/${username}/saved_exercises/`);
    console.log("Saved exercises response:", response.data);
    
        // Return in the format your component expects
    return  response.data;
  } catch (error) {
    console.error("Error fetching saved exercises:", error);
    throw error;
  }
};

export const getUserProgressExercises = async (username: string, progress : string) => {
  try {
    // Get IDs first
    const response = await api.get(`/users/${username}/${progress}_thing/`);
    console.log("Saved exercises response:", response.data);
    
        // Return in the format your component expects
    return  response.data;
  } catch (error) {
    console.error("Error fetching saved exercises:", error);
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


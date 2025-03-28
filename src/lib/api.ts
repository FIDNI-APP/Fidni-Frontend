import axios from 'axios';
import Cookies from 'js-cookie';
import { SortOption, ClassLevelModel, SubjectModel, ChapterModel, Solution, Difficulty, Theorem, Subfield } from '../types';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If 401 and not already trying to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await api.post('/token/refresh/', { 
            refresh: refreshToken 
          });
          
          if (response.data.access) {
            localStorage.setItem('token', response.data.access);
            api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
            
            // Update the auth header for the original request
            originalRequest.headers['Authorization'] = `Bearer ${response.data.access}`;
            
            // Retry the original request
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        // If refresh fails, clean up
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
      }
    }
    
    return Promise.reject(error);
  }
);

// Updated functions for src/lib/api.ts

/**
 * Get user profile by username
 * @param username - Username to look up
 * @returns User object with profile data
 */
export async function getUserById(username: string): Promise<User> {
  try {
    // Update this to use a proper endpoint for fetching user profiles
    const response = await api.get(`/users/${username}/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching user:", error);
    throw error;
  }
}

/**
 * Get exercises created by a specific user
 * @param username - Username to look up
 * @returns Object containing results array of Content
 */
export async function getUserContributions(username: string): Promise<{ results: Content[] }> {
  try {
    const response = await api.get(`/exercises/`, {
      params: { author: username }
    });
    
    return {
      results: response.data.results || []
    };
  } catch (error) {
    console.error("Error fetching user contributions:", error);
    throw error;
  }
}

// In src/lib/api.ts
export async function getSavedContents(): Promise<{ results: Content[] }> {
  try {
    // Use your existing endpoint for saved items
    const response = await api.get(`/saves/`, {
      params: { type: 'exercise' }  // Filter by exercise type if needed
    });
    return {
      results: response.data.results || []
    };
  } catch (error) {
    console.error("Error fetching saved content:", error);
    throw error;
  }
}

/**
 * Follow a user
 * @param username - Username to follow
 * @returns Success response
 */
export async function followUser(username: string): Promise<any> {
  try {
    const response = await api.post(`/users/${username}/follow/`);
    return response.data;
  } catch (error) {
    console.error("Error following user:", error);
    throw error;
  }
}

/**
 * Unfollow a user
 * @param username - Username to unfollow
 * @returns Success response
 */
export async function unfollowUser(username: string): Promise<any> {
  try {
    const response = await api.post(`/users/${username}/unfollow/`);
    return response.data;
  } catch (error) {
    console.error("Error unfollowing user:", error);
    throw error;
  }
}

/**
 * Check if current user is following another user
 * @param username - Username to check
 * @returns Boolean indicating follow status
 */
export async function isFollowingUser(username: string): Promise<boolean> {
  try {
    const response = await api.get(`/users/${username}/is-following/`);
    return response.data.is_following;
  } catch (error) {
    console.error("Error checking follow status:", error);
    return false;
  }
}


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

/**
 * Get user profile by ID or username
 * @param userId - User ID or username
 * @returns User object
 */
// Add these functions to your existing lib/api.ts file


/**
 * Get user profile by ID or username
 * This works with your current backend but uses the current user endpoint
 * for now since there's no specific endpoint for getting other users
 * 





/**
 * Get user statistics (works with your current backend)
 * @returns User statistics
 */

type VoteValue = 1 | -1 | 0;  // Matches Vote.UP, Vote.DOWN, Vote.UNVOTE
type VoteTarget = 'exercise' | 'solution' | 'comment';

const voteContent = async (contentId: string, value: VoteValue, target: VoteTarget) => {
  const endpoints = {
    exercise: `/exercises/${contentId}/vote/`,
    solution: `/solutions/${contentId}/vote/`,
    comment: `/comments/${contentId}/vote/`,
  };

  const response = await api.post(endpoints[target], { value });
  return response.data;
};

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
  return voteContent(id, value, 'solution');
};

export const voteComment = async (id: string, value: VoteValue) => {
  return voteContent(id, value, 'comment');
};

// Auth API


export const login = async (identifier: string, password: string) => {
  try {
    // Utilisez l'endpoint token de SimpleJWT
    const response = await api.post('/token/', { 
      username: identifier, // ou email selon votre configuration 
      password 
    });
    
    if (response.data.access) {
      localStorage.setItem('token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
    }
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const logout = async () => {
  const response = await api.post('/auth/logout/');
  localStorage.removeItem('token');
  return response.data;
};
export const register = async (username: string, email: string, password: string) => {
  const response = await api.post('/auth/register/', { username, email, password });
  return response.data;
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
export const getSubjects = async (classLevelId?: string | string[]): Promise<SubjectModel[]> => {
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


// User Profile API
export const getUserProfile = async (username: string) => {
  const response = await api.get(`/users/${username}/`);
  return response.data;
};

export const updateUserProfile = async (data: any) => {
  const response = await api.put('/users/profile/', data);
  return response.data;
};



// User History and Stats
export const getUserHistory = async () => {
  const response = await api.get('/users/history/');
  return response.data;
};

export const getUserStats = async () => {
  const response = await api.get('/users/stats/');
  return response.data;
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

/**
 * Get user's progress and saved status for an exercise
 * @param exerciseId - Exercise ID
 * @returns Object with progress and saved status
 */
export const getExerciseUserStatus = async (exerciseId: string) => {
  const response = await api.get(`/exercises/${exerciseId}/user_status/`);
  return response.data;
};
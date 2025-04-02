// src/lib/api.ts (updated version)
import axios from 'axios';
import { SortOption, ClassLevelModel, SubjectModel, ChapterModel, Solution, Difficulty, Theorem, Subfield } from '../types';

// Create a public API client without credentials for anonymous requests
const publicApi = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  // Don't include credentials for anonymous requests
  withCredentials: false,
});

// Create an authenticated API client for requests requiring auth
const privateApi = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add a request interceptor to handle authentication for the private API
privateApi.interceptors.request.use(
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

// Add response interceptor to handle token refresh for private API
privateApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Si 401 et qu'on n'a pas déjà essayé de rafraîchir le token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await privateApi.post('/token/refresh/', { 
            refresh: refreshToken 
          });
          
          localStorage.setItem('token', response.data.access);
          privateApi.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
          
          // Refaire la requête originale avec le nouveau token
          return privateApi(originalRequest);
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

// Helper to select the right API client based on the request type
const getApiClient = (requiresAuth = false) => {
  return requiresAuth ? privateApi : publicApi;
};

// Updated API methods using the appropriate client

// Authentication API
export const login = async (identifier: string, password: string) => {
  try {
    // Use public API for login
    const response = await publicApi.post('/token/', { 
      username: identifier,
      password 
    });
    
    if (response.data.access) {
      localStorage.setItem('token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      privateApi.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
    }
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const logout = async () => {
  // Use private API for logout
  const response = await privateApi.post('/auth/logout/');
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  return response.data;
};

export const register = async (username: string, email: string, password: string) => {
  // Use public API for registration
  const response = await publicApi.post('/auth/register/', { username, email, password });
  return response.data;
};

export const getCurrentUser = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return null; // Return null without making API call if no token exists
    }
    
    // Make sure the Authorization header is set correctly before making the request
    privateApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    const response = await privateApi.get('/auth/user/');
    return response.data;
  } catch (error) {
    console.error('Error getting current user:', error);
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // Token is invalid or expired, try to refresh
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const refreshResponse = await privateApi.post('/token/refresh/', { 
            refresh: refreshToken 
          });
          
          if (refreshResponse.data.access) {
            localStorage.setItem('token', refreshResponse.data.access);
            privateApi.defaults.headers.common['Authorization'] = `Bearer ${refreshResponse.data.access}`;
            
            // Retry the original request with new token
            const retryResponse = await privateApi.get('/auth/user/');
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

// Content API - Public endpoints that don't require auth
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
  // Use public API for read-only content
  const response = await publicApi.get('/exercises/', { 
    params: {
      class_levels: params.classLevels,
      subjects: params.subjects,
      chapters: params.chapters,
      difficulties: params.difficulties,
      subfields: params.subfields,
      theorems: params.theorems,
      page: params.page,
      per_page: params.per_page
    } 
  });
  
  return {
    results: response.data.results || [],
    count: response.data.count || 0,
    next: response.data.next,
    previous: response.data.previous,
  };
};

export const getContentById = async (id: string) => {
  // Use public API for read-only content
  const response = await publicApi.get(`/exercises/${id}/`);
  return response.data;
};

// Content API - Private endpoints that require auth
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
  // Use private API for content creation
  const response = await privateApi.post('/exercises/', data);
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
  // Use private API for content updates
  const response = await privateApi.put(`/exercises/${id}/`, data);
  return response.data;
};

export const deleteContent = async (id: string) => {
  // Use private API for content deletion
  await privateApi.delete(`/exercises/${id}/`);
};

// Solution API
export const getSolution = async (id: string) => {
  // Use public API for read-only content
  const response = await publicApi.get(`/solutions/${id}/`);
  return response.data;
};

export const updateSolution = async (id: string, data: { content: string }) => {
  // Use private API for content updates
  const response = await privateApi.put(`/solutions/${id}/`, data);
  return response.data;
};

export const deleteSolution = async (id: string) => {
  // Use private API for solution deletion
  await privateApi.delete(`/solutions/${id}/`);
};

export const addSolution = async (exerciseId: string, data: { content: string }): Promise<Solution> => {
  // Use private API for adding solutions
  const response = await privateApi.post(`/exercises/${exerciseId}/solution/`, data);
  return response.data;
};

// Comment API
export const addComment = async (exerciseId: string, content: string, parentId?: string) => {
  // Use private API for adding comments
  const response = await privateApi.post(`/exercises/${exerciseId}/comment/`, { 
    content,
    parent: parentId
  });
  return response.data;
};

export const updateComment = async (commentId: string, content: string) => {
  // Use private API for updating comments
  const response = await privateApi.put(`/comments/${commentId}/`, { content });
  return response.data;
};

export const deleteComment = async (commentId: string) => {
  // Use private API for deleting comments
  await privateApi.delete(`/comments/${commentId}/`);
};

// Voting
export const voteExercise = async (id: string, value: VoteValue) => {
  try {
    // Use private API for voting
    const response = await privateApi.post(`/exercises/${id}/vote/`, { value });
    return response.data.item;
  } catch (error) {
    console.error('Vote error:', error);
    throw error;
  }
};

export const voteSolution = async (id: string, value: VoteValue) => {
  try {
    // Use private API for voting
    const response = await privateApi.post(`/solutions/${id}/vote/`, { value });
    return response.data.item;
  } catch (error) {
    console.error('Vote error:', error);
    throw error;
  }
};

export const voteComment = async (id: string, value: VoteValue) => {
  try {
    // Use private API for voting
    const response = await privateApi.post(`/comments/${id}/vote/`, { value });
    return response.data.item;
  } catch (error) {
    console.error('Vote error:', error);
    throw error;
  }
};

// Content Tracking
export const markContentViewed = async (contentId: string) => {
  // Use private API for tracking
  const response = await privateApi.post(`/content/${contentId}/view/`);
  return response.data;
};

export const markExerciseProgress = async (exerciseId: string, status: 'success' | 'review') => {
  // Use private API for progress marking
  const response = await privateApi.post(`/exercises/${exerciseId}/mark_progress/`, { status });
  return response.data;
};

export const removeExerciseProgress = async (exerciseId: string) => {
  // Use private API for progress removal
  await privateApi.delete(`/exercises/${exerciseId}/remove_progress/`);
};

export const saveExercise = async (exerciseId: string) => {
  // Use private API for saving exercises
  const response = await privateApi.post(`/exercises/${exerciseId}/save_exercise/`);
  return response.data;
};

export const unsaveExercise = async (exerciseId: string) => {
  // Use private API for unsaving exercises
  await privateApi.delete(`/exercises/${exerciseId}/unsave_exercise/`);
};

// Hierarchical Data API - All public, read-only endpoints
export const getClassLevels = async (): Promise<ClassLevelModel[]> => {
  const response = await publicApi.get('/class-levels/');
  
  // Handle different response formats
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.results || [];
};

export const getSubjects = async (classLevelId?: string | string[]): Promise<SubjectModel[]> => {
  const params = classLevelId ? { class_level: classLevelId } : {};
  const response = await publicApi.get('/subjects/', { params });
  
  // Handle different response formats
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.results || [];
};

export const getSubfields = async (subjectId: string, classLevelIds: string[]): Promise<Subfield[]> => {
  const params = classLevelIds ? { class_level: classLevelIds, subject: subjectId } : {};
  const response = await publicApi.get('/subfields/', { params });
  
  // Handle different response formats
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.results || [];
};

export const getChapters = async (subjectId: string, classLevelIds: string[], subfieldId: string[]): Promise<ChapterModel[]> => {
  const params = classLevelIds ? { class_level: classLevelIds, subject: subjectId, subfields: subfieldId } : {};
  const response = await publicApi.get('/chapters/', { params });
  
  // Handle different response formats
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.results || [];
};

export const getTheorems = async (subjectId: string, classLevelIds: string[], subfieldId: string[], chaptersId: string[]): Promise<Theorem[]> => {
  const params = classLevelIds ? { class_level: classLevelIds, subject: subjectId, subfields: subfieldId, chapters: chaptersId } : {};
  const response = await publicApi.get('/theorems/', { params });
  
  // Handle different response formats
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.results || [];
};

// User Profile API
export const getUserProfile = async (username: string) => {
  try {
    // Public API for viewing profiles
    const response = await publicApi.get(`/users/${username}/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
};

export const getUserStats = async (username: string) => {
  try {
    // Public API for viewing stats
    const response = await privateApi.get(`/users/${username}/stats/`);
    console.log("User stats:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching user stats:", error);
    throw error;
  }
};

export const getUserContributions = async (username: string) => {
  try {
    // Public API for viewing contributions
    const response = await publicApi.get(`/users/${username}/contributions/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching user contributions:", error);
    throw error;
  }
};

// Private user data API
export const getUserSavedExercises = async (username: string) => {
  try {
    // Private API for viewing saved exercises
    const response = await privateApi.get(`/users/${username}/saved_exercises/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching saved exercises:", error);
    throw error;
  }
};

export const getUserProgressExercises = async (username: string, progress: string) => {
  try {
    // Private API for viewing progress
    const response = await privateApi.get(`/users/${username}/${progress}_thing/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching progress exercises:", error);
    throw error;
  }
};

export const getUserHistory = async (username: string) => {
  try {
    // Private API for viewing history
    const response = await privateApi.get(`/users/${username}/history/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching user history:", error);
    throw error;
  }
};

export const updateUserProfile = async (userData: any) => {
  try {
    // Private API for updating profile
    const response = await privateApi.patch(`/users/${encodeURIComponent(userData.username)}/`, userData);
    return response.data;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

// Type definition to avoid errors
type VoteValue = 1 | -1 | 0;
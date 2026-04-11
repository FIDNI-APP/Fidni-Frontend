/**
 * AI Correction API Client
 * Handles API calls for AI-powered solution correction
 */

import api from './index';
import type {
  AICorrection,
  AIChatResponse,
  StartChatResponse,
  PedagogicalChatRequest,
  PedagogicalChatResponse,
  PedagogicalMode
} from '@/types/aiCorrection';

export const aiCorrectionAPI = {
  /**
   * Start AI conversation before submission
   * @param contentType - 'exercise' or 'exam'
   * @param contentId - ID of the exercise/exam
   * @returns Greeting message and correction ID
   */
  startConversation: async (
    contentType: 'exercise' | 'exam',
    contentId: string
  ): Promise<StartChatResponse> => {
    const response = await api.post(`/contents/${contentId}/ai_start_chat/`, {});
    return response.data;
  },

  /**
   * Send pedagogical message
   * @param contentType - 'exercise' or 'exam'
   * @param contentId - ID of the exercise/exam
   * @param correctionId - ID of the correction
   * @param message - User's message
   * @param mode - Pedagogical mode
   * @returns AI response and updated context
   */
  sendPedagogicalMessage: async (
    contentType: 'exercise' | 'exam',
    contentId: string,
    correctionId: string,
    message: string,
    mode: PedagogicalMode = 'general'
  ): Promise<PedagogicalChatResponse> => {
    const response = await api.post(`/contents/${contentId}/ai_chat_pedagogical/`, {
      correction_id: correctionId,
      message,
      mode,
    });

    return response.data;
  },

  /**
   * Submit solution image for AI correction
   * @param contentType - 'exercise' or 'exam'
   * @param contentId - ID of the exercise/exam
   * @param imageFile - Solution image file
   * @param correctionId - Optional existing correction ID
   * @returns AI correction result
   */
  submitCorrection: async (
    contentType: 'exercise' | 'exam',
    contentId: string,
    imageFile: File,
    correctionId?: string
  ): Promise<AICorrection> => {
    const formData = new FormData();
    formData.append('image', imageFile);
    if (correctionId) {
      formData.append('correction_id', correctionId);
    }

    const response = await api.post(`/contents/${contentId}/ai_correct/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  /**
   * Continue chat about correction
   * @param contentType - 'exercise' or 'exam'
   * @param contentId - ID of the exercise/exam
   * @param correctionId - ID of the correction
   * @param message - User's message
   * @returns AI response and updated chat history
   */
  sendChatMessage: async (
    contentType: 'exercise' | 'exam',
    contentId: string,
    correctionId: string,
    message: string
  ): Promise<AIChatResponse> => {
    const response = await api.post(`/contents/${contentId}/ai_chat/`, {
      correction_id: correctionId,
      message,
    });

    return response.data;
  },

  /**
   * Get correction history for content
   * @param contentType - 'exercise' or 'exam'
   * @param contentId - ID of the exercise/exam
   * @returns List of past corrections
   */
  getCorrectionHistory: async (
    contentType: 'exercise' | 'exam',
    contentId: string
  ): Promise<AICorrection[]> => {
    const response = await api.get(`/contents/${contentId}/ai_corrections/`);
    return response.data;
  },
};

export default aiCorrectionAPI;

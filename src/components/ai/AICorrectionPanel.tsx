/**
 * AICorrectionPanel Component - Conversational Pedagogical Chatbot
 * Interactive AI teacher that guides students before and after solution submission
 */

import React, { useState, useEffect, useRef } from 'react';
import { Maximize2, Minimize2, Send, Sparkles, Loader2, Upload, CheckCircle, Lightbulb, BookOpen, MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import aiCorrectionAPI from '@/lib/api/aiCorrectionApi';
import type { ChatMessage, PedagogicalMode } from '@/types/aiCorrection';
import type { FlexibleExerciseStructure } from '@/components/content/editor/FlexibleExerciseEditor';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface AICorrectionPanelProps {
  contentType: 'exercise' | 'exam';
  contentId: string;
  solution?: string;
  totalPoints: number;
  structure?: FlexibleExerciseStructure;
  onExpandToggle?: (expanded: boolean) => void;
}

type PanelState = 'initializing' | 'chat' | 'analyzing' | 'error';

export const AICorrectionPanel: React.FC<AICorrectionPanelProps> = ({
  contentType,
  contentId,
  totalPoints,
  onExpandToggle,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [state, setState] = useState<PanelState>('initializing');
  const [correctionId, setCorrectionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>('');
  const [pedagogicalMode, setPedagogicalMode] = useState<PedagogicalMode>('general');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start conversation on mount
  useEffect(() => {
    startConversation();
  }, [contentType, contentId]);

  const startConversation = async () => {
    setState('initializing');
    try {
      const result = await aiCorrectionAPI.startConversation(contentType, contentId);
      setCorrectionId(result.correction_id);
      setMessages([{
        role: 'assistant',
        content: result.greeting_message,
        timestamp: Date.now()
      }]);
      setState('chat');
    } catch (err: any) {
      console.error('Failed to start conversation:', err);
      setError('Impossible de démarrer la conversation. Réessayez.');
      setState('error');
    }
  };

  const handleExpand = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    onExpandToggle?.(newExpanded);
  };

  const processImageFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError('Image trop volumineuse (max 10MB)');
      return;
    }

    setSelectedImage(file);
    setError('');

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        if (blob) {
          processImageFile(blob);
          // Show message to user
          const pasteMessage: ChatMessage = {
            role: 'assistant',
            content: '📎 Image collée ! Vous pouvez maintenant la soumettre pour correction.',
            timestamp: Date.now()
          };
          setMessages(prev => [...prev, pasteMessage]);
        }
        break;
      }
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !correctionId) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setSending(true);

    try {
      console.log('Sending pedagogical message:', {
        contentType,
        contentId,
        correctionId,
        message: userMessage.content,
        mode: pedagogicalMode
      });

      const result = await aiCorrectionAPI.sendPedagogicalMessage(
        contentType,
        contentId,
        correctionId,
        userMessage.content,
        pedagogicalMode
      );

      console.log('Received response:', result);
      console.log('Chat history length:', result.chat_history?.length);
      console.log('Response content:', result.response);

      // Update messages with chat history (it contains both user and AI messages)
      if (result.chat_history && result.chat_history.length > 0) {
        setMessages(result.chat_history);
      } else if (!result.response) {
        console.warn('Empty response and no chat history received from API');
        setError('Réponse vide reçue de l\'IA. Réessayez.');
        return;
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError('Échec de l\'envoi du message. Réessayez.');
    } finally {
      setSending(false);
    }
  };

  const handleSubmitSolution = async () => {
    if (!selectedImage || !correctionId) return;

    setState('analyzing');
    setError('');

    try {
      const result = await aiCorrectionAPI.submitCorrection(
        contentType,
        contentId,
        selectedImage,
        correctionId
      );

      setHasSubmitted(true);

      // Add score message
      const scoreMessage: ChatMessage = {
        role: 'assistant',
        content: `📊 **Résultat de la correction**\n\nScore: **${Number(result.score_awarded).toFixed(1)}/${result.score_total}** points\n\n${result.feedback.overall_comment || 'Voir les détails ci-dessous.'}`,
        timestamp: Date.now()
      };

      // Add question-by-question feedback
      const feedbackMessages: ChatMessage[] = [];
      Object.entries(result.feedback).forEach(([qId, qFeedback]: [string, any]) => {
        if (qId === 'overall_comment' || qId === 'error') return;

        const statusEmoji = qFeedback.status === 'correct' ? '✅' : qFeedback.status === 'partial' ? '⚠️' : '❌';

        let content = `${statusEmoji} **Question ${qId.toUpperCase()}** (${qFeedback.points} pts)\n\n${qFeedback.comment}`;

        if (qFeedback.strengths && qFeedback.strengths.length > 0) {
          content += `\n\n**Forces:**\n${qFeedback.strengths.map((s: string) => `• ${s}`).join('\n')}`;
        }

        if (qFeedback.weaknesses && qFeedback.weaknesses.length > 0) {
          content += `\n\n**Points à améliorer:**\n${qFeedback.weaknesses.map((w: string) => `• ${w}`).join('\n')}`;
        }

        if (qFeedback.suggestions) {
          content += `\n\n💡 **Suggestion:** ${qFeedback.suggestions}`;
        }

        feedbackMessages.push({
          role: 'assistant',
          content,
          timestamp: Date.now()
        });
      });

      setMessages(prev => [...prev, scoreMessage, ...feedbackMessages]);
      setState('chat');
    } catch (err: any) {
      console.error('Correction failed:', err);
      setError('Échec de l\'analyse. Réessayez.');
      setState('error');
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setHasSubmitted(false);
    setMessages([]);
    setCorrectionId(null);
    setError('');
    setPedagogicalMode('general');
    startConversation();
  };

  const getModeLabel = (mode: PedagogicalMode) => {
    switch (mode) {
      case 'hints': return 'Indices';
      case 'concepts': return 'Concepts';
      case 'socratic': return 'Socratique';
      default: return 'Général';
    }
  };

  const getModeIcon = (mode: PedagogicalMode) => {
    switch (mode) {
      case 'hints': return <Lightbulb className="w-3 h-3" />;
      case 'concepts': return <BookOpen className="w-3 h-3" />;
      case 'socratic': return <MessageCircle className="w-3 h-3" />;
      default: return <Sparkles className="w-3 h-3" />;
    }
  };

  return (
    <>
      {/* Backdrop */}
      {expanded && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
          onClick={handleExpand}
        />
      )}

      {/* Floating Panel */}
      <div
        className={`fixed bg-white shadow-2xl transition-all duration-300 flex flex-col z-50 animate-slideInFromBottom ${
          expanded
            ? 'top-0 right-0 bottom-0 w-full md:w-[600px] rounded-none'
            : 'bottom-6 right-6 w-96 h-[600px] rounded-2xl border border-gray-200'
        }`}
        style={{
          animation: 'slideInFromBottom 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0 bg-gradient-to-r from-indigo-600 to-purple-600">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-white" />
            <h3 className="font-semibold text-white">Assistant IA Pédagogique</h3>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleExpand}
              className="p-2 text-white hover:bg-white/20"
              title={expanded ? 'Réduire' : 'Agrandir'}
            >
              {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onExpandToggle?.(false)}
              className="p-2 text-white hover:bg-white/20"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

      {/* Mode Selection */}
      {!hasSubmitted && state === 'chat' && (
        <div className="flex gap-2 p-3 border-b border-gray-100 flex-shrink-0">
          {(['general', 'hints', 'concepts', 'socratic'] as PedagogicalMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setPedagogicalMode(mode)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                pedagogicalMode === mode
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {getModeIcon(mode)}
              {getModeLabel(mode)}
            </button>
          ))}
        </div>
      )}

      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onPaste={handlePaste}
        tabIndex={0}
      >
        {state === 'initializing' && (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
            <p className="text-sm text-gray-600">Initialisation de l'assistant...</p>
          </div>
        )}

        {state === 'analyzing' && (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
            <p className="text-sm text-gray-600">L'IA analyse votre solution...</p>
            <p className="text-xs text-gray-500 mt-1">Cela peut prendre quelques secondes</p>
          </div>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="p-4 bg-red-50 rounded-lg mb-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
            <Button onClick={handleReset} variant="outline" size="sm">
              Réessayer
            </Button>
          </div>
        )}

        {state === 'chat' && messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="text-sm break-words prose prose-sm max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  className={msg.role === 'user' ? 'text-white' : 'text-gray-900'}
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className={msg.role === 'user' ? 'text-white font-bold' : 'text-gray-900 font-bold'}>{children}</strong>,
                    ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                    li: ({ children }) => <li className="mb-1">{children}</li>,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
              <div className={`text-xs mt-1 ${msg.role === 'user' ? 'text-indigo-200' : 'text-gray-500'}`}>
                {new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {error && state === 'chat' && (
          <div className="p-3 bg-red-50 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Image Upload Area */}
      {selectedImage && !hasSubmitted && (
        <div className="p-3 border-t border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
            {imagePreview && (
              <img src={imagePreview} alt="Preview" className="w-16 h-16 object-cover rounded" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{selectedImage.name}</p>
              <p className="text-xs text-gray-500">{(selectedImage.size / 1024).toFixed(0)} KB</p>
            </div>
            <CheckCircle className="w-5 h-5 text-indigo-600 flex-shrink-0" />
          </div>
          <Button
            onClick={handleSubmitSolution}
            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            Soumettre pour correction
          </Button>
        </div>
      )}

      {/* Input Area */}
      {state === 'chat' && (
        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />

            {!selectedImage && !hasSubmitted && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex-shrink-0"
              >
                <Upload className="w-4 h-4" />
              </Button>
            )}

            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !sending && handleSendMessage()}
              onPaste={handlePaste}
              placeholder="Posez votre question ou collez une image..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              disabled={sending}
            />

            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || sending}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 flex-shrink-0"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>

          {hasSubmitted && (
            <Button
              onClick={handleReset}
              variant="outline"
              size="sm"
              className="w-full mt-2"
            >
              Nouvelle conversation
            </Button>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 rounded-b-xl flex-shrink-0">
        <p className="text-xs text-gray-500 text-center">
          Propulsé par OpenAI GPT-4 Vision • {totalPoints} pts
        </p>
      </div>

      {/* Animation Styles */}
      <style>{`
        @keyframes slideInFromBottom {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
    </>
  );
};

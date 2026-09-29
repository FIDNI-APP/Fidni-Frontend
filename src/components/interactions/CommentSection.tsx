import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  MessageSquare,
  X,
  Edit,
  Trash2,
  AtSign,
  ChevronDown,
  Send,
  AlertCircle,
  CornerDownRight,
  Paperclip,
  FileIcon,
  Image as ImageIcon
} from 'lucide-react';
import { Comment, User, VoteValue } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { isModerator } from '@/lib/features';
import { VoteButtonsComment } from '@/components/interactions/VoteButtonsComment';
import { FileUpload } from '@/components/common/FileUpload';
import { fileAPI } from '@/lib/api/contentItemApi';
import type { FileUploadResponse } from '@/types/fileAttachment';

interface CommentSectionProps {
  comments: Comment[];
  onAddComment: (content: string, parentId?: string, fileIds?: string[]) => Promise<void>;
  onVoteComment: (commentId: string, type: VoteValue) => Promise<void>;
  onEditComment: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
}

export function CommentSection({
  comments,
  onAddComment,
  onVoteComment,
  onEditComment,
  onDeleteComment,
}: CommentSectionProps) {
  const { isAuthenticated, user } = useAuth();

  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [cursorPosition, setCursorPosition] = useState<{ top: number; left: number } | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [showButtons, setShowButtons] = useState(false);
  const [showReplyButtons, setShowReplyButtons] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<FileUploadResponse[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);

  // Refs for textareas
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Sorting state
  const [sortOption, setSortOption] = useState<'mostUpvoted' | 'recent' | 'oldest'>(() => {
    const savedSortOption = localStorage.getItem('sortOption');
    return savedSortOption ? savedSortOption as 'mostUpvoted' | 'recent' | 'oldest' : 'mostUpvoted';
  });

  // Sort comments based on the selected option
  const sortedComments = React.useMemo(() => {
    const copy = [...comments];
    switch (sortOption) {
      case 'mostUpvoted':
        return copy.sort((a, b) => (b.vote_count) - (a.vote_count));
      case 'recent':
        return copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'oldest':
        return copy.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      default:
        return copy;
    }
  }, [comments, sortOption]);

  // Handle sorting option change
  const handleSortChange = (option: 'mostUpvoted' | 'recent' | 'oldest') => {
    setSortOption(option);
    localStorage.setItem('sortOption', option);
  };

  const handleStartReply = (commentId: string, authorUsername: string) => {
    setReplyingTo(commentId);
    setReplyContent(`@${authorUsername} `);
    setShowReplyButtons(true);
  };

  const handleMention = (username: string) => {
    const textarea = 
      commentTextareaRef.current || 
      replyTextareaRef.current || 
      editTextareaRef.current;
    
    if (!textarea) return;

    const currentContent = textarea.value;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = currentContent.substring(0, cursorPos);
    const textAfterCursor = currentContent.substring(cursorPos);

    const lastAtPos = textBeforeCursor.lastIndexOf('@');
    if (lastAtPos >= 0) {
      const newContent = textBeforeCursor.substring(0, lastAtPos) + `@${username} ` + textAfterCursor;

      if (replyingTo !== null) {
        setReplyContent(newContent);
      } else if (editingComment !== null) {
        setEditContent(newContent);
      } else {
        setNewComment(newContent);
      }
    }

    setShowMentions(false);
    textarea.focus();
  };

  const handleTextareaChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
    setter: (value: string) => void
  ) => {
    const { value, selectionStart } = e.target;
    setter(value);

    const textBeforeCursor = value.substring(0, selectionStart);
    const matches = textBeforeCursor.match(/@(\w*)$/);

    if (matches) {
      const position = getCaretCoordinates(e.target, selectionStart);
      
      // Calculate position relative to textarea
      const top = position.top;
      const left = position.left;

      setCursorPosition({
        top,
        left
      });

      setMentionFilter(matches[1]);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  useEffect(() => {
    const extractUsers = (comments: Comment[]): User[] => {
      const userMap = new Map<string, User>();

      const addUser = (user: User) => {
        if (!userMap.has(user.id)) {
          userMap.set(user.id, user);
        }
      };

      const processComments = (comments: Comment[]) => {
        comments.forEach((comment) => {
          addUser(comment.author);
          if (comment.replies) {
            processComments(comment.replies);
          }
        });
      };

      processComments(comments);
      return Array.from(userMap.values());
    };

    setUsers(extractUsers(comments));
  }, [comments]);

  // Close mentions on scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowMentions(false);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      await onAddComment(newComment, undefined, uploadedFiles.map(f => f.id));
      setNewComment('');
      setUploadedFiles([]);
      setShowButtons(false);
      setShowFileUpload(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = (file: FileUploadResponse) => {
    setUploadedFiles(prev => [...prev, file]);
    // Fichier ajouté : la zone de dépôt se referme (la pastille du fichier suffit).
    setShowFileUpload(false);
  };

  const handleRemoveFile = async (fileId: string) => {
    try {
      await fileAPI.delete(fileId);
      setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyContent.trim()) return;

    try {
      setSubmitting(true);
      await onAddComment(replyContent, parentId);
      setReplyContent('');
      setReplyingTo(null);
      setShowReplyButtons(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      setSubmitting(true);
      await onEditComment(commentId, editContent);
      setEditingComment(null);
      setEditContent('');
      setShowButtons(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (comment: Comment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
    setShowButtons(true);
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
    setEditContent('');
    setShowButtons(false);
  };

  const handleDelete = async (commentId: string) => {
    if (window.confirm('Supprimer ce commentaire ?')) {
      try {
        setSubmitting(true);
        await onDeleteComment(commentId);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const renderMentionsList = () => {
    if (!showMentions || !cursorPosition) return null;

    const filteredUsers = users.filter((u) =>
      u.username.toLowerCase().includes(mentionFilter.toLowerCase())
    );

    return (
      <div
        className="absolute z-50 bg-white rounded-lg shadow-lg border border-gray-200 max-h-48 overflow-y-auto"
        style={{
          top: `${cursorPosition.top + 20}px`,
          left: `${cursorPosition.left}px`,
        }}
      >
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <button
              key={user.id}
              type="button"
              className="w-full px-4 py-2 text-left hover:bg-indigo-50 flex items-center gap-2"
              onMouseDown={(e) => {
                e.preventDefault();
                handleMention(user.username);
              }}
            >
              <AtSign className="w-4 h-4 text-indigo-500" />
              {user.username}
            </button>
          ))
        ) : (
          <div className="px-4 py-2 text-gray-500 text-sm">Aucun utilisateur trouvé</div>
        )}
      </div>
    );
  };

  const renderCommentContent = (comment: Comment) => (
    <div className="bg-white rounded-xl p-4 border border-[#e7e3dc] hover:border-[#d8d4cc] transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
            {comment.author.username.charAt(0).toUpperCase()}
          </div>
          <div>
            {(comment.author as { is_deleted?: boolean }).is_deleted ? (
              <span className="font-bold text-sm text-[#9a958c] italic">Compte supprimé</span>
            ) : (
              <a
                href={`/profile/${comment.author.username}/`}
                className="font-bold text-sm text-gray-900 hover:text-indigo-600 hover:underline"
              >
                {comment.author.username}
              </a>
            )}
            <div className="flex items-center text-xs text-gray-500">
              <time dateTime={comment.created_at}>{formatTimeSince(comment.created_at)}</time>
            </div>
          </div>
        </div>
        
        {(user?.id === comment.author.id || isModerator(user)) && editingComment !== comment.id && (
          <div className="flex gap-1">
            {user?.id === comment.author.id && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStartEdit(comment);
              }}
              className="p-1 text-gray-400 hover:text-indigo-600 rounded-full hover:bg-indigo-50 transition-colors"
              title="Modifier le commentaire"
            >
              <Edit className="w-4 h-4" />
            </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(comment.id);
              }}
              className="p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
              title="Supprimer le commentaire"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {editingComment === comment.id ? (
        <div className="mt-3 relative">
          <textarea
            ref={editTextareaRef}
            value={editContent}
            onChange={(e) => handleTextareaChange(e, setEditContent)}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            rows={3}
            placeholder="Modifie ton commentaire…"
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelEdit}
              disabled={submitting}
              className="rounded-full border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={() => handleEditSubmit(comment.id)}
              disabled={submitting || !editContent.trim()}
              className="rounded-full bg-indigo-600 hover:bg-indigo-700"
            >
              {submitting ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-2 text-gray-800 whitespace-pre-wrap">
            {comment.content}
          </div>
          {comment.attachments && comment.attachments.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {comment.attachments.map((file: any) => {
                // URL stable (redirige vers une URL S3 fraîche) : l'URL signée expire.
                const href = file.download_url || file.url;
                return file.file_type === 'image' ? (
                  <a key={file.id} href={href} target="_blank" rel="noopener noreferrer"
                    className="block rounded-xl overflow-hidden border border-[#e7e3dc] bg-[#faf9f7] hover:border-[#d8d4cc]"
                    title={file.file_name}>
                    <img src={href} alt={file.file_name} loading="lazy" className="block max-h-56 max-w-[260px] object-contain" />
                  </a>
                ) : (
                  <a key={file.id} href={href} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-[#faf9f7] hover:bg-[#f2f1ee] px-3 py-2 rounded-lg border border-[#e7e3dc] transition-colors">
                    <FileIcon className="w-4 h-4 text-[#6b6862]" />
                    <span className="text-sm text-[#33302b]">{file.file_name}</span>
                  </a>
                );
              })}
            </div>
          )}
        </>
      )}

      <div className="mt-4 flex gap-3 items-center">
        {isAuthenticated && (
          <VoteButtonsComment
            initialVotes={comment.vote_count}
            onVote={(type: VoteValue) => onVoteComment(comment.id, type)}
            vertical={false}
            userVote={comment.user_vote}
          />
        )}

        {isAuthenticated && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleStartReply(comment.id, comment.author.username)}
            className="text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-full"
          >
            <MessageSquare className="w-4 h-4 mr-1" />
            Répondre
          </Button>
        )}
      </div>
    </div>
  );

  const renderReplyForm = (parentId: string, parentAuthor: string) => (
    <div className="mt-4 relative pl-6 border-l-2 border-indigo-100">
      <div className="flex items-center gap-2 mb-2">
        <CornerDownRight className="w-4 h-4 text-indigo-400" />
        <span className="text-sm text-gray-600">
          En réponse à <span className="font-medium text-indigo-600">@{parentAuthor}</span>
        </span>
        <button
          onClick={() => {
            setReplyingTo(null);
            setShowReplyButtons(false);
          }}
          className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
          title="Annuler la réponse"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="relative">
        <textarea
          ref={replyTextareaRef}
          value={replyContent}
          onChange={(e) => handleTextareaChange(e, setReplyContent)}
          placeholder="Écris ta réponse…"
          className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          rows={3}
        />
      </div>
      {showReplyButtons && (
        <div className="mt-2 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setReplyingTo(null);
              setShowReplyButtons(false);
            }}
            className="rounded-full border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Annuler
          </Button>
          <Button
            size="sm"
            onClick={() => handleSubmitReply(parentId)}
            disabled={submitting || !replyContent.trim()}
            className="rounded-full bg-indigo-600 hover:bg-indigo-700"
          >
            {submitting ? 'Envoi…' : 'Répondre'}
            <Send className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>
      )}
    </div>
  );

  const renderComment = (comment: Comment, depth = 0) => {
    const maxDepth = 10;
    const currentDepth = Math.min(depth, maxDepth);
    const paddingLeft = currentDepth * 16;

    return (
      <div key={comment.id} className="relative" style={{ marginLeft: `${paddingLeft}px` }}>
        {depth > 0 && (
          <div
            className="absolute top-0 left-[-12px] bottom-0 w-[2px] bg-indigo-100 rounded-full"
            style={{ height: '100%' }}
          ></div>
        )}

        <div className="mb-4">
          {renderCommentContent(comment)}
          {replyingTo === comment.id && renderReplyForm(comment.id, comment.author.username)}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4">
              {comment.replies.map((reply) => renderComment(reply, depth + 1))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const formatTimeSince = (dateString: string) => {
    const now = new Date();
    const commentDate = new Date(dateString);
    const timeDiff = now.getTime() - commentDate.getTime();

    const seconds = Math.floor(timeDiff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 30) return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(commentDate);
    if (days > 0) return `il y a ${days} jour${days > 1 ? 's' : ''}`;
    if (hours > 0) return `il y a ${hours} h`;
    if (minutes > 0) return `il y a ${minutes} min`;
    return seconds < 10 ? "à l'instant" : `il y a ${seconds} s`;
  };

  return (
    <div className="relative max-w-full mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <MessageSquare className="w-5 h-5 mr-2 text-indigo-600" />
          Discussion
          {comments.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-800 text-sm rounded-full">
              {comments.length}
            </span>
          )}
        </h2>
        
        {/* Sorting Dropdown */}
        <div className="relative">
          <label htmlFor="sort-comments" className="sr-only">Trier les commentaires</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Trier par :</span>
            <select
              id="sort-comments"
              value={sortOption}
              onChange={(e) => handleSortChange(e.target.value as 'mostUpvoted' | 'recent' | 'oldest')}
              className="appearance-none bg-white border border-gray-200 rounded-full px-3 py-1.5 pr-8 text-sm text-gray-700 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="mostUpvoted">Les plus utiles</option>
              <option value="recent">Plus récents</option>
              <option value="oldest">Plus anciens</option>
            </select>
            <div className="pointer-events-none absolute right-2 flex items-center text-gray-500">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* New Comment Form */}
      {isAuthenticated ? (
        <form onSubmit={handleSubmitComment} className="mb-8">
          <div className="relative">
            <textarea
              ref={commentTextareaRef}
              value={newComment}
              onChange={(e) => handleTextareaChange(e, setNewComment)}
              placeholder="Écris un commentaire…"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-y min-h-[100px]"
              onFocus={() => setShowButtons(true)}
            />

            {/* Uploaded Files Preview */}
            {uploadedFiles.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {uploadedFiles.map(file => (
                  <div key={file.id} className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200">
                    {file.file_type === 'image' ? (
                      <ImageIcon className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <FileIcon className="w-4 h-4 text-indigo-600" />
                    )}
                    <span className="text-sm text-indigo-900">{file.file_name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(file.id)}
                      className="text-indigo-400 hover:text-indigo-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showButtons && (
              <div className="mt-3 flex justify-between items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFileUpload(!showFileUpload)}
                  className="text-gray-600 hover:text-indigo-600"
                >
                  <Paperclip className="w-4 h-4 mr-1" />
                  Ajouter une image
                </Button>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                      e.preventDefault();
                      setNewComment('');
                      setUploadedFiles([]);
                      setShowButtons(false);
                      setShowFileUpload(false);
                    }}
                    className="rounded-full border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    Annuler
                  </Button>

                  <Button
                    type="submit"
                    className="rounded-full bg-indigo-600 hover:bg-indigo-700"
                    disabled={submitting || !newComment.trim()}
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <svg
                          className="animate-spin h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Envoi…
                      </span>
                    ) : (
                      <>
                        Commenter
                        <Send className="ml-2 w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* File Upload Component */}
            {showFileUpload && showButtons && (
              <div className="mt-3">
                <FileUpload
                  onUploadComplete={handleFileUpload}
                  onUploadError={(error) => console.error('Upload error:', error)}
                  accept="image/*,.pdf,.doc,.docx,.txt,.md"
                  maxSizeMB={10}
                />
              </div>
            )}
          </div>
        </form>
      ) : (
        <div className="mb-8 p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-center">
          <div className="flex items-center justify-center gap-2 text-indigo-800 mb-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Connecte-toi pour commenter</span>
          </div>
          <p className="text-sm text-indigo-600">
            <a href="/login" className="font-medium underline hover:text-indigo-800">
              Connecte-toi
            </a>{' '}
            ou{' '}
            <a href="/signup" className="font-medium underline hover:text-indigo-800">
              inscris-toi
            </a>{' '}
            pour participer à la discussion.
          </p>
        </div>
      )}

      {/* Comment List */}
      <div className="space-y-4">
        {sortedComments
          .filter((comment) => !comment.parent_id)
          .map((comment) => renderComment(comment))}

        {comments.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-1">Pas encore de commentaire</h3>
            <p className="text-gray-500">Pose une question ou partage une astuce : tu seras le premier.</p>
          </div>
        )}
      </div>

      {/* Mentions List */}
      {showMentions && renderMentionsList()}
    </div>
  );
}

function getCaretCoordinates(element: HTMLTextAreaElement, position: number) {
  const div = document.createElement('div');
  const style = div.style;
  const computed = window.getComputedStyle(element);

  style.whiteSpace = 'pre-wrap';
  style.wordWrap = 'break-word';
  style.position = 'absolute';
  style.visibility = 'hidden';

  const properties = [
    'direction', 'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize',
    'fontSizeAdjust', 'lineHeight', 'fontFamily', 'textAlign', 'textTransform',
    'textIndent', 'textDecoration', 'letterSpacing', 'wordSpacing',
  ];

  properties.forEach((prop) => {
    // @ts-ignore
    style[prop] = computed[prop];
  });

  div.textContent = element.value.substring(0, position);
  const span = document.createElement('span');
  span.textContent = element.value.substring(position) || '.';
  div.appendChild(span);

  document.body.appendChild(div);

  const coordinates = {
    top: span.offsetTop,
    left: span.offsetLeft
  };
  document.body.removeChild(div);
  
  return coordinates;
}
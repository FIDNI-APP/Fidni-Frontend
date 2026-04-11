import React, { useCallback, useState } from 'react';
import { Upload, X, File, Image as ImageIcon, FileText, Film, Music } from 'lucide-react';
import { fileAPI } from '@/lib/api/structuredApi';
import type { FileUploadResponse } from '@/types/fileAttachment';

interface FileUploadProps {
  onUploadComplete: (file: FileUploadResponse) => void;
  onUploadError?: (error: string) => void;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return ImageIcon;
  if (mimeType.startsWith('video/')) return Film;
  if (mimeType.startsWith('audio/')) return Music;
  if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText;
  return File;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const FileUpload: React.FC<FileUploadProps> = ({
  onUploadComplete,
  onUploadError,
  accept = '*',
  maxSizeMB = 10,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const validateFile = (file: File): string | null => {
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return `File too large. Max ${maxSizeMB}MB`;
    }
    return null;
  };

  const handleUpload = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      onUploadError?.(error);
      return;
    }

    setSelectedFile(file);
    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const response = await fileAPI.upload(file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      setTimeout(() => {
        onUploadComplete(response);
        setSelectedFile(null);
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      onUploadError?.(message);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleUpload(files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUpload(files[0]);
    }
  };

  const FileIcon = selectedFile ? getFileIcon(selectedFile.type) : Upload;

  return (
    <div className={className}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50'}
          ${uploading ? 'pointer-events-none' : 'cursor-pointer hover:border-blue-400 hover:bg-blue-50'}
        `}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="flex flex-col items-center gap-3">
          {uploading ? (
            <>
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-4 border-blue-200 rounded-full" />
                <div
                  className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"
                  style={{ animationDuration: '1s' }}
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700">
                  {selectedFile?.name}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {uploadProgress}% - {formatFileSize(selectedFile?.size || 0)}
                </p>
              </div>
              <div className="w-full max-w-xs bg-slate-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <FileIcon className="w-10 h-10 text-slate-400" />
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700">
                  Drop file here or click to browse
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Max {maxSizeMB}MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUpload;

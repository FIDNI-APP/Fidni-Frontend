/**
 * ImageUploadZone Component
 * Drag-and-drop image upload interface for AI correction
 */

import React, { useState, useRef } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageUploadZoneProps {
  onImageSelect: (file: File) => void;
  onClear?: () => void;
  maxSizeMB?: number;
  disabled?: boolean;
}

export const ImageUploadZone: React.FC<ImageUploadZoneProps> = ({
  onImageSelect,
  onClear,
  maxSizeMB = 10,
  disabled = false,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return false;
    }

    // Check file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      setError(`Image too large (max ${maxSizeMB}MB)`);
      return false;
    }

    setError('');
    return true;
  };

  const handleFile = (file: File) => {
    if (disabled) return;

    if (validateFile(file)) {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      setFileName(file.name);
      onImageSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      if (e.type === 'dragenter' || e.type === 'dragover') {
        setDragActive(true);
      } else if (e.type === 'dragleave') {
        setDragActive(false);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (!disabled && e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (!disabled && e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleClear = () => {
    setSelectedImage(null);
    setFileName('');
    setError('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    onClear?.();
  };

  return (
    <div className="w-full">
      {!selectedImage ? (
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            dragActive
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="hidden"
            disabled={disabled}
          />

          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-indigo-100 rounded-full">
              <Camera className="w-8 h-8 text-indigo-600" />
            </div>

            <div>
              <p className="text-lg font-medium text-gray-900 mb-1">
                Upload your solution photo
              </p>
              <p className="text-sm text-gray-500">
                Drag and drop or click to select
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
            >
              <Upload className="w-4 h-4" />
              Choose File
            </Button>

            <p className="text-xs text-gray-400">
              Max {maxSizeMB}MB • JPG, PNG, HEIC
            </p>
          </div>
        </div>
      ) : (
        <div className="relative border border-gray-300 rounded-xl overflow-hidden">
          <img
            src={selectedImage}
            alt="Selected solution"
            className="w-full max-h-96 object-contain bg-gray-50"
          />

          <div className="absolute top-3 right-3 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="gap-2 bg-white/90 hover:bg-white"
              onClick={handleClear}
              disabled={disabled}
            >
              <X className="w-4 h-4" />
              Remove
            </Button>
          </div>

          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-700 font-medium truncate">
              {fileName}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
};

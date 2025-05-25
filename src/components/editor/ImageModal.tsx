import React, { useRef } from 'react';
import { X, Upload, Camera } from "lucide-react";

interface ImageModalProps {
  showImageModal: boolean;
  setShowImageModal: (show: boolean) => void;
  imageUrl: string;
  setImageUrl: (url: string) => void;
  imageCaption: string;
  setImageCaption: (caption: string) => void;
  imagePreview: string | null;
  setImagePreview: (preview: string | null) => void;
  isUploading: boolean;
  setIsUploading: (uploading: boolean) => void;
  insertImage: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({
  showImageModal,
  setShowImageModal,
  imageUrl,
  setImageUrl,
  imageCaption,
  setImageCaption,
  imagePreview,
  setImagePreview,
  isUploading,
  setIsUploading,
  insertImage
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImagePreview(e.target.result as string);
        setImageUrl(e.target.result as string);
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      setIsUploading(false);
      alert("Erreur lors du chargement de l'image");
    };
    reader.readAsDataURL(file);
  };

  const captureImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImagePreview(e.target.result as string);
        setImageUrl(e.target.result as string);
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      setIsUploading(false);
      alert("Erreur lors de la capture de l'image");
    };
    reader.readAsDataURL(file);
  };

  if (!showImageModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Insérer une image</h3>
          <button
            onClick={() => setShowImageModal(false)}
            className="text-gray-400 hover:text-gray-500 transition-colors"
            title="Fermer la fenêtre"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {imagePreview && (
            <div className="border rounded-lg p-2 bg-gray-50 flex items-center justify-center">
              <img
                src={imagePreview}
                alt="Aperçu"
                className="max-w-full h-auto max-h-64 rounded shadow-sm"
              />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="imageCaption" className="block text-sm font-medium text-gray-700">
              Légende de l'image
            </label>
            <input
              type="text"
              id="imageCaption"
              value={imageCaption}
              onChange={(e) => setImageCaption(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
              placeholder="Décrivez votre image (optionnel)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              disabled={isUploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              Télécharger
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileUpload}
              title="Télécharger une image"
              aria-label="Télécharger une image"
            />

            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              disabled={isUploading}
              title="Prendre une photo avec la caméra"
            >
              <Camera className="w-4 h-4 mr-2" />
              Photo
            </button>
            <label htmlFor="camera-input" className="hidden">Prendre une photo</label>
            <input
              type="file"
              id="camera-input"
              ref={cameraInputRef}
              className="hidden"
              accept="image/*"
              title="Prendre une photo"
              onChange={captureImage}
            />
          </div>
        </div>

        <div className="px-4 py-3 bg-gray-50 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200 rounded-b-lg">
          <button
            type="button"
            onClick={insertImage}
            className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
            disabled={!imageUrl || isUploading}
          >
            Insérer
          </button>
          <button
            type="button"
            onClick={() => setShowImageModal(false)}
            className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};
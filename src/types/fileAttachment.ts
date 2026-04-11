export interface FileAttachment {
  id: string;
  file: string;
  file_name: string;
  file_size: number;
  file_type: 'image' | 'document' | 'video' | 'audio' | 'other';
  mime_type: string;
  uploaded_by: number;
  uploaded_at: string;
  width?: number;
  height?: number;
  url: string;
}

export interface FileUploadResponse {
  id: string;
  url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  mime_type: string;
}

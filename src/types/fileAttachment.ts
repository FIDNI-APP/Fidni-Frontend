export interface FileAttachment {
  /** Stable URL (redirects to fresh presigned S3) — safe to embed in content */
  download_url?: string;
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
  download_url?: string;
  id: string;
  url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  mime_type: string;
}

import type { Document } from "@/types/models/Document";

export interface DocumentsState {
  items: Document[];
  isLoading: boolean;
  uploading: boolean;
  error: string | null;
}

export interface DocumentUploadPayload {
  entityType: string;
  entityId: string;
  file: File;
  description?: string;
  isClientUploaded?: boolean;
}

export interface DocumentDeletePayload {
  entityType: string;
  entityId: string;
  docId: string;
}

export interface DownloadDocumentPayload {
  entityType: string;
  entityId: string;
  docId: string;
  filename: string;
}

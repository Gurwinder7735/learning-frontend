export interface Document {
  id: string;
  entityType: string;
  entityId: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  uploadedBy?: string | null;
  uploadedByName?: string | null;
  description?: string | null;
  isClientUploaded: boolean;
  downloadCount: number;
  createdAt: string;
}

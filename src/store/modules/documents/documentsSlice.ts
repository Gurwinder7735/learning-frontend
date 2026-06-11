import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Document } from "@/types/models/Document";
import type { DocumentsState, DocumentUploadPayload, DocumentDeletePayload, DownloadDocumentPayload } from "./documentsTypes";

const initialState: DocumentsState = {
  items: [],
  isLoading: false,
  uploading: false,
  error: null,
};

const documentsSlice = createSlice({
  name: "documents",
  initialState,
  reducers: {
    fetchDocumentsRequest: (state, _action: PayloadAction<{ entityType: string; entityId: string }>) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchDocumentsSuccess: (state, action: PayloadAction<Document[]>) => {
      state.isLoading = false;
      state.items = action.payload;
    },
    fetchDocumentsFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    uploadDocumentRequest: (_state, _action: PayloadAction<DocumentUploadPayload>) => {},
    uploadDocumentSuccess: (state, action: PayloadAction<Document>) => {
      state.uploading = false;
      state.items.unshift(action.payload);
    },
    uploadDocumentFailure: (_state, _action: PayloadAction<string>) => {},
    deleteDocumentRequest: (_state, _action: PayloadAction<DocumentDeletePayload>) => {},
    deleteDocumentSuccess: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((d) => d.id !== action.payload);
    },
    deleteDocumentFailure: (_state, _action: PayloadAction<string>) => {},
    downloadDocumentFileRequest: (_state, _action: PayloadAction<DownloadDocumentPayload>) => {},
    setUploading: (state, action: PayloadAction<boolean>) => {
      state.uploading = action.payload;
    },
    clearDocuments: (state) => {
      state.items = [];
      state.isLoading = false;
      state.error = null;
    },
  },
});

export const {
  fetchDocumentsRequest,
  fetchDocumentsSuccess,
  fetchDocumentsFailure,
  uploadDocumentRequest,
  uploadDocumentSuccess,
  uploadDocumentFailure,
  deleteDocumentRequest,
  deleteDocumentSuccess,
  deleteDocumentFailure,
  downloadDocumentFileRequest,
  setUploading,
  clearDocuments,
} = documentsSlice.actions;

export default documentsSlice.reducer;

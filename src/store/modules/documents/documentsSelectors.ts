import type { RootState } from "@/store";

export const selectDocuments = (state: RootState) => state.documents.items;
export const selectDocumentsMeta = (state: RootState) => ({
  isLoading: state.documents.isLoading,
  uploading: state.documents.uploading,
  error: state.documents.error,
});

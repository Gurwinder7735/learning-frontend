import { call, put, takeLatest } from "redux-saga/effects";
import { notification } from "antd";
import axiosInstance from "@/lib/api/axiosInstance";
import { apiRequest } from "@/lib/api/axiosInstance";
import type { AxiosResponse } from "axios";
import type { ApiResponse } from "@/types/api.types";
import type { Document } from "@/types/models/Document";
import {
  fetchDocumentsRequest, fetchDocumentsSuccess, fetchDocumentsFailure,
  uploadDocumentRequest, uploadDocumentSuccess, uploadDocumentFailure,
  deleteDocumentRequest, deleteDocumentSuccess, deleteDocumentFailure,
  downloadDocumentFileRequest,
  setUploading,
} from "./documentsSlice";
import type { DocumentUploadPayload, DocumentDeletePayload, DownloadDocumentPayload } from "./documentsTypes";

const DOCUMENTS_API = "/api/v1";

function* fetchDocumentsWorker(action: { type: string; payload: { entityType: string; entityId: string } }) {
  try {
    const { entityType, entityId } = action.payload;
    const response: ApiResponse<Document[]> = yield call(apiRequest, {
      url: `${DOCUMENTS_API}/${entityType}s/${entityId}/documents`,
      method: "GET",
    });
    yield put(fetchDocumentsSuccess(response.data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch documents";
    yield put(fetchDocumentsFailure(message));
  }
}

function* uploadDocumentWorker(action: { type: string; payload: DocumentUploadPayload }) {
  try {
    yield put(setUploading(true));
    const { entityType, entityId, file, description, isClientUploaded } = action.payload;
    const formData = new FormData();
    formData.append("file", file);
    if (description) formData.append("description", description);
    if (isClientUploaded) formData.append("is_client_uploaded", "true");

    const response: ApiResponse<Document> = yield call(apiRequest, {
      url: `${DOCUMENTS_API}/${entityType}s/${entityId}/documents`,
      method: "POST",
      data: formData,
      headers: { "Content-Type": "multipart/form-data" },
    });
    yield put(uploadDocumentSuccess(response.data));
    notification.success({ message: "Document uploaded" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload document";
    yield put(uploadDocumentFailure(message));
    notification.error({ message: "Upload failed", description: message });
  } finally {
    yield put(setUploading(false));
  }
}

function* deleteDocumentWorker(action: { type: string; payload: DocumentDeletePayload }) {
  try {
    const { entityType, entityId, docId } = action.payload;
    yield call(apiRequest, {
      url: `${DOCUMENTS_API}/${entityType}s/${entityId}/documents/${docId}`,
      method: "DELETE",
    });
    yield put(deleteDocumentSuccess(docId));
    notification.success({ message: "Document deleted" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete document";
    yield put(deleteDocumentFailure(message));
    notification.error({ message: "Delete failed", description: message });
  }
}

function* downloadDocumentFileWorker(action: { type: string; payload: DownloadDocumentPayload }) {
  try {
    const { entityType, entityId, docId, filename } = action.payload;
    const response: AxiosResponse<Blob> = yield axiosInstance.request({
      url: `${DOCUMENTS_API}/${entityType}s/${entityId}/documents/${docId}/download`,
      method: "GET",
      responseType: "blob",
    });
    const blob = response.data;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Download failed";
    notification.error({ message: "Download failed", description: message });
  }
}

export function* documentsSaga() {
  yield takeLatest(fetchDocumentsRequest.type, fetchDocumentsWorker);
  yield takeLatest(uploadDocumentRequest.type, uploadDocumentWorker);
  yield takeLatest(deleteDocumentRequest.type, deleteDocumentWorker);
  yield takeLatest(downloadDocumentFileRequest.type, downloadDocumentFileWorker);
}

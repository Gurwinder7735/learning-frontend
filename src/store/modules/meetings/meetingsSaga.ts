import { call, put, takeLatest } from "redux-saga/effects";
import { apiRequest } from "@/lib/api/axiosInstance";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import {
  fetchMeetingsRequest, fetchMeetingsSuccess, fetchMeetingsFailure,
  fetchMeetingDetailRequest, fetchMeetingDetailSuccess, fetchMeetingDetailFailure,
  createMeetingRequest, createMeetingSuccess, createMeetingFailure,
  updateMeetingRequest, updateMeetingSuccess, updateMeetingFailure,
  deleteMeetingRequest, deleteMeetingSuccess, deleteMeetingFailure,
  fetchMeetingStatsRequest, fetchMeetingStatsSuccess, fetchMeetingStatsFailure,
  addDecisionRequest, addDecisionSuccess, addDecisionFailure,
  addActionItemRequest, addActionItemSuccess, addActionItemFailure,
  updateActionItemRequest, updateActionItemSuccess, updateActionItemFailure,
  deleteActionItemRequest, deleteActionItemSuccess, deleteActionItemFailure,
  fetchGoogleStatusRequest, fetchGoogleStatusSuccess, fetchGoogleStatusFailure,
  disconnectGoogleRequest, disconnectGoogleSuccess, disconnectGoogleFailure,
} from "./meetingsSlice";
import type { MeetingQuery, CreateMeetingPayload, UpdateMeetingPayload } from "./meetingsTypes";
import type { Meeting, MeetingDetail, MeetingStats, MeetingDecision, MeetingActionItem } from "@/types/models/Meeting";
import type { ApiResponse } from "@/types/api.types";

function* fetchMeetingsWorker(action: { type: string; payload: MeetingQuery }) {
  try {
    const params = new URLSearchParams();
    if (action.payload.search) params.set("search", action.payload.search);
    if (action.payload.status) params.set("status", action.payload.status);
    if (action.payload.clientId) params.set("client_id", action.payload.clientId);
    if (action.payload.leadId) params.set("lead_id", action.payload.leadId);
    if (action.payload.skip) params.set("skip", String(action.payload.skip));
    if (action.payload.limit) params.set("limit", String(action.payload.limit));

    const response: ApiResponse<Meeting[]> = yield call(apiRequest, {
      url: `${API_ENDPOINTS.meetings.list}?${params.toString()}`,
      method: "GET",
    });
    yield put(fetchMeetingsSuccess({ data: response.data, total: response.data.length }));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch meetings";
    yield put(fetchMeetingsFailure(message));
  }
}

function* fetchMeetingDetailWorker(action: { type: string; payload: string }) {
  try {
    const response: ApiResponse<MeetingDetail> = yield call(apiRequest, {
      url: API_ENDPOINTS.meetings.detail(action.payload),
      method: "GET",
    });
    yield put(fetchMeetingDetailSuccess(response.data));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch meeting";
    yield put(fetchMeetingDetailFailure(message));
  }
}

function* createMeetingWorker(action: { type: string; payload: CreateMeetingPayload }) {
  try {
    const response: ApiResponse<Meeting> = yield call(apiRequest, {
      url: API_ENDPOINTS.meetings.create,
      method: "POST",
      data: action.payload,
    });
    yield put(createMeetingSuccess(response.data));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create meeting";
    yield put(createMeetingFailure(message));
  }
}

function* updateMeetingWorker(action: { type: string; payload: UpdateMeetingPayload }) {
  try {
    const response: ApiResponse<Meeting> = yield call(apiRequest, {
      url: API_ENDPOINTS.meetings.detail(action.payload.id),
      method: "PUT",
      data: action.payload.data,
    });
    yield put(updateMeetingSuccess(response.data));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update meeting";
    yield put(updateMeetingFailure(message));
  }
}

function* deleteMeetingWorker(action: { type: string; payload: string }) {
  try {
    yield call(apiRequest, {
      url: API_ENDPOINTS.meetings.detail(action.payload),
      method: "DELETE",
    });
    yield put(deleteMeetingSuccess(action.payload));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete meeting";
    yield put(deleteMeetingFailure(message));
  }
}

function* fetchStatsWorker() {
  try {
    const response: ApiResponse<MeetingStats> = yield call(apiRequest, {
      url: API_ENDPOINTS.meetings.stats,
      method: "GET",
    });
    yield put(fetchMeetingStatsSuccess(response.data));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch stats";
    yield put(fetchMeetingStatsFailure(message));
  }
}

function* addDecisionWorker(action: { type: string; payload: { meetingId: string; decision: string } }) {
  try {
    const response: ApiResponse<MeetingDecision> = yield call(apiRequest, {
      url: API_ENDPOINTS.meetings.addDecision(action.payload.meetingId),
      method: "POST",
      data: { decision: action.payload.decision },
    });
    yield put(addDecisionSuccess(response.data));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to add decision";
    yield put(addDecisionFailure(message));
  }
}

function* addActionItemWorker(action: { type: string; payload: { meetingId: string; title: string; owner?: string | null; dueDate?: string | null } }) {
  try {
    const response: ApiResponse<MeetingActionItem> = yield call(apiRequest, {
      url: API_ENDPOINTS.meetings.addActionItem(action.payload.meetingId),
      method: "POST",
      data: { title: action.payload.title, owner: action.payload.owner, dueDate: action.payload.dueDate },
    });
    yield put(addActionItemSuccess(response.data));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to add action item";
    yield put(addActionItemFailure(message));
  }
}

function* updateActionItemWorker(action: { type: string; payload: { meetingId: string; itemId: string; data: Record<string, unknown> } }) {
  try {
    const response: ApiResponse<MeetingActionItem> = yield call(apiRequest, {
      url: API_ENDPOINTS.meetings.updateActionItem(action.payload.meetingId, action.payload.itemId),
      method: "PUT",
      data: action.payload.data,
    });
    yield put(updateActionItemSuccess(response.data));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update action item";
    yield put(updateActionItemFailure(message));
  }
}

function* deleteActionItemWorker(action: { type: string; payload: { meetingId: string; itemId: string } }) {
  try {
    yield call(apiRequest, {
      url: API_ENDPOINTS.meetings.updateActionItem(action.payload.meetingId, action.payload.itemId),
      method: "DELETE",
    });
    yield put(deleteActionItemSuccess(action.payload.itemId));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete action item";
    yield put(deleteActionItemFailure(message));
  }
}

function* fetchGoogleStatusWorker() {
  try {
    const response: ApiResponse<{ connected: boolean; email: string | null }> = yield call(apiRequest, {
      url: API_ENDPOINTS.meetings.googleStatus,
      method: "GET",
    });
    yield put(fetchGoogleStatusSuccess(response.data));
  } catch {
    yield put(fetchGoogleStatusSuccess({ connected: false, email: null }));
  }
}

function* disconnectGoogleWorker() {
  try {
    yield call(apiRequest, {
      url: API_ENDPOINTS.meetings.googleDisconnect,
      method: "POST",
    });
    yield put(disconnectGoogleSuccess());
  } catch {
    yield put(disconnectGoogleSuccess());
  }
}

export function* meetingsSaga() {
  yield takeLatest(fetchMeetingsRequest.type, fetchMeetingsWorker);
  yield takeLatest(fetchMeetingDetailRequest.type, fetchMeetingDetailWorker);
  yield takeLatest(createMeetingRequest.type, createMeetingWorker);
  yield takeLatest(updateMeetingRequest.type, updateMeetingWorker);
  yield takeLatest(deleteMeetingRequest.type, deleteMeetingWorker);
  yield takeLatest(fetchMeetingStatsRequest.type, fetchStatsWorker);
  yield takeLatest(addDecisionRequest.type, addDecisionWorker);
  yield takeLatest(addActionItemRequest.type, addActionItemWorker);
  yield takeLatest(updateActionItemRequest.type, updateActionItemWorker);
  yield takeLatest(deleteActionItemRequest.type, deleteActionItemWorker);
  yield takeLatest(fetchGoogleStatusRequest.type, fetchGoogleStatusWorker);
  yield takeLatest(disconnectGoogleRequest.type, disconnectGoogleWorker);
}

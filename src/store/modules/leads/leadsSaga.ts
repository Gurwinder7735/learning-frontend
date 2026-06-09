import { call, put, takeLatest } from "redux-saga/effects";
import { notification } from "antd";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { apiRequest } from "@/lib/api/axiosInstance";
import type { ApiResponse } from "@/types/api.types";
import type { Lead, LeadDetail, LeadActivity, LeadStats } from "@/types/models/Lead";
import type { Meeting } from "@/types/models/Meeting";
import {
  fetchLeadsRequest, fetchLeadsSuccess, fetchLeadsFailure,
  createLeadRequest, createLeadSuccess, createLeadFailure,
  updateLeadRequest, updateLeadSuccess, updateLeadFailure,
  deleteLeadRequest, deleteLeadSuccess, deleteLeadFailure,
  fetchLeadDetailRequest, fetchLeadDetailSuccess, fetchLeadDetailFailure,
  updateLeadStatusRequest, updateLeadStatusSuccess, updateLeadStatusFailure,
  addActivityRequest, addActivitySuccess, addActivityFailure,
  createMeetingRequest, createMeetingSuccess, createMeetingFailure,
  updateMeetingRequest, updateMeetingSuccess, updateMeetingFailure,
  deleteMeetingRequest, deleteMeetingSuccess, deleteMeetingFailure,
  addActionItemRequest, addActionItemSuccess, addActionItemFailure,
  updateActionItemRequest, updateActionItemSuccess, updateActionItemFailure,
  fetchStatsRequest, fetchStatsSuccess, fetchStatsFailure,
} from "./leadsSlice";
import type { LeadsQuery, LeadCreatePayload, LeadUpdatePayload, LeadActivityCreatePayload, LeadMeetingCreatePayload, LeadMeetingUpdatePayload, ActionItemCreatePayload, ActionItemUpdatePayload } from "./leadsTypes";

function* fetchLeadsWorker(action: { type: string; payload: LeadsQuery }) {
  try {
    const response: { data: Lead[]; total?: number } = yield call(apiRequest, {
      url: API_ENDPOINTS.leads.list,
      method: "GET",
      params: action.payload,
    });
    const items = Array.isArray(response) ? response : response.data ?? [];
    yield put(fetchLeadsSuccess({ items, total: items.length }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch leads";
    yield put(fetchLeadsFailure(message));
  }
}

function* createLeadWorker(action: { type: string; payload: LeadCreatePayload }) {
  try {
    const response: ApiResponse<Lead> = yield call(apiRequest, {
      url: API_ENDPOINTS.leads.create,
      method: "POST",
      data: action.payload,
    });
    yield put(createLeadSuccess(response.data));
    notification.success({ message: "Lead created", description: `${response.data.companyName} has been added.` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create lead";
    yield put(createLeadFailure(message));
    notification.error({ message: "Create failed", description: message });
  }
}

function* updateLeadWorker(action: { type: string; payload: LeadUpdatePayload }) {
  try {
    const response: ApiResponse<Lead> = yield call(apiRequest, {
      url: API_ENDPOINTS.leads.update(action.payload.id),
      method: "PUT",
      data: action.payload.data,
    });
    yield put(updateLeadSuccess(response.data));
    notification.success({ message: "Lead updated" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update lead";
    yield put(updateLeadFailure(message));
    notification.error({ message: "Update failed", description: message });
  }
}

function* deleteLeadWorker(action: { type: string; payload: string }) {
  try {
    yield call(apiRequest, {
      url: API_ENDPOINTS.leads.delete(action.payload),
      method: "DELETE",
    });
    yield put(deleteLeadSuccess(action.payload));
    notification.success({ message: "Lead removed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete lead";
    yield put(deleteLeadFailure(message));
    notification.error({ message: "Delete failed", description: message });
  }
}

function* fetchLeadDetailWorker(action: { type: string; payload: string }) {
  try {
    const response: ApiResponse<LeadDetail> = yield call(apiRequest, {
      url: API_ENDPOINTS.leads.detail(action.payload),
      method: "GET",
    });
    yield put(fetchLeadDetailSuccess(response.data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch lead details";
    yield put(fetchLeadDetailFailure(message));
  }
}

function* updateLeadStatusWorker(action: { type: string; payload: { id: string; status: string } }) {
  try {
    const response: ApiResponse<Lead> = yield call(apiRequest, {
      url: API_ENDPOINTS.leads.updateStatus(action.payload.id),
      method: "PATCH",
      data: { status: action.payload.status },
    });
    yield put(updateLeadStatusSuccess(response.data));
    notification.success({ message: "Status updated" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update status";
    yield put(updateLeadStatusFailure(message));
    notification.error({ message: "Status update failed", description: message });
  }
}

function* addActivityWorker(action: { type: string; payload: LeadActivityCreatePayload }) {
  try {
    const response: ApiResponse<LeadActivity> = yield call(apiRequest, {
      url: API_ENDPOINTS.leads.activities(action.payload.leadId),
      method: "POST",
      data: { type: action.payload.type, content: action.payload.content },
    });
    yield put(addActivitySuccess(response.data));
    notification.success({ message: "Activity added" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add activity";
    yield put(addActivityFailure(message));
    notification.error({ message: "Failed to add activity", description: message });
  }
}

function* createMeetingWorker(action: { type: string; payload: LeadMeetingCreatePayload }) {
  try {
    const response: ApiResponse<Meeting> = yield call(apiRequest, {
      url: API_ENDPOINTS.leads.meetings(action.payload.leadId),
      method: "POST",
      data: { title: action.payload.title, scheduledAt: action.payload.scheduledAt, durationMinutes: action.payload.durationMinutes },
    });
    yield put(createMeetingSuccess(response.data));
    notification.success({ message: "Meeting scheduled" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to schedule meeting";
    yield put(createMeetingFailure(message));
    notification.error({ message: "Failed to schedule meeting", description: message });
  }
}

function* updateMeetingWorker(action: { type: string; payload: LeadMeetingUpdatePayload }) {
  try {
    const response: ApiResponse<Meeting> = yield call(apiRequest, {
      url: API_ENDPOINTS.leads.updateMeeting(action.payload.leadId, action.payload.meetingId),
      method: "PUT",
      data: action.payload.data,
    });
    yield put(updateMeetingSuccess(response.data));
    notification.success({ message: "Meeting updated" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update meeting";
    yield put(updateMeetingFailure(message));
    notification.error({ message: "Failed to update meeting", description: message });
  }
}

function* deleteMeetingWorker(action: { type: string; payload: { leadId: string; meetingId: string } }) {
  try {
    yield call(apiRequest, {
      url: API_ENDPOINTS.leads.deleteMeeting(action.payload.leadId, action.payload.meetingId),
      method: "DELETE",
    });
    yield put(deleteMeetingSuccess(action.payload.meetingId));
    notification.success({ message: "Meeting removed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete meeting";
    yield put(deleteMeetingFailure(message));
    notification.error({ message: "Failed to delete meeting", description: message });
  }
}

function* addActionItemWorker(action: { type: string; payload: ActionItemCreatePayload }) {
  try {
    const response: ApiResponse<Meeting> = yield call(apiRequest, {
      url: API_ENDPOINTS.leads.actionItems(action.payload.leadId, action.payload.meetingId),
      method: "POST",
      data: { description: action.payload.description, assignedTo: action.payload.assignedTo, dueDate: action.payload.dueDate },
    });
    yield put(addActionItemSuccess(response.data));
    notification.success({ message: "Action item added" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add action item";
    yield put(addActionItemFailure(message));
    notification.error({ message: "Failed to add action item", description: message });
  }
}

function* updateActionItemWorker(action: { type: string; payload: ActionItemUpdatePayload }) {
  try {
    const response: ApiResponse<Meeting> = yield call(apiRequest, {
      url: API_ENDPOINTS.leads.updateActionItem(action.payload.leadId, action.payload.meetingId, action.payload.itemIndex),
      method: "PUT",
      data: action.payload.data,
    });
    yield put(updateActionItemSuccess(response.data));
    notification.success({ message: "Action item updated" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update action item";
    yield put(updateActionItemFailure(message));
    notification.error({ message: "Failed to update action item", description: message });
  }
}

function* fetchStatsWorker() {
  try {
    const response: ApiResponse<LeadStats> = yield call(apiRequest, {
      url: API_ENDPOINTS.leads.stats,
      method: "GET",
    });
    yield put(fetchStatsSuccess(response.data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch stats";
    yield put(fetchStatsFailure(message));
  }
}

export function* leadsSaga() {
  yield takeLatest(fetchLeadsRequest.type, fetchLeadsWorker);
  yield takeLatest(createLeadRequest.type, createLeadWorker);
  yield takeLatest(updateLeadRequest.type, updateLeadWorker);
  yield takeLatest(deleteLeadRequest.type, deleteLeadWorker);
  yield takeLatest(fetchLeadDetailRequest.type, fetchLeadDetailWorker);
  yield takeLatest(updateLeadStatusRequest.type, updateLeadStatusWorker);
  yield takeLatest(addActivityRequest.type, addActivityWorker);
  yield takeLatest(createMeetingRequest.type, createMeetingWorker);
  yield takeLatest(updateMeetingRequest.type, updateMeetingWorker);
  yield takeLatest(deleteMeetingRequest.type, deleteMeetingWorker);
  yield takeLatest(addActionItemRequest.type, addActionItemWorker);
  yield takeLatest(updateActionItemRequest.type, updateActionItemWorker);
  yield takeLatest(fetchStatsRequest.type, fetchStatsWorker);
}

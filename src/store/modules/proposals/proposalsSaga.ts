import { call, put, takeLatest } from "redux-saga/effects";
import { notification } from "antd";
import { apiRequest } from "@/lib/api/axiosInstance";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import {
  fetchProposalsRequest,
  fetchProposalsSuccess,
  fetchProposalsFailure,
  fetchProposalDetailRequest,
  fetchProposalDetailSuccess,
  fetchProposalDetailFailure,
  fetchJobDetailRequest,
  fetchJobDetailSuccess,
  fetchJobDetailFailure,
} from "./proposalsSlice";

function* fetchProposalsWorker() {
  try {
    const response: { data: unknown } = yield call(apiRequest, {
      url: API_ENDPOINTS.proposals.list,
      method: "GET",
    });
    yield put(fetchProposalsSuccess((response as { data: unknown }).data as any));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch proposals";
    yield put(fetchProposalsFailure(message));
    notification.error({ message: "Error", description: message });
  }
}

function* fetchProposalDetailWorker(action: { type: string; payload: string }) {
  try {
    const response: { data: unknown } = yield call(apiRequest, {
      url: API_ENDPOINTS.proposals.detail(action.payload),
      method: "GET",
    });
    yield put(fetchProposalDetailSuccess((response as { data: unknown }).data as any));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch proposal";
    yield put(fetchProposalDetailFailure(message));
  }
}

function* fetchJobDetailWorker(action: { type: string; payload: string }) {
  try {
    const response: { data: unknown } = yield call(apiRequest, {
      url: API_ENDPOINTS.proposals.jobDetail(action.payload),
      method: "GET",
    });
    yield put(fetchJobDetailSuccess((response as { data: unknown }).data as any));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch proposal job";
    yield put(fetchJobDetailFailure(message));
  }
}

export function* proposalsSaga() {
  yield takeLatest(fetchProposalsRequest.type, fetchProposalsWorker);
  yield takeLatest(fetchProposalDetailRequest.type, fetchProposalDetailWorker);
  yield takeLatest(fetchJobDetailRequest.type, fetchJobDetailWorker);
}

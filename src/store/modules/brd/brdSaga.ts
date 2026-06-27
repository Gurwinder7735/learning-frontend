import { call, put, takeLatest } from "redux-saga/effects";
import { notification } from "antd";
import { apiRequest } from "@/lib/api/axiosInstance";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import {
  fetchBRDsRequest,
  fetchBRDsSuccess,
  fetchBRDsFailure,
  fetchBRDDetailRequest,
  fetchBRDDetailSuccess,
  fetchBRDDetailFailure,
  fetchJobDetailRequest,
  fetchJobDetailSuccess,
  fetchJobDetailFailure,
} from "./brdSlice";

function* fetchBRDsWorker() {
  try {
    const response: { data: unknown } = yield call(apiRequest, {
      url: API_ENDPOINTS.brd.list,
      method: "GET",
    });
    yield put(fetchBRDsSuccess((response as { data: unknown }).data as any));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch BRDs";
    yield put(fetchBRDsFailure(message));
    notification.error({ message: "Error", description: message });
  }
}

function* fetchBRDDetailWorker(action: { type: string; payload: string }) {
  try {
    const response: { data: unknown } = yield call(apiRequest, {
      url: API_ENDPOINTS.brd.detail(action.payload),
      method: "GET",
    });
    yield put(fetchBRDDetailSuccess((response as { data: unknown }).data as any));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch BRD";
    yield put(fetchBRDDetailFailure(message));
  }
}

function* fetchJobDetailWorker(action: { type: string; payload: string }) {
  try {
    const response: { data: unknown } = yield call(apiRequest, {
      url: API_ENDPOINTS.brd.jobDetail(action.payload),
      method: "GET",
    });
    yield put(fetchJobDetailSuccess((response as { data: unknown }).data as any));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch BRD job";
    yield put(fetchJobDetailFailure(message));
  }
}

export function* brdSaga() {
  yield takeLatest(fetchBRDsRequest.type, fetchBRDsWorker);
  yield takeLatest(fetchBRDDetailRequest.type, fetchBRDDetailWorker);
  yield takeLatest(fetchJobDetailRequest.type, fetchJobDetailWorker);
}

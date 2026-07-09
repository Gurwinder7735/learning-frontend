import { call, put, takeLatest } from "redux-saga/effects";
import { notification } from "antd";
import { apiRequest } from "@/lib/api/axiosInstance";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import {
  fetchSOWsRequest, fetchSOWsSuccess, fetchSOWsFailure,
  fetchSOWDetailRequest, fetchSOWDetailSuccess, fetchSOWDetailFailure,
  fetchFeatureDocsRequest, fetchFeatureDocsSuccess, fetchFeatureDocsFailure,
  fetchFeatureDocDetailRequest, fetchFeatureDocDetailSuccess, fetchFeatureDocDetailFailure,
  fetchJobDetailRequest, fetchJobDetailSuccess, fetchJobDetailFailure,
} from "./sowSlice";

function* fetchSOWsWorker() {
  try {
    const response: { data: unknown } = yield call(apiRequest, { url: API_ENDPOINTS.sow.list, method: "GET" });
    yield put(fetchSOWsSuccess((response as any).data));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch";
    yield put(fetchSOWsFailure(msg));
    notification.error({ message: "Error", description: msg });
  }
}

function* fetchSOWDetailWorker(action: { type: string; payload: string }) {
  try {
    const response: { data: unknown } = yield call(apiRequest, { url: API_ENDPOINTS.sow.detail(action.payload), method: "GET" });
    yield put(fetchSOWDetailSuccess((response as any).data));
  } catch (error: unknown) {
    yield put(fetchSOWDetailFailure(error instanceof Error ? error.message : "Failed"));
  }
}

function* fetchFeatureDocsWorker(action: { type: string; payload: string }) {
  try {
    const response: { data: unknown } = yield call(apiRequest, { url: API_ENDPOINTS.sow.features(action.payload), method: "GET" });
    yield put(fetchFeatureDocsSuccess((response as any).data));
  } catch (error: unknown) {
    yield put(fetchFeatureDocsFailure(error instanceof Error ? error.message : "Failed"));
  }
}

function* fetchFeatureDocDetailWorker(action: { type: string; payload: string }) {
  try {
    const response: { data: unknown } = yield call(apiRequest, { url: API_ENDPOINTS.sow.featureDetail(action.payload), method: "GET" });
    yield put(fetchFeatureDocDetailSuccess((response as any).data));
  } catch (error: unknown) {
    yield put(fetchFeatureDocDetailFailure(error instanceof Error ? error.message : "Failed"));
  }
}

function* fetchJobDetailWorker(action: { type: string; payload: string }) {
  try {
    const response: { data: unknown } = yield call(apiRequest, { url: API_ENDPOINTS.sow.jobDetail(action.payload), method: "GET" });
    yield put(fetchJobDetailSuccess((response as any).data));
  } catch (error: unknown) {
    yield put(fetchJobDetailFailure(error instanceof Error ? error.message : "Failed"));
  }
}

export function* sowSaga() {
  yield takeLatest(fetchSOWsRequest.type, fetchSOWsWorker);
  yield takeLatest(fetchSOWDetailRequest.type, fetchSOWDetailWorker);
  yield takeLatest(fetchFeatureDocsRequest.type, fetchFeatureDocsWorker);
  yield takeLatest(fetchFeatureDocDetailRequest.type, fetchFeatureDocDetailWorker);
  yield takeLatest(fetchJobDetailRequest.type, fetchJobDetailWorker);
}

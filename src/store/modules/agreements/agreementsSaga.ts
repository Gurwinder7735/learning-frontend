import { call, put, takeLatest } from "redux-saga/effects";
import { notification } from "antd";
import { apiRequest } from "@/lib/api/axiosInstance";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import {
  fetchAgreementsRequest,
  fetchAgreementsSuccess,
  fetchAgreementsFailure,
  fetchAgreementDetailRequest,
  fetchAgreementDetailSuccess,
  fetchAgreementDetailFailure,
} from "./agreementsSlice";

function* fetchAgreementsWorker() {
  try {
    const response: { data: unknown } = yield call(apiRequest, {
      url: API_ENDPOINTS.agreements.list,
      method: "GET",
    });
    yield put(fetchAgreementsSuccess((response as any).data));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch agreements";
    yield put(fetchAgreementsFailure(msg));
    notification.error({ message: "Error", description: msg });
  }
}

function* fetchAgreementDetailWorker(action: { type: string; payload: string }) {
  try {
    const response: { data: unknown } = yield call(apiRequest, {
      url: API_ENDPOINTS.agreements.detail(action.payload),
      method: "GET",
    });
    yield put(fetchAgreementDetailSuccess((response as any).data));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch agreement";
    yield put(fetchAgreementDetailFailure(msg));
  }
}

export function* agreementsSaga() {
  yield takeLatest(fetchAgreementsRequest.type, fetchAgreementsWorker);
  yield takeLatest(fetchAgreementDetailRequest.type, fetchAgreementDetailWorker);
}

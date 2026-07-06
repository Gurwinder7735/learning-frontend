import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AgreementsState } from "./agreementsTypes";
import type { Agreement } from "@/types/models/Agreement";

const initialState: AgreementsState = {
  agreements: [],
  currentAgreement: null,
  isLoading: false,
  error: null,
};

const agreementsSlice = createSlice({
  name: "agreements",
  initialState,
  reducers: {
    fetchAgreementsRequest(state) {
      state.isLoading = true;
      state.error = null;
    },
    fetchAgreementsSuccess(state, action: PayloadAction<Agreement[]>) {
      state.agreements = action.payload;
      state.isLoading = false;
    },
    fetchAgreementsFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.isLoading = false;
    },
    fetchAgreementDetailRequest(state, _action: PayloadAction<string>) {
      state.isLoading = true;
      state.error = null;
    },
    fetchAgreementDetailSuccess(state, action: PayloadAction<Agreement>) {
      state.currentAgreement = action.payload;
      state.isLoading = false;
    },
    fetchAgreementDetailFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.isLoading = false;
    },
    setCurrentAgreement(state, action: PayloadAction<Agreement | null>) {
      state.currentAgreement = action.payload;
    },
    updateCurrentAgreement(state, action: PayloadAction<Partial<Agreement>>) {
      if (state.currentAgreement) {
        state.currentAgreement = { ...state.currentAgreement, ...action.payload };
      }
    },
  },
});

export const {
  fetchAgreementsRequest,
  fetchAgreementsSuccess,
  fetchAgreementsFailure,
  fetchAgreementDetailRequest,
  fetchAgreementDetailSuccess,
  fetchAgreementDetailFailure,
  setCurrentAgreement,
  updateCurrentAgreement,
} = agreementsSlice.actions;

export default agreementsSlice.reducer;

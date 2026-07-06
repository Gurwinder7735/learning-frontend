import type { RootState } from "@/store/index";

export const selectAgreements = (state: RootState) => state.agreements.agreements;
export const selectCurrentAgreement = (state: RootState) => state.agreements.currentAgreement;
export const selectAgreementsLoading = (state: RootState) => state.agreements.isLoading;
export const selectAgreementsError = (state: RootState) => state.agreements.error;

import type { RootState } from "@/store";

export const selectMeetings = (state: RootState) => state.meetings.items;
export const selectMeetingsLoading = (state: RootState) => state.meetings.isLoading;
export const selectMeetingsError = (state: RootState) => state.meetings.error;
export const selectMeetingsTotal = (state: RootState) => state.meetings.total;
export const selectMeetingDetail = (state: RootState) => state.meetings.detail;
export const selectMeetingDetailLoading = (state: RootState) => state.meetings.detailLoading;
export const selectMeetingStats = (state: RootState) => state.meetings.stats;
export const selectGoogleConnected = (state: RootState) => state.meetings.googleConnected;
export const selectGoogleEmail = (state: RootState) => state.meetings.googleEmail;

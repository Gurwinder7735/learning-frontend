import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { MeetingsState, MeetingQuery, CreateMeetingPayload, UpdateMeetingPayload } from "./meetingsTypes";
import type { Meeting, MeetingDetail, MeetingStats, MeetingDecision, MeetingActionItem, MeetingActivity } from "@/types/models/Meeting";

const initialState: MeetingsState = {
  items: [],
  total: 0,
  isLoading: false,
  error: null,
  stats: null,
  detail: null,
  detailLoading: false,
  currentMeeting: null,
  googleConnected: false,
  googleEmail: null,
};

const meetingsSlice = createSlice({
  name: "meetings",
  initialState,
  reducers: {
    fetchMeetingsRequest: (state, _action: PayloadAction<MeetingQuery>) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchMeetingsSuccess: (state, action: PayloadAction<{ data: Meeting[]; total: number }>) => {
      state.isLoading = false;
      state.items = action.payload.data;
      state.total = action.payload.total;
    },
    fetchMeetingsFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    fetchMeetingDetailRequest: (state, _action: PayloadAction<string>) => {
      state.detailLoading = true;
      state.error = null;
    },
    fetchMeetingDetailSuccess: (state, action: PayloadAction<MeetingDetail>) => {
      state.detailLoading = false;
      state.detail = action.payload;
    },
    fetchMeetingDetailFailure: (state, action: PayloadAction<string>) => {
      state.detailLoading = false;
      state.error = action.payload;
    },

    createMeetingRequest: (state, _action: PayloadAction<CreateMeetingPayload>) => {
      state.isLoading = true;
      state.error = null;
    },
    createMeetingSuccess: (state, action: PayloadAction<Meeting>) => {
      state.isLoading = false;
      state.items.unshift(action.payload);
    },
    createMeetingFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    updateMeetingRequest: (state, _action: PayloadAction<UpdateMeetingPayload>) => {
      state.isLoading = true;
      state.error = null;
    },
    updateMeetingSuccess: (state, action: PayloadAction<Meeting>) => {
      state.isLoading = false;
      state.items = state.items.map((m) => (m.id === action.payload.id ? action.payload : m));
      if (state.detail?.meeting?.id === action.payload.id) {
        state.detail = { ...state.detail, meeting: action.payload };
      }
    },
    updateMeetingFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    deleteMeetingRequest: (state, _action: PayloadAction<string>) => {
      state.isLoading = true;
    },
    deleteMeetingSuccess: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.items = state.items.filter((m) => m.id !== action.payload);
    },
    deleteMeetingFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    fetchMeetingStatsRequest: (state) => {
      state.isLoading = true;
    },
    fetchMeetingStatsSuccess: (state, action: PayloadAction<MeetingStats>) => {
      state.isLoading = false;
      state.stats = action.payload;
    },
    fetchMeetingStatsFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    addDecisionRequest: (state, _action: PayloadAction<{ meetingId: string; decision: string }>) => {
      state.isLoading = true;
    },
    addDecisionSuccess: (state, action: PayloadAction<MeetingDecision>) => {
      state.isLoading = false;
      if (state.detail) {
        state.detail.decisions.push(action.payload);
      }
    },
    addDecisionFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    addActionItemRequest: (state, _action: PayloadAction<{ meetingId: string; title: string; owner?: string | null; dueDate?: string | null }>) => {
      state.isLoading = true;
    },
    addActionItemSuccess: (state, action: PayloadAction<MeetingActionItem>) => {
      state.isLoading = false;
      if (state.detail) {
        state.detail.actionItems.push(action.payload);
      }
    },
    addActionItemFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    updateActionItemRequest: (state, _action: PayloadAction<{ meetingId: string; itemId: string; data: Record<string, unknown> }>) => {
      state.isLoading = true;
    },
    updateActionItemSuccess: (state, action: PayloadAction<MeetingActionItem>) => {
      state.isLoading = false;
      if (state.detail) {
        state.detail.actionItems = state.detail.actionItems.map((a) =>
          a.id === action.payload.id ? action.payload : a
        );
      }
    },
    updateActionItemFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    deleteActionItemRequest: (state, _action: PayloadAction<{ meetingId: string; itemId: string }>) => {
      state.isLoading = true;
    },
    deleteActionItemSuccess: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      if (state.detail) {
        state.detail.actionItems = state.detail.actionItems.filter((a) => a.id !== action.payload);
      }
    },
    deleteActionItemFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    // ── AI meeting-summary generation ────────────────────────────────────
    // The saga POSTs /generate-summary and returns the job id. The meeting
    // detail page owns the SSE subscription itself (EventSource) because it
    // needs to update local streaming UI state per token — pushing every
    // token through Redux would be too chatty.
    generateSummaryRequest: (state, _action: PayloadAction<{ meetingId: string }>) => {
      state.isLoading = true;
      state.error = null;
    },
    generateSummarySuccess: (state, _action: PayloadAction<{ meetingId: string; jobId: string }>) => {
      state.isLoading = false;
    },
    generateSummaryFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    deleteDecisionRequest: (state, _action: PayloadAction<{ meetingId: string; decisionId: string }>) => {
      state.isLoading = true;
    },
    deleteDecisionSuccess: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      if (state.detail) {
        state.detail.decisions = state.detail.decisions.filter((d) => d.id !== action.payload);
      }
    },
    deleteDecisionFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    updateDecisionRequest: (state, _action: PayloadAction<{ meetingId: string; decisionId: string; decision: string }>) => {
      state.isLoading = true;
    },
    updateDecisionSuccess: (state, action: PayloadAction<MeetingDecision>) => {
      state.isLoading = false;
      if (state.detail) {
        state.detail.decisions = state.detail.decisions.map((d) =>
          d.id === action.payload.id ? action.payload : d
        );
      }
    },
    updateDecisionFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    fetchGoogleStatusRequest: (state) => {
      state.isLoading = true;
    },
    fetchGoogleStatusSuccess: (state, action: PayloadAction<{ connected: boolean; email: string | null }>) => {
      state.isLoading = false;
      state.googleConnected = action.payload.connected;
      state.googleEmail = action.payload.email;
    },
    fetchGoogleStatusFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    disconnectGoogleRequest: (state) => {
      state.isLoading = true;
    },
    disconnectGoogleSuccess: (state) => {
      state.isLoading = false;
      state.googleConnected = false;
      state.googleEmail = null;
    },
    disconnectGoogleFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    clearMeetingError: (state) => {
      state.error = null;
    },
    clearMeetingDetail: (state) => {
      state.detail = null;
    },
  },
});

export const {
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
  generateSummaryRequest, generateSummarySuccess, generateSummaryFailure,
  deleteDecisionRequest, deleteDecisionSuccess, deleteDecisionFailure,
  updateDecisionRequest, updateDecisionSuccess, updateDecisionFailure,
  fetchGoogleStatusRequest, fetchGoogleStatusSuccess, fetchGoogleStatusFailure,
  disconnectGoogleRequest, disconnectGoogleSuccess, disconnectGoogleFailure,
  clearMeetingError, clearMeetingDetail,
} = meetingsSlice.actions;

export default meetingsSlice.reducer;

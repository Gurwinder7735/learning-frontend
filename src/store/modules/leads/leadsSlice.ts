import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Lead, LeadDetail, LeadActivity, LeadStats } from "@/types/models/Lead";
import type { Meeting } from "@/types/models/Meeting";
import type { LeadsState, LeadsQuery, LeadCreatePayload, LeadUpdatePayload, LeadActivityCreatePayload, LeadMeetingCreatePayload, LeadMeetingUpdatePayload, ActionItemCreatePayload, ActionItemUpdatePayload } from "./leadsTypes";

const initialState: LeadsState = {
  items: [],
  total: 0,
  isLoading: false,
  error: null,
  stats: null,
  detail: null,
  activities: [],
  meetings: [],
};

const leadsSlice = createSlice({
  name: "leads",
  initialState,
  reducers: {
    fetchLeadsRequest: (state, _action: PayloadAction<LeadsQuery>) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchLeadsSuccess: (state, action: PayloadAction<{ items: Lead[]; total: number }>) => {
      state.isLoading = false;
      state.items = action.payload.items;
      state.total = action.payload.total;
    },
    fetchLeadsFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    createLeadRequest: (_state, _action: PayloadAction<LeadCreatePayload>) => {},
    createLeadSuccess: (state, action: PayloadAction<Lead>) => {
      state.items.unshift(action.payload);
      state.total += 1;
    },
    createLeadFailure: (_state, _action: PayloadAction<string>) => {},
    updateLeadRequest: (_state, _action: PayloadAction<LeadUpdatePayload>) => {},
    updateLeadSuccess: (state, action: PayloadAction<Lead>) => {
      const idx = state.items.findIndex((l) => l.id === action.payload.id);
      if (idx !== -1) state.items[idx] = action.payload;
      if (state.detail?.lead.id === action.payload.id) {
        state.detail.lead = action.payload;
      }
    },
    updateLeadFailure: (_state, _action: PayloadAction<string>) => {},
    deleteLeadRequest: (_state, _action: PayloadAction<string>) => {},
    deleteLeadSuccess: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((l) => l.id !== action.payload);
      state.total -= 1;
    },
    deleteLeadFailure: (_state, _action: PayloadAction<string>) => {},
    fetchLeadDetailRequest: (state, _action: PayloadAction<string>) => {
      state.isLoading = true;
    },
    fetchLeadDetailSuccess: (state, action: PayloadAction<LeadDetail>) => {
      state.isLoading = false;
      state.detail = action.payload;
      state.activities = action.payload.activities;
      state.meetings = action.payload.meetings;
    },
    fetchLeadDetailFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    updateLeadStatusRequest: (_state, _action: PayloadAction<{ id: string; status: string }>) => {},
    updateLeadStatusSuccess: (state, action: PayloadAction<Lead>) => {
      const idx = state.items.findIndex((l) => l.id === action.payload.id);
      if (idx !== -1) state.items[idx] = action.payload;
      if (state.detail?.lead.id === action.payload.id) {
        state.detail.lead = action.payload;
      }
    },
    updateLeadStatusFailure: (_state, _action: PayloadAction<string>) => {},
    // Revert a converted lead back to lead-stage. Same success reducer
    // shape as ``updateLeadStatusSuccess`` — the saga refreshes the
    // full detail on completion so the activities list picks up the
    // ``lead_reverted`` entry too.
    revertLeadRequest: (
      _state,
      _action: PayloadAction<{ id: string; status: string }>,
    ) => {},
    revertLeadSuccess: (state, action: PayloadAction<Lead>) => {
      const idx = state.items.findIndex((l) => l.id === action.payload.id);
      if (idx !== -1) state.items[idx] = action.payload;
      if (state.detail?.lead.id === action.payload.id) {
        state.detail.lead = action.payload;
      }
    },
    revertLeadFailure: (_state, _action: PayloadAction<string>) => {},
    addActivityRequest: (_state, _action: PayloadAction<LeadActivityCreatePayload>) => {},
    addActivitySuccess: (state, action: PayloadAction<LeadActivity>) => {
      state.activities.unshift(action.payload);
    },
    addActivityFailure: (_state, _action: PayloadAction<string>) => {},
    createMeetingRequest: (_state, _action: PayloadAction<LeadMeetingCreatePayload>) => {},
    createMeetingSuccess: (state, action: PayloadAction<Meeting>) => {
      state.meetings.unshift(action.payload);
      if (state.detail) state.detail.meetings.unshift(action.payload);
    },
    createMeetingFailure: (_state, _action: PayloadAction<string>) => {},
    updateMeetingRequest: (_state, _action: PayloadAction<LeadMeetingUpdatePayload>) => {},
    updateMeetingSuccess: (state, action: PayloadAction<Meeting>) => {
      const idx = state.meetings.findIndex((m) => m.id === action.payload.id);
      if (idx !== -1) state.meetings[idx] = action.payload;
    },
    updateMeetingFailure: (_state, _action: PayloadAction<string>) => {},
    deleteMeetingRequest: (_state, _action: PayloadAction<{ leadId: string; meetingId: string }>) => {},
    deleteMeetingSuccess: (state, action: PayloadAction<string>) => {
      state.meetings = state.meetings.filter((m) => m.id !== action.payload);
    },
    deleteMeetingFailure: (_state, _action: PayloadAction<string>) => {},
    addActionItemRequest: (_state, _action: PayloadAction<ActionItemCreatePayload>) => {},
    addActionItemSuccess: (state, action: PayloadAction<Meeting>) => {
      const idx = state.meetings.findIndex((m) => m.id === action.payload.id);
      if (idx !== -1) state.meetings[idx] = action.payload;
    },
    addActionItemFailure: (_state, _action: PayloadAction<string>) => {},
    updateActionItemRequest: (_state, _action: PayloadAction<ActionItemUpdatePayload>) => {},
    updateActionItemSuccess: (state, action: PayloadAction<Meeting>) => {
      const idx = state.meetings.findIndex((m) => m.id === action.payload.id);
      if (idx !== -1) state.meetings[idx] = action.payload;
    },
    updateActionItemFailure: (_state, _action: PayloadAction<string>) => {},
    fetchStatsRequest: (_state) => {},
    fetchStatsSuccess: (state, action: PayloadAction<LeadStats>) => {
      state.stats = action.payload;
    },
    fetchStatsFailure: (_state, _action: PayloadAction<string>) => {},
    clearLeadDetail: (state) => {
      state.detail = null;
      state.activities = [];
      state.meetings = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchLeadsRequest,
  fetchLeadsSuccess,
  fetchLeadsFailure,
  createLeadRequest,
  createLeadSuccess,
  createLeadFailure,
  updateLeadRequest,
  updateLeadSuccess,
  updateLeadFailure,
  deleteLeadRequest,
  deleteLeadSuccess,
  deleteLeadFailure,
  fetchLeadDetailRequest,
  fetchLeadDetailSuccess,
  fetchLeadDetailFailure,
  updateLeadStatusRequest,
  updateLeadStatusSuccess,
  updateLeadStatusFailure,
  revertLeadRequest,
  revertLeadSuccess,
  revertLeadFailure,
  addActivityRequest,
  addActivitySuccess,
  addActivityFailure,
  createMeetingRequest,
  createMeetingSuccess,
  createMeetingFailure,
  updateMeetingRequest,
  updateMeetingSuccess,
  updateMeetingFailure,
  deleteMeetingRequest,
  deleteMeetingSuccess,
  deleteMeetingFailure,
  addActionItemRequest,
  addActionItemSuccess,
  addActionItemFailure,
  updateActionItemRequest,
  updateActionItemSuccess,
  updateActionItemFailure,
  fetchStatsRequest,
  fetchStatsSuccess,
  fetchStatsFailure,
  clearLeadDetail,
  clearError,
} = leadsSlice.actions;

export default leadsSlice.reducer;

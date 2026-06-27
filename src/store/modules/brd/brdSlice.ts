import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { BRDState } from "./brdTypes";
import type { BRD, BRDJob, BRDAgentRun } from "@/types/models/BRD";

const initialState: BRDState = {
  brds: [],
  currentBRD: null,
  currentJob: null,
  currentAgentRuns: [],
  agentStream: {},
  isGenerating: false,
  isLoading: false,
  error: null,
};

const brdSlice = createSlice({
  name: "brd",
  initialState,
  reducers: {
    fetchBRDsRequest(state) {
      state.isLoading = true;
      state.error = null;
    },
    fetchBRDsSuccess(state, action: PayloadAction<BRD[]>) {
      state.brds = action.payload;
      state.isLoading = false;
    },
    fetchBRDsFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.isLoading = false;
    },
    fetchBRDDetailRequest(state, _action: PayloadAction<string>) {
      state.isLoading = true;
      state.error = null;
    },
    fetchBRDDetailSuccess(state, action: PayloadAction<BRD>) {
      state.currentBRD = action.payload;
      state.isLoading = false;
    },
    fetchBRDDetailFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.isLoading = false;
    },
    fetchJobDetailRequest(state, _action: PayloadAction<string>) {
      state.error = null;
    },
    fetchJobDetailSuccess(state, action: PayloadAction<BRDJob>) {
      state.currentJob = action.payload;
      state.currentAgentRuns = action.payload.agentRuns;
      state.agentStream = {};
    },
    fetchJobDetailFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },
    setGenerating(state, action: PayloadAction<boolean>) {
      state.isGenerating = action.payload;
    },
    setCurrentBRD(state, action: PayloadAction<BRD | null>) {
      state.currentBRD = action.payload;
    },
    updateAgentRun(
      state,
      action: PayloadAction<{ agentName: string; status: string; content?: string }>
    ) {
      const { agentName, status, content } = action.payload;
      const run = state.currentAgentRuns.find((r) => r.agentName === agentName);
      if (run) {
        run.status = status as BRDAgentRun["status"];
        if (content) run.content = content;
      } else {
        // Agent appeared before we fetched job detail — add a placeholder
        state.currentAgentRuns.push({
          id: agentName,
          agentName,
          displayName: agentName,
          status: status as BRDAgentRun["status"],
          order: state.currentAgentRuns.length,
        });
      }
    },
    appendAgentToken(
      state,
      action: PayloadAction<{ agentName: string; token: string }>
    ) {
      const { agentName, token } = action.payload;
      state.agentStream[agentName] = (state.agentStream[agentName] || "") + token;
    },
    clearGeneration(state) {
      state.currentJob = null;
      state.currentAgentRuns = [];
      state.agentStream = {};
      state.isGenerating = false;
      state.error = null;
    },
  },
});

export const {
  fetchBRDsRequest,
  fetchBRDsSuccess,
  fetchBRDsFailure,
  fetchBRDDetailRequest,
  fetchBRDDetailSuccess,
  fetchBRDDetailFailure,
  fetchJobDetailRequest,
  fetchJobDetailSuccess,
  fetchJobDetailFailure,
  setGenerating,
  setCurrentBRD,
  updateAgentRun,
  appendAgentToken,
  clearGeneration,
} = brdSlice.actions;

export default brdSlice.reducer;

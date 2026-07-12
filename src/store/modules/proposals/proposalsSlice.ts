import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { ProposalsState } from "./proposalsTypes";
import type {
  Proposal,
  ProposalAgentRun,
  ProposalJob,
} from "@/types/models/Proposal";

const initialState: ProposalsState = {
  proposals: [],
  currentProposal: null,
  currentJob: null,
  currentAgentRuns: [],
  agentStream: {},
  isGenerating: false,
  isLoading: false,
  error: null,
};

const proposalsSlice = createSlice({
  name: "proposals",
  initialState,
  reducers: {
    fetchProposalsRequest(state) {
      state.isLoading = true;
      state.error = null;
    },
    fetchProposalsSuccess(state, action: PayloadAction<Proposal[]>) {
      state.proposals = action.payload;
      state.isLoading = false;
    },
    fetchProposalsFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.isLoading = false;
    },
    fetchProposalDetailRequest(state, _action: PayloadAction<string>) {
      state.isLoading = true;
      state.error = null;
    },
    fetchProposalDetailSuccess(state, action: PayloadAction<Proposal>) {
      state.currentProposal = action.payload;
      state.isLoading = false;
    },
    fetchProposalDetailFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.isLoading = false;
    },
    fetchJobDetailRequest(state, _action: PayloadAction<string>) {
      state.error = null;
    },
    fetchJobDetailSuccess(state, action: PayloadAction<ProposalJob>) {
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
    setCurrentProposal(state, action: PayloadAction<Proposal | null>) {
      state.currentProposal = action.payload;
    },
    updateAgentRun(
      state,
      action: PayloadAction<{ agentName: string; status: string; content?: string }>,
    ) {
      const { agentName, status, content } = action.payload;
      const run = state.currentAgentRuns.find((r) => r.agentName === agentName);
      if (run) {
        run.status = status as ProposalAgentRun["status"];
        if (content) run.content = content;
      } else {
        // SSE fired before we fetched job detail — insert a placeholder so
        // the UI can still show the pill. The next fetch overwrites this.
        state.currentAgentRuns.push({
          id: agentName,
          agentName,
          displayName: agentName,
          status: status as ProposalAgentRun["status"],
          order: state.currentAgentRuns.length,
        });
      }
    },
    appendAgentToken(
      state,
      action: PayloadAction<{ agentName: string; token: string }>,
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
  fetchProposalsRequest,
  fetchProposalsSuccess,
  fetchProposalsFailure,
  fetchProposalDetailRequest,
  fetchProposalDetailSuccess,
  fetchProposalDetailFailure,
  fetchJobDetailRequest,
  fetchJobDetailSuccess,
  fetchJobDetailFailure,
  setGenerating,
  setCurrentProposal,
  updateAgentRun,
  appendAgentToken,
  clearGeneration,
} = proposalsSlice.actions;

export default proposalsSlice.reducer;

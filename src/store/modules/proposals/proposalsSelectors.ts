import type { RootState } from "@/store/index";
import type { ProposalsState } from "./proposalsTypes";

export const selectProposalsState = (state: RootState): ProposalsState =>
  state.proposals;

export const selectProposals = (state: RootState) =>
  selectProposalsState(state).proposals;
export const selectCurrentProposal = (state: RootState) =>
  selectProposalsState(state).currentProposal;
export const selectCurrentJob = (state: RootState) =>
  selectProposalsState(state).currentJob;
export const selectAgentRuns = (state: RootState) =>
  selectProposalsState(state).currentAgentRuns;
export const selectAgentStream = (state: RootState) =>
  selectProposalsState(state).agentStream;
export const selectIsGenerating = (state: RootState) =>
  selectProposalsState(state).isGenerating;
export const selectProposalsLoading = (state: RootState) =>
  selectProposalsState(state).isLoading;

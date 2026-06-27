import type { RootState } from "@/store/index";
import type { BRDState } from "./brdTypes";

export const selectBRD = (state: RootState): BRDState => state.brd;
export const selectBRDs = (state: RootState) => selectBRD(state).brds;
export const selectCurrentBRD = (state: RootState) => selectBRD(state).currentBRD;
export const selectCurrentJob = (state: RootState) => selectBRD(state).currentJob;
export const selectAgentRuns = (state: RootState) => selectBRD(state).currentAgentRuns;
export const selectAgentStream = (state: RootState) => selectBRD(state).agentStream;
export const selectIsGenerating = (state: RootState) => selectBRD(state).isGenerating;
export const selectBRDLoading = (state: RootState) => selectBRD(state).isLoading;

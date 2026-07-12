import type { Proposal, ProposalAgentRun, ProposalJob } from "@/types/models/Proposal";

export interface ProposalsState {
  proposals: Proposal[];
  currentProposal: Proposal | null;
  currentJob: ProposalJob | null;
  currentAgentRuns: ProposalAgentRun[];
  agentStream: Record<string, string>;
  isGenerating: boolean;
  isLoading: boolean;
  error: string | null;
}

import type { BRD, BRDJob, BRDAgentRun } from "@/types/models/BRD";

export interface BRDState {
  brds: BRD[];
  currentBRD: BRD | null;
  currentJob: BRDJob | null;
  currentAgentRuns: BRDAgentRun[];
  agentStream: Record<string, string>;
  isGenerating: boolean;
  isLoading: boolean;
  error: string | null;
}

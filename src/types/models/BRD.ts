export interface BRDAgentRun {
  id: string;
  agentName: string;
  displayName: string;
  status: "pending" | "running" | "completed" | "failed";
  outputFile?: string | null;
  content?: string | null;
  error?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  order: number;
}

export interface BRDJob {
  id: string;
  name: string;
  clientId?: string | null;
  clientName?: string | null;
  contextText: string;
  documentIds: string[];
  status: "pending" | "running" | "completed" | "failed";
  brdId?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  agentRuns: BRDAgentRun[];
}

export interface BRD {
  id: string;
  name: string;
  clientId?: string | null;
  clientName?: string | null;
  status: "draft" | "generating" | "completed" | "failed" | "archived";
  shareToken?: string | null;
  brdJobId?: string | null;
  aiContent?: Record<string, string> | null;
  documentIds: string[];
  isPasswordProtected?: boolean;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BRDComment {
  id: string;
  commenterName: string;
  commenterEmail?: string | null;
  content: string;
  createdAt: string;
}

export interface BRDSSEData {
  type: string;
  jobId: string;
  data?: Record<string, unknown>;
}

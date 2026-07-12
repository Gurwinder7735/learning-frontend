export type ProposalPaymentType = "fixed_cost" | "cash_equity";
export type ProposalStatus =
  | "draft"
  | "generating"
  | "completed"
  | "failed"
  | "archived";

export interface ProposalAgentRun {
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

export interface ProposalJob {
  id: string;
  proposalId: string;
  title?: string | null;
  brdId: string;
  clientId?: string | null;
  clientName?: string | null;
  paymentType: ProposalPaymentType;
  equityPercentage?: number | null;
  currency: string;
  maxBudget?: number | null;
  advancePercentage?: number | null;
  maxTimelineWeeks?: number | null;
  extraNotes?: string | null;
  status: "pending" | "running" | "completed" | "failed";
  error?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  agentRuns: ProposalAgentRun[];
}

export interface Proposal {
  id: string;
  name: string;
  title?: string | null;
  brdId: string;
  brdName?: string | null;
  clientId?: string | null;
  clientName?: string | null;
  paymentType: ProposalPaymentType;
  equityPercentage?: number | null;
  currency: string;
  maxBudget?: number | null;
  advancePercentage?: number | null;
  maxTimelineWeeks?: number | null;
  extraNotes?: string | null;
  status: ProposalStatus;
  shareToken?: string | null;
  proposalJobId?: string | null;
  aiContent?: Record<string, string> | null;
  isPasswordProtected?: boolean;
  preparedBy?: string | null;
  documentDate?: string | null;
  documentVersion?: string | null;
  publishedVersionId?: string | null;
  publishedVersionLabel?: string;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalVersion {
  id: string;
  proposalId: string;
  major: number;
  minor: number;
  label: string;                              // "1.0" / "1.1" / "2.0"
  content?: Record<string, string> | null;    // omitted from list responses
  coverMetadata: Record<string, string>;
  inputsSnapshot?: Record<string, unknown> | null;
  publishedBy: string;
  note?: string | null;
  publishedAt: string;
}

export interface ProposalComment {
  id: string;
  parentId?: string | null;
  commenterName: string;
  commenterEmail?: string | null;
  content: string;
  anchorY?: number | null;
  anchorX?: number | null;
  status: "open" | "resolved";
  createdAt: string;
}

export interface ProposalSSEData {
  type: string;
  jobId: string;
  data?: Record<string, unknown>;
}

/**
 * Request payload for POST /api/v1/proposals/generate. Every field
 * matches the backend's ``ProposalGenerateRequest`` DTO (camelCase on
 * the wire).
 */
export interface ProposalGenerateInput {
  brdId: string;
  name?: string;
  title?: string;
  clientId?: string;
  clientName?: string;
  paymentType: ProposalPaymentType;
  equityPercentage?: number | null;
  currency: string;
  maxBudget?: number | null;
  advancePercentage?: number | null;
  maxTimelineWeeks?: number | null;
  extraNotes?: string;
}

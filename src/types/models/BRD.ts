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
  preparedBy?: string | null;
  documentDate?: string | null;
  documentVersion?: string | null;
  publishedVersionId?: string | null;
  publishedVersionLabel?: string;   // e.g. "1.2"; empty = never published
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BRDVersion {
  id: string;
  brdId: string;
  major: number;
  minor: number;
  label: string;              // "1.0", "1.1", "2.0"
  content: Record<string, string>;
  coverMetadata: Record<string, string>;
  publishedBy: string;
  note?: string | null;
  publishedAt: string;
}

export interface BRDComment {
  id: string;
  parentId?: string | null;         // null = top-level; set = reply
  commenterName: string;
  commenterEmail?: string | null;
  content: string;
  anchorY?: number | null;          // 0–100% of document height; null = bottom-section comment
  anchorX?: number | null;          // 0–100% of container width
  status: "open" | "resolved";
  createdAt: string;
}

export interface BRDSSEData {
  type: string;
  jobId: string;
  data?: Record<string, unknown>;
}

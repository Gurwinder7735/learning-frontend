export interface SOWSubFeature {
  code?: string | null;
  name: string;
  brief: string;
}

export interface SOWFeatureDoc {
  id: string;
  sowId: string;
  sowJobId: string;
  featureName: string;           // module name, e.g. "Workout Module"
  featureCode?: string | null;   // module code prefix, e.g. "WOR"
  featureModule: string;
  featureBrief: string;
  subFeatures: SOWSubFeature[];  // WOR-01, WOR-02, WOR-03...
  order: number;
  status: "pending" | "generating" | "completed" | "failed";
  content: string;
  shareToken?: string | null;
  isPasswordProtected?: boolean;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SOWAgentRun {
  id: string;
  agentName: string;
  displayName: string;
  status: "pending" | "running" | "completed" | "failed";
  outputFile?: string | null;
  order: number;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface SOWJob {
  id: string;
  name: string;
  clientId?: string | null;
  clientName?: string | null;
  contextText: string;
  documentIds: string[];
  status: "pending" | "running" | "completed" | "failed";
  sowId?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  agentRuns: SOWAgentRun[];
}

export interface SOW {
  id: string;
  name: string;
  clientId?: string | null;
  clientName?: string | null;
  status: "draft" | "generating" | "completed" | "failed" | "archived";
  featureCount: number;
  sowJobId?: string | null;
  documentIds: string[];
  shareToken?: string | null;
  isPasswordProtected?: boolean;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

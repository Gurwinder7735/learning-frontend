export type JobStatus = "pending" | "running" | "completed" | "failed" | "stopped";

export interface FoundLead {
  id: string;
  jobId: string;
  companyName: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  contactPerson: string | null;
  linkedinUrl: string | null;
  industry: string | null;
  country: string | null;
  sourceUrl: string | null;
  confidenceNotes: string | null;
  imported: boolean;
  importedLeadId: string | null;
  createdAt: string | null;
}

export interface LeadFinderJob {
  id: string;
  targetCountry: string;
  targetIndustry: string;
  serviceOffered: string;
  leadsRequested: number;
  status: JobStatus;
  generatedQueries: string[];
  leadsFoundCount: number;
  error: string | null;
  createdBy: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface LogEntry {
  id: string;
  message: string;
  type: "info" | "lead" | "tool" | "error";
  timestamp: string;
}

export interface AiLeadFinderState {
  // Active job tracking (for the collapsible banner)
  currentJob: LeadFinderJob | null;
  jobs: LeadFinderJob[];
  // logs are intentionally NOT in Redux — kept in local page state to avoid
  // re-rendering the whole tree on every token (could be 100+/s during browsing)
  isRunning: boolean;

  // Global lead database (all leads across all jobs)
  allLeads: FoundLead[];
  allLeadsTotal: number;
  allLeadsPage: number;        // 1-based current page
  allLeadsLoading: boolean;

  // Legacy per-job leads list (kept for compatibility with import logic)
  foundLeads: FoundLead[];

  // UI flags
  isLoadingJobs: boolean;
  isLoadingLeads: boolean;
  isImporting: boolean;
  error: string | null;
}

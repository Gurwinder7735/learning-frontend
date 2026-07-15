import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type {
  AiLeadFinderState,
  LeadFinderJob,
  FoundLead,
} from "./aiLeadFinderTypes";

const initialState: AiLeadFinderState = {
  currentJob:       null,
  jobs:             [],
  foundLeads:       [],
  isRunning:        false,
  allLeads:         [],
  allLeadsTotal:    0,
  allLeadsPage:     1,
  allLeadsLoading:  false,
  isLoadingJobs:    false,
  isLoadingLeads:   false,
  isImporting:      false,
  error:            null,
};

const aiLeadFinderSlice = createSlice({
  name: "aiLeadFinder",
  initialState,
  reducers: {
    // ── Job lifecycle ──────────────────────────────────────────────────────
    setCurrentJob(state, action: PayloadAction<LeadFinderJob | null>) {
      state.currentJob = action.payload;
      if (action.payload) {
        state.isRunning = action.payload.status === "running";
      }
    },

    setJobs(state, action: PayloadAction<LeadFinderJob[]>) {
      state.jobs = action.payload;
    },

    jobStarted(state, action: PayloadAction<LeadFinderJob>) {
      state.currentJob = action.payload;
      state.foundLeads = [];
      state.isRunning = true;
      state.error = null;
    },

    jobDone(state, action: PayloadAction<{ status: string; leadsFoundCount: number }>) {
      state.isRunning = false;
      if (state.currentJob) {
        state.currentJob.status = action.payload.status as LeadFinderJob["status"];
        state.currentJob.leadsFoundCount = action.payload.leadsFoundCount;
      }
    },

    jobError(state, action: PayloadAction<string>) {
      state.isRunning = false;
      state.error = action.payload;
      if (state.currentJob) {
        state.currentJob.status = "failed";
      }
    },

    // ── SSE lead event (structured, rare — safe to keep in Redux) ──────────
    leadFound(state, action: PayloadAction<FoundLead>) {
      state.foundLeads.push(action.payload);
      if (state.currentJob) {
        state.currentJob.leadsFoundCount = state.foundLeads.length;
      }
      // Prepend to global database table for live update
      state.allLeads.unshift(action.payload);
      state.allLeadsTotal += 1;
    },

    // ── Found leads (per-job) ──────────────────────────────────────────────
    setFoundLeads(state, action: PayloadAction<FoundLead[]>) {
      state.foundLeads = action.payload;
    },

    markLeadsImported(state, action: PayloadAction<string[]>) {
      for (const id of action.payload) {
        const inJob = state.foundLeads.find((l) => l.id === id);
        if (inJob) inJob.imported = true;
        const inAll = state.allLeads.find((l) => l.id === id);
        if (inAll) inAll.imported = true;
      }
    },

    // ── Global database ────────────────────────────────────────────────────
    setAllLeads(state, action: PayloadAction<{ leads: FoundLead[]; total: number; page: number }>) {
      state.allLeads = action.payload.leads;
      state.allLeadsTotal = action.payload.total;
      state.allLeadsPage = action.payload.page;
    },

    setAllLeadsLoading(state, action: PayloadAction<boolean>) {
      state.allLeadsLoading = action.payload;
    },

    setAllLeadsPage(state, action: PayloadAction<number>) {
      state.allLeadsPage = action.payload;
    },

    // ── UI flags ───────────────────────────────────────────────────────────
    setLoadingJobs(state, action: PayloadAction<boolean>) {
      state.isLoadingJobs = action.payload;
    },

    setLoadingLeads(state, action: PayloadAction<boolean>) {
      state.isLoadingLeads = action.payload;
    },

    setImporting(state, action: PayloadAction<boolean>) {
      state.isImporting = action.payload;
    },

    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },

    clearState(state) {
      // Preserve the global leads database on reset — only wipe job state
      const savedAllLeads = state.allLeads;
      const savedTotal    = state.allLeadsTotal;
      Object.assign(state, initialState);
      state.allLeads      = savedAllLeads;
      state.allLeadsTotal = savedTotal;
    },
  },
});

export const {
  setCurrentJob,
  setJobs,
  jobStarted,
  jobDone,
  jobError,
  leadFound,
  setFoundLeads,
  markLeadsImported,
  setAllLeads,
  setAllLeadsLoading,
  setAllLeadsPage,
  setLoadingJobs,
  setLoadingLeads,
  setImporting,
  setError,
  clearState,
} = aiLeadFinderSlice.actions;

export default aiLeadFinderSlice.reducer;

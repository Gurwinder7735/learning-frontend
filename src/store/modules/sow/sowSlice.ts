import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { SOWState, GeneratingFeature } from "./sowTypes";
import type { SOW, SOWJob, SOWAgentRun, SOWFeatureDoc } from "@/types/models/SOW";

const initialState: SOWState = {
  sows: [],
  currentSOW: null,
  currentJob: null,
  currentAgentRuns: [],
  extractorStream: "",
  extractorDone: false,
  generatingFeatures: [],
  featureStream: {},
  featureDocs: [],
  currentFeatureDoc: null,
  isGenerating: false,
  isLoading: false,
  error: null,
};

const sowSlice = createSlice({
  name: "sow",
  initialState,
  reducers: {
    // ── SOW list ─────────────────────────────────────────────────────────────
    fetchSOWsRequest(state) {
      state.isLoading = true;
      state.error = null;
    },
    fetchSOWsSuccess(state, action: PayloadAction<SOW[]>) {
      state.sows = action.payload;
      state.isLoading = false;
    },
    fetchSOWsFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.isLoading = false;
    },
    // ── SOW detail ───────────────────────────────────────────────────────────
    fetchSOWDetailRequest(state, _action: PayloadAction<string>) {
      state.isLoading = true;
      state.error = null;
    },
    fetchSOWDetailSuccess(state, action: PayloadAction<SOW>) {
      state.currentSOW = action.payload;
      state.isLoading = false;
    },
    fetchSOWDetailFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.isLoading = false;
    },
    // ── Feature docs ─────────────────────────────────────────────────────────
    fetchFeatureDocsRequest(state, _action: PayloadAction<string>) {
      state.isLoading = true;
    },
    fetchFeatureDocsSuccess(state, action: PayloadAction<SOWFeatureDoc[]>) {
      state.featureDocs = action.payload;
      state.isLoading = false;
    },
    fetchFeatureDocsFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.isLoading = false;
    },
    fetchFeatureDocDetailRequest(state, _action: PayloadAction<string>) {
      state.isLoading = true;
    },
    fetchFeatureDocDetailSuccess(state, action: PayloadAction<SOWFeatureDoc>) {
      state.currentFeatureDoc = action.payload;
      state.isLoading = false;
    },
    fetchFeatureDocDetailFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.isLoading = false;
    },
    setCurrentFeatureDoc(state, action: PayloadAction<SOWFeatureDoc | null>) {
      state.currentFeatureDoc = action.payload;
    },
    // ── Job detail ───────────────────────────────────────────────────────────
    fetchJobDetailRequest(state, _action: PayloadAction<string>) {
      state.error = null;
    },
    fetchJobDetailSuccess(state, action: PayloadAction<SOWJob>) {
      state.currentJob = action.payload;
      state.currentAgentRuns = action.payload.agentRuns;
    },
    fetchJobDetailFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },
    // ── Generation state ─────────────────────────────────────────────────────
    setGenerating(state, action: PayloadAction<boolean>) {
      state.isGenerating = action.payload;
    },
    setCurrentSOW(state, action: PayloadAction<SOW | null>) {
      state.currentSOW = action.payload;
    },
    // Stage 1: extractor streaming
    appendExtractorToken(state, action: PayloadAction<string>) {
      state.extractorStream += action.payload;
    },
    extractorComplete(state) {
      state.extractorDone = true;
    },
    // Stage 1 done: module list discovered
    featuresFound(
      state,
      action: PayloadAction<Array<{ code?: string; name: string; features: Array<{ code?: string; name: string; brief: string }> }>>
    ) {
      state.generatingFeatures = action.payload.map((mod, i) => ({
        id: "",    // real ID arrives in feature_start
        featureName: mod.name,
        featureModule: mod.name,
        featureCode: mod.code || null,
        featureBrief: "",
        subFeatureCount: mod.features?.length ?? 0,
        order: i,
        status: "pending",
      }));
    },
    // Stage 2: per-module events
    featureStart(
      state,
      action: PayloadAction<{ featureId: string; featureName: string; featureModule: string; featureCode?: string; subFeatureCount?: number; order: number }>
    ) {
      const { featureId, featureName, order } = action.payload;
      const existing = state.generatingFeatures.find(
        (f) => f.featureName === featureName || f.order === order
      );
      if (existing) {
        existing.id = featureId;
        existing.status = "generating";
        if (action.payload.featureCode) existing.featureCode = action.payload.featureCode;
        if (action.payload.subFeatureCount != null) existing.subFeatureCount = action.payload.subFeatureCount;
      } else {
        state.generatingFeatures.push({
          id: featureId,
          featureName,
          featureModule: action.payload.featureModule,
          featureCode: action.payload.featureCode || null,
          featureBrief: "",
          subFeatureCount: action.payload.subFeatureCount ?? 0,
          order,
          status: "generating",
          shareToken: null,
        });
      }
    },
    appendFeatureToken(
      state,
      action: PayloadAction<{ featureId: string; token: string }>
    ) {
      const { featureId, token } = action.payload;
      state.featureStream[featureId] = (state.featureStream[featureId] || "") + token;
    },
    featureDone(
      state,
      action: PayloadAction<{ featureId: string; shareToken?: string }>
    ) {
      const { featureId, shareToken } = action.payload;
      const f = state.generatingFeatures.find((f) => f.id === featureId);
      if (f) {
        f.status = "completed";
        if (shareToken) f.shareToken = shareToken;
      }
    },
    featureError(state, action: PayloadAction<{ featureId: string }>) {
      const f = state.generatingFeatures.find((f) => f.id === action.payload.featureId);
      if (f) f.status = "failed";
    },
    // ── Reset ────────────────────────────────────────────────────────────────
    clearGeneration(state) {
      state.extractorStream = "";
      state.extractorDone = false;
      state.generatingFeatures = [];
      state.featureStream = {};
      state.isGenerating = false;
      state.currentJob = null;
      state.currentAgentRuns = [];
      state.error = null;
    },
  },
});

export const {
  fetchSOWsRequest,
  fetchSOWsSuccess,
  fetchSOWsFailure,
  fetchSOWDetailRequest,
  fetchSOWDetailSuccess,
  fetchSOWDetailFailure,
  fetchFeatureDocsRequest,
  fetchFeatureDocsSuccess,
  fetchFeatureDocsFailure,
  fetchFeatureDocDetailRequest,
  fetchFeatureDocDetailSuccess,
  fetchFeatureDocDetailFailure,
  setCurrentFeatureDoc,
  fetchJobDetailRequest,
  fetchJobDetailSuccess,
  fetchJobDetailFailure,
  setGenerating,
  setCurrentSOW,
  appendExtractorToken,
  extractorComplete,
  featuresFound,
  featureStart,
  appendFeatureToken,
  featureDone,
  featureError,
  clearGeneration,
} = sowSlice.actions;

export default sowSlice.reducer;

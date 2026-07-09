import type { SOW, SOWJob, SOWAgentRun, SOWFeatureDoc } from "@/types/models/SOW";

export interface GeneratingFeature {
  id: string;
  featureName: string;         // module name
  featureModule: string;
  featureCode?: string | null; // module code prefix
  featureBrief: string;
  subFeatureCount: number;     // how many sub-features are inside
  order: number;
  status: "pending" | "generating" | "completed" | "failed";
  shareToken?: string | null;
}

export interface SOWState {
  sows: SOW[];
  currentSOW: SOW | null;
  currentJob: SOWJob | null;
  currentAgentRuns: SOWAgentRun[];
  // Extractor streaming
  extractorStream: string;
  extractorDone: boolean;
  // Per-feature progress during generation
  generatingFeatures: GeneratingFeature[];
  featureStream: Record<string, string>;   // featureId → token buffer
  // Loaded feature docs (on detail page)
  featureDocs: SOWFeatureDoc[];
  currentFeatureDoc: SOWFeatureDoc | null;
  isGenerating: boolean;
  isLoading: boolean;
  error: string | null;
}
